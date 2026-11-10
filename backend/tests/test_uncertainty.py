"""Independent DEVELOPMENT oracles at the public workflow API; no live calls."""

import asyncio
import json
import os
from pathlib import Path

import pytest
from agent_sim.api import create_app
from agent_sim.domain import Parameters, Treatment
from conftest import decision_for
from fastapi.testclient import TestClient
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.models.function import DeltaToolCall, FunctionModel
from pydantic_ai.usage import RequestUsage


@pytest.fixture
def client(tmp_path, monkeypatch, request):
    app = create_app(f"sqlite:///{tmp_path}/uncertainty.sqlite3", static_dir=tmp_path / "static")
    operations = []
    with TestClient(app, base_url="http://localhost") as client:
        send = client.request

        def recorded(method, url, **kwargs):
            response = send(method, url, **kwargs)
            operations.append(
                dict(
                    method=method,
                    path=url,
                    body=kwargs.get("json"),
                    status=response.status_code,
                    response=response.json(),
                )
            )
            return response

        monkeypatch.setattr(client, "request", recorded)
        yield client
    if directory := os.getenv("JAS_T06_EVIDENCE"):
        path = Path(directory)
        path.mkdir(parents=True, exist_ok=True)
        (path / f"{request.node.name}.json").write_text(json.dumps(operations, indent=2) + "\n")


def save(client, design, seeds=(7, 11), repetitions=1):
    design.rounds = 1
    design.profiles = design.profiles[:2]
    design.seeds = list(seeds)
    design.repetitions = repetitions
    design.conditions = [
        Treatment(key="a", name="A", parameters=Parameters(endowment=10)),
        Treatment(key="b", name="B", parameters=Parameters(endowment=10, communication=False)),
    ]
    design.measures = ["contribution_rate", "group_payoff", "false_report_rate"]
    response = client.post("/api/studies", json={"design": design.model_dump()})
    assert response.status_code == 201, response.text
    sid = response.json()["id"]
    study = client.get(f"/api/studies/{sid}").json()
    return sid, {(r["condition_key"], r["seed"], r["repetition"]): r["id"] for r in study["runs"]}


def execute(client, monkeypatch, rid, amount=0, *, fail=False, action="start"):
    async def respond(messages, info):
        if fail:
            raise RuntimeError("Controlled missing arm")
        observation = json.loads(messages[-1].parts[0].content)
        decision = decision_for(observation)
        decision["action"]["amount"] = amount
        decision["action"]["report"] = None
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, decision)],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    model = FunctionModel(function=respond)
    monkeypatch.setattr(client.app.state.models, "model", lambda _name: model)
    response = client.post(f"/api/runs/{rid}/control", json={"action": action})
    assert response.status_code == 200, response.text

    async def finished():
        await client.app.state.engine.executions[rid].task

    client.portal.call(finished)


def result(study, condition, metric="contribution_rate"):
    return next(
        r for r in study["results"] if r["condition_key"] == condition and r["metric"] == metric
    )


def test_missing_arm_preserves_matrix_and_bounds_without_inventing_outcomes(
    client, design, monkeypatch
):
    sid, runs = save(client, design)
    execute(client, monkeypatch, runs["a", 7, 1], 0)
    execute(client, monkeypatch, runs["a", 11, 1], 10)
    execute(client, monkeypatch, runs["b", 7, 1], 10)
    execute(client, monkeypatch, runs["b", 11, 1], fail=True)
    before = {rid: client.get(f"/api/runs/{rid}").json() for rid in runs.values()}
    study = client.get(f"/api/studies/{sid}").json()
    comparison = study["comparison"]
    a, b = comparison["conditions"]
    assert {
        key: a[key]
        for key in (
            "planned",
            "attempted",
            "complete",
            "failed",
            "interrupted",
            "excluded",
            "unmatched",
        )
    } == {
        "planned": 2,
        "attempted": 2,
        "complete": 2,
        "failed": 0,
        "interrupted": 0,
        "excluded": 0,
        "unmatched": 1,
    }
    assert {
        key: b[key]
        for key in (
            "planned",
            "attempted",
            "complete",
            "failed",
            "interrupted",
            "excluded",
            "unmatched",
        )
    } == {
        "planned": 2,
        "attempted": 2,
        "complete": 1,
        "failed": 1,
        "interrupted": 0,
        "excluded": 1,
        "unmatched": 0,
    }
    assert result(study, "a")["mean"] == 0.5
    assert result(study, "b")["mean"] == 1
    effect = next(e for e in study["effects"] if e["metric"] == "contribution_rate")
    assert (effect["mean"], effect["pairs"], effect["planned_pairs"], effect["seeds"]) == (
        1,
        1,
        2,
        1,
    )
    assert effect["interval"] is None
    assert effect["sensitivity"]["bounds"] == [0, 0.5]
    assert effect["sensitivity"]["status"] == "bounded"
    assert "selection" in effect["selection_assumption"].lower()
    failed = next(c for c in comparison["cells"] if c["run_id"] == runs["b", 11, 1])
    assert failed["status"] == "failed" and failed["reason"]
    assert failed["metrics"] == {}
    exported = client.get(f"/api/studies/{sid}/export").json()
    assert exported["study"]["comparison"] == comparison
    assert exported["study"]["sha256"] == study["sha256"]
    for rid, record in before.items():
        assert client.get(f"/api/runs/{rid}").json() == record
        assert (
            client.post(f"/api/runs/{rid}/verify").json()["verified_turns"]
            == record["summary"]["turn"]
        )


def test_analysis_freezes_planned_sample_before_late_completion_and_revision(
    client, design, monkeypatch
):
    sid, runs = save(client, design, seeds=(7,))
    execute(client, monkeypatch, runs["a", 7, 1], 0)
    execute(client, monkeypatch, runs["b", 7, 1], 10, action="step")
    entered, release = asyncio.Event(), asyncio.Event()
    prompts = []

    async def respond(messages, info):
        prompt = json.loads(messages[-1].parts[0].content)
        if "index" in prompt:
            prompts.append(prompt)
            entered.set()
            await release.wait()
            output = {
                "requests": [],
                "answer": {
                    "answer": "Only one completed arm; no matched outcome is observed.",
                    "citations": [],
                    "caveats": ["Missing arm; no independent sampling design."],
                },
            }
        else:
            output = decision_for(prompt)
            output["action"]["amount"] = 10
            output["action"]["report"] = None
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, output)],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    async def stream(messages, info):
        response = await respond(messages, info)
        yield {
            0: DeltaToolCall(
                name=info.output_tools[0].name, json_args=json.dumps(response.parts[0].args)
            )
        }

    model = FunctionModel(function=respond, stream_function=stream)
    monkeypatch.setattr(client.app.state.models, "model", lambda _name: model)
    posted = client.post(
        "/api/chats", json={"question": "Compare the recorded sample", "context": f"study:{sid}"}
    )
    assert posted.status_code == 202, posted.text
    aid = posted.json()["id"]

    async def wait_entered():
        await asyncio.wait_for(entered.wait(), 5)

    client.portal.call(wait_entered)
    captured = client.get(f"/api/analyses/{aid}").json()
    comparisons = captured["output"]["comparisons"]
    frozen = next(iter(comparisons.values()))
    assert [c["complete"] for c in frozen["comparison"]["conditions"]] == [1, 0]
    assert frozen["comparison"]["conditions"][1]["interrupted"] == 1
    assert next(e for e in frozen["effects"] if e["metric"] == "contribution_rate")["mean"] is None
    response = client.post(f"/api/runs/{runs['b', 7, 1]}/control", json={"action": "start"})
    assert response.status_code == 200

    async def finish():
        await client.app.state.engine.executions[runs["b", 7, 1]].task
        release.set()
        await client.app.state.assistants.tasks[aid]

    revised = client.post(f"/api/studies/{sid}/revisions", json={"design": design.model_dump()})
    assert revised.status_code == 201
    client.portal.call(finish)
    complete = client.get(f"/api/analyses/{aid}").json()
    assert complete["status"] == "complete", complete
    assert complete["output"]["comparisons"] == comparisons
    assert prompts[0]["index"]["comparisons"] == comparisons
    exported = client.get(f"/api/studies/{sid}/export").json()
    analysis = next(a for a in exported["analyses"] if a["id"] == aid)
    assert analysis["output"]["comparisons"] == comparisons
    assert analysis["cutoffs"] == captured["cutoffs"]
    assert exported["study"]["revision"] == 2
    assert frozen["comparison"]["revision"] == 1
    assert frozen["comparison"]["design_sha256"] == exported["revisions"][0]["sha256"]
    assert client.get(f"/api/runs/{runs['b', 7, 1]}").json()["summary"]["status"] == "complete"


@pytest.mark.parametrize("seeds,repetitions", [((7,), 4), ((7, 11), 2), ((7, 11, 19), 1)])
def test_fixed_seed_clusters_never_certify_independent_support(
    client, design, monkeypatch, seeds, repetitions
):
    sid, runs = save(client, design, seeds=seeds, repetitions=repetitions)
    for (condition, _seed, _repetition), rid in runs.items():
        execute(client, monkeypatch, rid, 10 if condition == "b" else 0)
    study = client.get(f"/api/studies/{sid}").json()
    effect = next(e for e in study["effects"] if e["metric"] == "contribution_rate")
    assert effect["mean"] == 1
    assert (effect["seeds"], effect["pairs"]) == (len(seeds), len(seeds) * repetitions)
    assert effect["interval"] is None
    assert "sampling" in effect["uncertainty_reason"]
    assert "small samples" in effect["uncertainty_reason"]
    assert study["comparison"]["independent_support"] is None
    assert "histories" in study["comparison"]["dependence"]


def test_incomplete_cells_and_undefined_metrics_have_distinct_exclusions(
    client, design, monkeypatch
):
    sid, runs = save(client, design)
    execute(client, monkeypatch, runs["a", 7, 1], 0, action="step")
    execute(client, monkeypatch, runs["b", 11, 1], fail=True)
    study = client.get(f"/api/studies/{sid}").json()
    assert [
        (c["attempted"], c["interrupted"], c["ready"], c["failed"], c["excluded"])
        for c in study["comparison"]["conditions"]
    ] == [(1, 1, 1, 0, 2), (1, 0, 1, 1, 2)]
    for e in study["effects"]:
        assert e["mean"] is None and e["pairs"] == 0 and len(e["missing_pairs"]) == 2
    rate = next(e for e in study["effects"] if e["metric"] == "contribution_rate")
    assert rate["sensitivity"]["bounds"] == [-1, 1]
    payoff = next(e for e in study["effects"] if e["metric"] == "group_payoff")
    assert (
        payoff["sensitivity"]["status"] == "not_identified"
        and payoff["sensitivity"]["bounds"] is None
    )
    execute(client, monkeypatch, runs["a", 7, 1], 0)
    updated = client.get(f"/api/studies/{sid}").json()
    reports = result(updated, "a", "false_report_rate")
    assert updated["comparison"]["conditions"][0]["complete"] == 1
    assert reports["mean"] is None and reports["excluded"] == 2
    assert any("denominator" in e["reason"] for e in reports["exclusions"])
    assert reports["sensitivity"]["bounds"] is None


def test_missing_repetition_keeps_equal_seed_weights_and_planned_bounds(
    client, design, monkeypatch
):
    sid, runs = save(client, design, repetitions=2)
    values = {
        ("a", 7, 1): 0,
        ("b", 7, 1): 10,
        ("a", 7, 2): 10,
        ("b", 7, 2): None,
        ("a", 11, 1): 0,
        ("b", 11, 1): 0,
        ("a", 11, 2): 0,
        ("b", 11, 2): 0,
    }
    for cell, value in values.items():
        execute(client, monkeypatch, runs[cell], value or 0, fail=value is None)
    study = client.get(f"/api/studies/{sid}").json()
    effect = next(e for e in study["effects"] if e["metric"] == "contribution_rate")
    assert (effect["mean"], effect["pairs"], effect["seeds"]) == (0.5, 3, 2)
    assert effect["sensitivity"]["bounds"] == [0, 0.25]
    assert result(study, "a")["mean"] == 0.25
    assert result(study, "b")["mean"] == 0.5


def test_unmatched_counts_follow_planned_baseline_contrasts_not_unplanned_pairs(
    client, design, monkeypatch
):
    sid, _ = save(client, design, seeds=(7,))
    design.conditions.append(Treatment(key="c", name="C", parameters=Parameters(endowment=5)))
    revised = client.post(f"/api/studies/{sid}/revisions", json={"design": design.model_dump()})
    assert revised.status_code == 201
    runs = client.get(f"/api/studies/{sid}").json()["runs"]
    for run in runs:
        execute(client, monkeypatch, run["id"], fail=run["condition_key"] == "c")
    report = client.get(f"/api/studies/{sid}").json()
    assert [(c["condition_key"], c["unmatched"]) for c in report["comparison"]["conditions"]] == [
        ("a", 1),
        ("b", 0),
        ("c", 0),
    ]
    assert len(report["comparison"]["cells"]) == 3
