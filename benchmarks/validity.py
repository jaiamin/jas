"""No provider imports/calls: independent truth and adversarial environment gate."""

import argparse
import copy
import gzip
import json
import math
from collections import Counter
from pathlib import Path

from agent_sim.db import digest
from agent_sim.simulation.environments import create_world

from benchmarks.cases import cases, fingerprint
from benchmarks.oracles import expected_balances, score_trace, scripted
from benchmarks.provenance import backend_digest


def trajectory(case, condition, productive):
    design = case.design()
    world = create_world(design, condition.parameters, case.seed)
    initial = world.snapshot()
    rows = []
    while (actor := world.actor()) is not None:
        observation = world.observe(actor)
        observation["you"] = next(p.model_dump() for p in design.profiles if p.key == actor)
        decision = scripted(observation, productive)
        # The production per-turn schema is part of the validity check.
        world.decision_schema(observation).model_validate(decision.model_dump())
        before = world.snapshot()
        events, measures = world.step(actor, decision)
        row = dict(
            actor=actor,
            observation=copy.deepcopy(observation),
            decision=decision.model_dump(),
            events=[e.model_dump() for e in events],
            measures=[m.model_dump() for m in measures],
            checkpoint=world.snapshot(),
        )
        # Restore at EVERY turn, including mid-round pending choices and escrow.
        restored = create_world(
            design, condition.parameters, case.seed, json.loads(json.dumps(before))
        )
        replay_events, replay_measures = restored.step(actor, decision)
        assert digest(restored.snapshot()) == digest(row["checkpoint"]), "checkpoint replay"
        assert replay_events == events and replay_measures == measures, "outcome replay"
        assert "known_truth" not in json.dumps(observation), "researcher truth leaked"
        rows.append(row)
        assert len(rows) <= design.turn_count, "nontermination"
    expected = expected_balances(case, condition.parameters, productive)
    actual = sum(world.state["balances"].values())
    assert math.isclose(actual, expected, abs_tol=1e-7), f"utility {actual} != {expected}"
    if case.family.environment == "coordination" and productive:
        efforts = [2 + i % 2 for i in range(condition.parameters.task_count)]
        available = case.agents * case.rounds
        completed = 0
        for effort in efforts:
            available -= effort
            if available < 0:
                break
            completed += 1
        assert score_trace(rows, initial)["completion"] == completed / len(efforts)
    return initial, rows


def adversarial(case, condition) -> dict[str, bool]:
    design = case.design()
    world = create_world(design, condition.parameters.model_copy(deep=True), case.seed)
    actor = world.actor()
    observation = world.observe(actor)
    observation["you"] = next(p.model_dump() for p in design.profiles if p.key == actor)
    legal = scripted(observation, True)
    before = world.snapshot()
    parameters_before = world.parameters.model_dump()
    # Observations must be detached. A caller must not be able to edit world state.
    for value in observation.values():
        if isinstance(value, list):
            value.clear()
        elif isinstance(value, dict):
            value.clear()
    detached = world.snapshot() == before and world.parameters.model_dump() == parameters_before
    # Restore before the independent invalid-action check.
    world = create_world(design, condition.parameters, case.seed, before)
    invalid = legal.model_copy(update={"action": legal.action.model_copy(update={"amount": 500})})
    rejected = False
    try:
        world.step(actor, invalid)
    except ValueError:
        rejected = True
    atomic = world.snapshot() == before
    world = create_world(design, condition.parameters, case.seed, before)
    invalid_actor = next(key for key in world.ids if key != actor)
    try:
        world.step(invalid_actor, legal)
        actor_rejected = False
    except ValueError:
        actor_rejected = True
    turn_atomic = world.snapshot() == before
    # Sealed submissions (including message text) cannot influence the next chooser.
    world = create_world(design, condition.parameters, case.seed, before)
    sealed = True
    if case.family.environment in {"commons", "renewable_resource"}:
        marker = "SEALED-SECRET-CANARY"
        if condition.parameters.communication and "messages" in (
            condition.parameters.communication_channels
        ):
            decision = legal.model_copy(
                update={"action": legal.action.model_copy(update={"message": marker})}
            )
            world.step(actor, decision)
            sealed = marker not in json.dumps(world.observe(world.actor()))
    return {
        "detached_observation": detached,
        "invalid_action_rejected": rejected,
        "invalid_action_atomic": atomic,
        "wrong_actor_rejected": actor_rejected,
        "wrong_actor_atomic": turn_atomic,
        "sealed_submission_private": sealed,
    }


def evaluate(selected=None, output: Path | None = None) -> dict:
    records = []
    trace_file = gzip.open(output / "validity-traces.jsonl.gz", "wt") if output else None
    try:
        for case in selected or cases():
            if case.family.environment is None:
                continue
            for condition in case.design().conditions:
                checks = adversarial(case, condition)
                strategies = []
                for productive in (False, True):
                    try:
                        initial, rows = trajectory(case, condition, productive)
                        checks[f"oracle_replay_{productive}"] = True
                        strategies.append(score_trace(rows, initial))
                        if trace_file:
                            trace_file.write(
                                json.dumps(
                                    dict(
                                        case=case.id,
                                        arm=condition.key,
                                        strategy=productive,
                                        initial=initial,
                                        trace=rows,
                                    )
                                )
                                + "\n"
                            )
                    except (AssertionError, ValueError) as e:
                        checks[f"oracle_replay_{productive}"] = False
                        checks[f"error_{productive}"] = str(e)
                records.append(
                    dict(
                        case=case.id,
                        family=case.family.key,
                        arm=condition.key,
                        checks=checks,
                        strategies=strategies,
                    )
                )
    finally:
        if trace_file:
            trace_file.close()
    failures = Counter(k for r in records for k, v in r["checks"].items() if v is False)
    summary = dict(
        backend_sha256=backend_digest(),
        suite_sha256=fingerprint(),
        cases=len({r["case"] for r in records}),
        arms=len(records),
        checks=sum(isinstance(v, bool) for r in records for v in r["checks"].values()),
        failures=dict(failures),
        records=records,
    )
    if output:
        (output / "validity.json").write_text(json.dumps(summary, indent=2) + "\n")
    return summary


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=False)
    summary = evaluate(output=args.output)
    print(json.dumps({k: v for k, v in summary.items() if k != "records"}))


if __name__ == "__main__":
    main()
