import pytest
from agent_sim.api import create_app
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path, monkeypatch, fake_model):
    app = create_app(f"sqlite:///{tmp_path}/api.sqlite3", static_dir=tmp_path / "static")

    monkeypatch.setattr(app.state.models, "model", lambda _name: fake_model)
    with TestClient(app) as value:
        yield value


def step_run(client, run_id):
    response = client.post(f"/api/runs/{run_id}/control", json={"action": "step"})
    assert response.status_code == 200

    async def finished():
        await client.app.state.engine.executions[run_id].task

    client.portal.call(finished)


def test_manual_design_step_evidence_and_export(client, design):
    result = client.post("/api/studies", json={"design": design.model_dump()})
    assert result.status_code == 201
    sid = result.json()["id"]
    rid = client.get(f"/api/studies/{sid}").json()["runs"][0]["id"]
    assert client.get("/api/settings").json()["usage"]["requests"] == 0
    step_run(client, rid)
    run = client.get(f"/api/runs/{rid}").json()
    assert run["summary"]["turn"] == 1
    assert run["summary"]["status"] == "paused"
    evidence = client.get(f"/api/runs/{rid}/turns/1").json()
    assert evidence["observation"]["you"]["goal"]
    assert "pending" not in evidence["observation"]
    assert evidence["state_hash"]
    assert (
        client.post(
            f"/api/runs/{rid}/annotations",
            json={"turn": 1, "label": "Review", "note": "Inspect this choice"},
        ).status_code
        == 201
    )
    assert client.get(f"/api/runs/{rid}/annotations").json()[0]["note"] == "Inspect this choice"
    export = client.get(f"/api/studies/{sid}/export").json()
    assert export["runs"][0]["evidence"][1] == evidence
    assert client.post(f"/api/runs/{rid}/verify", json={}).json()["verified_turns"] == 1


def test_validation_and_origin_guard_do_not_spend(client, design):
    invalid = design.model_dump() | {"api_key": "not-a-secret"}
    assert client.post("/api/design/validate", json={"design": invalid}).status_code == 422
    assert (
        client.post(
            "/api/studies",
            json={"design": design.model_dump()},
            headers={"Origin": "https://unrelated.example"},
        ).status_code
        == 403
    )
    assert client.get("/api/studies").json() == []
    assert client.get("/api/settings").json()["usage"]["requests"] == 0
    assert "test-not-a-real-key" not in client.get("/api/settings").text
    assert client.get("/api/not-an-endpoint").status_code == 404
    assert client.get("/api/analyses/missing").status_code == 404


def test_invalid_json_design_does_not_create_study(client):
    assert client.post("/api/design/validate", json={"design": {"profiles": 4}}).status_code == 422
    assert client.get("/api/studies").json() == []


@pytest.mark.parametrize(
    "path",
    [
        "/studies/missing",
        "/studies/missing/export",
        "/runs/missing",
        "/runs/missing/turns/0",
        "/runs/missing/annotations",
        "/requests/missing",
        "/analyses/missing",
    ],
)
def test_missing_records_have_one_not_found_contract(client, path):
    response = client.get(f"/api{path}")
    assert response.status_code == 404
    assert response.json() == {"detail": "Record not found"}


@pytest.mark.parametrize("action", ["start", "step", "pause"])
def test_missing_run_controls_are_not_found_without_spending(client, action):
    response = client.post("/api/runs/missing/control", json={"action": action})
    assert response.status_code == 404
    assert client.get("/api/settings").json()["usage"]["requests"] == 0


def test_openapi_describes_application_and_validation_errors(client):
    schema = client.get("/api/openapi.json").json()
    responses = schema["paths"]["/api/studies"]["post"]["responses"]
    for status in ("403", "404", "409", "422"):
        assert responses[status]["content"]["application/json"]["schema"] == {
            "$ref": "#/components/schemas/ErrorResponse"
        }
    detail = schema["components"]["schemas"]["ErrorResponse"]["properties"]["detail"]
    assert {variant["type"] for variant in detail["anyOf"]} == {"string", "array"}


def test_export_includes_previous_revisions_and_their_recorded_turns(client, design):
    sid = client.post("/api/studies", json={"design": design.model_dump()}).json()["id"]
    old = client.get(f"/api/studies/{sid}").json()
    rid = old["runs"][0]["id"]
    step_run(client, rid)
    design.title = "Revised study"
    client.post(f"/api/studies/{sid}/revisions", json={"design": design.model_dump()})
    exported = client.get(f"/api/studies/{sid}/export").json()
    assert len(exported["revisions"]) == 2
    assert exported["revisions"][0]["sha256"] == old["sha256"]
    assert len(exported["runs"]) == 2
    recorded = next(r for r in exported["runs"] if r["record"]["summary"]["id"] == rid)
    assert len(recorded["evidence"]) == 2
    assert exported["requests"][0]["request"]["schema"]
    assert "test-not-a-real-key" not in str(exported)


def test_saved_ai_proposal_provenance_survives_revision_and_export(client, design):
    from agent_sim.db import Analysis

    with client.app.state.db.session.begin() as session:
        plan = Analysis(purpose="design", question=design.question, cutoffs={})
        session.add(plan)
        session.flush()
        pid = plan.id
    body = {"design": design.model_dump(), "plan_id": pid}
    assert client.post("/api/studies", json=body).status_code == 422
    assert client.get("/api/studies").json() == []
    with client.app.state.db.session.begin() as session:
        plan = session.get_one(Analysis, pid)
        plan.status = "complete"
        plan.output = {
            "supported": True,
            "design": design.model_dump(),
            "planning": {"sources": []},
        }
    sid = client.post("/api/studies", json=body).json()["id"]
    assert client.get(f"/api/studies/{sid}").json()["plan_id"] == pid
    client.post(f"/api/studies/{sid}/revisions", json={"design": design.model_dump()})
    exported = client.get(f"/api/studies/{sid}/export").json()
    assert exported["study"]["plan_id"] is None
    assert exported["revisions"][0]["source"] == f"plan:{pid}"
    assert exported["analyses"][0]["id"] == pid
