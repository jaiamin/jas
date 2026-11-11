"""Reference conditions at the approved HTTP and independent World seams."""

import json

import pytest
from agent_sim.api import create_app
from agent_sim.domain import Design, Event
from agent_sim.reference_policies import reference_decision
from agent_sim.simulation.environments import create_world
from agent_sim.templates import templates
from fastapi.testclient import TestClient
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.models.function import FunctionModel
from pydantic_ai.usage import RequestUsage
from test_participant_harnesses import decision, save, step, wait_finished
from test_participant_harnesses import harness_client as harness_client


@pytest.fixture
def reference_client(tmp_path, monkeypatch):
    app = create_app(f"sqlite:///{tmp_path}/references.sqlite3", static_dir=tmp_path / "static")

    def forbidden_model(_name):
        pytest.fail("A declared non-model control must not construct a provider")

    monkeypatch.setattr(app.state.models, "model", forbidden_model)
    with TestClient(app, base_url="http://localhost") as client:
        yield client


def test_scripted_condition_runs_without_a_provider_and_exports_real_work(reference_client, design):
    client = reference_client
    value = design.model_dump()
    value["profiles"] = value["profiles"][:2]
    value["rounds"] = 1
    value["conditions"][0]["parameters"]["endowment"] = 10
    value["conditions"][0]["harness"] = {"kind": "scripted", "policy": "commons_half_v1"}
    study, run_id = save(client, value)
    run = step(client, run_id)
    assert run["summary"]["turn"] == 1
    assert run["summary"]["usage"] == {
        "requests": 0,
        "input_tokens": 0,
        "output_tokens": 0,
        "cost_usd": 0,
        "partial": False,
    }
    assert run["summary"]["model"] is None
    assert run["summary"]["models"] == []
    activation = run["activations"][0]
    assert activation["identity"]["participant_kind"] == "non_model_control"
    assert activation["identity"]["model"] is None
    assert activation["identity"]["provider"] is None
    assert activation["identity"]["response_tokens"] is None
    assert activation["identity"]["openai_reasoning_effort"] is None
    assert activation["identity"]["harness"]["policy"] == "commons_half_v1"
    assert activation["identity"]["harness"]["version"] == "1.0.0"
    assert len(activation["identity"]["reference_implementation_sha256"]) == 64
    assert activation["requests"] == 0
    assert activation["stop_reason"] == "decision_committed"
    assert [op["kind"] for op in activation["operations"]] == ["reference", "decide", "settle"]
    receipt = activation["operations"][0]
    assert receipt["result"]["information_access"] == "actor_observation_and_legal_schema"
    turn = client.get(f"/api/runs/{run_id}/turns/1").json()
    assert turn["decision"]["action"]["amount"] == 5
    assert client.post(f"/api/runs/{run_id}/verify").json()["verified_turns"] == 1
    exported = client.get(f"/api/studies/{study['id']}/export").json()
    assert exported["version"] == 18
    assert exported["requests"] == []
    assert exported["activations"] == run["activations"]
    assert exported["exposure"][0]["delivery"] == {
        "confirmed_requests": 0,
        "unknown_requests": 0,
        "unsent_attempts": 0,
    }


@pytest.mark.parametrize(
    ("environment", "policy", "amount"),
    [("commons", "commons_keep_v1", 0), ("information", "private_signal_v1", None)],
)
def test_concrete_controls_choose_from_their_recorded_input_only(
    reference_client, environment, policy, amount
):
    client = reference_client
    value = next(
        Design.model_validate(t["design"]).model_dump()
        for t in templates()
        if Design.model_validate(t["design"]).environment == environment
    )
    value["conditions"] = value["conditions"][:1]
    value["conditions"][0]["harness"] = {"kind": "scripted", "policy": policy}
    value["profiles"] = value["profiles"][:2]
    value["rounds"] = 1
    _, run_id = save(client, value)
    run = step(client, run_id)
    turn = client.get(f"/api/runs/{run_id}/turns/1").json()
    assert turn["decision"]["action"]["amount"] == (
        turn["observation"]["your_private_signal"] if amount is None else amount
    )
    assert run["requests"] == []


@pytest.mark.parametrize("memory", ["episodic", "notes", "history", "none"])
@pytest.mark.parametrize("environment", ["commons", "information"])
def test_reference_inputs_ignore_other_actors_hidden_contents_and_counts(
    design, memory, environment
):
    if environment == "information":
        design = next(
            Design.model_validate(t["design"])
            for t in templates()
            if Design.model_validate(t["design"]).environment == environment
        )
    design.conditions[0].parameters.memory = memory
    world = create_world(design, design.conditions[0].parameters, 7)
    actor = world.actor()
    assert actor is not None
    others = [p.key for p in design.profiles if p.key != actor]
    changed = create_world(design, design.conditions[0].parameters, 7, world.snapshot())
    changed.remember(
        [
            Event(
                kind="message",
                actor=others[0],
                target=others[1],
                visibility="private",
                text="foreign-only",
                data={"known_truth": 83},
            )
        ]
        * 19
    )
    hidden = changed.snapshot()
    hidden["notes"][others[0]] = "foreign-note"
    hidden["signals"][others[0]] = 91
    changed = create_world(design, design.conditions[0].parameters, 7, hidden)
    before = changed.snapshot()
    observed = world.observe(actor)
    assert changed.observe(actor) == observed
    schema = world.decision_schema(observed)
    policies = (
        ["commons_keep_v1", "commons_half_v1"]
        if environment == "commons"
        else ["private_signal_v1"]
    )
    for policy in policies:
        assert reference_decision(policy, observed, schema) == reference_decision(
            policy, changed.observe(actor), changed.decision_schema(changed.observe(actor))
        )
    assert changed.snapshot() == before


def test_unsupported_controls_or_hidden_oracles_fail_closed(reference_client, design):
    value = design.model_dump()
    for harness in [
        {"kind": "scripted", "policy": "hidden_truth_v1"},
        {"kind": "scripted", "policy": "commons_keep_v1", "version": "0.9.0"},
        {"kind": "scripted", "policy": "commons_keep_v1", "max_requests": 1},
    ]:
        value["conditions"][0]["harness"] = harness
        assert reference_client.post("/api/studies", json={"design": value}).status_code == 422
    value["conditions"][0]["harness"] = {"kind": "scripted", "policy": "private_signal_v1"}
    assert reference_client.post("/api/studies", json={"design": value}).status_code == 422
    assert reference_client.get("/api/settings").json()["usage"]["requests"] == 0


def test_matched_results_retain_factors_actual_work_and_larger_envelopes(harness_client, design):
    client, _ = harness_client
    value = design.model_dump()
    value["profiles"] = value["profiles"][:2]
    value["rounds"] = 1
    value["measures"] = ["contribution_rate", "group_payoff"]
    base = value["conditions"][0]
    value["conditions"] = [
        dict(base, key="direct", name="Direct", harness={"kind": "direct_action"}),
        dict(base, key="capable", name="Capable", harness={"kind": "tool_using"}),
        dict(
            base, key="keep", name="Keep", harness={"kind": "scripted", "policy": "commons_keep_v1"}
        ),
    ]
    study, _ = save(client, value)
    for run in study["runs"]:
        assert (
            client.post(f"/api/runs/{run['id']}/control", json={"action": "start"}).status_code
            == 200
        )
        record = wait_finished(client, run["id"])
        assert record["summary"]["status"] == "complete"
        assert record["effort"]["usage"] == record["summary"]["usage"]
    study = client.get(f"/api/studies/{study['id']}").json()
    conditions = {c["condition_key"]: c for c in study["comparison"]["conditions"]}
    direct, capable, keep = (conditions[k] for k in ["direct", "capable", "keep"])
    assert capable["participant"]["harness"]["max_requests"] == 4
    assert direct["participant"]["harness"]["max_requests"] == 1
    assert keep["participant"]["kind"] == "non_model_control"
    assert keep["participant"]["models"] == []
    assert keep["participant"]["configured_models"] == ["openai:gpt-6-luna"]
    assert capable["participant"]["profiles"] == study["design"]["profiles"]
    assert capable["participant"]["memory"] == "episodic"
    assert capable["participant"]["inference"]["response_tokens"] == value["response_tokens"]
    assert (
        direct["effort"]["inference_attempts"],
        capable["effort"]["inference_attempts"],
        keep["effort"]["inference_attempts"],
    ) == (2, 8, 0)
    assert capable["effort"]["tool_operations"] == capable["effort"]["tool_attempts"] == 6
    assert keep["effort"]["scripted_decisions"] == keep["effort"]["scripted_attempts"] == 2
    assert capable["effort"]["usage"]["requests"] == 8
    assert capable["effort"]["usage"]["input_tokens"] == 800
    assert capable["effort"]["usage"]["output_tokens"] == 400
    assert capable["effort"]["usage"]["cost_usd"] == pytest.approx(0.00028)
    assert keep["effort"]["usage"]["cost_usd"] == 0
    assert capable["effort"]["stop_reasons"] == {"decision_committed": 2}
    assert all(c["effort"]["committed_decisions"] == 2 for c in conditions.values())
    assert len(keep["effort"]["implementation_sources"][0]["reference_implementation_sha256"]) == 64
    assert all(
        e["pairs"] == e["planned_pairs"] == 1 and e["interval"] is None for e in study["effects"]
    )
    exported = client.get(f"/api/studies/{study['id']}/export").json()
    assert exported["study"]["comparison"] == study["comparison"]


def test_non_model_controls_do_not_turn_unused_model_assignments_into_factors(
    reference_client, design
):
    value = design.model_dump()
    base = value["conditions"][0]
    value["conditions"] = [
        dict(
            base,
            key="luna",
            name="Unused Luna",
            model="openai:gpt-6-luna",
            harness={"kind": "scripted", "policy": "commons_keep_v1"},
        ),
        dict(
            base,
            key="other",
            name="Unused other provider",
            model="anthropic:claude-haiku-4-5",
            harness={"kind": "scripted", "policy": "commons_keep_v1"},
        ),
    ]
    response = reference_client.post("/api/design/preflight", json={"design": value})
    assert response.status_code == 200
    grid = response.json()["condition_grid"]
    assert grid["factors"] == []
    assert grid["duplicate_conditions"] == [["luna", "other"]]


@pytest.mark.parametrize(
    ("capability", "operation", "payload"),
    [
        ("planning", "plan", {"plan": {"text": "An optional plan", "source_ids": []}}),
        ("memory", "retrieve", {"retrieval": {"query": "", "limit": 1}}),
        ("investigation", "investigate", {"investigation": {"facet": "state"}}),
        ("verification", "verify", {"verification": {"proposed": decision(), "checks": []}}),
    ],
)
def test_declared_capability_ablations_reject_use_without_fallback(
    harness_client, design, monkeypatch, capability, operation, payload
):
    client, _ = harness_client

    async def respond(messages, info):
        value = {"operation": operation, "decision": None, **payload}
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, value)],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    provider = FunctionModel(function=respond)
    monkeypatch.setattr(client.app.state.models, "model", lambda _name: provider)
    value = design.model_dump()
    value["conditions"][0]["harness"] = {
        "kind": "tool_using",
        "capabilities": {capability: "disabled"},
    }
    value["conditions"][0]["parameters"]["memory"] = "none"
    study, run_id = save(client, value)
    run = step(client, run_id)
    activation = run["activations"][0]
    assert run["summary"]["turn"] == 0 and run["summary"]["status"] == "failed"
    assert activation["identity"]["harness"]["capabilities"][capability] == "disabled"
    assert activation["identity"]["memory"] == "none"
    assert activation["identity"]["model"] == "openai:gpt-6-luna"
    assert activation["stop_reason"] == "invalid_operation"
    assert activation["requests"] == len(run["requests"]) == 1
    assert (
        len(activation["operations"]) == 1 and activation["operations"][0]["status"] == "rejected"
    )
    result = client.get(f"/api/studies/{study['id']}").json()["comparison"]["conditions"][0]
    assert result["effort"]["tool_attempts"] == 1
    assert result["effort"]["tool_operations"] == 0
    assert result["effort"]["usage"]["requests"] == 1
    exported = client.get(f"/api/studies/{study['id']}/export").json()
    assert exported["activations"] == run["activations"]


def test_missing_cells_keep_failed_work_and_frozen_effort_after_retry(
    harness_client, design, monkeypatch
):
    client, _ = harness_client
    value = design.model_dump()
    value.update(rounds=1, seeds=[7, 11], measures=["contribution_rate"])
    value["profiles"] = value["profiles"][:2]
    base = value["conditions"][0]
    value["conditions"] = [
        dict(base, key="direct", name="Direct", harness={"kind": "direct_action"}),
        dict(
            base, key="limited", name="Limited", harness={"kind": "tool_using", "max_requests": 1}
        ),
        dict(
            base, key="keep", name="Keep", harness={"kind": "scripted", "policy": "commons_keep_v1"}
        ),
    ]
    study, _ = save(client, value)
    runs = {(r["condition_key"], r["seed"]): r["id"] for r in study["runs"]}
    for (condition, seed), rid in runs.items():
        if condition == "limited" and seed == 11:
            continue
        if condition == "direct" and seed == 11:
            step(client, rid)
        else:
            client.post(f"/api/runs/{rid}/control", json={"action": "start"}).raise_for_status()
            wait_finished(client, rid)
    current = client.get(f"/api/studies/{study['id']}").json()
    rows = {r["condition_key"]: r for r in current["comparison"]["conditions"]}
    assert (
        rows["limited"]["failed"],
        rows["limited"]["ready"],
        rows["direct"]["interrupted"],
        rows["keep"]["unmatched"],
    ) == (1, 1, 1, 1)
    assert rows["limited"]["effort"]["inference_attempts"] == 1
    assert rows["limited"]["effort"]["usage"]["requests"] == 1
    assert rows["limited"]["effort"]["stop_reasons"] == {"request_limit": 1}
    assert {e["condition_key"]: e["pairs"] for e in current["effects"]} == {"limited": 0, "keep": 1}
    posted = client.post(
        "/api/chats",
        json={"question": "Describe this selected comparison", "context": f"study:{study['id']}"},
    )
    assert posted.status_code == 202
    aid = posted.json()["id"]
    frozen = client.get(f"/api/analyses/{aid}").json()["output"]["comparisons"]
    captured = next(iter(frozen.values()))
    assert captured["comparison"]["conditions"] == current["comparison"]["conditions"]

    async def finish_analysis():
        await client.app.state.assistants.tasks[aid]

    client.portal.call(finish_analysis)

    async def immediate(messages, info):
        prompt = json.loads(messages[-1].parts[0].content)
        output = (
            {"operation": "decide", "decision": decision()}
            if "operations" in prompt
            else decision()
        )
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, output)],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    provider = FunctionModel(function=immediate)
    monkeypatch.setattr(client.app.state.models, "model", lambda _name: provider)
    rid = runs["limited", 7]
    client.post(f"/api/runs/{rid}/control", json={"action": "start"}).raise_for_status()
    assert wait_finished(client, rid)["summary"]["status"] == "complete"
    later = client.get(f"/api/studies/{study['id']}").json()
    limited = next(r for r in later["comparison"]["conditions"] if r["condition_key"] == "limited")
    assert limited["effort"]["activations"] == 3
    assert limited["effort"]["stop_reasons"] == {"request_limit": 1, "decision_committed": 2}
    assert limited["effort"]["usage"] == client.get(f"/api/runs/{rid}").json()["summary"]["usage"]
    assert client.get(f"/api/analyses/{aid}").json()["output"]["comparisons"] == frozen
    exported = client.get(f"/api/studies/{study['id']}/export").json()
    assert (
        next(a for a in exported["analyses"] if a["id"] == aid)["output"]["comparisons"] == frozen
    )


def test_scripted_pause_restart_and_revision_reuse_keep_identity_without_spending(tmp_path, design):
    path = f"sqlite:///{tmp_path}/restart.sqlite3"
    value = design.model_dump()
    value["profiles"] = value["profiles"][:2]
    value["conditions"][0]["harness"] = {"kind": "scripted", "policy": "commons_keep_v1"}
    value["conditions"][0]["model"] = "anthropic:claude-haiku-4-5"
    value["conditions"][0]["parameters"]["memory"] = "none"
    with TestClient(create_app(path), base_url="http://localhost") as client:
        definition = client.post("/api/design/environment", json={"design": value}).json()
        source = client.post("/api/environments", json={"definition": definition}).json()
        applied = client.post(
            "/api/design/use-environment",
            json={
                "design": value,
                "source": source,
                "example": source["definition"]["examples"][0]["key"],
            },
        )
        assert applied.status_code == 200, applied.text
        value = applied.json()
        assert value["conditions"][0]["harness"]["policy"] == "commons_keep_v1"
        assert value["conditions"][0]["parameters"]["memory"] == "none"
        assert "harness" not in source["definition"]["examples"][0]
        study, run_id = save(client, value)
        run = step(client, run_id)
        identity = run["activations"][0]["identity"]
        assert run["summary"]["status"] == "paused" and run["summary"]["turn"] == 1
        changed = json.loads(json.dumps(value))
        changed["conditions"][0]["harness"]["policy"] = "commons_half_v1"
        assert (
            client.post(
                f"/api/studies/{study['id']}/revisions", json={"design": changed}
            ).status_code
            == 201
        )
    with TestClient(create_app(path), base_url="http://localhost") as client:
        assert client.get(f"/api/runs/{run_id}").json()["activations"][0]["identity"] == identity
        client.post(f"/api/runs/{run_id}/control", json={"action": "start"}).raise_for_status()
        assert wait_finished(client, run_id)["summary"]["status"] == "complete"
        assert client.post(f"/api/runs/{run_id}/verify").json()["verified_turns"] == 4
        exported = client.get(f"/api/studies/{study['id']}/export").json()
        assert [
            r["design"]["conditions"][0]["harness"]["policy"] for r in exported["revisions"]
        ] == ["commons_keep_v1", "commons_half_v1"]
        assert exported["revisions"][0]["design"]["environment_source"] == source
        assert exported["requests"] == []


@pytest.mark.parametrize("unknown", [False, True])
def test_effort_distinguishes_unsent_attempt_from_unknown_provider_usage(
    tmp_path, monkeypatch, design, unknown
):
    app = create_app(f"sqlite:///{tmp_path}/effort.sqlite3", budget_usd=1 if unknown else 0.000001)
    calls = []

    async def respond(messages, info):
        calls.append(True)
        raise RuntimeError("Controlled provider outage with unknown usage")

    provider = FunctionModel(function=respond)
    monkeypatch.setattr(app.state.models, "model", lambda _name: provider)
    with TestClient(app, base_url="http://localhost") as client:
        study, run_id = save(client, design.model_dump())
        run = step(client, run_id)
        assert run["summary"]["status"] == "failed" and run["summary"]["turn"] == 0
        result = client.get(f"/api/studies/{study['id']}").json()["comparison"]["conditions"][0]
        effort = result["effort"]
        assert effort["inference_attempts"] == 1
        assert effort["usage"] == run["summary"]["usage"]
        assert effort["usage"]["requests"] == len(calls) == int(unknown)
        assert effort["usage"]["partial"] is unknown
        assert effort["usage"]["input_tokens"] == effort["usage"]["output_tokens"] == 0
        assert (effort["usage"]["cost_usd"] > 0) is unknown
        assert effort["request_statuses"] == ({"unknown": 1} if unknown else {})
        assert effort["stop_reasons"] == {"provider_failure": 1}
        exported = client.get(f"/api/studies/{study['id']}/export").json()
        assert exported["study"]["comparison"]["conditions"][0]["effort"] == effort


@pytest.mark.parametrize("authorized", [True, False])
def test_artifact_read_work_is_included_in_run_comparison_and_export_effort(
    tmp_path, monkeypatch, authorized
):
    from test_artifact_exposure import artifact_protocol, decision, settle

    async def respond(messages, info):
        prompt = json.loads(messages[-1].parts[0].content)
        reading = not prompt["operations"]
        output = {
            "operation": "read_artifact" if reading else "decide",
            "read": {
                "kind": "read_artifact",
                "artifact": "thermometer" if authorized else "unavailable",
                "version": 1,
            }
            if reading
            else None,
            "decision": None if reading else decision({"kind": "stop"}),
        }
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, output)],
            usage=RequestUsage(input_tokens=67, output_tokens=23),
        )

    app = create_app(f"sqlite:///{tmp_path}/artifact-effort.sqlite3")
    provider = FunctionModel(function=respond)
    monkeypatch.setattr(app.state.models, "model", lambda _: provider)
    with TestClient(app, base_url="http://localhost") as client:
        saved = client.post("/api/studies", json={"design": artifact_protocol()})
        assert saved.status_code == 201, saved.text
        sid = saved.json()["id"]
        rid = client.get(f"/api/studies/{sid}").json()["runs"][0]["id"]
        run = settle(client, rid)
        assert run["summary"]["status"] == ("complete" if authorized else "failed")
        assert run["effort"]["tool_attempts"] == 1
        assert run["effort"]["tool_operations"] == int(authorized)
        assert run["effort"]["usage"] == run["summary"]["usage"]
        comparison = client.get(f"/api/studies/{sid}").json()["comparison"]
        assert comparison["conditions"][0]["effort"]["tool_operations"] == int(authorized)
        exported = client.get(f"/api/studies/{sid}/export").json()
        assert exported["study"]["comparison"] == comparison
        replay = client.post(f"/api/runs/{rid}/verify").json()
        assert replay["verified_reads"] == int(authorized)
        assert replay["verified_rejections"] == int(not authorized)
        (tmp_path / "public-evidence.json").write_text(json.dumps(exported))
