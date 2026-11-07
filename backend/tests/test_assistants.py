import asyncio

import pytest
from agent_sim.assistants import Assistants, HistoryRequest, Investigation
from agent_sim.domain import Citation, Finding


@pytest.mark.parametrize("citation_turn", [1, 2])
def test_assistant_scopes_history_to_frozen_cutoff_and_rejects_unread_citations(
    runtime, design, monkeypatch, citation_turn
):
    db, llm, research, engine = runtime
    sid = research.save_design(design)
    rid = research.study(sid)["runs"][0]["id"]

    async def exercise():
        engine.start(rid, single=True)
        await engine.executions[rid].task
        assistant = Assistants(db, research, llm)
        responses = iter(
            [
                Investigation(
                    requests=[HistoryRequest(kind="history", run_id=rid, start=1, count=20)],
                    answer=None,
                ),
                Investigation(
                    requests=[],
                    answer=Finding(
                        answer="Observed an action.",
                        citations=[Citation(run_id=rid, turn=citation_turn)],
                        caveats=[],
                    ),
                ),
            ]
        )

        async def generate(*args, **kwargs):
            return next(responses)

        monkeypatch.setattr(llm, "generate", generate)
        row = {
            "id": "diagnostic",
            "study_id": sid,
            "run_id": rid,
            "question": "What happened?",
            "cutoffs": {rid: 1},
        }
        return await assistant._investigate(row)

    if citation_turn == 2:
        with pytest.raises(ValueError, match="outside the captured"):
            asyncio.run(exercise())
    else:
        output = asyncio.run(exercise())
        assert output["examined"] == [{"run_id": rid, "start": 1, "end": 1, "full_turn": False}]
