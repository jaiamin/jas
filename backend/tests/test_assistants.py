import asyncio

import pytest
from agent_sim.assistants import Assistants, HistoryRequest, Investigation
from agent_sim.domain import Citation, Finding


@pytest.mark.parametrize("invented_citation", [False, True])
def test_general_agent_keeps_history_separate_and_rejects_unselected_evidence(
    runtime, design, monkeypatch, invented_citation
):
    import json

    from agent_sim.db import Analysis

    db, llm, research, _ = runtime
    sid = research.save_design(design)

    async def exercise():
        assistant = Assistants(db, research, llm)
        with db.session.begin() as session:
            session.add_all(
                [
                    Analysis(
                        purpose="general",
                        chat_id="general-chat",
                        question="What is a matched seed?",
                        status="complete",
                        output={"answer": "A shared initial random seed."},
                        cutoffs={},
                    ),
                    Analysis(
                        purpose="design",
                        question="Design cooperation trials",
                        status="complete",
                        output={"answer": "A design proposal."},
                        cutoffs={},
                    ),
                    Analysis(
                        purpose="analysis",
                        study_id=sid,
                        question="Private run evidence",
                        status="complete",
                        output={"answer": "Scoped evidence."},
                        cutoffs={},
                    ),
                ]
            )

        async def generate(output, **kwargs):
            prompt = json.loads(kwargs["prompt"])
            assert output is Finding and kwargs["purpose"] == "general"
            assert kwargs.get("study_id") is None and kwargs.get("run_id") is None
            assert prompt["conversation"] == [
                {
                    "question": "What is a matched seed?",
                    "answer": "A shared initial random seed.",
                    "cutoffs": {},
                }
            ]
            assert len(prompt["environments"]) == 7
            assert "index" not in prompt and "evidence" not in prompt
            return Finding(
                answer="Matched seeds support more informative comparisons.",
                citations=[Citation(run_id="unselected", turn=1)] if invented_citation else [],
                caveats=[],
            )

        monkeypatch.setattr(llm, "generate", generate)
        key = assistant.start(
            "How do they help comparisons?", purpose="general", chat_id="general-chat"
        )
        await assistant.tasks[key]
        row = assistant.get(key)
        assert row["cutoffs"] == {} and row["study_id"] is None and row["run_id"] is None
        if invented_citation:
            assert row["status"] == "failed" and "unselected" in row["error"]
        else:
            assert row["status"] == "complete" and row["output"]["citations"] == []
        assert research.study(sid)["design"] == design.model_dump()
        await assistant.close()

    asyncio.run(exercise())


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
                        chat_id="scoped-chat",
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
                chat_id="scoped-chat",
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
        first = assistant.start("Question one", purpose="design", chat_id="first-chat")
        second = assistant.start("Question two", purpose="design")
        assert first != second
        with pytest.raises(ValueError, match="current request"):
            assistant.start("Question one", purpose="design", chat_id="first-chat")
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

    async def request_more(output, **kwargs):
        prompts.append(kwargs["prompt"])
        if len(prompts) == 4:
            assert output is Finding
            return Finding(
                answer="No decisions have been made.",
                citations=[],
                caveats=["No behavioral evidence exists at cutoff zero."],
            )
        assert output is Investigation
        return Investigation(requests=[TurnRequest(kind="turn", run_id=rid, turn=0)], answer=None)

    monkeypatch.setattr(llm, "generate", request_more)
    monkeypatch.setattr(research, "evidence", record_evidence)

    async def exercise():
        assistant = Assistants(db, research, llm)
        key = assistant.start("Inspect everything", purpose="analysis", run_id=rid)
        await assistant.tasks[key]
        assert assistant.get(key)["status"] == "complete"
        assert assistant.get(key)["output"]["caveats"]
        await assistant.close()

    asyncio.run(exercise())
    assert len(prompts) == 4
    assert len(reads) == 2  # Cutoff plus one deduplicated request; final call cannot request.


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
        assert request.error == "Research assistant failed (RuntimeError)."
    assert f"Analysis {key} failed" in caplog.text
    assert llm.usage()["requests"] == 0


def test_internal_value_error_retains_assistant_diagnostics(runtime, monkeypatch, caplog):
    db, llm, research, _ = runtime
    assistant = Assistants(db, research, llm)

    detail = "invalid internal result"

    async def broken_general(request):
        raise ValueError(detail)

    monkeypatch.setattr(assistant, "_general", broken_general)

    async def exercise():
        key = assistant.start("Explain matched seeds", purpose="general")
        await assistant.tasks[key]
        assert assistant.get(key)["status"] == "failed"
        assert f"Analysis {key} failed (ValueError)" in caplog.text
        await assistant.close()

    asyncio.run(exercise())
    assert "broken_general" in caplog.text
    assert "invalid internal result" not in caplog.text


@pytest.mark.parametrize("status", ["pending", "failed"])
def test_analysis_usage_is_consistent_before_any_provider_call(runtime, status):
    from agent_sim.db import Analysis

    db, llm, research, _ = runtime
    assistant = Assistants(db, research, llm)
    with db.session.begin() as session:
        request = Analysis(
            question="Saved without provider work",
            purpose="general",
            status=status,
            chat_id="usage-chat",
            cutoffs={},
        )
        session.add(request)
        session.flush()
        key = request.id
    detail = assistant.get(key)
    assert assistant.chat("usage-chat") == [detail]
    assert detail["usage"] == {
        "requests": 0,
        "input_tokens": 0,
        "output_tokens": 0,
        "cost_usd": 0.0,
        "partial": False,
    }


def test_evidence_index_counts_opportunities_at_the_frozen_cutoff(runtime, design):
    db, llm, research, engine = runtime
    design.profiles = design.profiles[:2]
    design.rounds = 2
    design.conditions[0].parameters.endowment = 10
    sid = research.save_design(design)
    rid = research.study(sid)["runs"][0]["id"]

    async def exercise():
        engine.start(rid)
        await engine.executions[rid].task
        assistant = Assistants(db, research, llm)
        index = assistant._evidence_index({rid: 2})
        row = index["runs"][0]
        assert row["opportunities"]["reports"] == 2
        assert row["opportunities"]["inaccurate_reports"] == 0
        assert row["opportunities"]["feasible_commitments"] == 0
        assert row["outcome"]["total_utility"] == 30
        assert row["through_turn"] == 2
        assert row["completed_at_cutoff"] is False
        assert index["matched_effects"] == {}
        from agent_sim.db import RecordedEvent

        with db.session.begin() as session:
            for turn, kind, payload in [
                (
                    2,
                    "commitment_resolved",
                    dict(eligible=True, actual=5, amount=4, fulfilled=False),
                ),
                (
                    2,
                    "commitment_resolved",
                    dict(eligible=False, actual=0, amount=9, fulfilled=False),
                ),
                (3, "claim", dict(eligible=True, reported=0, known_truth=1, accurate=True)),
            ]:
                session.add(
                    RecordedEvent(
                        run_id=rid,
                        turn=turn,
                        round=1,
                        kind=kind,
                        actor=None,
                        target=None,
                        visibility="researcher",
                        text="Calibration",
                        data=payload,
                    )
                )
        counts = assistant._evidence_index({rid: 2})["runs"][0]["opportunities"]
        assert counts["reports"] == 2 and counts["inaccurate_reports"] == 0
        assert counts["feasible_commitments"] == 1
        assert counts["infeasible_commitments"] == 1
        assert counts["fulfilled_feasible_commitments"] == 1
        await assistant.close()

    asyncio.run(exercise())


def test_configured_assistant_model_is_used_without_substitution(runtime, monkeypatch):
    from agent_sim.domain import Finding

    db, llm, research, _ = runtime
    monkeypatch.setenv("JAS_ASSISTANT_MODEL", "openai:gpt-6-luna")

    async def generate(output, **kwargs):
        assert kwargs["model"] == "openai:gpt-6-luna"
        return Finding(
            answer="Select recorded evidence to inspect outcomes.", citations=[], caveats=[]
        )

    monkeypatch.setattr(llm, "generate", generate)

    async def exercise():
        assistant = Assistants(db, research, llm)
        key = assistant.start("How can I inspect behavior?", purpose="general")
        await assistant.tasks[key]
        assert assistant.get(key)["status"] == "complete"
        await assistant.close()

    asyncio.run(exercise())


def test_turn_tool_preserves_observation_and_outcomes_without_duplicating_memory(runtime, design):
    from agent_sim.assistants import TurnRequest

    db, models, research, engine = runtime
    rid = research.operational_runs(research.save_design(design))[0].id

    async def exercise():
        engine.start(rid)
        await engine.executions[rid].task
        assistant = Assistants(db, research, models)
        full = research.evidence(rid, 2)
        _, compact = assistant._requested_evidence(
            TurnRequest(kind="turn", run_id=rid, turn=2), {rid: 2}
        )
        assert compact["observation"] == full["observation"]
        assert compact["events"] == full["events"]
        assert compact["decision"] == full["decision"]
        assert compact["checkpoint"]["balances"] == full["checkpoint"]["balances"]
        assert set(compact["omitted_checkpoint_fields"]) == {"history", "notes", "experiences"}
        assert "experiences" not in compact["checkpoint"]
        assert research.evidence(rid, 2) == full
        await assistant.close()

    asyncio.run(exercise())
