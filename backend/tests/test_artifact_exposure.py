"""Artifact content delivery crosses the public workflow and recorded request seam."""

import json
import time

import pytest
from agent_sim.api import create_app
from fastapi.testclient import TestClient
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.models.function import FunctionModel
from pydantic_ai.usage import RequestUsage


def artifact_protocol(*, harness="tool_using", compact=False, memory="episodic"):
    content = {"temperature": 43}
    if compact:
        content.update({f"detail_{i}": "x" * 900 for i in range(5)})
    return {
        "title": "Independent artifact delivery witness",
        "question": "Which evidence content reaches the bounded participant request?",
        "environment": "artifact_workspace",
        "profiles": [
            {"key": "rhea", "name": "Rhea", "role": "Administrator", "goal": "Inspect or stop."}
        ],
        "seeds": [229],
        "rounds": 3,
        "conditions": [
            {
                "key": "audit",
                "name": "Audit",
                "harness": (
                    {
                        "kind": "tool_using",
                        "tools": ["read_artifact"],
                        "max_requests": 2,
                        "max_tool_operations": 1,
                        "max_context_chars": 4000,
                    }
                    if harness == "tool_using"
                    else {"kind": "direct_action"}
                ),
                "parameters": {
                    "memory": memory,
                    "artifacts": {
                        "write_limit": 1,
                        "objects": [
                            {
                                "key": "thermometer",
                                "name": "Thermometer",
                                "readers": ["rhea"],
                                "content": content,
                            },
                            {
                                "key": "worksheet",
                                "name": "Worksheet",
                                "owner": "rhea",
                                "content": {"temperature": 0},
                            },
                        ],
                        "requirements": [
                            {
                                "artifact": "worksheet",
                                "field": "temperature",
                                "source": "thermometer",
                                "source_field": "temperature",
                            }
                        ],
                    },
                },
            }
        ],
        "measures": ["artifact_success"],
    }


def decision(action):
    return {"action": action, "rationale": "Scripted witness.", "memory": "", "forecast": None}


def settle(client, rid):
    assert client.post(f"/api/runs/{rid}/control", json={"action": "start"}).status_code == 200
    deadline = time.monotonic() + 8
    while time.monotonic() < deadline:
        run = client.get(f"/api/runs/{rid}").json()
        if run["summary"]["status"] not in {"queued", "running", "pausing"}:
            return run
        time.sleep(0.005)
    pytest.fail("Witness did not settle")


@pytest.mark.parametrize("compact,unknown", [(False, False), (True, False), (False, True)])
def test_artifact_tool_exposure_requires_actual_bounded_content_and_delivery(
    tmp_path, monkeypatch, compact, unknown
):
    prompts = []

    async def respond(messages, info):
        payload = json.loads(messages[-1].parts[0].content)
        prompts.append(payload)
        if len(prompts) == 2 and unknown:
            raise TimeoutError("Independent missing delivery receipt")
        read = not payload["operations"]
        output = {
            "operation": "read_artifact" if read else "decide",
            "read": {"kind": "read_artifact", "artifact": "thermometer", "version": 1}
            if read
            else None,
            "decision": None if read else decision({"kind": "stop"}),
        }
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, output)],
            usage=RequestUsage(input_tokens=71, output_tokens=29),
        )

    app = create_app(f"sqlite:///{tmp_path}/tool.sqlite3", static_dir=tmp_path / "static")
    provider = FunctionModel(function=respond)
    monkeypatch.setattr(app.state.models, "model", lambda _: provider)
    with TestClient(app, base_url="http://localhost") as client:
        created = client.post("/api/studies", json={"design": artifact_protocol(compact=compact)})
        assert created.status_code == 201, created.text
        sid = created.json()["id"]
        rid = client.get(f"/api/studies/{sid}").json()["runs"][0]["id"]
        run = settle(client, rid)
        assert len(prompts) == 2
        operation = run["activations"][0]["operations"][0]
        assert operation["kind"] == "read_artifact"
        assert operation["result"]["content"]["temperature"] == 43
        exposure = client.get(f"/api/runs/{rid}/exposure").json()
        rows = [r for r in exposure["opportunities"] if r["kind"] == "read_artifact"]
        assert len(rows) == 1, "A real pure read needs its own source-linked opportunity"
        expected = None if unknown else not compact
        assert rows[0]["included"] is expected
        assert len(rows[0]["inputs"]) == (0 if compact else 1)
        if not compact:
            receipt = rows[0]["inputs"][0]
            assert receipt["delivery"] == ("unknown" if unknown else "confirmed")
            raw = client.get(receipt["source"]["href"]).json()
            assert "43" in raw["request"]["prompt"]
        else:
            assert "receipt" in prompts[-1]["operations"][0]
        usage = client.get("/api/settings").json()["usage"]
        assert client.post(f"/api/runs/{rid}/verify").json()["model_requests"] == 0
        assert client.get("/api/settings").json()["usage"] == usage
        (tmp_path / "evidence.json").write_text(
            json.dumps(
                {
                    "run": run,
                    "prompts": prompts,
                    "exposure": exposure,
                    "export": client.get(f"/api/studies/{sid}/export").json(),
                }
            )
        )


@pytest.mark.parametrize("memory", ["none", "episodic"])
def test_direct_artifact_read_content_is_bound_to_the_next_actual_request(
    tmp_path, monkeypatch, memory
):
    actions = iter(
        [{"kind": "read_artifact", "artifact": "thermometer", "version": 1}, {"kind": "stop"}]
    )

    async def respond(_messages, info):
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, decision(next(actions)))],
            usage=RequestUsage(input_tokens=71, output_tokens=29),
        )

    app = create_app(f"sqlite:///{tmp_path}/direct.sqlite3", static_dir=tmp_path / "static")
    provider = FunctionModel(function=respond)
    monkeypatch.setattr(app.state.models, "model", lambda _: provider)
    with TestClient(app, base_url="http://localhost") as client:
        created = client.post(
            "/api/studies",
            json={"design": artifact_protocol(harness="direct_action", memory=memory)},
        )
        assert created.status_code == 201, created.text
        rid = client.get(f"/api/studies/{created.json()['id']}").json()["runs"][0]["id"]
        run = settle(client, rid)
        assert run["summary"]["turn"] == 2
        exposure = client.get(f"/api/runs/{rid}/exposure").json()
        row = next(r for r in exposure["opportunities"] if r["kind"] == "read_artifact")
        assert row["included"] is True, (
            "Last read content was actually delivered even without memory"
        )
        assert any("last_result" in i["source"]["pointer"] for i in row["inputs"])


@pytest.mark.parametrize("corruption", ["result", "request"])
def test_replay_checks_rejected_artifact_read_receipts(tmp_path, monkeypatch, corruption):
    from agent_sim.db import ParticipantOperation
    from sqlalchemy import select

    async def respond(_messages, info):
        return ModelResponse(
            parts=[
                ToolCallPart(
                    info.output_tools[0].name,
                    {
                        "operation": "read_artifact",
                        "read": {"kind": "read_artifact", "artifact": "unavailable", "version": 1},
                        "decision": None,
                    },
                )
            ],
            usage=RequestUsage(input_tokens=71, output_tokens=29),
        )

    app = create_app(f"sqlite:///{tmp_path}/denied.sqlite3", static_dir=tmp_path / "static")
    provider = FunctionModel(function=respond)
    monkeypatch.setattr(app.state.models, "model", lambda _: provider)
    with TestClient(app, base_url="http://localhost") as client:
        created = client.post("/api/studies", json={"design": artifact_protocol()})
        assert created.status_code == 201, created.text
        rid = client.get(f"/api/studies/{created.json()['id']}").json()["runs"][0]["id"]
        run = settle(client, rid)
        assert run["summary"]["status"] == "failed"
        assert client.post(f"/api/runs/{rid}/verify").status_code == 200
        usage = client.get("/api/settings").json()["usage"]
        with app.state.db.session.begin() as session:
            receipt = session.scalars(select(ParticipantOperation)).one()
            if corruption == "result":
                receipt.result = "Forged rejection"
            else:
                receipt.request = {
                    **receipt.request,
                    "read": {
                        "kind": "read_artifact",
                        "artifact": "thermometer",
                        "version": 1,
                    },
                }
        verified = client.post(f"/api/runs/{rid}/verify")
        assert verified.status_code == 422, verified.text
        assert client.get("/api/settings").json()["usage"] == usage
        assert client.get(f"/api/runs/{rid}").json()["state"] == run["state"]
