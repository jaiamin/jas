import asyncio
import json

import pytest
from agent_sim.db import ProviderCall, Study, Workspace
from agent_sim.execution import decision_schema
from pydantic import ValidationError
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.models.function import FunctionModel
from pydantic_ai.usage import RequestUsage
from sqlalchemy import select


def test_disabled_communication_schema_prevents_illegal_choices(design):
    output = decision_schema("commons", False, 5, ("", "alex"), ("contribute",))
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
        output = decision_schema("coordination", True, 0, ("", "task-a"), ("work", "wait"))
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
    output = decision_schema("commons", True, 3, ("", "alex"), ("contribute",))
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
