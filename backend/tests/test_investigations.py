"""T14 DEVELOPMENT: real HTTP workflows; only the provider boundary is scripted."""

import asyncio
import json
import os
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from threading import Barrier, Event

import pytest
from agent_sim.api import create_app
from fastapi.testclient import TestClient
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.models.function import DeltaToolCall, FunctionModel
from pydantic_ai.usage import RequestUsage


@pytest.fixture
def client(tmp_path):
    app = create_app(f"sqlite:///{tmp_path}/investigations.sqlite3", static_dir=tmp_path / "static")
    with TestClient(app, base_url="http://localhost") as client:
        yield client


def authorization(**changes):
    return {
        "question": "Can one investigator stop in an artifact workspace?",
        "environments": ["artifact_workspace"],
        "harnesses": ["direct_action"],
        "budget_usd": 2,
        "study_budget_usd": 2,
        "max_requests": 16,
        "max_runs": 1,
        "max_turns": 1,
        "max_agents": 1,
        "max_rounds": 1,
        "intent": "exploratory",
        **changes,
    }


def stand_in(client, monkeypatch, *, override=None):
    design = next(
        t["design"]
        for t in client.get("/api/catalog").json()["templates"]
        if t["id"] == "artifact_workspace"
    )
    design.update(
        title="One stop trajectory",
        question=authorization()["question"],
        hypothesis="",
        seeds=[227],
        rounds=1,
        measures=[],
        budget_usd=2,
    )
    design["conditions"][0]["harness"] = {"kind": "direct_action", "version": "1.0.0"}
    calls = []

    async def respond(messages, info):
        schema = info.output_tools[0].parameters_json_schema
        fields = schema.get("properties", {})
        prompt = json.loads(messages[-1].parts[0].content)
        calls.append({"schema": schema, "prompt": prompt})
        if override:
            result = await override(fields, prompt)
            if result is not None:
                payload = result
            else:
                payload = answer(fields)
        else:
            payload = answer(fields)
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, payload)],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    def answer(fields):
        if "operationalization" in fields:
            return {
                "supported": True,
                "intent": "exploratory",
                "explanation": "A stop trajectory.",
                "operationalization": "Describe the observed explicit stop.",
                "size_rationale": "One actor and one opportunity; descriptive only.",
                "agents": len(design["profiles"]),
                "conditions": len(design["conditions"]),
                "seeds": len(design["seeds"]),
                "repetitions": design["repetitions"],
                "rounds": design["rounds"],
                "research_query": None,
                "requirements": [
                    {
                        "source": "artifact workspace",
                        "capability": "versioned_artifacts",
                        "mapping": "direct",
                        "explanation": "Installed artifact mechanics.",
                    }
                ],
            }
        if "design" in fields:
            return {"design": design, "explanation": "A single stop opportunity."}
        if "issues" in fields:
            return {"issues": [], "summary": "Observe whether the actor stops."}
        if "action" in fields:
            return {
                "action": {"kind": "stop"},
                "memory": "",
                "rationale": "Stop.",
                "forecast": None,
            }
        finding = {
            "answer": "One recorded trajectory; no population inference.",
            "citations": [],
            "caveats": ["One fixed seed."],
            "claims": [],
        }
        if "propose_experiment" in fields:
            return {**finding, "propose_experiment": False, "requests": []}
        return {"requests": [], "answer": finding} if "requests" in fields else finding

    async def stream(messages, info):
        response = await respond(messages, info)
        part = response.parts[0]
        yield {0: DeltaToolCall(name=part.tool_name, json_args=json.dumps(part.args))}

    model = FunctionModel(function=respond, stream_function=stream)
    monkeypatch.setattr(client.app.state.models, "model", lambda _name: model)
    return calls, design


def wait_for(client, key, *, statuses=("complete", "stopped", "cancelled", "failed", "paused")):
    deadline = time.monotonic() + 15
    while time.monotonic() < deadline:
        response = client.get(f"/api/investigations/{key}")
        assert response.status_code == 200, response.text
        row = response.json()
        if row["status"] in statuses:
            return row
        time.sleep(0.01)
    pytest.fail(f"Investigation did not settle: {row}")


def test_one_explicit_action_completes_narrow_investigation_with_durable_scope(client, monkeypatch):
    calls, _ = stand_in(client, monkeypatch)
    submitted = client.post("/api/investigations", json=authorization())
    assert submitted.status_code == 202, submitted.text
    identity = submitted.json()
    row = wait_for(client, identity["id"])
    assert row["status"] == "complete", json.dumps(row, indent=2)
    assert row["authorization"]["question"] == authorization()["question"]
    assert row["authorization"]["researcher_model"] == "openai:gpt-6.1-sol"
    assert row["authorization"]["participant_model"] == "openai:gpt-6-luna"
    assert row["authorization"]["max_turns"] == 1
    assert row["requests"] == len(calls) > 1
    assert row["usage"]["partial"] is False
    assert row["result"]["planned"] == row["result"]["complete"] == 1
    assert row["result"]["failed"] == row["result"]["missing"] == 0
    assert row["result"]["research_validity"] == "unassessed"
    assert row["result"]["limitations"]
    attempt = row["attempts"][0]
    assert attempt["design_id"] and attempt["revision"] == 1
    run_id = attempt["run_ids"][0]
    assert row["analysis"]["status"] == "complete"
    assert row["analysis"]["cutoffs"] == {run_id: 1}
    assert row["analysis"]["output"]["caveats"]
    record = client.get(f"/api/runs/{run_id}").json()
    assert record["summary"]["status"] == "complete"
    assert record["summary"]["turn"] == 1
    assert record["summary"]["usage"]["requests"] == 1
    assert client.post(f"/api/runs/{run_id}/verify").json()["model_requests"] == 0
    before = len(calls)
    assert client.get(f"/api/investigations/{identity['id']}").json() == row
    chat = client.get(f"/api/chats/{identity['chat_id']}").json()
    assert len(chat) == 1 and chat[0]["purpose"] == "investigation"
    assert chat[0]["output"]["investigation_id"] == identity["id"]
    exported = client.get(f"/api/studies/{row['study_id']}/export").json()
    assert exported["investigations"][0]["authorization"] == row["authorization"]
    assert all(request["investigation_id"] == identity["id"] for request in exported["requests"])
    assert len(calls) == before


def test_authorized_researcher_identity_is_independent_of_ordinary_chat_configuration(
    client, monkeypatch
):
    monkeypatch.setenv("JAS_PLANNER_MODEL", "anthropic:claude-haiku-4-5")
    monkeypatch.setenv("JAS_ASSISTANT_MODEL", "anthropic:claude-haiku-4-5")
    stand_in(client, monkeypatch)
    identity = client.post("/api/investigations", json=authorization()).json()
    row = wait_for(client, identity["id"])
    assert row["status"] == "complete", row
    assert {call["model"] for call in row["ledger"] if call["analysis_id"]} == {
        "openai:gpt-6.1-sol"
    }
    assert {call["model"] for call in row["ledger"] if call["run_id"]} == {"openai:gpt-6-luna"}
    assert client.get("/api/settings").json()["assistant_model"] == "anthropic:claude-haiku-4-5"


def test_ordinary_followup_retains_investigation_summary_without_new_participant_execution(
    client, monkeypatch
):
    sent, _ = stand_in(client, monkeypatch)
    identity = client.post("/api/investigations", json=authorization()).json()
    complete = wait_for(client, identity["id"])
    assert complete["status"] == "complete"
    reply = client.post(
        "/api/chats",
        json={
            "chat_id": identity["chat_id"],
            "question": "Describe the preceding recorded result.",
            "context": "general",
        },
    )
    assert reply.status_code == 202
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        chat = client.get(f"/api/chats/{identity['chat_id']}").json()
        if chat[-1]["status"] == "complete":
            break
        time.sleep(0.01)
    assert chat[-1]["status"] == "complete"
    history = sent[-1]["prompt"]["conversation"]
    assert any(authorization()["question"] in json.dumps(message) for message in history)
    assert any("1 of 1 planned runs completed" in json.dumps(message) for message in history)
    assert any("small samples do not establish" in json.dumps(message) for message in history)
    assert len(chat) == 2 and chat[0]["id"] == identity["id"]
    assert client.get(f"/api/investigations/{identity['id']}").json() == complete
    assert len([call for call in sent if "you" in call["prompt"]]) == 1


def test_request_allowance_stops_before_rollout_and_retains_each_separate_charge(
    client, monkeypatch
):
    calls, _ = stand_in(client, monkeypatch)
    submitted = client.post("/api/investigations", json=authorization(max_requests=3))
    row = wait_for(client, submitted.json()["id"])
    assert row["status"] == "stopped", row
    assert row["stop_reason"] == "requests_allowance_exhausted", row
    assert len(calls) == row["requests"] == 3
    assert row["result"]["failed"] == row["result"]["missing"] == 1
    ledger = row["ledger"]
    assert len(ledger) == 3
    assert len({request["id"] for request in ledger}) == 3
    assert {request["purpose"] for request in ledger} == {"design"}
    assert all(request["status"] == "complete" for request in ledger)
    # FunctionModel's literal 100 input + 50 output at Sol's reviewed 2/10 prices.
    assert [request["charged"] for request in ledger] == [700, 700, 700]
    assert row["charged_usd"] == row["study_charged_usd"] == 0.0021
    settings = client.get("/api/settings").json()
    assert settings["usage"]["cost_usd"] == 0.0021
    run_id = row["attempts"][0]["run_ids"][0]
    assert client.get(f"/api/runs/{run_id}").json()["summary"]["turn"] == 0


def test_parent_request_allowance_applies_to_each_nested_participant_request(client, monkeypatch):
    async def inspect(fields, _prompt):
        if "operation" in fields:
            return {"operation": "observe", "read": None, "decision": None}

    sent, design = stand_in(client, monkeypatch, override=inspect)
    design["conditions"][0]["harness"] = {"kind": "tool_using", "version": "2.0.0"}
    identity = client.post(
        "/api/investigations",
        json=authorization(
            harnesses=["tool_using"],
            max_requests=4,
        ),
    ).json()
    row = wait_for(client, identity["id"])
    assert row["status"] == "stopped", row
    assert row["stop_reason"] == "requests_allowance_exhausted"
    assert row["requests"] == len(sent) == 4
    assert [call["charged"] for call in row["ledger"]] == [700, 700, 700, 35]
    assert row["charged_usd"] == row["study_charged_usd"] == 0.002135
    assert client.get("/api/settings").json()["usage"]["cost_usd"] == 0.002135
    run_id = row["attempts"][0]["run_ids"][0]
    run = client.get(f"/api/runs/{run_id}").json()
    assert run["summary"]["turn"] == 0
    assert run["summary"]["usage"]["requests"] == 1
    activation = run["activations"][0]
    assert activation["status"] == "failed"
    assert [(op["kind"], op["status"]) for op in activation["operations"]] == [
        ("observe", "complete")
    ]


def test_turn_allowance_commits_first_turn_then_refuses_second_before_send(client, monkeypatch):
    async def read(fields, _prompt):
        if "action" in fields:
            return {
                "action": {"kind": "read_artifact", "artifact": "measurement", "version": 1},
                "memory": "",
                "rationale": "Read the accessible record.",
                "forecast": None,
            }

    sent, design = stand_in(client, monkeypatch, override=read)
    design["rounds"] = 2
    identity = client.post("/api/investigations", json=authorization(max_rounds=2)).json()
    row = wait_for(client, identity["id"])
    assert row["status"] == "stopped" and row["stop_reason"] == "turns_allowance_exhausted", row
    assert row["turns"] == 1
    assert len(sent) == row["requests"] == 4
    run_id = row["attempts"][0]["run_ids"][0]
    run = client.get(f"/api/runs/{run_id}").json()
    assert run["summary"]["status"] == "failed"
    assert run["summary"]["turn"] == 1
    assert run["summary"]["usage"]["requests"] == 1
    assert row["result"]["missing"] == 1
    assert (
        client.post(
            f"/api/investigations/{identity['id']}/adapt", json={"instruction": "Continue"}
        ).status_code
        == 422
    )


@pytest.mark.parametrize("ceiling", ["budget_usd", "study_budget_usd"])
def test_refused_reservation_rolls_back_all_three_ceilings(client, monkeypatch, ceiling):
    calls, _ = stand_in(client, monkeypatch)
    submitted = client.post("/api/investigations", json=authorization(**{ceiling: 0}))
    row = wait_for(client, submitted.json()["id"])
    assert row["status"] == "stopped", row
    assert calls == [] and row["requests"] == 0
    assert row["charged_usd"] == row["study_charged_usd"] == 0
    assert client.get("/api/settings").json()["usage"]["cost_usd"] == 0
    assert client.get("/api/runs").json() == []


def test_pause_commits_inflight_turn_then_resume_continues_without_resubmission(
    client, monkeypatch
):
    entered, release = Event(), Event()

    async def block(fields, _prompt):
        if "action" in fields:
            entered.set()
            assert await asyncio.to_thread(release.wait, 5)

    calls, _ = stand_in(client, monkeypatch, override=block)
    identity = client.post("/api/investigations", json=authorization()).json()
    assert entered.wait(5)
    response = client.post(
        f"/api/investigations/{identity['id']}/control", json={"action": "pause"}
    )
    assert response.status_code == 200, response.text
    pending = client.post("/api/chats", json={"chat_id": identity["chat_id"], "question": "Hello"})
    assert pending.status_code == 422
    release.set()
    row = wait_for(client, identity["id"], statuses=("paused",))
    assert len(calls) == 4
    run_id = row["attempts"][0]["run_ids"][0]
    record = client.get(f"/api/runs/{run_id}").json()
    assert record["summary"]["status"] == "complete" and record["summary"]["turn"] == 1
    assert row["requests"] == 4
    # Read/reconnect is passive; only the explicit Resume permits subsequent analysis.
    assert client.get(f"/api/chats/{identity['chat_id']}").json()[0]["status"] == "pending"
    assert (
        client.post(
            f"/api/investigations/{identity['id']}/control", json={"action": "resume"}
        ).status_code
        == 200
    )
    final = wait_for(client, identity["id"])
    assert final["status"] == "complete", final
    assert len([call for call in calls if "you" in call["prompt"]]) == 1
    assert final["turns"] == 1


def test_restart_preserves_paused_checkpoint_and_requires_explicit_resume(tmp_path, monkeypatch):
    url = f"sqlite:///{tmp_path}/restart.sqlite3"
    entered, release = Event(), Event()

    async def block(fields, _prompt):
        if "action" in fields:
            entered.set()
            assert await asyncio.to_thread(release.wait, 5)

    with TestClient(create_app(url), base_url="http://localhost") as first:
        calls, _ = stand_in(first, monkeypatch, override=block)
        identity = first.post("/api/investigations", json=authorization()).json()
        assert entered.wait(5)
        first.post(f"/api/investigations/{identity['id']}/control", json={"action": "pause"})
        release.set()
        paused = wait_for(first, identity["id"], statuses=("paused",))
        assert paused["requests"] == len(calls) == 4
    with TestClient(create_app(url), base_url="http://localhost") as second:
        later, _ = stand_in(second, monkeypatch)
        restored = second.get(f"/api/investigations/{identity['id']}").json()
        assert restored["status"] == "paused", restored
        assert restored["requests"] == 4 and later == []
        assert restored["attempts"] == paused["attempts"]
        run_id = restored["attempts"][0]["run_ids"][0]
        assert second.get(f"/api/runs/{run_id}").json()["summary"]["turn"] == 1
        second.post(f"/api/investigations/{identity['id']}/control", json={"action": "resume"})
        completed = wait_for(second, identity["id"])
        assert completed["status"] == "complete", completed
        assert not any("you" in call["prompt"] for call in later)


def test_restart_retains_unknown_charge_and_does_not_resample_interrupted_turn(
    tmp_path, monkeypatch
):
    url = f"sqlite:///{tmp_path}/interrupted.sqlite3"
    entered = Event()

    async def interrupted(fields, _prompt):
        if "action" in fields:
            entered.set()
            await asyncio.Event().wait()

    with TestClient(create_app(url), base_url="http://localhost") as first:
        sent, _ = stand_in(first, monkeypatch, override=interrupted)
        identity = first.post("/api/investigations", json=authorization()).json()
        assert entered.wait(5)
        active = first.get(f"/api/investigations/{identity['id']}").json()
        assert active["requests"] == len(sent) == 4

    with TestClient(create_app(url), base_url="http://localhost") as second:
        later, _ = stand_in(second, monkeypatch)
        restored = second.get(f"/api/investigations/{identity['id']}").json()
        assert restored["status"] == "paused" and later == []
        unknown = [call for call in restored["ledger"] if call["status"] == "unknown"]
        assert len(unknown) == 1
        assert unknown[0]["charged"] == unknown[0]["reserved"] > 0
        retained = restored["charged_usd"]
        assert retained == restored["study_charged_usd"]
        assert second.get("/api/settings").json()["usage"]["cost_usd"] == retained

        response = second.post(
            f"/api/investigations/{identity['id']}/control",
            json={"action": "resume"},
        )
        assert response.status_code == 200, response.text
        stopped = wait_for(second, identity["id"])
        assert stopped["status"] == "stopped", stopped
        assert stopped["stop_reason"] == "interrupted_turn_requires_new_attempt"
        assert stopped["requests"] == 4 and later == []
        assert stopped["charged_usd"] == stopped["study_charged_usd"] == retained
        assert second.get("/api/settings").json()["usage"]["cost_usd"] == retained
        run_id = stopped["attempts"][0]["run_ids"][0]
        run = second.get(f"/api/runs/{run_id}").json()
        assert run["summary"]["turn"] == 0
        assert run["summary"]["usage"]["requests"] == 1
        assert stopped["result"]["missing"] == 1


def test_cancel_retains_one_unknown_request_and_all_ceilings_without_retries(client, monkeypatch):
    entered = Event()
    cancellation_seen, finish_cleanup = Event(), Event()

    async def blocked(fields, _prompt):
        if "action" in fields:
            entered.set()
            try:
                await asyncio.Event().wait()
            except asyncio.CancelledError:
                cancellation_seen.set()
                assert await asyncio.to_thread(finish_cleanup.wait, 5)
                raise

    sent, _ = stand_in(client, monkeypatch, override=blocked)
    identity = client.post("/api/investigations", json=authorization()).json()
    assert entered.wait(5)
    duplicate = client.post("/api/investigations", json=authorization(chat_id=identity["chat_id"]))
    assert duplicate.status_code == 422
    response = client.post(
        f"/api/investigations/{identity['id']}/control", json={"action": "cancel"}
    )
    assert response.status_code == 200, response.text
    assert cancellation_seen.wait(5)
    duplicate_cancel = client.post(
        f"/api/investigations/{identity['id']}/control", json={"action": "cancel"}
    )
    finish_cleanup.set()
    assert duplicate_cancel.status_code == 200, duplicate_cancel.text
    row = wait_for(client, identity["id"])
    assert row["status"] == "cancelled", row
    assert row["attempts"][0]["status"] == "cancelled"
    assert row["requests"] == len(sent) == 4
    unknown = [call for call in row["ledger"] if call["status"] == "unknown"]
    assert len(unknown) == 1 and unknown[0]["error"] == "CancelledError"
    assert unknown[0]["charged"] == unknown[0]["reserved"] > 0
    expected = 2100 + unknown[0]["reserved"]
    assert round(row["charged_usd"] * 1_000_000) == expected
    assert round(row["study_charged_usd"] * 1_000_000) == expected
    assert round(client.get("/api/settings").json()["usage"]["cost_usd"] * 1_000_000) == expected
    run_id = row["attempts"][0]["run_ids"][0]
    assert client.get(f"/api/runs/{run_id}").json()["summary"]["turn"] == 0
    assert client.post(f"/api/runs/{run_id}/control", json={"action": "start"}).status_code == 422
    assert (
        client.post(
            f"/api/investigations/{identity['id']}/control", json={"action": "resume"}
        ).status_code
        == 422
    )
    assert client.get(f"/api/investigations/{identity['id']}").json() == row
    assert len(sent) == 4


def test_provider_failure_stops_with_primary_error_and_retained_unknown_usage(client, monkeypatch):
    async def failed(fields, _prompt):
        if "action" in fields:
            raise RuntimeError("Controlled DEVELOPMENT provider failure")

    sent, _ = stand_in(client, monkeypatch, override=failed)
    identity = client.post("/api/investigations", json=authorization()).json()
    row = wait_for(client, identity["id"])
    assert row["status"] == "stopped", row
    assert "RuntimeError" in row["stop_reason"]
    assert "No retry or substitute" in row["stop_reason"]
    assert row["requests"] == len(sent) == 4
    unknown = [call for call in row["ledger"] if call["status"] == "unknown"]
    assert len(unknown) == 1 and unknown[0]["error"] == "RuntimeError"
    assert unknown[0]["charged"] == unknown[0]["reserved"] > 0
    assert row["charged_usd"] == row["study_charged_usd"]
    assert client.get("/api/settings").json()["usage"]["cost_usd"] == row["charged_usd"]
    assert row["result"]["failed"] == row["result"]["missing"] == 1
    run_id = row["attempts"][0]["run_ids"][0]
    run = client.get(f"/api/runs/{run_id}").json()
    assert run["summary"]["turn"] == 0
    assert "RuntimeError" in run["summary"]["error"]
    exported = client.get(f"/api/studies/{row['study_id']}/export").json()
    assert exported["requests"][-1]["error"] == "RuntimeError"


def test_explicit_exploratory_repair_retains_failed_attempt_and_original_authorization(
    client, monkeypatch
):
    failed = False
    entered, release = Event(), Event()

    async def fail_once(fields, _prompt):
        nonlocal failed
        if "action" in fields and not failed:
            failed = True
            raise RuntimeError("Controlled first attempt failure")
        if "action" in fields:
            entered.set()
            assert await asyncio.to_thread(release.wait, 5)

    sent, _ = stand_in(client, monkeypatch, override=fail_once)
    identity = client.post(
        "/api/investigations", json=authorization(max_runs=2, max_turns=2)
    ).json()
    stopped = wait_for(client, identity["id"])
    assert stopped["status"] == "stopped" and len(sent) == 4
    first = stopped["attempts"][0]
    response = client.post(
        f"/api/investigations/{identity['id']}/adapt",
        json={
            "instruction": "Keep the failed trajectory; use the same one-actor artifact protocol.",
        },
    )
    assert response.status_code == 202, response.text
    assert entered.wait(5)
    assert (
        client.post(
            f"/api/investigations/{identity['id']}/control", json={"action": "pause"}
        ).status_code
        == 200
    )
    release.set()
    wait_for(client, identity["id"], statuses=("paused",))
    assert client.get(f"/api/runs/{first['run_ids'][0]}").json()["summary"]["status"] == "failed"
    assert (
        client.post(
            f"/api/investigations/{identity['id']}/control", json={"action": "resume"}
        ).status_code
        == 200
    )
    row = wait_for(client, identity["id"])
    assert row["status"] == "complete", row
    assert row["authorization"] == stopped["authorization"]
    assert row["attempts"][0] == first
    assert [attempt["revision"] for attempt in row["attempts"]] == [1, 2]
    assert row["attempts"][1]["adaptation"]
    assert row["result"]["planned"] == 2
    assert row["result"]["complete"] == row["result"]["failed"] == row["result"]["missing"] == 1
    assert row["runs"] == row["turns"] == 2
    assert len([call for call in sent if "you" in call["prompt"]]) == 2
    assert row["ledger"][:4] == stopped["ledger"]
    assert row["ledger"][3]["status"] == "unknown"
    assert client.get(f"/api/runs/{first['run_ids'][0]}").json()["summary"]["turn"] == 0
    assert (
        client.post(
            f"/api/investigations/{identity['id']}/adapt", json={"instruction": "Again"}
        ).status_code
        == 422
    )
    exported = client.get(f"/api/studies/{row['study_id']}/export").json()
    assert [revision["number"] for revision in exported["revisions"]] == [1, 2]


def test_material_ambiguity_exposes_clarification_without_any_rollout(client, monkeypatch):
    question = "Which observable outcome should the artifact trajectory describe?"

    async def ambiguous(fields, _prompt):
        if "operationalization" in fields:
            return {
                "supported": True,
                "clarification": question,
                "intent": "exploratory",
                "explanation": "The outcome changes the required evidence.",
                "operationalization": "Await the user's outcome decision.",
                "size_rationale": "No trials before the missing decision.",
                "agents": 1,
                "conditions": 1,
                "seeds": 1,
                "repetitions": 1,
                "rounds": 1,
                "research_query": None,
                "requirements": [],
            }

    sent, _ = stand_in(client, monkeypatch, override=ambiguous)
    identity = client.post("/api/investigations", json=authorization()).json()
    row = wait_for(client, identity["id"])
    assert row["status"] == "stopped"
    assert row["stop_reason"] == "material_ambiguity_or_unsupported_scope"
    assert row["clarification"] == question
    assert len(sent) == row["requests"] == 1
    assert row["runs"] == row["turns"] == row["result"]["planned"] == 0
    assert client.get("/api/runs").json() == []
    attempt = row["attempts"][0]
    design_chat = client.get(f"/api/chats/{attempt['chat_id']}").json()
    assert design_chat[-1]["output"]["clarification"] == question


@pytest.mark.parametrize("factor", ["world", "harness", "model", "horizon"])
def test_checked_design_cannot_expand_authorized_rollout_scope(client, monkeypatch, factor):
    sent, design = stand_in(client, monkeypatch)
    scope = authorization()
    if factor == "world":
        scope["environments"] = ["information"]
        reason = "environment_outside_scope"
    elif factor == "harness":
        scope["harnesses"] = ["tool_using"]
        reason = "participant_identity_outside_scope"
    elif factor == "horizon":
        design["rounds"] = 2
        reason = "population_or_horizon_outside_scope"
    else:
        design["profiles"][0]["model"] = "openai:gpt-6.1-terra"
        reason = "participant_identity_outside_scope"
    identity = client.post("/api/investigations", json=scope).json()
    row = wait_for(client, identity["id"])
    assert row["status"] == "stopped" and row["stop_reason"] == reason, row
    assert row["runs"] == row["turns"] == 0
    assert client.get("/api/runs").json() == []
    assert not any("you" in call["prompt"] for call in sent)


def test_concurrent_investigations_cannot_overdraw_shared_workspace_allowance(
    tmp_path, monkeypatch
):
    with TestClient(
        create_app(f"sqlite:///{tmp_path}/contention.sqlite3", budget_usd=0.6),
        base_url="http://localhost",
    ) as client:

        async def blocked(_fields, _prompt):
            await asyncio.Event().wait()

        sent, _ = stand_in(client, monkeypatch, override=blocked)
        barrier = Barrier(2)

        def submit():
            barrier.wait(timeout=5)
            response = client.post("/api/investigations", json=authorization())
            assert response.status_code == 202, response.text
            return response.json()["id"]

        with ThreadPoolExecutor(max_workers=2) as workers:
            keys = list(workers.map(lambda _: submit(), range(2)))
        deadline = time.monotonic() + 5
        while time.monotonic() < deadline:
            rows = [client.get(f"/api/investigations/{key}").json() for key in keys]
            if any(row["status"] == "stopped" for row in rows):
                break
            time.sleep(0.01)
        assert {row["status"] for row in rows} == {"running", "stopped"}, rows
        winner = next(row for row in rows if row["status"] == "running")
        loser = next(row for row in rows if row["status"] == "stopped")
        assert len(sent) == winner["requests"] == 1
        assert loser["requests"] == loser["charged_usd"] == loser["study_charged_usd"] == 0
        reservation = winner["ledger"][0]["reserved"]
        assert 300_000 < reservation <= 600_000
        assert (
            round(client.get("/api/settings").json()["usage"]["cost_usd"] * 1_000_000)
            == reservation
        )
        client.post(f"/api/investigations/{winner['id']}/control", json={"action": "cancel"})
        cancelled = wait_for(client, winner["id"])
        assert cancelled["status"] == "cancelled"
        assert cancelled["ledger"][0]["status"] == "unknown"
        assert round(cancelled["charged_usd"] * 1_000_000) == reservation
        assert cancelled["study_charged_usd"] == cancelled["charged_usd"]
        assert len(sent) == 1


def test_ordinary_chat_design_and_saving_add_zero_participant_execution(client, monkeypatch):
    async def no_participants(fields, _prompt):
        if "action" in fields:
            pytest.fail("Ordinary chat or saving attempted a participant rollout")

    sent, _ = stand_in(client, monkeypatch, override=no_participants)
    for context in ["general", "new"]:
        accepted = client.post(
            "/api/chats",
            json={
                "question": authorization()["question"],
                "context": context,
            },
        )
        assert accepted.status_code == 202, accepted.text
        identity = accepted.json()
        deadline = time.monotonic() + 5
        while time.monotonic() < deadline:
            message = client.get(f"/api/analyses/{identity['id']}").json()
            if message["status"] != "pending":
                break
            time.sleep(0.01)
        assert message["status"] == "complete", message
        assert client.get("/api/runs").json() == []
    before = client.get("/api/settings").json()["usage"]
    saved = client.post(
        "/api/studies",
        json={
            "design": message["output"]["design"],
            "plan_id": identity["id"],
        },
    )
    assert saved.status_code == 201, saved.text
    detail = client.get(f"/api/studies/{saved.json()['id']}").json()
    assert len(detail["runs"]) == 1
    assert detail["runs"][0]["status"] == "ready" and detail["runs"][0]["turn"] == 0
    assert detail["runs"][0]["usage"]["requests"] == 0
    assert client.get("/api/settings").json()["usage"] == before
    assert not any("you" in call["prompt"] for call in sent)


def test_research_operation_allowance_stops_checks_before_rollout(client, monkeypatch):
    sent, _ = stand_in(client, monkeypatch)
    identity = client.post("/api/investigations", json=authorization(max_operations=1)).json()
    row = wait_for(client, identity["id"])
    assert row["status"] == "stopped" and row["stop_reason"] == "operations_allowance_exhausted", (
        row
    )
    assert row["operations"] == 1
    assert row["requests"] == len(sent) == 2
    assert row["runs"] == row["turns"] == 0
    assert client.get("/api/runs").json() == []


def test_authorized_pilot_adaptation_retains_both_revisions_and_recorded_feedback(
    client, monkeypatch
):
    drafts = 0

    async def change_seed(fields, _prompt):
        nonlocal drafts
        if "design" in fields:
            drafts += 1
            if drafts == 2:
                design["seeds"] = [229]

    sent, design = stand_in(client, monkeypatch, override=change_seed)
    identity = client.post(
        "/api/investigations",
        json=authorization(
            pilot=True,
            adapt_after_pilot=True,
            max_runs=2,
            max_turns=2,
        ),
    ).json()
    row = wait_for(client, identity["id"])
    assert row["status"] == "complete", row
    assert row["confirmation"] is None
    assert row["requests"] == len(sent) == 9
    assert [attempt["kind"] for attempt in row["attempts"]] == ["pilot", "exploratory"]
    feedback = row["attempts"][1]["adaptation"]
    assert feedback[0]["run_id"] == row["attempts"][0]["run_ids"][0]
    assert feedback[0]["through_turn"] == 1
    assert feedback[0]["phase"] == "exploratory_pilot"
    exported = client.get(f"/api/studies/{row['study_id']}/export").json()
    assert [revision["design"]["seeds"] for revision in exported["revisions"]] == [[227], [229]]
    assert row["attempts"][0]["design_hash"] != row["attempts"][1]["design_hash"]
    assert row["runs"] == row["turns"] == row["result"]["complete"] == 2


def test_confirmatory_trials_freeze_exact_decisions_after_retained_exploratory_pilot(
    client, monkeypatch
):
    entered, release = Event(), Event()
    participant_requests = 0

    async def confirming(fields, _prompt):
        nonlocal participant_requests
        if "operationalization" in fields:
            return {
                "supported": True,
                "intent": "confirmatory",
                "explanation": "One fixed endpoint.",
                "operationalization": "Count explicit terminal stops.",
                "size_rationale": "One fixed seed; no independent population inference.",
                "agents": 1,
                "conditions": 1,
                "seeds": 1,
                "repetitions": 1,
                "rounds": 1,
                "research_query": None,
                "requirements": [
                    {
                        "source": "artifact workspace",
                        "capability": "versioned_artifacts",
                        "mapping": "direct",
                        "explanation": "Installed mechanics.",
                    }
                ],
            }
        if "action" in fields:
            participant_requests += 1
            if participant_requests == 2:
                entered.set()
                assert await asyncio.to_thread(release.wait, 5)

    calls, design = stand_in(client, monkeypatch, override=confirming)
    design["hypothesis"] = (
        "Record whether the actor explicitly stops within its single opportunity."
    )
    identity = client.post(
        "/api/investigations",
        json=authorization(
            intent="confirmatory",
            pilot=True,
            max_runs=2,
            max_turns=2,
        ),
    ).json()
    assert entered.wait(5), wait_for(client, identity["id"])
    row = client.get(f"/api/investigations/{identity['id']}").json()
    frozen = row["confirmation"]
    assert frozen["revision"] == 2
    assert frozen["design"]["hypothesis"] == design["hypothesis"]
    assert [attempt["kind"] for attempt in row["attempts"]] == ["pilot", "confirmatory"]
    assert row["attempts"][0]["revision"] == 1
    assert row["attempts"][0]["status"] == "complete"
    assert frozen["run_ids"] == row["attempts"][1]["run_ids"]
    release.set()
    final = wait_for(client, identity["id"])
    assert final["status"] == "complete" and final["result"]["complete"] == 2
    assert final["confirmation"] == frozen
    exported = client.get(f"/api/studies/{row['study_id']}/export").json()
    assert [revision["number"] for revision in exported["revisions"]] == [1, 2]
    assert len([call for call in calls if "you" in call["prompt"]]) == 2
    change = client.post(f"/api/studies/{row['study_id']}/revisions", json={"design": design})
    assert change.status_code == 422
    assert (
        client.post(
            f"/api/investigations/{identity['id']}/adapt",
            json={"instruction": "Change the endpoint"},
        ).status_code
        == 422
    )
    assert client.get(f"/api/investigations/{identity['id']}").json()["confirmation"] == frozen


@pytest.fixture(autouse=True)
def retained_public_evidence(request, monkeypatch):
    """Retain HTTP evidence at the same public boundary used by the assertions."""
    if not (directory := os.getenv("JAS_T14_EVIDENCE")):
        return
    target = Path(directory) / (request.node.name.replace("/", "_") + ".jsonl")
    original = TestClient.request

    def recorded(self, method, url, **kwargs):
        response = original(self, method, url, **kwargs)
        with target.open("a") as stream:
            stream.write(
                json.dumps(
                    {
                        "method": method,
                        "url": str(url),
                        "body": kwargs.get("json"),
                        "status": response.status_code,
                        "response": response.json(),
                    }
                )
                + "\n"
            )
        return response

    monkeypatch.setattr(TestClient, "request", recorded)
