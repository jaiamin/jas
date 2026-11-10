"""Independent T07 DEVELOPMENT witnesses at the public workflow/provider seam."""

import hashlib
import json
import os
import time
from pathlib import Path
from uuid import uuid4

import pytest
from agent_sim.api import create_app
from fastapi.testclient import TestClient
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.models.function import FunctionModel
from pydantic_ai.usage import RequestUsage

PRIVATE = "actor-to-target-disclosure-731"
FROZEN_EXPECTED_SHA256 = "f67d29314fb6c48b90aab383b58930b1b4ecdc5b46664be903b0017059ad4eb2"


def case_identity(case_id):
    return {
        "case_id": case_id,
        "case_version": "t07-development-v3",
        "spend_usd": 0,
        "frozen_expected_sha256": FROZEN_EXPECTED_SHA256,
        "test_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        "source_head": os.getenv("JAS_T07_SOURCE_HEAD"),
        "source_tree_sha256": os.getenv("JAS_T07_SOURCE_TREE_SHA256"),
        "check": os.getenv("JAS_T07_CHECK"),
    }


def choice(actor, *, disclose=True, public=False):
    return {
        "action": {
            "kind": "contribute",
            "amount": 2,
            "target": "" if public or actor != "alex" else "morgan",
            "message": PRIVATE if disclose and actor == "alex" else "",
            "report": None,
            "promise": None,
        },
        "memory": "",
        "rationale": "Scripted development choice.",
        "forecast": None,
    }


@pytest.fixture
def exposure_client(tmp_path, monkeypatch, request):
    seen = []
    controls = {"disclose": True, "public": False, "reads": True, "failure": False}

    async def respond(messages, info):
        prompt = json.loads(messages[-1].parts[0].content)
        seen.append({"prompt": prompt, "schema": info.output_tools[0].parameters_json_schema})
        actor = prompt.get("actor", prompt.get("you", {}).get("key"))
        final = choice(
            actor, disclose=controls["disclose"] and prompt["round"] == 1, public=controls["public"]
        )
        if "operations" in prompt:
            if controls["failure"] and prompt["operations"]:
                raise TimeoutError("controlled missing delivery receipt")
            read = controls["reads"] and not prompt["operations"]
            output = {
                "operation": "observe" if read else "decide",
                "decision": None if read else final,
            }
        else:
            output = final
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, output)],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
            model_name="t07-development-v3",
        )

    app = create_app(f"sqlite:///{tmp_path}/exposure.sqlite3", static_dir=tmp_path / "static")
    provider = FunctionModel(function=respond)
    monkeypatch.setattr(app.state.models, "model", lambda _: provider)
    with TestClient(app, base_url="http://localhost") as client:
        output = Path(os.getenv("JAS_T07_EVIDENCE_DIR", "data/t07/cases")) / uuid4().hex
        output.mkdir(parents=True)
        transport = client.request
        operations = []

        case_id = request.node.name

        def recorded_request(method, url, **kwargs):
            response = transport(method, url, **kwargs)
            operations.append(
                {
                    "method": method,
                    "url": str(url),
                    "body": kwargs.get("json"),
                    "status": response.status_code,
                    "response": response.json(),
                }
            )
            return response

        monkeypatch.setattr(client, "request", recorded_request)
        try:
            yield client, seen, controls
        finally:
            for study in client.get("/api/studies").json():
                exported = client.get(f"/api/studies/{study['id']}/export").json()
                (output / f"{study['id']}.json").write_text(json.dumps(exported, indent=2))
            (output / "operations.json").write_text(json.dumps(operations, indent=2))
            (output / "provider.json").write_text(json.dumps(seen, indent=2))
            (output / "identity.json").write_text(
                json.dumps(
                    case_identity(case_id),
                    indent=2,
                )
            )


def protocol(design, *, memory="episodic", kind="direct_action"):
    value = design.model_dump()
    value.update(rounds=2, seeds=[0])
    value["profiles"] = [
        {
            "key": key,
            "name": key.title(),
            "role": "participant",
            "goal": f"private-goal-{key}",
            "model": None,
        }
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
    value["conditions"][0]["harness"] = {"kind": kind}
    return value


def save(client, value):
    response = client.post("/api/studies", json={"design": value})
    assert response.status_code == 201, response.text
    sid = response.json()["id"]
    return sid, client.get(f"/api/studies/{sid}").json()["runs"][0]["id"]


def settle(client, run_id, action="step"):
    response = client.post(f"/api/runs/{run_id}/control", json={"action": action})
    assert response.status_code == 200, response.text
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        run = client.get(f"/api/runs/{run_id}").json()
        if run["summary"]["status"] not in {"queued", "running", "pausing"}:
            return run
        time.sleep(0.005)
    pytest.fail("Owned development run did not settle")


def report(client, run_id, cutoff=None):
    suffix = "" if cutoff is None else f"?through_turn={cutoff}"
    response = client.get(f"/api/runs/{run_id}/exposure{suffix}")
    assert response.status_code == 200, response.text
    return response.json()


def counts(exposure, kind):
    return next(row for row in exposure["summary"] if row["kind"] == kind)


def test_three_party_private_disclosure_has_cutoff_scoped_delivery_and_independent_utility(
    exposure_client, design
):
    client, seen, _ = exposure_client
    sid, rid = save(client, protocol(design))
    before = report(client, rid)
    assert counts(before, "message")["eligible_participants"] == 0
    assert counts(before, "rules")["eligible_participants"] == 3
    first = settle(client, rid)
    assert first["turns"][0]["actor"] == "alex"
    # Commons seals all decisions, including communication, until round settlement.
    assert counts(report(client, rid, 1), "message")["eligible_participants"] == 0
    settle(client, rid)
    settle(client, rid)
    at_three = report(client, rid, 3)
    assert counts(at_three, "message")["eligible_participants"] == 2
    assert counts(at_three, "message")["exposed_participants"] == 0
    run = settle(client, rid, "start")
    exposure = report(client, rid)
    message = counts(exposure, "message")
    assert message["eligible_participants"] == 2
    assert message["exposed_participants"] == 2
    assert message["eligible_opportunities"] == 2
    assert message["exposed_opportunities"] == 2
    assert counts(exposure, "rules")["exposed_participants"] == 3
    assert exposure["capture"] == "complete"
    assert exposure["assignment"]["condition_key"] == value_condition(design)
    assert exposure["assignment"]["source"]["href"].startswith(f"/api/studies/{sid}")
    target = next(
        o
        for o in exposure["opportunities"]
        if o["kind"] == "message" and o["participant"] == "morgan"
    )
    assert target["source"]["href"] == f"/api/runs/{rid}/turns/3"
    assert target["inputs"][0]["delivery"] == "confirmed"
    assert target["inputs"][0]["source"]["href"].startswith("/api/requests/")
    assert PRIVATE in json.dumps(seen[4]["prompt"])
    assert PRIVATE not in json.dumps([seen[2], seen[5]])
    assert "private-goal-alex" not in json.dumps([seen[i] for i in [1, 2, 4, 5]])
    assert "private-goal-riley" not in json.dumps([seen[i] for i in [0, 1, 3, 4]])
    # Each keeps 8; fund6 * multiplier1.5 / population3 = dividend3 each.
    assert run["state"]["balances"] == {"alex": 22, "morgan": 22, "riley": 22}
    assert report(client, rid, 3) == at_three
    usage = run["summary"]["usage"]
    assert client.post(f"/api/runs/{rid}/verify").json()["verified_turns"] == 6
    assert client.get(f"/api/runs/{rid}").json()["summary"]["usage"] == usage


def value_condition(design):
    return design.conditions[0].key


def test_private_sanction_record_is_included_without_episodic_memory_and_rules_without_sanctions(
    exposure_client, design, monkeypatch
):
    client, seen, _ = exposure_client
    value = protocol(design, memory="none")
    value.update(environment="institution", rounds=1, measures=["sanction_rate"])
    value["conditions"][0]["parameters"]["institution"].update(
        authorities=["alex"],
        transparent=False,
        oversight=0,
        appeal=False,
    )
    provider = client.app.state.models.model("openai:gpt-6-luna")

    async def institution_response(messages, info):
        prompt = json.loads(messages[-1].parts[0].content)
        seen.append({"prompt": prompt, "schema": info.output_tools[0].parameters_json_schema})
        final = choice(prompt["you"]["key"], disclose=False)
        final["action"].update(
            kind="sanction" if prompt["authority"] else "work",
            amount=2 if prompt["authority"] else 0,
            target="morgan" if prompt["authority"] else "",
        )
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, final)],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    monkeypatch.setattr(provider, "function", institution_response)
    _, rid = save(client, value)
    run = settle(client, rid, "start")
    exposure = report(client, rid)
    assert counts(exposure, "sanction")["eligible_participants"] == 2
    assert counts(exposure, "sanction")["exposed_participants"] == 1
    assert seen[1]["prompt"]["sanctions"][0]["target"] == "morgan"
    assert seen[2]["prompt"]["sanctions"] == []
    # No available target balance at sanction time: actual deduction0, authority cost1.
    assert run["state"]["balances"] == {"alex": -1, "morgan": 2, "riley": 2}
    assert "private to parties" in seen[2]["prompt"]["rules"]
    assert counts(exposure, "rules")["exposed_participants"] == 3


def test_no_disclosure_or_read_is_distinct_from_delivered_rules_or_schema(exposure_client, design):
    client, _, controls = exposure_client
    controls.update(disclose=False, reads=False)
    _, direct_id = save(client, protocol(design))
    settle(client, direct_id, "start")
    direct = report(client, direct_id)
    assert counts(direct, "message")["eligible_opportunities"] == 0
    assert counts(direct, "message")["exposed_opportunities"] == 0
    assert counts(direct, "sanction")["exposed_opportunities"] == 0
    assert counts(direct, "rules")["exposed_participants"] == 3
    _, tool_id = save(client, protocol(design, kind="tool_using"))
    run = settle(client, tool_id, "start")
    tool = report(client, tool_id)
    assert tool["capture"] == "complete"
    assert counts(tool, "rules")["eligible_participants"] == 3
    assert counts(tool, "rules")["exposed_participants"] == 0
    assert counts(tool, "observation")["exposed_participants"] == 0
    # The legal decision schema is still actual model input in the tool policy.
    assert counts(tool, "choices")["exposed_participants"] == 3
    assert all(a["observation"]["rules"] for a in run["activations"])
    assert run["summary"]["usage"]["requests"] == 6


def test_analysis_freezes_input_membership_before_later_observation_and_new_revision(
    exposure_client, design, monkeypatch
):
    import asyncio

    from pydantic_ai.models.function import DeltaToolCall

    client, _, _ = exposure_client
    sid, rid = save(client, protocol(design))
    for _ in range(3):
        settle(client, rid)
    provider = client.app.state.models.model("openai:gpt-6-luna")
    participant_response = provider.function
    entered, release = asyncio.Event(), asyncio.Event()
    prompts = []

    async def respond(messages, info):
        prompt = json.loads(messages[-1].parts[0].content)
        if "index" not in prompt:
            return await participant_response(messages, info)
        prompts.append(prompt)
        entered.set()
        await release.wait()
        output = {
            "requests": [],
            "answer": {
                "answer": "Disclosure is settled; no later participant input is captured yet.",
                "citations": [],
                "caveats": ["Inclusion is not attention or a causal effect."],
            },
        }
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, output)],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    async def stream(messages, info):
        response = await respond(messages, info)
        yield {
            0: DeltaToolCall(
                name=info.output_tools[0].name, json_args=json.dumps(response.parts[0].args)
            )
        }

    monkeypatch.setattr(provider, "function", respond)
    monkeypatch.setattr(provider, "stream_function", stream)
    posted = client.post(
        "/api/chats", json={"question": "Who received the disclosure?", "context": f"run:{rid}"}
    )
    assert posted.status_code == 202, posted.text
    aid = posted.json()["id"]
    client.portal.call(asyncio.wait_for, entered.wait(), 5)
    try:
        captured = client.get(f"/api/analyses/{aid}").json()
        frozen = captured["output"]["exposure"][rid]
        assert frozen["through_turn"] == 3
        assert counts(frozen, "message")["exposed_participants"] == 0
        assert len(frozen["membership"]["requests"]) == 3
        settle(client, rid, "start")
        assert counts(report(client, rid), "message")["exposed_participants"] == 2
        value = protocol(design)
        value["conditions"][0]["parameters"]["communication"] = False
        assert (
            client.post(f"/api/studies/{sid}/revisions", json={"design": value}).status_code == 201
        )
    finally:
        client.portal.call(release.set)

        async def finished():
            await client.app.state.assistants.tasks[aid]

        client.portal.call(finished)
    completed = client.get(f"/api/analyses/{aid}").json()
    assert completed["status"] == "complete", completed
    assert completed["output"]["exposure"][rid] == frozen
    assert prompts[0]["index"]["exposure"][rid]["summary"] == frozen["summary"]
    # The source must resolve to the accepted snapshot even after later delivery.
    frozen_source = prompts[0]["index"]["exposure"][rid]["source"]
    assert frozen_source == {
        "href": f"/api/analyses/{aid}",
        "pointer": f"/output/exposure/{rid}",
    }
    assert client.get(frozen_source["href"]).json()["output"]["exposure"][rid] == frozen
    exported = client.get(f"/api/studies/{sid}/export").json()
    analysis = next(a for a in exported["analyses"] if a["id"] == aid)
    assert analysis["output"]["exposure"][rid] == frozen
    assert frozen["assignment"]["revision"] == 1
    assert len(report(client, rid)["membership"]["requests"]) == 6


@pytest.mark.parametrize("memory", ["none", "history", "notes", "episodic"])
@pytest.mark.parametrize("kind", ["direct_action", "tool_using"])
def test_recipient_and_memory_boundaries_apply_to_every_delivered_input(
    exposure_client, design, memory, kind
):
    client, seen, _ = exposure_client
    _, rid = save(client, protocol(design, memory=memory, kind=kind))
    run = settle(client, rid, "start")
    assert run["summary"]["status"] == "complete", run["summary"]["error"]
    exposure = report(client, rid)
    assert counts(exposure, "message")["exposed_participants"] == (2 if memory == "episodic" else 0)
    for request in seen:
        prompt = request["prompt"]
        actor = prompt.get("actor", prompt.get("you", {}).get("key"))
        if actor == "riley" or memory != "episodic":
            assert PRIVATE not in json.dumps(request)
        for other in {"alex", "morgan", "riley"} - {actor}:
            assert f"private-goal-{other}" not in json.dumps(request)
        assert "event:" not in json.dumps(request)
        assert "input_evidence" not in json.dumps(request)


def test_unknown_provider_receipt_does_not_turn_available_tool_result_into_exposure(
    exposure_client, design
):
    client, _, controls = exposure_client
    _, rid = save(client, protocol(design, kind="tool_using"))
    for _ in range(3):
        settle(client, rid)
    controls["failure"] = True
    run = settle(client, rid)
    assert run["summary"]["status"] == "failed"
    assert run["summary"]["turn"] == 3
    exposure = report(client, rid)
    message = counts(exposure, "message")
    assert message["eligible_participants"] == 2
    assert message["exposed_participants"] is None
    assert message["confirmed_participants"] == 0
    assert message["unknown_opportunities"] == 1
    assert exposure["delivery"]["unknown_requests"] == 1
    attempt = next(
        o
        for o in exposure["opportunities"]
        if o["kind"] == "message" and o["participant"] == "alex"
    )
    assert attempt["available"] and attempt["included"] is None
    assert {i["delivery"] for i in attempt["inputs"]} == {"unknown"}
    assert run["summary"]["usage"]["partial"] is True


def test_receipt_confirms_input_even_when_output_validation_fails(
    exposure_client, design, monkeypatch
):
    client, _, _ = exposure_client
    provider = client.app.state.models.model("openai:gpt-6-luna")

    async def invalid(messages, info):
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, {"invalid": True})],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    monkeypatch.setattr(provider, "function", invalid)
    _, rid = save(client, protocol(design))
    run = settle(client, rid)
    assert run["summary"]["status"] == "failed"
    assert run["requests"][0]["status"] == "failed"
    exposure = report(client, rid)
    assert counts(exposure, "rules")["exposed_participants"] == 1
    assert exposure["delivery"]["confirmed_requests"] == 1
    assert exposure["delivery"]["unknown_requests"] == 0


def test_unsent_request_refusal_has_no_confirmed_or_unknown_provider_input(exposure_client, design):
    client, seen, _ = exposure_client
    from agent_sim.db import Workspace

    _, rid = save(client, protocol(design))
    # Approved accounting fixture: revoke the allowance before sending.
    with client.app.state.db.session.begin() as session:
        session.get_one(Workspace, 1).ceiling = 0
    run = settle(client, rid)
    assert run["summary"]["status"] == "failed"
    assert seen == [] and run["requests"] == []
    exposure = report(client, rid)
    assert exposure["delivery"] == {
        "confirmed_requests": 0,
        "unknown_requests": 0,
        "unsent_attempts": 1,
    }
    assert counts(exposure, "rules")["exposed_participants"] == 0
    assert run["summary"]["usage"]["cost_usd"] == 0


def test_missing_historical_capture_is_unavailable_instead_of_measured_zero(
    exposure_client, design
):
    # Approved storage/accounting fixture for an older capture in the same additive
    # schema; all assertions observe public evidence, never hidden storage.
    from agent_sim.db import ParticipantActivation

    client, _, _ = exposure_client
    _, rid = save(client, protocol(design))
    run = settle(client, rid)
    with client.app.state.db.session.begin() as session:
        activation = session.get_one(ParticipantActivation, run["activations"][0]["id"])
        activation.identity = {k: v for k, v in activation.identity.items() if k != "exposure"}
    exposure = report(client, rid)
    assert exposure["capture"] == "unavailable"
    assert counts(exposure, "rules")["exposed_participants"] is None
    assert counts(exposure, "message")["exposed_participants"] is None
    assert exposure["membership"]["activations"] == [run["activations"][0]["id"]]


@pytest.mark.parametrize("public", [False, True])
def test_current_inspection_and_export_share_source_linked_exposure_without_mutation(
    exposure_client, design, public
):
    client, _, controls = exposure_client
    controls["public"] = public
    sid, rid = save(client, protocol(design))
    before = settle(client, rid, "start")
    exposure = report(client, rid)
    response = client.get(f"/api/studies/{sid}/exposure?revision=1")
    assert response.status_code == 200, response.text
    assert response.json()["runs"] == [exposure]
    exported = client.get(f"/api/studies/{sid}/export").json()
    assert exported["version"] == 9
    assert exported["exposure"] == [exposure]
    assert exported["runs"][0]["record"] == before
    assert client.get(f"/api/runs/{rid}").json() == before
    assert counts(exposure, "message")["eligible_participants"] == (3 if public else 2)
    assert counts(exposure, "message")["exposed_participants"] == (3 if public else 2)
    assignment = client.get(exposure["assignment"]["source"]["href"]).json()
    assert assignment["sha256"] == exposure["assignment"]["design_sha256"]
    for opportunity in exposure["opportunities"]:
        for source in opportunity["available"]:
            record = client.get(source["href"]).json()
            activation_id = source["pointer"].split("id=", 1)[1].split("/", 1)[0]
            activation = next(a for a in record["activations"] if a["id"] == activation_id)
            assert activation["actor"] == opportunity["participant"]
            if opportunity["kind"] == "message":
                assert PRIVATE in json.dumps(activation["observation"])
        for item in opportunity["inputs"]:
            source = item["source"]
            raw = client.get(source["href"]).json()
            assert raw["id"] in exposure["membership"]["requests"]
            assert raw["response"] and item["delivery"] == "confirmed"
            _, request_key, surface, *path = source["pointer"].split("/")
            assert request_key == "request" and surface in {"prompt", "schema"}
            value = (
                json.loads(raw["request"][surface])
                if surface == "prompt"
                else raw["request"][surface]
            )
            # Prompt suffixes select within the recorded JSON text; an empty
            # suffix selects the whole input, never an invented empty-key field.
            for key in path:
                value = value[int(key)] if isinstance(value, list) else value[key]
            if opportunity["kind"] == "message":
                assert PRIVATE in json.dumps(value)
    assert "post-treatment" in " ".join(exposure["interpretation"])
    assert "attention, belief or intent" in " ".join(exposure["interpretation"])
    assert client.get(f"/api/runs/{rid}/exposure?through_turn=7").status_code == 422
    assert client.get(f"/api/runs/{rid}/exposure?through_turn=-1").status_code == 422


@pytest.mark.parametrize("operation", ["observe", "retrieve"])
def test_read_result_is_not_included_until_sent_after_pause_and_restore(
    tmp_path, monkeypatch, design, operation
):
    import asyncio

    url = f"sqlite:///{tmp_path}/restored.sqlite3"
    entered, release = asyncio.Event(), asyncio.Event()
    gated = True
    prompts = []

    async def respond(messages, info):
        prompt = json.loads(messages[-1].parts[0].content)
        prompts.append(prompt)
        if gated and prompt["round"] == 2 and not prompt["operations"]:
            entered.set()
            await release.wait()
        final = choice(prompt["actor"], disclose=prompt["round"] == 1)
        output = {
            "operation": "decide" if prompt["operations"] else operation,
            "decision": final if prompt["operations"] else None,
            **(
                {"retrieval": {"query": "disclosure"}}
                if not prompt["operations"] and operation == "retrieve"
                else {}
            ),
        }
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, output)],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    provider = FunctionModel(function=respond)
    app = create_app(url, static_dir=tmp_path / "static")
    monkeypatch.setattr(app.state.models, "model", lambda _: provider)
    with TestClient(app, base_url="http://localhost") as client:
        assert client.portal is not None
        sid, rid = save(client, protocol(design, kind="tool_using"))
        for _ in range(3):
            settle(client, rid)
        client.post(f"/api/runs/{rid}/control", json={"action": "step"})
        client.portal.call(asyncio.wait_for, entered.wait(), 5)
        client.post(f"/api/runs/{rid}/control", json={"action": "pause"})
        client.portal.call(release.set)

        async def finish():
            await app.state.engine.executions[rid].task

        client.portal.call(finish)
        paused = client.get(f"/api/runs/{rid}").json()
        frozen = report(client, rid)
        assert paused["summary"]["turn"] == 3
        assert paused["activations"][-1]["status"] == "paused"
        assert PRIVATE in json.dumps(paused["activations"][-1]["operations"][0]["result"])
        assert counts(frozen, "message")["exposed_participants"] == 0
        assert counts(frozen, "message")["unknown_opportunities"] == 0
        assert frozen["delivery"]["confirmed_requests"] == 7
    # Sequential engines only. Restoring the process neither resends nor consumes effort.
    gated = False
    restored = create_app(url, static_dir=tmp_path / "static")
    monkeypatch.setattr(restored.state.models, "model", lambda _: provider)
    with TestClient(restored, base_url="http://localhost") as client:
        assert report(client, rid) == frozen
        assert client.get(f"/api/runs/{rid}").json()["summary"]["usage"]["requests"] == 7
        resumed = settle(client, rid)
        after = report(client, rid)
        assert counts(after, "message")["exposed_participants"] == 1
        assert resumed["activations"][-1]["id"] == paused["activations"][-1]["id"]
        assert resumed["summary"]["usage"]["requests"] == 8
        assert PRIVATE in json.dumps(prompts[-1]["operations"])
        assert client.post(f"/api/runs/{rid}/verify").json()["verified_turns"] == 4
        path = Path(os.getenv("JAS_T07_EVIDENCE_DIR", "data/t07/cases")) / uuid4().hex
        path.mkdir(parents=True)
        (path / "restore.json").write_text(
            json.dumps(
                {
                    **case_identity("pause-restore-v3"),
                    "before": frozen,
                    "after": after,
                    "prompts": prompts,
                    "export": client.get(f"/api/studies/{sid}/export").json(),
                },
                indent=2,
            )
        )


def test_independent_world_projection_and_replay_oracle(design):
    from agent_sim.domain import Decision, Design
    from agent_sim.simulation.environments import create_world

    value = Design.model_validate(protocol(design))
    condition = value.conditions[0]
    world = create_world(value, condition.parameters, 0)
    actions = []
    for actor in ["alex", "morgan", "riley"]:
        assert world.actor() == actor
        decision = Decision.model_validate(choice(actor))
        actions.append((actor, decision))
        world.step(actor, decision)
    # Independent literals: round-one settled message, balance11, no hidden signal sharing.
    target = world.observe("morgan")
    observer = world.observe("riley")
    assert target["your_balance"] == observer["your_balance"] == 11
    assert target["public_signals"] == observer["public_signals"] == {}
    assert PRIVATE in json.dumps(target) and PRIVATE not in json.dumps(observer)
    assert PRIVATE not in json.dumps(world.decision_schema(observer).model_json_schema())
    checkpoint = world.snapshot()
    replay = create_world(value, condition.parameters, 0)
    for actor, decision in actions:
        replay.step(actor, decision)
    assert replay.snapshot() == checkpoint
    restored = create_world(value, condition.parameters, 0, checkpoint)
    assert restored.observe("riley") == observer
