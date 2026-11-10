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
        await engine.start(run_id)
        await engine.executions[run_id].task
        await engine.close()

    asyncio.run(run())
    record = research.run(run_id)
    assert record["summary"]["status"] == "complete", record["summary"]["error"]
    expected = {
        "bargaining": 2,
        "artifact_workspace": 1,
        "distributed_coordination": 3,
        "reliance_commitments": 4,
    }.get(design.environment, design.turn_count)
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

        async with asyncio.timeout(10):
            try:
                monkeypatch.setattr(llm, "generate", delayed)
                await engine.start(rid)
                first = engine.executions[rid].task
                await started.wait()
                await engine.start(rid)
                assert engine.executions[rid].task is first
                engine.pause(rid)
                release.set()
                await first
                record, _, _ = research.configuration(rid)
                assert record.status == "paused" and record.turn == 1
                assert llm.usage(run_id=rid)["requests"] == 1
                await engine.start(rid, single=True)
                await engine.executions[rid].task
                assert research.configuration(rid)[0].turn == 2
                await engine.close()
            finally:
                release.set()
                await asyncio.wait_for(engine.close(), timeout=5)

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
        await engine.start(rid)
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
        await engine.start(rid)
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


@pytest.mark.parametrize("field", ["actor", "decision", "state_hash"])
def test_replay_rejects_corruption_without_requests_or_checkpoint_changes(runtime, design, field):
    from agent_sim.db import Turn
    from sqlalchemy import select

    db, llm, research, engine = runtime
    sid = research.save_design(design)
    rid = research.operational_runs(sid)[0].id

    async def step():
        await engine.start(rid, single=True)
        await engine.executions[rid].task

    asyncio.run(step())
    before = research.configuration(rid)[0].checkpoint
    usage = llm.usage()
    with db.session.begin() as session:
        turn = session.scalars(select(Turn).where(Turn.run_id == rid)).one()
        setattr(turn, field, {"invalid": True} if field == "decision" else "corrupted")
    with pytest.raises(ValueError):
        engine.replay(rid)
    assert research.configuration(rid)[0].checkpoint == before
    assert llm.usage() == usage


def test_capacity_one_and_pausing_queued_run_send_one_request(runtime, design, monkeypatch):
    db, llm, research, _ = runtime
    engine = Engine(db, research, llm, concurrency=1)
    design.seeds = [7, 8]
    runs = research.operational_runs(research.save_design(design))
    generate = llm.generate

    async def exercise():
        entered, release = asyncio.Event(), asyncio.Event()
        calls = []

        async def delayed(*args, **kwargs):
            calls.append(kwargs["run_id"])
            entered.set()
            await release.wait()
            return await generate(*args, **kwargs)

        async with asyncio.timeout(10):
            try:
                monkeypatch.setattr(llm, "generate", delayed)
                await engine.start(runs[0].id, single=True)
                await entered.wait()
                await engine.start(runs[1].id, single=True)
                await asyncio.sleep(0)
                assert calls == [runs[0].id]
                assert research.configuration(runs[1].id)[0].status == "queued"
                engine.pause(runs[1].id)
                release.set()
                await engine.close()
                assert calls == [runs[0].id]
                assert research.configuration(runs[1].id)[0].turn == 0
                assert research.configuration(runs[1].id)[0].status == "paused"
                assert llm.usage()["requests"] == 1
            finally:
                release.set()
                await asyncio.wait_for(engine.close(), timeout=5)

    asyncio.run(exercise())


def test_concurrent_runs_cannot_reserve_above_shared_budget(runtime, design, monkeypatch):

    from agent_sim.db import ProviderCall
    from pydantic_ai.messages import ModelResponse, ToolCallPart
    from pydantic_ai.models.function import FunctionModel
    from pydantic_ai.usage import RequestUsage
    from sqlalchemy import select

    db, llm, research, engine = runtime
    design.seeds = [7, 8]
    runs = research.operational_runs(research.save_design(design))

    async def exercise():
        entered, release = asyncio.Event(), asyncio.Event()
        requests = []

        async def delayed(messages, info):
            requests.append(messages)
            entered.set()
            await release.wait()
            return ModelResponse(
                parts=[
                    ToolCallPart(
                        info.output_tools[0].name,
                        {
                            "action": {
                                "kind": "contribute",
                                "amount": 0,
                                "target": "",
                                "message": "",
                                "report": None,
                                "promise": None,
                            },
                            "memory": "",
                            "rationale": "",
                            "forecast": None,
                        },
                    )
                ],
                usage=RequestUsage(input_tokens=100, output_tokens=50),
            )

        async with asyncio.timeout(10):
            try:
                monkeypatch.setattr(llm, "model", lambda _: FunctionModel(function=delayed))
                await engine.start(runs[0].id, single=True)
                await entered.wait()
                with db.session.begin() as session:
                    workspace = session.get_one(Workspace, 1)
                    workspace.ceiling = workspace.charged
                    reserved = workspace.charged
                await engine.start(runs[1].id, single=True)
                await engine.executions[runs[1].id].task
                assert research.configuration(runs[1].id)[0].status == "failed"
                assert len(requests) == 1
                with db.session() as session:
                    assert session.get_one(Workspace, 1).charged == reserved
                    assert len(session.scalars(select(ProviderCall)).all()) == 1
                release.set()
                await engine.executions[runs[0].id].task
                with db.session() as session:
                    assert session.get_one(Workspace, 1).charged == 35
                await engine.close()
            finally:
                release.set()
                await asyncio.wait_for(engine.close(), timeout=5)

    asyncio.run(exercise())


def test_replay_rejects_an_incompatible_checkpoint_without_recorded_turns(runtime, design):
    db, llm, research, engine = runtime
    sid = research.save_design(design)
    rid = research.operational_runs(sid)[0].id
    with db.session.begin() as session:
        saved = session.get_one(Run, rid)
        saved.checkpoint = saved.checkpoint | {"rule_version": "incompatible"}
    with pytest.raises(ValueError, match="different environment rule version"):
        engine.replay(rid)
    assert llm.usage()["requests"] == 0


def test_bulk_start_preflights_every_checkpoint_before_queueing(runtime, design):
    db, llm, research, engine = runtime
    design.seeds = [7, 8]
    sid = research.save_design(design)
    runs = research.operational_runs(sid)
    with db.session.begin() as session:
        saved = session.get_one(Run, runs[-1].id)
        saved.checkpoint = saved.checkpoint | {"rule_version": "incompatible"}

    async def exercise():
        with pytest.raises(ValueError, match="different environment rule version"):
            await engine.start_study(sid)
        assert not engine.executions
        assert all(research.configuration(run.id)[0].status == "ready" for run in runs)
        assert llm.usage()["requests"] == 0

    asyncio.run(exercise())


def test_bulk_start_ignores_completed_runs_with_old_rules(runtime, design):
    db, _, research, engine = runtime
    design.seeds = [7, 8]
    sid = research.save_design(design)
    runs = research.operational_runs(sid)
    with db.session.begin() as session:
        saved = session.get_one(Run, runs[0].id)
        saved.status = "complete"
        saved.checkpoint = saved.checkpoint | {"rule_version": "historical"}

    async def exercise():
        await engine.start_study(sid)
        task = engine.executions[runs[1].id].task
        await engine.start_study(sid)
        assert engine.executions[runs[1].id].task is task
        assert runs[0].id not in engine.executions
        await engine.close()
        assert research.configuration(runs[0].id)[0].status == "complete"

    asyncio.run(exercise())


def test_internal_value_error_retains_worker_diagnostics(runtime, design, monkeypatch, caplog):
    _, llm, research, engine = runtime
    rid = research.operational_runs(research.save_design(design))[0].id

    detail = "invalid internal result"

    async def broken_generation(*args, **kwargs):
        raise ValueError(detail)

    monkeypatch.setattr(llm, "generate", broken_generation)

    async def exercise():
        await engine.start(rid)
        await engine.executions[rid].task
        await engine.close()

    asyncio.run(exercise())
    assert research.configuration(rid)[0].status == "failed"
    assert f"Run {rid} failed (ValueError)" in caplog.text
    assert "broken_generation" in caplog.text
    assert "invalid internal result" not in caplog.text
