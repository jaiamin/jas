"""Fresh combined T07/T08 DEVELOPMENT oracles at the public HTTP seam."""

import asyncio
import hashlib
import json
import os
import time
from pathlib import Path

import pytest
from agent_sim.api import create_app
from fastapi.testclient import TestClient
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.models.function import DeltaToolCall, FunctionModel
from pydantic_ai.usage import RequestUsage

from benchmarks.provider_fixtures import output_args

DISCLOSURE = "review-private-disclosure-18218"


def decision(actor, round_number, *, public=False, disclose=True):
    return {
        "action": {
            "kind": "contribute",
            "amount": 2,
            "target": "" if public or actor != "alex" else "morgan",
            "message": DISCLOSURE if disclose and actor == "alex" and round_number == 1 else "",
            "report": None,
            "promise": None,
        },
        "memory": "",
        "rationale": "Independent literal contribution oracle.",
        "forecast": None,
    }


def protocol(design, *, memory="episodic", compact=False):
    value = design.model_dump()
    value.update(rounds=2, seeds=[0], context="x" * 4000 if compact else "")
    value["profiles"] = [
        {"key": key, "name": key, "role": "participant", "goal": f"own-goal-{key}"}
        for key in ["alex", "morgan", "riley"]
    ]
    value["conditions"] = [value["conditions"][0]]
    value["conditions"][0]["parameters"].update(
        memory=memory,
        endowment=10,
        multiplier=1.5,
        communication=True,
        communication_channels=["messages"],
        private_signal=True,
    )
    value["conditions"][0]["harness"] = {
        "kind": "tool_using",
        "version": "2.0.0",
        "max_requests": 4,
        "max_tool_operations": 3,
        "max_context_chars": 4000 if compact else 16000,
    }
    return value


def saved(client, value):
    response = client.post("/api/studies", json={"design": value})
    assert response.status_code == 201, response.text
    sid = response.json()["id"]
    return sid, client.get(f"/api/studies/{sid}").json()["runs"][0]["id"]


def wait_run(client, rid):
    deadline = time.monotonic() + 8
    while time.monotonic() < deadline:
        record = client.get(f"/api/runs/{rid}").json()
        if record["summary"]["status"] not in {"queued", "running", "pausing"}:
            return record
        time.sleep(0.005)
    pytest.fail("Owned combined-source run did not settle")


def execute(client, rid, action="step"):
    response = client.post(f"/api/runs/{rid}/control", json={"action": action})
    assert response.status_code == 200, response.text
    return wait_run(client, rid)


def exposure(client, rid):
    response = client.get(f"/api/runs/{rid}/exposure")
    assert response.status_code == 200, response.text
    return response.json()


def count(value, kind):
    return next(row for row in value["summary"] if row["kind"] == kind)


def resolve_input(client, source):
    raw = client.get(source["href"]).json()
    _, request_key, surface, *parts = source["pointer"].split("/")
    assert request_key == "request"
    value = json.loads(raw["request"][surface]) if surface == "prompt" else raw["request"][surface]
    for part in parts:
        value = value[int(part)] if isinstance(value, list) else value[part]
    return raw, value


@pytest.fixture
def combined_client(tmp_path, monkeypatch, request):
    state: dict = {
        "workflow": "retrieve",
        "public": False,
        "disclose": True,
        "failure": None,
        "gate": False,
        "prompts": [],
    }
    entered, release = asyncio.Event(), asyncio.Event()

    async def respond(messages, info):
        prompt = json.loads(messages[-1].parts[0].content)
        if "index" in prompt:
            output = {
                "requests": [],
                "answer": {
                    "answer": "Captured inputs have limited support.",
                    "citations": [],
                    "caveats": ["No causal or intent inference."],
                },
            }
        else:
            state["prompts"].append(
                {"prompt": prompt, "schema": info.output_tools[0].parameters_json_schema}
            )
            actor, round_number = prompt["actor"], prompt["round"]
            journal = prompt["operations"]
            final = decision(
                actor, round_number, public=state["public"], disclose=state["disclose"]
            )
            workflow = state["workflow"]
            if workflow == "institution":
                final["action"].update(
                    kind="sanction" if actor == "alex" else "work",
                    amount=2 if actor == "alex" else 0,
                    target="morgan" if actor == "alex" else "",
                    message="",
                )
            if journal and round_number == 2:
                if state["gate"]:
                    entered.set()
                    await release.wait()
                if state["failure"] == "timeout":
                    raise TimeoutError("Independent unknown-receipt witness")
                if state["failure"] == "invalid":
                    return ModelResponse(
                        parts=[
                            ToolCallPart(
                                info.output_tools[0].name, output_args(info, {"bad": True})
                            )
                        ],
                        usage=RequestUsage(input_tokens=100, output_tokens=50),
                    )
            if workflow == "institution" and len(journal) < 2:
                output = {
                    "operation": "investigate",
                    "decision": None,
                    "investigation": {"facet": "state" if not journal else "rules"},
                }
            elif not journal and (
                round_number == 2 or workflow in {"rules", "compact", "plan", "verify"}
            ):
                if workflow == "retrieve":
                    output = {
                        "operation": "retrieve",
                        "decision": None,
                        "retrieval": {"query": "18218"},
                    }
                elif workflow == "rules":
                    output = {
                        "operation": "investigate",
                        "decision": None,
                        "investigation": {"facet": "rules"},
                    }
                elif workflow == "compact":
                    output = {"operation": "observe", "decision": None}
                elif workflow == "plan":
                    output = {
                        "operation": "plan",
                        "decision": None,
                        "plan": {"text": DISCLOSURE, "source_ids": []},
                    }
                elif workflow == "verify":
                    output = {
                        "operation": "verify",
                        "decision": None,
                        "verification": {"proposed": final, "checks": []},
                    }
                else:
                    output = {"operation": "decide", "decision": final}
            else:
                output = {"operation": "decide", "decision": final}
            if state["failure"] == "unsent" and round_number == 2 and not journal:
                from agent_sim.db import Workspace

                with app.state.db.session.begin() as session:
                    session.get_one(Workspace, 1).ceiling = 0
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, output_args(info, output))],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    async def stream(messages, info):
        result = await respond(messages, info)
        yield {
            0: DeltaToolCall(
                name=info.output_tools[0].name, json_args=json.dumps(result.parts[0].args)
            )
        }

    app = create_app(f"sqlite:///{tmp_path}/combined.sqlite3", static_dir=tmp_path / "static")
    provider = FunctionModel(function=respond, stream_function=stream)
    monkeypatch.setattr(app.state.models, "model", lambda _: provider)
    from agent_sim.simulation.world import World

    producer = World.exposure_paths

    def authorized_producer(world, event, observation):
        paths = producer(world, event, observation)
        if (
            event["text"] == DISCLOSURE
            and event["target"]
            and observation["you"]["key"] not in {event["actor"], event["target"]}
        ):
            assert paths == []
        return paths

    monkeypatch.setattr(World, "exposure_paths", authorized_producer)
    with TestClient(app, base_url="http://localhost") as client:
        assert client.portal is not None
        try:
            yield client, state, entered, release
        finally:
            client.portal.call(release.set)
            path = (
                Path(os.getenv("JAS_REVIEW_CASES", str(tmp_path / "evidence"))) / request.node.name
            )
            path.mkdir(parents=True, exist_ok=False)
            record = {
                "case": request.node.name,
                "version": "t07-t08-review-v1",
                "actual_spend_usd": 0,
                "source_head": os.getenv("JAS_T07_SOURCE_HEAD"),
                "source_tree_sha256": os.getenv("JAS_T07_SOURCE_TREE_SHA256"),
                "test_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                "state": state,
                "exports": [
                    client.get(f"/api/studies/{s['id']}/export").json()
                    for s in client.get("/api/studies").json()
                ],
            }
            (path / "case.json").write_text(json.dumps(record, indent=2))


@pytest.mark.parametrize("memory", ["none", "history", "notes", "episodic"])
@pytest.mark.parametrize("control", ["private", "public", "absent"])
def test_t08_retrieval_delivers_only_authorized_source_content(
    combined_client, design, memory, control
):
    client, state, _, _ = combined_client
    state.update(public=control == "public", disclose=control != "absent")
    sid, rid = saved(client, protocol(design, memory=memory))
    for _ in range(3):
        execute(client, rid)
    assert count(exposure(client, rid), "message")["exposed_participants"] == 0
    record = execute(client, rid, "start")
    assert record["summary"]["status"] == "complete", record["summary"]["error"]
    report = exposure(client, rid)
    expected = (
        0
        if control == "absent" or memory == "none"
        else (3 if control == "public" else 2 if memory == "episodic" else 0)
    )
    assert count(report, "message")["eligible_participants"] == (
        0 if control == "absent" else 3 if control == "public" else 2
    )
    assert count(report, "message")["exposed_participants"] == expected
    assert count(report, "rules")["exposed_participants"] == 0
    assert count(report, "choices")["exposed_participants"] == 3
    assert record["state"]["balances"] == {"alex": 22, "morgan": 22, "riley": 22}
    assert record["summary"]["usage"]["requests"] == 9
    for item in state["prompts"]:
        prompt = item["prompt"]
        if control != "public" and prompt["actor"] == "riley" or memory == "none":
            assert DISCLOSURE not in json.dumps(item)
        assert "input_evidence" not in json.dumps(item)
        for other in {"alex", "morgan", "riley"} - {prompt["actor"]}:
            assert f"own-goal-{other}" not in json.dumps(item)
    for opportunity in report["opportunities"]:
        for binding in opportunity["inputs"]:
            raw, value = resolve_input(client, binding["source"])
            assert raw["activation_id"] == binding["activation_id"]
            if opportunity["kind"] == "message":
                assert DISCLOSURE in json.dumps(value)
    assert client.get(f"/api/studies/{sid}/export").json()["exposure"] == [report]
    assert client.post(f"/api/runs/{rid}/verify").json()["verified_turns"] == 6


def test_t08_investigation_rules_are_input_after_a_confirmed_next_request(combined_client, design):
    client, state, _, _ = combined_client
    state["workflow"] = "rules"
    _, rid = saved(client, protocol(design))
    record = execute(client, rid, "start")
    assert record["summary"]["status"] == "complete"
    report = exposure(client, rid)
    assert count(report, "rules")["exposed_participants"] == 3
    assert count(report, "message")["exposed_participants"] == 0
    assert record["summary"]["usage"]["requests"] == 12
    for opportunity in report["opportunities"]:
        if opportunity["kind"] == "rules":
            assert opportunity["inputs"]
            for binding in opportunity["inputs"]:
                _, value = resolve_input(client, binding["source"])
                assert isinstance(value, str) and "contribut" in value.lower()


def test_t08_state_investigation_uses_institution_producer_and_private_visibility(
    combined_client, design
):
    client, state, _, _ = combined_client
    state["workflow"] = "institution"
    value = protocol(design, memory="none")
    value.update(environment="institution", rounds=1, measures=["sanction_rate"])
    value["conditions"][0]["parameters"]["institution"].update(
        authorities=["alex"], transparent=False, oversight=0, appeal=False
    )
    _, rid = saved(client, value)
    record = execute(client, rid, "start")
    assert record["summary"]["status"] == "complete", record["summary"]["error"]
    report = exposure(client, rid)
    assert count(report, "sanction")["eligible_participants"] == 2
    assert count(report, "sanction")["exposed_participants"] == 1
    assert count(report, "rules")["exposed_participants"] == 3
    assert record["state"]["balances"] == {"alex": -1, "morgan": 2, "riley": 2}
    for item in state["prompts"]:
        if item["prompt"]["actor"] == "riley":
            for op in item["prompt"]["operations"]:
                if (
                    op["kind"] == "investigate"
                    and op["request"]["investigation"]["facet"] == "state"
                ):
                    assert op["result"]["source"]["content"]["sanctions"] == []
    for opportunity in report["opportunities"]:
        if opportunity["kind"] == "sanction":
            for binding in opportunity["inputs"]:
                _, content = resolve_input(client, binding["source"])
                assert content["actor"] == "alex" and content["target"] == "morgan"


def test_partial_observation_delivers_retained_rules_but_not_omitted_messages(
    combined_client, design
):
    client, state, _, _ = combined_client
    state["workflow"] = "compact"
    _, rid = saved(client, protocol(design, compact=True))
    record = execute(client, rid, "start")
    assert record["summary"]["status"] == "complete", record["summary"]["error"]
    report = exposure(client, rid)
    assert count(report, "message")["eligible_participants"] == 2
    assert count(report, "message")["exposed_participants"] == 0
    assert count(report, "rules")["exposed_participants"] == 3
    assert count(report, "observation")["exposed_participants"] == 0
    assert count(report, "choices")["exposed_participants"] == 3
    assert any(DISCLOSURE in json.dumps(a["operations"]) for a in record["activations"])
    for item in state["prompts"]:
        assert DISCLOSURE not in json.dumps(item)
        assert len(json.dumps(item["prompt"])) <= 4000
    assert any(
        op.get("omitted_fields") for item in state["prompts"] for op in item["prompt"]["operations"]
    )
    for opportunity in report["opportunities"]:
        for binding in opportunity["inputs"]:
            resolve_input(client, binding["source"])


@pytest.mark.parametrize(
    "failure,expected,unknown", [("timeout", None, 1), ("invalid", 1, 0), ("unsent", 0, 0)]
)
def test_t08_retrieval_receipt_remains_distinct_from_response_validity(
    combined_client, design, failure, expected, unknown
):
    client, state, _, _ = combined_client
    _, rid = saved(client, protocol(design))
    for _ in range(3):
        execute(client, rid)
    state["failure"] = failure
    record = execute(client, rid)
    assert record["summary"]["status"] == "failed" and record["summary"]["turn"] == 3
    report = exposure(client, rid)
    assert count(report, "message")["exposed_participants"] == expected
    assert report["delivery"]["unknown_requests"] == unknown
    assert record["summary"]["usage"]["requests"] == (4 if failure == "unsent" else 5)
    assert record["summary"]["usage"]["partial"] is (failure == "timeout")
    assert report["delivery"]["unsent_attempts"] == (1 if failure == "unsent" else 0)


@pytest.mark.parametrize("workflow", ["plan", "verify"])
def test_self_authored_plan_and_verification_are_not_original_world_delivery(
    combined_client, design, workflow
):
    client, state, _, _ = combined_client
    state["workflow"] = workflow
    _, rid = saved(client, protocol(design))
    record = execute(client, rid, "start")
    assert record["summary"]["status"] == "complete", record["summary"]["error"]
    report = exposure(client, rid)
    assert count(report, "message")["eligible_participants"] == 2
    assert count(report, "message")["exposed_participants"] == 0
    assert count(report, "rules")["exposed_participants"] == 0
    assert count(report, "choices")["exposed_participants"] == 3
    assert record["summary"]["usage"]["requests"] == 12
    assert client.post(f"/api/runs/{rid}/verify").json()["verified_turns"] == 6


def test_disabled_investigation_fails_without_invented_delivery_or_fallback(
    combined_client, design
):
    client, state, _, _ = combined_client
    state["workflow"] = "rules"
    value = protocol(design)
    value["conditions"][0]["harness"]["capabilities"] = {"investigation": "disabled"}
    _, rid = saved(client, value)
    record = execute(client, rid)
    assert record["summary"]["status"] == "failed" and record["summary"]["turn"] == 0
    assert record["summary"]["usage"]["requests"] == 1
    assert record["activations"][0]["operations"] == []
    assert record["activations"][0]["stop_reason"] == "provider_failure"
    report = exposure(client, rid)
    assert count(report, "rules")["exposed_participants"] == 0
    assert count(report, "choices")["exposed_participants"] == 1
    assert report["delivery"] == {
        "confirmed_requests": 1,
        "unknown_requests": 0,
        "unsent_attempts": 0,
    }


def test_analysis_keeps_pending_t08_input_and_membership_frozen_after_settlement(
    combined_client, design
):
    client, state, entered, release = combined_client
    sid, rid = saved(client, protocol(design))
    for _ in range(3):
        execute(client, rid)
    state["gate"] = True
    assert client.post(f"/api/runs/{rid}/control", json={"action": "step"}).status_code == 200
    client.portal.call(asyncio.wait_for, entered.wait(), 5)
    try:
        pending = exposure(client, rid)
        assert count(pending, "message")["exposed_participants"] is None
        assert pending["delivery"]["unknown_requests"] == 1
        submitted = client.post(
            "/api/chats", json={"question": "What inputs were confirmed?", "context": f"run:{rid}"}
        )
        assert submitted.status_code == 202, submitted.text
        aid = submitted.json()["id"]
        frozen = client.get(f"/api/analyses/{aid}").json()["output"]["exposure"][rid]
        assert frozen == pending
    finally:
        state["gate"] = False
        client.portal.call(release.set)
    wait_run(client, rid)
    execute(client, rid, "start")
    assert count(exposure(client, rid), "message")["exposed_participants"] == 2
    changed = protocol(design)
    changed["conditions"][0]["parameters"]["communication"] = False
    assert client.post(f"/api/studies/{sid}/revisions", json={"design": changed}).status_code == 201

    async def finish_analysis():
        await client.app.state.assistants.tasks[aid]

    client.portal.call(finish_analysis)
    analysis = client.get(f"/api/analyses/{aid}").json()
    assert analysis["status"] == "complete", analysis
    assert analysis["output"]["exposure"][rid] == frozen
    assert len(frozen["membership"]["requests"]) == 5
    assert count(frozen, "message")["exposed_participants"] is None
    exported = client.get(f"/api/studies/{sid}/export").json()
    assert (
        next(a for a in exported["analyses"] if a["id"] == aid)["output"]["exposure"][rid] == frozen
    )
