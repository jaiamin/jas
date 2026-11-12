"""Independent development oracles: nulls, missingness and fixed-task replication."""

import asyncio
import json
from pathlib import Path

import pytest
from agent_sim.api import create_app
from agent_sim.assistants import Assistants
from agent_sim.claim_support import capture_lens
from agent_sim.db import ProviderCall, Run
from agent_sim.domain import AnalysisPlan, Design, ReadArtifact
from agent_sim.research_quality import coordination_values, scientific_review
from agent_sim.templates import templates
from conftest import analysis_prompt, decision_for
from fastapi.testclient import TestClient
from pydantic import ValidationError
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.models.function import FunctionModel
from pydantic_ai.usage import RequestUsage


def coordination():
    return Design.model_validate(
        next(t["design"] for t in templates() if t["id"] == "distributed_coordination")
    )


def test_http_plan_and_real_scenarios_remain_revision_pinned_after_reopen(tmp_path):
    design = coordination()
    design.seeds = [17]
    rules = design.conditions[0].parameters.coordination
    assert rules is not None
    payload = design.model_dump() | {
        "analysis_plan": {
            "target": "Only the declared development case.",
            "outcomes": [{"key": "decisions", "calculation": "turn_count"}],
        },
        "scenarios": [
            {
                "seed": 17,
                "name": "Independent asymmetric case",
                "values": {
                    key: {"cedar": 3, "quartz": 1, "reed": 7} for key in rules.information.values()
                },
            }
        ],
    }
    url = f"sqlite:///{tmp_path}/reopen.sqlite3"
    with TestClient(create_app(url), base_url="http://localhost") as client:
        saved = client.post("/api/studies", json={"design": payload})
        assert saved.status_code == 201, saved.text
        sid = saved.json()["id"]
        revised = payload | {
            "analysis_plan": payload["analysis_plan"] | {"target": "Revision two."}
        }
        assert (
            client.post(f"/api/studies/{sid}/revisions", json={"design": revised}).status_code
            == 201
        )
    with TestClient(create_app(url), base_url="http://localhost") as client:
        first = client.get(f"/api/studies/{sid}/findings?revision=1").json()
        current = client.get(f"/api/studies/{sid}/findings").json()
        assert client.get(f"/api/studies/{sid}/findings?revision=0").status_code == 422
        assert first["revision"] == 1 and current["revision"] == 2
        assert first["plan"]["target"] == "Only the declared development case."
        assert current["plan"]["target"] == "Revision two."
        export = client.get(f"/api/studies/{sid}/export").json()
        assert export["version"] == 19 and export["research"] == current
        assert (
            export["revisions"][0]["design"]["scenarios"][0]["values"]
            == payload["scenarios"][0]["values"]
        )
        assert export["revisions"][0]["design"]["analysis_plan"] == first["plan"]
        assert client.get("/api/settings").json()["usage"]["requests"] == 0


def test_plan_requires_computable_or_explicitly_manual_outcomes():
    with pytest.raises(ValidationError):
        AnalysisPlan.model_validate({"outcomes": [{"key": "trust", "calculation": "manual"}]})
    with pytest.raises(ValidationError):
        AnalysisPlan.model_validate({"version": 2, "outcomes": []})
    plan = AnalysisPlan.model_validate(
        {"outcomes": [{"key": "turns", "calculation": "turn_count"}]}
    )
    assert plan.exclusions == "retain_all"
    assert plan.uncertainty == "descriptive"


def test_fixed_tasks_are_not_certified_as_independent_seed_scenarios():
    design = coordination()
    design.seeds = [17, 83, 241]
    review = scientific_review(design)
    assert all(row["distinct_initial_states"] == 1 for row in review["variation"])
    codes = {row["code"] for row in review["issues"]}
    assert {"fixed_initial_scenario", "free_waiting", "analysis_not_declared"} <= codes
    assert review["scientific_validity"] == "not_certified"


def test_joint_optimum_counts_disagreement_and_abstention():
    design = coordination()
    condition = design.conditions[0]
    rules = condition.parameters.coordination
    assert rules is not None and condition.parameters.artifacts is not None
    tables = [
        {"cedar": 8, "quartz": 2, "reed": 0},
        {"cedar": 0, "quartz": 7, "reed": 2},
        {"cedar": 0, "quartz": 2, "reed": 6},
    ]
    for actor, table in zip(design.profiles, tables, strict=True):
        key = rules.information[actor.key]
        next(o for o in condition.parameters.artifacts.objects if o.key == key).content = table
    rules.match_bonus = 5
    assert coordination_values(design, condition.parameters)["joint_optimum"] == 26
    for obj in condition.parameters.artifacts.objects:
        if obj.key in rules.information.values():
            obj.content = dict.fromkeys(rules.alternatives, -10)
    rules.match_bonus = 0
    assert coordination_values(design, condition.parameters)["joint_optimum"] == 0


@pytest.mark.parametrize("index", [0, 1, 2])
def test_independently_frozen_calculation_cases(index):
    fixture = Path(__file__).resolve().parents[2] / "benchmarks/research-quality-development.json"
    case = json.loads(fixture.read_text())["independent_calculation_cases"][index]
    design = coordination()
    parameters = design.conditions[0].parameters
    rules, artifacts = parameters.coordination, parameters.artifacts
    assert rules is not None and artifacts is not None
    rules.match_bonus = case["match_bonus"]
    for profile, values in zip(design.profiles, case["tables"], strict=True):
        obj = next(o for o in artifacts.objects if o.key == rules.information[profile.key])
        obj.content = dict(zip(rules.alternatives, values.values(), strict=True))
    assert coordination_values(design, parameters)["joint_optimum"] == case["optimum"]


def test_findings_retain_unfinished_runs_and_never_spend(runtime, design):
    _, models, research, engine = runtime
    design.analysis_plan = AnalysisPlan.model_validate(
        {
            "outcomes": [
                {"key": "decisions", "calculation": "turn_count"},
                {
                    "key": "interpretation",
                    "calculation": "manual",
                    "manual_reason": "Needs coding.",
                },
            ]
        }
    )
    design.seeds = [1, 2]
    sid = research.save_design(design)
    before = research.findings(sid)
    assert before["complete"] == 0
    assert all(row["mean"] is None and row["runs"] == 0 for row in before["results"])
    rid = research.study(sid)["runs"][0]["id"]

    async def run():
        await engine.start(rid)
        await engine.executions[rid].task

    asyncio.run(run())
    usage = models.usage()
    after = research.findings(sid)
    assert after["complete"] == 1 and after["planned"] == 2
    result = next(r for r in after["results"] if r["metric"] == "decisions")
    assert result["runs"] == 1 and result["excluded"] == 1
    assert result["mean"] == design.turn_count and result["interval"] is None
    assert after["outcomes"][1]["status"] == "manual"
    assert models.usage() == usage
    assert research.study(sid)["design"]["analysis_plan"]["version"] == 1


def test_explicit_scenarios_are_matched_real_values_not_extra_seed_labels():
    from agent_sim.simulation.environments import create_world

    design = coordination()
    design.seeds = [1, 2]
    rules = design.conditions[0].parameters.coordination
    assert rules is not None
    tables = {key: {a: 1 for a in rules.alternatives} for key in rules.information.values()}
    payload = design.model_dump() | {
        "scenarios": [
            {"seed": 1, "name": "First case", "values": tables},
            {
                "seed": 2,
                "name": "Second case",
                "values": {
                    key: {a: 9 for a in rules.alternatives} for key in rules.information.values()
                },
            },
        ]
    }
    original = design.model_dump()
    varied = Design.model_validate(payload)
    for condition in varied.conditions:
        first = create_world(varied, condition.parameters, 1)
        second = create_world(varied, condition.parameters, 2)
        assert first.snapshot() != second.snapshot()
        actor, artifact = next(iter(rules.information.items()))
        assert (
            first.read(actor, ReadArtifact(kind="read_artifact", artifact=artifact))["content"]
            == tables[artifact]
        )
    assert design.model_dump() == original
    with pytest.raises(ValidationError, match="every planned seed"):
        Design.model_validate(payload | {"seeds": [1]})


def test_event_wait_is_an_explicit_policy_not_a_world_action():
    design = coordination()
    payload = design.model_dump()
    payload["conditions"][0]["harness"] = {"kind": "event_wait", "max_wait_turns": 3}
    parsed = Design.model_validate(payload)
    assert parsed.conditions[0].harness.kind == "event_wait"
    payload["environment"] = "commons"
    with pytest.raises(ValidationError, match="Event waiting"):
        Design.model_validate(payload)


def test_event_wait_wakes_for_delivery_preserves_turns_and_replays(runtime, monkeypatch):
    _, models, research, engine = runtime
    design = coordination()
    design.rounds, design.seeds = 7, [17]
    base = design.conditions[0].model_dump()
    base["parameters"]["coordination"]["delivery_delay"] = 3
    design = Design.model_validate(
        design.model_dump()
        | {
            "conditions": [
                base,
                base
                | {
                    "key": "event_wait",
                    "name": "Explicit bounded event waiting",
                    "harness": {"kind": "event_wait", "max_wait_turns": 4},
                },
            ]
        }
    )
    observations = []

    async def respond(messages, info):
        obs = json.loads(messages[-1].parts[0].content)
        observations.append(obs)
        action = {"kind": "wait_coordination"}
        if obs["round"] == 1 and obs["you"]["key"] == design.profiles[0].key:
            action = {
                "kind": "send_message",
                "recipient": design.profiles[1].key,
                "text": "New information must wake the receiver.",
            }
        if obs["round"] == 7:
            action = {"kind": "choose_alternative", "alternative": "cedar"}
        return ModelResponse(
            parts=[
                ToolCallPart(
                    info.output_tools[0].name,
                    {
                        "action": action,
                        "rationale": "Development schedule.",
                        "memory": "",
                        "forecast": None,
                    },
                )
            ],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    monkeypatch.setattr(models, "model", lambda _: FunctionModel(function=respond))
    sid = research.save_design(design)

    async def run():
        await engine.start_study(sid)
        await asyncio.gather(*(e.task for e in engine.executions.values() if e.task))

    asyncio.run(run())
    runs = research.study(sid)["runs"]
    ordinary, waiting = (
        next(r for r in runs if r["condition_key"] == key) for key in (base["key"], "event_wait")
    )
    assert ordinary["turn"] == waiting["turn"] == 21
    assert ordinary["usage"]["requests"] == 21
    assert 0 < waiting["usage"]["requests"] < 21
    after = research.run(waiting["id"])
    assert after["state"]["outcome"] == research.run(ordinary["id"])["state"]["outcome"]
    receiver = design.profiles[1].key
    assert any(o["you"]["key"] == receiver and o["round"] == 4 and o["inbox"] for o in observations)
    repeated = [
        a for a in after["activations"] if any(op["kind"] == "event_wait" for op in a["operations"])
    ]
    assert repeated and all(a["requests"] == 0 for a in repeated)
    usage = models.usage()
    assert engine.replay(waiting["id"])["verified_turns"] == 21
    assert models.usage() == usage


def test_execution_effort_counts_judge_and_unknown_but_excludes_researcher(runtime, design):
    db, _, research, _ = runtime
    design.analysis_plan = AnalysisPlan.model_validate(
        {
            "outcomes": [
                {"key": "requests", "calculation": "request_count"},
                {"key": "charge", "calculation": "cost_usd"},
            ]
        }
    )
    sid = research.save_design(design)
    rid = research.study(sid)["runs"][0]["id"]
    with db.session.begin() as session:
        session.get_one(Run, rid).status = "complete"
        for purpose, charged, status in [
            ("decision", 29, "complete"),
            ("participant_operation", 29, "complete"),
            ("adjudication", 272, "complete"),
            ("analysis", 900, "complete"),
        ]:
            session.add(
                ProviderCall(
                    run_id=rid,
                    study_id=sid,
                    purpose=purpose,
                    model="openai:gpt-6-luna",
                    reserved=charged,
                    charged=charged,
                    status=status,
                    turn=1,
                )
            )
    report = research.findings(sid)
    assert report["effort"][0]["requests"] == 3
    assert report["effort"][0]["cost_usd"] == 0.000330
    assert next(r for r in report["results"] if r["metric"] == "charge")["mean"] == 0.000330
    with db.session.begin() as session:
        session.add(
            ProviderCall(
                run_id=rid,
                study_id=sid,
                purpose="decision",
                model="openai:gpt-6-luna",
                reserved=100,
                charged=100,
                status="unknown",
                turn=2,
            )
        )
    report = research.findings(sid)
    assert report["effort"][0]["partial"] is True
    assert report["effort"][0]["cost_usd"] == 0.000430
    assert next(r for r in report["results"] if r["metric"] == "charge")["mean"] is None


def test_planned_calculation_never_moves_past_analysis_cutoff(runtime, design):
    db, models, research, engine = runtime
    design.analysis_plan = AnalysisPlan.model_validate(
        {
            "outcomes": [
                {"key": "decisions", "calculation": "turn_count"},
            ]
        }
    )
    sid = research.save_design(design)
    rid = research.study(sid)["runs"][0]["id"]

    async def run():
        await engine.start(rid)
        await engine.executions[rid].task

    asyncio.run(run())
    assistant = Assistants(db, research, models)
    cutoff = {rid: 1}
    index = assistant._evidence_index(cutoff)
    lens = capture_lens(research, cutoff, index=index, analysis_id="frozen-development")
    calculated = next(c for c in lens["calculations"] if c["id"] == f"run:{rid}:planned:decisions")
    assert calculated["value"] is None
    assert calculated["inputs"]["through_turn"] == 1
    final_index = assistant._evidence_index({rid: design.turn_count})
    final = capture_lens(
        research, {rid: design.turn_count}, index=final_index, analysis_id="final-development"
    )
    assert (
        next(c for c in final["calculations"] if c["id"] == calculated["id"])["value"]
        == design.turn_count
    )
    assert calculated["value"] is None


def test_schema_cache_does_not_broaden_actor_permissions():
    from agent_sim.simulation.environments import create_world

    design = coordination()
    world = create_world(design, design.conditions[0].parameters, 1)
    iris, moss = (p.key for p in design.profiles[:2])
    observation = world.observe(iris)
    schema = world.decision_schema(observation)
    assert world.decision_schema(observation) is schema
    assert world.decision_schema(world.observe(moss)) is not schema
    with pytest.raises(ValidationError):
        schema.model_validate(
            {
                "action": {"kind": "read_artifact", "artifact": f"values_{moss}"},
                "memory": "",
                "rationale": "",
                "forecast": None,
            }
        )


def test_local_value_control_uses_no_model_and_does_not_pool_private_tables(runtime, monkeypatch):
    _, models, research, engine = runtime
    design = coordination()
    payload = design.model_dump()
    payload["conditions"] = payload["conditions"][:1]
    payload["seeds"] = [17]
    payload["conditions"][0]["harness"] = {"kind": "scripted", "policy": "local_value_v1"}
    design = Design.model_validate(payload)
    monkeypatch.setattr(models, "model", lambda _: pytest.fail("Reference constructed a provider"))
    sid = research.save_design(design)
    rid = research.study(sid)["runs"][0]["id"]

    async def run():
        await engine.start(rid)
        await engine.executions[rid].task

    asyncio.run(run())
    record = research.run(rid)
    assert record["summary"]["status"] == "complete"
    assert record["summary"]["turn"] == 6
    assert models.usage()["requests"] == 0
    choices = record["state"]["outcome"]["choices"]
    assert len(set(choices.values())) == 3
    assert engine.replay(rid)["verified_turns"] == 6


@pytest.mark.parametrize("run_limit,request_limit,expected_peak", [(1, 4, 1), (3, 2, 2), (3, 4, 3)])
def test_concurrency_bounds_and_within_run_causality(
    runtime, design, monkeypatch, run_limit, request_limit, expected_peak
):
    _, models, research, engine = runtime
    engine.concurrency, engine.capacity = run_limit, asyncio.Semaphore(run_limit)
    models.concurrency, models.capacity = request_limit, asyncio.Semaphore(request_limit)
    design.rounds, design.seeds = 1, [1, 2, 3, 4]
    active, peak = 0, 0

    async def respond(messages, info):
        nonlocal active, peak
        active += 1
        peak = max(peak, active)
        try:
            await asyncio.sleep(0.01)
            return ModelResponse(
                parts=[
                    ToolCallPart(
                        info.output_tools[0].name,
                        decision_for(json.loads(messages[-1].parts[0].content)),
                    )
                ],
                usage=RequestUsage(input_tokens=100, output_tokens=50),
            )
        finally:
            active -= 1

    monkeypatch.setattr(models, "model", lambda _: FunctionModel(function=respond))
    sid = research.save_design(design)

    async def run():
        await engine.start_study(sid)
        await asyncio.gather(*(e.task for e in engine.executions.values() if e.task))

    asyncio.run(run())
    assert peak == expected_peak
    assert active == 0
    for run in research.study(sid)["runs"]:
        assert run["status"] == "complete" and run["turn"] == len(design.profiles)
        assert engine.replay(run["id"])["verified_turns"] == len(design.profiles)


def test_planned_metric_alias_retains_bounds_but_turn_count_alias_does_not(runtime, design):
    _, _, research, engine = runtime
    design.seeds = [17, 83]
    design.analysis_plan = AnalysisPlan.model_validate(
        {
            "outcomes": [
                {"key": "cooperation", "calculation": "metric", "metric": "contribution_rate"},
                {"key": "accuracy", "calculation": "turn_count"},
            ]
        }
    )
    sid = research.save_design(design)
    rid = research.study(sid)["runs"][0]["id"]

    async def complete_one():
        await engine.start(rid)
        await engine.executions[rid].task

    asyncio.run(complete_one())
    report = research.findings(sid)
    cooperation = next(r for r in report["results"] if r["metric"] == "cooperation")
    assert cooperation["sensitivity"]["status"] == "bounded"
    assert cooperation["sensitivity"]["bounds"] == [0.25, 0.75]
    decisions = next(r for r in report["results"] if r["metric"] == "accuracy")
    assert decisions["mean"] == design.turn_count
    assert decisions["sensitivity"]["status"] == "not_identified"


def test_eight_run_planned_analysis_fits_without_losing_frozen_inputs(runtime, monkeypatch):
    from pydantic_ai.models.function import DeltaToolCall

    db, models, research, engine = runtime
    design = coordination()
    design.rounds, design.seeds = 6, [17, 83]
    base = design.conditions[0].model_dump()
    design = Design.model_validate(
        design.model_dump()
        | {
            "conditions": [
                {
                    **base,
                    "key": f"arm_{i}",
                    "name": f"Policy {i}",
                    "harness": {"kind": "scripted", "policy": "local_value_v1"},
                }
                for i in range(4)
            ],
            "analysis_plan": {
                "outcomes": [
                    {"key": key, "calculation": kind}
                    for key, kind in [
                        ("regret", "coordination_regret"),
                        ("decisions", "turn_count"),
                        ("waits", "wait_count"),
                        ("requests", "request_count"),
                        ("cost", "cost_usd"),
                    ]
                ]
            },
        }
    )
    sid = research.save_design(design)
    prompts = []

    async def stream(messages, info):
        prompt = json.loads(messages[-1].parts[0].content)
        prompts.append(prompt)
        runs = analysis_prompt(json.dumps(prompt))["index"]["runs"]
        requests = (
            [{"kind": "history", "run_id": runs[0]["run_id"], "start": 1, "count": 7}]
            + [{"kind": "turn", "run_id": run["run_id"], "turn": 4} for run in runs[1:4]]
            if len(prompts) == 1
            else []
        )
        yield {
            0: DeltaToolCall(
                name=info.output_tools[0].name,
                json_args=json.dumps(
                    {
                        "requests": requests,
                        "answer": None
                        if requests
                        else {
                            "answer": "Only these fixed tasks.",
                            "citations": [],
                            "caveats": ["No generality established."],
                            "claims": [],
                        },
                    }
                ),
            )
        }

    async def exercise():
        await engine.start_study(sid)
        await asyncio.gather(*(e.task for e in engine.executions.values() if e.task))
        monkeypatch.setattr(models, "model", lambda _: FunctionModel(stream_function=stream))
        assistant = Assistants(db, research, models)
        key = await assistant.start(
            "Compare planned outcomes, effort and limits.", purpose="analysis", study_id=sid
        )
        await assistant.tasks[key]
        row = assistant.get(key)
        assert row["status"] == "complete", row["error"]
        assert len(prompts) == 2
        assert len(analysis_prompt(json.dumps(prompts[-1]))["evidence"]) == 4
        assert row["output"]["evidence_index"]["protocols"]
        assert len(row["output"]["evidence_index"]["runs"]) == 8
        wire = analysis_prompt(json.dumps(prompts[0]))["index"]
        frozen = row["output"]["evidence_index"]
        for name in ("protocols", "conditions", "comparisons", "exposure", "experiment_checks"):
            assert wire[name] == frozen[name]
        planned = [c for c in wire["lens"]["calculations"] if ":planned:" in c["id"]]
        assert len(planned) == 40

    asyncio.run(exercise())


def test_scientific_review_detects_when_local_only_choices_already_attain_optimum():
    design = coordination()
    design.seeds = [17]
    for condition in design.conditions:
        rules, artifacts = condition.parameters.coordination, condition.parameters.artifacts
        assert rules is not None and artifacts is not None
        for profile, values in zip(design.profiles, [(8, 2, 0), (0, 7, 2), (0, 2, 6)], strict=True):
            obj = next(o for o in artifacts.objects if o.key == rules.information[profile.key])
            obj.content = dict(zip(rules.alternatives, values, strict=True))
        rules.match_bonus = 0
    review = scientific_review(design)
    assert "local_information_sufficient" in {i["code"] for i in review["issues"]}
    assert all(
        row["payoff_cases"] == [{"seed": 17, "local_value": 21, "joint_optimum": 21}]
        for row in review["variation"]
    )
    for condition in design.conditions:
        assert condition.parameters.coordination is not None
        condition.parameters.coordination.match_bonus = 5
    strengthened = scientific_review(design)
    assert "local_information_sufficient" not in {i["code"] for i in strengthened["issues"]}
    assert all(
        row["payoff_cases"] == [{"seed": 17, "local_value": 21, "joint_optimum": 26}]
        for row in strengthened["variation"]
    )


def test_shared_analysis_wire_preserves_nested_evidence_without_hash_overhead():
    from agent_sim.assistants import _share_analysis_inputs
    from conftest import analysis_prompt

    observation = {"rules": ["private permission " * 30], "choices": list(range(40))}
    original = {
        "index": {"observation": observation},
        "evidence": [
            {"turn": i, "observation": observation, "rules": observation["rules"]}
            for i in range(20)
        ],
    }
    before = json.dumps(original)
    wire = json.dumps(_share_analysis_inputs(original))
    decoded = analysis_prompt(wire)
    decoded.pop("shared_analysis_inputs")
    assert decoded == original
    assert json.dumps(original) == before
    assert len(wire) < 3500  # Leaves headroom for schema/instructions in the 180k-byte envelope.


@pytest.mark.parametrize("intent", ["exploratory", "confirmatory"])
def test_planner_cannot_change_declared_research_intent(runtime, intent):
    from agent_sim.domain import DesignSpec
    from agent_sim.environment_library import builtin_environment
    from agent_sim.planning import Candidate, Planner, StudyBrief

    db, models, research, _ = runtime
    design = coordination()
    design.hypothesis = "Compare the declared decision counts."
    design.analysis_plan = AnalysisPlan.model_validate(
        {
            "intent": "confirmatory" if intent == "exploratory" else "exploratory",
            "outcomes": [{"key": "decisions", "calculation": "turn_count"}],
        }
    )
    brief = StudyBrief(
        supported=True,
        intent=intent,
        explanation="Fixed tasks.",
        operationalization="Committed decisions.",
        size_rationale="Matched fixed cases.",
        agents=len(design.profiles),
        conditions=len(design.conditions),
        seeds=len(design.seeds),
        repetitions=design.repetitions,
        rounds=design.rounds,
        research_query=None,
    )
    candidate = Candidate(
        explanation="Proposed comparison.", design=DesignSpec.model_validate(design.model_dump())
    )
    sources = [builtin_environment(design.environment).model_dump()]
    with pytest.raises(ValueError, match="research intent"):
        Planner(db, research, models)._validate_candidate(candidate, brief, sources)
