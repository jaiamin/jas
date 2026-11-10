"""Independent T11 DEVELOPMENT expectations, frozen in the integration report."""

import copy
import itertools
import json
import os
from pathlib import Path

import pytest
from agent_sim.domain import Decision, Design, ReadArtifact
from agent_sim.simulation.environments import create_world

from backend.tests.test_artifact_workspace import save
from backend.tests.test_claim_support import claim_client as claim_client
from backend.tests.test_claim_support import finish, run, source
from backend.tests.test_researcher_designs import client as client
from backend.tests.test_researcher_designs import finish as finish_design
from backend.tests.test_researcher_designs import provider, scope

ACTORS = ["ember", "quill", "cedar", "dune"]


def protocol(*, timing="phased_simultaneous", rounds=5):
    scale = 4 if timing == "sequential" else 1
    return {
        "title": "Independent optional reliance",
        "question": "Can four participants voluntarily entrust access and make commitments, "
        "with independent choices and addressed responses after the deadline?",
        "environment": "reliance_commitments",
        "profiles": [
            {"key": a, "name": a.title(), "goal": "Inspect and choose freely."} for a in ACTORS
        ],
        "seeds": [307],
        "rounds": rounds,
        "measures": ["reliance_fulfillment", "reliance_value"],
        "conditions": [
            {
                "key": "optional",
                "name": "Optional reliance",
                "model": "openai:gpt-6-luna",
                "parameters": {
                    "artifacts": {
                        "write_limit": 1,
                        "objects": [
                            *[
                                {"key": f"values_{a}", "name": a, "readers": [a], "content": v}
                                for a, v in zip(
                                    ACTORS,
                                    [
                                        {"share": 4, "keep": 11},
                                        {"share": -3, "keep": 6},
                                        {"share": 8, "keep": 2},
                                        {"share": 1, "keep": 9},
                                    ],
                                    strict=True,
                                )
                            ],
                            {
                                "key": "quill_note",
                                "name": "Quill sealed note",
                                "owner": "quill",
                                "content": {"reading": "quill-only-307"},
                            },
                            {
                                "key": "dune_note",
                                "name": "Dune sealed note",
                                "owner": "dune",
                                "content": {"reading": "dune-only-307"},
                            },
                        ],
                    },
                    "coordination": {
                        "timing": timing,
                        "turn_order": ACTORS,
                        "conflict_order": ["dune", "quill", "ember", "cedar"],
                        "routes": [
                            {"sender": a, "recipient": b} for a in ACTORS for b in ACTORS if a != b
                        ],
                        "delivery_delay": 2,
                        "alternatives": ["share", "keep"],
                        "information": {a: f"values_{a}" for a in ACTORS},
                        "match_bonus": 0,
                    },
                    "commitments": {
                        "opportunities": [
                            {
                                "key": key,
                                "promisor": promisor,
                                "recipient": recipient,
                                "artifact": artifact,
                                "alternative": "share",
                                "opens_at": 2 * scale,
                                "deadline": 4 * scale,
                                "fulfilled_value": fulfilled,
                                "unfulfilled_value": unfulfilled,
                            }
                            for key, promisor, recipient, artifact, fulfilled, unfulfilled in [
                                ("first", "ember", "quill", "quill_note", 17, -13),
                                ("second", "cedar", "dune", "dune_note", 7, -19),
                            ]
                        ]
                    },
                },
            }
        ],
    }


def decision(kind="wait_coordination", **fields):
    return Decision.model_validate(
        {"action": {"kind": kind, **fields}, "rationale": "", "memory": "", "forecast": None}
    )


def actions(phase, *, reverse=False, rely=True):
    if phase == 0:
        return {
            "ember": {"kind": "make_commitment", "opportunity": "first"},
            "cedar": {"kind": "make_commitment", "opportunity": "second"},
        }
    if phase == 1 and rely:
        return {
            "quill": {"kind": "rely_on_commitment", "opportunity": "first"},
            "dune": {"kind": "rely_on_commitment", "opportunity": "second"},
        }
    if phase == 2:
        return {
            a: {
                "kind": "choose_alternative",
                "alternative": "share" if a == ("cedar" if reverse else "ember") else "keep",
            }
            for a in ACTORS
        }
    return {}


def settle(world, proposals=None, order=ACTORS):
    events = []
    for actor in order:
        rows, _ = world.step(actor, decision(**(proposals or {}).get(actor, {})))
        events.extend(row.model_dump() for row in rows)
    return events


def retain(name, **data):
    if directory := os.getenv("JAS_T11_INTEGRATION_EVIDENCE"):
        path = Path(directory)
        path.mkdir(parents=True, exist_ok=True)
        (path / f"{name}.json").write_text(json.dumps(data, indent=2) + "\n")


@pytest.mark.parametrize("order", list(itertools.permutations(ACTORS)))
def test_independent_completion_orders_preserve_literal_recipient_values(order):
    design = Design.model_validate(protocol())
    world = create_world(design, design.conditions[0].parameters, 307)
    for tick in range(5):
        settle(world, actions(tick), order)
    state = world.snapshot()
    assert state["outcome"]["payoffs"] == {"ember": 4, "quill": 23, "cedar": 2, "dune": -10}
    assert state["reliance_effects"] == {"ember": 0, "quill": 17, "cedar": 0, "dune": -19}
    assert state["commitments"]["first"]["status"] == "fulfilled"
    assert state["commitments"]["second"]["status"] == "breached"
    assert all(row["opportunities"] == [2] for row in state["commitments"].values())


@pytest.mark.parametrize("timing", ["sequential", "phased_simultaneous"])
@pytest.mark.parametrize("mode", ["reverse", "unrelied", "null", "infeasible", "unresolved"])
def test_independent_alternatives_nulls_and_deadlines(timing, mode):
    value = protocol(timing=timing, rounds=2 if mode == "unresolved" else 5)
    if mode == "infeasible":
        for row in value["conditions"][0]["parameters"]["commitments"]["opportunities"]:
            row["opens_at"] = row["deadline"]
    design = Design.model_validate(value)
    world = create_world(design, design.conditions[0].parameters, 307)
    all_measures = []
    for tick in range(design.rounds):
        proposals = (
            {}
            if mode == "null"
            else actions(tick, reverse=mode == "reverse", rely=mode != "unrelied")
        )
        for actor in ACTORS:
            _, measures = world.step(actor, decision(**proposals.get(actor, {})))
            all_measures.extend(measures)
    state = world.snapshot()
    rate = next(m for m in all_measures if m.key == "reliance_fulfillment")
    if mode == "reverse":
        assert state["outcome"]["payoffs"] == {"ember": 11, "quill": -7, "cedar": 8, "dune": 16}
        assert sum(state["outcome"]["payoffs"].values()) == 28
        assert rate.value == 0.5 and rate.denominator == 2
    else:
        assert rate.value is None and rate.denominator == 0
        if mode in {"unrelied", "null", "unresolved"}:
            assert all(v == 0 for v in state["reliance_effects"].values())
        if mode == "null":
            assert state["commitments"] == state["read_grants"] == {}
        if mode in {"infeasible", "unresolved"}:
            assert {row["status"] for row in state["commitments"].values()} == {mode}
    retain(
        f"independent-{timing}-{mode}", state=state, measures=[m.model_dump() for m in all_measures]
    )


@pytest.mark.parametrize("memory", ["none", "history", "notes", "episodic"])
def test_independent_acl_grant_barrier_privacy_and_restore(memory):
    value = protocol()
    value["conditions"][0]["parameters"]["memory"] = memory
    design = Design.model_validate(value)
    world = create_world(design, design.conditions[0].parameters, 307)
    errors = []
    for artifact in ("quill_note", "missing"):
        with pytest.raises(ValueError) as error:
            world.read("ember", ReadArtifact(kind="read_artifact", artifact=artifact))
        errors.append(str(error.value))
    assert errors[0] == errors[1]
    settle(world, actions(0))
    world.step("quill", decision("rely_on_commitment", opportunity="first"))
    partial = world.snapshot()
    with pytest.raises(ValueError):
        world.step("ember", decision("read_artifact", artifact="quill_note"))
    assert world.snapshot() == partial and partial["read_grants"] == {}
    restored = create_world(design, design.conditions[0].parameters, 307, partial)
    for actor in ["dune", "cedar", "ember"]:
        restored.step(actor, decision())
    granted = restored.snapshot()
    assert restored.read("ember", ReadArtifact(kind="read_artifact", artifact="quill_note"))[
        "content"
    ] == {"reading": "quill-only-307"}
    assert restored.snapshot() == granted
    for actor in ["cedar", "dune"]:
        observed = restored.observe(actor)
        assert "quill-only-307" not in json.dumps(observed)
        assert "first" not in json.dumps(restored.decision_schema(observed).model_json_schema())
        with pytest.raises(ValueError):
            restored.read(actor, ReadArtifact(kind="read_artifact", artifact="quill_note"))
    retain(f"independent-acl-{memory}", partial=partial, granted=granted)


def test_t13_discovers_four_person_commitments_and_saves_exact_rules_without_calls(
    client, monkeypatch
):
    design = Design.model_validate(protocol()).model_dump()
    brief = scope(
        design,
        operationalization="Optional typed promises, access entrusting, final choices, deadlines "
        "and later addressed responses; intent remains unassessed.",
        size_rationale="Four independent participants; five phases allow promise, reliance, "
        "choice, deadline and response opportunities. One fixed-seed trajectory is descriptive, "
        "not four replications. Save authorizes no sampling.",
        requirements=[
            {
                "source": "make commitments",
                "capability": "commitments",
                "mapping": "direct",
                "explanation": "Typed promises and voluntary reliance with executable deadlines.",
            },
            {
                "source": "entrust access",
                "capability": "versioned_artifacts",
                "mapping": "direct",
                "explanation": "Actual recipient-controlled read access.",
            },
        ],
    )
    declined = copy.deepcopy(brief)
    declined.update(supported=False, explanation="The four-person commitment mechanic is absent.")
    calls = provider(
        client,
        monkeypatch,
        design,
        brief=lambda prompt: brief if prompt.get("scope_feedback") else declined,
    )
    result = finish_design(client, client.post("/api/chats", json={"question": design["question"]}))
    assert result["status"] == "complete" and result["output"]["supported"], result
    proposal = result["output"]["design"]
    assert (
        proposal["question"] == design["question"]
        and proposal["profiles"] == Design.model_validate(design).model_dump()["profiles"]
    )
    assert (
        proposal["conditions"][0]["parameters"]
        == Design.model_validate(design).conditions[0].parameters.model_dump()
    )
    assert proposal["environment_source"]["format"] == "jas-environment-v7"
    assert any("scope_feedback" in row["prompt"] for row in calls)
    usage = client.get("/api/settings").json()["usage"]
    saved = client.post("/api/studies", json={"design": proposal, "plan_id": result["id"]})
    assert saved.status_code == 201, saved.text
    study = client.get(f"/api/studies/{saved.json()['id']}").json()
    assert all(r["status"] == "ready" and r["turn"] == 0 for r in study["runs"])
    assert client.get("/api/settings").json()["usage"] == usage
    assert client.get(f"/api/studies/{study['id']}/export").json()["version"] == 12
    retain("independent-t13", result=result, study=study, requests=calls)


def test_http_reliance_bounded_delivery_readonly_lens_and_replay(claim_client):
    client, controls, seen = claim_client
    design = protocol(rounds=7)
    proposals = []
    for tick in range(7):
        selected = actions(tick)
        if tick == 3:
            selected = {
                "ember": {"kind": "read_artifact", "artifact": "quill_note"},
                "cedar": {"kind": "read_artifact", "artifact": "dune_note"},
            }
        if tick == 4:
            selected = {
                "quill": {
                    "kind": "send_message",
                    "recipient": "ember",
                    "text": "quill response after deadline",
                },
                "dune": {
                    "kind": "send_message",
                    "recipient": "cedar",
                    "text": "dune private response",
                },
            }
        proposals.extend(selected.get(actor, {"kind": "wait_coordination"}) for actor in ACTORS)
    controls["artifact_actions"] = iter(proposals)
    controls["claims"] = lambda _prompt, rid: [
        {
            "kind": "calculation",
            "text": "Declared value19; intent unassessed.",
            "calculation_id": f"run:{rid}:reliance_value",
            "value": 19,
            "scope": "captured_run",
        }
    ]
    study, rid = save(client, design)
    assert run(client, rid)["status"] == "complete"
    detail = client.get(f"/api/runs/{rid}").json()
    assert detail["state"]["outcome"]["payoffs"] == {
        "ember": 4,
        "quill": 23,
        "cedar": 2,
        "dune": -10,
    }
    participant_inputs = [p for p in seen if "you" in p]
    assert len(participant_inputs) == len(detail["turns"]) == 28
    ember = [p for p in participant_inputs if p["you"]["key"] == "ember"]
    assert "quill-only-307" in json.dumps(ember) and "dune-only-307" not in json.dumps(ember)
    assert "quill response after deadline" in json.dumps(ember[-1]["inbox"])
    assert "dune private response" not in json.dumps(ember)
    exported = client.get(f"/api/studies/{study['id']}/export").json()
    preserved = source(exported)
    replay = client.post(f"/api/runs/{rid}/verify")
    assert replay.status_code == 200 and replay.json()["model_requests"] == 0
    assert (
        len(seen) == 28
        and source(client.get(f"/api/studies/{study['id']}/export").json()) == preserved
    )
    analysis = finish(
        client,
        client.post(
            "/api/chats",
            json={
                "question": "What do the captured commitments establish?",
                "context": f"run:{rid}",
            },
        ),
    )
    assert analysis["status"] == "complete", analysis
    lens = analysis["output"]["lens"]
    values = {c["id"]: c["value"] for c in lens["calculations"]}
    assert values[f"run:{rid}:reliance_value"] == 19
    assert values[f"run:{rid}:reliance_fulfillment"] == 0.5
    assert values[f"run:{rid}:total_utility"] is None
    assert values[f"run:{rid}:feasible_commitment_breaches"] == 1
    assert analysis["output"]["support"]["claims"][0]["status"] == "checked"
    assert source(client.get(f"/api/studies/{study['id']}/export").json()) == preserved
    requests = client.get(f"/api/runs/{rid}").json()["requests"]
    assert len([r for r in requests if r["purpose"] == "decision"]) == 28
    assert {r["model"] for r in requests if r["analysis_id"] == analysis["id"]} == {
        "openai:gpt-6.1-sol"
    }
    retain("independent-http-lens", run=detail, exported=exported, analysis=analysis, provider=seen)


def test_four_role_followups_preserve_full_source_and_remain_reviewable(client, monkeypatch):
    design = Design.model_validate(protocol(rounds=7)).model_dump()
    brief = scope(
        design,
        operationalization="Voluntary entrusting and deadline commitments; no required breach.",
        size_rationale="Four choice makers and seven phases allow promises, reliance, choices, "
        "deadline resolution, addressed responses and their observation. One fixed seed is "
        "one descriptive trajectory. Saving does not authorize participant calls.",
        requirements=[
            {
                "source": "make commitments",
                "capability": "commitments",
                "mapping": "direct",
                "explanation": "Declared typed promises, access grants and deadlines.",
            }
        ],
    )
    calls = provider(client, monkeypatch, design, brief=brief)
    chat_id = None
    proposals = []
    for question in [design["question"], *["Retain that source and the four participants."] * 3]:
        response = finish_design(
            client, client.post("/api/chats", json={"question": question, "chat_id": chat_id})
        )
        assert response["status"] == "complete", response
        chat_id = response["chat_id"]
        proposal = response["output"]["design"]
        assert proposal["question"] == design["question"]
        assert proposal["conditions"] == Design.model_validate(design).model_dump()["conditions"]
        proposals.append(proposal)
    assert all(p["environment_source"] == proposals[0]["environment_source"] for p in proposals)
    assert len(client.get(f"/api/chats/{chat_id}").json()) == 4
    assert client.get("/api/studies").json() == []
    assert all(row["model"] is not None for row in calls)
    retain("independent-four-followups", proposals=proposals, requests=calls)
