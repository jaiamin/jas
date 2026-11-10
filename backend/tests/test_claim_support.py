"""Fresh T19 DEVELOPMENT examples; expected outcomes predeclared in the report.

Real HTTP/World/storage/accounting; only the external provider is deterministic.
Matching values cannot certify generated wording or semantic reliability.
"""

import gzip
import json
import os
from pathlib import Path
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
            rid = prompt["index"]["runs"][0]["run_id"]
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
            payload = {
                "action": {"kind": "contribute", "amount": controls["amount"], "target": "",
                           "message": "", "report": None, "promise": None},
                "memory": "", "rationale": "Scripted development choice.", "forecast": None,
            }
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
    client, controls, _ = claim_client
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
