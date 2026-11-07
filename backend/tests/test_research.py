import asyncio

import pytest
from agent_sim.db import Measurement, Run
from agent_sim.domain import Design, TaskDefinition
from pydantic import ValidationError


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
            effect = {(1, 1): 0.0, (1, 2): 0.2, (2, 1): 0.2, (2, 2): 0.6, (3, 1): 0.4, (3, 2): 0.8}[
                run["seed"], run["repetition"]
            ]
            value = effect if run["condition_key"] == "treatment" else 0.0
            session.add(
                Measurement(run_id=run["id"], turn=1, round=1, key="contribution_rate", value=value)
            )
    detail = research.study(sid)
    effect = next(e for e in detail["effects"] if e["metric"] == "contribution_rate")
    assert effect["mean"] == pytest.approx((0.1 + 0.4 + 0.6) / 3)
    assert effect["seeds"] == 3 and effect["pairs"] == 6
    assert effect["interval"] == pytest.approx([0.1, 0.6])
    with db.session.begin() as session:
        missing_control = next(
            run
            for run in detail["runs"]
            if run["condition_key"] != "treatment" and run["seed"] == 3 and run["repetition"] == 2
        )
        session.get_one(Run, missing_control["id"]).status = "failed"
    updated = research.study(sid)
    assert sum(r["runs"] for r in updated["results"]) == 11
    matched = next(e for e in updated["effects"] if e["metric"] == "contribution_rate")
    assert matched["pairs"] == 5 and matched["seeds"] == 3
    assert matched["mean"] == pytest.approx(0.3)
    assert matched["mean"] != pytest.approx((0.0 + 0.2 + 0.2 + 0.6 + 0.4) / 5)
    assert matched["interval"] == pytest.approx([0.1, 0.4])
