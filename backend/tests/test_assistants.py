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
        output = await assistant._investigate(row)
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


def test_planner_reviews_and_repairs_design_before_returning(runtime, design, monkeypatch):
    from agent_sim.db import Analysis
    from agent_sim.domain import DesignSpec
    from agent_sim.planning import Candidate, DesignReview, Planner, StudyBrief

    db, llm, research, _ = runtime
    with db.session.begin() as session:
        row = Analysis(purpose="design", question="Compare cooperation", cutoffs={})
        session.add(row)
        session.flush()
        key = row.id
    invalid = design.model_dump()
    invalid["seeds"] = [7, 7]
    brief = StudyBrief(
        supported=True,
        explanation="A pilot",
        operationalization="Contribution rate",
        size_rationale="One small descriptive group; repeated trials remain necessary.",
        agents=6,
        conditions=1,
        seeds=1,
        repetitions=1,
        rounds=2,
        research_query=None,
    )
    answers = iter(
        [
            brief,
            Candidate(explanation="Initial", design=DesignSpec.model_validate(invalid)),
            Candidate(
                explanation="Repaired", design=DesignSpec.model_validate(design.model_dump())
            ),
            DesignReview(issues=["Use a shorter descriptive title"]),
            Candidate(
                explanation="Reviewed", design=DesignSpec.model_validate(design.model_dump())
            ),
            DesignReview(issues=[]),
        ]
    )
    prompts = []

    async def generate(*args, **kwargs):
        import json

        prompts.append(json.loads(kwargs["prompt"]))
        return next(answers)

    monkeypatch.setattr(llm, "generate", generate)
    result = asyncio.run(
        Planner(db, research, llm).run({"id": key, "question": "Compare cooperation"})
    )
    assert result["supported"] and result["design"]["seeds"] == [7]
    assert "Seed identifiers must be unique" in prompts[2]["feedback"][0]
    assert prompts[4]["feedback"] == ["Use a shorter descriptive title"]
    assert len(result["planning"]["reviews"]) == 3
    assert "role" in prompts[0]["design_schema"]["$defs"]["Profile"]["properties"]
    assert "events" in prompts[0]["evidence"]
    assert research.studies() == []


def test_planner_does_not_research_or_invent_unsupported_worlds(runtime, monkeypatch):
    from agent_sim.db import Analysis
    from agent_sim.planning import Planner, StudyBrief

    db, llm, research, _ = runtime
    with db.session.begin() as session:
        row = Analysis(purpose="design", question="Predict an actual election", cutoffs={})
        session.add(row)
        session.flush()
        key = row.id
    calls = []

    async def generate(*args, **kwargs):
        calls.append(kwargs)
        return StudyBrief(
            supported=False,
            explanation="No calibrated population model.",
            operationalization="Unavailable",
            size_rationale="No experiment",
            agents=2,
            conditions=1,
            seeds=1,
            repetitions=1,
            rounds=1,
            research_query="Election forecasts",
        )

    monkeypatch.setattr(llm, "generate", generate)
    result = asyncio.run(
        Planner(db, research, llm).run({"id": key, "question": "Predict an election"})
    )
    assert result["design"] is None and not result["supported"]
    assert len(calls) == 1 and research.studies() == []


def test_planner_rejects_unresolved_review(runtime, design, monkeypatch):
    from agent_sim.db import Analysis
    from agent_sim.domain import DesignSpec
    from agent_sim.planning import Candidate, DesignReview, Planner, StudyBrief

    db, llm, research, _ = runtime
    with db.session.begin() as session:
        row = Analysis(purpose="design", question="Compare strategies", cutoffs={})
        session.add(row)
        session.flush()
        key = row.id

    async def generate(output, **kwargs):
        if output is StudyBrief:
            return StudyBrief(
                supported=True,
                explanation="Pilot",
                operationalization="Payoff",
                size_rationale="Small group",
                agents=6,
                conditions=1,
                seeds=1,
                repetitions=1,
                rounds=2,
                research_query=None,
            )
        if output is Candidate:
            return Candidate(
                explanation="Draft", design=DesignSpec.model_validate(design.model_dump())
            )
        return DesignReview(issues=["The treatment does not manipulate the question's variable"])

    monkeypatch.setattr(llm, "generate", generate)
    with pytest.raises(ValueError, match="unresolved issues"):
        asyncio.run(Planner(db, research, llm).run({"id": key, "question": "Compare strategies"}))
    assert research.studies() == []


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


@pytest.mark.parametrize("declined", [False, True])
def test_planner_validates_revised_capability_and_counts(runtime, design, monkeypatch, declined):
    from agent_sim.db import Analysis
    from agent_sim.planning import Candidate, DesignReview, Planner, StudyBrief

    db, llm, research, _ = runtime
    with db.session.begin() as session:
        row = Analysis(purpose="design", question="Two matched conditions", cutoffs={})
        session.add(row)
        session.flush()
        key = row.id

    async def generate(output, **kwargs):
        if output is StudyBrief:
            return StudyBrief(
                supported=True,
                explanation="Pilot",
                operationalization="Contribution rate",
                size_rationale="Two matched conditions",
                agents=6,
                conditions=2,
                seeds=1,
                repetitions=1,
                rounds=2,
                research_query=None,
            )
        if output is Candidate:
            return Candidate(
                explanation="Capability unavailable" if declined else "One condition",
                design=None if declined else design,
            )
        return DesignReview(issues=[])

    monkeypatch.setattr(llm, "generate", generate)
    planner = Planner(db, research, llm)
    if declined:
        result = asyncio.run(planner.run({"id": key, "question": row.question}))
        assert result["design"] is None and not result["supported"]
        assert result["planning"]["reviews"] == [{"kind": "review", "issues": []}]
    else:
        with pytest.raises(ValueError, match="planned counts"):
            asyncio.run(planner.run({"id": key, "question": row.question}))
    assert research.studies() == []


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
