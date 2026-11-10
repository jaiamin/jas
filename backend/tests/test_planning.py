import asyncio

import pytest
from agent_sim.validity import Requirement


def test_planner_reviews_and_repairs_design_before_returning(runtime, design, monkeypatch):
    from agent_sim.db import Analysis
    from agent_sim.domain import DesignSpec
    from agent_sim.planning import Candidate, DesignReview, Planner, StudyBrief

    db, llm, research, _ = runtime
    with db.session.begin() as session:
        row = Analysis(
            purpose="design",
            question="Compare cooperation",
            cutoffs={},
            output={"introduction": "I will prepare a matched comparison."},
        )
        session.add(row)
        session.flush()
        key = row.id
    invalid = design.model_dump()
    invalid["seeds"] = [7, 7]
    brief = StudyBrief(
        supported=True,
        requirements=[
            Requirement(
                source="Compare cooperation",
                capability="contributions",
                mapping="direct",
                explanation="Sealed contribution choices.",
            )
        ],
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
            DesignReview(
                summary="Compare matched conditions using observable outcomes.",
                issues=["Use a shorter descriptive title"],
            ),
            Candidate(
                explanation="Reviewed", design=DesignSpec.model_validate(design.model_dump())
            ),
            DesignReview(
                summary="Compare matched conditions using observable outcomes.", issues=[]
            ),
        ]
    )
    prompts = []

    async def generate(*args, **kwargs):
        import json

        prompts.append(json.loads(kwargs["prompt"]))
        assert kwargs.get("on_partial") is None
        with db.session() as session:
            assert (
                session.get_one(Analysis, key).output["introduction"]
                == "I will prepare a matched comparison."
            )
        return next(answers)

    monkeypatch.setattr(llm, "generate", generate)
    result = asyncio.run(Planner(db, research, llm).run(key, "Compare cooperation"))
    assert result["supported"] and result["design"]["seeds"] == [7]
    assert "Seed identifiers must be unique" in prompts[2]["feedback"][0]
    assert prompts[4]["feedback"] == ["Use a shorter descriptive title"]
    assert len(result["planning"]["reviews"]) == 3
    assert result["summary"] == "Compare matched conditions using observable outcomes."
    assert result["explanation"] == "Reviewed"
    assert result["planning"]["preflight"] == prompts[-1]["preflight"]
    assert len(prompts) == 6  # No additional summary-generation request.
    with db.session() as session:
        activity = session.get_one(Analysis, key).output["activity"]
    assert activity.index("checking") < activity.index("reviewing")
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
    result = asyncio.run(Planner(db, research, llm).run(key, "Predict an election"))
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
                requirements=[
                    Requirement(
                        source="Compare strategies",
                        capability="contributions",
                        mapping="direct",
                        explanation="Sealed contribution choices.",
                    )
                ],
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
        return DesignReview(
            summary="Compare matched conditions using observable outcomes.",
            issues=["The treatment does not manipulate the question's variable"],
        )

    monkeypatch.setattr(llm, "generate", generate)
    with pytest.raises(ValueError, match="unresolved issues"):
        asyncio.run(Planner(db, research, llm).run(key, "Compare strategies"))
    with db.session() as session:
        output = session.get_one(Analysis, key).output
    assert len(output["planning"]["reviews"]) == 3
    assert output["planning"]["reviews"][-1]["issues"] == [
        "The treatment does not manipulate the question's variable"
    ]
    assert research.studies() == []


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
                requirements=[
                    Requirement(
                        source="Two matched conditions",
                        capability="contributions",
                        mapping="direct",
                        explanation="Sealed contribution choices.",
                    )
                ],
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
        return DesignReview(
            summary="Compare matched conditions using observable outcomes.", issues=[]
        )

    monkeypatch.setattr(llm, "generate", generate)
    planner = Planner(db, research, llm)
    if declined:
        result = asyncio.run(planner.run(key, row.question))
        assert result["design"] is None and not result["supported"]
        assert result["planning"]["reviews"] == [{"kind": "review", "issues": []}]
    else:
        with pytest.raises(ValueError, match="planned counts"):
            asyncio.run(planner.run(key, row.question))
    assert research.studies() == []


@pytest.mark.parametrize("repair", [True, False])
@pytest.mark.parametrize("invalid_source", ["Paraphrased request", None])
def test_scoping_quote_repair_is_bounded_and_retains_review_evidence(
    runtime, design, monkeypatch, repair, invalid_source
):
    from agent_sim.db import Analysis
    from agent_sim.planning import Candidate, DesignReview, Planner, StudyBrief

    db, llm, research, _ = runtime
    question = "Compare\n cooperation"
    with db.session.begin() as session:
        row = Analysis(purpose="design", question=question, cutoffs={})
        session.add(row)
        session.flush()
        key = row.id
    prompts = []
    scopes = 0

    async def generate(output, **kwargs):
        import json

        nonlocal scopes
        prompts.append(json.loads(kwargs["prompt"]))
        if output is StudyBrief:
            scopes += 1
            source = "“COMPARE cooperation”" if scopes == 2 and repair else invalid_source
            return StudyBrief(
                supported=True,
                explanation="Pilot",
                operationalization="Contributions",
                size_rationale="One descriptive arm",
                agents=6,
                conditions=1,
                seeds=1,
                repetitions=1,
                rounds=2,
                research_query=None,
                requirements=[
                    Requirement(
                        source=source,
                        capability="contributions",
                        mapping="direct",
                        explanation="Sealed contributions.",
                    )
                ]
                if source is not None
                else [],
            )
        if output is Candidate:
            return Candidate(explanation="Protocol", design=design)
        return DesignReview(
            summary="Compare matched conditions using observable outcomes.", issues=[]
        )

    monkeypatch.setattr(llm, "generate", generate)
    if repair:
        result = asyncio.run(Planner(db, research, llm).run(key, question))
        assert result["supported"]
        assert result["planning"]["reviews"][0]["kind"] == "scope_validation"
        assert prompts[1]["scope_feedback"]["unquoted"] == (
            [invalid_source] if invalid_source else []
        )
    else:
        with pytest.raises(ValueError, match="still lacks quoted"):
            asyncio.run(Planner(db, research, llm).run(key, question))
        with db.session() as session:
            output = session.get_one(Analysis, key).output
        assert len(output["planning"]["reviews"]) == 2
        requirements = output["planning"]["brief"]["requirements"]
        assert [r["source"] for r in requirements] == ([invalid_source] if invalid_source else [])
    assert scopes == 2


def test_unavailable_required_construct_is_a_clear_decline_before_candidate_calls(
    runtime, monkeypatch
):
    from agent_sim.db import Analysis
    from agent_sim.planning import Planner, StudyBrief

    db, llm, research, _ = runtime
    question = "Require individually calibrated metabolism."
    with db.session.begin() as session:
        row = Analysis(purpose="design", question=question, cutoffs={})
        session.add(row)
        session.flush()
        key = row.id
    calls = []

    async def generate(output, **kwargs):
        calls.append(output)
        assert output is StudyBrief
        return StudyBrief(
            supported=True,
            explanation="Scope",
            operationalization="Food",
            size_rationale="Four agents",
            agents=4,
            conditions=2,
            seeds=3,
            repetitions=1,
            rounds=6,
            research_query=None,
            requirements=[
                Requirement(
                    source="individually calibrated metabolism",
                    capability="unavailable",
                    mapping="missing",
                    explanation="No world implements individually calibrated metabolism.",
                )
            ],
        )

    monkeypatch.setattr(llm, "generate", generate)
    result = asyncio.run(Planner(db, research, llm).run(key, question))
    assert not result["supported"] and result["design"] is None
    assert "metabolism" in result["explanation"]
    assert calls == [StudyBrief]


@pytest.mark.parametrize("repair", [True, False])
def test_direct_unavailable_mapping_gets_one_correction_and_never_a_false_decline(
    runtime, design, monkeypatch, repair
):
    import json

    from agent_sim.db import Analysis
    from agent_sim.planning import Candidate, DesignReview, Planner, StudyBrief

    db, models, research, _ = runtime
    question = "Compare contributions"
    with db.session.begin() as session:
        row = Analysis(purpose="design", question=question, cutoffs={})
        session.add(row)
        session.flush()
        key = row.id
    scopes, candidates, prompts = 0, 0, []

    async def generate(output, **kwargs):
        nonlocal scopes, candidates
        prompts.append(json.loads(kwargs["prompt"]))
        if output is StudyBrief:
            scopes += 1
            return StudyBrief(
                supported=True,
                explanation="A pilot",
                operationalization="Contribution choices",
                size_rationale="One descriptive group",
                agents=len(design.profiles),
                conditions=1,
                seeds=1,
                repetitions=1,
                rounds=design.rounds,
                research_query=None,
                requirements=[
                    Requirement(
                        source="contributions",
                        capability="contributions" if repair and scopes == 2 else "unavailable",
                        mapping="direct",
                        explanation="Contribution choices are directly supported.",
                    )
                ],
            )
        if output is Candidate:
            candidates += 1
            return Candidate(explanation="Protocol", design=design)
        return DesignReview(
            summary="Compare matched conditions using observable outcomes.", issues=[]
        )

    monkeypatch.setattr(models, "generate", generate)
    if repair:
        result = asyncio.run(Planner(db, research, models).run(key, question))
        assert result["supported"] and candidates == 1
        assert result["planning"]["reviews"][0]["kind"] == "scope_validation"
        assert prompts[1]["scope_feedback"]["inconsistent"] == ["contributions"]
        assert prompts[1]["scope_candidate"]["requirements"][0]["capability"] == "unavailable"
    else:
        with pytest.raises(ValueError, match="inconsistent capability"):
            asyncio.run(Planner(db, research, models).run(key, question))
        assert candidates == 0
        with db.session() as session:
            assert len(session.get_one(Analysis, key).output["planning"]["reviews"]) == 2
    assert scopes == 2


@pytest.mark.parametrize("repair", [True, False])
def test_declared_factorial_is_repaired_or_rejected_before_model_review(
    runtime, monkeypatch, repair
):
    import json
    from itertools import product

    from agent_sim.db import Analysis
    from agent_sim.domain import Design, DesignSpec
    from agent_sim.planning import Candidate, DesignReview, Planner, StudyBrief
    from agent_sim.templates import templates

    db, llm, research, _ = runtime
    design = Design.model_validate(next(t["design"] for t in templates() if t["id"] == "composed"))
    design.rounds, design.seeds = 2, [7]
    base = design.conditions[0]
    design.conditions = []
    for i, (stock, allocations) in enumerate(product((False, True), repeat=2)):
        c = base.model_copy(update={"key": f"cell_{i}", "name": f"Cell {i}"}, deep=True)
        assert c.parameters.composition is not None
        c.parameters.composition.resources[0].stock_visibility = (
            "public" if stock else "controllers"
        )
        c.parameters.composition.resources[0].allocation_visibility = (
            "public" if allocations else "parties"
        )
        design.conditions.append(c)
    question = "Compare resource visibility interaction"
    with db.session.begin() as session:
        row = Analysis(purpose="design", question=question, cutoffs={})
        session.add(row)
        session.flush()
        key = row.id
    candidates, reviews = 0, 0

    async def generate(output, **kwargs):
        nonlocal candidates, reviews
        if output is StudyBrief:
            return StudyBrief(
                supported=True,
                factorial=True,
                explanation="Cross both visibility factors.",
                operationalization="Interaction of stock and allocation visibility on unmet needs.",
                size_rationale="Full 2x2",
                agents=len(design.profiles),
                conditions=4,
                seeds=1,
                repetitions=design.repetitions,
                rounds=2,
                research_query=None,
                requirements=[
                    Requirement(
                        source="resource visibility",
                        capability="resource_visibility",
                        mapping="direct",
                        explanation="Explicit stock and receipt rules.",
                    )
                ],
            )
        if output is Candidate:
            candidates += 1
            candidate = design.model_copy(deep=True)
            if candidates == 1 or not repair:
                candidate.conditions[-1].parameters = candidate.conditions[
                    -2
                ].parameters.model_copy(deep=True)
            if candidates > 1:
                assert "Declared factorial" in json.loads(kwargs["prompt"])["feedback"][0]
            return Candidate(
                explanation="Crossed cells",
                design=DesignSpec.model_validate(candidate.model_dump()),
            )
        assert output is DesignReview
        reviews += 1
        return DesignReview(
            summary="Compare matched conditions using observable outcomes.", issues=[]
        )

    monkeypatch.setattr(llm, "generate", generate)
    if repair:
        result = asyncio.run(Planner(db, research, llm).run(key, question))
        assert result["supported"]
        assert result["planning"]["preflight"]["condition_grid"]["observed_cells"] == 4
        assert candidates == 2 and reviews == 1
    else:
        with pytest.raises(ValueError, match="unresolved issues"):
            asyncio.run(Planner(db, research, llm).run(key, question))
        assert candidates == 3 and reviews == 0
    assert research.studies() == []
