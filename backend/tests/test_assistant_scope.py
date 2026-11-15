import asyncio

import pytest
from agent_sim.assistants import Assistants
from agent_sim.db import Analysis


def test_explicit_scope_pins_version_and_turn_and_excludes_future_conversation(
    runtime, design, monkeypatch
):
    db, models, research, engine = runtime
    sid = research.save_design(design)
    original = research.study(sid)["runs"][0]["id"]
    research.save_design(design, study_id=sid)
    current = research.study(sid)["runs"][0]["id"]
    assistant = Assistants(db, research, models)

    async def stopped(_key):
        return None

    monkeypatch.setattr(assistant, "_execute", stopped)

    async def exercise():
        await engine.start(original)
        task = engine.executions[original].task
        assert task is not None
        await task
        first = await assistant.send("Version one", f"study:{sid}", revision=1)
        await assistant.tasks[first["id"]]
        row = assistant.get(first["id"])
        assert set(row["cutoffs"]) == {original}
        assert current not in row["cutoffs"]
        with db.session.begin() as session:
            first_row = session.get_one(Analysis, first["id"])
            first_row.status = "complete"
            first_row.output = {**first_row.output, "answer": "FUTURE_ANSWER_CANARY"}
            first_row.run_id = original
        earlier = await assistant.send(
            "Before anything happened",
            f"run:{original}",
            first["chat_id"],
            revision=1,
            through_turn=0,
        )
        await assistant.tasks[earlier["id"]]
        with db.session() as session:
            earlier_row = session.get_one(Analysis, earlier["id"])
            assert earlier_row.cutoffs == {original: 0}
            assert assistant._conversation(earlier_row) == []
        for kwargs in [{"revision": 2}, {"through_turn": -1}, {"through_turn": 100000}]:
            with pytest.raises(ValueError):
                await assistant.send(
                    "Outside scope",
                    f"run:{original}",
                    revision=kwargs.get("revision"),
                    through_turn=kwargs.get("through_turn"),
                )
        with pytest.raises(ValueError):
            await assistant.send("No run selected", f"study:{sid}", through_turn=0)
        await assistant.close()
        await engine.close()

    asyncio.run(exercise())
