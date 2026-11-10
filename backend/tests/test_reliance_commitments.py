"""T11 DEVELOPMENT: independently worked consequences through public seams."""

import itertools
import json
import os
import subprocess
import sys
import time
from pathlib import Path

import pytest
from agent_sim.api import create_app
from agent_sim.domain import Decision, Design, ReadArtifact
from agent_sim.simulation.environments import create_world
from fastapi.testclient import TestClient
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.models.function import FunctionModel
from pydantic_ai.usage import RequestUsage

from backend.tests.test_artifact_workspace import save, wait_finished
from backend.tests.test_claim_support import claim_client as claim_client
from backend.tests.test_claim_support import finish
from backend.tests.test_claim_support import run as run_control
from backend.tests.test_claim_support import source as evidence_source

ACTORS = ["oak-7", "fen-2", "ash-9", "bay-4"]


def protocol(timing="phased_simultaneous"):
    return {
        "title": "Voluntary reliance with alternatives",
        "question": "Which promises attract reliance and what happens by the deadline?",
        "environment": "reliance_commitments",
        "profiles": [
            {"key": a, "name": a, "goal": "Choose freely.", "role": "Participant"} for a in ACTORS
        ],
        "seeds": [41],
        "rounds": 5,
        "response_tokens": 512,
        "openai_reasoning_effort": "low",
        "measures": ["reliance_fulfillment", "reliance_value"],
        "conditions": [
            {
                "key": "voluntary",
                "name": "Voluntary",
                "model": "openai:gpt-6-luna",
                "parameters": {
                    "artifacts": {
                        "write_limit": 2,
                        "objects": [
                            *[
                                {
                                    "key": f"values-{i}",
                                    "name": f"Values {i}",
                                    "readers": [a],
                                    "content": {"share": s, "keep": k},
                                }
                                for i, (a, s, k) in enumerate(
                                    [
                                        ("oak-7", 2, 9),
                                        ("fen-2", -2, 4),
                                        ("ash-9", 3, 8),
                                        ("bay-4", 0, 6),
                                    ]
                                )
                            ],
                            {
                                "key": "sealed-fen",
                                "name": "Fen confidential evidence",
                                "owner": "fen-2",
                                "content": {"reading": "fen-private-41"},
                            },
                            {
                                "key": "sealed-bay",
                                "name": "Bay confidential evidence",
                                "owner": "bay-4",
                                "content": {"reading": "bay-private-41"},
                            },
                        ],
                    },
                    "coordination": {
                        "timing": timing,
                        "turn_order": ACTORS,
                        "conflict_order": ["ash-9", "bay-4", "oak-7", "fen-2"],
                        "routes": [
                            {"sender": a, "recipient": b} for a in ACTORS for b in ACTORS if a != b
                        ],
                        "delivery_delay": 2,
                        "alternatives": ["share", "keep"],
                        "information": {a: f"values-{i}" for i, a in enumerate(ACTORS)},
                        "match_bonus": 0,
                    },
                    "commitments": {
                        "opportunities": [
                            {
                                "key": "alpha",
                                "promisor": "oak-7",
                                "recipient": "fen-2",
                                "artifact": "sealed-fen",
                                "alternative": "share",
                                "opens_at": 2,
                                "deadline": 4,
                                "fulfilled_value": 13,
                                "unfulfilled_value": -7,
                            },
                            {
                                "key": "beta",
                                "promisor": "ash-9",
                                "recipient": "bay-4",
                                "artifact": "sealed-bay",
                                "alternative": "share",
                                "opens_at": 2,
                                "deadline": 4,
                                "fulfilled_value": 5,
                                "unfulfilled_value": -11,
                            },
                        ]
                    },
                },
            }
        ],
    }


def decide(kind="wait_coordination", **fields):
    return Decision.model_validate(
        {"action": {"kind": kind, **fields}, "rationale": "", "memory": "", "forecast": None}
    )


def phase(world, actions=None, order=ACTORS):
    events = []
    for a in order:
        result, _ = world.step(a, decide(**(actions or {}).get(a, {})))
        events.extend(e.model_dump() for e in result)
    return events


def retain(name, **value):
    if raw := os.getenv("T11_RAW_DIR"):
        path = Path(raw) / f"{name}.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(value, indent=2) + "\n")


@pytest.mark.parametrize(
    "opens_at,deadline,slots,opportunities",
    [
        pytest.param(5, 6, [0, 4], [], id="gap"),
        pytest.param(4, 5, [0, 4], [4], id="next-slot"),
        pytest.param(5, 8, [0, 4], [], id="exclusive-later-slot"),
        pytest.param(8, 9, [0, 4, 8], [8], id="later-slot"),
        pytest.param(0, 4, [0], [], id="exclusive-first-slot"),
    ],
)
def test_commitment_requires_an_aligned_fulfillment_slot(opens_at, deadline, slots, opportunities):
    value = protocol("sequential")
    window = value["conditions"][0]["parameters"]["commitments"]["opportunities"][0]
    window.update(opens_at=opens_at, deadline=deadline)
    design = Design.model_validate(value)
    parameters = design.conditions[0].parameters
    world = create_world(design, parameters, 41)
    actions, actual_slots = [], []
    while world.snapshot()["logical_time"] < deadline:
        tick, actor = world.snapshot()["logical_time"], world.actor()
        assert actor is not None
        if actor == "oak-7":
            actual_slots.append(tick)
        action = (
            decide("make_commitment", opportunity="alpha")
            if tick == 0
            else decide("rely_on_commitment", opportunity="alpha")
            if tick == 1
            else decide()
        )
        actions.append((actor, action))
        world.step(actor, action)
        checkpoint = json.loads(json.dumps(world.snapshot()))
        world = create_world(design, parameters, 41, checkpoint)
        assert world.snapshot() == checkpoint
    state = world.snapshot()
    assert actual_slots == slots
    row = state["commitments"]["alpha"]
    assert row["status"] == ("breached" if opportunities else "infeasible")
    assert row["feasible_at_promise"] is bool(opportunities)
    assert row["opportunities"] == opportunities
    assert row["eligible"] is bool(opportunities)
    assert state["reliance_effects"] == {"oak-7": 0, "fen-2": -7, "ash-9": 0, "bay-4": 0}
    replay = create_world(design, parameters, 41)
    for actor, action in actions:
        replay.step(actor, action)
    assert replay.snapshot() == state


@pytest.mark.parametrize("fulfill", [False, True])
def test_actual_fulfillment_slot_overrides_a_schedule_changed_by_withdrawal(fulfill):
    value = protocol("sequential")
    value["conditions"][0]["parameters"]["commitments"]["opportunities"][0].update(
        opens_at=7, deadline=8
    )
    design = Design.model_validate(value)
    parameters = design.conditions[0].parameters
    world = create_world(design, parameters, 41)
    sequence = [
        ("oak-7", decide("make_commitment", opportunity="alpha")),
        ("fen-2", decide("rely_on_commitment", opportunity="alpha")),
        ("ash-9", decide("stop")),
        ("bay-4", decide("stop")),
        ("oak-7", decide()),
        ("fen-2", decide("stop")),
        ("oak-7", decide()),
        ("oak-7", decide("choose_alternative", alternative="share") if fulfill else decide()),
    ]
    for tick, (actor, action) in enumerate(sequence):
        assert world.actor() == actor
        assert world.snapshot()["logical_time"] == tick
        world.step(actor, action)
        world = create_world(design, parameters, 41, json.loads(json.dumps(world.snapshot())))
    state = world.snapshot()
    row = state["commitments"]["alpha"]
    assert row["feasible_at_promise"] is False
    assert row["opportunities"] == [7]
    assert row["status"] == ("fulfilled" if fulfill else "breached")
    assert row["eligible"] is True
    assert state["reliance_effects"]["fen-2"] == (13 if fulfill else -7)
    replay = create_world(design, parameters, 41)
    for actor, action in sequence:
        replay.step(actor, action)
    assert replay.snapshot() == state


def test_voluntary_reliance_has_independent_recipient_consequences_and_later_responses():
    design = Design.model_validate(protocol())
    world = create_world(design, design.conditions[0].parameters, 41)
    events = phase(
        world,
        {
            "oak-7": {"kind": "make_commitment", "opportunity": "alpha"},
            "ash-9": {"kind": "make_commitment", "opportunity": "beta"},
        },
    )
    events += phase(
        world,
        {
            "fen-2": {"kind": "rely_on_commitment", "opportunity": "alpha"},
            "bay-4": {"kind": "rely_on_commitment", "opportunity": "beta"},
        },
    )
    events += phase(
        world,
        {
            a: {"kind": "choose_alternative", "alternative": "share" if a == "oak-7" else "keep"}
            for a in ACTORS
        },
    )
    events += phase(world)
    resolved = world.snapshot()["commitments"]
    assert resolved["alpha"]["status"] == "fulfilled"
    assert resolved["beta"]["status"] == "breached"
    assert resolved["alpha"]["eligible"] and resolved["beta"]["eligible"]
    effects = [e for e in events if e["kind"] == "reliance_consequence"]
    assert [(e["actor"], e["data"]["value"]) for e in effects] == [("fen-2", 13), ("bay-4", -11)]
    assert all(e["visibility"] == "private" and e["target"] is None for e in effects)
    assert "bay-private-41" not in json.dumps(world.observe("oak-7"))
    events += phase(
        world,
        {
            "fen-2": {
                "kind": "send_message",
                "recipient": "oak-7",
                "text": "A later response, without an intent claim.",
            }
        },
    )
    state = world.snapshot()
    assert state["outcome"]["payoffs"] == {"oak-7": 2, "fen-2": 17, "ash-9": 8, "bay-4": -5}
    assert state["outcome"]["reliance_effects"] == {
        "oak-7": 0,
        "fen-2": 13,
        "ash-9": 0,
        "bay-4": -11,
    }
    assert state["logical_time"] == 5 and world.actor() is None
    restored = create_world(design, design.conditions[0].parameters, 41, state)
    assert restored.snapshot() == state
    retain("voluntary-and-later-response", state=state, events=events)


def test_public_http_run_export_accounting_and_exact_call_free_replay(tmp_path, monkeypatch):
    inputs = []

    async def respond(messages, info):
        observation = json.loads(messages[-1].parts[0].content)
        inputs.append(observation)
        actor, tick = observation["you"]["key"], observation["logical_time"]
        action = {}
        if tick == 0 and actor in {"oak-7", "ash-9"}:
            action = dict(
                kind="make_commitment", opportunity="alpha" if actor == "oak-7" else "beta"
            )
        elif tick == 1 and actor in {"fen-2", "bay-4"}:
            action = dict(
                kind="rely_on_commitment", opportunity="alpha" if actor == "fen-2" else "beta"
            )
        elif tick == 2 and actor in {"oak-7", "ash-9"}:
            action = dict(
                kind="read_artifact", artifact="sealed-fen" if actor == "oak-7" else "sealed-bay"
            )
        elif tick == 2 or tick == 3 and actor in {"oak-7", "ash-9"}:
            action = dict(
                kind="choose_alternative", alternative="share" if actor == "oak-7" else "keep"
            )
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, decide(**action).model_dump())],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    app = create_app(f"sqlite:///{tmp_path}/reliance.sqlite3", static_dir=tmp_path / "static")
    monkeypatch.setattr(app.state.models, "model", lambda _name: FunctionModel(function=respond))
    with TestClient(app, base_url="http://localhost") as client:
        study, rid = save(client, protocol())
        assert client.post(f"/api/runs/{rid}/control", json={"action": "start"}).status_code == 200
        run = wait_finished(client, rid)
        retain("http-observed-before-assertions", run=run, inputs=inputs)
        assert run["summary"]["status"] == "complete", run
        assert run["state"]["outcome"]["payoffs"] == {
            "oak-7": 2,
            "fen-2": 17,
            "ash-9": 8,
            "bay-4": -5,
        }
        assert run["metrics"]["reliance_value"] == 22
        assert run["metrics"]["reliance_fulfillment"] == 0.5
        assert {e["actor"] for e in run["events"] if e["kind"] == "read_artifact"} == {
            "oak-7",
            "ash-9",
        }
        assert "balances" not in run["state"]
        usage = client.get("/api/settings").json()["usage"]
        assert usage["requests"] == len(inputs) == 20
        assert all(
            c["model"] == "openai:gpt-6-luna" and c["purpose"] == "decision"
            for c in run["requests"]
        )
        assert all(
            "bay-private-41" not in json.dumps(o) for o in inputs if o["you"]["key"] == "oak-7"
        )
        replay = client.post(f"/api/runs/{rid}/verify")
        assert replay.status_code == 200, replay.text
        assert replay.json()["verified_turns"] == 20 and replay.json()["model_requests"] == 0
        assert client.get("/api/settings").json()["usage"] == usage
        exported = client.get(f"/api/studies/{study['id']}/export").json()
        assert exported["runs"][0]["evidence"][-1]["checkpoint"] == run["state"]
        exposure = client.get(f"/api/runs/{rid}/exposure").json()
        consequences = [o for o in exposure["opportunities"] if o["kind"] == "reliance_consequence"]
        retain("http-exposure-before-assertions", exposure=exposure)
        assert {o["participant"] for o in consequences} == {"fen-2", "bay-4"}
        assert all(o["included"] for o in consequences)
        reviewed = client.post("/api/design/preflight", json={"design": protocol()})
        assert reviewed.status_code == 200, reviewed.text
        assert not any(i["severity"] == "error" for i in reviewed.json()["issues"]), reviewed.json()
        catalog = client.get("/api/catalog")
        assert catalog.status_code == 200, catalog.text
        assert any(t["id"] == "reliance_commitments" for t in catalog.json()["templates"])
        retain("http-run-accounting-replay", run=run, inputs=inputs, export=exported, usage=usage)


def test_horizon_before_declared_deadline_preserves_unresolved_reliance_without_effect():
    value = protocol()
    value["rounds"] = 2
    design = Design.model_validate(value)
    world = create_world(design, design.conditions[0].parameters, 41)
    phase(world, {"oak-7": dict(kind="make_commitment", opportunity="alpha")})
    phase(world, {"fen-2": dict(kind="rely_on_commitment", opportunity="alpha")})
    state = world.snapshot()
    retain("horizon-before-deadline", state=state)
    assert state["commitments"]["alpha"]["status"] == "unresolved"
    assert state["commitments"]["alpha"]["resolved_at"] is None
    assert state["reliance_effects"] == dict.fromkeys(ACTORS, 0)
    assert state["outcome"]["commitments"] == {"alpha": "unresolved", "beta": "no_promise"}


@pytest.mark.parametrize("mode", ["null", "unrelied", "reverse", "infeasible", "absent"])
def test_independent_null_infeasible_absent_and_alternative_outcomes(mode):
    value = protocol()
    if mode == "infeasible":
        value["conditions"][0]["parameters"]["commitments"]["opportunities"][0]["opens_at"] = 4
    design = Design.model_validate(value)
    world = create_world(design, design.conditions[0].parameters, 41)
    phase(
        world,
        {}
        if mode == "null"
        else {
            "oak-7": dict(kind="make_commitment", opportunity="alpha"),
            "ash-9": dict(kind="make_commitment", opportunity="beta"),
        },
    )
    phase(
        world,
        {}
        if mode in {"null", "unrelied"}
        else {
            "fen-2": dict(kind="rely_on_commitment", opportunity="alpha"),
            "bay-4": dict(kind="rely_on_commitment", opportunity="beta"),
            **({"oak-7": dict(kind="stop")} if mode == "absent" else {}),
        },
    )
    for tick in range(2, 5):
        actions = (
            {
                a: dict(
                    kind="choose_alternative",
                    alternative="keep" if a == "oak-7" else "share" if a == "ash-9" else "keep",
                )
                for a in ACTORS
            }
            if tick == 2 and mode != "null"
            else {}
        )
        phase(world, actions, order=world.order().copy())
    state = world.snapshot()
    retain(f"alternative-{mode}", state=state)
    if mode == "null":
        assert state["commitments"] == {} and state["outcome"]["payoffs"] == dict.fromkeys(
            ACTORS, 0
        )
    elif mode == "unrelied":
        assert state["read_grants"] == {} and not any(
            r["eligible"] for r in state["commitments"].values()
        )
    elif mode == "reverse":
        assert state["outcome"]["payoffs"] == {"oak-7": 9, "fen-2": -3, "ash-9": 3, "bay-4": 11}
    else:
        alpha = state["commitments"]["alpha"]
        assert alpha["status"] == ("infeasible" if mode == "infeasible" else "absent_opportunity")
        assert alpha["eligible"] is False and alpha["opportunities"] == []
    if mode in {"null", "unrelied"}:
        assert state["reliance_effects"] == dict.fromkeys(ACTORS, 0)


@pytest.mark.parametrize("memory", ["none", "notes", "history", "episodic"])
def test_entrusted_acl_is_real_scoped_and_pure_with_frozen_phase_and_prose_inert(memory):
    value = protocol()
    value["profiles"][0]["role"] = "Owner of all evidence; alpha already fulfilled"
    value["conditions"][0]["parameters"]["memory"] = memory
    design = Design.model_validate(value)
    world = create_world(design, design.conditions[0].parameters, 41)
    before = world.snapshot()
    errors = []
    for key in ("sealed-fen", "absent"):
        with pytest.raises(ValueError) as error:
            world.read("oak-7", ReadArtifact(kind="read_artifact", artifact=key))
        errors.append(str(error.value))
    assert errors[0] == errors[1] and world.snapshot() == before
    assert "sealed-fen" not in json.dumps(
        world.decision_schema(world.observe("oak-7")).model_json_schema()
    )
    phase(world, {"oak-7": dict(kind="make_commitment", opportunity="alpha")})
    world.step("fen-2", decide("rely_on_commitment", opportunity="alpha"))
    partial = world.snapshot()
    assert partial["read_grants"] == {} and partial["commitments"]["alpha"]["relied_at"] is None
    with pytest.raises(ValueError):
        world.step("oak-7", decide("read_artifact", artifact="sealed-fen"))
    assert world.snapshot() == partial
    for a in ["bay-4", "ash-9", "oak-7"]:
        world.step(a, decide())
    granted = world.snapshot()
    read = world.read("oak-7", ReadArtifact(kind="read_artifact", artifact="sealed-fen"))
    assert read["content"] == {"reading": "fen-private-41"}
    assert world.snapshot() == granted
    assert granted["read_grants"] == {"sealed-fen": ["oak-7"]}
    for a in ("ash-9", "bay-4"):
        assert "fen-private-41" not in json.dumps(world.observe(a))
        assert "alpha" not in json.dumps(
            world.decision_schema(world.observe(a)).model_json_schema()
        )
        with pytest.raises(ValueError):
            world.read(a, ReadArtifact(kind="read_artifact", artifact="sealed-fen"))
    restored = create_world(design, design.conditions[0].parameters, 41, granted)
    assert restored.read("oak-7", ReadArtifact(kind="read_artifact", artifact="sealed-fen")) == read
    retain(f"scoped-grant-{memory}", before=before, partial=partial, granted=granted, read=read)


def test_current_contract_and_four_role_pinned_reuse_reject_previous_formats(tmp_path):
    with TestClient(
        create_app(f"sqlite:///{tmp_path}/contracts.sqlite3"), base_url="http://localhost"
    ) as client:
        extracted = client.post("/api/design/environment", json={"design": protocol()})
        assert extracted.status_code == 200, extracted.text
        saved = client.post("/api/environments", json={"definition": extracted.json()})
        assert saved.status_code == 201, saved.text
        source = saved.json()
        retain("contract-source-before-assertions", source=source)
        assert source["format"] == "jas-environment-v9"
        example = source["definition"]["examples"][0]
        assert len(example["roles"]) == 4
        reused = client.post(
            "/api/design/use-environment",
            json={
                "source": source,
                "example": example["key"],
                "bindings": {},
            },
        )
        assert reused.status_code == 200, reused.text
        value = reused.json()
        assert len(value["profiles"]) == 4
        opportunity = value["conditions"][0]["parameters"]["commitments"]["opportunities"][0]
        assert (opportunity["promisor"], opportunity["recipient"]) == ("member_1", "member_2")
        assert value["environment_source"] == source
        study, _ = save(client, value)
        assert client.get(f"/api/studies/{study['id']}/export").json()["version"] == 14
        incompatible = {**source, "format": "jas-environment-v5"}
        denied = client.post(
            "/api/design/use-environment",
            json={
                "source": incompatible,
                "example": example["key"],
                "bindings": {},
            },
        )
        assert denied.status_code == 422
        assert client.get("/api/settings").json()["usage"]["requests"] == 0
        retain("contract-reuse", source=source, reused=value, denial=denied.json())


def test_frozen_lens_recomputes_recipient_effects_and_separately_accounts_analysis(claim_client):
    client, controls, _ = claim_client
    actions = []
    for tick in range(5):
        for a in ACTORS:
            action = {"kind": "wait_coordination"}
            if tick == 0 and a in {"oak-7", "ash-9"}:
                action = dict(
                    kind="make_commitment", opportunity="alpha" if a == "oak-7" else "beta"
                )
            elif tick == 1 and a in {"fen-2", "bay-4"}:
                action = dict(
                    kind="rely_on_commitment", opportunity="alpha" if a == "fen-2" else "beta"
                )
            elif tick == 2:
                action = dict(
                    kind="choose_alternative", alternative="share" if a == "oak-7" else "keep"
                )
            actions.append(action)
    controls["artifact_actions"] = iter(actions)
    controls["claims"] = lambda _prompt, rid: [
        {
            "kind": "calculation",
            "text": "Declared value 22; intent unassessed.",
            "calculation_id": f"run:{rid}:reliance_value",
            "value": 22,
            "scope": "captured_run",
        }
    ]
    study, rid = save(client, protocol())
    assert run_control(client, rid)["status"] == "complete"
    before = evidence_source(client.get(f"/api/studies/{study['id']}/export").json())
    final = finish(
        client,
        client.post(
            "/api/chats",
            json={
                "question": "What were the settled reliance effects?",
                "context": f"run:{rid}",
            },
        ),
    )
    retain("lens-observed-before-assertions", analysis=final)
    assert final["status"] == "complete", final
    lens = final["output"]["lens"]
    fact = lens["facts"][0]
    assert fact["balances"] is None
    assert fact["reliance_state"]["reliance_effects"] == {
        "oak-7": 0,
        "fen-2": 13,
        "ash-9": 0,
        "bay-4": -11,
    }
    values = {row["id"]: row["value"] for row in lens["calculations"]}
    assert values[f"run:{rid}:reliance_value"] == 22
    assert values[f"run:{rid}:reliance_fulfillment"] == 0.5
    assert values[f"run:{rid}:feasible_commitment_breaches"] == 1
    assert values[f"run:{rid}:total_utility"] is None
    assert f"run:{rid}:artifact_success" not in values
    assert final["output"]["support"]["claims"][0]["status"] == "checked"
    assert evidence_source(client.get(f"/api/studies/{study['id']}/export").json()) == before
    requests = client.get(f"/api/runs/{rid}").json()["requests"]
    analyses = [r for r in requests if r["analysis_id"] == final["id"]]
    assert {r["purpose"] for r in analyses} == {"analysis"}
    assert {r["model"] for r in analyses} == {"openai:gpt-6.1-sol"}
    assert len([r for r in requests if r["purpose"] == "decision"]) == 20


@pytest.mark.parametrize("order", list(itertools.permutations(ACTORS)))
def test_phase_completion_order_cannot_change_promises_access_or_recipient_results(order):
    design = Design.model_validate(protocol())
    world = create_world(design, design.conditions[0].parameters, 41)
    phase(
        world,
        {
            "oak-7": dict(kind="make_commitment", opportunity="alpha"),
            "ash-9": dict(kind="make_commitment", opportunity="beta"),
        },
        order,
    )
    phase(
        world,
        {
            "fen-2": dict(kind="rely_on_commitment", opportunity="alpha"),
            "bay-4": dict(kind="rely_on_commitment", opportunity="beta"),
        },
        order,
    )
    phase(
        world,
        {
            a: dict(kind="choose_alternative", alternative="share" if a == "oak-7" else "keep")
            for a in ACTORS
        },
        order,
    )
    phase(world, order=order)
    phase(world, order=order)
    state = world.snapshot()
    assert state["outcome"]["payoffs"] == {"oak-7": 2, "fen-2": 17, "ash-9": 8, "bay-4": -5}
    assert state["read_grants"] == {"sealed-bay": ["ash-9"], "sealed-fen": ["oak-7"]}
    assert state["commitments"]["alpha"]["opportunities"] == [2]
    assert state["commitments"]["beta"]["opportunities"] == [2]
    retain("completion-order-" + "-".join(order), state=state)


@pytest.mark.parametrize("timing", ["sequential", "phased_simultaneous"])
def test_permuted_actor_value_alternative_and_ring_topology_witness(timing):
    value = protocol(timing)
    original = json.dumps(value)
    renamed = dict(zip(ACTORS, ["zircon", "umber", "linen", "cobalt"], strict=True))
    for a, b in renamed.items():
        original = original.replace(a, b)
    value = json.loads(original.replace('"share"', '"amber"').replace('"keep"', '"slate"'))
    params = value["conditions"][0]["parameters"]
    actors = list(renamed.values())
    params["coordination"]["conflict_order"] = actors[::-1]
    params["coordination"]["routes"] = [
        {"sender": a, "recipient": actors[(i + 1) % 4]} for i, a in enumerate(actors)
    ]
    for o in params["commitments"]["opportunities"]:
        o["opens_at"], o["deadline"] = (8, 16) if timing == "sequential" else (2, 4)
    design = Design.model_validate(value)
    world = create_world(design, design.conditions[0].parameters, 41)
    phase(
        world,
        {
            "zircon": dict(kind="make_commitment", opportunity="alpha"),
            "linen": dict(kind="make_commitment", opportunity="beta"),
        },
        actors,
    )
    phase(
        world,
        {
            "umber": dict(kind="rely_on_commitment", opportunity="alpha"),
            "cobalt": dict(kind="rely_on_commitment", opportunity="beta"),
        },
        actors,
    )
    phase(
        world,
        {
            a: dict(kind="choose_alternative", alternative="amber" if a == "linen" else "slate")
            for a in actors
        },
        actors,
    )
    phase(world, order=actors)
    phase(world, order=actors)
    state = world.snapshot()
    assert state["outcome"]["payoffs"] == {"zircon": 9, "umber": -3, "linen": 3, "cobalt": 11}
    assert state["logical_time"] == (20 if timing == "sequential" else 5)
    assert state["commitments"]["alpha"]["status"] == "breached"
    assert state["commitments"]["beta"]["status"] == "fulfilled"
    retain(f"renamed-ring-{timing}", protocol=value, state=state)


def test_new_process_restores_sealed_reliance_and_queued_mail_without_calls(tmp_path, monkeypatch):
    source = tmp_path / "protocol.json"
    source.write_text(json.dumps(protocol()))
    ready = tmp_path / "ready.json"
    database = f"sqlite:///{tmp_path}/restart.sqlite3"
    script = (Path(__file__).parent / "fixtures" / "reliance_process.py").read_text()
    with (tmp_path / "process.log").open("w") as output:
        process = subprocess.Popen(
            [sys.executable, "-c", script, database, str(source), str(ready)],
            stdout=output,
            stderr=subprocess.STDOUT,
        )
        try:
            deadline = time.monotonic() + 10
            while not ready.exists() and process.poll() is None and time.monotonic() < deadline:
                time.sleep(0.01)
            assert ready.exists(), (tmp_path / "process.log").read_text()
        finally:
            if process.poll() is None:
                process.kill()
            process.wait(timeout=5)
    rid = json.loads(ready.read_text())["run_id"]
    app = create_app(database, static_dir=tmp_path / "static")

    def forbidden(_):
        pytest.fail("Restoration and replay cannot contact any provider")

    monkeypatch.setattr(app.state.models, "model", forbidden)
    with TestClient(app, base_url="http://localhost") as client:
        run = client.get(f"/api/runs/{rid}").json()
        retain("process-restored-before-assertions", run=run)
        assert run["summary"]["status"] == "paused" and run["summary"]["turn"] == 6
        state = run["state"]
        assert state["logical_time"] == 1 and set(state["pending_actions"]) == {"oak-7", "fen-2"}
        assert state["commitments"]["alpha"]["relied_at"] is None and state["read_grants"] == {}
        assert state["pending_deliveries"][0]["text"] == "private-queued-41"
        assert state["pending_deliveries"][0]["due_at"] == 2
        assert [r["status"] for r in run["requests"]] == ["complete"] * 6 + ["unknown"]
        usage = client.get("/api/settings").json()["usage"]
        replay = client.post(f"/api/runs/{rid}/verify")
        assert replay.status_code == 200 and replay.json()["verified_turns"] == 6, replay.text
        assert replay.json()["model_requests"] == 0
        assert client.get("/api/settings").json()["usage"] == usage
        assert client.get(f"/api/runs/{rid}").json()["state"] == state

        # Explicitly requested subsequent steps are new sampling, unlike restoration.
        async def resume(_messages, info):
            return ModelResponse(
                parts=[ToolCallPart(info.output_tools[0].name, decide().model_dump())],
                usage=RequestUsage(input_tokens=100, output_tokens=50),
            )

        monkeypatch.setattr(app.state.models, "model", lambda _: FunctionModel(function=resume))
        for number in (7, 8):
            assert run_control(client, rid, "step")["turn"] == number
        after = client.get(f"/api/runs/{rid}").json()
        assert after["state"]["read_grants"] == {"sealed-fen": ["oak-7"]}
        assert after["state"]["inboxes"]["bay-4"][0]["text"] == "private-queued-41"
        assert after["turns"][:6] == run["turns"]
        assert client.get("/api/settings").json()["usage"]["requests"] == usage["requests"] + 2
        assert client.post(f"/api/runs/{rid}/verify").json()["model_requests"] == 0
        retain("process-resumed", before=run, after=after, usage=usage)


def test_withdrawing_after_final_choice_cannot_rewrite_settled_choice_or_value():
    design = Design.model_validate(protocol())
    world = create_world(design, design.conditions[0].parameters, 41)
    phase(world, {"oak-7": dict(kind="choose_alternative", alternative="keep")})
    phase(world, {"oak-7": dict(kind="stop")})
    while world.actor() is not None:
        phase(world, order=world.order().copy())
    state = world.snapshot()
    retain("stop-after-final", state=state)
    assert state["choices"]["oak-7"] == "keep"
    assert state["outcome"]["payoffs"]["oak-7"] == 9


def test_tool_harness_uses_entrusted_evidence_with_pure_reads_and_complete_effort(
    tmp_path, monkeypatch
):
    async def respond(messages, info):
        prompt = json.loads(messages[-1].parts[0].content)
        actor, number = prompt["actor"], prompt["round"]
        ops = prompt["operations"]
        payload = {"operation": "decide", "read": None, "decision": decide().model_dump()}
        if number == 1 and actor in {"oak-7", "ash-9"}:
            payload["decision"] = decide(
                "make_commitment", opportunity="alpha" if actor == "oak-7" else "beta"
            ).model_dump()
        elif number == 2 and actor in {"fen-2", "bay-4"}:
            payload["decision"] = decide(
                "rely_on_commitment", opportunity="alpha" if actor == "fen-2" else "beta"
            ).model_dump()
        elif number == 3:
            if actor in {"oak-7", "ash-9"} and not ops:
                payload = {
                    "operation": "read_artifact",
                    "read": {
                        "kind": "read_artifact",
                        "artifact": "sealed-fen" if actor == "oak-7" else "sealed-bay",
                        "version": 1,
                    },
                    "decision": None,
                }
            else:
                if actor in {"oak-7", "ash-9"}:
                    assert ops[0]["result"]["content"] == {
                        "reading": "fen-private-41" if actor == "oak-7" else "bay-private-41"
                    }
                payload["decision"] = decide(
                    "choose_alternative", alternative="share" if actor == "oak-7" else "keep"
                ).model_dump()
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, payload)],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    value = protocol()
    value["conditions"][0]["harness"] = {
        "kind": "tool_using",
        "tools": ["read_artifact"],
        "max_requests": 2,
        "max_tool_operations": 1,
    }
    app = create_app(f"sqlite:///{tmp_path}/tools.sqlite3", static_dir=tmp_path / "static")
    monkeypatch.setattr(app.state.models, "model", lambda _: FunctionModel(function=respond))
    with TestClient(app, base_url="http://localhost") as client:
        _, rid = save(client, value)
        assert client.post(f"/api/runs/{rid}/control", json={"action": "start"}).status_code == 200
        run = wait_finished(client, rid)
        retain("tool-effort-before-assertions", run=run)
        assert run["summary"]["status"] == "complete", run
        assert run["state"]["logical_time"] == 5 and len(run["turns"]) == 20
        assert run["summary"]["usage"]["requests"] == 22
        assert run["state"]["outcome"]["payoffs"] == {
            "oak-7": 2,
            "fen-2": 17,
            "ash-9": 8,
            "bay-4": -5,
        }
        reads = [
            op
            for a in run["activations"]
            for op in a["operations"]
            if op["kind"] == "read_artifact"
        ]
        assert len(reads) == 2
        assert {r["result"]["artifact"] for r in reads} == {"sealed-fen", "sealed-bay"}
        usage = client.get("/api/settings").json()["usage"]
        replay = client.post(f"/api/runs/{rid}/verify")
        assert replay.status_code == 200 and replay.json()["verified_reads"] == 2, replay.text
        assert client.get("/api/settings").json()["usage"] == usage


@pytest.mark.parametrize("cutoff", [1, 4, 6, 8, 12, 16])
def test_same_chat_reanalysis_preserves_frozen_promise_grant_deadline_scope(claim_client, cutoff):
    client, controls, _ = claim_client
    actions = []
    for tick in range(5):
        for a in ACTORS:
            action = {"kind": "wait_coordination"}
            if tick == 0 and a == "oak-7":
                action = dict(kind="make_commitment", opportunity="alpha")
            if tick == 1 and a == "fen-2":
                action = dict(kind="rely_on_commitment", opportunity="alpha")
            if tick == 2 and a == "oak-7":
                action = dict(kind="choose_alternative", alternative="share")
            actions.append(action)
    controls["artifact_actions"] = iter(actions)
    controls["claims"] = lambda _p, _rid: []
    study, rid = save(client, protocol())
    for n in range(1, cutoff + 1):
        assert run_control(client, rid, "step")["turn"] == n
    first = finish(
        client,
        client.post(
            "/api/chats", json={"question": "Inspect current commitments.", "context": f"run:{rid}"}
        ),
    )
    assert first["status"] == "complete", first
    fact = first["output"]["lens"]["facts"][0]
    reliance = fact["reliance_state"]
    assert len(reliance["commitments"]) == (1 if cutoff >= 4 else 0)
    assert reliance["read_grants"] == ({"sealed-fen": ["oak-7"]} if cutoff >= 8 else {})
    assert reliance["reliance_effects"]["fen-2"] == (13 if cutoff >= 16 else 0)
    assert run_control(client, rid)["status"] == "complete"
    before = evidence_source(client.get(f"/api/studies/{study['id']}/export").json())
    frozen = finish(
        client,
        client.post(
            "/api/chats",
            json={
                "question": "Apply communication lens to that frozen scope.",
                "context": f"run:{rid}",
                "chat_id": first["chat_id"],
                "source_analysis_id": first["id"],
                "lens": "communication",
            },
        ),
    )
    assert frozen["status"] == "complete", frozen
    assert frozen["cutoffs"] == {rid: cutoff}
    assert frozen["output"]["lens"]["facts"] == first["output"]["lens"]["facts"]
    assert frozen["output"]["exposure"] == first["output"]["exposure"]
    assert evidence_source(client.get(f"/api/studies/{study['id']}/export").json()) == before
    retain(f"frozen-cutoff-{cutoff}", first=first, reanalysis=frozen)


@pytest.mark.parametrize("communication,channels", [(False, ["promises"]), (True, ["messages"])])
def test_disabling_promise_communication_removes_real_affordance_without_substitution(
    communication, channels
):
    value = protocol()
    value["conditions"][0]["parameters"].update(
        communication=communication, communication_channels=channels
    )
    design = Design.model_validate(value)
    world = create_world(design, design.conditions[0].parameters, 41)
    before = world.snapshot()
    with pytest.raises(ValueError):
        world.step("oak-7", decide("make_commitment", opportunity="alpha"))
    assert world.snapshot() == before
    assert not any(a["kind"] == "make_commitment" for a in world.observe("oak-7")["legal_actions"])
