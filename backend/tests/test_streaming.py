import asyncio

import pytest
from agent_sim.assistants import Assistants
from agent_sim.db import ProviderCall, Workspace
from agent_sim.llm import ProviderFailure
from pydantic_ai.models.function import DeltaToolCall, FunctionModel
from sqlalchemy import select


@pytest.mark.parametrize("ending", ["complete", "unselected-citation", "interrupted"])
def test_streamed_prose_precedes_completion_and_preserves_validation_and_cost(
    runtime, monkeypatch, ending
):
    db, models, research, _ = runtime
    snapshots = []
    partial_observed = asyncio.Event()

    async def stream(messages, info):
        yield {0: DeltaToolCall(name=info.output_tools[0].name, json_args='{"answer":"Matched')}
        await asyncio.wait_for(partial_observed.wait(), timeout=5)
        if ending == "interrupted":
            raise TimeoutError("Interrupted test stream")
        citations = (
            '[{"run_id":"unselected","turn":1}]' if ending == "unselected-citation" else "[]"
        )
        yield {
            0: DeltaToolCall(
                json_args=f' seeds share randomization.","citations":{citations},"caveats":[]}}'
            )
        }

    monkeypatch.setattr(models, "model", lambda _: FunctionModel(stream_function=stream))

    async def exercise():
        agent = Assistants(db, research, models)
        publish = agent._partial

        def observe(key, text):
            publish(key, text)
            snapshots.append(agent.get(key))
            partial_observed.set()

        monkeypatch.setattr(agent, "_partial", observe)
        result = await agent.send("Explain matched seeds", "general")
        await agent.tasks[result["id"]]
        final = agent.get(result["id"])
        assert any(
            s["status"] == "pending" and s["output"].get("partial") == "Matched" for s in snapshots
        )
        if ending == "complete":
            assert final["status"] == "complete"
            assert final["output"]["answer"] == "Matched seeds share randomization."
        else:
            assert final["status"] == "failed"
            assert final["error"]
        assert "partial" not in final["output"]
        assert len(agent.chat(result["chat_id"])) == 1
        with db.session() as session:
            calls = session.scalars(select(ProviderCall)).all()
            assert len(calls) == 1
            assert calls[0].response_payload
            assert calls[0].charged > 0
            assert session.get_one(Workspace, 1).charged == calls[0].charged
        await agent.close()

    asyncio.run(exercise())


def test_streaming_budget_rejection_never_contacts_provider(runtime, monkeypatch):
    db, models, _, _ = runtime
    contacted = False

    async def stream(messages, info):
        nonlocal contacted
        contacted = True
        yield "Should not be requested"

    monkeypatch.setattr(models, "model", lambda _: FunctionModel(stream_function=stream))
    with db.session.begin() as session:
        session.get_one(Workspace, 1).ceiling = 1
    with pytest.raises(ProviderFailure, match="spending ceiling"):
        asyncio.run(
            models.generate(
                str,
                model="openai:gpt-6.1-sol",
                prompt="Hello",
                instructions="Answer",
                purpose="general",
                on_partial=lambda _: None,
            )
        )
    assert not contacted and models.usage()["requests"] == 0


def test_partial_outputs_handle_incomplete_and_non_object_fragments():
    from agent_sim.llm import partial_outputs
    from pydantic_ai.messages import ModelResponse, TextPart, ToolCallPart

    response = ModelResponse(
        parts=[
            ToolCallPart("answer", "}"),
            ToolCallPart("answer", "[]"),
            ToolCallPart("answer", '{"answer":"Partial'),
            ToolCallPart("answer", {"answer": "Complete"}),
            TextPart("First "),
            TextPart("second"),
        ]
    )
    assert list(partial_outputs(response, web_search=False)) == [
        {"answer": "Partial"},
        {"answer": "Complete"},
    ]
    assert list(partial_outputs(response, web_search=True))[-1] == {"text": "First second"}
