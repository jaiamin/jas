import asyncio

import pytest
from agent_sim.db import Measurement, Run
from agent_sim.domain import Design, TaskDefinition
from pydantic import ValidationError


def test_custom_graph_rejects_cycles_and_missing_dependencies(design):
    payload = design.model_dump()
    payload["environment"] = "coordination"
    payload["tasks"] = [
        dict(key="a", name="A", effort=1, dependencies=["b"]),
        dict(key="b", name="B", effort=1, dependencies=["a"]),
    ]
    with pytest.raises(ValidationError, match="acyclic"):
        Design.model_validate(payload)
    payload["tasks"][1]["dependencies"] = ["missing"]
    with pytest.raises(ValidationError, match="dependencies"):
        Design.model_validate(payload)


def test_conditions_resolve_private_profiles_without_mutating_base(runtime, design):
    _, _, research, _ = runtime
    profile = design.profiles[0].model_copy(
        update={"goal": "Preserve group welfare", "role": "Coordinator"}
    )
    design.conditions[0].profile_overrides = [profile]
    sid = research.save_design(design)
    run_id = research.study(sid)["runs"][0]["id"]
    _, resolved, _ = research.configuration(run_id)
    assert resolved.profiles[0].goal == profile.goal
    assert design.profiles[0].goal != profile.goal
    design.conditions[0].profile_overrides[0].key = "unknown"
    with pytest.raises(ValidationError, match="existing agent"):
        Design.model_validate(design.model_dump())


def test_named_tasks_complete_early_and_replay(runtime, design):
    _, _, research, engine = runtime
    design.environment = "coordination"
    design.tasks = [
        TaskDefinition(key="scope", name="Agree on scope", effort=1),
        TaskDefinition(key="release", name="Release", effort=1, dependencies=["scope"]),
    ]
    design.measures = ["completion_rate"]
    sid = research.save_design(design)
    rid = research.study(sid)["runs"][0]["id"]

    async def exercise():
        engine.start(rid)
        await engine.executions[rid].task

    asyncio.run(exercise())
    run = research.run(rid)
    assert run["summary"]["status"] == "complete"
    assert run["summary"]["turn"] == 2
    assert run["state"]["tasks"][1]["name"] == "Release"
    assert engine.replay(rid)["verified_turns"] == 2
    assert run["metrics"]["completion_rate"] == 1
    assert run["metrics"]["duplicate_work_rate"] == 0


def test_matched_effects_cluster_repetitions_and_exclude_incomplete_runs(runtime, design):
    db, _, research, _ = runtime
    design.conditions += [
        design.conditions[0].model_copy(update={"key": "treatment", "name": "Treatment"})
    ]
    design.seeds, design.repetitions = [1, 2, 3], 2
    sid = research.save_design(design)
    for run in research.study(sid)["runs"]:
        with db.session.begin() as session:
            session.get_one(Run, run["id"]).status = "complete"
            value = run["seed"] / 10 + (0.2 if run["condition_key"] == "treatment" else 0)
            session.add(
                Measurement(run_id=run["id"], turn=1, round=1, key="contribution_rate", value=value)
            )
    detail = research.study(sid)
    effect = next(e for e in detail["effects"] if e["metric"] == "contribution_rate")
    assert effect["mean"] == pytest.approx(0.2)
    assert effect["seeds"] == 3 and effect["pairs"] == 6
    assert effect["interval"] == pytest.approx([0.2, 0.2])
    with db.session.begin() as session:
        session.get_one(Run, detail["runs"][0]["id"]).status = "failed"
    assert sum(r["runs"] for r in research.study(sid)["results"]) == 11
