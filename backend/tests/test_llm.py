import asyncio
import json

import pytest
from agent_sim.db import ProviderCall, Study, Workspace
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.models.function import FunctionModel
from pydantic_ai.usage import RequestUsage
from sqlalchemy import select


def test_study_budget_failure_rolls_back_workspace_reservation(runtime, design):
    db, llm, research, engine = runtime
    sid = research.save_design(design)
    rid = research.study(sid)["runs"][0]["id"]
    with db.session.begin() as session:
        session.get_one(Study, sid).ceiling = 1

    async def exercise():
        await engine.start(rid)
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
        await engine.start(rid)
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
        await engine.start(rid)
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
        await engine.start(rid)
        await engine.executions[rid].task

    asyncio.run(exercise())
    expected = {p.key: p.model or design.conditions[0].model for p in design.profiles}
    assert dict(seen) == expected
    assert set(research.run(rid)["summary"]["models"]) == set(expected.values())


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


def test_settlement_failure_preserves_provider_failure_and_reservation(runtime, monkeypatch):
    import pytest
    from agent_sim.llm import ProviderFailure

    db, llm, _, _ = runtime

    async def failed(messages, info):
        raise TimeoutError("primary provider failure")

    def failed_settlement(*args):
        raise RuntimeError("secondary accounting failure")

    monkeypatch.setattr(llm, "model", lambda _: FunctionModel(function=failed))
    monkeypatch.setattr(llm, "_settle", failed_settlement)
    with pytest.raises(ProviderFailure) as failure:
        asyncio.run(
            llm.generate(
                str,
                model="openai:gpt-6-luna",
                prompt="test",
                instructions="test",
                purpose="analysis",
            )
        )
    assert isinstance(failure.value.__cause__, TimeoutError)
    with db.session() as session:
        call = session.scalars(select(ProviderCall)).one()
        assert call.status == "pending"
        assert session.get_one(Workspace, 1).charged == call.reserved > 0
    llm.recover()
    with db.session() as session:
        assert session.scalars(select(ProviderCall)).one().status == "unknown"


def test_settlement_failure_preserves_cancellation(runtime, monkeypatch):
    import pytest

    _, llm, _, _ = runtime

    async def cancelled(messages, info):
        raise asyncio.CancelledError()

    def failed_settlement(*args):
        raise RuntimeError("secondary accounting failure")

    monkeypatch.setattr(llm, "model", lambda _: FunctionModel(function=cancelled))
    monkeypatch.setattr(llm, "_settle", failed_settlement)
    with pytest.raises(asyncio.CancelledError):
        asyncio.run(
            llm.generate(
                str,
                model="openai:gpt-6-luna",
                prompt="test",
                instructions="test",
                purpose="analysis",
            )
        )


def test_settlement_failure_after_success_propagates(runtime, monkeypatch):
    import pytest

    _, llm, _, _ = runtime

    async def completed(messages, info):
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, {"response": "answer"})]
        )

    def failed_settlement(*args):
        raise RuntimeError("accounting unavailable")

    monkeypatch.setattr(llm, "model", lambda _: FunctionModel(function=completed))
    monkeypatch.setattr(llm, "_settle", failed_settlement)
    with pytest.raises(RuntimeError, match="accounting unavailable"):
        asyncio.run(
            llm.generate(
                str,
                model="openai:gpt-6-luna",
                prompt="test",
                instructions="test",
                purpose="analysis",
            )
        )


@pytest.mark.parametrize("capacity", [0, 33])
def test_provider_concurrency_rejects_out_of_range_settings(tmp_path, monkeypatch, capacity):
    from agent_sim.db import Database
    from agent_sim.llm import LanguageModels

    monkeypatch.setenv("JAS_CONCURRENT_REQUESTS", str(capacity))
    db = Database(f"sqlite:///{tmp_path}/pool.sqlite3")
    try:
        with pytest.raises(ValueError, match="between 1 and 32"):
            LanguageModels(db)
    finally:
        db.close()


def test_provider_trace_keeps_observable_output_and_usage_without_thinking(runtime, monkeypatch):
    from pydantic_ai.messages import ThinkingPart

    db, llm, _, _ = runtime
    captured = []

    async def respond(messages, info):
        response = ModelResponse(
            parts=[
                ThinkingPart(
                    content="private-reasoning-canary", signature="opaque-signature-canary"
                ),
                ToolCallPart(info.output_tools[0].name, {"response": "Observable answer"}),
            ],
            usage=RequestUsage(
                input_tokens=120, output_tokens=30, details={"reasoning_tokens": 12}
            ),
        )
        captured.append(response)
        return response

    monkeypatch.setattr(llm, "model", lambda _: FunctionModel(function=respond))
    answer = asyncio.run(
        llm.generate(
            str,
            model="openai:gpt-6-luna",
            prompt="Return an observable answer",
            instructions="Answer briefly",
            purpose="analysis",
        )
    )
    assert answer == "Observable answer"
    with db.session() as session:
        call = session.scalar(select(ProviderCall))
        serialized = json.dumps(call.response_payload)
        assert "Observable answer" in serialized
        assert "private-reasoning-canary" not in serialized
        assert "opaque-signature-canary" not in serialized
        assert all(
            part["part_kind"] != "thinking"
            for message in call.response_payload
            for part in message["parts"]
        )
        assert (call.input_tokens, call.output_tokens, call.reasoning_tokens) == (120, 30, 12)
        assert call.charged == 27 and call.status == "complete"
    assert isinstance(captured[0].parts[0], ThinkingPart)


@pytest.mark.parametrize(
    ("ceiling", "charged", "available"),
    [(4281440, 0, True), (4281439, 0, False), (5000000, 718560, True), (5000000, 718561, False)],
)
def test_web_research_availability_uses_unreserved_workspace_headroom(
    runtime, monkeypatch, ceiling, charged, available
):
    db, llm, _, _ = runtime
    llm.registry.configuration.preferences.planner_web_research = True
    monkeypatch.setenv("JAS_PLANNER_MODEL", "openai:gpt-6.1-sol")
    with db.session.begin() as session:
        row = session.get_one(Workspace, 1)
        row.ceiling, row.charged = ceiling, charged
    assert llm.web_research_available() is available
    with db.session() as session:
        assert session.get_one(Workspace, 1).charged == charged
        assert session.query(ProviderCall).count() == 0
