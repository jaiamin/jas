"""Fresh T19 DEVELOPMENT examples; expected outcomes predeclared in the report.

Real HTTP/World/storage/accounting; only the external provider is deterministic.
Matching values cannot certify generated wording or semantic reliability.
"""

import asyncio
import gzip
import json
import os
from pathlib import Path
from threading import Event
from uuid import uuid4

import pytest
from agent_sim.api import create_app
from fastapi.testclient import TestClient
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.models.function import DeltaToolCall, FunctionModel
from pydantic_ai.usage import RequestUsage


@pytest.fixture
def claim_client(tmp_path, monkeypatch, request):
    controls = {"amount": 2, "answer": "The recorded total utility is 440.", "value": 440}
    seen, operations = [], []

    async def respond(messages, info):
        prompt = json.loads(messages[-1].parts[0].content)
        seen.append(prompt)
        if "index" in prompt:
            if gate := controls.get("analysis_gate"):
                controls["analysis_entered"].set()
                assert await asyncio.to_thread(gate.wait, 10)
            indexed = prompt["index"]["runs"]
            rid = next((r["run_id"] for r in indexed if r["through_turn"] > 0), indexed[0]["run_id"])
            if not prompt["evidence"]:
                payload = {
                    "requests": [{"kind": "history", "run_id": rid, "start": 1, "count": 20}],
                    "answer": None,
                }
            else:
                payload = {"requests": [], "answer": {
                    "answer": controls["answer"],
                    "citations": [{"run_id": rid, "turn": 1}],
                    "caveats": ["One fixed seed does not establish independent support."],
                    "claims": controls["claims"](prompt, rid) if "claims" in controls else [{
                        "kind": "calculation", "text": controls["answer"],
                        "calculation_id": f"run:{rid}:total_utility",
                        "value": controls["value"], "scope": "captured_run",
                    }],
                }}
        else:
            if controls.get("failure"):
                raise TimeoutError("Controlled failed DEVELOPMENT participant request")
            payload = {
                "action": {"kind": "contribute", "amount": controls["amount"], "target": "",
                           "message": "", "report": None, "promise": None},
                "memory": "", "rationale": "Scripted development choice.", "forecast": None,
            }
            if controls.get("breach"):
                payload["action"].update(
                    amount=2 if prompt["round"] == 1 else 0,
                    promise=3 if prompt["round"] == 1 else None,
                    report=(prompt["your_private_signal"] + 1) % 101,
                )
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, payload)],
            usage=RequestUsage(input_tokens=100, output_tokens=50), model_name="t19-development-v1",
        )

    async def stream(messages, info):
        response = await respond(messages, info)
        part = response.parts[0]
        assert isinstance(part, ToolCallPart)
        yield {0: DeltaToolCall(name=part.tool_name, json_args=json.dumps(part.args))}

    app = create_app(f"sqlite:///{tmp_path}/claims.sqlite3", static_dir=tmp_path / "static")
    monkeypatch.setattr(app.state.models, "model", lambda _: FunctionModel(
        function=respond, stream_function=stream,
    ))
    with TestClient(app, base_url="http://localhost") as client:
        transport = client.request

        def recorded(method, url, **kwargs):
            response = transport(method, url, **kwargs)
            operations.append({"method": method, "url": str(url), "body": kwargs.get("json"),
                               "status": response.status_code, "response": response.json()})
            return response

        monkeypatch.setattr(client, "request", recorded)
        try:
            yield client, controls, seen
        finally:
            if directory := os.getenv("JAS_T19_EVIDENCE"):
                output = Path(directory) / f"{request.node.name}-{uuid4().hex}"
                output.mkdir(parents=True)
                exports = [client.get(f"/api/studies/{s['id']}/export").json()
                           for s in client.get("/api/studies").json()]
                for name, value in {"http": operations, "provider": seen, "exports": exports}.items():
                    with gzip.open(output / f"{name}.json.gz", "wt") as handle:
                        json.dump(value, handle, indent=2)
                (output / "identity.json").write_text(json.dumps({
                    "case": request.node.name, "source": os.getenv("JAS_T19_SOURCE"),
                    "head": os.getenv("JAS_T19_SOURCE_HEAD"), "paid_requests": 0,
                    "expected": "docs/research/T19_CLAIM_SUPPORT.md",
                }, indent=2))


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
    return {"evidence": [r["evidence"] for r in exported["runs"]],
            "revisions": exported["revisions"], "activations": exported["activations"],
            "participant_requests": [r for r in exported["requests"] if r["analysis_id"] is None]}


def test_inspected_citation_cannot_validate_invented_total(claim_client, design):
    client, _, _ = claim_client
    sid, rid = save(client, design)
    assert run(client, rid)["status"] == "complete"
    before = source(client.get(f"/api/studies/{sid}/export").json())
    final = finish(client, client.post("/api/chats", json={
        "question": "Describe the recorded utility and assess its support.", "context": f"run:{rid}",
    }))
    assert final["status"] == "complete", final
    support = final["output"]["support"]
    assert support["version"] == 1
    assert support["claims"][0]["status"] == "contradicted"
    assert support["claims"][0]["computed"] == 44
    assert support["prose_status"] == "unassessed"
    calculation = next(c for c in final["output"]["lens"]["calculations"]
                       if c["id"] == f"run:{rid}:total_utility")
    assert calculation["inputs"]["balances"] == {"alex": 22, "morgan": 22}
    assert calculation["value"] == 44 and calculation["scope"] == "captured_run"
    assert source(client.get(f"/api/studies/{sid}/export").json()) == before
    assert final["usage"]["requests"] == 2


@pytest.mark.parametrize("asserted,expected", [(-1, "contradicted"), (1, "checked")])
def test_condition_contrast_is_recomputed_in_declared_direction(
    claim_client, design, asserted, expected,
):
    client, controls, seen = claim_client
    value = design.model_dump()
    value.update(rounds=1, seeds=[7], profiles=value["profiles"][:2])
    first = value["conditions"][0]
    first["parameters"].update(endowment=10, multiplier=1.5)
    value["conditions"].append({**first, "key": "treatment", "name": "Treatment"})
    sid = client.post("/api/studies", json={"design": value}).json()["id"]
    study = client.get(f"/api/studies/{sid}").json()
    for record in study["runs"]:
        controls["amount"] = 10 if record["condition_key"] == "treatment" else 0
        assert run(client, record["id"])["status"] == "complete"

    def claims(prompt, _rid):
        revision = next(iter(prompt["index"]["comparisons"]))
        return [{"kind": "calculation", "text": "Treatment minus baseline contribution rate.",
                 "calculation_id": f"contrast:{revision}:treatment:contribution_rate",
                 "value": asserted, "scope": "observed_pairs"}]

    controls["claims"] = claims
    final = finish(client, client.post("/api/chats", json={
        "question": "What was treatment minus baseline?", "context": f"study:{sid}",
    }))
    assert final["status"] == "complete", final
    result = final["output"]["support"]["claims"][0]
    assert result["status"] == expected and result["computed"] == 1
    calculation = next(c for c in final["output"]["lens"]["calculations"]
                       if c["id"] == result["calculation_id"])
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
        controls["amount"] = 0 if record["condition_key"] == first["key"] and record["seed"] == 7 else 10
        controls["failure"] = record["condition_key"] == "treatment" and record["seed"] == 11
        assert run(client, record["id"])["status"] == ("failed" if controls["failure"] else "complete")
    controls["failure"] = False

    def claims(prompt, _rid):
        revision = next(iter(prompt["index"]["comparisons"]))
        return [{"kind": "calculation", "text": "The difference was +1 across two observed pairs.",
                 "calculation_id": f"contrast:{revision}:treatment:contribution_rate",
                 "value": 1, "scope": "observed_pairs", "pairs": 2}]

    controls["claims"] = claims
    final = finish(client, client.post("/api/chats", json={
        "question": "Check both planned seed pairs, retaining failures.", "context": f"study:{sid}",
    }))
    assert final["status"] == "complete", final
    checked = final["output"]["support"]["claims"][0]
    assert checked["status"] == "contradicted" and checked["computed"] == 1
    calc = next(c for c in final["output"]["lens"]["calculations"]
                if c["id"] == checked["calculation_id"])
    assert calc["coverage"] == {"pairs": 1, "planned_pairs": 2, "seed_clusters": 1}
    assert calc["sensitivity"]["bounds"] == [0, 0.5]
    assert len(calc["missing"]) == 1
    assert final["output"]["lens"]["coverage"]["planned_cells"] == 4
    assert final["output"]["lens"]["coverage"]["failed_cells"] == 1


def test_communication_lens_rejects_absent_exposure_and_declares_coverage(claim_client, design):
    client, controls, _ = claim_client
    _, rid = save(client, design)
    run(client, rid)
    controls["claims"] = lambda _prompt, rid: [{
        "kind": "calculation", "text": "A participant received a recorded message.",
        "calculation_id": f"run:{rid}:message_exposed_participants", "value": 1,
        "scope": "captured_run",
    }]
    final = finish(client, client.post("/api/chats", json={
        "question": "What communication was actually included?", "context": f"run:{rid}",
        "lens": "communication",
    }))
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


def test_reanalysis_uses_frozen_inputs_after_resume_and_revision_without_participant_work(
    claim_client, design,
):
    client, controls, seen = claim_client
    sid, rid = save(client, design)
    assert run(client, rid, "step")["turn"] == 1
    controls.update(analysis_gate=Event(), analysis_entered=Event())
    submitted = client.post("/api/chats", json={
        "question": "What evidence is available at this boundary?", "context": f"run:{rid}",
    })
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
    later = finish(client, client.post("/api/chats", json={
        "question": "Later evidence at turn four must stay outside an older reanalysis.",
        "context": f"run:{rid}", "chat_id": first["chat_id"],
    }))
    assert later["cutoffs"] == {rid: 4}
    before = source(client.get(f"/api/studies/{sid}/export").json())
    second = finish(client, client.post("/api/chats", json={
        "question": "Apply the communication lens to the same frozen evidence.",
        "context": f"run:{rid}", "chat_id": first["chat_id"],
        "source_analysis_id": first["id"], "lens": "communication",
    }))
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
    assert client.post("/api/chats", json={
        "question": "Cross-chat retrieval", "context": f"run:{rid}",
        "source_analysis_id": first["id"], "lens": "communication",
    }).status_code == 422


SEMANTIC_CASES = json.loads((Path(__file__).resolve().parents[2]
    / "benchmarks/claim-support-development-cases.json").read_text())["cases"]


@pytest.mark.parametrize("case", SEMANTIC_CASES, ids=[c["id"] for c in SEMANTIC_CASES])
def test_independent_semantic_candidates_never_get_a_prose_validity_pass(claim_client, design, case):
    client, controls, _ = claim_client
    sid, rid = save(client, design)
    run(client, rid)
    controls["answer"] = case["answer"]
    controls["claims"] = lambda _prompt, selected: [] if case["kind"] is None else [{
        "kind": case["kind"], "text": case["answer"], "value": case.get("value"),
        "calculation_id": f"run:{selected}:total_utility" if case["kind"] == "calculation" else None,
        "scope": "captured_run",
    }]
    before = source(client.get(f"/api/studies/{sid}/export").json())
    final = finish(client, client.post("/api/chats", json={
        "question": "Assess this recorded account; preserve interpretation limits.",
        "context": f"run:{rid}",
    }))
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
            handle.write(json.dumps({"case": case, "assessment": support,
                                    "analysis_id": final["id"]}) + "\n")


def test_false_reports_feasible_breaches_and_intent_remain_different_claims(claim_client, design):
    client, controls, _ = claim_client
    controls["breach"] = True
    _, rid = save(client, design)
    assert run(client, rid)["status"] == "complete"
    controls["claims"] = lambda _prompt, selected: [
        {"kind": "calculation", "text": text, "calculation_id": f"run:{selected}:{key}",
         "value": value, "scope": "captured_run"}
        for text, key, value in [("Four false factual reports", "false_reports", 4),
                                  ("Two feasible breaches", "feasible_commitment_breaches", 2),
                                  ("Utility was 42", "total_utility", 42)]
    ] + [{"kind": "intent", "text": "The breaches prove intentional deception."}]
    final = finish(client, client.post("/api/chats", json={
        "question": "Separate falsehood, feasible breach and intent.", "context": f"run:{rid}",
        "lens": "communication",
    }))
    assert final["status"] == "complete", final
    assert [r["status"] for r in final["output"]["support"]["claims"]] == [
        "checked", "checked", "checked", "unsupported",
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
    controls["claims"] = lambda _prompt, selected: [{
        "kind": "calculation", "text": "Zero participants received a message.",
        "calculation_id": f"run:{selected}:message_exposed_participants", "value": 0,
    }]
    final = finish(client, client.post("/api/chats", json={
        "question": "Can historical message delivery be assessed?", "context": f"run:{rid}",
    }))
    assert final["status"] == "complete", final
    assert final["output"]["support"]["claims"][0]["status"] == "unavailable"
    assert final["output"]["lens"]["coverage"]["runs"][0]["exposure_capture"] == "unavailable"
