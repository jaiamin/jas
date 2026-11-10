"""T08 DEVELOPMENT: public workflows, with external providers replaced only."""

import asyncio
import json

import pytest
from agent_sim.api import create_app
from fastapi.testclient import TestClient
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.models.function import FunctionModel
from pydantic_ai.usage import RequestUsage
from test_participant_harnesses import decision, protocol, save, step, wait_finished


@pytest.fixture
def context_client(tmp_path, monkeypatch):
    responses, prompts = [], []

    async def respond(messages, info):
        prompt = json.loads(messages[-1].parts[0].content)
        prompts.append(prompt)
        value = responses.pop(0)
        if callable(value):
            value = value(prompt)
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, value)],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
            model_name="t08-neutral-deterministic-v1",
        )

    app = create_app(f"sqlite:///{tmp_path}/context.sqlite3", static_dir=tmp_path / "static")
    provider = FunctionModel(function=respond)
    monkeypatch.setattr(app.state.models, "model", lambda _: provider)
    with TestClient(app, base_url="http://localhost") as client:
        yield client, responses, prompts


def request(operation, **payload):
    return {"operation": operation, "decision": None, **payload}


def finish():
    return request("decide", decision=decision())


def test_actor_can_choose_a_persistent_plan_without_claiming_a_world_fact(context_client, design):
    client, responses, prompts = context_client
    responses.extend(
        [
            request(
                "plan",
                plan={"text": "Check the permitted budget before choosing.", "source_ids": []},
            ),
            finish(),
        ]
    )
    value = protocol(design, max_requests=2, max_tool_operations=1)
    _, run_id = save(client, value)
    run = step(client, run_id)
    assert run["summary"]["turn"] == 1, run["summary"]["error"]
    receipt = run["activations"][0]["operations"][0]
    assert receipt["kind"] == "plan" and receipt["status"] == "complete"
    artifact = receipt["result"]["artifact"]
    assert artifact["text"] == "Check the permitted budget before choosing."
    assert artifact["visibility"] == "actor" and artifact["epistemic_status"] == "self_report"
    assert artifact["cutoff"]["turn"] == 0
    assert prompts[1]["operations"][0]["result"] == receipt["result"]
    assert run["state"]["notes"][run["activations"][0]["actor"]] == ""
    assert len(run["requests"]) == 2
    assert client.post(f"/api/runs/{run_id}/verify").json()["verified_turns"] == 1


@pytest.mark.parametrize("memory", ["episodic", "notes", "history", "none"])
def test_retained_plans_and_retrieved_sources_respect_memory_policy(context_client, design, memory):
    client, responses, prompts = context_client
    own = decision() | {"memory": "own-note-canary"}
    other = decision() | {"memory": "foreign-note-canary"}
    responses.extend(
        [
            request("plan", plan={"text": "own-plan-canary", "source_ids": []}),
            request("decide", decision=own),
            request("plan", plan={"text": "foreign-plan-canary", "source_ids": []}),
            request("decide", decision=other),
            request("retrieve", retrieval={"query": "", "limit": 8}),
            finish(),
        ]
    )
    value = protocol(design, max_requests=3)
    value["rounds"] = 2
    value["conditions"][0]["parameters"]["memory"] = memory
    _, run_id = save(client, value)
    step(client, run_id)
    step(client, run_id)
    run = step(client, run_id)
    assert run["summary"]["turn"] == 3, run["summary"]["error"]
    actor_prompt = prompts[4]
    assert "foreign-note-canary" not in json.dumps(actor_prompt)
    assert "foreign-plan-canary" not in json.dumps(actor_prompt)
    retained = actor_prompt["retained_artifacts"]
    assert bool(retained) == (memory in {"episodic", "notes"})
    items = run["activations"][2]["operations"][0]["result"]["items"]
    serialized = json.dumps(items)
    assert ("own-note-canary" in serialized) == (memory in {"episodic", "notes"})
    assert ("own-plan-canary" in serialized) == (memory in {"episodic", "notes"})
    assert "foreign-note-canary" not in serialized and "foreign-plan-canary" not in serialized
    if memory == "none":
        assert items == []
    for source in items:
        assert source["id"] and len(source["sha256"]) == 64
        assert source["cutoff"]["turn"] <= 2
        assert source["origin"]["activation_id"]
    assert client.post(f"/api/runs/{run_id}/verify").json()["verified_turns"] == 3


def test_investigation_and_verification_use_accessible_sources_without_settling(
    context_client, design
):
    client, responses, prompts = context_client
    invalid = decision()
    invalid["action"]["amount"] = 11

    def check_source(prompt):
        source = prompt["operations"][0]["result"]["source"]
        return request(
            "verify",
            verification={
                "proposed": invalid,
                "checks": [{"source_id": source["id"], "quote": "contribute"}],
            },
        )

    responses.extend(
        [
            request("investigate", investigation={"facet": "legal_options"}),
            check_source,
            request("verify", verification={"proposed": decision(), "checks": []}),
            finish(),
        ]
    )
    _, run_id = save(client, protocol(design))
    run = step(client, run_id)
    assert run["summary"]["turn"] == 1, run["summary"]["error"]
    journal = run["activations"][0]["operations"]
    assert [op["kind"] for op in journal] == ["investigate", "verify", "verify", "decide", "settle"]
    source = journal[0]["result"]["source"]
    assert source["content"][0]["kind"] == "contribute"
    assert source["cutoff"]["turn"] == 0
    rejected, valid = journal[1]["result"], journal[2]["result"]
    assert rejected["schema_valid"] is False and valid["schema_valid"] is True
    assert rejected["checks"][0]["quote_present"] is True
    assert rejected["checks"][0]["source"]["sha256"] == source["sha256"]
    assert valid["scope"] == "actor_legal_schema_and_source_quotes"
    assert all(p["context_cutoff"]["turn"] == 0 for p in prompts)
    assert len(run["events"]) == 1  # Only the final contribution, no hypothetical effects.
    turn = client.get(f"/api/runs/{run_id}/turns/1").json()
    assert turn["decision"]["action"]["amount"] == 2
    assert len(run["requests"]) == 4


def test_context_budget_retains_receipts_without_unbounded_repeated_payloads(
    context_client, design
):
    client, responses, prompts = context_client
    responses.extend(
        [
            request("plan", plan={"text": "long intentional note " * 80, "source_ids": []}),
            request("plan", plan={"text": "another intentional note " * 70, "source_ids": []}),
            request("observe"),
            finish(),
        ]
    )
    _, run_id = save(client, protocol(design, max_context_chars=4000))
    run = step(client, run_id)
    assert run["summary"]["turn"] == 1, run["summary"]["error"]
    assert all(len(json.dumps(prompt)) <= 4000 for prompt in prompts)
    assert any(op.get("receipt") for op in prompts[-1]["operations"])
    journal = run["activations"][0]["operations"]
    assert journal[0]["result"]["artifact"]["text"] == "long intentional note " * 80
    assert journal[1]["result"]["artifact"]["text"] == "another intentional note " * 70
    assert len(run["requests"]) == 4


def test_actor_can_check_its_current_plan_as_self_report_without_cross_turn_memory(
    context_client, design
):
    client, responses, _ = context_client

    def check_plan(prompt):
        artifact = prompt["operations"][0]["result"]["artifact"]
        return request(
            "verify",
            verification={
                "proposed": decision(),
                "checks": [{"source_id": artifact["id"], "quote": "provisional"}],
            },
        )

    responses.extend(
        [
            request(
                "plan",
                plan={"text": "A provisional claim, not established truth.", "source_ids": []},
            ),
            check_plan,
            finish(),
        ]
    )
    value = protocol(design, max_requests=3)
    value["conditions"][0]["parameters"]["memory"] = "none"
    _, run_id = save(client, value)
    run = step(client, run_id)
    assert run["summary"]["turn"] == 1, run["summary"]["error"]
    check = run["activations"][0]["operations"][1]["result"]["checks"][0]
    assert check["quote_present"] is True
    assert check["source"]["epistemic_status"] == "self_report"


@pytest.mark.parametrize(
    ("capability", "operation", "payload"),
    [
        ("planning", "plan", {"plan": {"text": "Intentional artifact", "source_ids": []}}),
        ("memory", "retrieve", {"retrieval": {"query": ""}}),
        ("investigation", "investigate", {"investigation": {"facet": "state"}}),
        ("verification", "verify", {"verification": {"proposed": decision(), "checks": []}}),
    ],
)
def test_disabled_capability_stops_explicitly_without_substitution(
    context_client, design, capability, operation, payload
):
    client, responses, prompts = context_client
    responses.extend([request(operation, **payload), finish()])
    _, run_id = save(client, protocol(design, capabilities={capability: "disabled"}))
    before = client.get(f"/api/runs/{run_id}").json()["state"]
    run = step(client, run_id)
    assert run["summary"]["status"] == "failed" and run["summary"]["turn"] == 0
    assert run["state"] == before and len(run["requests"]) == 1
    assert run["activations"][0]["operations"][0]["status"] == "rejected"
    assert prompts[0]["limits"]["capabilities"][capability] == "disabled"
    assert len(responses) == 1


def test_participant_may_decide_immediately_with_all_capabilities_disabled(context_client, design):
    client, responses, _ = context_client
    responses.append(finish())
    disabled = dict.fromkeys(["planning", "memory", "investigation", "verification"], "disabled")
    _, run_id = save(
        client,
        protocol(design, max_requests=1, max_tool_operations=0, tools=[], capabilities=disabled),
    )
    run = step(client, run_id)
    assert run["summary"]["turn"] == 1 and len(run["requests"]) == 1
    assert [o["kind"] for o in run["activations"][0]["operations"]] == ["decide", "settle"]


@pytest.mark.parametrize(
    "payload",
    [
        {"retrieval": {"source_ids": ["plan:foreign-activation:1"]}},
        {"retrieval": {"source_ids": ["missing-source"]}},
        {"retrieval": {"cutoff_turn": 1}},
    ],
)
def test_denied_retrieval_has_no_foreign_source_or_future_metadata(context_client, design, payload):
    client, responses, prompts = context_client
    responses.append(request("retrieve", **payload))
    _, run_id = save(client, protocol(design))
    run = step(client, run_id)
    assert run["summary"]["turn"] == 0 and len(run["requests"]) == 1
    assert run["summary"]["error"] == "Invalid actor capability request"
    op = run["activations"][0]["operations"][0]
    assert op["result"] == "Invalid actor capability request." and op["status"] == "rejected"
    assert "foreign" not in json.dumps(prompts)


@pytest.mark.parametrize("memory", ["episodic", "notes", "history", "none"])
def test_three_actor_private_deliveries_do_not_leak_through_retrieval_or_investigation(
    context_client, design, memory
):
    client, responses, prompts = context_client

    def make_plan(prompt):
        return request("plan", plan={"text": f"plan-for-{prompt['actor']}", "source_ids": []})

    def act(prompt):
        value = decision() | {"memory": f"private-note-for-{prompt['actor']}"}
        if prompt["actor"] == "morgan":
            value["action"] |= {"message": "PRIVATE-B-TO-C", "target": "jules"}
        return request("decide", decision=value)

    responses.extend([make_plan, act] * 3)
    responses.extend(
        [
            request("retrieve", retrieval={"query": "B-TO", "limit": 16}),
            request("investigate", investigation={"facet": "state"}),
            finish(),
        ]
        * 3
    )
    value = protocol(design, max_requests=3)
    value["profiles"].append({"key": "jules", "name": "Jules", "goal": "Choose legally."})
    value["rounds"] = 2
    value["conditions"][0]["parameters"]["memory"] = memory
    _, run_id = save(client, value)
    for _ in range(6):
        run = step(client, run_id)
    assert run["summary"]["turn"] == 6, run["summary"]["error"]
    alex = [p for p in prompts if p["actor"] == "alex" and p["round"] == 2]
    delivered = json.dumps(alex)
    assert "PRIVATE-B-TO-C" not in delivered
    assert "private-note-for-morgan" not in delivered and "plan-for-morgan" not in delivered
    retrieval = alex[1]["operations"][0]["result"]
    assert retrieval["items"] == [] and retrieval["returned"] == 0
    assert retrieval["has_more"] is False
    jules = [p for p in prompts if p["actor"] == "jules" and p["round"] == 2]
    assert (jules[1]["operations"][0]["result"]["returned"] > 0) == (memory == "episodic")
    assert client.post(f"/api/runs/{run_id}/verify").json()["verified_turns"] == 6


@pytest.mark.parametrize("memory", ["episodic", "notes", "history", "none"])
def test_paused_plan_receipts_restore_with_world_cutoff_and_remaining_effort(
    tmp_path, monkeypatch, design, memory
):
    url = f"sqlite:///{tmp_path}/restore.sqlite3"
    entered, release = asyncio.Event(), asyncio.Event()
    gate, deliveries = True, []

    async def respond(messages, info):
        prompt = json.loads(messages[-1].parts[0].content)
        deliveries.append(prompt)
        if gate:
            entered.set()
            await release.wait()
        journal = prompt["operations"]
        value = (
            request("plan", plan={"text": "Restorable intentional plan", "source_ids": []})
            if not journal
            else request(
                "verify",
                verification={
                    "proposed": decision(),
                    "checks": [
                        {"source_id": journal[0]["result"]["artifact"]["id"], "quote": "Restorable"}
                    ],
                },
            )
            if len(journal) == 1
            else finish()
        )
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, value)],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    provider = FunctionModel(function=respond)
    app = create_app(url, static_dir=tmp_path / "static")
    monkeypatch.setattr(app.state.models, "model", lambda _: provider)
    value = protocol(design, max_requests=3, max_tool_operations=2)
    value["conditions"][0]["parameters"]["memory"] = memory
    with TestClient(app, base_url="http://localhost") as client:
        _, run_id = save(client, value)
        initial = client.get(f"/api/runs/{run_id}").json()["state"]
        client.post(f"/api/runs/{run_id}/control", json={"action": "start"})
        assert client.portal is not None
        client.portal.call(asyncio.wait_for, entered.wait(), 5)
        client.post(f"/api/runs/{run_id}/control", json={"action": "start"})
        client.post(f"/api/runs/{run_id}/control", json={"action": "pause"})
        client.portal.call(release.set)
        before = wait_finished(client, run_id)
        assert before["state"] == initial and before["summary"]["turn"] == 0
        assert before["activations"][0]["status"] == "paused"
        assert len(deliveries) == 1 and len(before["requests"]) == 1
    gate = False
    restarted = create_app(url, static_dir=tmp_path / "static")
    monkeypatch.setattr(restarted.state.models, "model", lambda _: provider)
    with TestClient(restarted, base_url="http://localhost") as client:
        restored = client.get(f"/api/runs/{run_id}").json()
        assert restored["activations"] == before["activations"]
        assert restored["requests"] == before["requests"]
        assert restored["state"] == initial and len(deliveries) == 1
        run = step(client, run_id)
        assert run["summary"]["turn"] == 1 and len(run["requests"]) == 3
        assert run["activations"][0]["id"] == before["activations"][0]["id"]
        result = run["activations"][0]["operations"][2]["result"]
        assert result["schema_valid"] is True and result["checks"][0]["quote_present"] is True
        assert result["cutoff"]["turn"] == 0
        assert deliveries[1]["retained_artifacts"] == []
        assert "requests_remaining" in deliveries[1] and deliveries[1]["requests_remaining"] == 2
        assert client.post(f"/api/runs/{run_id}/verify").json()["verified_turns"] == 1
