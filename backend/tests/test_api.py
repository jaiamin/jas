import pytest
from agent_sim.api import create_app
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path, monkeypatch, fake_model):
    app = create_app(f"sqlite:///{tmp_path}/api.sqlite3", static_dir=tmp_path / "static")

    monkeypatch.setattr(app.state.models, "model", lambda _name: fake_model)
    with TestClient(app, base_url="http://localhost") as value:
        yield value


def step_run(client, run_id):
    response = client.post(f"/api/runs/{run_id}/control", json={"action": "step"})
    assert response.status_code == 200

    async def finished():
        await client.app.state.engine.executions[run_id].task

    client.portal.call(finished)


def test_routers_resolve_services_from_the_current_app(client, tmp_path, design):
    other_app = create_app(f"sqlite:///{tmp_path}/other.sqlite3", budget_usd=8)
    with TestClient(other_app, base_url="http://localhost") as other:
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
    assert export["format"] == "jas-study"
    assert export["version"] == 7
    assert export["rule_versions"] == ["4.0.0"]
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


def test_untrusted_host_cannot_read_or_write_with_a_matching_origin(client, design):
    headers = {"Host": "attacker.example:8080", "Origin": "http://attacker.example:8080"}
    assert client.get("/api/studies", headers=headers).status_code == 400
    assert (
        client.post(
            "/api/studies", json={"design": design.model_dump()}, headers=headers
        ).status_code
        == 400
    )
    assert client.get("/api/studies").json() == []
    assert client.get("/api/settings").json()["usage"]["requests"] == 0


@pytest.mark.parametrize("host", ["localhost:8080", "127.0.0.1:8080", "[::1]:8080"])
def test_local_hosts_accept_same_origin_writes(client, design, host):
    response = client.post(
        "/api/studies",
        json={"design": design.model_dump()},
        headers={"Host": host, "Origin": f"http://{host}"},
    )
    assert response.status_code == 201


def test_configured_host_keeps_origin_checks(tmp_path, monkeypatch, design):
    monkeypatch.setenv("JAS_ALLOWED_HOSTS", "localhost, lab.example")
    app = create_app(f"sqlite:///{tmp_path}/hosts.sqlite3")
    with TestClient(app, base_url="http://lab.example") as client:
        assert client.get("/api/health").status_code == 200
        assert (
            client.post(
                "/api/studies",
                json={"design": design.model_dump()},
                headers={"Origin": "http://untrusted.example"},
            ).status_code
            == 403
        )
        assert (
            client.post(
                "/api/studies",
                json={"design": design.model_dump()},
                headers={"Origin": "http://lab.example"},
            ).status_code
            == 201
        )


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
        ("/api/chats", {"question": "test", "run_id": "run"}),
        ("/api/chats", {"question": "test", "context": "invalid"}),
        ("/api/chats", {"question": "test", "study_id": "one", "run_id": "two"}),
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

    partial_observed = asyncio.Event()
    assistants = client.app.state.assistants
    get = assistants.get

    def observe_snapshot(key):
        row = get(key)
        if row["status"] == "pending" and row["output"].get("partial") == "Matched":
            partial_observed.set()
        return row

    monkeypatch.setattr(assistants, "get", observe_snapshot)

    async def stream(messages, info):
        yield {0: DeltaToolCall(name=info.output_tools[0].name, json_args='{"answer":"Matched')}
        await asyncio.wait_for(partial_observed.wait(), timeout=5)
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


@pytest.mark.parametrize("scope", ["study", "run"])
def test_scoped_chat_serializes_followups(client, design, monkeypatch, scope):
    import asyncio

    from agent_sim.db import Analysis

    assistant = client.app.state.assistants
    release = asyncio.Event()

    async def execute(key):
        await release.wait()
        with assistant.db.session.begin() as session:
            row = session.get_one(Analysis, key)
            row.status, row.output = "complete", {"answer": "Recorded answer"}

    monkeypatch.setattr(assistant, "_execute", execute)
    sid = client.post("/api/studies", json={"design": design.model_dump()}).json()["id"]
    rid = client.get(f"/api/studies/{sid}").json()["runs"][0]["id"]
    context = f"{scope}:{sid if scope == 'study' else rid}"
    first = client.post("/api/chats", json={"question": "What happened?", "context": context})
    assert first.status_code == 202
    key, chat_id = first.json()["id"], first.json()["chat_id"]
    followup = {"question": "Why did it happen?", "context": context, "chat_id": chat_id}
    assert client.post("/api/chats", json=followup).status_code == 422
    assert len(assistant.tasks) == 1

    async def finish():
        release.set()
        await assistant.tasks[key]

    client.portal.call(finish)
    assert client.post("/api/chats", json=followup).status_code == 202
    assert [row["question"] for row in assistant.chat(chat_id)] == [
        "What happened?",
        "Why did it happen?",
    ]
    assert client.get("/api/settings").json()["usage"]["requests"] == 0


def test_experiment_checks_are_free_and_invalid_changes_cannot_be_saved(client, design):
    data = {"design": design.model_dump()}
    response = client.post("/api/design/preflight", json=data)
    assert response.status_code == 200
    assert response.json()["probe_turns"] == 3 * design.turn_count
    assert response.json()["original_question"] is None
    changed = design.conditions[0].model_copy(update={"key": "invalid"}, deep=True)
    changed.parameters.institution.oversight = 0.21
    design.conditions.append(changed)
    data = {"design": design.model_dump()}
    report = client.post("/api/design/preflight", json=data).json()
    assert report["status"] == "blocked"
    assert client.post("/api/studies", json=data).status_code == 422
    assert client.get("/api/studies").json() == []
    assert client.get("/api/settings").json()["usage"]["requests"] == 0


def test_recorded_institution_runs_remain_readable_after_rule_upgrade(client):
    from agent_sim.db import Run

    catalog = client.get("/api/catalog").json()
    design = next(t["design"] for t in catalog["templates"] if t["id"] == "institution")
    sid = client.post("/api/studies", json={"design": design}).json()["id"]
    rid = client.get(f"/api/studies/{sid}").json()["runs"][0]["id"]
    step_run(client, rid)
    before = client.get(f"/api/runs/{rid}/turns/1").json()
    with client.app.state.db.session.begin() as session:
        run = session.get_one(Run, rid)
        run.checkpoint = {**run.checkpoint, "rule_version": "4.0.0"}
    current = client.get(f"/api/runs/{rid}")
    assert current.status_code == 200
    assert current.json()["execution_blocked"]
    assert current.json()["next_actor"] is None
    assert client.get(f"/api/runs/{rid}/turns/1").json() == before
    assert client.get(f"/api/studies/{sid}").json()["preflight"]["status"] == "blocked"
    assert client.post(f"/api/runs/{rid}/control", json={"action": "start"}).status_code == 422
    exported = client.get(f"/api/studies/{sid}/export").json()
    assert exported["rule_versions"] == ["4.0.0", "4.1.0"]
    archived = next(r for r in exported["runs"] if r["record"]["summary"]["id"] == rid)
    assert not archived["initial_state_available"]
    assert archived["evidence"][0] == before


def test_delete_experiment_removes_all_revisions_and_evidence_but_preserves_accounting(
    client, design
):
    from agent_sim.db import Analysis, ProviderCall
    from sqlalchemy import select

    sid = client.post("/api/studies", json={"design": design.model_dump()}).json()["id"]
    original = client.get(f"/api/studies/{sid}").json()
    rid = original["runs"][0]["id"]
    step_run(client, rid)
    client.post(
        f"/api/runs/{rid}/annotations", json={"turn": 1, "label": "Note", "note": "Evidence"}
    )
    client.post(f"/api/studies/{sid}/revisions", json={"design": design.model_dump()})
    other = client.post("/api/studies", json={"design": design.model_dump()}).json()["id"]
    with client.app.state.db.session.begin() as session:
        scoped = Analysis(
            study_id=sid,
            run_id=rid,
            chat_id="mixed",
            purpose="analysis",
            question="Inspect",
            status="complete",
        )
        unrelated = Analysis(
            chat_id="mixed", purpose="general", question="Unrelated", status="complete"
        )
        session.add_all([scoped, unrelated])
        session.flush()
        scoped_id, unrelated_id = scoped.id, unrelated.id
        call = session.scalars(select(ProviderCall).where(ProviderCall.run_id == rid)).one()
        call.analysis_id = scoped_id
        # Unknown usage remains reserved and visible even when its experiment is deleted.
        call.status = "unknown"
        call_id = call.id
    before = client.get("/api/settings").json()
    assert client.delete(f"/api/studies/{sid}").status_code == 200
    assert client.get(f"/api/studies/{sid}").status_code == 404
    assert client.get(f"/api/runs/{rid}").status_code == 404
    assert [study["id"] for study in client.get("/api/studies").json()] == [other]
    assert all(run["study_id"] == other for run in client.get("/api/runs").json())
    assert client.get(f"/api/studies/{other}/export").status_code == 200
    assert client.get(f"/api/analyses/{scoped_id}").status_code == 404
    assert client.get(f"/api/analyses/{unrelated_id}").status_code == 200
    after = client.get("/api/settings").json()
    assert after["usage"] == before["usage"]
    assert after["charged_usd"] == before["charged_usd"]
    with client.app.state.db.session() as session:
        call = session.get_one(ProviderCall, call_id)
        assert call.study_id is None and call.run_id is None and call.analysis_id is None
        assert call.status == "unknown"
        assert call.request_payload is None and call.response_payload is None
    assert client.delete(f"/api/studies/{sid}").status_code == 404


@pytest.mark.parametrize("status", ["queued", "running", "pausing"])
def test_delete_experiment_rejects_active_runs_without_partial_deletion(client, design, status):
    from agent_sim.db import Run

    sid = client.post("/api/studies", json={"design": design.model_dump()}).json()["id"]
    rid = client.get(f"/api/studies/{sid}").json()["runs"][0]["id"]
    with client.app.state.db.session.begin() as session:
        session.get_one(Run, rid).status = status
    response = client.delete(f"/api/studies/{sid}")
    assert response.status_code == 422
    assert "Pause all runs" in response.json()["detail"]
    assert client.get(f"/api/studies/{sid}").status_code == 200
    with client.app.state.db.session.begin() as session:
        session.get_one(Run, rid).status = "paused"
    assert client.delete(f"/api/studies/{sid}").status_code == 200


def test_delete_experiment_rejects_pending_chat_and_unsettled_call(client, design):
    from agent_sim.db import Analysis, ProviderCall

    sid = client.post("/api/studies", json={"design": design.model_dump()}).json()["id"]
    with client.app.state.db.session.begin() as session:
        scoped = Analysis(
            study_id=sid, chat_id="mixed", purpose="analysis", question="Inspect", status="complete"
        )
        pending = Analysis(
            chat_id="mixed", purpose="general", question="Follow-up", status="pending"
        )
        session.add_all([scoped, pending])
        session.flush()
        pending_id = pending.id
    response = client.delete(f"/api/studies/{sid}")
    assert response.status_code == 422
    assert "chats to finish" in response.json()["detail"]
    with client.app.state.db.session.begin() as session:
        session.get_one(Analysis, pending_id).status = "complete"
        call = ProviderCall(
            study_id=sid, purpose="analysis", model="openai:gpt-6-luna", reserved=0, charged=0
        )
        session.add(call)
        session.flush()
        call_id = call.id
    response = client.delete(f"/api/studies/{sid}")
    assert response.status_code == 422
    assert "requests to settle" in response.json()["detail"]
    with client.app.state.db.session.begin() as session:
        session.get_one(ProviderCall, call_id).status = "complete"
    assert client.delete(f"/api/studies/{sid}").status_code == 200


def test_delete_experiment_respects_live_task_ownership_even_if_status_is_paused(client, design):
    import asyncio

    from agent_sim.execution import Execution

    sid = client.post("/api/studies", json={"design": design.model_dump()}).json()["id"]
    rid = client.get(f"/api/studies/{sid}").json()["runs"][0]["id"]

    async def own():
        client.app.state.engine.executions[rid] = Execution(
            task=asyncio.create_task(asyncio.Event().wait())
        )

    async def release():
        task = client.app.state.engine.executions.pop(rid).task
        task.cancel()
        await asyncio.gather(task, return_exceptions=True)

    client.portal.call(own)
    try:
        response = client.delete(f"/api/studies/{sid}")
        assert response.status_code == 422
        assert client.get(f"/api/runs/{rid}").status_code == 200
    finally:
        client.portal.call(release)
    assert client.delete(f"/api/studies/{sid}").status_code == 200
