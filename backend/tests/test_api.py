import pytest
from agent_sim.api import create_app
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path, monkeypatch, fake_model):
    app = create_app(f"sqlite:///{tmp_path}/api.sqlite3", static_dir=tmp_path / "static")

    monkeypatch.setattr(app.state.models, "model", lambda _name: fake_model)
    with TestClient(app) as value:
        yield value


def test_manual_design_step_evidence_and_export(client, design):
    result = client.post("/api/studies", json={"design": design.model_dump()})
    assert result.status_code == 201
    sid = result.json()["id"]
    rid = client.get(f"/api/studies/{sid}").json()["runs"][0]["id"]
    assert client.get("/api/settings").json()["usage"]["requests"] == 0
    assert client.post(f"/api/runs/{rid}/control", json={"action": "step"}).status_code == 200
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
    response = client.get(f"/api/studies/{sid}/export")
    assert response.headers["content-disposition"] == f'attachment; filename="jas-{sid}.json"'
    assert client.get("/api/openapi.json").json()["info"]["title"] == "JAS"
    export = response.json()
    assert export["format"] == "ass-study"
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


def test_general_agent_submission_preserves_scoped_analysis_contract(client, monkeypatch):
    submitted = []
    monkeypatch.setattr(
        client.app.state.assistants,
        "start",
        lambda question, **kwargs: submitted.append((question, kwargs)) or "general-request",
    )
    response = client.post("/api/agent", json={"question": "What is a matched seed?"})
    assert response.status_code == 202 and response.json() == {"id": "general-request"}
    assert submitted == [("What is a matched seed?", {"purpose": "general"})]
    assert (
        client.post("/api/agent", json={"question": "Inspect it", "run_id": "a"}).status_code == 422
    )
    assert client.post("/api/analyses", json={"question": "Inspect it"}).status_code == 422
    assert client.get("/api/analyses?purpose=general").json() == []
    assert len(submitted) == 1


def test_export_includes_previous_revisions_and_their_recorded_turns(client, design):
    sid = client.post("/api/studies", json={"design": design.model_dump()}).json()["id"]
    old = client.get(f"/api/studies/{sid}").json()
    rid = old["runs"][0]["id"]
    client.post(f"/api/runs/{rid}/control", json={"action": "step"})
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


def test_chat_api_returns_saved_history_and_validates_requests(client, monkeypatch):
    from agent_sim.db import Analysis

    agent = client.app.state.assistants

    async def execute(key):
        with agent.db.session.begin() as session:
            row = session.get_one(Analysis, key)
            row.status, row.output = "complete", {"answer": "A recorded answer", "citations": []}

    monkeypatch.setattr(agent, "_execute", execute)
    first = client.post("/api/chats", json={"question": "Explain matched seeds"})
    assert first.status_code == 202
    chat_id = first.json()["chat_id"]
    second = client.post("/api/chats", json={"question": "Explain repetitions", "chat_id": chat_id})
    assert second.status_code == 202 and second.json()["chat_id"] == chat_id
    history = client.get(f"/api/chats/{chat_id}").json()
    assert [row["question"] for row in history] == ["Explain matched seeds", "Explain repetitions"]
    assert all(row["purpose"] == "general" and row["cutoffs"] == {} for row in history)
    assert client.get("/api/chats").json()[0]["title"] == "Explain matched seeds"
    assert client.get("/api/chats/missing").status_code == 404
    assert client.post("/api/chats", json={"question": "  "}).status_code == 422
    assert (
        client.post("/api/chats", json={"question": "Question", "context": "fake"}).status_code
        == 422
    )
    assert (
        client.post("/api/chats", json={"question": "Question", "chat_id": "fake"}).status_code
        == 404
    )
    assert len(client.get("/api/chats").json()) == 1
    assert client.get("/api/settings").json()["usage"]["requests"] == 0
