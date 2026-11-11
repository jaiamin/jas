import asyncio
import json

import pytest
from agent_sim.assistants import Assistants, GeneralResponse
from agent_sim.db import Analysis
from agent_sim.planning import Planner
from sqlalchemy.exc import NoResultFound


def test_chats_persist_followups_isolate_contexts_and_keep_proposals_reviewable(
    runtime, design, monkeypatch
):
    db, models, research, _ = runtime
    sid = research.save_design(design)
    rid = research.study(sid)["runs"][0]["id"]
    prompts, plans = [], []

    async def generate(output, **kwargs):
        prompts.append(json.loads(kwargs["prompt"]))
        return GeneralResponse(
            answer="A matched seed shares an initial randomization.",
            citations=[],
            caveats=[],
            propose_experiment=False,
        )

    async def plan(_planner, key, question, conversation):
        plans.append({"id": key, "question": question, "conversation": conversation})
        return {"supported": True, "explanation": "A reviewed pilot", "design": design.model_dump()}

    monkeypatch.setattr(models, "generate", generate)
    monkeypatch.setattr(Planner, "run", plan)

    async def exercise():
        agent = Assistants(db, research, models)
        first = await agent.send("What is a matched seed?", "general")
        await agent.tasks[first["id"]]
        other = await agent.send("An unrelated conversation", "general")
        await agent.tasks[other["id"]]
        assert first["chat_id"] != other["chat_id"] and prompts[-1]["conversation"] == []
        followup = await agent.send("Why does that help?", "general", first["chat_id"])
        await agent.tasks[followup["id"]]
        assert [item["question"] for item in prompts[-1]["conversation"]] == [
            "What is a matched seed?"
        ]
        with db.session.begin() as session:
            session.add(
                Analysis(
                    chat_id=first["chat_id"],
                    purpose="analysis",
                    study_id=sid,
                    run_id=rid,
                    question="Private recorded result",
                    status="complete",
                    output={"answer": "Unselected evidence must stay out"},
                    cutoffs={rid: 0},
                )
            )
        general = await agent.send("Explain the method", "general", first["chat_id"])
        await agent.tasks[general["id"]]
        assert all(
            item["question"] != "Private recorded result" for item in prompts[-1]["conversation"]
        )
        proposed = await agent.send("Design a pilot", "new", first["chat_id"])
        await agent.tasks[proposed["id"]]
        revised = await agent.send("Keep the pilot and shorten the title", "new", first["chat_id"])
        await agent.tasks[revised["id"]]
        assert plans[-1]["conversation"][-1]["proposal"] == design.model_dump()
        assert len(research.studies()) == 1  # Proposals never save or execute themselves.
        assert agent.get(proposed["id"])["purpose"] == "design"
        assert len(agent.chats()) == 2
        assert agent.chats()[0]["title"] == "What is a matched seed?"
        assert agent.chats()[0]["context"] == "general"
        assert len(agent.chat(first["chat_id"])) == 6
        await agent.close()
        reopened = Assistants(db, research, models)
        assert len(reopened.chat(first["chat_id"])) == 6
        assert reopened.chat(other["chat_id"])[0]["question"] == "An unrelated conversation"
        await reopened.close()

    asyncio.run(exercise())


def test_chat_pending_guard_and_invalid_contexts_do_not_start_work(runtime, monkeypatch):
    db, models, research, _ = runtime

    async def exercise():
        agent = Assistants(db, research, models)
        release = asyncio.Event()

        async def execute(_key):
            await release.wait()

        monkeypatch.setattr(agent, "_execute", execute)
        first = await agent.send("Same question", "general")
        independent = await agent.send("Same question", "general")
        assert first["chat_id"] != independent["chat_id"]
        with pytest.raises(ValueError, match="current request"):
            await agent.send("A different question", "new", first["chat_id"])
        for context in ("", "run:", "study:", "unknown", "study:missing", "run:missing"):
            with pytest.raises((ValueError, NoResultFound)):
                await agent.send("Question", context)
        with pytest.raises(NoResultFound):
            await agent.send("Question", "general", "missing-chat")
        assert len(agent.chats()) == 2 and models.usage()["requests"] == 0
        release.set()
        await agent.close()

    asyncio.run(exercise())
