import asyncio

import pytest
from agent_sim.assistants import Assistants
from agent_sim.db import Analysis, ProviderCall, Study, Workspace
from pydantic_ai.models.function import FunctionModel
from sqlalchemy import select


def test_submission_requires_a_running_loop_before_persisting_work(runtime, design):
    db, llm, research, engine = runtime
    sid = research.save_design(design)
    rid = research.study(sid)["runs"][0]["id"]
    assistants = Assistants(db, research, llm)
    with pytest.raises(RuntimeError, match="no running event loop"):
        engine.start(rid)
    with pytest.raises(RuntimeError, match="no running event loop"):
        assistants.start("Inspect this run", purpose="analysis", run_id=rid)
    assert research.configuration(rid)[0].status == "ready"
    assert not engine.executions
    assert not assistants.tasks
    with db.session() as session:
        assert session.scalar(select(Analysis)) is None
        assert session.scalar(select(ProviderCall)) is None
        assert session.get_one(Workspace, 1).charged == 0


@pytest.mark.parametrize("purpose", ["decision", "analysis"])
def test_cancellation_retains_one_unknown_reservation_and_no_turn(
    runtime, design, monkeypatch, purpose
):
    db, llm, research, engine = runtime
    sid = research.save_design(design)
    rid = research.study(sid)["runs"][0]["id"]
    checkpoint = research.run(rid)["state"]

    async def exercise():
        started = asyncio.Event()

        async def blocked(messages, info):
            started.set()
            await asyncio.Event().wait()

        async def blocked_stream(messages, info):
            await blocked(messages, info)
            yield "unreachable"

        monkeypatch.setattr(
            llm, "model", lambda _: FunctionModel(function=blocked, stream_function=blocked_stream)
        )
        assistant = Assistants(db, research, llm)
        if purpose == "decision":
            engine.start(rid)
            task = engine.executions[rid].task
        else:
            key = assistant.start("Inspect this run", purpose="analysis", run_id=rid)
            task = assistant.tasks[key]
        await asyncio.wait_for(started.wait(), timeout=5)
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task
        if purpose == "analysis":
            assert assistant.get(key)["status"] == "failed"
        await assistant.close()
        await engine.close()

    asyncio.run(exercise())
    assert research.run(rid)["state"] == checkpoint
    assert research.configuration(rid)[0].turn == 0
    with db.session() as session:
        calls = session.scalars(select(ProviderCall)).all()
        assert len(calls) == 1
        assert calls[0].status == "unknown"
        assert calls[0].charged == calls[0].reserved > 0
        assert session.get_one(Workspace, 1).charged == calls[0].reserved
        assert session.get_one(Study, sid).charged == calls[0].reserved
    assert llm.usage(run_id=rid)["partial"] is True
    assert llm.usage_by_run({rid})[rid] == llm.usage(run_id=rid)


def test_restart_recovers_pending_work_without_new_requests(runtime, design):
    from agent_sim.execution import Engine

    db, llm, research, _ = runtime
    sid = research.save_design(design)
    rid = research.study(sid)["runs"][0]["id"]
    with db.session.begin() as session:
        analysis = Analysis(
            purpose="analysis", study_id=sid, run_id=rid, question="Inspect", cutoffs={rid: 0}
        )
        session.add(analysis)
        session.flush()
        aid = analysis.id
        session.add(
            ProviderCall(
                study_id=sid,
                run_id=rid,
                analysis_id=aid,
                purpose="analysis",
                model="openai:gpt-6.1-sol",
                reserved=100,
                charged=100,
            )
        )
        session.get_one(Workspace, 1).charged = 100
        session.get_one(Study, sid).charged = 100
    engine = Engine(db, research, llm)
    assistant = Assistants(db, research, llm)
    assert not engine.executions and not assistant.tasks
    assert assistant.get(aid)["status"] == "failed"
    with db.session() as session:
        calls = session.scalars(select(ProviderCall)).all()
        assert len(calls) == 1 and calls[0].status == "unknown"
        assert calls[0].charged == 100
        assert session.get_one(Workspace, 1).charged == 100
        assert session.get_one(Study, sid).charged == 100
