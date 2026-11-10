"""Fresh T14 reviewer DEVELOPMENT witnesses through the public HTTP workflow."""

import asyncio
import json
import time
from concurrent.futures import ThreadPoolExecutor
from threading import Event, get_ident

import pytest
from agent_sim.api import create_app
from fastapi.testclient import TestClient
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.models.function import DeltaToolCall, FunctionModel
from pydantic_ai.usage import RequestUsage

from backend.tests.test_extension_integration import admitted as admitted


def install_provider(client, monkeypatch, design):
    first_request, release_first, second_request = Event(), Event(), Event()
    sent = []
    relay = design["environment"] == "sealed_relay"

    async def respond(messages, info):
        fields = info.output_tools[0].parameters_json_schema.get("properties", {})
        prompt = json.loads(messages[-1].parts[0].content)
        sent.append({"fields": list(fields), "prompt": prompt})
        if "operationalization" in fields:
            payload = {
                "supported": True,
                "intent": "exploratory",
                "explanation": "An installed read followed by stop.",
                "operationalization": "Record the two literal artifact decisions.",
                "size_rationale": "One actor, one fixed seed, two opportunities.",
                "agents": len(design["profiles"]),
                "conditions": 1,
                "seeds": 1,
                "repetitions": 1,
                "rounds": design["rounds"],
                "research_query": None,
                "requirements": [
                    {
                        "source": "sealed relay" if relay else "artifact workspace",
                        "capability": "finite_stock" if relay else "versioned_artifacts",
                        "mapping": "direct",
                        "explanation": "Authorized read and explicit stop.",
                    }
                ],
            }
        elif "design" in fields:
            payload = {"design": design, "explanation": "Two declared opportunities."}
            if relay:
                payload["probes"] = [
                    {
                        "condition_key": design["conditions"][0]["key"],
                        "steps": [
                            {
                                "actor": design["profiles"][0]["key"],
                                "action": {"kind": "relay", "operation": "lodge"},
                            }
                        ],
                    }
                ]
        elif "issues" in fields:
            payload = {"issues": [], "summary": "Inspect recorded behavior only."}
        elif "action" in fields:
            if not first_request.is_set():
                first_request.set()
                assert await asyncio.to_thread(release_first.wait, 8)
                action = {"kind": "read_artifact", "artifact": "measurement", "version": 1}
            else:
                second_request.set()
                action = {"kind": "stop"}
            if relay:
                action = {
                    "kind": "relay",
                    "operation": "lodge" if prompt["relay"]["phase"] == 0 else "release",
                }
            payload = {
                "action": action,
                "rationale": "Literal development decision.",
                "memory": "",
                "forecast": None,
            }
        else:
            finding = {
                "answer": "One recorded read/stop trajectory.",
                "citations": [],
                "caveats": ["A single fixed seed is descriptive."],
                "claims": [],
            }
            payload = {"requests": [], "answer": finding} if "requests" in fields else finding
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, payload)],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    async def stream(messages, info):
        response = await respond(messages, info)
        part = response.parts[0]
        yield {0: DeltaToolCall(name=part.tool_name, json_args=json.dumps(part.args))}

    model = FunctionModel(function=respond, stream_function=stream)
    monkeypatch.setattr(client.app.state.models, "model", lambda _name: model)
    return sent, first_request, release_first, second_request


@pytest.fixture
def workflow(tmp_path, monkeypatch):
    app = create_app(f"sqlite:///{tmp_path}/review.sqlite3", static_dir=tmp_path / "static")
    with TestClient(app, base_url="http://localhost") as client:
        design = next(
            item["design"]
            for item in client.get("/api/catalog").json()["templates"]
            if item["id"] == "artifact_workspace"
        )
        design.update(
            question=(
                "Does a solo actor read the measurement and then stop in an artifact workspace?"
            ),
            title="Independent read and stop",
            hypothesis="",
            seeds=[941],
            rounds=2,
            budget_usd=2,
            measures=[],
        )
        design["conditions"][0]["harness"] = {"kind": "direct_action", "version": "1.0.0"}

        sent, first_request, release_first, second_request = install_provider(
            client, monkeypatch, design
        )
        try:
            yield client, design, sent, first_request, release_first, second_request
        finally:
            release_first.set()


def authorize(client, design):
    response = client.post(
        "/api/investigations",
        json={
            "question": design["question"],
            "environments": [design["environment"]],
            "harnesses": ["direct_action"],
            "budget_usd": 2,
            "study_budget_usd": 2,
            "max_requests": 16,
            "max_runs": 1,
            "max_turns": 2,
            "max_agents": len(design["profiles"]),
            "max_rounds": 2,
            "intent": "exploratory",
        },
    )
    assert response.status_code == 202, response.text
    return response.json()["id"]


def progress(client, key):
    response = client.get(f"/api/investigations/{key}")
    assert response.status_code == 200, response.text
    return response.json()


def until(client, key, predicate):
    deadline = time.monotonic() + 8
    while time.monotonic() < deadline:
        row = progress(client, key)
        if predicate(row):
            return row
        time.sleep(0.01)
    pytest.fail(f"No expected public progress: {row['status']}/{row['stop_reason']}")


@pytest.mark.parametrize("control_scope", ["runs", "studies"])
def test_child_pause_holds_its_authorized_investigation_until_explicit_resume(
    workflow, control_scope
):
    client, design, sent, entered, release, second = workflow
    key = authorize(client, design)
    assert entered.wait(8), progress(client, key)
    row = progress(client, key)
    run_id = row["attempts"][0]["run_ids"][0]
    controlled_id = run_id if control_scope == "runs" else row["study_id"]
    paused = client.post(f"/api/{control_scope}/{controlled_id}/control", json={"action": "pause"})
    assert paused.status_code == 200, paused.text
    release.set()
    row = until(client, key, lambda value: value["status"] == "paused" or second.is_set())
    assert row["status"] == "paused", "Run Pause must hold the investigation before another send"
    assert not second.is_set()
    assert client.get(f"/api/runs/{run_id}").json()["summary"]["turn"] == 1
    assert [call["charged"] for call in row["ledger"]] == [700, 700, 700, 35]
    assert (
        client.post(f"/api/investigations/{key}/control", json={"action": "resume"}).status_code
        == 200
    )
    complete = until(client, key, lambda value: value["status"] == "complete")
    assert complete["turns"] == 2
    assert len([call for call in sent if "you" in call["prompt"]]) == 2
    assert client.post(f"/api/runs/{run_id}/verify", json={}).json()["verified_turns"] == 2


def relay_design(client, source):
    response = client.post(
        "/api/design/use-environment", json={"source": source, "example": "independent"}
    )
    assert response.status_code == 200, response.text
    design = response.json()
    design.update(
        question="Does the sealed relay lodge then release within its credits?",
        title="Independent bounded relay",
        seeds=[947],
        rounds=1,
        budget_usd=2,
        response_tokens=4096,
        hypothesis="",
    )
    design["conditions"][0]["harness"] = {"kind": "direct_action", "version": "1.0.0"}
    return design


def test_pause_while_start_waits_for_an_actual_worker_keeps_the_continuation(admitted, monkeypatch):
    import agent_sim.extensions as extensions

    client, source = admitted
    gate_design = relay_design(client, source)
    saved = client.post("/api/studies", json={"design": gate_design})
    assert saved.status_code == 201, saved.text
    gate_id = client.get(f"/api/studies/{saved.json()['id']}").json()["runs"][0]["id"]
    design = next(
        item["design"]
        for item in client.get("/api/catalog").json()["templates"]
        if item["id"] == "artifact_workspace"
    )
    design.update(
        question="Does one actor stop in an artifact workspace?",
        seeds=[949],
        rounds=1,
        budget_usd=2,
        measures=[],
        hypothesis="",
    )
    design["conditions"][0]["harness"] = {"kind": "direct_action", "version": "1.0.0"}
    sent, participant, release_participant, _ = install_provider(client, monkeypatch, design)
    entered, release = Event(), Event()
    execute = extensions.execute

    def observe(*args, **kwargs):
        if not entered.is_set():
            entered.set()
            assert release.wait(8)
        return execute(*args, **kwargs)

    monkeypatch.setattr(extensions, "execute", observe)
    with ThreadPoolExecutor(max_workers=1) as requests:
        starting = requests.submit(
            client.post, f"/api/runs/{gate_id}/control", json={"action": "start"}
        )
        key = None
        try:
            assert entered.wait(8)
            key = authorize(client, design)
            until(client, key, lambda row: row["stage"] == "runs")
            assert (
                client.post(
                    f"/api/investigations/{key}/control", json={"action": "pause"}
                ).status_code
                == 200
            )
            assert (
                client.post(f"/api/runs/{gate_id}/control", json={"action": "pause"}).status_code
                == 200
            )
            release.set()
            assert starting.result(timeout=8).status_code == 200
            row = until(
                client, key, lambda value: value["status"] in {"paused", "stopped", "failed"}
            )
            assert row["status"] == "paused", (
                "Accepted Pause must not become a terminal preflight error"
            )
            assert row["requests"] == len(sent) == 3
            assert row["runs"] == row["turns"] == 0 and not participant.is_set()
            release_participant.set()
            assert (
                client.post(
                    f"/api/investigations/{key}/control", json={"action": "resume"}
                ).status_code
                == 200
            )
            complete = until(client, key, lambda value: value["status"] == "complete")
            assert complete["attempts"][0]["run_ids"] == row["attempts"][0]["run_ids"]
            assert len(complete["attempts"]) == complete["turns"] == 1
            assert len([call for call in sent if "you" in call["prompt"]]) == 1
        finally:
            release.set()
            release_participant.set()
            if key:
                client.post(f"/api/investigations/{key}/control", json={"action": "cancel"})


def test_pause_accepted_during_actual_worker_save_remains_in_durable_decisions(
    admitted, monkeypatch
):
    import agent_sim.extensions as extensions

    client, source = admitted
    design = relay_design(client, source)
    sent, participant, release_participant, _ = install_provider(client, monkeypatch, design)
    entered, release = Event(), Event()
    identity = {}
    assert client.portal is not None
    api_thread = client.portal.call(get_ident)
    worker_threads = []
    execute = extensions.execute

    def observe(*args, **kwargs):
        worker_threads.append(get_ident())
        result = execute(*args, **kwargs)
        if identity and get_ident() != api_thread and not entered.is_set():
            row = progress(client, identity["id"])
            if row["attempts"] and row["attempts"][-1]["revision"] is None:
                proposal = client.get(f"/api/analyses/{row['attempts'][-1]['design_id']}").json()
                if proposal["status"] == "complete":
                    entered.set()
                    assert release.wait(8)
        return result

    monkeypatch.setattr(extensions, "execute", observe)
    key = authorize(client, design)
    identity["id"] = key
    try:
        assert entered.wait(8), progress(client, key)
        response = client.post(f"/api/investigations/{key}/control", json={"action": "pause"})
        assert response.status_code == 200, response.text
        accepted = next(
            d for d in response.json()["decisions"] if d["decision"] == "pause_requested"
        )
        release.set()
        paused = until(client, key, lambda row: row["status"] == "paused")
        assert accepted in paused["decisions"], (
            "A committed save must retain an already accepted Pause decision"
        )
        assert paused["attempts"][0]["revision"] == 1
        assert paused["runs"] == paused["turns"] == 0
        assert len(sent) == paused["requests"] == 3 and not participant.is_set()
        assert worker_threads and api_thread not in worker_threads
    finally:
        release.set()
        release_participant.set()
        client.post(f"/api/investigations/{key}/control", json={"action": "cancel"})


def test_independent_admitted_workflow_uses_actual_workers_and_null_utility(admitted, monkeypatch):
    import agent_sim.extensions as extensions

    client, source = admitted
    design = relay_design(client, source)
    sent, _, release, _ = install_provider(client, monkeypatch, design)
    release.set()
    assert client.portal is not None
    api_thread = client.portal.call(get_ident)
    threads = []
    execute = extensions.execute

    def observe(*args, **kwargs):
        threads.append(get_ident())
        return execute(*args, **kwargs)

    monkeypatch.setattr(extensions, "execute", observe)
    key = authorize(client, design)
    row = until(client, key, lambda value: value["status"] in {"complete", "failed", "stopped"})
    assert row["status"] == "complete", row
    run_id = row["attempts"][0]["run_ids"][0]
    record = client.get(f"/api/runs/{run_id}").json()
    assert record["design"]["environment_source"] == source
    assert (record["state"]["phase"], record["state"]["credits"]) == (2, 0)
    assert record["summary"]["turn"] == row["turns"] == 2
    participants = [call["prompt"] for call in sent if "you" in call["prompt"]]
    assert len(participants) == 2
    assert "seal-42" not in json.dumps(participants[0])
    assert participants[1]["relay"]["docket"] == "seal-42"
    assert row["analysis"]["cutoffs"] == {run_id: 2}
    lens = row["analysis"]["output"]["lens"]
    assert lens["calculations"][0]["value"] is None
    assert "unavailable" in lens["account"][0]["text"]
    assert client.get(f"/api/studies/{row['study_id']}/exposure").status_code == 200
    exported = client.get(f"/api/studies/{row['study_id']}/export").json()
    assert exported["version"] == 14
    assert exported["revisions"][0]["design"]["environment_source"] == source
    before = len(sent)
    assert client.post(f"/api/runs/{run_id}/verify", json={}).json()["verified_turns"] == 2
    assert len(sent) == before
    assert threads and api_thread not in threads
