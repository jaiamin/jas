"""Fresh T19 DEVELOPMENT examples; expected outcomes predeclared in the report.

Real HTTP/World/storage/accounting; only the external provider is deterministic.
Matching values cannot certify generated wording or semantic reliability.
"""

import asyncio
import gzip
import json
import os
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from threading import Event
from typing import Any
from uuid import uuid4

import pytest
from agent_sim.api import create_app
from conftest import analysis_prompt
from fastapi.testclient import TestClient
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.models.function import DeltaToolCall, FunctionModel
from pydantic_ai.usage import RequestUsage


@pytest.fixture
def claim_client(tmp_path, monkeypatch, request):
    controls: dict[str, Any] = {
        "amount": 2,
        "answer": "The recorded total utility is 440.",
        "value": 440,
    }
    seen, operations = [], []

    async def respond(messages, info):
        prompt = analysis_prompt(messages[-1].parts[0].content)
        seen.append(prompt)
        if "index" in prompt:
            if gate := controls.get("analysis_gate"):
                controls["analysis_entered"].set()
                assert await asyncio.to_thread(gate.wait, 10)
            indexed = prompt["index"]["runs"]
            rid = next(
                (r["run_id"] for r in indexed if r["through_turn"] > 0), indexed[0]["run_id"]
            )
            if not prompt["evidence"]:
                payload = {
                    "requests": [
                        {
                            "kind": "history",
                            "run_id": rid,
                            "start": controls.get("evidence_start", 1),
                            "count": 20,
                        }
                    ],
                    "answer": None,
                }
            else:
                payload = {
                    "requests": [],
                    "answer": {
                        "answer": controls["answer"],
                        "citations": [{"run_id": rid, "turn": controls.get("citation_turn", 1)}],
                        "caveats": ["One fixed seed does not establish independent support."],
                        "claims": controls["claims"](prompt, rid)
                        if "claims" in controls
                        else [
                            {
                                "kind": "calculation",
                                "text": controls["answer"],
                                "calculation_id": f"run:{rid}:total_utility",
                                "value": controls["value"],
                                "scope": "captured_run",
                            }
                        ],
                    },
                }
        else:
            if gate := controls.get("participant_gate"):
                controls["participant_entered"].set()
                assert await asyncio.to_thread(gate.wait, 10)
            if controls.get("failure"):
                raise TimeoutError("Controlled failed DEVELOPMENT participant request")
            payload = {
                "action": {
                    "kind": "contribute",
                    "amount": controls["amount"],
                    "target": "",
                    "message": "",
                    "report": None,
                    "promise": None,
                },
                "memory": "",
                "rationale": "Scripted development choice.",
                "forecast": None,
            }
            if controls.get("breach"):
                payload["action"].update(
                    amount=2 if prompt["round"] == 1 else 0,
                    promise=3 if prompt["round"] == 1 else None,
                    report=(prompt["your_private_signal"] + 1) % 101,
                )
            if actions := controls.get("artifact_actions"):
                payload["action"] = next(actions)
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, payload)],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
            model_name="t19-development-v1",
        )

    async def stream(messages, info):
        response = await respond(messages, info)
        part = response.parts[0]
        assert isinstance(part, ToolCallPart)
        yield {0: DeltaToolCall(name=part.tool_name, json_args=json.dumps(part.args))}

    app = create_app(f"sqlite:///{tmp_path}/claims.sqlite3", static_dir=tmp_path / "static")
    monkeypatch.setattr(
        app.state.models,
        "model",
        lambda _: FunctionModel(
            function=respond,
            stream_function=stream,
        ),
    )
    with TestClient(app, base_url="http://localhost") as client:
        transport = client.request

        def recorded(method, url, **kwargs):
            response = transport(method, url, **kwargs)
            operations.append(
                {
                    "method": method,
                    "url": str(url),
                    "body": kwargs.get("json"),
                    "status": response.status_code,
                    "response": response.json(),
                }
            )
            return response

        monkeypatch.setattr(client, "request", recorded)
        try:
            yield client, controls, seen
        finally:
            if directory := os.getenv("JAS_T19_EVIDENCE"):
                output = Path(directory) / f"{request.node.name}-{uuid4().hex}"
                output.mkdir(parents=True)
                exports = [
                    client.get(f"/api/studies/{s['id']}/export").json()
                    for s in client.get("/api/studies").json()
                ]
                for name, value in {
                    "http": operations,
                    "provider": seen,
                    "exports": exports,
                }.items():
                    with gzip.open(output / f"{name}.json.gz", "wt") as handle:
                        json.dump(value, handle, indent=2)
                (output / "identity.json").write_text(
                    json.dumps(
                        {
                            "case": request.node.name,
                            "source": os.getenv("JAS_T19_SOURCE"),
                            "head": os.getenv("JAS_T19_SOURCE_HEAD"),
                            "paid_requests": 0,
                            "expected": "docs/EXPERIMENT_VALIDITY.md",
                        },
                        indent=2,
                    )
                )


def save(client, design):
    value = design.model_dump()
    value.update(rounds=2, seeds=[7], profiles=value["profiles"][:2])
    value["conditions"][0]["parameters"].update(endowment=10, multiplier=1.5)
    response = client.post("/api/studies", json={"design": value})
    assert response.status_code == 201, response.text
    sid = response.json()["id"]
    return sid, client.get(f"/api/studies/{sid}").json()["runs"][0]["id"]


def run(client, rid, operation="start"):
    response = client.post(f"/api/runs/{rid}/control", json={"action": operation})
    assert response.status_code == 200, response.text

    async def settled():
        await client.app.state.engine.executions[rid].task

    client.portal.call(settled)
    return client.get(f"/api/runs/{rid}").json()["summary"]


def finish(client, submitted):
    assert submitted.status_code == 202, submitted.text
    key = submitted.json()["id"]

    async def settled():
        await client.app.state.assistants.tasks[key]

    client.portal.call(settled)
    return client.get(f"/api/analyses/{key}").json()


def source(exported):
    """Independent public evidence/accounting oracle, excluding analysis-only work."""
    return {
        "evidence": [r["evidence"] for r in exported["runs"]],
        "revisions": exported["revisions"],
        "activations": exported["activations"],
        "participant_requests": [r for r in exported["requests"] if r["analysis_id"] is None],
    }


def test_inspected_citation_cannot_validate_invented_total(claim_client, design):
    client, _, _ = claim_client
    sid, rid = save(client, design)
    assert run(client, rid)["status"] == "complete"
    before = source(client.get(f"/api/studies/{sid}/export").json())
    final = finish(
        client,
        client.post(
            "/api/chats",
            json={
                "question": "Describe the recorded utility and assess its support.",
                "context": f"run:{rid}",
            },
        ),
    )
    assert final["status"] == "complete", final
    support = final["output"]["support"]
    assert support["version"] == 1
    assert support["claims"][0]["status"] == "contradicted"
    assert support["claims"][0]["computed"] == 44
    assert support["prose_status"] == "unassessed"
    calculation = next(
        c for c in final["output"]["lens"]["calculations"] if c["id"] == f"run:{rid}:total_utility"
    )
    assert calculation["inputs"]["balances"] == {"alex": 22, "morgan": 22}
    assert calculation["value"] == 44 and calculation["scope"] == "captured_run"
    assert source(client.get(f"/api/studies/{sid}/export").json()) == before
    assert final["usage"]["requests"] == 2


def test_six_run_interpretation_fits_without_losing_calculation_assumptions(claim_client):
    import copy

    client, controls, seen = claim_client
    catalog = client.get("/api/catalog").json()
    value = copy.deepcopy(next(t["design"] for t in catalog["templates"] if t["id"] == "commons"))
    value.update(
        title="Communication and contributions DEVELOPMENT",
        question="How does public message availability change contributions across matched seeds?",
        hypothesis="Exploratory: subtract messages-unavailable from messages-available "
        "within each seed; retain all three differences and failures. No human-valid inference.",
        profiles=value["profiles"][:3],
        rounds=3,
        seeds=[17, 83, 241],
        repetitions=1,
        environment_source=next(
            e["source"] for e in catalog["environments"] if e["key"] == "commons"
        ),
    )
    first = value["conditions"][0]
    first.update(key="messages", name="Messages available")
    first["parameters"].update(
        communication=True, communication_channels=["messages", "reports", "promises"]
    )
    second = copy.deepcopy(first)
    second.update(key="no_messages", name="Messages unavailable")
    second["parameters"]["communication_channels"] = ["reports", "promises"]
    value["conditions"] = [first, second]
    saved = client.post("/api/studies", json={"design": value})
    assert saved.status_code == 201, saved.text
    sid = saved.json()["id"]
    for record in client.get(f"/api/studies/{sid}").json()["runs"]:
        assert run(client, record["id"])["status"] == "complete"
    before = source(client.get(f"/api/studies/{sid}/export").json())
    controls.update(value=198, answer="Each scripted trajectory settled total utility 198.")
    final = finish(
        client,
        client.post(
            "/api/chats",
            json={"question": "Compare all three matched seeds.", "context": f"study:{sid}"},
        ),
    )
    assert final["status"] == "complete", final.get("error")
    assert final["usage"]["requests"] == 2
    assert final["output"]["support"]["claims"][0]["status"] == "checked"
    full = final["output"]["lens"]
    assert full["coverage"]["planned_cells"] == 6
    calculations = {c["id"]: c for c in full["calculations"]}
    for prompt in (p for p in seen if "index" in p):
        lens = prompt["index"]["lens"]
        for calculation in lens["calculations"]:
            assumptions = [
                lens["calculation_assumptions"][i] for i in calculation["assumption_indices"]
            ]
            assert assumptions == calculations[calculation["id"]]["assumptions"]
            assert calculation["value"] == calculations[calculation["id"]]["value"]
            assert (
                lens["calculation_formulas"][calculation["formula_index"]]
                == calculations[calculation["id"]]["formula"]
            )
            assert (
                lens["calculation_sources"][calculation["sources_index"]]
                == calculations[calculation["id"]]["sources"]
            )
    assert all(c["inputs"] for c in calculations.values())
    assert source(client.get(f"/api/studies/{sid}/export").json()) == before


@pytest.mark.parametrize(
    "amount,asserted,expected,computed",
    [(10, -1, "contradicted", 1), (10, 1, "checked", 1), (0, 0, "checked", 0)],
)
def test_condition_contrast_is_recomputed_in_declared_direction(
    claim_client,
    design,
    amount,
    asserted,
    expected,
    computed,
):
    client, controls, _ = claim_client
    value = design.model_dump()
    value.update(rounds=1, seeds=[7], profiles=value["profiles"][:2])
    first = value["conditions"][0]
    first["parameters"].update(endowment=10, multiplier=1.5)
    value["conditions"].append({**first, "key": "treatment", "name": "Treatment"})
    sid = client.post("/api/studies", json={"design": value}).json()["id"]
    study = client.get(f"/api/studies/{sid}").json()
    for record in study["runs"]:
        controls["amount"] = amount if record["condition_key"] == "treatment" else 0
        assert run(client, record["id"])["status"] == "complete"

    def claims(prompt, _rid):
        revision = next(iter(prompt["index"]["comparisons"]))
        return [
            {
                "kind": "calculation",
                "text": "Treatment minus baseline contribution rate.",
                "calculation_id": f"contrast:{revision}:treatment:contribution_rate",
                "value": asserted,
                "scope": "observed_pairs",
            }
        ]

    controls["claims"] = claims
    final = finish(
        client,
        client.post(
            "/api/chats",
            json={
                "question": "What was treatment minus baseline?",
                "context": f"study:{sid}",
            },
        ),
    )
    assert final["status"] == "complete", final
    result = final["output"]["support"]["claims"][0]
    assert result["status"] == expected and result["computed"] == computed
    calculation = next(
        c for c in final["output"]["lens"]["calculations"] if c["id"] == result["calculation_id"]
    )
    assert calculation["inputs"]["condition_key"] == "treatment"
    assert calculation["inputs"]["baseline_key"] == first["key"]
    assert calculation["coverage"] == {"pairs": 1, "planned_pairs": 1, "seed_clusters": 1}
    assert final["output"]["support"]["prose_status"] == "unassessed"


def test_missing_trial_cannot_be_claimed_as_a_second_observed_pair(claim_client, design):
    client, controls, _ = claim_client
    value = design.model_dump()
    value.update(rounds=1, seeds=[7, 11], profiles=value["profiles"][:2])
    first = value["conditions"][0]
    first["parameters"].update(endowment=10, multiplier=1.5)
    value["conditions"].append({**first, "key": "treatment", "name": "Treatment"})
    sid = client.post("/api/studies", json={"design": value}).json()["id"]
    for record in client.get(f"/api/studies/{sid}").json()["runs"]:
        controls["amount"] = (
            0 if record["condition_key"] == first["key"] and record["seed"] == 7 else 10
        )
        controls["failure"] = record["condition_key"] == "treatment" and record["seed"] == 11
        assert run(client, record["id"])["status"] == (
            "failed" if controls["failure"] else "complete"
        )
    controls["failure"] = False

    def claims(prompt, _rid):
        revision = next(iter(prompt["index"]["comparisons"]))
        return [
            {
                "kind": "calculation",
                "text": "The difference was +1 across two observed pairs.",
                "calculation_id": f"contrast:{revision}:treatment:contribution_rate",
                "value": 1,
                "scope": "observed_pairs",
                "pairs": 2,
            }
        ]

    controls["claims"] = claims
    final = finish(
        client,
        client.post(
            "/api/chats",
            json={
                "question": "Check both planned seed pairs, retaining failures.",
                "context": f"study:{sid}",
            },
        ),
    )
    assert final["status"] == "complete", final
    checked = final["output"]["support"]["claims"][0]
    assert checked["status"] == "contradicted" and checked["computed"] == 1
    calc = next(
        c for c in final["output"]["lens"]["calculations"] if c["id"] == checked["calculation_id"]
    )
    assert calc["coverage"] == {"pairs": 1, "planned_pairs": 2, "seed_clusters": 1}
    assert calc["sensitivity"]["bounds"] == [0, 0.5]
    assert len(calc["missing"]) == 1
    assert final["output"]["lens"]["coverage"]["planned_cells"] == 4
    assert final["output"]["lens"]["coverage"]["failed_cells"] == 1


def test_communication_lens_rejects_absent_exposure_and_declares_coverage(claim_client, design):
    client, controls, _ = claim_client
    _, rid = save(client, design)
    run(client, rid)
    controls["claims"] = lambda _prompt, rid: [
        {
            "kind": "calculation",
            "text": "A participant received a recorded message.",
            "calculation_id": f"run:{rid}:message_exposed_participants",
            "value": 1,
            "scope": "captured_run",
        }
    ]
    final = finish(
        client,
        client.post(
            "/api/chats",
            json={
                "question": "What communication was actually included?",
                "context": f"run:{rid}",
                "lens": "communication",
            },
        ),
    )
    assert final["status"] == "complete", final
    lens = final["output"]["lens"]
    assert lens["key"] == "communication" and lens["version"] == 1
    assert "exact_request_delivery" in lens["requirements"]
    coverage = lens["coverage"]["runs"][0]
    assert coverage["recorded_turns"] == 4 and coverage["missing_turns"] == []
    assert coverage["exposure_capture"] == "complete"
    assert coverage["message_opportunities"] == 0 and coverage["unknown_requests"] == 0
    assert coverage["truncation"]["run_continues"] is False
    assert "unavailable" in coverage["truncation"]["unrecorded_history"].casefold()
    result = final["output"]["support"]["claims"][0]
    assert result["status"] == "contradicted" and result["computed"] == 0


def test_analysis_acceptance_keeps_its_cutoff_when_a_step_commits_during_capture(
    claim_client, design, monkeypatch
):
    client, _, _ = claim_client
    sid, rid = save(client, design)
    assert run(client, rid, "step")["turn"] == 1
    first = client.get(f"/api/runs/{rid}").json()
    entered, release = Event(), Event()
    exposure = client.app.state.research.exposure

    def scheduled_exposure(run_id, *args, **kwargs):
        # Delay a real read, without replacing the Engine, storage or its result.
        if run_id == rid and not entered.is_set():
            entered.set()
            assert release.wait(10)
        return exposure(run_id, *args, **kwargs)

    monkeypatch.setattr(client.app.state.research, "exposure", scheduled_exposure)
    with ThreadPoolExecutor(max_workers=1) as executor:
        pending = executor.submit(
            client.post,
            "/api/chats",
            json={
                "question": "Inspect only the evidence accepted at this turn boundary.",
                "context": f"run:{rid}",
            },
        )
        try:
            assert entered.wait(5)
            assert run(client, rid, "step")["turn"] == 2
        finally:
            release.set()
        submitted = pending.result(timeout=10)

    final = finish(client, submitted)
    assert final["status"] == "complete", final
    assert final["cutoffs"] == {rid: 1}
    frozen = final["output"]["exposure"][rid]
    assert frozen["through_turn"] == 1
    assert frozen["membership"]["requests"] == [first["requests"][0]["id"]]
    assert frozen["membership"]["activations"] == [first["activations"][0]["id"]]
    indexed = final["output"]["evidence_index"]["runs"][0]
    assert indexed["through_turn"] == 1
    assert indexed["execution_usage"]["requests"] == 1
    assert final["output"]["lens"]["cutoffs"] == {rid: 1}
    current = client.get(f"/api/runs/{rid}").json()
    assert current["summary"]["turn"] == 2
    assert len(current["activations"]) == 2
    participant_requests = [r for r in current["requests"] if r["purpose"] == "decision"]
    assert len(participant_requests) == 2
    assert all(r["input_tokens"] == 100 and r["output_tokens"] == 50 for r in participant_requests)
    assert all(r["cost_usd"] == 0.000035 for r in participant_requests)
    exported = client.get(f"/api/studies/{sid}/export").json()
    saved = next(a for a in exported["analyses"] if a["id"] == final["id"])
    assert saved["output"]["exposure"][rid] == frozen


def test_export_stays_coherent_when_a_step_commits_during_capture(
    claim_client, design, monkeypatch
):
    client, _, _ = claim_client
    sid, rid = save(client, design)
    assert run(client, rid, "step")["turn"] == 1
    entered, release = Event(), Event()
    evidence = client.app.state.research.evidence

    def scheduled_evidence(run_id, number):
        # Delay the real reader after export has selected its recorded turns.
        if run_id == rid and number == 0 and not entered.is_set():
            entered.set()
            assert release.wait(10)
        return evidence(run_id, number)

    monkeypatch.setattr(client.app.state.research, "evidence", scheduled_evidence)
    with ThreadPoolExecutor(max_workers=1) as executor:
        pending = executor.submit(client.get, f"/api/studies/{sid}/export")
        try:
            assert entered.wait(5)
            assert run(client, rid, "step")["turn"] == 2
        finally:
            release.set()
        response = pending.result(timeout=10)

    assert response.status_code == 200, response.text
    exported = response.json()
    captured = next(row for row in exported["runs"] if row["record"]["summary"]["id"] == rid)
    record = captured["record"]
    cutoff = record["summary"]["turn"]
    assert cutoff in (1, 2)
    assert [row["number"] for row in captured["evidence"]] == list(range(cutoff + 1))
    assert record["state"] == captured["evidence"][-1]["checkpoint"]
    assert next(row for row in exported["study"]["runs"] if row["id"] == rid)["turn"] == cutoff
    assert len(record["turns"]) == cutoff
    assert len(record["activations"]) == cutoff
    assert len([row for row in exported["requests"] if row["run_id"] == rid]) == cutoff
    assert (
        next(row for row in exported["exposure"] if row["run_id"] == rid)["through_turn"] == cutoff
    )
    current = client.get(f"/api/runs/{rid}").json()
    assert current["summary"]["turn"] == 2
    assert current["summary"]["usage"] == {
        "requests": 2,
        "input_tokens": 200,
        "output_tokens": 100,
        "cost_usd": 0.00007,
        "partial": False,
    }
    assert client.post(f"/api/runs/{rid}/verify").json()["verified_turns"] == 2
    assert client.get(f"/api/runs/{rid}").json()["summary"]["usage"] == current["summary"]["usage"]
    fresh = client.get(f"/api/studies/{sid}/export").json()["runs"][0]
    assert fresh["record"]["summary"]["turn"] == 2
    assert [row["number"] for row in fresh["evidence"]] == [0, 1, 2]


def test_export_retains_pending_reservation_when_it_settles_during_capture(
    claim_client, design, monkeypatch
):
    client, controls, _ = claim_client
    sid, rid = save(client, design)
    assert run(client, rid, "step")["turn"] == 1
    controls.update(participant_gate=Event(), participant_entered=Event())
    assert client.post(f"/api/runs/{rid}/control", json={"action": "step"}).status_code == 200
    entered, release = Event(), Event()
    evidence = client.app.state.research.evidence

    def scheduled_evidence(run_id, number):
        if run_id == rid and number == 0 and not entered.is_set():
            entered.set()
            assert release.wait(10)
        return evidence(run_id, number)

    monkeypatch.setattr(client.app.state.research, "evidence", scheduled_evidence)
    try:
        assert controls["participant_entered"].wait(5)
        before = client.get(f"/api/runs/{rid}").json()
        assert before["summary"]["turn"] == 1
        assert before["summary"]["usage"]["requests"] == 2
        assert before["summary"]["usage"]["partial"] is True
        with ThreadPoolExecutor(max_workers=1) as executor:
            pending = executor.submit(client.get, f"/api/studies/{sid}/export")
            try:
                assert entered.wait(5)
                controls["participant_gate"].set()

                async def settled():
                    await client.app.state.engine.executions[rid].task

                client.portal.call(settled)
            finally:
                release.set()
            response = pending.result(timeout=10)
    finally:
        controls["participant_gate"].set()
        release.set()

    assert response.status_code == 200, response.text
    exported = response.json()
    captured = exported["runs"][0]
    assert captured["record"]["summary"] == before["summary"]
    assert captured["record"]["state"] == before["state"]
    assert captured["record"]["requests"] == before["requests"]
    assert [row["number"] for row in captured["evidence"]] == [0, 1]
    assert len(exported["requests"]) == 2
    assert [row["status"] for row in exported["requests"]].count("pending") == 1
    assert sum(round(row["cost_usd"] * 1_000_000) for row in exported["requests"]) == round(
        before["summary"]["usage"]["cost_usd"] * 1_000_000
    )
    current = client.get(f"/api/runs/{rid}").json()
    assert current["summary"]["turn"] == 2
    assert current["summary"]["usage"]["cost_usd"] == 0.00007
    assert current["summary"]["usage"]["partial"] is False


def test_analysis_capture_retains_an_inflight_input_at_its_current_turn(claim_client, design):
    client, controls, _ = claim_client
    sid, rid = save(client, design)
    assert run(client, rid, "step")["turn"] == 1
    controls.update(participant_gate=Event(), participant_entered=Event())
    response = client.post(f"/api/runs/{rid}/control", json={"action": "step"})
    assert response.status_code == 200, response.text
    try:
        assert controls["participant_entered"].wait(5)
        pending = client.get(f"/api/runs/{rid}").json()
        assert pending["summary"]["turn"] == 1
        participant_requests = [r for r in pending["requests"] if r["purpose"] == "decision"]
        assert len(participant_requests) == 2
        assert sorted(r["status"] for r in participant_requests) == ["complete", "pending"]
        final = finish(
            client,
            client.post(
                "/api/chats",
                json={
                    "question": "Retain current in-flight input evidence.",
                    "context": f"run:{rid}",
                },
            ),
        )
        assert final["status"] == "complete", final
        assert final["cutoffs"] == {rid: 1}
        frozen = final["output"]["exposure"][rid]
        assert frozen["through_turn"] == 1
        assert set(frozen["membership"]["requests"]) == {r["id"] for r in participant_requests}
        assert frozen["delivery"]["confirmed_requests"] == 1
        assert frozen["delivery"]["unknown_requests"] == 1
    finally:
        controls["participant_gate"].set()

        async def settled():
            await client.app.state.engine.executions[rid].task

        client.portal.call(settled)
    assert client.get(f"/api/runs/{rid}").json()["summary"]["turn"] == 2
    assert client.get(f"/api/analyses/{final['id']}").json() == final
    exported = client.get(f"/api/studies/{sid}/export").json()
    saved = next(a for a in exported["analyses"] if a["id"] == final["id"])
    assert saved["output"]["exposure"][rid] == frozen


def test_reanalysis_uses_frozen_inputs_after_resume_and_revision_without_participant_work(
    claim_client,
    design,
):
    client, controls, seen = claim_client
    sid, rid = save(client, design)
    assert run(client, rid, "step")["turn"] == 1
    controls.update(analysis_gate=Event(), analysis_entered=Event())
    submitted = client.post(
        "/api/chats",
        json={
            "question": "What evidence is available at this boundary?",
            "context": f"run:{rid}",
        },
    )
    assert submitted.status_code == 202
    assert controls["analysis_entered"].wait(5)
    frozen = client.get(f"/api/analyses/{submitted.json()['id']}").json()["output"]
    assert frozen["lens"]["cutoffs"] == {rid: 1}
    assert len(frozen["exposure"][rid]["membership"]["requests"]) == 1
    assert run(client, rid)["turn"] == 4
    revised = design.model_dump()
    revised["title"] = "Later immutable revision"
    assert client.post(f"/api/studies/{sid}/revisions", json={"design": revised}).status_code == 201
    controls["analysis_gate"].set()
    first = finish(client, submitted)
    controls.pop("analysis_gate")
    assert first["output"]["lens"] == frozen["lens"]
    assert first["output"]["exposure"] == frozen["exposure"]
    later = finish(
        client,
        client.post(
            "/api/chats",
            json={
                "question": "Later evidence at turn four must stay outside an older reanalysis.",
                "context": f"run:{rid}",
                "chat_id": first["chat_id"],
            },
        ),
    )
    assert later["cutoffs"] == {rid: 4}
    before = source(client.get(f"/api/studies/{sid}/export").json())
    second = finish(
        client,
        client.post(
            "/api/chats",
            json={
                "question": "Apply the communication lens to the same frozen evidence.",
                "context": f"run:{rid}",
                "chat_id": first["chat_id"],
                "source_analysis_id": first["id"],
                "lens": "communication",
            },
        ),
    )
    assert second["status"] == "complete", second
    assert second["id"] != first["id"] and second["cutoffs"] == {rid: 1}
    assert second["output"]["lens"]["key"] == "communication"
    assert second["output"]["lens"]["inputs_sha256"] == frozen["lens"]["inputs_sha256"]
    assert second["output"]["exposure"] == frozen["exposure"]
    assert second["output"]["comparisons"] == frozen["comparisons"]
    assert client.get(f"/api/analyses/{first['id']}").json() == first
    exported = client.get(f"/api/studies/{sid}/export").json()
    assert source(exported) == before
    assert all(item["question"] != later["question"] for item in seen[-1]["conversation"])
    for record in (first, later, second):
        requests = [r for r in exported["requests"] if r["analysis_id"] == record["id"]]
        assert len(requests) == record["usage"]["requests"] == 2
        assert all(r["status"] == "complete" and r["activation_id"] is None for r in requests)
    assert (
        client.post(
            "/api/chats",
            json={
                "question": "Cross-chat retrieval",
                "context": f"run:{rid}",
                "source_analysis_id": first["id"],
                "lens": "communication",
            },
        ).status_code
        == 422
    )


SEMANTIC_CASES = json.loads(
    (
        Path(__file__).resolve().parents[2] / "benchmarks/claim-support-development-cases.json"
    ).read_text()
)["cases"]


@pytest.mark.parametrize("case", SEMANTIC_CASES, ids=[c["id"] for c in SEMANTIC_CASES])
def test_independent_semantic_candidates_never_get_a_prose_validity_pass(
    claim_client, design, case
):
    client, controls, _ = claim_client
    sid, rid = save(client, design)
    run(client, rid)
    controls["answer"] = case["answer"]
    controls["claims"] = lambda _prompt, selected: (
        []
        if case["kind"] is None
        else [
            {
                "kind": case["kind"],
                "text": case["answer"],
                "value": case.get("value"),
                "calculation_id": f"run:{selected}:total_utility"
                if case["kind"] == "calculation"
                else None,
                "scope": "captured_run",
            }
        ]
    )
    before = source(client.get(f"/api/studies/{sid}/export").json())
    final = finish(
        client,
        client.post(
            "/api/chats",
            json={
                "question": "Assess this recorded account; preserve interpretation limits.",
                "context": f"run:{rid}",
            },
        ),
    )
    assert final["status"] == "complete", final
    support = final["output"]["support"]
    assert support["prose_status"] == "unassessed"
    assert support["status"] in {"needs_review", "contradicted"}
    assert [c["status"] for c in support["claims"]] == (
        [case["expected_check"]] if case["expected_check"] else []
    )
    assert source(client.get(f"/api/studies/{sid}/export").json()) == before
    if directory := os.getenv("JAS_T19_EVIDENCE"):
        path = Path(directory) / "independent-assessments.jsonl"
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("a") as handle:
            handle.write(
                json.dumps({"case": case, "assessment": support, "analysis_id": final["id"]}) + "\n"
            )


def test_false_reports_feasible_breaches_and_intent_remain_different_claims(claim_client, design):
    client, controls, _ = claim_client
    controls["breach"] = True
    _, rid = save(client, design)
    assert run(client, rid)["status"] == "complete"
    controls["claims"] = lambda _prompt, selected: (
        [
            {
                "kind": "calculation",
                "text": text,
                "calculation_id": f"run:{selected}:{key}",
                "value": value,
                "scope": "captured_run",
            }
            for text, key, value in [
                ("Four false factual reports", "false_reports", 4),
                ("Two feasible breaches", "feasible_commitment_breaches", 2),
                ("Utility was 42", "total_utility", 42),
            ]
        ]
        + [{"kind": "intent", "text": "The breaches prove intentional deception."}]
    )
    final = finish(
        client,
        client.post(
            "/api/chats",
            json={
                "question": "Separate falsehood, feasible breach and intent.",
                "context": f"run:{rid}",
                "lens": "communication",
            },
        ),
    )
    assert final["status"] == "complete", final
    assert [r["status"] for r in final["output"]["support"]["claims"]] == [
        "checked",
        "checked",
        "checked",
        "unsupported",
    ]
    assert final["output"]["support"]["prose_status"] == "unassessed"


def test_missing_historical_input_capture_is_unavailable_not_zero(claim_client, design):
    from agent_sim.db import ParticipantActivation
    from sqlalchemy import select

    client, controls, _ = claim_client
    _, rid = save(client, design)
    run(client, rid)
    # Simulate a known synthetic historical fixture, not a mutation by the lens.
    with client.app.state.db.session.begin() as session:
        for activation in session.scalars(select(ParticipantActivation)):
            activation.identity = {k: v for k, v in activation.identity.items() if k != "exposure"}
    controls["claims"] = lambda _prompt, selected: [
        {
            "kind": "calculation",
            "text": "Zero participants received a message.",
            "calculation_id": f"run:{selected}:message_exposed_participants",
            "value": 0,
        }
    ]
    final = finish(
        client,
        client.post(
            "/api/chats",
            json={
                "question": "Can historical message delivery be assessed?",
                "context": f"run:{rid}",
            },
        ),
    )
    assert final["status"] == "complete", final
    assert final["output"]["support"]["claims"][0]["status"] == "unavailable"
    assert final["output"]["lens"]["coverage"]["runs"][0]["exposure_capture"] == "unavailable"


@pytest.mark.parametrize(
    "scope,foreign,expected",
    [("planned_sample", False, "unsupported"), ("captured_run", True, "unavailable")],
)
def test_correct_number_cannot_authorize_another_scope_or_unselected_source(
    claim_client, design, scope, foreign, expected
):
    client, controls, _ = claim_client
    _, rid = save(client, design)
    run(client, rid)
    _, other = save(client, design)
    run(client, other)
    controls["claims"] = lambda _prompt, selected: [
        {
            "kind": "calculation",
            "text": "Claiming a different evidence scope with the same number.",
            "calculation_id": f"run:{other if foreign else selected}:total_utility",
            "value": 44,
            "scope": scope,
        }
    ]
    final = finish(
        client,
        client.post(
            "/api/chats",
            json={"question": "Check the selected evidence only.", "context": f"run:{rid}"},
        ),
    )
    assert final["status"] == "complete", final
    assert final["output"]["support"]["claims"][0]["status"] == expected
    assert final["output"]["support"]["prose_status"] == "unassessed"
    assert {r["run_id"] for r in final["output"]["lens"]["facts"]} == {rid}


def test_inflight_receipt_stays_unknown_in_frozen_lens_after_settlement(claim_client, design):
    client, controls, _ = claim_client
    sid, rid = save(client, design)
    assert run(client, rid, "step")["turn"] == 1
    controls.update(participant_gate=Event(), participant_entered=Event())
    assert client.post(f"/api/runs/{rid}/control", json={"action": "step"}).status_code == 200
    assert controls["participant_entered"].wait(5)
    submitted = client.post(
        "/api/chats",
        json={"question": "Retain this in-flight evidence boundary.", "context": f"run:{rid}"},
    )
    assert submitted.status_code == 202, submitted.text
    captured = client.get(f"/api/analyses/{submitted.json()['id']}").json()["output"]
    assert captured["lens"]["cutoffs"] == {rid: 1}
    assert captured["lens"]["coverage"]["runs"][0]["unknown_requests"] == 1
    controls.pop("participant_gate").set()

    async def settled():
        await client.app.state.engine.executions[rid].task

    client.portal.call(settled)
    assert run(client, rid)["turn"] == 4
    first = finish(client, submitted)
    assert first["output"]["lens"] == captured["lens"]
    assert first["output"]["exposure"] == captured["exposure"]
    before = source(client.get(f"/api/studies/{sid}/export").json())
    second = finish(
        client,
        client.post(
            "/api/chats",
            json={
                "question": "Reinspect the same unknown boundary.",
                "context": f"run:{rid}",
                "chat_id": first["chat_id"],
                "source_analysis_id": first["id"],
                "lens": "communication",
            },
        ),
    )
    assert second["status"] == "complete", second
    assert second["output"]["lens"]["coverage"]["runs"][0]["unknown_requests"] == 1
    assert second["output"]["exposure"] == captured["exposure"]
    assert source(client.get(f"/api/studies/{sid}/export").json()) == before
    assert first["usage"]["requests"] == second["usage"]["requests"] == 2


@pytest.mark.parametrize("memory", ["episodic", "none", "missing_historical"])
def test_lens_reports_recorded_memory_windows_and_missing_history(claim_client, design, memory):
    client, _, _ = claim_client
    design.conditions[0].parameters.memory = "none" if memory == "none" else "episodic"
    _, rid = save(client, design)
    run(client, rid)
    if memory == "missing_historical":
        from agent_sim.db import Turn
        from sqlalchemy import select

        # Known synthetic historical fixture only; the analysis cannot fill this gap.
        with client.app.state.db.session.begin() as session:
            for turn in session.scalars(select(Turn).where(Turn.run_id == rid)):
                turn.observation = {
                    k: v
                    for k, v in turn.observation.items()
                    if k not in {"public_history", "your_experiences"}
                }
    final = finish(
        client,
        client.post(
            "/api/chats",
            json={"question": "Which memory windows were recorded?", "context": f"run:{rid}"},
        ),
    )
    assert final["status"] == "complete", final
    windows = final["output"]["lens"]["coverage"]["runs"][0]["truncation"]["observation_windows"]
    assert [w["history_records"] for w in windows] == {
        "episodic": [0, 0, 1, 1],
        "none": [0, 0, 0, 0],
        "missing_historical": [None, None, None, None],
    }[memory]
    assert [w["experience_records"] for w in windows] == {
        "episodic": [0, 0, 2, 2],
        "none": [0, 0, 0, 0],
        "missing_historical": [None, None, None, None],
    }[memory]


def test_accepted_artifact_world_lens_retains_versions_without_financial_proxy(claim_client):
    client, controls, _ = claim_client
    value = next(
        t["design"]
        for t in client.get("/api/catalog").json()["templates"]
        if t["id"] == "artifact_workspace"
    )
    rules = value["conditions"][0]["parameters"]["artifacts"]
    rules["write_limit"] = 2
    next(obj for obj in rules["objects"] if obj["key"] == "measurement")["content"] = {
        "reading": 31
    }
    controls["artifact_actions"] = iter(
        [
            {"kind": "read_artifact", "artifact": "measurement", "version": 1},
            {
                "kind": "write_artifact",
                "artifact": "report",
                "expected_version": 1,
                "content": {"reading": 31},
                "sources": [{"artifact": "measurement", "version": 1}],
            },
            {"kind": "check_artifacts"},
            {"kind": "submit_artifacts"},
        ]
    )
    saved = client.post("/api/studies", json={"design": value})
    assert saved.status_code == 201, saved.text
    sid = saved.json()["id"]
    rid = client.get(f"/api/studies/{sid}").json()["runs"][0]["id"]
    assert run(client, rid)["status"] == "complete"
    controls["claims"] = lambda _prompt, selected: [
        {
            "kind": "calculation",
            "text": label,
            "calculation_id": f"run:{selected}:{metric}",
            "value": number,
            "scope": "captured_run",
        }
        for label, metric, number in [
            ("The utility total was zero", "total_utility", 0),
            ("One write was retained", "artifact_writes", 1),
            ("Recorded submission succeeded", "artifact_success", 1),
        ]
    ]
    before = source(client.get(f"/api/studies/{sid}/export").json())
    final = finish(
        client,
        client.post(
            "/api/chats",
            json={
                "question": (
                    "Describe the recorded artifact work and assess the claimed financial zero."
                ),
                "context": f"run:{rid}",
            },
        ),
    )
    assert final["status"] == "complete", final
    assert [c["status"] for c in final["output"]["support"]["claims"]] == [
        "unavailable",
        "checked",
        "checked",
    ]
    fact = final["output"]["lens"]["facts"][0]
    assert fact["balances"] is None
    state = fact["artifact_state"]
    assert state["writes_remaining"] == 1 and state["outcome"]["status"] == "success"
    assert state["artifacts"]["report"]["versions"][-1]["content"] == {"reading": 31}
    assert len(state["artifacts"]["report"]["versions"]) == 2
    assert state["artifacts"]["report"]["versions"][-1]["sources"] == [
        {"artifact": "measurement", "version": 1}
    ]
    assert len(state["artifact_history"]) == 4
    account = final["output"]["lens"]["account"][0]["text"]
    assert "retained writes 1" in account and "utility" not in account
    assert source(client.get(f"/api/studies/{sid}/export").json()) == before
    second = finish(
        client,
        client.post(
            "/api/chats",
            json={
                "question": "Reanalyze this same artifact evidence.",
                "context": f"run:{rid}",
                "chat_id": final["chat_id"],
                "source_analysis_id": final["id"],
                "lens": "communication",
            },
        ),
    )
    assert second["output"]["lens"]["facts"] == final["output"]["lens"]["facts"]
    assert source(client.get(f"/api/studies/{sid}/export").json()) == before
    assert final["usage"]["requests"] == second["usage"]["requests"] == 2


def test_initial_artifact_lens_retains_checkpoint_and_unfinished_outcome(claim_client):
    client, controls, _ = claim_client
    value = next(
        t["design"]
        for t in client.get("/api/catalog").json()["templates"]
        if t["id"] == "artifact_workspace"
    )
    sid = client.post("/api/studies", json={"design": value}).json()["id"]
    rid = client.get(f"/api/studies/{sid}").json()["runs"][0]["id"]
    initial = client.get(f"/api/runs/{rid}/turns/0").json()
    controls.update(evidence_start=0, citation_turn=0)
    controls["claims"] = lambda _prompt, selected: [
        {
            "kind": "calculation",
            "text": text,
            "calculation_id": f"run:{selected}:{metric}",
            "value": number,
            "scope": "captured_run",
        }
        for text, metric, number in (
            ("No retained writes yet", "artifact_writes", 0),
            ("Claimed terminal failure", "artifact_success", 0),
        )
    ]
    before = source(client.get(f"/api/studies/{sid}/export").json())
    final = finish(
        client,
        client.post(
            "/api/chats",
            json={"question": "Inspect the unfinished artifact run.", "context": f"run:{rid}"},
        ),
    )
    assert final["status"] == "complete", final
    fact = final["output"]["lens"]["facts"][0]
    assert fact["state_hash"] is initial["state_hash"] is None
    assert fact["through_turn"] == 0 and fact["turns"] == []
    state = fact["artifact_state"]
    assert state["outcome"] is None and state["artifact_history"] == []
    assert state["writes_remaining"] == 3
    assert {
        key: [v["content"] for v in obj["versions"]] for key, obj in state["artifacts"].items()
    } == {
        "measurement": [{"reading": 17}],
        "report": [{"reading": 0}],
        "sealed": [{"reading": 91}],
    }
    assert [c["status"] for c in final["output"]["support"]["claims"]] == [
        "checked",
        "unavailable",
    ]
    assert source(client.get(f"/api/studies/{sid}/export").json()) == before
    controls["artifact_actions"] = iter([{"kind": "stop"}])
    assert run(client, rid)["status"] == "complete"
    settled = source(client.get(f"/api/studies/{sid}/export").json())
    assert len(settled["participant_requests"]) == 1
    second = finish(
        client,
        client.post(
            "/api/chats",
            json={
                "question": "Reanalyze the original unfinished evidence.",
                "context": f"run:{rid}",
                "chat_id": final["chat_id"],
                "source_analysis_id": final["id"],
                "lens": "communication",
            },
        ),
    )
    assert second["status"] == "complete", second
    assert second["output"]["lens"]["facts"] == final["output"]["lens"]["facts"]
    assert second["output"]["lens"]["inputs_sha256"] == final["output"]["lens"]["inputs_sha256"]
    assert second["cutoffs"] == {rid: 0}
    assert source(client.get(f"/api/studies/{sid}/export").json()) == settled
    assert final["usage"]["requests"] == second["usage"]["requests"] == 2


def test_analysis_requests_are_identified_apart_from_non_model_participant_effort(
    claim_client, design
):
    client, controls, seen = claim_client
    from agent_sim.domain import ScriptedHarness

    design.conditions[0].harness = ScriptedHarness(policy="commons_half_v1")
    sid, rid = save(client, design)
    assert run(client, rid)["status"] == "complete"
    assert seen == []
    before = client.get(f"/api/studies/{sid}/export").json()
    effort = before["runs"][0]["record"]["effort"]
    controls.update(answer="The captured total is 50; private intent remains unknown.", value=50)
    first = finish(
        client,
        client.post(
            "/api/chats",
            json={"question": "Inspect the scripted control.", "context": f"run:{rid}"},
        ),
    )
    assert first["status"] == "complete", first
    second = finish(
        client,
        client.post(
            "/api/chats",
            json={
                "question": "Reinspect only the same frozen evidence.",
                "context": f"run:{rid}",
                "chat_id": first["chat_id"],
                "source_analysis_id": first["id"],
                "lens": "communication",
            },
        ),
    )
    assert second["status"] == "complete", second
    after = client.get(f"/api/studies/{sid}/export").json()
    record = client.get(f"/api/runs/{rid}").json()
    assert source(before) == source(after)
    assert record["effort"] == effort
    assert record["effort"]["usage"]["requests"] == 0
    assert record["effort"]["scripted_decisions"] == 4
    assert record["summary"]["model"] is None
    assert record["summary"]["models"] == []
    assert record["summary"]["usage"]["requests"] == 4
    assert len(record["requests"]) == 4
    assert {call["purpose"] for call in record["requests"]} == {"analysis"}
    assert {call["analysis_id"] for call in record["requests"]} == {first["id"], second["id"]}
    assert {call["model"] for call in record["requests"]} == {"openai:gpt-6.1-sol"}
    for call in record["requests"]:
        assert call["activation_id"] is None
        detail = client.get(f"/api/requests/{call['id']}").json()
        for field in ("purpose", "analysis_id", "model"):
            assert detail[field] == call[field]
    for analysis in (first, second):
        calls = [call for call in after["requests"] if call["analysis_id"] == analysis["id"]]
        assert len(calls) == analysis["usage"]["requests"] == 2
        assert all(call["status"] == "complete" for call in calls)
        assert analysis["output"]["support"]["prose_status"] == "unassessed"
    assert client.post(f"/api/runs/{rid}/verify").json()["verified_turns"] == 4
