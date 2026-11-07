import asyncio

import pytest
from agent_sim.db import Run, Workspace
from agent_sim.domain import Design
from agent_sim.execution import Engine
from agent_sim.templates import templates


@pytest.mark.parametrize("template", templates(), ids=lambda x: x["id"])
def test_complete_all_adapters_and_exact_replay(runtime, template):
    db, llm, research, engine = runtime
    design = Design.model_validate(template["design"])
    design.rounds, design.seeds = 2, [7]
    design.conditions = design.conditions[:1]
    study_id = research.save_design(design)
    run_id = research.study(study_id)["runs"][0]["id"]

    async def run():
        engine.start(run_id)
        await engine.executions[run_id].task
        await engine.close()

    asyncio.run(run())
    record = research.run(run_id)
    assert record["summary"]["status"] == "complete", record["summary"]["error"]
    expected = 2 if design.environment == "bargaining" else design.turn_count
    assert record["summary"]["turn"] == expected
    assert engine.replay(run_id)["verified_turns"] == expected
    assert llm.usage(run_id=run_id)["requests"] == expected
    with db.session() as s:
        assert s.get_one(Workspace, 1).charged == expected * 35


def test_pause_finishes_current_request_and_double_click_has_one_writer(
    runtime, design, monkeypatch
):
    db, llm, research, engine = runtime
    sid = research.save_design(design)
    rid = research.study(sid)["runs"][0]["id"]
    generate = llm.generate

    async def exercise():
        started, release = asyncio.Event(), asyncio.Event()

        async def delayed(*args, **kwargs):
            started.set()
            await release.wait()
            return await generate(*args, **kwargs)

        monkeypatch.setattr(llm, "generate", delayed)
        engine.start(rid)
        first = engine.executions[rid].task
        await started.wait()
        engine.start(rid)
        assert engine.executions[rid].task is first
        engine.pause(rid)
        release.set()
        await first
        record, _, _ = research.configuration(rid)
        assert record.status == "paused" and record.turn == 1
        assert llm.usage(run_id=rid)["requests"] == 1
        engine.start(rid, single=True)
        await engine.executions[rid].task
        assert research.configuration(rid)[0].turn == 2
        await engine.close()

    asyncio.run(exercise())


def test_restart_pauses_stale_work_without_spending(runtime, design):
    db, llm, research, engine = runtime
    sid = research.save_design(design)
    rid = research.study(sid)["runs"][0]["id"]
    with db.session.begin() as s:
        s.get_one(Run, rid).status = "running"
    Engine(db, research, llm)
    assert research.configuration(rid)[0].status == "paused"
    assert llm.usage()["requests"] == 0


def test_budget_is_atomic_and_no_fallback_executes(runtime, design):
    db, llm, research, engine = runtime
    sid = research.save_design(design)
    rid = research.study(sid)["runs"][0]["id"]
    with db.session.begin() as s:
        s.get_one(Workspace, 1).ceiling = 1

    async def exercise():
        engine.start(rid)
        await engine.executions[rid].task

    asyncio.run(exercise())
    record = research.configuration(rid)[0]
    assert record.status == "failed"
    assert "No request was sent" in record.error
    assert record.turn == 0
    assert llm.usage()["requests"] == 0


def test_evidence_and_revisions_are_immutable(runtime, design):
    db, llm, research, engine = runtime
    sid = research.save_design(design)
    first = research.study(sid)
    old_hash = first["sha256"]
    edited = design.model_copy(deep=True)
    edited.title = "Tuned study"
    edited.conditions[0].parameters.endowment = 9
    research.save_design(edited, study_id=sid)
    assert research.study(sid)["revision"] == 2
    assert research.study(sid, 1)["sha256"] == old_hash
    assert research.study(sid, 1)["design"] == first["design"]
    assert research.configuration(first["runs"][0]["id"])[1] == design
    assert {run["revision"] for run in research.runs(sid)} == {1, 2}
    assert research.run(first["runs"][0]["id"])["summary"]["revision"] == 1


def test_composed_protocol_preserves_memory_privacy_and_replays_through_shock(runtime, design):
    from agent_sim.domain import ResourceChange

    _, _, research, engine = runtime
    design.conditions[0].parameters.endowment = 10
    design.conditions[0].parameters.memory = "none"
    design.conditions[0].parameters.communication = False
    design.conditions[0].parameters.resource_schedule = [ResourceChange(round=2, endowment=3)]
    design.profiles[0].model = "openai:gpt-6.1-sol"
    sid = research.save_design(design)
    rid = research.study(sid)["runs"][0]["id"]

    async def exercise():
        engine.start(rid)
        await engine.executions[rid].task

    asyncio.run(exercise())
    run = research.run(rid)
    assert run["summary"]["status"] == "complete"
    assert engine.replay(rid)["verified_turns"] == 12
    for turn in range(1, 13):
        observed = research.evidence(rid, turn)["observation"]
        assert not observed["public_history"] and not observed["your_experiences"]
        assert not observed["your_note"]
        assert observed["legal_actions"][0]["amount_max"] == (10 if turn <= 6 else 3)
