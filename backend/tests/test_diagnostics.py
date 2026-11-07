import asyncio
import json

import pytest
from agent_sim.assistants import Assistants
from agent_sim.db import Analysis, ProviderCall, Study, Workspace
from agent_sim.decisions import ActionOption, decision_schema
from pydantic import ValidationError
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.models.function import FunctionModel
from pydantic_ai.usage import RequestUsage
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


def test_disabled_communication_schema_prevents_illegal_choices(design):
    output = decision_schema("commons", False, (ActionOption("contribute", 0, 5, ("", "alex")),))
    payload = {
        "action": {
            "kind": "contribute",
            "amount": 2,
            "target": "",
            "message": "",
            "report": None,
            "promise": None,
        },
        "memory": "",
        "rationale": "",
        "forecast": None,
    }
    output.model_validate(payload)
    for changes in [{"message": "hello"}, {"report": 1}, {"promise": 1}, {"amount": 6}]:
        invalid = {**payload, "action": {**payload["action"], **changes}}
        with pytest.raises(ValidationError):
            output.model_validate(invalid)


def test_study_budget_failure_rolls_back_workspace_reservation(runtime, design):
    db, llm, research, engine = runtime
    sid = research.save_design(design)
    rid = research.study(sid)["runs"][0]["id"]
    with db.session.begin() as session:
        session.get_one(Study, sid).ceiling = 1

    async def exercise():
        engine.start(rid)
        await engine.executions[rid].task

    asyncio.run(exercise())
    with db.session() as session:
        assert session.get_one(Workspace, 1).charged == 0
        assert session.get_one(Study, sid).charged == 0
    assert llm.usage()["requests"] == 0


def test_invalid_model_output_retains_trace_and_known_usage(runtime, design, monkeypatch):
    db, llm, research, engine = runtime

    async def invalid(messages, info):
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, {"bad": True})],
            usage=RequestUsage(input_tokens=15, output_tokens=5),
        )

    monkeypatch.setattr(llm, "model", lambda _: FunctionModel(function=invalid))
    sid = research.save_design(design)
    rid = research.study(sid)["runs"][0]["id"]

    async def exercise():
        engine.start(rid)
        await engine.executions[rid].task

    asyncio.run(exercise())
    assert research.run(rid)["summary"]["turn"] == 0
    with db.session() as session:
        calls = session.scalars(select(ProviderCall)).all()
        assert len(calls) == 1
        assert calls[0].status == "failed" and calls[0].output_tokens == 5
        assert calls[0].request_payload["schema"] and calls[0].response_payload


def test_unknown_usage_keeps_reservation_without_retry(runtime, design, monkeypatch):
    db, llm, research, engine = runtime

    async def interrupted(messages, info):
        raise TimeoutError("diagnostic")

    monkeypatch.setattr(llm, "model", lambda _: FunctionModel(function=interrupted))
    sid = research.save_design(design)
    rid = research.study(sid)["runs"][0]["id"]

    async def exercise():
        engine.start(rid)
        await engine.executions[rid].task

    asyncio.run(exercise())
    with db.session() as session:
        calls = session.scalars(select(ProviderCall)).all()
        assert len(calls) == 1 and calls[0].status == "unknown"
        assert calls[0].reserved == calls[0].charged > 0
        assert session.get_one(Workspace, 1).charged == calls[0].reserved


def test_agent_specific_models_are_used_and_recorded(runtime, design, monkeypatch):
    db, llm, research, engine = runtime
    design.rounds = 1
    design.profiles[0].model = "openai:gpt-6.1-sol"
    generate, seen = llm.generate, []

    async def record(*args, **kwargs):
        seen.append((json.loads(kwargs["prompt"])["you"]["key"], kwargs["model"]))
        return await generate(*args, **kwargs)

    monkeypatch.setattr(llm, "generate", record)
    sid = research.save_design(design)
    rid = research.study(sid)["runs"][0]["id"]

    async def exercise():
        engine.start(rid)
        await engine.executions[rid].task

    asyncio.run(exercise())
    expected = {p.key: p.model or design.conditions[0].model for p in design.profiles}
    assert dict(seen) == expected
    assert set(research.run(rid)["summary"]["models"]) == set(expected.values())


def test_structured_actions_encode_cross_field_constraints():
    for kind, target, valid in [
        ("work", "task-a", True),
        ("wait", "", True),
        ("work", "", False),
        ("wait", "task-a", False),
    ]:
        output = decision_schema(
            "coordination",
            True,
            (ActionOption("work", 0, 0, ("task-a",)), ActionOption("wait", 0, 0, ("",))),
        )
        payload = {
            "action": {
                "kind": kind,
                "target": target,
                "amount": 0,
                "message": "",
                "report": None,
                "promise": None,
            },
            "rationale": "",
            "memory": "",
            "forecast": None,
        }
        if valid:
            output.model_validate(payload)
        else:
            with pytest.raises(ValidationError):
                output.model_validate(payload)
    output = decision_schema("commons", True, (ActionOption("contribute", 0, 3, ("", "alex")),))
    payload["action"].update(kind="contribute", target="", promise=4)
    with pytest.raises(ValidationError):
        output.model_validate(payload)


def test_web_research_is_bounded_traced_and_charged(runtime, monkeypatch):
    import httpx2 as httpx
    from openai import AsyncOpenAI
    from pydantic_ai import models
    from pydantic_ai.models.openai import OpenAIResponsesModel
    from pydantic_ai.providers.openai import OpenAIProvider

    db, llm, _, _ = runtime
    monkeypatch.setattr(models, "ALLOW_MODEL_REQUESTS", True)
    requests = []

    async def respond(request):
        requests.append(json.loads(request.content))
        return httpx.Response(
            200,
            json={
                "id": "resp_research",
                "object": "response",
                "created_at": 0,
                "model": "gpt-6.1-sol",
                "status": "completed",
                "output": [
                    {
                        "type": "web_search_call",
                        "id": "search_1",
                        "status": "completed",
                        "action": {
                            "type": "search",
                            "query": "public goods methods",
                            "sources": [{"type": "url", "url": "https://example.org/paper"}],
                        },
                    },
                    {
                        "type": "message",
                        "id": "msg_1",
                        "status": "completed",
                        "role": "assistant",
                        "content": [
                            {
                                "type": "output_text",
                                "text": "Use a matched control.",
                                "annotations": [],
                            }
                        ],
                    },
                ],
                "usage": {"input_tokens": 120, "output_tokens": 30, "total_tokens": 150},
            },
        )

    async def exercise():
        client = AsyncOpenAI(
            api_key="test-not-a-real-key",
            max_retries=0,
            http_client=httpx.AsyncClient(transport=httpx.MockTransport(respond)),
        )
        model = OpenAIResponsesModel("gpt-6.1-sol", provider=OpenAIProvider(openai_client=client))
        monkeypatch.setattr(llm, "model", lambda _: model)
        try:
            return await llm.generate(
                str,
                model="openai:gpt-6.1-sol",
                prompt="Find methods",
                instructions="Search first",
                purpose="design",
                web_search=True,
            )
        finally:
            await client.close()

    assert asyncio.run(exercise()) == "Use a matched control."
    assert requests[0]["max_tool_calls"] == 2
    assert requests[0]["tools"][0]["type"] == "web_search"
    assert "web_search_call.action.sources" in requests[0]["include"]
    with db.session() as session:
        call = session.scalar(select(ProviderCall))
        assert call.status == "complete" and call.reserved > call.charged
        assert call.charged == 10_540
        assert "https://example.org/paper" in json.dumps(call.response_payload)


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

        monkeypatch.setattr(llm, "model", lambda _: FunctionModel(function=blocked))
        assistant = Assistants(db, research, llm)
        if purpose == "decision":
            engine.start(rid)
            task = engine.executions[rid].task
        else:
            key = assistant.start("Inspect this run", purpose="analysis", run_id=rid)
            task = assistant.tasks[key]
        await started.wait()
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


def test_research_sources_reject_unsafe_or_malformed_links():
    from agent_sim.llm import web_sources

    sources = [
        {"url": url}
        for url in (
            "javascript:alert(1)",
            "https://user:password@example.org",
            "https://[invalid",
            "relative/path",
        )
    ]
    sources += [
        {"url": "https://example.org/paper", "title": "A paper"},
        {"url": "https://example.org/other"},
    ]
    messages = [
        {
            "parts": [
                {"tool_name": "ignored", "content": {"sources": sources}},
                {"tool_name": "web_search", "content": {"sources": sources}},
            ]
        }
    ]
    assert web_sources(messages) == [
        {"url": "https://example.org/paper", "title": "A paper"},
        {"url": "https://example.org/other", "title": "example.org"},
    ]


def test_internal_failure_logs_keep_stack_locations_without_exception_values(caplog):
    from agent_sim.diagnostics import log_failure

    provider_body = "private-provider-response"
    try:
        raise RuntimeError(provider_body)
    except RuntimeError as error:
        log_failure("Provider call example failed", error)
    assert "Provider call example failed (RuntimeError)" in caplog.text
    assert "test_internal_failure_logs" in caplog.text
    assert provider_body not in caplog.text
