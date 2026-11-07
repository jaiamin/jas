import importlib.util
from pathlib import Path

from agent_sim.domain import PlannedStudy
from agent_sim.planning import Candidate, DesignReview, StudyBrief


def load_suite():
    path = Path(__file__).parents[2] / "benchmarks/suite.py"
    spec = importlib.util.spec_from_file_location("ass_suite", path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_suite_is_unique_and_split_before_tuning():
    suite = load_suite()
    cases = suite.cases()
    assert len(cases) == 230
    assert len({case.id for case in cases}) == 230
    assert sum(case.split == "generalization" for case in cases) == 56
    assert sum(case.environment is not None for case in cases) == 210
    assert len(suite.fingerprint()) == 64
    from agent_sim.environments import CATALOG, MEASURE_DESCRIPTIONS

    assert set(MEASURE_DESCRIPTIONS) == {m for a in CATALOG.values() for m in a.measures}

    for case in cases:
        if case.environment:
            adapter = CATALOG[case.environment]
            assert case.measure in adapter.measures
            assert case.factor in {"roles", "goals"} or (
                case.factor and case.factor.split(".")[0] in adapter.parameters
            )


def test_assessor_catches_inert_and_confounded_treatments(design):
    suite = load_suite()
    case = next(c for c in suite.cases() if c.id == "commons-01")
    design.profiles = design.profiles[:4]
    design.rounds, design.seeds = 3, [17]
    from agent_sim.domain import Parameters, Treatment

    design.conditions = [
        Treatment(key="a", name="A"),
        Treatment(key="b", name="B", parameters=Parameters(endowment=5)),
    ]
    output = PlannedStudy(supported=True, explanation="Pilot", design=design).model_dump()
    assert all(suite.assess(case, output).values())
    output["design"]["conditions"][1]["parameters"]["communication"] = False
    assert not suite.assess(case, output)["unconfounded"]
    output["design"]["conditions"][1]["parameters"]["endowment"] = 10
    assert not suite.assess(case, output)["intervention"]


def test_full_harness_uses_real_api_routes(tmp_path, monkeypatch, fake_model, design):
    import asyncio
    import importlib

    import httpx
    from agent_sim.api import create_app

    bench = str(Path(__file__).parents[2] / "benchmarks")
    monkeypatch.syspath_prepend(bench)
    harness = importlib.import_module("run")
    case = next(c for c in harness.cases() if c.id == "commons-01")
    design.profiles = design.profiles[:4]
    design.rounds, design.seeds = 3, [17]
    from agent_sim.domain import Parameters, Treatment

    design.conditions = [
        Treatment(key="a", name="A"),
        Treatment(key="b", name="B", parameters=Parameters(endowment=5)),
    ]
    app = create_app(f"sqlite:///{tmp_path}/harness.sqlite3")
    monkeypatch.setattr(app.state.models, "model", lambda _: fake_model)
    generate = app.state.models.generate

    async def scripted(output, **kwargs):
        if output is StudyBrief:
            return StudyBrief(
                supported=True,
                explanation="Pilot",
                operationalization="Contribution",
                size_rationale="Explicit pilot",
                agents=4,
                conditions=2,
                seeds=1,
                repetitions=1,
                rounds=3,
                research_query=None,
            )
        if output is Candidate:
            return Candidate(explanation="Pilot", design=design)
        if output is DesignReview:
            return DesignReview(issues=[])
        return await generate(output, **kwargs)

    monkeypatch.setattr(app.state.models, "generate", scripted)

    async def exercise():
        async with app.router.lifespan_context(app):
            async with httpx.AsyncClient(
                transport=httpx.ASGITransport(app=app), base_url="http://ass.test"
            ) as client:
                return await harness.evaluate(client, case, {})

    record = asyncio.run(exercise())
    assert record["passed"], record
    assert len(record["runs"]) == 2
    assert sum(r["verified_turns"] for r in record["replay"]) == 24
