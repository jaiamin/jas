"""Frozen T10 DEVELOPMENT examples: public workflow, independent literal outcomes."""

import asyncio
import itertools
import json
import os
from pathlib import Path

import pytest
from agent_sim.api import create_app
from agent_sim.db import Database
from agent_sim.domain import Decision, Design, ReadArtifact
from agent_sim.llm import LanguageModels
from agent_sim.simulation.environments import create_world
from fastapi.testclient import TestClient
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.models.function import FunctionModel
from pydantic_ai.usage import RequestUsage

from backend.tests.test_artifact_workspace import decision, save, wait_finished

ACTORS = ["iris", "moss", "vale"]
VALUES = [
    dict(cedar=9, quartz=2, reed=-2),
    dict(cedar=-3, quartz=8, reed=1),
    dict(cedar=0, quartz=-4, reed=7),
]


def protocol(*, timing="phased_simultaneous", shared=False, delay=2):
    return {
        "title": "Three independent choices",
        "question": "How does information access affect choices?",
        "environment": "distributed_coordination",
        "profiles": [
            {
                "key": a,
                "name": a.title(),
                "goal": "Inspect and choose as you prefer.",
                "role": "Participant",
            }
            for a in ACTORS
        ],
        "seeds": [93],
        "rounds": 8,
        "response_tokens": 512,
        "openai_reasoning_effort": "low",
        "measures": ["coordination_match", "coordination_value"],
        "conditions": [
            {
                "key": "shared" if shared else "distributed",
                "name": "Shared" if shared else "Distributed",
                "model": "openai:gpt-6-luna",
                "parameters": {
                    "artifacts": {
                        "write_limit": 4,
                        "requirements": [],
                        "objects": [
                            *[
                                {
                                    "key": f"values_{a}",
                                    "name": f"Values for {a}",
                                    "readers": ACTORS if shared else [a],
                                    "content": VALUES[i],
                                }
                                for i, a in enumerate(ACTORS)
                            ],
                            {
                                "key": "draft",
                                "name": "Shared draft",
                                "readers": ACTORS,
                                "writers": ACTORS,
                                "content": {"proposal": "undecided"},
                            },
                        ],
                    },
                    "coordination": {
                        "timing": timing,
                        "turn_order": ACTORS,
                        "conflict_order": ["moss", "vale", "iris"],
                        "delivery_delay": delay,
                        "match_bonus": 3,
                        "alternatives": ["cedar", "quartz", "reed"],
                        "information": {a: f"values_{a}" for a in ACTORS},
                        "routes": [
                            {"sender": a, "recipient": b} for a in ACTORS for b in ACTORS if a != b
                        ],
                    },
                },
            }
        ],
    }


def retain(case, **data):
    folder = os.getenv("T10_RAW_DIR")
    if folder:
        path = Path(folder) / f"{case}.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(data, indent=2) + "\n")


def test_independent_choices_have_real_values_and_call_free_replay(tmp_path, monkeypatch):
    delivered = []

    async def respond(messages, info):
        observation = json.loads(messages[-1].parts[0].content)
        delivered.append(observation)
        choice = dict(iris="cedar", moss="quartz", vale="reed")[observation["you"]["key"]]
        return ModelResponse(
            parts=[
                ToolCallPart(
                    info.output_tools[0].name,
                    decision({"kind": "choose_alternative", "alternative": choice}),
                )
            ],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    app = create_app(f"sqlite:///{tmp_path}/choices.sqlite3", static_dir=tmp_path / "static")
    monkeypatch.setattr(app.state.models, "model", lambda _name: FunctionModel(function=respond))
    with TestClient(app, base_url="http://localhost") as client:
        study, run_id = save(client, protocol())
        assert (
            client.post(f"/api/runs/{run_id}/control", json={"action": "start"}).status_code == 200
        )
        run = wait_finished(client, run_id)
        assert run["summary"]["status"] == "complete", run
        assert run["state"]["outcome"]["payoffs"] == {"iris": 9, "moss": 8, "vale": 7}
        assert run["metrics"]["coordination_match"] == 0
        assert run["metrics"]["coordination_value"] == 24
        assert "balances" not in run["state"]
        assert run["state"]["logical_time"] == 1
        assert run["state"]["pending_actions"] == {}
        assert [o["you"]["key"] for o in delivered] == ACTORS
        assert [o["choices"] for o in delivered] == [{}, {}, {}]
        usage = client.get("/api/settings").json()["usage"]
        replay = client.post(f"/api/runs/{run_id}/verify")
        assert replay.status_code == 200, replay.text
        assert replay.json()["verified_turns"] == 3 and replay.json()["model_requests"] == 0
        assert client.get("/api/settings").json()["usage"] == usage
        exported = client.get(f"/api/studies/{study['id']}/export").json()
        assert exported["runs"][0]["evidence"][-1]["checkpoint"] == run["state"]
        retain(
            "independent-choices",
            run=run,
            export=exported,
            delivered=delivered,
            replay=replay.json(),
        )


@pytest.mark.parametrize("timing", ["sequential", "phased_simultaneous"])
def test_addressed_mail_uses_logical_delivery_and_preserves_private_input(
    timing, tmp_path, monkeypatch
):
    delivered = []

    async def respond(messages, info):
        observation = json.loads(messages[-1].parts[0].content)
        delivered.append(observation)
        actor, round_number = observation["you"]["key"], observation["round"]
        action = {"kind": "wait_coordination"}
        if round_number == 1 and actor == "iris":
            action = {"kind": "send_message", "recipient": "moss", "text": "private-cedar-93"}
        elif round_number == 3:
            action = {"kind": "choose_alternative", "alternative": "cedar"}
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, decision(action))],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    app = create_app(f"sqlite:///{tmp_path}/mail.sqlite3", static_dir=tmp_path / "static")
    monkeypatch.setattr(app.state.models, "model", lambda _name: FunctionModel(function=respond))
    with TestClient(app, base_url="http://localhost") as client:
        study, run_id = save(client, protocol(timing=timing))
        client.post(f"/api/runs/{run_id}/control", json={"action": "start"})
        run = wait_finished(client, run_id)
        assert run["summary"]["status"] == "complete", run
        moss = [o for o in delivered if o["you"]["key"] == "moss"]
        assert moss[0]["inbox"] == []
        assert (moss[1]["inbox"] == []) == (timing == "phased_simultaneous")
        assert moss[2]["inbox"][0]["text"] == "private-cedar-93"
        assert moss[2]["inbox"][0]["delivered_at"] == 2
        assert not any(
            "private-cedar-93" in json.dumps(o) for o in delivered if o["you"]["key"] == "vale"
        )
        assert run["state"]["outcome"]["payoffs"] == {"iris": 12, "moss": 0, "vale": 3}
        assert run["state"]["pending_deliveries"] == []
        exposure = client.get(f"/api/runs/{run_id}/exposure").json()
        opportunities = [o for o in exposure["opportunities"] if o["kind"] == "message_delivered"]
        assert {o["participant"] for o in opportunities} == {"iris", "moss"}
        assert next(o for o in opportunities if o["participant"] == "moss")["included"] is True
        replay = client.post(f"/api/runs/{run_id}/verify")
        assert replay.status_code == 200 and replay.json()["model_requests"] == 0, replay.text
        retain(
            f"mail-{timing}",
            run=run,
            exposure=exposure,
            delivered=delivered,
            export=client.get(f"/api/studies/{study['id']}/export").json(),
            replay=replay.json(),
        )


def test_competing_shared_writes_use_declared_priority_at_the_phase_barrier(tmp_path, monkeypatch):
    async def respond(messages, info):
        o = json.loads(messages[-1].parts[0].content)
        actor = o["you"]["key"]
        action = {"kind": "wait_coordination"}
        if o["round"] == 1 and actor in {"iris", "moss"}:
            action = {
                "kind": "write_artifact",
                "artifact": "draft",
                "expected_version": 1,
                "content": {"proposal": actor},
                "sources": [],
            }
        elif o["round"] == 2:
            action = {"kind": "stop"}
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, decision(action))],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    app = create_app(f"sqlite:///{tmp_path}/conflict.sqlite3", static_dir=tmp_path / "static")
    monkeypatch.setattr(app.state.models, "model", lambda _name: FunctionModel(function=respond))
    with TestClient(app, base_url="http://localhost") as client:
        study, run_id = save(client, protocol())
        for _ in range(2):
            client.post(f"/api/runs/{run_id}/control", json={"action": "step"})
            partial = wait_finished(client, run_id)
            assert partial["summary"]["status"] == "paused", partial
            assert len(partial["state"]["artifacts"]["draft"]["versions"]) == 1
            assert partial["state"]["writes_remaining"] == 4
        client.post(f"/api/runs/{run_id}/control", json={"action": "step"})
        settled = wait_finished(client, run_id)
        assert settled["state"]["artifacts"]["draft"]["versions"][1]["content"] == {
            "proposal": "moss"
        }
        assert settled["state"]["writes_remaining"] == 3
        conflicts = [e for e in settled["events"] if e["kind"] == "artifact_conflict"]
        assert len(conflicts) == 1 and conflicts[0]["actor"] == "iris"
        assert conflicts[0]["data"]["requested_version"] == 1
        assert conflicts[0]["data"]["actual_version"] == 2
        client.post(f"/api/runs/{run_id}/control", json={"action": "start"})
        run = wait_finished(client, run_id)
        assert run["state"]["outcome"]["payoffs"] == dict.fromkeys(ACTORS, 0)
        assert run["summary"]["usage"]["requests"] == 6
        replay = client.post(f"/api/runs/{run_id}/verify")
        assert replay.status_code == 200 and replay.json()["model_requests"] == 0, replay.text
        retain(
            "competing-writes",
            run=run,
            partial=partial,
            settled=settled,
            export=client.get(f"/api/studies/{study['id']}/export").json(),
            replay=replay.json(),
        )


@pytest.mark.parametrize("completion_order", list(itertools.permutations(ACTORS)))
def test_provider_completion_permutations_cannot_change_frozen_conflict_priority(
    completion_order, tmp_path, monkeypatch
):
    design = Design.model_validate(protocol())
    world = create_world(design, design.conditions[0].parameters, 93)
    db = Database(f"sqlite:///{tmp_path}/provider-order.sqlite3")
    models = LanguageModels(db)

    async def exercise():
        started, release = (
            {a: asyncio.Event() for a in ACTORS},
            {a: asyncio.Event() for a in ACTORS},
        )

        async def respond(messages, info):
            actor = json.loads(messages[-1].parts[0].content)["you"]["key"]
            started[actor].set()
            await release[actor].wait()
            action = {
                "kind": "write_artifact",
                "artifact": "draft",
                "expected_version": 1,
                "content": {"proposal": actor},
                "sources": [],
            }
            return ModelResponse(
                parts=[ToolCallPart(info.output_tools[0].name, decision(action))],
                usage=RequestUsage(input_tokens=100, output_tokens=50),
            )

        monkeypatch.setattr(models, "model", lambda _name: FunctionModel(function=respond))
        tasks = {}
        for actor in ACTORS:
            observation = world.observe(actor)
            observation["you"] = next(p.model_dump() for p in design.profiles if p.key == actor)
            tasks[actor] = asyncio.create_task(
                models.generate(
                    world.decision_schema(observation),
                    model="openai:gpt-6-luna",
                    prompt=json.dumps(observation),
                    instructions="Independent development provider witness.",
                    purpose="decision",
                    max_tokens=512,
                )
            )
        await asyncio.gather(*(event.wait() for event in started.values()))
        for index, actor in enumerate(completion_order):
            release[actor].set()
            result = await tasks[actor]
            world.step(actor, Decision.model_validate(result))
            if index < 2:
                assert world.observe("vale")["last_result"] is None
                assert world.snapshot()["logical_time"] == 0
                assert len(world.snapshot()["artifacts"]["draft"]["versions"]) == 1
        return world.snapshot()

    try:
        final = asyncio.run(exercise())
        assert final["artifacts"]["draft"]["versions"][1]["content"] == {"proposal": "moss"}
        assert final["artifacts"]["draft"]["versions"][1]["operation"] == 3
        assert len(final["artifacts"]["draft"]["versions"]) == 2
        assert final["writes_remaining"] == 3 and final["logical_time"] == 1
        assert [
            r["actor"] for r in final["artifact_history"] if r["kind"] == "artifact_conflict"
        ] == ["vale", "iris"]
        assert models.usage()["requests"] == 3
        retain("completion-" + "-".join(completion_order), state=final, usage=models.usage())
    finally:
        db.close()


@pytest.mark.parametrize("boundary", [1, 2, 3, 6])
def test_committed_proposals_and_pending_deliveries_restore_without_sampling(
    boundary, tmp_path, monkeypatch
):
    calls = []

    async def respond(messages, info):
        o = json.loads(messages[-1].parts[0].content)
        calls.append(o)
        action = {"kind": "wait_coordination"}
        if o["round"] == 1 and o["you"]["key"] == "iris":
            action = {"kind": "send_message", "recipient": "moss", "text": "restore-private-93"}
        elif o["round"] == 3:
            action = {"kind": "choose_alternative", "alternative": "quartz"}
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, decision(action))],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    database = f"sqlite:///{tmp_path}/restored.sqlite3"
    app = create_app(database, static_dir=tmp_path / "static")
    monkeypatch.setattr(app.state.models, "model", lambda _name: FunctionModel(function=respond))
    with TestClient(app, base_url="http://localhost") as client:
        _, run_id = save(client, protocol())
        for _ in range(boundary):
            client.post(f"/api/runs/{run_id}/control", json={"action": "step"})
            before = wait_finished(client, run_id)
            assert before["summary"]["status"] == "paused", before
        assert before["state"]["logical_time"] == boundary // 3
        assert len(before["state"]["pending_deliveries"]) == (1 if boundary == 3 else 0)
    count = len(calls)
    restored = create_app(database, static_dir=tmp_path / "static")
    monkeypatch.setattr(
        restored.state.models, "model", lambda _name: FunctionModel(function=respond)
    )
    with TestClient(restored, base_url="http://localhost") as client:
        reopened = client.get(f"/api/runs/{run_id}").json()
        assert reopened["state"] == before["state"]
        assert reopened["activations"] == before["activations"]
        assert len(calls) == count
        replay_before = client.post(f"/api/runs/{run_id}/verify")
        assert replay_before.status_code == 200 and len(calls) == count, replay_before.text
        client.post(f"/api/runs/{run_id}/control", json={"action": "start"})
        final = wait_finished(client, run_id)
        assert final["summary"]["status"] == "complete", final
        assert final["state"]["outcome"]["payoffs"] == {"iris": 5, "moss": 11, "vale": -1}
        assert final["state"]["inboxes"]["moss"][0]["delivered_at"] == 2
        assert final["state"]["inboxes"]["vale"] == []
        assert len(calls) == 9
        replay_after = client.post(f"/api/runs/{run_id}/verify")
        assert replay_after.status_code == 200 and len(calls) == 9, replay_after.text
        retain(
            f"restore-{boundary}",
            before=before,
            reopened=reopened,
            final=final,
            calls=calls,
            replay_before=replay_before.json(),
            replay_after=replay_after.json(),
        )


@pytest.mark.parametrize("shared", [False, True])
def test_tool_participants_read_only_permitted_values_with_actual_input_receipts(
    shared, tmp_path, monkeypatch
):
    prompts = []

    async def respond(messages, info):
        prompt = json.loads(messages[-1].parts[0].content)
        prompts.append(prompt)
        actor = prompt["profile"]["key"]
        if not prompt["operations"]:
            output = {
                "operation": "read_artifact",
                "decision": None,
                "read": {
                    "kind": "read_artifact",
                    "artifact": f"values_{'vale' if shared else actor}",
                    "version": 1,
                },
            }
        else:
            choice = dict(iris="cedar", moss="quartz", vale="reed")[actor]
            output = {
                "operation": "decide",
                "read": None,
                "decision": decision({"kind": "choose_alternative", "alternative": choice}),
            }
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, output)],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    value = protocol(shared=shared)
    value["conditions"][0]["harness"] = {
        "kind": "tool_using",
        "max_requests": 2,
        "max_tool_operations": 1,
        "tools": ["read_artifact"],
    }
    app = create_app(f"sqlite:///{tmp_path}/tools.sqlite3", static_dir=tmp_path / "static")
    monkeypatch.setattr(app.state.models, "model", lambda _name: FunctionModel(function=respond))
    with TestClient(app, base_url="http://localhost") as client:
        study, run_id = save(client, value)
        client.post(f"/api/runs/{run_id}/control", json={"action": "start"})
        run = wait_finished(client, run_id)
        assert run["summary"]["status"] == "complete", run
        assert run["state"]["outcome"]["payoffs"] == {"iris": 9, "moss": 8, "vale": 7}
        assert run["summary"]["usage"]["requests"] == 6
        for index, actor in enumerate(ACTORS):
            local = prompts[index * 2 + 1]["operations"][0]["result"]
            assert local["content"] == VALUES[2 if shared else index]
            if not shared:
                assert all(
                    f"values_{other}" not in json.dumps(prompts[index * 2 : index * 2 + 2])
                    for other in ACTORS
                    if other != actor
                )
        exposure = client.get(f"/api/runs/{run_id}/exposure").json()
        reads = [o for o in exposure["opportunities"] if o["kind"] == "read_artifact"]
        assert len(reads) == 3 and all(o["included"] for o in reads)
        before = client.get("/api/settings").json()["usage"]
        replay = client.post(f"/api/runs/{run_id}/verify")
        assert replay.status_code == 200 and replay.json()["verified_reads"] == 3, replay.text
        assert client.get("/api/settings").json()["usage"] == before
        retain(
            f"tool-values-{'shared' if shared else 'local'}",
            run=run,
            prompts=prompts,
            exposure=exposure,
            replay=replay.json(),
            export=client.get(f"/api/studies/{study['id']}/export").json(),
        )


def test_settled_choices_have_source_linked_exposure_only_for_later_inputs(tmp_path, monkeypatch):
    async def respond(messages, info):
        observation = json.loads(messages[-1].parts[0].content)
        action = (
            {"kind": "choose_alternative", "alternative": "cedar"}
            if observation["you"]["key"] == "iris"
            else {"kind": "wait_coordination"}
        )
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, decision(action))],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    value = protocol()
    value["rounds"] = 2
    app = create_app(f"sqlite:///{tmp_path}/choice-exposure.sqlite3")
    monkeypatch.setattr(app.state.models, "model", lambda _name: FunctionModel(function=respond))
    with TestClient(app, base_url="http://localhost") as client:
        _, run_id = save(client, value)
        client.post(f"/api/runs/{run_id}/control", json={"action": "start"})
        run = wait_finished(client, run_id)
        assert run["summary"]["status"] == "complete", run
        assert run["state"]["outcome"]["payoffs"] == {"iris": 9, "moss": 0, "vale": 0}
        exposure = client.get(f"/api/runs/{run_id}/exposure").json()
        choices = [o for o in exposure["opportunities"] if o["kind"] == "alternative_chosen"]
        assert {o["participant"] for o in choices if o["included"]} == {"moss", "vale"}
        assert all(
            "/request/prompt/choices/iris" in item["source"]["pointer"]
            for row in choices
            for item in row["inputs"]
        )
        retain("settled-choice-exposure", run=run, exposure=exposure)


@pytest.mark.parametrize("context_limit, included", [(4000, False), (16000, True)])
def test_mail_exposure_requires_content_in_the_final_bounded_request(
    context_limit, included, tmp_path, monkeypatch
):
    prompts = []

    async def respond(messages, info):
        prompt = json.loads(messages[-1].parts[0].content)
        prompts.append(prompt)
        if not prompt["operations"]:
            output = {"operation": "observe", "read": None, "decision": None}
        else:
            action = {"kind": "wait_coordination"}
            if prompt["round"] == 1 and prompt["actor"] == "iris":
                action = {"kind": "send_message", "recipient": "moss", "text": "bounded-mail-93"}
            elif prompt["round"] == 3:
                action = {"kind": "choose_alternative", "alternative": "reed"}
            output = {"operation": "decide", "read": None, "decision": decision(action)}
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, output)],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    value = protocol()
    value["conditions"][0]["harness"] = {
        "kind": "tool_using",
        "max_requests": 2,
        "max_tool_operations": 1,
        "max_context_chars": context_limit,
        "tools": ["observe"],
    }
    app = create_app(f"sqlite:///{tmp_path}/bounded.sqlite3")
    monkeypatch.setattr(app.state.models, "model", lambda _name: FunctionModel(function=respond))
    with TestClient(app, base_url="http://localhost") as client:
        _, run_id = save(client, value)
        client.post(f"/api/runs/{run_id}/control", json={"action": "start"})
        run = wait_finished(client, run_id)
        assert run["summary"]["status"] == "complete", run
        assert run["summary"]["usage"]["requests"] == 18
        assert run["state"]["outcome"]["payoffs"] == {"iris": 1, "moss": 4, "vale": 10}
        exposure = client.get(f"/api/runs/{run_id}/exposure").json()
        moss = next(
            o
            for o in exposure["opportunities"]
            if o["kind"] == "message_delivered" and o["participant"] == "moss"
        )
        assert moss["available"] and moss["included"] is included
        assert bool(moss["inputs"]) is included
        final = next(
            p for p in prompts if p["actor"] == "moss" and p["round"] == 3 and p["operations"]
        )
        assert ("bounded-mail-93" in json.dumps(final)) is included
        assert ("receipt" in final["operations"][0]) is not included
        assert "bounded-mail-93" not in json.dumps([p for p in prompts if p["actor"] == "vale"])
        replay = client.post(f"/api/runs/{run_id}/verify")
        assert replay.status_code == 200 and replay.json()["model_requests"] == 0, replay.text
        retain(f"bounded-mail-{context_limit}", run=run, prompts=prompts, exposure=exposure)


def test_ring_routes_reject_missing_self_and_foreign_recipients_atomically():
    value = protocol()
    value["conditions"][0]["parameters"]["coordination"]["routes"] = [
        {"sender": "vale", "recipient": "iris"},
        {"sender": "iris", "recipient": "moss"},
        {"sender": "moss", "recipient": "vale"},
    ]
    design = Design.model_validate(value)
    world = create_world(design, design.conditions[0].parameters, 93)
    before = world.snapshot()
    for recipient in ("vale", "iris", "absent"):
        with pytest.raises(ValueError):
            world.step(
                "iris",
                Decision.model_validate(
                    decision({"kind": "send_message", "recipient": recipient, "text": "denied-93"})
                ),
            )
        assert world.snapshot() == before
    for actor, recipient in (("moss", "vale"), ("iris", "moss"), ("vale", "iris")):
        world.step(
            actor,
            Decision.model_validate(
                decision({"kind": "send_message", "recipient": recipient, "text": actor})
            ),
        )
    for actor in ACTORS:
        assert world.observe(actor)["inbox"] == []
        assert len(world.observe(actor)["outbox"]) == 1
        world.step(actor, Decision.model_validate(decision({"kind": "wait_coordination"})))
    state = world.snapshot()
    assert state["inboxes"]["iris"][0]["sender"] == "vale"
    assert state["inboxes"]["moss"][0]["sender"] == "iris"
    assert state["inboxes"]["vale"][0]["sender"] == "moss"
    assert state["pending_deliveries"] == []
    retain("ring-topology", before=before, state=state)


def test_phase_reads_freeze_before_writes_and_private_source_metadata_stays_scoped():
    value = protocol()
    design = Design.model_validate(value)
    world = create_world(design, design.conditions[0].parameters, 93)
    world.step(
        "moss",
        Decision.model_validate(
            decision(
                {
                    "kind": "write_artifact",
                    "artifact": "draft",
                    "expected_version": 1,
                    "content": {"proposal": "moss"},
                    "sources": [{"artifact": "values_moss", "version": 1}],
                }
            )
        ),
    )
    world.step(
        "iris", Decision.model_validate(decision({"kind": "read_artifact", "artifact": "draft"}))
    )
    world.step("vale", Decision.model_validate(decision({"kind": "wait_coordination"})))
    iris_result = world.observe("iris")["last_result"]
    assert iris_result is not None
    assert iris_result["content"] == {"proposal": "undecided"}
    assert iris_result["version"] == 1
    assert world.read("iris", ReadArtifact(kind="read_artifact", artifact="draft"))["version"] == 2
    assert "values_moss" not in json.dumps(world.observe("iris"))
    assert "values_moss" not in json.dumps(world.observe("vale"))
    moss_result = world.observe("moss")["last_result"]
    assert moss_result is not None
    assert moss_result["sources"] == [{"artifact": "values_moss", "version": 1}]
    retain("frozen-read-and-private-source", state=world.snapshot(), iris=world.observe("iris"))


def test_shared_write_allowance_contention_and_terminal_mail_do_not_force_cooperation():
    value = protocol(delay=12)
    value["rounds"] = 1
    artifacts = value["conditions"][0]["parameters"]["artifacts"]
    artifacts["write_limit"] = 1
    artifacts["objects"].append(
        {
            "key": "other_work",
            "name": "Other shared work",
            "readers": ACTORS,
            "writers": ACTORS,
            "content": {"proposal": "empty"},
        }
    )
    design = Design.model_validate(value)
    world = create_world(design, design.conditions[0].parameters, 93)
    for actor, artifact in (("iris", "draft"), ("moss", "other_work")):
        world.step(
            actor,
            Decision.model_validate(
                decision(
                    {
                        "kind": "write_artifact",
                        "artifact": artifact,
                        "expected_version": 1,
                        "content": {"proposal": actor},
                        "sources": [],
                    }
                )
            ),
        )
    events, _ = world.step(
        "vale",
        Decision.model_validate(
            decision({"kind": "send_message", "recipient": "iris", "text": "never-flushed-93"})
        ),
    )
    state = world.snapshot()
    assert len(state["artifacts"]["other_work"]["versions"]) == 2
    assert len(state["artifacts"]["draft"]["versions"]) == 1
    assert state["writes_remaining"] == 0
    assert (
        next(e for e in events if e.kind == "artifact_conflict").data["reason"] == "write_allowance"
    )
    assert state["outcome"]["payoffs"] == dict.fromkeys(ACTORS, 0)
    assert state["logical_time"] == 1 and state["inboxes"]["iris"] == []
    assert state["pending_deliveries"][0]["due_at"] == 12
    assert create_world(design, design.conditions[0].parameters, 93, state).snapshot() == state
    retain("allowance-and-terminal-mail", state=state, events=[e.model_dump() for e in events])


@pytest.mark.parametrize("shared", [False, True])
@pytest.mark.parametrize("memory", ["episodic", "notes", "history", "none"])
def test_information_control_and_actor_access_are_independent_of_role_and_memory(shared, memory):
    value = protocol(shared=shared)
    value["conditions"][0]["parameters"]["memory"] = memory
    value["profiles"][0]["role"] = "Owner of all evidence"
    design = Design.model_validate(value)
    world = create_world(design, design.conditions[0].parameters, 93)
    before = world.snapshot()
    observation = world.observe("iris")
    keys = {a["key"] for a in observation["artifacts"]}
    assert keys == (
        {"draft", "values_iris", "values_moss", "values_vale"}
        if shared
        else {"draft", "values_iris"}
    )
    assert (
        world.read("iris", ReadArtifact(kind="read_artifact", artifact="values_iris"))["content"]
        == VALUES[0]
    )
    if shared:
        assert (
            world.read("iris", ReadArtifact(kind="read_artifact", artifact="values_vale"))[
                "content"
            ]
            == VALUES[2]
        )
    else:
        errors = []
        for key in ("values_vale", "absent"):
            with pytest.raises(ValueError) as error:
                world.read("iris", ReadArtifact(kind="read_artifact", artifact=key))
            errors.append(str(error.value))
        assert errors[0] == errors[1]
        assert "values_vale" not in json.dumps(
            world.decision_schema(observation).model_json_schema()
        )
    assert world.snapshot() == before


@pytest.mark.parametrize("timing", ["sequential", "phased_simultaneous"])
@pytest.mark.parametrize(
    ("action", "payoffs", "matched"),
    [
        (
            {"kind": "choose_alternative", "alternative": "cedar"},
            {"iris": 12, "moss": 0, "vale": 3},
            True,
        ),
        (
            {"kind": "choose_alternative", "alternative": "quartz"},
            {"iris": 5, "moss": 11, "vale": -1},
            True,
        ),
        (
            {"kind": "choose_alternative", "alternative": "reed"},
            {"iris": 1, "moss": 4, "vale": 10},
            True,
        ),
        ({"kind": "stop"}, dict.fromkeys(ACTORS, 0), False),
        ({"kind": "wait_coordination"}, dict.fromkeys(ACTORS, 0), False),
    ],
)
def test_feasible_alternatives_abstention_and_horizon_keep_literal_outcomes(
    timing, action, payoffs, matched
):
    value = protocol(timing=timing)
    value["rounds"] = 1
    design = Design.model_validate(value)
    world = create_world(design, design.conditions[0].parameters, 93)
    for actor in ACTORS:
        world.step(actor, Decision.model_validate(decision(action)))
    assert world.actor() is None
    assert world.snapshot()["outcome"]["payoffs"] == payoffs
    assert world.snapshot()["outcome"]["matched"] is matched


def test_catalog_control_and_mechanics_reuse_keep_topology_bound_to_new_participants(tmp_path):
    with TestClient(
        create_app(f"sqlite:///{tmp_path}/reuse.sqlite3"), base_url="http://localhost"
    ) as client:
        catalog = client.get("/api/catalog")
        assert catalog.status_code == 200, catalog.text
        template = next(
            t["design"]
            for t in catalog.json()["templates"]
            if t["id"] == "distributed_coordination"
        )
        assert len(template["conditions"]) == 2
        before, control = (c["parameters"] for c in template["conditions"])
        assert before["coordination"] == control["coordination"]
        assert [o["content"] for o in before["artifacts"]["objects"]] == [
            o["content"] for o in control["artifacts"]["objects"]
        ]
        extracted = client.post("/api/design/environment", json={"design": protocol()})
        assert extracted.status_code == 200, extracted.text
        saved = client.post("/api/environments", json={"definition": extracted.json()})
        assert saved.status_code == 201, saved.text
        example = saved.json()["definition"]["examples"][0]
        assert example["roles"] == ["role_1", "role_2", "role_3"]
        assert example["parameters"]["coordination"]["conflict_order"] == [
            "role_2",
            "role_3",
            "role_1",
        ]
        used = client.post(
            "/api/design/use-environment",
            json={
                "source": saved.json(),
                "example": example["key"],
                "bindings": {},
            },
        )
        assert used.status_code == 200, used.text
        reused = used.json()
        assert len(reused["profiles"]) == 3
        config = reused["conditions"][0]["parameters"]["coordination"]
        assert config["turn_order"] == ["member_1", "member_2", "member_3"]
        assert config["conflict_order"] == ["member_2", "member_3", "member_1"]
        assert config["routes"][0] == {"sender": "member_1", "recipient": "member_2"}
        assert set(config["information"]) == {"member_1", "member_2", "member_3"}
        assert client.get("/api/settings").json()["usage"]["requests"] == 0
        retain(
            "catalog-reuse",
            catalog=catalog.json(),
            extracted=extracted.json(),
            saved=saved.json(),
            reused=reused,
        )


def test_researcher_inspects_choice_values_and_probes_them_without_changing_the_run(
    tmp_path, monkeypatch
):
    from test_researcher_tools import answer, finish, scripted

    async def choose(messages, info):
        return ModelResponse(
            parts=[
                ToolCallPart(
                    info.output_tools[0].name,
                    decision({"kind": "choose_alternative", "alternative": "reed"}),
                )
            ],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    app = create_app(f"sqlite:///{tmp_path}/researcher.sqlite3")
    monkeypatch.setattr(app.state.models, "model", lambda _name: FunctionModel(function=choose))
    with TestClient(app, base_url="http://localhost") as client:
        _, run_id = save(client, protocol())
        client.post(f"/api/runs/{run_id}/control", json={"action": "start"})
        before = wait_finished(client, run_id)

        def respond(prompt):
            actual = prompt["index"]["runs"][0]["outcome"]
            assert actual["balances"] is None and actual["total_utility"] is None
            assert actual["coordination_outcome"]["payoffs"] == {"iris": 1, "moss": 4, "vale": 10}
            if not prompt["research"]["operations"]:
                return {
                    "answer": None,
                    "requests": [
                        {
                            "kind": "probe",
                            "source": {"kind": "run", "run_id": run_id, "turn": 0},
                            "steps": [
                                {
                                    "actor": actor,
                                    "action": {
                                        "kind": "choose_alternative",
                                        "alternative": "cedar",
                                    },
                                }
                                for actor in ACTORS
                            ],
                        }
                    ],
                }
            result = prompt["research"]["operations"][0]
            assert result["status"] == "complete", result
            assert result["data"]["outcome"]["coordination_outcome"]["payoffs"] == {
                "iris": 12,
                "moss": 0,
                "vale": 3,
            }
            assert result["data"]["participant_calls"] == 0
            return {
                "answer": answer(
                    "The copied cedar choices yield total value 15.",
                    caveats=["A deterministic mechanism probe, not a participant response."],
                ),
                "requests": [],
            }

        scripted(client, monkeypatch, respond)
        submitted = client.post(
            "/api/chats",
            json={
                "question": "Inspect choice values and compare a copied cedar outcome.",
                "context": f"run:{run_id}",
            },
        )
        assert submitted.status_code == 202, submitted.text
        result = finish(client, submitted.json())
        assert result["status"] == "complete", result
        after = client.get(f"/api/runs/{run_id}").json()
        for field in ("state", "turns", "events", "measurements", "activations"):
            assert after[field] == before[field]
        retain("researcher-choice-inspection", before=before, analysis=result, after=after)
