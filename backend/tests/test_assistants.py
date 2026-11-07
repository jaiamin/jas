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
        from agent_sim.db import Analysis

        with db.session.begin() as session:
            session.add_all(
                [
                    Analysis(
                        purpose="analysis",
                        study_id=sid,
                        run_id=rid,
                        question="What changed?",
                        status="complete",
                        output={"answer": "The contribution changed."},
                        cutoffs={rid: 1},
                    ),
                    Analysis(
                        purpose="analysis",
                        study_id=sid,
                        run_id=None,
                        question="A different scope",
                        status="complete",
                        output={"answer": "Do not include me."},
                        cutoffs={rid: 1},
                    ),
                ]
            )
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
            import json

            assert json.loads(kwargs["prompt"])["conversation"] == [
                {
                    "question": "What changed?",
                    "answer": "The contribution changed.",
                    "cutoffs": {rid: 1},
                }
            ]
            return next(responses)

        monkeypatch.setattr(llm, "generate", generate)
        with db.session.begin() as session:
            analysis = Analysis(
                purpose="analysis",
                study_id=sid,
                run_id=rid,
                question="What happened?",
                cutoffs={rid: 1},
            )
            session.add(analysis)
            session.flush()
            key = analysis.id
        row = {
            "id": key,
            "study_id": sid,
            "run_id": rid,
            "question": "What happened?",
            "cutoffs": {rid: 1},
        }
        output = await assistant._investigate(
            row["id"],
            row["question"],
            study_id=row["study_id"],
            run_id=row["run_id"],
            cutoffs=row["cutoffs"],
        )
        progress = assistant.get(key)["output"]
        assert progress["stage"] == "investigating"
        assert progress["examined"] == output["examined"]
        return output

    if citation_turn == 2:
        with pytest.raises(ValueError, match="outside the captured"):
            asyncio.run(exercise())
    else:
        output = asyncio.run(exercise())
        assert output["examined"] == [{"run_id": rid, "start": 1, "end": 1, "full_turn": False}]


def test_independent_questions_can_plan_concurrently_but_duplicates_are_blocked(
    runtime, monkeypatch
):
    db, llm, research, _ = runtime

    async def exercise():
        assistant = Assistants(db, research, llm)
        release = asyncio.Event()

        async def execute(key):
            await release.wait()

        monkeypatch.setattr(assistant, "_execute", execute)
        first = assistant.start("Question one", purpose="design")
        second = assistant.start("Question two", purpose="design")
        assert first != second
        with pytest.raises(ValueError, match="current request"):
            assistant.start("Question one", purpose="design")
        release.set()
        await assistant.close()

    asyncio.run(exercise())


def test_investigator_uses_shared_metric_rules_at_its_frozen_cutoff(runtime, monkeypatch):
    import json

    from agent_sim.db import Measurement
    from agent_sim.domain import Design
    from agent_sim.templates import templates

    db, llm, research, engine = runtime
    design = Design.model_validate(
        next(t["design"] for t in templates() if t["id"] == "renewable_resource")
    )
    design.conditions = design.conditions[:1]
    design.seeds = [7]
    sid = research.save_design(design)
    rid = research.study(sid)["runs"][0]["id"]
    prompts = []

    async def answer(*args, **kwargs):
        prompts.append(json.loads(kwargs["prompt"]))
        return Investigation(
            requests=[], answer=Finding(answer="No claim.", citations=[], caveats=[])
        )

    async def exercise():
        for _ in range(2):
            engine.start(rid, single=True)
            await engine.executions[rid].task
        with db.session.begin() as session:
            for turn, key, value in [
                (1, "stock_fraction", 0.8),
                (2, "stock_fraction", 0.2),
                (3, "stock_fraction", 0.9),
                (1, "collapse_rate", 1),
                (2, "collapse_rate", 0),
            ]:
                session.add(Measurement(run_id=rid, turn=turn, round=1, key=key, value=value))
        assistant = Assistants(db, research, llm)
        monkeypatch.setattr(llm, "generate", answer)
        key = assistant.start("What is the current stock?", purpose="analysis", run_id=rid)
        await assistant.tasks[key]
        assert assistant.get(key)["status"] == "complete"
        await assistant.close()

    asyncio.run(exercise())
    indexed = prompts[0]["index"]["runs"][0]
    assert indexed["through_turn"] == 2
    assert indexed["metrics"] == {"stock_fraction": 0.2, "collapse_rate": 1}
    assert research.metrics(rid) == {"stock_fraction": 0.9, "collapse_rate": 1}


def test_final_investigation_call_cannot_fetch_evidence_without_a_consumer(
    runtime, design, monkeypatch
):
    from agent_sim.assistants import TurnRequest

    db, llm, research, _ = runtime
    sid = research.save_design(design)
    rid = research.study(sid)["runs"][0]["id"]
    prompts, reads = [], []
    evidence = research.evidence

    def record_evidence(*args):
        reads.append(args)
        return evidence(*args)

    async def request_more(*args, **kwargs):
        prompts.append(kwargs["prompt"])
        return Investigation(requests=[TurnRequest(kind="turn", run_id=rid, turn=0)], answer=None)

    monkeypatch.setattr(llm, "generate", request_more)
    monkeypatch.setattr(research, "evidence", record_evidence)

    async def exercise():
        assistant = Assistants(db, research, llm)
        key = assistant.start("Inspect everything", purpose="analysis", run_id=rid)
        await assistant.tasks[key]
        assert assistant.get(key)["status"] == "failed"
        assert "request limit" in assistant.get(key)["error"]
        await assistant.close()

    asyncio.run(exercise())
    assert len(prompts) == 4
    assert len(reads) == 4  # Initial cutoff plus three evidence-gathering rounds.


def test_initial_worker_read_failure_is_persisted_and_logged(runtime, caplog):
    from agent_sim.db import Analysis
    from sqlalchemy import event

    db, llm, research, _ = runtime
    assistant = Assistants(db, research, llm)
    with db.session.begin() as session:
        request = Analysis(question="Inspect evidence", purpose="analysis", cutoffs={})
        session.add(request)
        session.flush()
        key = request.id
    failed = False

    def fail_first_read(connection, cursor, statement, parameters, context, executemany):
        nonlocal failed
        if not failed and statement.lstrip().startswith("SELECT"):
            failed = True
            raise RuntimeError("one-shot initialization failure")

    event.listen(db.engine, "before_cursor_execute", fail_first_read)
    try:
        asyncio.run(assistant._execute(key))
    finally:
        event.remove(db.engine, "before_cursor_execute", fail_first_read)
    with db.session() as session:
        request = session.get_one(Analysis, key)
        assert request.status == "failed"
        assert request.error == "Research assistant failed (RuntimeError); no fallback."
    assert f"Analysis {key} failed" in caplog.text
    assert llm.usage()["requests"] == 0
