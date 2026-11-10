"""Independent reviewer DEVELOPMENT cases frozen before candidate executions."""

import asyncio
import copy
import gzip
import json
from decimal import Decimal

import pytest
from agent_sim.api import create_app
from agent_sim.domain import Decision, Design, ReadArtifact
from agent_sim.simulation.environments import create_world
from fastapi.testclient import TestClient
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.models.function import FunctionModel
from pydantic_ai.usage import RequestUsage

from backend.tests.test_artifact_workspace import wait_finished

ACTORS = list("abcdef")


def review_protocol(*, stock=8, horizon=12, reverse=False, marker="review-private-641"):
    return {
        "title": "Independent material handoff review",
        "question": "Which feasible work remains possible after contention?",
        "environment": "institutional_workflow",
        "profiles": [
            {"key": a, "name": a.upper(), "goal": "Inspect and choose.", "role": "Authority"}
            for a in ACTORS
        ],
        "seeds": [641],
        "rounds": horizon,
        "response_tokens": 512,
        "budget_usd": 1,
        "openai_reasoning_effort": "low",
        "conditions": [
            {
                "key": "review",
                "name": "Review",
                "model": "openai:gpt-6-luna",
                "parameters": {
                    "artifacts": {
                        "write_limit": 20,
                        "objects": [
                            *[
                                {
                                    "key": f"{w}_record",
                                    "name": f"{w} record",
                                    "readers": workers,
                                    "writers": workers,
                                    "content": {"batch": 0},
                                }
                                for w, workers in [
                                    ("draft", ["a", "b"]),
                                    ("publish", ["c", "d"]),
                                    ("audit", ["e", "f"]),
                                ]
                            ],
                            {
                                "key": "sealed",
                                "name": "Private evidence",
                                "owner": "f",
                                "content": {"marker": marker},
                            },
                        ],
                    },
                    "workflow": {
                        "timing": "phased_simultaneous",
                        "turn_order": ACTORS,
                        "conflict_order": list("ecabdf") if reverse else list("cabdef"),
                        "routes": [{"sender": "b", "recipient": "f"}],
                        "delivery_delay": 2,
                        "resource_stock": stock,
                        "work_items": [
                            {
                                "key": "draft",
                                "artifact": "draft_record",
                                "workers": ["a", "b"],
                                "handoff_to": ["c", "d"],
                                "resource_cost": 4,
                                "duration": 3,
                            },
                            {
                                "key": "publish",
                                "artifact": "publish_record",
                                "workers": ["c", "d"],
                                "handoff_to": ["e", "f"],
                                "dependencies": ["draft"],
                                "resource_cost": 5,
                                "duration": 1,
                            },
                            {
                                "key": "audit",
                                "artifact": "audit_record",
                                "workers": ["e", "f"],
                                "handoff_to": ["a", "b"],
                                "resource_cost": 7,
                                "duration": 1,
                            },
                        ],
                    },
                },
            }
        ],
    }


def proposal(action):
    return Decision.model_validate(
        {
            "action": action,
            "memory": "",
            "rationale": "Independent review choice.",
            "forecast": None,
        }
    )


def world_for(value, state=None):
    design = Design.model_validate(value)
    return create_world(design, design.conditions[0].parameters, 641, state)


def phase(world, choices=None, order=ACTORS):
    events = []
    for actor in order:
        emitted, _ = world.step(
            actor, proposal((choices or {}).get(actor, {"kind": "wait_workflow"}))
        )
        events.extend(e.model_dump() for e in emitted)
    return events


def start(work, batch):
    return {
        "kind": "perform_work",
        "work": work,
        "expected_version": 1,
        "content": {"batch": batch},
        "sources": [],
    }


@pytest.mark.parametrize(
    "reverse,winner,remaining,spent,due", [(False, "draft", 4, 4, 4), (True, "audit", 1, 7, 2)]
)
def test_review_material_contention_has_independent_literal_ledgers(
    reverse, winner, remaining, spent, due, tmp_path
):
    value = review_protocol(reverse=reverse)
    world = world_for(value)
    history = []
    for choices in [
        {
            "a": {"kind": "claim_work", "work": "draft"},
            "e": {"kind": "claim_work", "work": "audit"},
        },
        {"a": start("draft", 41), "e": start("audit", 62)},
    ]:
        frozen = {a: world.observe(a) for a in ACTORS}
        for actor in reversed(ACTORS):
            before = copy.deepcopy(world.state)
            action = (choices or {}).get(actor, {"kind": "wait_workflow"})
            events, measures = world.step(actor, proposal(action))
            history.append(
                (
                    actor,
                    action,
                    copy.deepcopy(world.state),
                    [e.model_dump() for e in events],
                    [m.model_dump() for m in measures],
                )
            )
            restored = world_for(value, json.loads(json.dumps(world.state)))
            assert restored.state == world.state
            if not events or events[0].kind == "proposal_sealed":
                assert world.state["resource_stock"] == before["resource_stock"]
                assert world.state["artifacts"] == before["artifacts"]
                assert world.state["work"] == before["work"]
                assert world.observe("c") == frozen["c"]
    assert (
        world.state["logical_time"],
        world.state["resource_stock"],
        world.state["resource_spent"],
        world.state["writes_remaining"],
    ) == (2, remaining, spent, 19)
    assert world.state["work"][winner]["due_at"] == due
    assert world.state["artifacts"][f"{winner}_record"]["versions"][-1]["content"] == {
        "batch": 41 if winner == "draft" else 62
    }
    loser = "audit" if winner == "draft" else "draft"
    assert world.state["work"][loser] == {
        "owner": "e" if loser == "audit" else "a",
        "status": "claimed",
        "due_at": None,
        "artifact_version": None,
        "handoff": None,
    }
    assert len(world.state["artifacts"][f"{loser}_record"]["versions"]) == 1
    conflicts = [
        e for _, _, _, emitted, _ in history for e in emitted if e["kind"] == "workflow_conflict"
    ]
    assert len(conflicts) == 1 and conflicts[0]["data"]["request"]["work"] == loser
    replay = world_for(value)
    for actor, action, checkpoint, events, measures in history:
        emitted, measured = replay.step(actor, proposal(action))
        assert replay.state == checkpoint
        assert [e.model_dump() for e in emitted] == events
        assert [m.model_dump() for m in measured] == measures
    (tmp_path / "review-world.json").write_text(
        json.dumps(
            {
                "winner": winner,
                "remaining": remaining,
                "spent": spent,
                "due": due,
                "decisions": history,
            }
        )
    )


def test_review_delayed_handoffs_admit_a_feasible_complete_alternative(tmp_path):
    value = review_protocol(stock=16)
    world = world_for(value)
    selected = [
        {
            "a": {"kind": "claim_work", "work": "draft"},
            "e": {"kind": "claim_work", "work": "audit"},
        },
        {"a": start("draft", 41), "e": start("audit", 62)},
        {"e": {"kind": "handoff_work", "work": "audit", "recipient": "a", "version": 2}},
        {"a": {"kind": "accept_handoff", "work": "audit", "version": 2}},
        {"a": {"kind": "handoff_work", "work": "draft", "recipient": "c", "version": 2}},
        {"c": {"kind": "accept_handoff", "work": "draft", "version": 2}},
        {"c": {"kind": "claim_work", "work": "publish"}},
        {"c": {**start("publish", -9), "sources": [{"artifact": "draft_record", "version": 2}]}},
        {"c": {"kind": "handoff_work", "work": "publish", "recipient": "e", "version": 2}},
        {"e": {"kind": "accept_handoff", "work": "publish", "version": 2}},
    ]
    checkpoints = []
    for index, choices in enumerate(selected):
        before = copy.deepcopy(world.state)
        if index < 6:
            assert not any(
                o["kind"] == "claim_work" and "publish" in o.get("targets", [])
                for o in world.observe("c")["legal_actions"]
            )
        if index in (2, 3):
            assert world.state["work"]["draft"]["status"] == "in_progress"
            assert world.state["work"]["draft"]["due_at"] == 4
            assert (
                world.state["resource_stock"],
                world.state["resource_spent"],
                world.state["writes_remaining"],
            ) == (5, 11, 18)
        if index == 5:
            assert world.read(
                "c", ReadArtifact(kind="read_artifact", artifact="draft_record", version=2)
            )["content"] == {"batch": 41}
            with pytest.raises(ValueError, match="Artifact operation is unavailable"):
                world.read(
                    "d", ReadArtifact(kind="read_artifact", artifact="draft_record", version=2)
                )
            with pytest.raises(ValueError):
                world.step("d", proposal({"kind": "accept_handoff", "work": "draft", "version": 2}))
            assert world.state == before
        phase(world, choices)
        checkpoints.append(copy.deepcopy(world.state))
        world = world_for(value, json.loads(json.dumps(world.state)))
    assert (
        world.state["logical_time"],
        world.state["resource_stock"],
        world.state["resource_spent"],
        world.state["writes_remaining"],
    ) == (10, 0, 16, 17)
    assert world.state["outcome"] == {
        "status": "all_accepted",
        "accepted": ["draft", "publish", "audit"],
        "unfinished": [],
    }
    replay = world_for(value)
    for choices, expected in zip(selected, checkpoints, strict=True):
        phase(replay, choices)
        assert replay.state == expected
    (tmp_path / "review-feasible-checkpoints.json").write_text(json.dumps(checkpoints))


@pytest.mark.parametrize("memory", ["none", "notes", "history", "episodic"])
def test_review_privacy_survives_entire_projection_and_partial_restore(memory):
    originals = [
        review_protocol(marker=marker) for marker in ("review-private-641", "review-private-982")
    ]
    for value in originals:
        value["conditions"][0]["parameters"]["memory"] = memory
    worlds = [world_for(value) for value in originals]
    for iteration in (0, 1):
        for actor in "abcde":
            assert worlds[0].observe(actor) == worlds[1].observe(actor)
            assert (
                worlds[0].decision_schema(worlds[0].observe(actor)).model_json_schema()
                == worlds[1].decision_schema(worlds[1].observe(actor)).model_json_schema()
            )
            for world in worlds:
                before = copy.deepcopy(world.state)
                errors = []
                for artifact in ("sealed", "absent"):
                    with pytest.raises(ValueError) as caught:
                        world.read(
                            actor, ReadArtifact(kind="read_artifact", artifact=artifact, version=1)
                        )
                    errors.append(str(caught.value))
                assert errors == ["Artifact operation is unavailable"] * 2
                assert world.state == before
        if iteration == 0:
            for index, world in enumerate(worlds):
                world.step("a", proposal({"kind": "claim_work", "work": "draft"}))
                worlds[index] = world_for(originals[index], json.loads(json.dumps(world.state)))


def test_review_public_engine_restores_coupled_pending_work_and_integer_ledger(
    tmp_path, monkeypatch
):
    value = review_protocol(horizon=4)
    database = f"sqlite:///{tmp_path}/review.sqlite3"
    app = create_app(database, static_dir=tmp_path / "assets")
    inputs, ledger, trace = [], [], []
    chosen = {
        (0, "a"): {"kind": "claim_work", "work": "draft"},
        (0, "e"): {"kind": "claim_work", "work": "audit"},
        (1, "a"): start("draft", 41),
        (1, "e"): start("audit", 62),
        (1, "b"): {"kind": "send_message", "recipient": "f", "text": "review-delayed-641"},
    }

    def money(value):
        exact = Decimal(str(value)) * 1_000_000
        assert exact == int(exact)
        return int(exact)

    async def respond(messages, info):
        content = messages[-1].parts[0].content
        observation = json.loads(content)
        index = len(inputs)
        inputs.append(content)
        actor = observation["you"]["key"]
        assert actor == ACTORS[index % 6]
        assert observation["logical_time"] == index // 6
        if actor != "f":
            assert "review-private-641" not in content
            assert "sealed" not in json.dumps(observation["artifacts"])
        current = (await asyncio.to_thread(client.get, f"/api/runs/{rid}")).json()
        call = current["requests"][-1]
        detail = (await asyncio.to_thread(client.get, f"/api/requests/{call['id']}")).json()
        request = detail["request"]
        assert call["status"] == "pending"
        assert request["prompt"] == content
        assert request["settings"] == {
            "max_tokens": 512,
            "timeout": 90,
            "openai_reasoning_effort": "low",
        }
        nbytes = len((content + request["instructions"] + json.dumps(request["schema"])).encode())
        reserve = (nbytes + 4096 + 7) // 8 + 256
        assert money(call["cost_usd"]) == reserve
        settings = (await asyncio.to_thread(client.get, "/api/settings")).json()
        assert money(settings["usage"]["cost_usd"]) == index * 35 + reserve
        ledger.append({"index": index, "input_bytes": nbytes, "reserved_microdollars": reserve})
        return ModelResponse(
            parts=[
                ToolCallPart(
                    info.output_tools[0].name,
                    proposal(
                        chosen.get((observation["logical_time"], actor), {"kind": "wait_workflow"})
                    ).model_dump(),
                )
            ],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    provider = FunctionModel(function=respond)
    monkeypatch.setattr(app.state.models, "model", lambda _: provider)
    try:
        with TestClient(app, base_url="http://localhost") as client:
            created = client.post("/api/studies", json={"design": value})
            assert created.status_code == 201, created.text
            sid = created.json()["id"]
            rid = client.get(f"/api/studies/{sid}").json()["runs"][0]["id"]
            assert client.get("/api/settings").json()["usage"]["requests"] == 0
            # Fresh invalid populations fail at the public boundary and spend nothing.
            for count in (5, 13):
                invalid = copy.deepcopy(value)
                invalid["profiles"] = (
                    invalid["profiles"][:5]
                    if count == 5
                    else invalid["profiles"]
                    + [
                        {"key": f"extra{i}", "name": f"Extra {i}", "goal": "Choose."}
                        for i in range(7)
                    ]
                )
                rejected = client.post("/api/design/validate", json={"design": invalid})
                assert rejected.status_code == 422
            prefix = []
            for turn in range(1, 13):
                sent = client.post(f"/api/runs/{rid}/control", json={"action": "step"})
                assert sent.status_code == 200, sent.text
                run = wait_finished(client, rid)
                assert run["summary"]["turn"] == turn and run["summary"]["status"] == "paused", run[
                    "summary"
                ]
                evidence = client.get(f"/api/runs/{rid}/turns/{turn}").json()
                prefix.append(evidence)
                assert json.dumps(evidence["observation"]) == inputs[turn - 1]
            state = run["state"]
            assert (
                state["logical_time"],
                state["resource_stock"],
                state["resource_spent"],
                state["writes_remaining"],
            ) == (2, 4, 4, 19)
            assert (
                state["work"]["draft"]["due_at"] == 4
                and state["work"]["draft"]["status"] == "in_progress"
            )
            assert state["pending_deliveries"][0]["due_at"] == 3 and state["inboxes"]["f"] == []
            usage = client.get("/api/settings").json()["usage"]
            assert (
                usage["requests"],
                usage["input_tokens"],
                usage["output_tokens"],
                money(usage["cost_usd"]),
            ) == (12, 1200, 600, 420)
            for _ in range(2):
                assert (
                    client.post(f"/api/runs/{rid}/control", json={"action": "pause"}).status_code
                    == 200
                )
            assert client.get(f"/api/runs/{rid}").json()["state"] == state
            assert client.get("/api/settings").json()["usage"] == usage
            export = client.get(f"/api/studies/{sid}/export").json()
            assert export["version"] == 13 and len(export["requests"]) == 12
        reopened = create_app(database, static_dir=tmp_path / "assets")
        monkeypatch.setattr(reopened.state.models, "model", lambda _: provider)
        with TestClient(reopened, base_url="http://localhost") as client:
            assert client.get(f"/api/runs/{rid}").json()["state"] == state
            assert client.get(f"/api/studies/{sid}/export").json() == export
            assert len(inputs) == 12
            verified = client.post(f"/api/runs/{rid}/verify")
            assert (
                verified.status_code == 200
                and verified.json()["verified_turns"] == 12
                and verified.json()["model_requests"] == 0
            )
            assert len(inputs) == 12 and client.get("/api/settings").json()["usage"] == usage
            for _ in range(6):
                assert (
                    client.post(f"/api/runs/{rid}/control", json={"action": "step"}).status_code
                    == 200
                )
                run = wait_finished(client, rid)
            assert (
                run["summary"]["turn"],
                run["state"]["logical_time"],
                run["state"]["resource_stock"],
            ) == (18, 3, 4)
            assert run["state"]["work"]["draft"]["status"] == "in_progress"
            assert run["state"]["inboxes"]["f"][0]["text"] == "review-delayed-641"
            assert [client.get(f"/api/runs/{rid}/turns/{n}").json() for n in range(1, 13)] == prefix
            final_usage = client.get("/api/settings").json()["usage"]
            assert (
                final_usage["requests"],
                final_usage["input_tokens"],
                final_usage["output_tokens"],
                money(final_usage["cost_usd"]),
            ) == (18, 1800, 900, 630)
            assert client.post(f"/api/runs/{rid}/verify").json()["model_requests"] == 0
            assert len(inputs) == 18 and client.get("/api/settings").json()["usage"] == final_usage
            for cutoff in (0, 6, 12, 18):
                exposure = client.get(f"/api/runs/{rid}/exposure?through_turn={cutoff}").json()
                assert len(exposure["membership"]["requests"]) == cutoff
            trace = {
                "final": run,
                "export": client.get(f"/api/studies/{sid}/export").json(),
                "usage": final_usage,
                "frozen_prefix": prefix,
            }
    finally:
        with gzip.open(tmp_path / "review-http-input-ledger.json.gz", "wt") as stream:
            json.dump({"inputs": inputs, "ledger": ledger, "evidence": trace}, stream)


def test_review_rejections_and_delegation_preserve_the_atomic_boundary():
    value = review_protocol()
    world = world_for(value)
    phase(world, {"a": {"kind": "claim_work", "work": "draft"}})
    for actor, action in [
        ("a", {**start("draft", 41), "expected_version": 2}),
        ("a", {**start("draft", 41), "sources": [{"artifact": "sealed", "version": 1}]}),
        ("a", {**start("draft", 41), "sources": [{"artifact": "draft_record", "version": 2}]}),
        ("c", {"kind": "claim_work", "work": "publish"}),
        ("b", start("draft", 41)),
        ("a", {"kind": "handoff_work", "work": "draft", "recipient": "c", "version": 1}),
        ("a", {"kind": "delegate_work", "work": "draft", "recipient": "f"}),
        (
            "a",
            {
                "kind": "write_artifact",
                "artifact": "draft_record",
                "expected_version": 1,
                "content": {"batch": 999},
                "sources": [],
            },
        ),
        ("a", {"kind": "delegate_work", "work": "draft", "recipient": "b", "duration": 0}),
    ]:
        before = copy.deepcopy(world.state)
        with pytest.raises(ValueError):
            world.step(actor, proposal(action))
        assert world.state == before
    artifacts = copy.deepcopy(world.state["artifacts"])
    phase(world, {"a": {"kind": "delegate_work", "work": "draft", "recipient": "b"}})
    assert world.state["work"]["draft"]["owner"] == "b"
    assert world.state["artifacts"] == artifacts
    assert (
        world.state["resource_stock"],
        world.state["resource_spent"],
        world.state["writes_remaining"],
    ) == (8, 0, 20)
    assert not any(o["kind"] == "perform_work" for o in world.observe("a")["legal_actions"])
    assert any(
        o["kind"] == "perform_work" and o["targets"] == ["draft"]
        for o in world.observe("b")["legal_actions"]
    )
    phase(world, {"b": start("draft", 41)})
    assert (
        world.state["resource_stock"],
        world.state["resource_spent"],
        world.state["writes_remaining"],
    ) == (4, 4, 19)
    assert world.state["work"]["draft"]["due_at"] == 5


def test_review_horizon_never_flushes_future_work_or_mail():
    value = review_protocol(horizon=2)
    world = world_for(value)
    phase(world, {"a": {"kind": "claim_work", "work": "draft"}})
    phase(
        world,
        {
            "a": start("draft", 41),
            "b": {"kind": "send_message", "recipient": "f", "text": "review-delayed-641"},
        },
    )
    assert world.state["outcome"] == {
        "status": "horizon",
        "accepted": [],
        "unfinished": ["draft", "publish", "audit"],
    }
    assert (
        world.state["logical_time"],
        world.state["resource_stock"],
        world.state["resource_spent"],
        world.state["writes_remaining"],
    ) == (2, 4, 4, 19)
    assert (
        world.state["work"]["draft"]["status"] == "in_progress"
        and world.state["work"]["draft"]["due_at"] == 4
    )
    assert world.state["inboxes"]["f"] == [] and world.state["pending_deliveries"][0]["due_at"] == 3
    assert world_for(value, json.loads(json.dumps(world.state))).state == world.state


def test_review_public_interactions_include_only_delivered_mail_and_settled_handoffs(
    tmp_path, monkeypatch
):
    value = review_protocol(horizon=6)
    app = create_app(f"sqlite:///{tmp_path}/interactions.sqlite3", static_dir=tmp_path / "assets")
    choices = {
        (0, "a"): {"kind": "claim_work", "work": "draft"},
        (0, "b"): {"kind": "send_message", "recipient": "f", "text": "review-route-641"},
        (1, "a"): start("draft", 41),
        (4, "a"): {"kind": "handoff_work", "work": "draft", "recipient": "c", "version": 2},
        (5, "c"): {"kind": "accept_handoff", "work": "draft", "version": 2},
    }

    async def respond(messages, info):
        observation = json.loads(messages[-1].parts[0].content)
        action = choices.get(
            (observation["logical_time"], observation["you"]["key"]),
            {"kind": "wait_workflow"},
        )
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, proposal(action).model_dump())],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    monkeypatch.setattr(app.state.models, "model", lambda _: FunctionModel(function=respond))
    with TestClient(app, base_url="http://localhost") as client:
        created = client.post("/api/studies", json={"design": value})
        assert created.status_code == 201, created.text
        sid = created.json()["id"]
        rid = client.get(f"/api/studies/{sid}").json()["runs"][0]["id"]
        for turn in range(1, 37):
            assert (
                client.post(f"/api/runs/{rid}/control", json={"action": "step"}).status_code == 200
            )
            run = wait_finished(client, rid)
            assert run["summary"]["turn"] == turn
            if turn == 6:
                assert run["relationships"] == []
            if turn == 12:
                assert run["relationships"] == [
                    {
                        "source": "b",
                        "target": "f",
                        "transfers": 0.0,
                        "interactions": 1,
                        "kept": 0,
                        "eligible_promises": 0,
                        "false_reports": 0,
                        "claims": 0,
                    }
                ]
        assert run["relationships"] == [
            {
                "source": source,
                "target": target,
                "transfers": 0.0,
                "interactions": 1,
                "kept": 0,
                "eligible_promises": 0,
                "false_reports": 0,
                "claims": 0,
            }
            for source, target in [("b", "f"), ("a", "c"), ("c", "a")]
        ]
        usage = client.get("/api/settings").json()["usage"]
        assert usage["requests"] == 36
        assert client.post(f"/api/runs/{rid}/verify").json()["model_requests"] == 0
        assert client.get("/api/settings").json()["usage"] == usage
