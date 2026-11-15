import asyncio
from copy import deepcopy

import pytest
from agent_sim.domain import Design, ScriptedHarness
from agent_sim.matched import changes, first_divergence
from agent_sim.starters import starters


def test_path_comparison_ignores_explanations_but_retains_messages_schedule_and_consequences():
    a: list[dict] = [
        {
            "number": 1,
            "round": 1,
            "actor": "a",
            "observation": {"logical_time": 0},
            "decision": {"action": {"kind": "wait", "message": "hello"}, "rationale": "first"},
            "checkpoint": {"stock": 4, "notes": {"a": "private"}, "experiences": {}, "history": []},
            "consequences": [],
        }
    ]
    b = deepcopy(a)
    b[0]["decision"]["rationale"] = "different prose"
    b[0]["checkpoint"]["notes"] = {"a": "different notes"}
    assert first_divergence(a, b) is None
    b[0]["decision"]["action"]["message"] = "changed message"
    result = first_divergence(a, b)
    assert result is not None and result["kind"] == "action"
    b = deepcopy(a)
    b[0]["checkpoint"]["stock"] = 3
    result = first_divergence(a, b)
    assert result is not None and result["kind"] == "consequence"
    b[0]["observation"]["logical_time"] = 1
    result = first_divergence(a, b)
    assert result is not None and result["kind"] == "schedule"
    assert first_divergence(a, []) is None
    assert changes({"stock": 7}, {"stock": 9}) == ["stock"]


def test_matched_pairs_pin_version_seed_and_repetition_and_make_no_calls(runtime):
    _, _, research, engine = runtime
    design = Design.model_validate(starters()[0]["design"])
    design.seeds, design.repetitions, design.rounds = [7, 19], 2, 4
    for condition in design.conditions:
        condition.harness = ScriptedHarness(policy="workflow_ordered_v1")
    study_id = research.save_design(design)
    study = research.study(study_id)
    run_ids = [run["id"] for run in study["runs"] if run["seed"] == 7 and run["repetition"] == 2]

    async def run():
        for run_id in run_ids:
            await engine.start(run_id)
            task = engine.executions[run_id].task
            assert task is not None
            await task
            assert research.run(run_id)["summary"]["status"] == "complete"
        await engine.close()

    asyncio.run(run())
    report = research.matched(study_id, 1, "scarce", "sufficient", 7, 2)
    assert {report["left_run_id"], report["right_run_id"]} == set(run_ids)
    assert "parameters.workflow.resource_stock" in report["setup_differences"]
    assert "resource_stock" in report["initial_state_differences"]
    assert report["compared_turns"] > 0
    untouched = research.matched(study_id, 1, "scarce", "sufficient", 19, 1)
    assert untouched["compared_turns"] == 0
    assert untouched["first_divergence"] is None
    for args in [
        ("scarce", "scarce", 7, 2),
        ("scarce", "absent", 7, 2),
        ("scarce", "sufficient", 8, 2),
        ("scarce", "sufficient", 7, 3),
    ]:
        with pytest.raises(ValueError):
            research.matched(study_id, 1, *args)
    assert research.run(run_ids[0])["summary"]["usage"]["requests"] == 0
