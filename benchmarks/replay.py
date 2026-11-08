"""Replay exported participant evidence without a database or provider credentials."""

import argparse
import gzip
import json
from pathlib import Path

from agent_sim.db import digest
from agent_sim.domain import Decision, Design, Event
from agent_sim.simulation.environments import create_world

from benchmarks.cases import cases
from benchmarks.oracles import score_trace


def replay_record(record: dict) -> int:
    case = next(c for c in cases() if c.id == record["id"])
    data = case.design().model_dump()
    data["rounds"] = record["rounds"]
    design = Design.model_validate(data)
    parameters = design.conditions[record["arm"]].parameters.model_validate(record["parameters"])
    world = create_world(design, parameters, record["seed"])
    initial = world.snapshot()
    for number, row in enumerate(record["trace"], 1):
        actor = world.actor()
        assert actor == row["actor"], f"Actor mismatch at turn {number}"
        observed = world.observe(actor)
        observed["you"] = next(p.model_dump() for p in design.profiles if p.key == actor)
        assert observed == row["observation"], f"Observation mismatch at turn {number}"
        events, measures = world.step(actor, Decision.model_validate(row["decision"]))
        assert digest(world.snapshot()) == digest(row["checkpoint"]), (
            f"State mismatch at turn {number}"
        )
        assert [e.model_dump() for e in events] == [
            {key: value for key, value in e.items() if key in Event.model_fields}
            for e in row["events"]
        ], f"Events mismatch at turn {number}"
        assert sorted((m.key, m.value) for m in measures) == sorted(
            (m["key"], m["value"]) for m in row["measures"]
        ), f"Measures mismatch at turn {number}"
    assert (world.actor() is None) == (record["status"] == "complete"), "Terminal status mismatch"
    assert score_trace(record["trace"], initial) == record["behavior"], "Behavior summary mismatch"
    return len(record["trace"])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("attempts", type=Path)
    args = parser.parse_args()
    records = turns = missing = 0
    with gzip.open(args.attempts, "rt") as stream:
        for line in stream:
            row = json.loads(line)
            if "trace" not in row:
                missing += 1
                continue
            turns += replay_record(row)
            records += 1
    print(
        json.dumps(
            dict(
                replayed_runs=records,
                verified_turns=turns,
                missing_traces=missing,
                model_requests=0,
            )
        )
    )


if __name__ == "__main__":
    main()
