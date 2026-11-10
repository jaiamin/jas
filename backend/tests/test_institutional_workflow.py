"""T12 DEVELOPMENT tracer; literal expectations precede implementation in the report."""

import asyncio
import itertools
import json

import pytest
from agent_sim.api import create_app
from agent_sim.domain import Decision, Design, ReadArtifact
from agent_sim.simulation.environments import create_world
from fastapi.testclient import TestClient
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.models.function import FunctionModel
from pydantic_ai.usage import RequestUsage

from backend.tests.test_artifact_workspace import decision, save, wait_finished

ACTORS = ["alder", "birch", "cedar", "dune", "elm", "fern"]


def workflow_world(value=None, state=None):
    design = Design.model_validate(value or protocol())
    return create_world(design, design.conditions[0].parameters, design.seeds[0], state)


def settle_phase(world, selected=None, order=ACTORS):
    events = []
    for actor in order:
        action = (selected or {}).get(actor, {"kind": "wait_workflow"})
        rows, _ = world.step(actor, Decision.model_validate(decision(action)))
        events.extend(row.model_dump() for row in rows)
    return events


def protocol():
    return {
        "title": "Material-limited institutional work",
        "question": "How do ownership, accepted handoffs and scarce materials affect work?",
        "environment": "institutional_workflow",
        "profiles": [
            {"key": actor, "name": actor.title(), "goal": "Inspect the available work and choose."}
            for actor in ACTORS
        ],
        "seeds": [431],
        "rounds": 8,
        "response_tokens": 512,
        "openai_reasoning_effort": "low",
        "conditions": [
            {
                "key": "scarce",
                "name": "Seven material units",
                "model": "openai:gpt-6-luna",
                "harness": {"kind": "direct_action"},
                "parameters": {
                    "artifacts": {
                        "write_limit": 20,
                        "objects": [
                            *[
                                {
                                    "key": f"{work}_record",
                                    "name": f"{work.title()} record",
                                    "readers": workers,
                                    "writers": workers,
                                    "content": {"batch": 0},
                                }
                                for work, workers in [
                                    ("intake", ["alder", "birch"]),
                                    ("release", ["cedar", "dune"]),
                                    ("audit", ["elm", "fern"]),
                                ]
                            ],
                            {
                                "key": "sealed",
                                "name": "Private evidence",
                                "readers": [],
                                "content": {"marker": "sealed-development-431"},
                            },
                        ],
                    },
                    "workflow": {
                        "timing": "phased_simultaneous",
                        "turn_order": ACTORS,
                        "conflict_order": ["birch", "alder", "dune", "cedar", "fern", "elm"],
                        "routes": [
                            {"sender": sender, "recipient": recipient}
                            for sender, recipient in zip(
                                ACTORS,
                                ["birch", "cedar", "dune", "elm", "fern", "alder"],
                                strict=True,
                            )
                        ],
                        "delivery_delay": 2,
                        "resource_stock": 7,
                        "work_items": [
                            {
                                "key": "intake",
                                "artifact": "intake_record",
                                "workers": ["alder", "birch"],
                                "dependencies": [],
                                "handoff_to": ["cedar", "dune"],
                                "resource_cost": 3,
                                "duration": 2,
                            },
                            {
                                "key": "release",
                                "artifact": "release_record",
                                "workers": ["cedar", "dune"],
                                "dependencies": ["intake"],
                                "handoff_to": ["elm", "fern"],
                                "resource_cost": 2,
                                "duration": 1,
                            },
                            {
                                "key": "audit",
                                "artifact": "audit_record",
                                "workers": ["elm", "fern"],
                                "dependencies": [],
                                "handoff_to": ["alder", "birch"],
                                "resource_cost": 4,
                                "duration": 1,
                            },
                        ],
                    },
                },
            }
        ],
    }


def test_owned_work_atomically_versions_its_artifact_and_spends_materials(tmp_path, monkeypatch):
    delivered = []
    selected = {
        (0, "alder"): {"kind": "claim_work", "work": "intake"},
        (1, "alder"): {
            "kind": "perform_work",
            "work": "intake",
            "expected_version": 1,
            "content": {"batch": 17},
            "sources": [],
        },
    }

    async def respond(messages, info):
        observation = json.loads(messages[-1].parts[0].content)
        delivered.append(observation)
        action = selected.get(
            (observation["logical_time"], observation["you"]["key"]),
            {"kind": "wait_workflow"},
        )
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, decision(action))],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    app = create_app(f"sqlite:///{tmp_path}/t12-tracer.sqlite3", static_dir=tmp_path / "static")
    provider = FunctionModel(function=respond)
    monkeypatch.setattr(app.state.models, "model", lambda _name: provider)
    with TestClient(app, base_url="http://localhost") as client:
        study, run_id = save(client, protocol())
        assert client.get("/api/settings").json()["usage"]["requests"] == 0
        assert delivered == []

        claimed = client.get(f"/api/runs/{run_id}").json()
        for _ in range(6):
            response = client.post(f"/api/runs/{run_id}/control", json={"action": "step"})
            assert response.status_code == 200, response.text
            claimed = wait_finished(client, run_id)
        assert claimed["state"]["logical_time"] == 1
        assert claimed["state"]["work"]["intake"]["owner"] == "alder"
        assert claimed["state"]["resource_stock"] == 7
        assert claimed["state"]["resource_spent"] == 0
        assert len(claimed["state"]["artifacts"]["intake_record"]["versions"]) == 1

        run = claimed
        for _ in range(6):
            response = client.post(f"/api/runs/{run_id}/control", json={"action": "step"})
            assert response.status_code == 200, response.text
            run = wait_finished(client, run_id)
        assert run["summary"]["status"] == "paused", run
        assert run["summary"]["turn"] == 12
        state = run["state"]
        assert state["logical_time"] == 2
        assert (state["resource_stock"], state["resource_spent"], state["writes_remaining"]) == (
            4,
            3,
            19,
        )
        versions = state["artifacts"]["intake_record"]["versions"]
        assert [version["content"] for version in versions] == [{"batch": 0}, {"batch": 17}]
        assert versions[1]["author"] == "alder"
        assert state["work"]["intake"]["status"] == "in_progress"
        assert state["work"]["intake"]["due_at"] == 3
        assert len(delivered) == len(run["requests"]) == 12
        assert "sealed-development-431" not in json.dumps(delivered)

        before = client.get("/api/settings").json()["usage"]
        exported = client.get(f"/api/studies/{study['id']}/export").json()
        assert exported["runs"][0]["evidence"][-1]["checkpoint"] == state
        assert len(exported["requests"]) == 12
        replay = client.post(f"/api/runs/{run_id}/verify")
        assert replay.status_code == 200, replay.text
        assert replay.json()["verified_turns"] == 12
        assert replay.json()["model_requests"] == 0
        assert len(delivered) == 12
        assert client.get("/api/settings").json()["usage"] == before
        after = client.get(f"/api/studies/{study['id']}/export").json()
        assert after["runs"][0]["evidence"] == exported["runs"][0]["evidence"]
        assert after["requests"] == exported["requests"]


def test_delayed_work_requires_accepted_handoff_before_dependent_start(tmp_path, monkeypatch):
    delivered = []
    selected = {
        (0, "alder"): {"kind": "claim_work", "work": "intake"},
        (1, "alder"): {
            "kind": "perform_work",
            "work": "intake",
            "expected_version": 1,
            "content": {"batch": 17},
            "sources": [],
        },
        (3, "alder"): {
            "kind": "handoff_work",
            "work": "intake",
            "recipient": "cedar",
            "version": 2,
        },
        (4, "cedar"): {"kind": "accept_handoff", "work": "intake", "version": 2},
        (5, "cedar"): {"kind": "claim_work", "work": "release"},
        (6, "cedar"): {
            "kind": "perform_work",
            "work": "release",
            "expected_version": 1,
            "content": {"batch": -6},
            "sources": [{"artifact": "intake_record", "version": 2}],
        },
    }

    async def respond(messages, info):
        observation = json.loads(messages[-1].parts[0].content)
        delivered.append(observation)
        action = selected.get(
            (observation["logical_time"], observation["you"]["key"]),
            {"kind": "wait_workflow"},
        )
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, decision(action))],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    app = create_app(f"sqlite:///{tmp_path}/t12-handoff.sqlite3", static_dir=tmp_path / "static")
    monkeypatch.setattr(app.state.models, "model", lambda _name: FunctionModel(function=respond))
    with TestClient(app, base_url="http://localhost") as client:
        _, run_id = save(client, protocol())
        for tick in range(7):
            for _ in range(6):
                response = client.post(f"/api/runs/{run_id}/control", json={"action": "step"})
                assert response.status_code == 200, response.text
                run = wait_finished(client, run_id)
                assert run["summary"]["status"] == "paused", run
            state = run["state"]
            if tick == 1:
                assert state["work"]["intake"]["status"] == "in_progress"
            if tick == 2:
                assert state["work"]["intake"]["status"] == "ready"
                assert (state["resource_stock"], state["resource_spent"]) == (4, 3)
            if tick == 3:
                assert state["work"]["intake"]["status"] == "handed_off"
                assert state["work"]["release"]["owner"] is None
            if tick == 4:
                assert state["work"]["intake"]["status"] == "accepted"
        assert state["logical_time"] == 7
        assert (state["resource_stock"], state["resource_spent"]) == (2, 5)
        assert state["work"]["release"]["status"] == "ready"
        release = state["artifacts"]["release_record"]["versions"]
        assert [v["content"] for v in release] == [{"batch": 0}, {"batch": -6}]
        assert release[1]["sources"] == [{"artifact": "intake_record", "version": 2}]
        cedar = {o["logical_time"]: o for o in delivered if o["you"]["key"] == "cedar"}
        assert "intake_record" not in [a["key"] for a in cedar[3]["artifacts"]]
        assert "intake_record" in [a["key"] for a in cedar[4]["artifacts"]]
        before = client.get("/api/settings").json()["usage"]
        assert len(delivered) == 42
        replay = client.post(f"/api/runs/{run_id}/verify")
        assert replay.status_code == 200, replay.text
        assert replay.json()["verified_turns"] == 42
        assert replay.json()["model_requests"] == 0
        assert client.get("/api/settings").json()["usage"] == before


def test_delegation_changes_later_affordances_without_spending_or_editing_work():
    world = workflow_world()
    settle_phase(world, {"alder": {"kind": "claim_work", "work": "intake"}})
    settle_phase(
        world,
        {
            "alder": {
                "kind": "delegate_work",
                "work": "intake",
                "recipient": "birch",
            }
        },
    )
    state = world.snapshot()
    assert state["work"]["intake"]["owner"] == "birch"
    assert state["resource_stock"] == 7 and state["resource_spent"] == 0
    assert len(state["artifacts"]["intake_record"]["versions"]) == 1
    assert "perform_work" not in [a["kind"] for a in world.observe("alder")["legal_actions"]]
    assert "perform_work" in [a["kind"] for a in world.observe("birch")["legal_actions"]]
    perform = {
        "kind": "perform_work",
        "work": "intake",
        "expected_version": 1,
        "content": {"batch": 17},
        "sources": [],
    }
    with pytest.raises(ValueError):
        world.step("alder", Decision.model_validate(decision(perform)))
    assert world.snapshot() == state
    settle_phase(world, {"birch": perform})
    state = world.snapshot()
    assert (state["resource_stock"], state["resource_spent"]) == (4, 3)
    assert state["artifacts"]["intake_record"]["versions"][1]["author"] == "birch"


def test_addressed_mail_waits_for_logical_time_and_partial_phase_restoration():
    world = workflow_world()
    world.step(
        "elm",
        Decision.model_validate(
            decision(
                {
                    "kind": "send_message",
                    "recipient": "fern",
                    "text": "audit remains optional",
                }
            )
        ),
    )
    assert world.observe("fern")["inbox"] == []
    assert world.observe("elm")["outbox"] == []
    partial = world.snapshot()
    restored = workflow_world(state=partial)
    assert restored.observe("fern") == world.observe("fern")
    for actor in [a for a in ACTORS if a != "elm"]:
        restored.step(actor, Decision.model_validate(decision({"kind": "wait_workflow"})))
    assert restored.snapshot()["logical_time"] == 1
    assert restored.observe("fern")["inbox"] == []
    assert len(restored.snapshot()["pending_deliveries"]) == 1
    settle_phase(restored)
    assert restored.snapshot()["logical_time"] == 2
    mail = restored.observe("fern")["inbox"]
    assert len(mail) == 1
    assert mail[0]["text"] == "audit remains optional"
    assert (mail[0]["sent_at"], mail[0]["due_at"], mail[0]["delivered_at"]) == (0, 2, 2)
    assert "audit remains optional" not in json.dumps(restored.observe("alder"))
    assert restored.snapshot()["resource_stock"] == 7


def test_phase_read_keeps_its_committed_version_through_settlement_and_restore():
    world = workflow_world()
    settle_phase(world, {"birch": {"kind": "claim_work", "work": "intake"}})
    world.step(
        "alder",
        Decision.model_validate(
            decision(
                {
                    "kind": "read_artifact",
                    "artifact": "intake_record",
                    "version": None,
                }
            )
        ),
    )
    restored = workflow_world(state=world.snapshot())
    events = settle_phase(
        restored,
        {
            "birch": {
                "kind": "perform_work",
                "work": "intake",
                "expected_version": 1,
                "content": {"batch": 17},
                "sources": [],
            }
        },
        order=["fern", "elm", "dune", "cedar", "birch"],
    )
    assert restored.snapshot()["logical_time"] == 2
    assert len(restored.snapshot()["artifacts"]["intake_record"]["versions"]) == 2
    read = next(event for event in events if event["kind"] == "read_artifact")
    assert read["data"]["version"] == 1
    assert read["data"]["content"] == {"batch": 0}
    assert restored.observe("alder")["last_result"]["version"] == 1


def test_horizon_records_unfinished_work_without_flushing_future_work_or_mail():
    value = protocol()
    value["rounds"] = 2
    world = workflow_world(value)
    settle_phase(world, {"alder": {"kind": "claim_work", "work": "intake"}})
    settle_phase(
        world,
        {
            "alder": {
                "kind": "perform_work",
                "work": "intake",
                "expected_version": 1,
                "content": {"batch": 17},
                "sources": [],
            },
            "elm": {"kind": "send_message", "recipient": "fern", "text": "still queued"},
        },
    )
    state = world.snapshot()
    assert state["done"] is True and state["logical_time"] == 2
    assert state["outcome"] == {
        "status": "horizon",
        "accepted": [],
        "unfinished": ["intake", "release", "audit"],
    }
    assert state["work"]["intake"]["status"] == "in_progress"
    assert state["work"]["intake"]["due_at"] == 3
    assert state["pending_deliveries"][0]["due_at"] == 3
    assert state["inboxes"]["fern"] == []
    assert (state["resource_stock"], state["resource_spent"]) == (4, 3)
    restored = workflow_world(value, state)
    with pytest.raises(ValueError):
        restored.step("fern", Decision.model_validate(decision({"kind": "wait_workflow"})))
    assert restored.snapshot() == state


def test_nine_material_units_allow_all_six_participants_to_finish_optional_work():
    value = protocol()
    value["rounds"] = 12
    value["conditions"][0]["parameters"]["workflow"]["resource_stock"] = 9
    phases = [
        {
            "alder": {"kind": "claim_work", "work": "intake"},
            "elm": {"kind": "claim_work", "work": "audit"},
        },
        {
            "alder": {
                "kind": "perform_work",
                "work": "intake",
                "expected_version": 1,
                "content": {"batch": 17},
                "sources": [],
            },
            "elm": {
                "kind": "perform_work",
                "work": "audit",
                "expected_version": 1,
                "content": {"batch": 29},
                "sources": [],
            },
        },
        {"elm": {"kind": "handoff_work", "work": "audit", "recipient": "birch", "version": 2}},
        {
            "birch": {"kind": "accept_handoff", "work": "audit", "version": 2},
            "alder": {"kind": "handoff_work", "work": "intake", "recipient": "cedar", "version": 2},
        },
        {"cedar": {"kind": "accept_handoff", "work": "intake", "version": 2}},
        {"dune": {"kind": "claim_work", "work": "release"}},
        {
            "dune": {
                "kind": "perform_work",
                "work": "release",
                "expected_version": 1,
                "content": {"batch": -6},
                "sources": [{"artifact": "intake_record", "version": 2}],
            }
        },
        {"dune": {"kind": "handoff_work", "work": "release", "recipient": "fern", "version": 2}},
        {"fern": {"kind": "accept_handoff", "work": "release", "version": 2}},
    ]
    # This case explicitly grants Dune read access to cite the completed intake.
    value["conditions"][0]["parameters"]["artifacts"]["objects"][0]["readers"].append("dune")
    world = workflow_world(value)
    for selected in phases:
        settle_phase(world, selected)
    state = world.snapshot()
    assert state["done"] is True and state["logical_time"] == 9
    assert state["outcome"] == {
        "status": "all_accepted",
        "accepted": ["intake", "release", "audit"],
        "unfinished": [],
    }
    assert (state["resource_stock"], state["resource_spent"], state["writes_remaining"]) == (
        0,
        9,
        17,
    )
    assert state["artifacts"]["release_record"]["versions"][1]["author"] == "dune"
    assert state["artifacts"]["release_record"]["versions"][1]["sources"] == [
        {"artifact": "intake_record", "version": 2},
    ]


def test_stop_withdraws_only_its_actor_and_all_withdrawn_preserves_null_outcome():
    world = workflow_world()
    settle_phase(world, {"alder": {"kind": "stop"}})
    state = world.snapshot()
    assert state["done"] is False and world.actor() == "birch"
    assert state["withdrawn"] == ["alder"]
    assert world.observe("alder")["legal_actions"] == []
    with pytest.raises(ValueError):
        world.step(
            "alder", Decision.model_validate(decision({"kind": "claim_work", "work": "intake"}))
        )
    assert world.snapshot() == state
    settle_phase(world, {actor: {"kind": "stop"} for actor in ACTORS[1:]}, order=ACTORS[1:])
    final = world.snapshot()
    assert final["done"] is True and world.actor() is None
    assert final["outcome"] == {
        "status": "withdrawn",
        "accepted": [],
        "unfinished": ["intake", "release", "audit"],
    }
    assert (final["resource_stock"], final["resource_spent"], final["writes_remaining"]) == (
        7,
        0,
        20,
    )
    assert all(len(obj["versions"]) == 1 for obj in final["artifacts"].values())


@pytest.mark.parametrize("reverse,winner", [(False, "birch"), (True, "alder")])
def test_all_720_claim_completion_orders_use_declared_priority_and_frozen_observations(
    reverse, winner
):
    value = protocol()
    if reverse:
        value["conditions"][0]["parameters"]["workflow"]["conflict_order"] = ACTORS
    design = Design.model_validate(value)
    reference = None
    counted = 0
    for order in itertools.permutations(ACTORS):
        world = create_world(design, design.conditions[0].parameters, 431)
        observations = {a: world.observe(a) for a in ACTORS}
        events = []
        for actor in order:
            assert world.observe(actor) == observations[actor]
            action = (
                {"kind": "claim_work", "work": "intake"}
                if actor in ACTORS[:2]
                else {"kind": "wait_workflow"}
            )
            rows, _ = world.step(actor, Decision.model_validate(decision(action)))
            events.extend(row.model_dump() for row in rows)
        final = world.snapshot()
        assert final["work"]["intake"]["owner"] == winner
        assert (final["resource_stock"], final["resource_spent"], final["writes_remaining"]) == (
            7,
            0,
            20,
        )
        assert len(final["artifacts"]["intake_record"]["versions"]) == 1
        rejected = [e for e in events if e["kind"] == "workflow_conflict"]
        assert len(rejected) == 1 and rejected[0]["actor"] != winner
        assert rejected[0]["visibility"] == "private"
        if reference is None:
            reference = final
        assert final == reference
        counted += 1
    assert counted == 720


@pytest.mark.parametrize(
    "reverse,stock,spent,started",
    [
        (False, 2, 3, "intake"),
        (True, 1, 4, "audit"),
    ],
)
def test_all_720_resource_contention_orders_settle_exactly_one_atomic_start(
    reverse, stock, spent, started
):
    value = protocol()
    rules = value["conditions"][0]["parameters"]["workflow"]
    rules["resource_stock"] = 5
    if reverse:
        rules["conflict_order"] = ["fern", "elm", "birch", "alder", "dune", "cedar"]
    design = Design.model_validate(value)
    prepared = workflow_world(value)
    settle_phase(
        prepared,
        {
            "birch": {"kind": "claim_work", "work": "intake"},
            "fern": {"kind": "claim_work", "work": "audit"},
        },
    )
    frozen = prepared.snapshot()
    reference = None
    counted = 0
    for order in itertools.permutations(ACTORS):
        world = create_world(design, design.conditions[0].parameters, 431, frozen)
        events = settle_phase(
            world,
            {
                "birch": {
                    "kind": "perform_work",
                    "work": "intake",
                    "expected_version": 1,
                    "content": {"batch": 17},
                    "sources": [],
                },
                "fern": {
                    "kind": "perform_work",
                    "work": "audit",
                    "expected_version": 1,
                    "content": {"batch": 29},
                    "sources": [],
                },
            },
            order=order,
        )
        state = world.snapshot()
        assert (state["resource_stock"], state["resource_spent"], state["writes_remaining"]) == (
            stock,
            spent,
            19,
        )
        assert len([e for e in events if e["kind"] == "workflow_conflict"]) == 1
        assert len(state["artifacts"][f"{started}_record"]["versions"]) == 2
        blocked = "audit" if started == "intake" else "intake"
        assert state["work"][blocked]["status"] == "claimed"
        assert state["work"][blocked]["due_at"] is None
        assert (
            state["artifacts"][f"{blocked}_record"]["versions"]
            == frozen["artifacts"][f"{blocked}_record"]["versions"]
        )
        if reference is None:
            reference = state
        assert state == reference
        counted += 1
    assert counted == 720


@pytest.mark.parametrize(
    "case",
    [
        "blocked_dependency",
        "foreign_worker",
        "duplicate_claim",
        "foreign_owner",
        "stale_version",
        "private_source",
        "future_source",
        "missing_source",
        "unfunded",
        "early_handoff",
        "wrong_recipient",
        "stale_handoff",
        "wrong_acceptor",
        "stale_acceptance",
        "raw_write",
        "procedure_edit",
    ],
)
def test_denied_work_leaves_the_entire_material_artifact_and_actor_checkpoint_unchanged(case):
    value = protocol()
    if case == "unfunded":
        value["conditions"][0]["parameters"]["workflow"]["resource_stock"] = 2
    world = workflow_world(value)
    perform = {
        "kind": "perform_work",
        "work": "intake",
        "expected_version": 1,
        "content": {"batch": 17},
        "sources": [],
    }
    actor, action = "alder", perform.copy()
    if case == "blocked_dependency":
        actor, action = "cedar", {"kind": "claim_work", "work": "release"}
    elif case == "foreign_worker":
        actor, action = "cedar", {"kind": "claim_work", "work": "intake"}
    elif case == "procedure_edit":
        action = {"kind": "edit_procedure", "work": "intake", "resource_cost": 0}
    elif case == "raw_write":
        action = {
            "kind": "write_artifact",
            "artifact": "intake_record",
            "expected_version": 1,
            "content": {"batch": 17},
            "sources": [],
        }
    else:
        settle_phase(world, {"alder": {"kind": "claim_work", "work": "intake"}})
        if case == "duplicate_claim":
            actor, action = "birch", {"kind": "claim_work", "work": "intake"}
        elif case == "foreign_owner":
            actor = "birch"
        elif case == "stale_version":
            action["expected_version"] = 2
        elif case in {"private_source", "future_source", "missing_source"}:
            action["sources"] = [
                {
                    "artifact": {
                        "private_source": "sealed",
                        "future_source": "intake_record",
                        "missing_source": "absent",
                    }[case],
                    "version": 99 if case == "future_source" else 1,
                }
            ]
        elif case == "early_handoff":
            action = {"kind": "handoff_work", "work": "intake", "recipient": "cedar", "version": 1}
        elif case in {"wrong_recipient", "stale_handoff", "wrong_acceptor", "stale_acceptance"}:
            settle_phase(world, {"alder": perform})
            settle_phase(world)
            action = {"kind": "handoff_work", "work": "intake", "recipient": "cedar", "version": 2}
            if case == "wrong_recipient":
                action["recipient"] = "fern"
            elif case == "stale_handoff":
                action["version"] = 1
            else:
                settle_phase(world, {"alder": action})
                actor = "dune" if case == "wrong_acceptor" else "cedar"
                action = {
                    "kind": "accept_handoff",
                    "work": "intake",
                    "version": 2 if case == "wrong_acceptor" else 1,
                }
    before = world.snapshot()
    with pytest.raises(ValueError):
        world.step(
            actor, Decision.model_validate({**decision(action), "memory": "change no state"})
        )
    assert world.snapshot() == before


def test_real_tool_harness_reads_privately_then_proposes_work_with_matching_instructions(
    tmp_path, monkeypatch
):
    prompts = []

    async def respond(messages, info):
        prompt = json.loads(messages[-1].parts[0].content)
        prompts.append(prompt)
        output = (
            {
                "operation": "read_artifact",
                "decision": None,
                "read": {"kind": "read_artifact", "artifact": "intake_record", "version": 1},
            }
            if not prompt["operations"]
            else {
                "operation": "decide",
                "read": None,
                "decision": decision({"kind": "claim_work", "work": "intake"}),
            }
        )
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, output)],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    value = protocol()
    value["conditions"][0]["harness"] = {
        "kind": "tool_using",
        "max_requests": 2,
        "max_tool_operations": 1,
        "tools": ["read_artifact"],
    }
    app = create_app(f"sqlite:///{tmp_path}/workflow-tools.sqlite3", static_dir=tmp_path / "static")
    monkeypatch.setattr(app.state.models, "model", lambda _: FunctionModel(function=respond))
    with TestClient(app, base_url="http://localhost") as client:
        _, rid = save(client, value)
        assert client.get("/api/settings").json()["usage"]["requests"] == 0
        assert client.post(f"/api/runs/{rid}/control", json={"action": "step"}).status_code == 200
        run = wait_finished(client, rid)
        assert run["summary"]["status"] == "paused", run
        assert run["summary"]["turn"] == 1
        assert run["state"]["logical_time"] == 0
        assert (run["state"]["resource_stock"], run["state"]["resource_spent"]) == (7, 0)
        assert len(prompts) == len(run["requests"]) == 2
        assert prompts[1]["operations"][0]["result"]["content"] == {"batch": 0}
        assert "sealed-development-431" not in json.dumps(prompts)
        for call in run["requests"]:
            request = client.get(f"/api/requests/{call['id']}").json()["request"]
            assert "claim_work" in request["instructions"]
            assert "perform_work" in request["instructions"]
            assert "sealed-development-431" not in json.dumps(request)
        exposure = client.get(f"/api/runs/{rid}/exposure").json()
        reads = [row for row in exposure["opportunities"] if row["kind"] == "read_artifact"]
        assert len(reads) == 1 and reads[0]["included"] is True
        before = client.get("/api/settings").json()["usage"]
        replay = client.post(f"/api/runs/{rid}/verify")
        assert replay.status_code == 200, replay.text
        assert replay.json()["verified_reads"] == 1
        assert replay.json()["model_requests"] == 0
        assert client.get("/api/settings").json()["usage"] == before


@pytest.mark.parametrize(
    "failure", [TimeoutError, asyncio.CancelledError], ids=["timeout", "cancelled"]
)
def test_tool_interruption_preserves_pure_read_unknown_usage_and_entire_world(
    tmp_path, monkeypatch, failure
):
    calls = 0

    async def respond(_messages, info):
        nonlocal calls
        calls += 1
        if calls == 2:
            raise failure("Independent DEVELOPMENT interruption")
        return ModelResponse(
            parts=[
                ToolCallPart(
                    info.output_tools[0].name,
                    {
                        "operation": "read_artifact",
                        "decision": None,
                        "read": {
                            "kind": "read_artifact",
                            "artifact": "intake_record",
                            "version": 1,
                        },
                    },
                )
            ],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    value = protocol()
    value["conditions"][0]["harness"] = {
        "kind": "tool_using",
        "tools": ["read_artifact"],
        "max_requests": 2,
        "max_tool_operations": 1,
    }
    app = create_app(f"sqlite:///{tmp_path}/interruption.sqlite3", static_dir=tmp_path / "static")
    monkeypatch.setattr(app.state.models, "model", lambda _: FunctionModel(function=respond))
    with TestClient(app, base_url="http://localhost") as client:
        study, rid = save(client, value)
        initial = client.get(f"/api/runs/{rid}").json()["state"]
        client.post(f"/api/runs/{rid}/control", json={"action": "step"})
        run = wait_finished(client, rid)
        assert run["summary"]["status"] == (
            "paused" if failure is asyncio.CancelledError else "failed"
        )
        assert run["summary"]["turn"] == 0 and run["state"] == initial
        assert calls == 2 and run["summary"]["usage"]["requests"] == 2
        assert run["summary"]["usage"]["partial"] is True
        assert [r["status"] for r in run["requests"]] == ["complete", "unknown"]
        assert run["activations"][0]["operations"][0]["result"]["content"] == {"batch": 0}
        exported = client.get(f"/api/studies/{study['id']}/export").json()
        unknown = exported["requests"][1]
        assert unknown["error"] == failure.__name__ and unknown["cost_usd"] > 0
        usage = client.get("/api/settings").json()["usage"]
        replay = client.post(f"/api/runs/{rid}/verify")
        assert replay.status_code == 200, replay.text
        assert replay.json()["verified_reads"] == 1 and replay.json()["model_requests"] == 0
        assert calls == 2 and client.get("/api/settings").json()["usage"] == usage
        assert client.get(f"/api/studies/{study['id']}/export").json() == exported


@pytest.mark.parametrize("memory", ["none", "notes", "history", "episodic"])
def test_actor_privacy_survives_memory_modes_pure_read_errors_and_sealed_restore(memory):
    value = protocol()
    value["profiles"][0].update(role="Administrator", goal="Inspect available actions.")
    value["profiles"][1]["goal"] = "birch-private-goal-431"
    value["conditions"][0]["parameters"]["memory"] = memory
    world = workflow_world(value)
    settle_phase(
        world, {"elm": {"kind": "send_message", "recipient": "fern", "text": "fern-only-431"}}
    )
    settle_phase(world)
    world.step(
        "birch",
        Decision.model_validate(
            {
                **decision({"kind": "wait_workflow"}),
                "memory": "birch-sealed-note-431",
            }
        ),
    )
    checkpoint = world.snapshot()
    restored = workflow_world(value, checkpoint)
    for actor in ACTORS:
        observation = restored.observe(actor)
        assert observation == world.observe(actor)
        schema = restored.decision_schema(observation).model_json_schema()
        projected = json.dumps([observation, schema])
        assert "sealed-development-431" not in projected
        assert "birch-private-goal-431" not in projected
        assert "birch-sealed-note-431" not in projected
        if actor not in {"elm", "fern"}:
            assert "fern-only-431" not in projected
        errors = []
        for artifact in ["sealed", "nonexistent"]:
            with pytest.raises(ValueError) as rejected:
                restored.read(
                    actor, ReadArtifact(kind="read_artifact", artifact=artifact, version=1)
                )
            errors.append(str(rejected.value))
        assert errors == ["Artifact operation is unavailable", "Artifact operation is unavailable"]
        assert restored.snapshot() == checkpoint
    before = restored.snapshot()
    assert restored.read(
        "alder", ReadArtifact(kind="read_artifact", artifact="intake_record", version=1)
    )["content"] == {"batch": 0}
    assert restored.snapshot() == before
    assert "release" not in [
        target
        for option in restored.observe("cedar")["legal_actions"]
        for target in option.get("targets", [])
    ]


def test_workflow_sources_rebind_all_six_roles_pin_revisions_and_reject_prior_contract(tmp_path):
    value = protocol()
    parameters = value["conditions"][0]["parameters"]
    parameters["workflow"]["work_items"][2]["workers"] = ["elm"]
    parameters["artifacts"]["objects"][2].update(readers=["elm"], writers=["elm"])
    app = create_app(f"sqlite:///{tmp_path}/reuse.sqlite3", static_dir=tmp_path / "static")
    with TestClient(app, base_url="http://localhost") as client:
        extracted = client.post("/api/design/environment", json={"design": value})
        assert extracted.status_code == 200, extracted.text
        saved = client.post("/api/environments", json={"definition": extracted.json()})
        assert saved.status_code == 201, saved.text
        source = saved.json()
        assert source["format"] == "jas-environment-v8"
        example = source["definition"]["examples"][0]
        assert example["roles"] == ["role_1", "role_2", "role_3", "role_4", "role_5", "role_6"]
        used = client.post(
            "/api/design/use-environment",
            json={
                "source": source,
                "example": example["key"],
                "bindings": {},
            },
        )
        assert used.status_code == 200, used.text
        reused = used.json()
        assert len(reused["profiles"]) == 6
        rules = reused["conditions"][0]["parameters"]["workflow"]
        assert rules["turn_order"] == [f"member_{i}" for i in range(1, 7)]
        assert rules["work_items"][1]["handoff_to"] == ["member_5", "member_6"]
        assert reused["environment_source"] == source
        study, _ = save(client, reused)
        changed = json.loads(json.dumps(source["definition"]))
        changed["examples"][0]["parameters"]["workflow"]["resource_stock"] = 9
        updated = client.put(
            f"/api/environments/{source['id']}", json={"definition": changed, "revision": 1}
        )
        assert updated.status_code == 200, updated.text
        assert client.delete(f"/api/environments/{source['id']}?revision=2").status_code == 200
        assert client.get(f"/api/studies/{study['id']}").json()["design"] == reused
        exported = client.get(f"/api/studies/{study['id']}/export").json()
        assert exported["version"] == 12
        assert exported["study"]["design"]["environment_source"] == source
        rejected = client.post(
            "/api/design/use-environment",
            json={
                "source": {**source, "format": "jas-environment-v7"},
                "example": example["key"],
                "bindings": {},
            },
        )
        assert rejected.status_code == 422
        assert client.get("/api/settings").json()["usage"]["requests"] == 0
