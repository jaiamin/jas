"""Real routes/engine and negative controls for the replacement evaluation."""

import asyncio
from types import SimpleNamespace

import httpx
import pytest
from agent_sim.api import create_app
from agent_sim.planning import Candidate, DesignReview, StudyBrief

from benchmarks.cases import cases
from benchmarks.evaluate import (
    evaluation_config,
    participant_trial,
    planner_trial,
    run,
    validate_final,
)
from benchmarks.quality import assess


def test_final_checkpoint_enforces_declared_jobs(monkeypatch):
    from benchmarks import evaluate

    monkeypatch.setattr(evaluate, "source_digest", lambda: "source")
    monkeypatch.setattr(evaluate, "fingerprint", lambda: "suite")
    args = SimpleNamespace(
        kind="participants",
        modes=["baseline"],
        repetitions=2,
        concurrency=4,
        request_concurrency=4,
    )
    selected = cases("heldout")[:2]
    final = dict(
        source_sha256="source",
        suite_sha256="suite",
        evaluations={"participants": evaluation_config(args, selected)},
    )
    validate_final(args, selected, final)
    args.repetitions = 1
    with pytest.raises(ValueError, match="configuration differs"):
        validate_final(args, selected, final)
    args.repetitions = 2
    with pytest.raises(ValueError, match="configuration differs"):
        validate_final(args, selected[:1], final)


def test_gate_rejects_stale_source_before_opening_database(tmp_path):
    gate = tmp_path / "gate.json"
    gate.write_text('{"failures": {}, "backend_sha256": "stale"}')
    args = SimpleNamespace(output=str(tmp_path / "out"), gate=str(gate))
    with pytest.raises(ValueError, match="Fresh complete validity"):
        asyncio.run(run(args))
    assert not (tmp_path / "out").exists()


def test_reference_protocols_and_assessor_negative_controls():
    for case in cases():
        result: dict = dict(
            supported=case.family.environment is not None,
            explanation="Independent reference specification",
            design=case.design().model_dump() if case.family.environment else None,
        )
        assert all(assess(case, result).values()), case.id
        if result["design"]:
            result["design"]["conditions"][1]["profile_overrides"] = [
                {**result["design"]["profiles"][0], "goal": "Different incentive"}
            ]
            assert not assess(case, result)["isolation"]
            result["design"]["seeds"] = [999]
            assert not assess(case, result)["counts"]
        else:
            result["design"] = {}
            assert not assess(case, result)["no_invented_design"]


def test_real_planner_routes_and_paired_engine_arms(tmp_path, monkeypatch, fake_model):
    case = next(c for c in cases() if c.family.key == "unannounced-shortage" and c.agents == 12)
    app = create_app(f"sqlite:///{tmp_path}/evaluation.sqlite3", concurrent_runs=2)
    monkeypatch.setattr(app.state.models, "model", lambda _: fake_model)
    generate = app.state.models.generate

    async def responses(output, **kwargs):
        if output is StudyBrief:
            return StudyBrief(
                supported=True,
                explanation="Pilot",
                operationalization="Resource shock",
                size_rationale="Explicit diagnostic",
                agents=case.agents,
                conditions=2,
                seeds=1,
                repetitions=1,
                rounds=case.rounds,
                research_query=None,
            )
        if output is Candidate:
            return Candidate(explanation="Matched pilot", design=case.design())
        if output is DesignReview:
            return DesignReview(issues=[])
        return await generate(output, **kwargs)

    monkeypatch.setattr(app.state.models, "generate", responses)

    async def exercise():
        async with app.router.lifespan_context(app):
            async with httpx.AsyncClient(
                transport=httpx.ASGITransport(app=app), base_url="http://localhost"
            ) as client:
                planned = await planner_trial(app, client, case)
                assert all(planned["checks"].values())
            studies = {}
            results = [
                await participant_trial(app, case, "baseline", 0, arm, studies) for arm in (0, 1)
            ]
            assert all(all(r["checks"].values()) for r in results)
            assert len({r["study_id"] for r in results}) == 1
            assert [r["decision_allowance"] for r in results] == [48, 48]
            assert [r["behavior"]["turns"] for r in results] == [48, 48]
            assert results[0]["parameters"]["resource_schedule"] == []
            assert results[1]["parameters"]["resource_schedule"] == [{"round": 3, "endowment": 4}]
            assert results[1]["behavior"]["utility"] < results[0]["behavior"]["utility"]

    asyncio.run(exercise())


@pytest.mark.parametrize(
    "family",
    [
        "public-goods-incentives",
        "reciprocal-surplus",
        "task-load",
        "independent-oversight",
        "shared-evidence",
        "shrinking-surplus",
        "renewable-growth",
    ],
)
def test_deterministic_participants_have_identical_results_at_run_concurrency_one_and_four(
    runtime, family
):
    from agent_sim.execution import Engine

    db, models, research, _ = runtime
    design = next(c for c in cases() if c.family.key == family).design()
    design.rounds = 4
    design.seeds = [17, 43, 89]

    async def exercise():
        outcomes = []
        for concurrency in (1, 4):
            engine = Engine(db, research, models, concurrency=concurrency)
            study_id = research.save_design(design)
            runs = research.operational_runs(study_id)
            for identity in runs:
                engine.start(identity.id)
            for identity in runs:
                task = engine.executions[identity.id].task
                assert task is not None
                await task
            snapshots = {}
            for identity in runs:
                record, _, condition = research.configuration(identity.id)
                snapshots[(condition.key, record.seed, record.repetition)] = record.checkpoint
            outcomes.append(snapshots)
            assert all(research.configuration(r.id)[0].status == "complete" for r in runs)
            assert all(engine.replay(r.id)["model_requests"] == 0 for r in runs)
            await engine.close()
        assert outcomes[0] == outcomes[1]

    asyncio.run(exercise())
