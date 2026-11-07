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


def test_routers_resolve_services_from_the_current_app(client, tmp_path, design):
    other_app = create_app(f"sqlite:///{tmp_path}/other.sqlite3", budget_usd=8)
    with TestClient(other_app) as other:
        created = client.post("/api/studies", json={"design": design.model_dump()})
        study_id = created.json()["id"]
        assert other.get("/api/studies").json() == []
        assert other.get(f"/api/studies/{study_id}").status_code == 404
        assert client.get(f"/api/studies/{study_id}").status_code == 200
        assert other.get("/api/settings").json()["budget_usd"] == 8
        assert client.get("/api/settings").json()["budget_usd"] == 25


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


def test_verification_rejects_corrupt_evidence(client, design):
    from agent_sim.db import Turn
    from sqlalchemy import select

    sid = client.post("/api/studies", json={"design": design.model_dump()}).json()["id"]
    rid = client.get(f"/api/studies/{sid}").json()["runs"][0]["id"]
    step_run(client, rid)
    with client.app.state.db.session.begin() as session:
        session.scalars(select(Turn).where(Turn.run_id == rid)).one().state_hash = "corrupted"
    response = client.post(f"/api/runs/{rid}/verify")
    assert response.status_code == 422
    assert "State mismatch at turn 1" in response.json()["detail"]


@pytest.mark.parametrize(
    "path,payload",
    [
        ("/api/plan", {"question": "test", "run_id": "run"}),
        ("/api/analyses", {"question": "test"}),
        ("/api/analyses", {"question": "test", "study_id": "one", "run_id": "two"}),
        ("/api/studies/unknown/control", {"action": "step"}),
    ],
)
def test_operation_schemas_reject_unsupported_inputs(client, path, payload):
    assert client.post(path, json=payload).status_code == 422
    assert client.get("/api/settings").json()["usage"]["requests"] == 0


def test_initial_and_recorded_evidence_share_the_same_envelope(client, design):
    sid = client.post("/api/studies", json={"design": design.model_dump()}).json()["id"]
    rid = client.get(f"/api/studies/{sid}").json()["runs"][0]["id"]
    initial = client.get(f"/api/runs/{rid}/turns/0").json()
    assert initial["round"] == initial["checkpoint"]["round"] == 1
    step_run(client, rid)
    recorded = client.get(f"/api/runs/{rid}/turns/1").json()
    assert initial.keys() == recorded.keys()


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


def test_chat_events_deliver_partial_and_final_records_without_resubmission(client, monkeypatch):
    import asyncio
    import json

    from pydantic_ai.models.function import DeltaToolCall, FunctionModel

    async def stream(messages, info):
        yield {0: DeltaToolCall(name=info.output_tools[0].name, json_args='{"answer":"Matched')}
        await asyncio.sleep(0.3)
        yield {
            0: DeltaToolCall(json_args=' seeds share randomization.","citations":[],"caveats":[]}')
        }

    monkeypatch.setattr(
        client.app.state.models, "model", lambda _: FunctionModel(stream_function=stream)
    )
    submitted = client.post(
        "/api/chats", json={"question": "Explain matched seeds", "context": "general"}
    ).json()
    response = client.get(f"/api/chats/{submitted['chat_id']}/events")
    assert response.headers["content-type"].startswith("text/event-stream")
    assert response.headers["cache-control"] == "no-cache"
    assert response.headers.get("content-encoding") != "gzip"
    updates = [
        json.loads(line[6:]) for line in response.text.splitlines() if line.startswith("data: ")
    ]
    assert any(
        row["status"] == "pending" and row["output"].get("partial") == "Matched" for row in updates
    )
    assert updates[-1]["status"] == "complete"
    saved = client.get(f"/api/chats/{submitted['chat_id']}").json()
    assert len(saved) == 1 and saved[0]["output"]["answer"] == "Matched seeds share randomization."
    resumed = client.get(f"/api/chats/{submitted['chat_id']}/events")
    assert json.loads(resumed.text.split("data: ")[1]) == updates[-1]
    assert client.get("/api/settings").json()["usage"]["requests"] == 1
    assert client.get("/api/chats/missing/events").status_code == 404


def test_analysis_listing_honors_explicit_filters_and_rejects_ambiguous_scope(client, design):
    from agent_sim.db import Analysis

    research = client.app.state.research
    sid = research.save_design(design)
    rid = research.operational_runs(sid)[0].id
    with research.db.session.begin() as session:
        session.add_all(
            [
                Analysis(question="Design", purpose="design", status="complete", cutoffs={}),
                Analysis(question="General", purpose="general", status="complete", cutoffs={}),
                Analysis(
                    question="Study",
                    purpose="analysis",
                    study_id=sid,
                    status="complete",
                    cutoffs={},
                ),
                Analysis(
                    question="Run",
                    purpose="analysis",
                    study_id=sid,
                    run_id=rid,
                    status="complete",
                    cutoffs={},
                ),
            ]
        )

    def questions(query):
        response = client.get(f"/api/analyses{query}")
        assert response.status_code == 200
        return [row["question"] for row in response.json()]

    assert questions("") == ["Design"]
    assert questions("?purpose=general") == ["General"]
    assert questions(f"?study_id={sid}") == ["Study"]
    assert questions(f"?run_id={rid}") == ["Run"]
    assert questions(f"?run_id={rid}&purpose=analysis") == ["Run"]
    assert questions(f"?run_id={rid}&purpose=general") == []
    assert questions(f"?study_id={sid}&purpose=design") == []
    assert client.get(f"/api/analyses?study_id={sid}&run_id={rid}").status_code == 422
