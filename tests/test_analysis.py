import asyncio

import pytest
from pydantic_ai.exceptions import ModelAuthenticationError
from pydantic_ai.messages import ModelResponse, ToolCallPart, ToolReturnPart
from pydantic_ai.models.function import FunctionModel
from pydantic_ai.usage import RequestUsage

from agent_sandbox import analysis
from agent_sandbox.analysis import AnalysisService, evidence
from agent_sandbox.replay import verify
from agent_sandbox.runner import Runner


def test_analysis_reads_run_evidence_and_keeps_simulation_unchanged(store, scenario, monkeypatch):
    runner = Runner.create(store, scenario)
    asyncio.run(runner.play(2))
    before = store.run(runner.id)
    frames = store.frames(runner.id)
    calls = []

    async def respond(messages, info):
        calls.append(messages.copy())
        if len(calls) == 1:
            part = ToolCallPart("read_history", {"start_turn": 0, "end_turn": 2})
        elif len(calls) == 2:
            returned = next(p for p in messages[-1].parts if isinstance(p, ToolReturnPart))
            assert returned.content == store.history(runner.id, 2)
            part = ToolCallPart("read_turn", {"turn": 1})
        else:
            returned = next(p for p in messages[-1].parts if isinstance(p, ToolReturnPart))
            assert returned.content == frames[1]
            part = ToolCallPart(
                info.output_tools[0].name,
                {
                    "text": "Mara worked at turn 1. Shared benefit is one criterion.",
                    "citations": [1],
                },
            )
        return ModelResponse(parts=[part], usage=RequestUsage(input_tokens=100, output_tokens=40))

    models = []

    def make_model(name):
        models.append(name)
        return FunctionModel(function=respond)

    monkeypatch.setattr(analysis, "make_model", make_model)

    async def exercise():
        service = AnalysisService(store)
        service.ask(runner.id, "Were any agents selfish?")
        with pytest.raises(ValueError, match="current answer"):
            service.ask(runner.id, "Double click")
        await service.tasks[runner.id]
        await service.close()

    asyncio.run(exercise())
    row = store.analyses(runner.id)[0]
    assert row["status"] == "complete", row["error"]
    assert row["through_tick"] == 2
    assert row["citations"] == [1]
    assert row["requests"] == 3
    assert row["input_tokens"] == 300
    assert row["output_tokens"] == 120
    assert models == ["openai:gpt-6.1-sol"]
    assert store.run(runner.id) == before
    assert store.frames(runner.id) == frames
    assert verify(store, runner.id) == 2


def test_evidence_cannot_access_other_runs_or_future_turns(store, scenario):
    runner = Runner.create(store, scenario)
    asyncio.run(runner.play(2))
    context, (read_history, read_turn) = evidence(store, runner.id, 1)
    asyncio.run(runner.step())
    assert context["through_turn"] == 1
    assert asyncio.run(read_turn(1))["run_id"] == runner.id
    assert [row["tick"] for row in asyncio.run(read_history(0, 1))] == [0, 1]
    for invalid in (-1, 2):
        with pytest.raises(ValueError, match="recorded turn"):
            asyncio.run(read_turn(invalid))
    with pytest.raises(ValueError, match="100 turns"):
        asyncio.run(read_history(0, 2))


def test_analysis_error_is_safe_and_separate_from_run(store, scenario, monkeypatch):
    runner = Runner.create(store, scenario)
    before = store.run(runner.id)

    def reject(name):
        raise ModelAuthenticationError("gpt-6.1-sol", "private provider credential detail")

    monkeypatch.setattr(analysis, "make_model", reject)

    async def exercise():
        service = AnalysisService(store)
        with pytest.raises(ValueError, match="question"):
            service.ask(runner.id, " ")
        service.ask(runner.id, "Who had the best strategy?")
        await service.tasks[runner.id]
        await service.close()

    asyncio.run(exercise())
    row = store.analyses(runner.id)[0]
    assert row["status"] == "failed"
    assert "GPT-6.1 Sol" in row["error"]
    assert "private" not in row["error"]
    assert row["requests"] == 0
    assert store.run(runner.id) == before
