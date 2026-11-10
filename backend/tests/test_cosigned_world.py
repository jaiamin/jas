"""Literal DEVELOPMENT consequences from the pre-candidate reviewed escrow contract."""

import copy
import hashlib
import json
from decimal import Decimal
from pathlib import Path

import pytest
from agent_sim.api import create_app
from agent_sim.domain import Decision, Design, FiniteAction
from agent_sim.simulation.environments import create_world
from fastapi.testclient import TestClient
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.models.function import FunctionModel
from pydantic_ai.usage import RequestUsage


def cosigned_design(client):
    fixtures = Path(__file__).with_name("fixtures")
    external = fixtures.joinpath("t17_cosigned_escrow_contract.json").read_bytes()
    assert hashlib.sha256(external).hexdigest() == (
        "eef4d9c9c7f23e3079d8ff140284be3792dd31496dc86e30c5cef477766a4407"
    )
    response = client.post("/api/extensions/contracts", json=json.loads(external))
    assert response.status_code == 201, response.text
    contract = response.json()
    assert client.post("/api/extensions/qualify").json()["status"] == "qualified"
    response = client.post(
        "/api/extensions/validate",
        json={
            "format": "jas-extension-candidate-v1",
            "name": "Co-signature DEVELOPMENT",
            "provenance": "Scripted candidate; frozen external table supplies the oracle",
            "source": fixtures.joinpath("t17_cosigned_escrow.wat").read_text(),
            "examples": [{"state": 24, "expected": 4}],
        },
    )
    assert response.status_code == 201, response.text
    response = client.post(
        f"/api/extensions/contracts/{contract['id']}/checks",
        json={"review_id": response.json()["id"]},
    )
    assert response.status_code == 201, response.text
    check = response.json()
    assert check["passed"] and check["observed"] == (json.loads(external)["table"] + [-1] * 4) * 2
    response = client.post(f"/api/extensions/finite-checks/{check['id']}/admit")
    assert response.status_code == 201 and response.json()["runnable"], response.text
    saved = client.post(
        "/api/environments",
        json={
            "definition": {
                "name": "Co-signature DEVELOPMENT",
                "environment": "reviewed_finite",
                "rule_version": "1.0.0",
                "extension": response.json()["package"],
                "examples": [
                    {
                        "key": "consent",
                        "name": "Consent",
                        "roles": ["initiator", "counterparty"],
                        "parameters": {
                            "finite": {
                                "bindings": {
                                    "initiator": "initiator",
                                    "counterparty": "counterparty",
                                },
                                "private": {"initiator": {"docket": "consent-37"}},
                            }
                        },
                    }
                ],
            }
        },
    )
    assert saved.status_code == 201, saved.text
    applied = client.post(
        "/api/design/use-environment",
        json={
            "source": saved.json(),
            "example": "consent",
            "bindings": {},
        },
    )
    assert applied.status_code == 200, applied.text
    design = applied.json()
    design["rounds"] = 4
    # Prose labels grant neither permission nor a different actor order.
    design["profiles"][0]["role"] = "Counterparty may not initiate"
    design["profiles"][1]["role"] = "Initiator may release"
    return design


def test_cosigned_escrow_consequences_refund_horizon_privacy_and_restore(tmp_path):
    app = create_app(f"sqlite:///{tmp_path}/world.sqlite3")
    with TestClient(app, base_url="http://localhost") as client:
        design = Design.model_validate(cosigned_design(client))
        parameters = design.conditions[0].parameters

        def world(state=None, *, protocol=design, params=parameters):
            return create_world(protocol, params, 23, state, runner=app.state.extensions.transition)

        def decision(operation, memory="private note"):
            return Decision(
                action=FiniteAction(operation=operation),
                rationale="Inert prose",
                memory=memory,
                forecast=None,
            )

        def deny(w, operation, actor=None):
            before = w.snapshot()
            with pytest.raises(ValueError):
                w.step(w.actor() if actor is None else actor, decision(operation))
            assert w.snapshot() == before

        def advance(w, operation, literal, *, protocol=design):
            before = w.snapshot()
            restored = world(before, protocol=protocol)
            actor = w.actor()
            events, measures = w.step(actor, decision(operation))
            assert restored.step(actor, decision(operation)) == (events, measures)
            assert restored.snapshot() == w.snapshot()
            assert (
                tuple(w.state[k] for k in ("finite_state", "credits", "escrow", "spent")) == literal
            )
            assert events[0].kind == "finite_transition"
            assert events[0].data["after"] == dict(
                zip(
                    ("finite_state", "credits", "escrow", "spent"),
                    literal,
                    strict=True,
                )
            )
            assert w.state["credits"] + w.state["escrow"] + w.state["spent"] == 2
            assert w.state["spent"] >= before["spent"]
            if w.actor() is None:
                assert len(measures) == 1 and measures[0].key == "finite_success"
                assert measures[0].value == float(w.state["outcome"]["success"])
            else:
                assert measures == []

        success = world()
        initiator, counterparty = success.order()
        assert [initiator, counterparty] == ["member_1", "member_2"]
        assert parameters.finite is not None
        assert parameters.finite.bindings == {"initiator": initiator, "counterparty": counterparty}
        deny(success, "offer", counterparty)
        deny(success, "sign")
        advance(success, "offer", (1, 1, 1, 0))
        deny(success, "release")
        advance(success, "sign", (2, 1, 1, 0))
        deny(success, "cancel")
        deny(success, "release", counterparty)
        advance(success, "release", (3, 1, 0, 1))
        assert success.state["outcome"] == {"success": True, "reason": "released"}
        deny(success, "release", initiator)

        refund = world()
        for operation, literal in [
            ("offer", (1, 1, 1, 0)),
            ("wait", (1, 1, 1, 0)),
            ("cancel", (0, 2, 0, 0)),
            ("wait", (0, 2, 0, 0)),
            ("offer", (1, 1, 1, 0)),
            ("sign", (2, 1, 1, 0)),
            ("release", (3, 1, 0, 1)),
        ]:
            if operation == "cancel":
                deny(refund, "sign")  # offered initiator has no signing authority
                deny(refund, "release")
            advance(refund, operation, literal)
        assert refund.state["outcome"] == {"success": True, "reason": "released"}

        repeated = world()
        for operation, literal in [
            ("offer", (1, 1, 1, 0)),
            ("wait", (1, 1, 1, 0)),
            ("cancel", (0, 2, 0, 0)),
            ("wait", (0, 2, 0, 0)),
        ] * 2:
            advance(repeated, operation, literal)
        assert repeated.state["outcome"] == {"success": False, "reason": "horizon"}

        veto = world()
        advance(veto, "offer", (1, 1, 1, 0))
        advance(veto, "cancel", (4, 2, 0, 0))
        assert veto.state["outcome"] == {"success": False, "reason": "stopped"}
        deny(veto, "sign", initiator)

        for counterparty_stops in (False, True):
            stopped = world()
            advance(stopped, "offer", (1, 1, 1, 0))
            advance(stopped, "sign", (2, 1, 1, 0))
            deny(stopped, "cancel")
            if counterparty_stops:
                advance(stopped, "wait", (2, 1, 1, 0))
                deny(stopped, "cancel")
                deny(stopped, "release")
            advance(stopped, "stop", (4, 1, 0, 1))
            assert stopped.state["outcome"] == {"success": False, "reason": "stopped"}

        short = design.model_copy(update={"rounds": 2})
        horizon = world(protocol=short)
        for operation, literal in [
            ("offer", (1, 1, 1, 0)),
            ("sign", (2, 1, 1, 0)),
            ("wait", (2, 1, 1, 0)),
            ("wait", (2, 1, 1, 0)),
        ]:
            advance(horizon, operation, literal, protocol=short)
        assert horizon.state["outcome"] == {"success": False, "reason": "horizon"}
        assert world(horizon.snapshot(), protocol=short).snapshot() == horizon.snapshot()

        for memory in ("none", "notes", "history", "episodic"):
            a, b = parameters.model_copy(deep=True), parameters.model_copy(deep=True)
            a.memory = b.memory = memory
            assert b.finite is not None
            b.finite.private[initiator]["docket"] = "consent-91"
            first, second = world(params=a), world(params=b)
            for w, marker in [(first, "consent-37"), (second, "consent-91")]:
                w.step(initiator, decision("offer", marker))
            assert first.observe(initiator) != second.observe(initiator)
            assert first.observe(counterparty) == second.observe(counterparty)
            assert "consent-37" not in json.dumps(first.observe(counterparty))
            assert first.decision_schema(first.observe(counterparty)).model_json_schema() == (
                second.decision_schema(second.observe(counterparty)).model_json_schema()
            )
            assert world(first.snapshot(), params=a).observe(counterparty) == first.observe(
                counterparty
            )
            assert world(second.snapshot(), params=b).observe(counterparty) == second.observe(
                counterparty
            )

        initial = world().snapshot()
        for changed in [
            {"escrow": False},
            {"spent": False},
            {"credits": True},
            {"position": 2},
            {"done": True},
            {"finite_state": 3},
        ]:
            checkpoint = copy.deepcopy(initial)
            checkpoint.update(changed)
            with pytest.raises(ValueError):
                world(checkpoint)
        assert client.get("/api/settings").json()["usage"]["requests"] == 0


def test_cosigned_engine_tools_keep_docket_private_and_replay_without_sampling(
    tmp_path, monkeypatch
):
    """Existing-property qualification; literal consequences were frozen before WAT."""
    app = create_app(f"sqlite:///{tmp_path}/engine.sqlite3")
    seen = []

    async def respond(messages, info):
        prompt = json.loads(messages[-1].parts[0].content)
        seen.append(prompt)
        if not prompt["operations"]:
            value = {"operation": "observe", "decision": None}
        else:
            observation = prompt["operations"][0]["result"]
            operation = {"open": "offer", "offered": "sign", "signed": "release"}[
                observation["finite"]["state"]
            ]
            value = {
                "operation": "decide",
                "decision": {
                    "action": {"kind": "finite", "operation": operation},
                    "rationale": "Inert self-report",
                    "forecast": None,
                    "memory": observation["private_information"].get("docket", "counterparty note"),
                },
            }
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, value)],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    def provider(name):
        assert name == "openai:gpt-6-luna", f"Unexpected participant substitution {name}"
        return FunctionModel(function=respond)

    monkeypatch.setattr(app.state.models, "model", provider)
    with TestClient(app, base_url="http://localhost") as client:
        payload = cosigned_design(client)
        payload["rounds"] = 2
        payload["response_tokens"] = 4096
        payload["budget_usd"] = 1.0
        payload["conditions"][0]["harness"] = {
            "kind": "tool_using",
            "version": "2.0.0",
            "max_requests": 2,
            "max_tool_operations": 1,
            "tools": ["observe"],
            "max_context_chars": 32000,
            "capabilities": dict.fromkeys(
                ("planning", "memory", "investigation", "verification"),
                "disabled",
            ),
        }
        records = []
        initial_usage = client.get("/api/settings").json()["usage"]
        for marker in ("consent-37", "consent-91"):
            design = copy.deepcopy(payload)
            design["conditions"][0]["parameters"]["finite"]["private"]["member_1"]["docket"] = (
                marker
            )
            saved = client.post("/api/studies", json={"design": design})
            assert saved.status_code == 201, saved.text
            sid = saved.json()["id"]
            study = client.get(f"/api/studies/{sid}").json()
            rid = study["runs"][0]["id"]
            before = client.get(f"/api/runs/{rid}").json()
            assert before["summary"]["turn"] == 0
            assert before["requests"] == [] and before["activations"] == []
            assert client.get("/api/settings").json()["usage"]["requests"] == 6 * len(records)
            assert (
                client.post(f"/api/runs/{rid}/control", json={"action": "start"}).status_code == 200
            )

            async def finished(run_id=rid):
                await app.state.engine.executions[run_id].task

            assert client.portal is not None
            client.portal.call(finished)
            run = client.get(f"/api/runs/{rid}").json()
            assert (run["summary"]["status"], run["summary"]["turn"]) == ("complete", 3), run
            assert tuple(
                run["state"][k] for k in ("finite_state", "credits", "escrow", "spent")
            ) == (3, 1, 0, 1)
            assert run["state"]["outcome"] == {"success": True, "reason": "released"}
            assert [turn["action"] for turn in run["turns"]] == [
                {"kind": "finite", "operation": "offer"},
                {"kind": "finite", "operation": "sign"},
                {"kind": "finite", "operation": "release"},
            ]
            assert len(run["requests"]) == 6
            for request in run["requests"]:
                assert (
                    request["status"],
                    request["model"],
                    request["input_tokens"],
                    request["output_tokens"],
                ) == (
                    "complete",
                    "openai:gpt-6-luna",
                    100,
                    50,
                )
                assert Decimal(str(request["cost_usd"])) * 1_000_000 == 35
            assert len(run["activations"]) == 3
            for activation in run["activations"]:
                assert [op["kind"] for op in activation["operations"]] == [
                    "observe",
                    "decide",
                    "settle",
                ]
                assert activation["status"] == "committed"
                assert activation["identity"]["harness"]["max_requests"] == 2
            counterparty = client.get(f"/api/runs/{rid}/turns/2").json()
            assert counterparty["observation"]["private_information"] == {}
            assert marker not in json.dumps(counterparty["observation"])
            assert marker not in json.dumps(run["activations"][1])
            assert client.get(f"/api/studies/{sid}").json()["revisions"] == study["revisions"]
            exported = client.get(f"/api/studies/{sid}/export").json()
            assert exported["version"] == 17
            assert (
                exported["revisions"][0]["design"]["environment_source"]
                == payload["environment_source"]
            )
            records.append((sid, rid, run, exported))

        assert initial_usage["requests"] == 0
        usage = client.get("/api/settings").json()["usage"]
        assert (
            usage["requests"],
            usage["input_tokens"],
            usage["output_tokens"],
            usage["partial"],
        ) == (12, 1200, 600, False)
        assert Decimal(str(usage["cost_usd"])) * 1_000_000 == 420
        counterparty_prompts = [p for p in seen if p["actor"] == "member_2"]
        assert len(counterparty_prompts) == 4
        delivered = [p["operations"][0]["result"] for p in counterparty_prompts if p["operations"]]
        assert len(delivered) == 2 and delivered[0] == delivered[1]
        for prompt in counterparty_prompts:
            assert "consent-37" not in json.dumps(prompt) and "consent-91" not in json.dumps(prompt)

        def no_provider(_name):
            raise AssertionError("Replay must construct no provider")

        monkeypatch.setattr(app.state.models, "model", no_provider)
        for sid, rid, run, exported in records:
            verified = client.post(f"/api/runs/{rid}/verify")
            assert verified.status_code == 200, verified.text
            assert (verified.json()["verified_turns"], verified.json()["model_requests"]) == (3, 0)
            assert client.get(f"/api/runs/{rid}").json()["state"] == run["state"]
            assert client.get(f"/api/studies/{sid}/export").json() == exported
        assert client.get("/api/settings").json()["usage"] == usage
