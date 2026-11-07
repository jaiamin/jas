import importlib.util
from pathlib import Path

import pytest
from agent_sim.domain import PlannedStudy
from agent_sim.planning import Candidate, DesignReview, StudyBrief


def test_benchmark_resume_rejects_changed_simulation_before_opening_database(tmp_path, monkeypatch):
    import argparse
    import asyncio
    import importlib
    import json

    monkeypatch.syspath_prepend(str(Path(__file__).parents[2] / "benchmarks"))
    harness = importlib.import_module("run")
    source = tmp_path / "backend/src/agent_sim/simulation/world.py"
    source.parent.mkdir(parents=True)
    source.write_text("original rules")
    runner = tmp_path / "benchmarks/run.py"
    runner.parent.mkdir()
    runner.write_text("runner")
    runner.with_name("suite.py").write_text("suite")
    monkeypatch.setattr(harness, "__file__", str(runner))
    original = harness.source_digest()
    output = tmp_path / "results"
    output.mkdir()
    database = tmp_path / "evaluation.sqlite3"
    (output / "manifest.json").write_text(
        json.dumps(
            {
                "suite_sha256": harness.fingerprint(),
                "source_sha256": original,
                "model": "openai:gpt-6-luna",
                "database": str(database),
                "budget_usd": 1,
            }
        )
    )
    source.write_text("changed rules")
    assert harness.source_digest() != original
    args = argparse.Namespace(
        split=None,
        ids=None,
        limit=1,
        output=str(output),
        database=str(database),
        budget_usd=1,
        concurrency=1,
    )
    with pytest.raises(ValueError, match="source_sha256 changed"):
        asyncio.run(harness.run(args))
    assert not database.exists()


def load_suite():
    path = Path(__file__).parents[2] / "benchmarks/suite.py"
    spec = importlib.util.spec_from_file_location("jas_suite", path)
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
    from agent_sim.simulation.environments import CATALOG, MEASURE_DESCRIPTIONS

    assert set(MEASURE_DESCRIPTIONS) == {m for a in CATALOG.values() for m in a.measures}

    for case in cases:
        if case.environment:
            adapter = CATALOG[case.environment]
            assert case.measure is None or case.measure in adapter.measures
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


def test_raw_decision_outcome_does_not_require_an_unrelated_metric():
    suite = load_suite()
    case = suite.Case(
        id="action-count",
        split="development",
        question="How often do agents contribute?",
        environment="commons",
        factor="memory",
        measure=None,
    )
    output = {"supported": True, "design": {"measures": []}}
    assert suite.assess(case, output)["measures"]
    metric_case = case.model_copy(update={"measure": "contribution_rate"})
    assert not suite.assess(metric_case, output)["measures"]


@pytest.mark.parametrize("raw_outcome", [False, True])
def test_full_harness_uses_real_api_routes(tmp_path, monkeypatch, fake_model, design, raw_outcome):
    import asyncio
    import importlib

    import httpx
    from agent_sim.api import create_app

    bench = str(Path(__file__).parents[2] / "benchmarks")
    monkeypatch.syspath_prepend(bench)
    harness = importlib.import_module("run")
    case = next(c for c in harness.cases() if c.id == "commons-01")
    if raw_outcome:
        case = case.model_copy(update={"measure": None})
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
                transport=httpx.ASGITransport(app=app), base_url="http://localhost"
            ) as client:
                return await harness.evaluate(client, case, {})

    record = asyncio.run(exercise())
    assert record["passed"], record
    if raw_outcome:
        assert record["checks"]["decision_evidence"]
    assert len(record["runs"]) == 2
    assert sum(r["verified_turns"] for r in record["replay"]) == 24
