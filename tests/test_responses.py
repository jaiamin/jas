"""Replay truncated Responses outputs through the real SDK and runner, without network."""

import asyncio
import json

import httpx2 as httpx
import pytest
from openai import AsyncOpenAI
from pydantic_ai import models
from pydantic_ai.models.openai import OpenAIResponsesModel
from pydantic_ai.providers.openai import OpenAIProvider

from agent_sandbox import policies
from agent_sandbox.replay import verify
from agent_sandbox.runner import Runner


@pytest.fixture
def reasoning_provider(monkeypatch):
    requests = []
    state = {"partial_tool": True}

    def respond(request):
        body = json.loads(request.content)
        requests.append(body)
        complete = body["max_output_tokens"] >= 900
        output = [{"type": "reasoning", "id": "rs_test", "summary": []}]
        if complete or state["partial_tool"]:
            output.append(
                {
                    "type": "function_call",
                    "id": "fc_test",
                    "call_id": "call_test",
                    "name": body["tools"][0]["name"],
                    "status": "completed" if complete else "incomplete",
                    "arguments": json.dumps(
                        {
                            "action": {
                                "kind": "rest",
                                "target": None,
                                "message": "",
                                "recipient": "all",
                            },
                            "memory": "Track supplies",
                            "rationale": "Recover stamina",
                        }
                    )
                    if complete
                    else '{"action":{"kind":"rest"},"memory":"private response fragment',
                }
            )
        return httpx.Response(
            200,
            json={
                "id": "resp_test",
                "object": "response",
                "created_at": 0,
                "model": "gpt-6-luna",
                "status": "completed" if complete else "incomplete",
                "incomplete_details": None if complete else {"reason": "max_output_tokens"},
                "output": output,
                "usage": {
                    "input_tokens": 825,
                    "output_tokens": 900 if complete else 600,
                    "output_tokens_details": {"reasoning_tokens": 503},
                },
            },
        )

    def make_model(name):
        client = AsyncOpenAI(
            api_key="test-key-never-sent",
            max_retries=0,
            http_client=httpx.AsyncClient(transport=httpx.MockTransport(respond)),
        )
        return OpenAIResponsesModel("gpt-6-luna", provider=OpenAIProvider(openai_client=client))

    monkeypatch.setattr(models, "ALLOW_MODEL_REQUESTS", True)
    monkeypatch.setattr(policies, "make_model", make_model)
    return requests, state


def test_default_response_budget_covers_reasoning_and_decision(store, scenario, reasoning_provider):
    requests, _ = reasoning_provider
    runner = Runner.create(store, scenario)

    asyncio.run(runner.step())

    assert runner.tick == 1
    assert len(requests) == 1
    assert requests[0]["max_output_tokens"] == scenario.limits.max_output_tokens
    assert requests[0]["tools"][0]["strict"] is True
    record = store.run(runner.id)
    assert record["calls"] == 1
    assert record["output_tokens"] == 900  # Reasoning stays counted, not discarded.
    assert record["charged_tokens"] == 1725
    assert verify(store, runner.id) == 1


@pytest.mark.parametrize("partial_tool", [True, False])
def test_truncated_response_explains_limit_and_keeps_checkpoint(
    store, scenario, reasoning_provider, partial_tool
):
    requests, state = reasoning_provider
    state["partial_tool"] = partial_tool
    scenario.limits.max_output_tokens = 600  # Saved explicit limits still apply.
    runner = Runner.create(store, scenario)
    checkpoint = store.frame(runner.id)["checkpoint"]
    environment = runner.environment.snapshot()

    with pytest.raises(ValueError, match="600.*response.*tokens"):
        asyncio.run(runner.step())

    assert len(requests) == 1  # No hidden retry or fabricated decision.
    record = store.run(runner.id)
    assert "thinking" in record["error"]
    assert "private response fragment" not in record["error"]
    assert record["calls"] == 1
    assert record["input_tokens"] == 825
    assert record["output_tokens"] == 600
    assert record["charged_tokens"] == 1425  # HTTP supplied exact failed usage.
    assert store.frame(runner.id)["tick"] == 0
    assert store.frame(runner.id)["checkpoint"] == checkpoint
    assert runner.environment.snapshot() == environment
