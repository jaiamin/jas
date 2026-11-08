"""Scripted counterexamples: communication value depends on strategy and information."""

import copy
import json
import re

from agent_sim.domain import Design, Profile
from agent_sim.simulation.environments import create_world

from benchmarks.cases import cases
from benchmarks.oracles import scripted


def privacy_matrix() -> list[dict]:
    records = []
    for environment in sorted({c.family.environment for c in cases() if c.family.environment}):
        case = next(c for c in cases() if c.family.environment == environment)
        design = case.design()
        for memory in ("none", "history", "notes", "episodic"):
            params = design.conditions[0].parameters.model_copy(deep=True)
            params.memory, params.private_signal = memory, True
            world = create_world(design, params, case.seed)
            for key in world.ids:
                world.state["notes"][key] = "NOTE-" + key
                world.state["experiences"][key] = [{"text": "EXPERIENCE-" + key}]
            world.state["history"] = [{"text": "PUBLIC-HISTORY"}]
            checks = []
            for actor in world.ids:
                obs = world.observe(actor)
                wire = json.dumps(obs)
                checks.extend(
                    [
                        obs["public_signals"] == {},
                        bool(obs["your_note"]) == (memory in {"notes", "episodic"}),
                        bool(obs["your_experiences"]) == (memory == "episodic"),
                        bool(obs["public_history"]) == (memory != "none"),
                        all(
                            "NOTE-" + other not in wire and "EXPERIENCE-" + other not in wire
                            for other in world.ids
                            if other != actor
                        ),
                        "known_truth" not in wire,
                    ]
                )
            records.append(
                dict(environment=environment, memory=memory, checks=len(checks), passed=sum(checks))
            )
    assert all(r["checks"] == r["passed"] for r in records), "privacy/memory matrix"
    return records


def communication_trial(seed: int, channel: bool, strategy: str) -> dict:
    case = next(c for c in cases() if c.family.environment == "information")
    data = case.design().model_dump()
    data.update(
        rounds=12,
        profiles=[
            Profile(key=f"p{i}", name=f"P{i}", goal="Earn credits.").model_dump() for i in range(8)
        ],
    )
    design = Design.model_validate(data)
    params = design.conditions[0].parameters.model_copy(deep=True)
    params.information.accuracy = 0.75
    params.communication_channels = ["reports"] if channel else []
    world = create_world(design, params, seed)
    rows = []
    while (actor := world.actor()) is not None:
        obs = world.observe(actor)
        obs["you"] = next(p.model_dump() for p in design.profiles if p.key == actor)
        decision = scripted(dict(obs), True)
        if channel:
            prior = [
                int(match.group(1))
                for item in obs["public_history"]
                if item.get("round") == obs["round"]
                and item.get("kind") == "claim"
                and (match := re.fullmatch(r"Reports private signal ([01])\.", item["text"]))
            ]
            own = obs["your_private_signal"]
            if strategy == "pool":
                votes = [own, *prior]
                decision.action.amount = (
                    int(sum(votes) * 2 > len(votes)) if sum(votes) * 2 != len(votes) else own
                )
            elif strategy == "copy-false" and prior:
                decision.action.amount = prior[-1]
            if strategy == "copy-false":
                decision.action.report = 1 - own
        events, measures = world.step(actor, decision)
        rows.append(
            dict(
                actor=actor,
                observation=copy.deepcopy(obs),
                decision=decision.model_dump(),
                events=[e.model_dump() for e in events],
                measures=[m.model_dump() for m in measures],
                checkpoint=world.snapshot(),
            )
        )
    accuracy = sum(
        m["value"] for row in rows for m in row["measures"] if m["key"] == "accuracy"
    ) / len(rows)
    return dict(seed=seed, communication=channel, strategy=strategy, accuracy=accuracy, trace=rows)


def communication_probes() -> dict:
    # Fixed complete seed set; no post-hoc choice of a favorable transcript.
    records = [
        communication_trial(seed, enabled, strategy)
        for seed in range(20)
        for enabled in (False, True)
        for strategy in ("pool", "copy-false", "ignore")
    ]
    effects = {}
    for strategy in ("pool", "copy-false", "ignore"):
        pairs = {
            enabled: {
                r["seed"]: r["accuracy"]
                for r in records
                if r["strategy"] == strategy and r["communication"] == enabled
            }
            for enabled in (False, True)
        }
        differences = [pairs[True][seed] - pairs[False][seed] for seed in range(20)]
        effects[strategy] = dict(mean=sum(differences) / len(differences), seed_effects=differences)
    assert effects["pool"]["mean"] > 0, (
        "truthful evidence pooling should help on this fixed seed set"
    )
    assert effects["copy-false"]["mean"] < 0, "copying inaccurate reports should hurt"
    assert effects["ignore"]["mean"] == 0, "unused communication should be neutral"
    return dict(effects=effects, records=records)
