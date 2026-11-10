"""T04 DEVELOPMENT cases at the approved public workflow/provider seams."""

import asyncio
import json
import time

import pytest
from agent_sim.api import create_app
from agent_sim.templates import templates
from fastapi.testclient import TestClient
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.models.function import FunctionModel
from pydantic_ai.usage import RequestUsage


def decision():
    return {
        "action": {
            "kind": "contribute",
            "amount": 2,
            "target": "",
            "message": "",
            "report": None,
            "promise": None,
        },
        "memory": "",
        "rationale": "Choose an available contribution.",
        "forecast": None,
    }


@pytest.fixture
def harness_client(tmp_path, monkeypatch):
    prompts = []

    async def respond(messages, info):
        prompt = json.loads(messages[-1].parts[0].content)
        prompts.append(prompt)
        if "operations" in prompt:
            operation = ["observe", "rules", "legal_options", "decide"][len(prompt["operations"])]
            value = {
                "operation": operation,
                "decision": decision() if operation == "decide" else None,
            }
        else:
            value = decision()
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, value)],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
            model_name="t04-deterministic-v1",
        )

    app = create_app(f"sqlite:///{tmp_path}/harness.sqlite3", static_dir=tmp_path / "static")
    provider = FunctionModel(function=respond)
    monkeypatch.setattr(app.state.models, "model", lambda _name: provider)
    with TestClient(app, base_url="http://localhost") as client:
        yield client, prompts


def step(client, run_id):
    assert client.post(f"/api/runs/{run_id}/control", json={"action": "step"}).status_code == 200
    return wait_finished(client, run_id)


def wait_finished(client, run_id):
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        run = client.get(f"/api/runs/{run_id}").json()
        if run["summary"]["status"] not in {"queued", "running", "pausing"}:
            return run
        time.sleep(0.005)
    pytest.fail("Activation did not finish")


def protocol(design, *, kind="tool_using", **limits):
    value = design.model_dump()
    value["profiles"] = value["profiles"][:2]
    value["rounds"] = 1
    value["conditions"][0]["parameters"]["endowment"] = 10
    value["conditions"][0]["harness"] = {"kind": kind, **limits}
    return value


def save(client, value):
    saved = client.post("/api/studies", json={"design": value})
    assert saved.status_code == 201, saved.text
    study = client.get(f"/api/studies/{saved.json()['id']}").json()
    return study, next(
        r["id"] for r in study["runs"] if r["condition_key"] == value["conditions"][0]["key"]
    )


def test_two_policies_run_real_operations_with_individual_accounting(harness_client, design):
    client, prompts = harness_client
    value = protocol(design, kind="direct_action")
    tool = {
        **value["conditions"][0],
        "key": "tools",
        "name": "Tool policy",
        "harness": {"kind": "tool_using"},
    }
    value["conditions"].append(tool)
    study, direct_id = save(client, value)
    tool_id = next(r["id"] for r in study["runs"] if r["condition_key"] == "tools")
    assert client.get("/api/settings").json()["usage"]["requests"] == 0
    direct, capable = step(client, direct_id), step(client, tool_id)
    assert direct["summary"]["turn"] == capable["summary"]["turn"] == 1
    assert direct["summary"]["usage"]["requests"] == 1
    assert capable["summary"]["usage"]["requests"] == 4
    activation = capable["activations"][0]
    assert activation["status"] == "committed"
    assert activation["stop_reason"] == "decision_committed"
    assert [op["kind"] for op in activation["operations"]] == [
        "observe",
        "rules",
        "legal_options",
        "decide",
        "settle",
    ]
    assert activation["identity"]["model"] == "openai:gpt-6-luna"
    assert activation["identity"]["harness"]["version"] == "1.0.0"
    assert activation["identity"]["harness"]["max_requests"] == 4
    assert len(capable["requests"]) == 4
    assert all(r["activation_id"] == activation["id"] for r in capable["requests"])
    observed = activation["operations"][0]["result"]
    assert observed["you"]["key"] == activation["actor"]
    assert observed["public_signals"] == {}
    assert "signals" not in observed and "checkpoint" not in observed
    assert activation["operations"][1]["result"] == observed["rules"]
    assert activation["operations"][2]["result"] == observed["legal_actions"]
    assert prompts[0]["you"]["key"] == direct["turns"][0]["actor"]
    assert prompts[1]["operations"] == []
    for run_id in [direct_id, tool_id]:
        assert client.post(f"/api/runs/{run_id}/verify").json()["verified_turns"] == 1
    exported = client.get(f"/api/studies/{study['id']}/export").json()
    assert exported["version"] == 5
    assert len(exported["activations"]) == 2
    assert len(exported["requests"]) == 5


@pytest.mark.parametrize(
    ("limits", "reason", "requests", "statuses"),
    [
        ({"max_requests": 1}, "request_limit", 1, ["complete"]),
        ({"max_tool_operations": 1}, "tool_limit", 2, ["complete", "rejected"]),
        ({"tools": ["rules"]}, "invalid_operation", 1, ["rejected"]),
    ],
)
def test_effort_or_permission_failure_retains_attempt_without_settling_action(
    harness_client, design, limits, reason, requests, statuses
):
    client, _ = harness_client
    study, run_id = save(client, protocol(design, **limits))
    before = client.get(f"/api/runs/{run_id}").json()["state"]
    run = step(client, run_id)
    assert run["summary"]["status"] == "failed"
    assert run["summary"]["turn"] == 0
    assert run["state"] == before
    assert run["summary"]["usage"]["requests"] == requests
    activation = run["activations"][0]
    assert activation["status"] == "failed" and activation["stop_reason"] == reason
    assert [op["status"] for op in activation["operations"]] == statuses
    exported = client.get(f"/api/studies/{study['id']}/export").json()
    assert exported["activations"] == run["activations"]
    assert len(exported["requests"]) == requests


def test_auxiliary_provider_failure_is_retained_without_retry(harness_client, design, monkeypatch):
    client, prompts = harness_client
    provider = client.app.state.models.model("openai:gpt-6-luna")
    respond = provider.function

    async def fail_second(messages, info):
        if len(prompts) == 1:
            raise TimeoutError("controlled auxiliary failure")
        return await respond(messages, info)

    monkeypatch.setattr(provider, "function", fail_second)
    _, run_id = save(client, protocol(design))
    run = step(client, run_id)
    assert run["summary"]["status"] == "failed" and run["summary"]["turn"] == 0
    assert run["summary"]["usage"]["requests"] == 2
    assert run["summary"]["usage"]["partial"] is True
    activation = run["activations"][0]
    assert activation["stop_reason"] == "provider_failure"
    assert len(activation["operations"]) == 1
    assert [r["status"] for r in run["requests"]] == ["complete", "unknown"]
    request = client.get(f"/api/requests/{run['requests'][1]['id']}").json()
    assert request["activation_id"] == activation["id"]
    assert request["error"] == "TimeoutError"


@pytest.mark.parametrize("ceiling", ["workspace", "study"])
def test_each_auxiliary_inference_rechecks_the_atomic_ceiling_before_sending(
    harness_client, design, monkeypatch, ceiling
):
    from agent_sim.db import Study, Workspace

    client, prompts = harness_client
    provider = client.app.state.models.model("openai:gpt-6-luna")
    respond = provider.function
    study, run_id = save(client, protocol(design))

    async def exhaust_allowance(messages, info):
        # Approved accounting fixture: revoke further allowance during the first
        # in-flight request. Inspect all resulting behavior through the public API.
        with client.app.state.db.session.begin() as session:
            row = session.get_one(Workspace, 1) if ceiling == "workspace" else session.get_one(
                Study, study["id"]
            )
            row.ceiling = 0
        return await respond(messages, info)

    monkeypatch.setattr(provider, "function", exhaust_allowance)
    run = step(client, run_id)
    assert run["summary"]["status"] == "failed" and run["summary"]["turn"] == 0
    assert len(prompts) == 1
    assert run["summary"]["usage"]["requests"] == 1
    assert run["summary"]["usage"]["cost_usd"] == 0.000035
    assert run["summary"]["usage"]["partial"] is False
    activation = run["activations"][0]
    assert activation["requests"] == 2 and activation["stop_reason"] == "provider_failure"
    assert "No request was sent" in activation["error"]
    assert [op["kind"] for op in activation["operations"]] == ["observe"]
    exported = client.get(f"/api/studies/{study['id']}/export").json()
    assert len(exported["requests"]) == 1 and exported["requests"][0]["status"] == "complete"


def test_pause_during_the_tool_policys_final_request_commits_the_decision(
    harness_client, design, monkeypatch
):
    client, prompts = harness_client
    provider = client.app.state.models.model("openai:gpt-6-luna")
    respond = provider.function
    entered, release = client.portal.call(asyncio.Event), client.portal.call(asyncio.Event)

    async def delayed_final(messages, info):
        if len(prompts) == 3:
            entered.set()
            await release.wait()
        return await respond(messages, info)

    monkeypatch.setattr(provider, "function", delayed_final)
    _, run_id = save(client, protocol(design))
    client.post(f"/api/runs/{run_id}/control", json={"action": "start"})
    client.portal.call(asyncio.wait_for, entered.wait(), 5)
    client.post(f"/api/runs/{run_id}/control", json={"action": "pause"})
    client.portal.call(release.set)
    run = wait_finished(client, run_id)
    assert run["summary"]["status"] == "paused" and run["summary"]["turn"] == 1
    assert run["summary"]["usage"]["requests"] == 4
    assert len(run["activations"]) == 1
    assert run["activations"][0]["status"] == "committed"
    assert run["activations"][0]["operations"][-1]["kind"] == "settle"
    assert client.post(f"/api/runs/{run_id}/verify").json()["verified_turns"] == 1


def test_paused_activation_resumes_with_same_identity_and_remaining_effort(
    harness_client, design, monkeypatch
):
    client, prompts = harness_client
    provider = client.app.state.models.model("openai:gpt-6-luna")
    respond = provider.function
    entered, release = client.portal.call(asyncio.Event), client.portal.call(asyncio.Event)

    async def delayed(messages, info):
        if not prompts:
            entered.set()
            await release.wait()
        return await respond(messages, info)

    monkeypatch.setattr(provider, "function", delayed)
    _, run_id = save(client, protocol(design))
    assert client.post(f"/api/runs/{run_id}/control", json={"action": "step"}).status_code == 200
    client.portal.call(entered.wait)
    # Repeated starts cannot acquire a second writer while the provider is in flight.
    assert client.post(f"/api/runs/{run_id}/control", json={"action": "start"}).status_code == 200
    assert client.post(f"/api/runs/{run_id}/control", json={"action": "pause"}).status_code == 200
    client.portal.call(release.set)
    paused = wait_finished(client, run_id)
    activation = paused["activations"][0]
    assert paused["summary"]["turn"] == 0 and paused["summary"]["usage"]["requests"] == 1
    assert activation["status"] == "paused" and activation["stop_reason"] == "pause_requested"
    resumed = step(client, run_id)
    assert resumed["summary"]["turn"] == 1
    assert resumed["summary"]["usage"]["requests"] == 4
    assert len(resumed["activations"]) == 1
    assert resumed["activations"][0]["id"] == activation["id"]
    assert resumed["activations"][0]["identity"] == activation["identity"]
    assert client.post(f"/api/runs/{run_id}/verify").json()["verified_turns"] == 1


def test_completed_activation_exposes_settled_final_effect_separately_from_proposal(
    harness_client, design
):
    client, _ = harness_client
    _, run_id = save(client, protocol(design))
    run = step(client, run_id)
    # Complete the second participant: each kept 8 and receives a 4-credit dividend.
    run = step(client, run_id)
    assert run["summary"]["status"] == "complete"
    assert run["state"]["balances"] == {"alex": 12.0, "morgan": 12.0}
    for activation in run["activations"]:
        final = activation["operations"][-1]
        assert activation["operations"][-2]["kind"] == "decide"
        assert activation["operations"][-2]["result"] is None
        assert final["kind"] == "settle"
        assert final["result"] == {
            "settled_turn": activation["turn"],
            "state_hash": client.get(f"/api/runs/{run_id}/turns/{activation['turn']}").json()[
                "state_hash"
            ],
        }


def test_review_counts_harness_as_a_declared_factor_independent_of_model_and_world(
    harness_client, design
):
    client, _ = harness_client
    value = protocol(design, kind="direct_action")
    value["conditions"].append(
        {
            **value["conditions"][0],
            "key": "tools",
            "name": "Tools",
            "harness": {"kind": "tool_using"},
        }
    )
    response = client.post("/api/design/preflight", json={"design": value})
    assert response.status_code == 200, response.text
    preflight = response.json()
    assert preflight["condition_grid"]["observed_cells"] == 2
    assert any(
        "harness.kind" in factor["fields"] for factor in preflight["condition_grid"]["factors"]
    )
    assert "kind" in preflight["comparisons"][0]["changed_harness"]
    assert client.get("/api/settings").json()["usage"]["requests"] == 0


@pytest.mark.parametrize(
    "harness",
    [
        {"kind": "tool_using", "version": "0.9.0"},
        {"kind": "tool_using", "max_requests": 9},
        {"kind": "tool_using", "max_tool_operations": 13},
        {"kind": "tool_using", "tools": ["observe", "observe"]},
        {"kind": "tool_using", "tools": ["other_actor"]},
        {"kind": "direct_action", "max_requests": 2},
    ],
)
def test_unsupported_harness_contract_is_rejected_before_saving_or_spending(
    harness_client, design, harness
):
    client, _ = harness_client
    value = protocol(design)
    value["conditions"][0]["harness"] = harness
    assert client.post("/api/studies", json={"design": value}).status_code == 422
    assert client.get("/api/studies").json() == []
    assert client.get("/api/settings").json()["usage"]["requests"] == 0


def test_cancellation_during_auxiliary_request_keeps_unknown_usage_and_failed_attempt(
    harness_client, design, monkeypatch
):
    client, prompts = harness_client
    provider = client.app.state.models.model("openai:gpt-6-luna")
    respond = provider.function

    async def cancelled(messages, info):
        if len(prompts) == 1:
            raise asyncio.CancelledError()
        return await respond(messages, info)

    monkeypatch.setattr(provider, "function", cancelled)
    study, run_id = save(client, protocol(design))
    before = client.get(f"/api/runs/{run_id}").json()["state"]
    run = step(client, run_id)
    assert run["summary"]["status"] == "paused"
    assert run["summary"]["usage"]["requests"] == 2
    assert run["summary"]["usage"]["partial"] is True
    assert run["summary"]["turn"] == 0 and run["state"] == before
    assert run["activations"][0]["status"] == "interrupted"
    assert run["activations"][0]["stop_reason"] == "cancelled"
    assert run["requests"][-1]["status"] == "unknown"
    exported = client.get(f"/api/studies/{study['id']}/export").json()
    assert exported["requests"][-1]["error"] == "CancelledError"
    assert exported["requests"][-1]["cost_usd"] > 0


@pytest.mark.parametrize("failure", [TimeoutError, asyncio.CancelledError])
def test_auxiliary_settlement_failure_does_not_replace_primary_failure(
    harness_client, design, monkeypatch, failure
):
    client, prompts = harness_client
    provider = client.app.state.models.model("openai:gpt-6-luna")
    respond = provider.function
    settle = client.app.state.models._settle

    async def failed(messages, info):
        if len(prompts) == 1:
            raise failure()
        return await respond(messages, info)

    def failed_settlement(call, messages, error):
        if error:
            raise RuntimeError("controlled settlement failure")
        return settle(call, messages, error)

    monkeypatch.setattr(provider, "function", failed)
    monkeypatch.setattr(client.app.state.models, "_settle", failed_settlement)
    _, run_id = save(client, protocol(design))
    run = step(client, run_id)
    assert run["summary"]["turn"] == 0
    assert run["summary"]["usage"]["requests"] == 2
    assert run["summary"]["usage"]["partial"] is True
    assert run["requests"][-1]["status"] == "pending"
    assert "RuntimeError" not in run["summary"]["error"]
    expected = "cancelled" if failure.__name__ == "CancelledError" else "provider_failure"
    assert run["activations"][0]["stop_reason"] == expected


def test_tool_actor_selectors_and_other_private_profiles_cannot_reach_provider(
    harness_client, design, monkeypatch
):
    client, _ = harness_client
    provider = client.app.state.models.model("openai:gpt-6-luna")
    seen = []

    async def forbidden(messages, info):
        seen.append(json.loads(messages[-1].parts[0].content))
        return ModelResponse(
            parts=[
                ToolCallPart(
                    info.output_tools[0].name,
                    {
                        "operation": "observe",
                        "decision": None,
                        "actor": "morgan",
                    },
                )
            ],
            usage=RequestUsage(input_tokens=20, output_tokens=10),
        )

    monkeypatch.setattr(provider, "function", forbidden)
    value = protocol(design)
    value["profiles"][1]["goal"] = "other-private-goal-canary"
    _, run_id = save(client, value)
    run = step(client, run_id)
    assert run["activations"][0]["actor"] == "alex"
    assert "other-private-goal-canary" not in json.dumps(seen)
    assert run["summary"]["turn"] == 0
    assert run["activations"][0]["operations"] == []
    assert len(run["requests"]) == 1 and run["requests"][0]["status"] == "failed"


def test_paused_actor_session_survives_restart_without_resetting_its_effort(
    tmp_path, monkeypatch, design
):
    url = f"sqlite:///{tmp_path}/restart.sqlite3"
    entered, release = asyncio.Event(), asyncio.Event()
    gate = True

    async def respond(messages, info):
        prompt = json.loads(messages[-1].parts[0].content)
        if gate:
            entered.set()
            await release.wait()
        return ModelResponse(
            parts=[
                ToolCallPart(
                    info.output_tools[0].name,
                    {
                        "operation": "decide" if prompt["operations"] else "observe",
                        "decision": decision() if prompt["operations"] else None,
                    },
                )
            ],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    model = FunctionModel(function=respond)
    app = create_app(url, static_dir=tmp_path / "static")
    monkeypatch.setattr(app.state.models, "model", lambda _: model)
    with TestClient(app, base_url="http://localhost") as client:
        _, run_id = save(client, protocol(design, max_requests=2))
        client.post(f"/api/runs/{run_id}/control", json={"action": "step"})
        assert client.portal is not None
        client.portal.call(asyncio.wait_for, entered.wait(), 5)
        client.post(f"/api/runs/{run_id}/control", json={"action": "pause"})
        client.portal.call(release.set)
        before = wait_finished(client, run_id)
    gate = False
    restarted = create_app(url, static_dir=tmp_path / "static")
    monkeypatch.setattr(restarted.state.models, "model", lambda _: model)
    with TestClient(restarted, base_url="http://localhost") as client:
        restored = client.get(f"/api/runs/{run_id}").json()
        assert restored["summary"]["status"] == "paused"
        assert restored["summary"]["usage"] == before["summary"]["usage"]
        assert restored["activations"] == before["activations"]
        run = step(client, run_id)
        assert run["summary"]["turn"] == 1 and run["summary"]["usage"]["requests"] == 2
        assert len(run["activations"]) == 1
        assert run["activations"][0]["id"] == before["activations"][0]["id"]
        assert run["activations"][0]["requests"] == 2
        assert [op["kind"] for op in run["activations"][0]["operations"]] == [
            "observe",
            "pause",
            "decide",
            "settle",
        ]
        assert client.post(f"/api/runs/{run_id}/verify").json()["verified_turns"] == 1


def test_restart_retains_inflight_activation_and_unknown_reservation_without_sending(
    runtime, design
):
    # Approved provider/accounting seam: a crash-window fixture, no real request.
    from agent_sim.db import ParticipantActivation, ProviderCall, Run, Study, Workspace, digest
    from agent_sim.execution import Engine

    db, models, research, _ = runtime
    study_id = research.save_design(design)
    run_id = research.study(study_id)["runs"][0]["id"]
    with db.session.begin() as session:
        run = session.get_one(Run, run_id)
        checkpoint = run.checkpoint
        run.status = "running"
        activation = ParticipantActivation(
            run_id=run_id,
            turn=1,
            round=1,
            actor="alex",
            requests=1,
            observation={},
            identity={},
            checkpoint_hash=digest(checkpoint),
        )
        session.add(activation)
        session.flush()
        activation_id = activation.id
        session.add(
            ProviderCall(
                run_id=run_id,
                study_id=study_id,
                activation_id=activation_id,
                purpose="participant_operation",
                model="openai:gpt-6-luna",
                turn=1,
                reserved=100,
                charged=100,
            )
        )
        session.get_one(Workspace, 1).charged = 100
        session.get_one(Study, study_id).charged = 100
    engine = Engine(db, research, models)
    run = research.run(run_id)
    assert not engine.executions
    assert run["summary"]["status"] == "paused" and run["summary"]["turn"] == 0
    assert run["state"] == checkpoint
    assert run["requests"][0]["status"] == "unknown"
    assert run["summary"]["usage"]["cost_usd"] == 0.0001
    assert run["activations"][0]["id"] == activation_id
    assert run["activations"][0]["status"] == "interrupted"
    assert run["activations"][0]["stop_reason"] == "server_restart"


@pytest.mark.parametrize("template", templates(), ids=lambda row: row["id"])
def test_tool_policy_runs_existing_worlds_and_keeps_profile_model_assignment_independent(
    tmp_path, monkeypatch, template
):
    from conftest import decision_for

    async def respond(messages, info):
        prompt = json.loads(messages[-1].parts[0].content)
        read = prompt["operations"]
        output = {
            "operation": "decide" if read else "observe",
            "decision": decision_for(read[0]["result"]) if read else None,
        }
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, output)],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    app = create_app(f"sqlite:///{tmp_path}/world.sqlite3", static_dir=tmp_path / "static")
    model = FunctionModel(function=respond)
    monkeypatch.setattr(app.state.models, "model", lambda _: model)
    value = template["design"] | {"rounds": 1, "seeds": [79]}
    value["conditions"] = [
        {
            **value["conditions"][0],
            "harness": {
                "kind": "tool_using",
                "max_requests": 2,
                "max_tool_operations": 1,
                "tools": ["observe"],
            },
        }
    ]
    value["profiles"] = [dict(p) for p in value["profiles"]]
    value["profiles"][0]["model"] = "anthropic:claude-haiku-4-5"
    with TestClient(app, base_url="http://localhost") as client:
        _, run_id = save(client, value)
        client.post(f"/api/runs/{run_id}/control", json={"action": "start"})
        run = wait_finished(client, run_id)
        assert run["summary"]["status"] == "complete", run["summary"]["error"]
        assert run["summary"]["usage"]["requests"] == run["summary"]["turn"] * 2
        assert (
            client.post(f"/api/runs/{run_id}/verify").json()["verified_turns"]
            == run["summary"]["turn"]
        )
        assignments = {
            p["key"]: p["model"] or value["conditions"][0]["model"] for p in value["profiles"]
        }
        assert {a["actor"]: a["identity"]["model"] for a in run["activations"]} == assignments
