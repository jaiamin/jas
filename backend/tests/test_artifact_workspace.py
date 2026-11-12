"""Independent T09 DEVELOPMENT examples through the approved workflow HTTP seam."""

import json
import time

import pytest
from agent_sim.api import create_app
from agent_sim.domain import Decision, Design, ReadArtifact
from agent_sim.simulation.environments import create_world
from fastapi.testclient import TestClient
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.models.function import FunctionModel
from pydantic_ai.usage import RequestUsage


def protocol():
    return {
        "title": "Verify a laboratory report",
        "question": "Does a solo investigator seek evidence before submitting versioned work?",
        "environment": "artifact_workspace",
        "profiles": [
            {"key": "ada", "name": "Ada", "role": "Administrator", "goal": "Inspect and decide."}
        ],
        "seeds": [83],
        "rounds": 8,
        "conditions": [
            {
                "key": "baseline",
                "name": "Baseline",
                "model": "openai:gpt-6-luna",
                "parameters": {
                    "artifacts": {
                        "write_limit": 2,
                        "objects": [
                            {
                                "key": "measurement",
                                "name": "Measurement",
                                "owner": None,
                                "readers": ["ada"],
                                "writers": [],
                                "content": {"reading": 17},
                            },
                            {
                                "key": "report",
                                "name": "Report",
                                "owner": "ada",
                                "readers": [],
                                "writers": [],
                                "content": {"reading": 0},
                            },
                            {
                                "key": "sealed",
                                "name": "Sealed calibration",
                                "owner": None,
                                "readers": [],
                                "writers": [],
                                "content": {"private_marker": "hidden-83"},
                            },
                        ],
                        "requirements": [
                            {
                                "artifact": "report",
                                "field": "reading",
                                "source": "measurement",
                                "source_field": "reading",
                            }
                        ],
                    }
                },
            }
        ],
        "measures": ["artifact_success"],
        "response_tokens": 512,
        "openai_reasoning_effort": "low",
    }


def decision(action):
    return {
        "action": action,
        "rationale": "A controlled development choice.",
        "memory": "",
        "forecast": None,
    }


def wait_finished(client, run_id):
    deadline = time.monotonic() + 6
    while time.monotonic() < deadline:
        response = client.get(f"/api/runs/{run_id}")
        assert response.status_code == 200, response.text
        run = response.json()
        if run["summary"]["status"] not in {"queued", "running", "pausing"}:
            return run
        time.sleep(0.005)
    pytest.fail("Artifact activation did not finish")


def save(client, value):
    response = client.post("/api/studies", json={"design": value})
    assert response.status_code == 201, response.text
    study = client.get(f"/api/studies/{response.json()['id']}").json()
    return study, study["runs"][0]["id"]


def test_solo_evidence_work_is_versioned_consequential_and_replayable(tmp_path, monkeypatch):
    actions = iter(
        [
            {"kind": "read_artifact", "artifact": "measurement", "version": 1},
            {
                "kind": "write_artifact",
                "artifact": "report",
                "expected_version": 1,
                "content": {"reading": 17},
                "sources": [{"artifact": "measurement", "version": 1}],
            },
            {"kind": "check_artifacts"},
            {"kind": "submit_artifacts"},
        ]
    )
    delivered = []

    async def respond(messages, info):
        delivered.append(json.loads(messages[-1].parts[0].content))
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, decision(next(actions)))],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    app = create_app(f"sqlite:///{tmp_path}/solo.sqlite3", static_dir=tmp_path / "static")
    provider = FunctionModel(function=respond)
    monkeypatch.setattr(app.state.models, "model", lambda _name: provider)
    with TestClient(app, base_url="http://localhost") as client:
        study, run_id = save(client, protocol())
        assert len(study["design"]["profiles"]) == 1
        assert client.get("/api/settings").json()["usage"]["requests"] == 0
        assert (
            client.post(f"/api/runs/{run_id}/control", json={"action": "start"}).status_code == 200
        )
        run = wait_finished(client, run_id)
        assert run["summary"]["status"] == "complete", run
        assert run["summary"]["turn"] == 4
        assert run["metrics"]["artifact_success"] == 1
        report = run["state"]["artifacts"]["report"]
        assert [v["content"] for v in report["versions"]] == [{"reading": 0}, {"reading": 17}]
        assert report["versions"][1]["sources"] == [{"artifact": "measurement", "version": 1}]
        assert run["state"]["writes_remaining"] == 1
        assert run["state"]["outcome"]["status"] == "success"
        assert "balances" not in run["state"]
        assert all(
            "sealed" not in json.dumps(o) and "hidden-83" not in json.dumps(o) for o in delivered
        )
        assert delivered[1]["last_result"]["content"] == {"reading": 17}
        before = client.get("/api/settings").json()["usage"]
        replay = client.post(f"/api/runs/{run_id}/verify").json()
        assert replay["verified_turns"] == 4 and replay["model_requests"] == 0
        assert client.get("/api/settings").json()["usage"] == before
        exported = client.get(f"/api/studies/{study['id']}/export").json()
        assert exported["version"] == 19
        assert len(exported["requests"]) == 4
        assert exported["runs"][0]["evidence"][-1]["checkpoint"] == run["state"]


def test_rejected_stale_work_is_atomic_and_explicit_retry_can_recover(tmp_path, monkeypatch):
    write = {
        "kind": "write_artifact",
        "artifact": "report",
        "expected_version": 1,
        "content": {"reading": 17},
        "sources": [{"artifact": "measurement", "version": 1}],
    }
    actions = iter([write, write, {"kind": "submit_artifacts"}])

    async def respond(_messages, info):
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, decision(next(actions)))],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    app = create_app(f"sqlite:///{tmp_path}/conflict.sqlite3", static_dir=tmp_path / "static")
    provider = FunctionModel(function=respond)
    monkeypatch.setattr(app.state.models, "model", lambda _name: provider)
    with TestClient(app, base_url="http://localhost") as client:
        _, run_id = save(client, protocol())
        client.post(f"/api/runs/{run_id}/control", json={"action": "step"})
        accepted = wait_finished(client, run_id)
        assert accepted["state"]["writes_remaining"] == 1
        client.post(f"/api/runs/{run_id}/control", json={"action": "step"})
        rejected = wait_finished(client, run_id)
        assert rejected["summary"]["status"] == "failed"
        assert rejected["state"] == accepted["state"]
        assert rejected["summary"]["turn"] == 1
        attempt = rejected["activations"][-1]
        assert attempt["status"] == "failed" and attempt["stop_reason"] == "world_rejected"
        assert attempt["operations"][-1]["kind"] == "reject"
        assert attempt["operations"][-1]["request"] == decision(write)
        assert rejected["summary"]["usage"]["requests"] == 2
        replay = client.post(f"/api/runs/{run_id}/verify").json()
        assert replay["verified_turns"] == 1
        assert replay["verified_rejections"] == 1
        client.post(f"/api/runs/{run_id}/control", json={"action": "step"})
        recovered = wait_finished(client, run_id)
        assert recovered["summary"]["status"] == "complete"
        assert recovered["state"]["outcome"]["status"] == "success"
        assert recovered["state"]["artifacts"] == accepted["state"]["artifacts"]
        assert recovered["summary"]["usage"]["requests"] == 3
        assert len(recovered["activations"]) == 3
        from agent_sim.db import ParticipantOperation
        from sqlalchemy import select

        with app.state.db.session.begin() as session:
            rejection = session.scalars(
                select(ParticipantOperation).where(ParticipantOperation.kind == "reject")
            ).one()
            rejection.request = decision({**write, "expected_version": 2})
        altered = client.post(f"/api/runs/{run_id}/verify")
        assert altered.status_code == 422 and "rejection" in altered.text.lower()
        unchanged = client.get(f"/api/runs/{run_id}").json()
        assert unchanged["state"] == recovered["state"]
        assert unchanged["summary"]["usage"] == recovered["summary"]["usage"]


def test_tool_harness_reads_real_artifacts_without_a_world_turn_and_exports_actual_results(
    tmp_path, monkeypatch
):
    value = protocol()
    value["conditions"][0]["harness"] = {
        "kind": "tool_using",
        "max_requests": 2,
        "max_tool_operations": 1,
        "tools": ["read_artifact"],
    }
    responses = iter(
        [
            {
                "operation": "read_artifact",
                "read": {"kind": "read_artifact", "artifact": "measurement", "version": 1},
                "decision": None,
            },
            {
                "operation": "decide",
                "read": None,
                "decision": decision(
                    {
                        "kind": "write_artifact",
                        "artifact": "report",
                        "expected_version": 1,
                        "content": {"reading": 17},
                        "sources": [{"artifact": "measurement", "version": 1}],
                    }
                ),
            },
        ]
    )
    prompts = []

    async def respond(messages, info):
        prompts.append(json.loads(messages[-1].parts[0].content))
        # The operation envelope is distinct from the nested final Decision.
        fields = prompts[-1]["response_fields"]
        assert set(fields) == set(info.output_tools[0].parameters_json_schema["properties"])
        assert {"operation", "decision", "read"} <= set(fields)
        assert not {"rationale", "memory", "forecast"} & set(fields)
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, next(responses))],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    app = create_app(f"sqlite:///{tmp_path}/tools.sqlite3", static_dir=tmp_path / "static")
    provider = FunctionModel(function=respond)
    monkeypatch.setattr(app.state.models, "model", lambda _name: provider)
    with TestClient(app, base_url="http://localhost") as client:
        study, run_id = save(client, value)
        client.post(f"/api/runs/{run_id}/control", json={"action": "step"})
        run = wait_finished(client, run_id)
        assert run["summary"]["status"] == "paused", run
        assert run["summary"]["turn"] == 1
        assert run["summary"]["usage"]["requests"] == 2
        read = run["activations"][0]["operations"][0]
        assert read["kind"] == "read_artifact" and read["status"] == "complete"
        assert read["result"]["content"] == {"reading": 17}
        assert read["result"]["artifact"] == "measurement" and read["result"]["version"] == 1
        assert prompts[1]["operations"][0]["result"] == read["result"]
        assert len(run["state"]["artifact_history"]) == 1
        before = client.get("/api/settings").json()["usage"]
        assert client.post(f"/api/runs/{run_id}/verify").json()["verified_turns"] == 1
        assert client.get("/api/settings").json()["usage"] == before
        exported = client.get(f"/api/studies/{study['id']}/export").json()
        assert exported["activations"][0]["operations"][0] == read


@pytest.mark.parametrize("memory", ["episodic", "notes", "history", "none"])
def test_shared_work_never_exposes_its_writers_private_source_metadata(memory):
    value = protocol()
    value["profiles"].append(
        {"key": "ben", "name": "Ben", "role": "Administrator", "goal": "I own all documents."}
    )
    value["conditions"][0]["parameters"]["memory"] = memory
    report = value["conditions"][0]["parameters"]["artifacts"]["objects"][1]
    report.update(readers=["ben"], writers=["ben"])
    design = Design.model_validate(value)
    world = create_world(design, design.conditions[0].parameters, 83)
    while world.actor() != "ada":
        actor = world.actor()
        assert actor is not None
        world.step(
            actor,
            Decision.model_validate(
                decision({"kind": "read_artifact", "artifact": "report", "version": 1})
            ),
        )
    world.step(
        "ada",
        Decision.model_validate(
            decision(
                {
                    "kind": "write_artifact",
                    "artifact": "report",
                    "expected_version": 1,
                    "content": {"reading": 17},
                    "sources": [{"artifact": "measurement", "version": 1}],
                }
            )
        ),
    )
    while world.actor() != "ben":
        actor = world.actor()
        assert actor is not None
        world.step(
            actor,
            Decision.model_validate(
                decision({"kind": "read_artifact", "artifact": "report", "version": None})
            ),
        )
    before = world.snapshot()
    observed = world.observe("ben")
    read = world.read("ben", ReadArtifact(kind="read_artifact", artifact="report", version=2))
    assert read["content"] == {"reading": 17}
    assert read["sources"] == []
    assert "measurement" not in json.dumps(observed)
    assert "measurement" not in json.dumps(world.decision_schema(observed).model_json_schema())
    errors = []
    for key in ["measurement", "sealed", "nonexistent"]:
        with pytest.raises(ValueError) as error:
            world.read("ben", ReadArtifact(kind="read_artifact", artifact=key, version=1))
        errors.append(str(error.value))
        with pytest.raises(ValueError):
            world.step(
                "ben",
                Decision.model_validate(
                    decision(
                        {
                            "kind": "write_artifact",
                            "artifact": key,
                            "expected_version": 1,
                            "content": {"reading": 99},
                            "sources": [],
                        }
                    )
                ),
            )
        assert world.snapshot() == before
    assert len(set(errors)) == 1
    restored = create_world(design, design.conditions[0].parameters, 83, before)
    assert restored.observe("ben") == observed
    hidden = json.loads(json.dumps(before))
    hidden["artifacts"]["sealed"]["versions"] *= 31
    hidden["notes"]["ada"] = "private-only-marker"
    hidden["last_results"]["ada"] = {"secret": "private-only-marker"}
    changed = create_world(design, design.conditions[0].parameters, 83, hidden)
    assert changed.observe("ben") == observed
    assert (
        changed.decision_schema(observed).model_json_schema()
        == restored.decision_schema(observed).model_json_schema()
    )
    assert world.snapshot() == before


def test_artifact_mechanics_are_reusable_without_importing_the_original_investigator(tmp_path):
    with TestClient(
        create_app(f"sqlite:///{tmp_path}/reuse.sqlite3"), base_url="http://localhost"
    ) as client:
        catalog = client.get("/api/catalog")
        assert catalog.status_code == 200, catalog.text
        installed = next(
            e for e in catalog.json()["environments"] if e["key"] == "artifact_workspace"
        )
        assert installed["source"]["format"] == "jas-environment-v10"
        extracted = client.post("/api/design/environment", json={"design": protocol()})
        assert extracted.status_code == 200, extracted.text
        definition = extracted.json()
        example = definition["examples"][0]
        assert example["roles"] == ["role_1"]
        assert "memory" not in example["parameters"]
        assert "ada" not in json.dumps(example)
        saved = client.post("/api/environments", json={"definition": definition}).json()
        applied = client.post(
            "/api/design/use-environment",
            json={
                "source": saved,
                "example": example["key"],
                "bindings": {},
            },
        )
        assert applied.status_code == 200, applied.text
        value = applied.json()
        assert len(value["profiles"]) == 1
        assert value["profiles"][0]["key"] == "member_1"
        assert (
            value["conditions"][0]["parameters"]["artifacts"]["objects"][1]["owner"] == "member_1"
        )
        assert value["environment_source"] == saved
        study, run_id = save(client, value)
        changed = json.loads(json.dumps(definition))
        changed["examples"][0]["parameters"]["artifacts"]["objects"][0]["content"]["reading"] = 31
        assert (
            client.put(
                f"/api/environments/{saved['id']}", json={"definition": changed, "revision": 1}
            ).status_code
            == 200
        )
        assert (
            client.get(f"/api/studies/{study['id']}").json()["design"]["environment_source"]
            == saved
        )
        assert client.get(f"/api/runs/{run_id}").json()["state"]["artifacts"]["measurement"][
            "versions"
        ][0]["content"] == {"reading": 17}
        assert client.get("/api/settings").json()["usage"]["requests"] == 0


def test_researcher_artifact_probe_is_copy_isolated_and_has_no_invented_financial_outcome(
    tmp_path, monkeypatch
):
    from test_researcher_tools import answer, finish, scripted

    app = create_app(f"sqlite:///{tmp_path}/probe.sqlite3", static_dir=tmp_path / "static")
    with TestClient(app, base_url="http://localhost") as client:
        study, run_id = save(client, protocol())
        before = client.get(f"/api/runs/{run_id}").json()

        def respond(prompt):
            actual = prompt["index"]["runs"][0]
            assert actual["outcome"]["balances"] is None
            assert actual["outcome"]["total_utility"] is None
            assert actual["outcome"]["artifact_outcome"] is None
            if not prompt["research"]["operations"]:
                return {
                    "answer": None,
                    "requests": [
                        {
                            "kind": "probe",
                            "source": {"kind": "run", "run_id": run_id, "turn": 0},
                            "steps": [
                                {
                                    "actor": "ada",
                                    "action": {
                                        "kind": "write_artifact",
                                        "artifact": "report",
                                        "expected_version": 1,
                                        "content": {"reading": 17},
                                        "sources": [{"artifact": "measurement", "version": 1}],
                                    },
                                },
                                {"actor": "ada", "action": {"kind": "submit_artifacts"}},
                            ],
                        }
                    ],
                }
            result = prompt["research"]["operations"][0]
            assert result["status"] == "complete", result
            assert result["data"]["outcome"]["artifact_outcome"]["status"] == "success"
            assert result["data"]["outcome"]["balances"] is None
            assert result["data"]["participant_calls"] == 0
            return {
                "answer": answer(
                    "The copied report passes the enforced checks.",
                    caveats=["A scripted mechanism probe, not participant behavior."],
                ),
                "requests": [],
            }

        scripted(client, monkeypatch, respond)
        submitted = client.post(
            "/api/chats",
            json={"question": "Check artifact mechanics on a copy.", "context": f"run:{run_id}"},
        )
        assert submitted.status_code == 202, submitted.text
        final = finish(client, submitted.json())
        assert final["status"] == "complete", final
        after = client.get(f"/api/runs/{run_id}").json()
        for field in ("state", "turns", "events", "measurements", "activations"):
            assert after[field] == before[field]
        assert not client.get(f"/api/studies/{study['id']}").json()["comparison"]["cells"][0][
            "attempted"
        ]


def test_replay_checks_actual_tool_reads_and_delivered_observations_without_sampling(
    tmp_path, monkeypatch
):
    from agent_sim.db import ParticipantOperation, Turn
    from sqlalchemy import select

    replies = iter(
        [
            {
                "operation": "read_artifact",
                "read": {"kind": "read_artifact", "artifact": "measurement", "version": 1},
                "decision": None,
            },
            {"operation": "decide", "read": None, "decision": decision({"kind": "stop"})},
        ]
    )

    async def respond(_messages, info):
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, next(replies))],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    app = create_app(f"sqlite:///{tmp_path}/read-replay.sqlite3", static_dir=tmp_path / "static")
    provider = FunctionModel(function=respond)
    monkeypatch.setattr(app.state.models, "model", lambda _: provider)
    with TestClient(app, base_url="http://localhost") as client:
        value = protocol()
        value["conditions"][0]["harness"] = {
            "kind": "tool_using",
            "tools": ["read_artifact"],
            "max_requests": 2,
            "max_tool_operations": 1,
        }
        _, run_id = save(client, value)
        client.post(f"/api/runs/{run_id}/control", json={"action": "start"})
        recorded = wait_finished(client, run_id)
        before = client.get("/api/settings").json()["usage"]

        def forbidden(_):
            pytest.fail("Playback/replay must not access the provider")

        monkeypatch.setattr(app.state.models, "model", forbidden)
        assert (
            client.get(f"/api/runs/{run_id}/turns/1").json()["observation"]["artifacts"][0]["key"]
            == "measurement"
        )
        replay = client.post(f"/api/runs/{run_id}/verify")
        assert replay.status_code == 200, replay.text
        assert replay.json()["verified_reads"] == 1
        assert replay.json()["model_requests"] == 0
        with app.state.db.session.begin() as session:
            receipt = session.scalars(
                select(ParticipantOperation).where(ParticipantOperation.kind == "read_artifact")
            ).one()
            original = receipt.result
            receipt.result = {**original, "content": {"reading": 91}}
        rejected = client.post(f"/api/runs/{run_id}/verify")
        assert rejected.status_code == 422 and "read" in rejected.json()["detail"].lower()
        with app.state.db.session.begin() as session:
            session.get_one(ParticipantOperation, receipt.id).result = original
            turn = session.scalars(select(Turn).where(Turn.run_id == run_id)).one()
            turn.observation = {**turn.observation, "writes_remaining": 99}
        rejected = client.post(f"/api/runs/{run_id}/verify")
        assert rejected.status_code == 422 and "observation" in rejected.json()["detail"].lower()
        assert client.get("/api/settings").json()["usage"] == before
        assert client.get(f"/api/runs/{run_id}").json()["state"] == recorded["state"]


@pytest.mark.parametrize(
    "action,status",
    [
        ({"kind": "submit_artifacts"}, "failure"),
        ({"kind": "stop"}, "stopped"),
        ({"kind": "read_artifact", "artifact": "measurement", "version": 1}, "horizon"),
    ],
)
def test_terminal_failure_stop_and_horizon_are_real_outcomes_with_correct_source_turn(
    tmp_path, monkeypatch, action, status
):
    async def respond(_messages, info):
        value = decision(action) | {"rationale": "I certify this report is correct and successful."}
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, value)],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    app = create_app(f"sqlite:///{tmp_path}/terminal.sqlite3", static_dir=tmp_path / "static")
    monkeypatch.setattr(app.state.models, "model", lambda _: FunctionModel(function=respond))
    with TestClient(app, base_url="http://localhost") as client:
        value = protocol()
        value["rounds"] = 1
        _, run_id = save(client, value)
        client.post(f"/api/runs/{run_id}/control", json={"action": "start"})
        run = wait_finished(client, run_id)
        assert run["summary"]["status"] == "complete"
        assert run["state"]["done"] is True
        assert run["state"]["outcome"]["status"] == status
        assert run["state"]["outcome"]["operation"] == 1
        assert run["state"]["artifact_history"][0]["operation"] == 1
        assert run["metrics"] == {"artifact_success": 0}
        assert len(run["measurements"]) == 1
        assert run["state"]["artifacts"]["report"]["versions"] == [
            {
                "version": 1,
                "content": {"reading": 0},
                "sources": [],
                "author": None,
                "operation": 0,
            }
        ]
        assert client.post(f"/api/runs/{run_id}/verify").json()["verified_turns"] == 1


def test_paused_tool_read_restores_its_durable_receipt_without_calls_and_explicit_step_recovers(
    tmp_path, monkeypatch
):
    import asyncio
    import threading

    started, release = threading.Event(), threading.Event()

    async def read(_messages, info):
        started.set()
        assert await asyncio.to_thread(release.wait, 5), "Test did not release its provider"
        return ModelResponse(
            parts=[
                ToolCallPart(
                    info.output_tools[0].name,
                    {
                        "operation": "read_artifact",
                        "read": {"kind": "read_artifact", "artifact": "measurement", "version": 1},
                        "decision": None,
                    },
                )
            ],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    database = f"sqlite:///{tmp_path}/restart.sqlite3"
    app = create_app(database, static_dir=tmp_path / "static")
    monkeypatch.setattr(app.state.models, "model", lambda _: FunctionModel(function=read))
    with TestClient(app, base_url="http://localhost") as client:
        value = protocol()
        value["conditions"][0]["harness"] = {
            "kind": "tool_using",
            "tools": ["read_artifact"],
            "max_requests": 2,
            "max_tool_operations": 1,
        }
        _, run_id = save(client, value)
        initial = client.get(f"/api/runs/{run_id}").json()["state"]
        try:
            assert (
                client.post(f"/api/runs/{run_id}/control", json={"action": "start"}).status_code
                == 200
            )
            assert started.wait(5)
            # The originating HTTP request has returned. Repeated Start cannot add a writer.
            assert (
                client.post(f"/api/runs/{run_id}/control", json={"action": "start"}).status_code
                == 200
            )
            assert (
                client.post(f"/api/runs/{run_id}/control", json={"action": "pause"}).status_code
                == 200
            )
        finally:
            release.set()
        paused = wait_finished(client, run_id)
        assert paused["summary"]["status"] == "paused" and paused["summary"]["turn"] == 0
        assert paused["state"] == initial
        assert len(paused["requests"]) == 1 and paused["requests"][0]["status"] == "complete"
        assert paused["activations"][0]["operations"][0]["result"]["content"] == {"reading": 17}
        assert paused["activations"][0]["status"] == "paused"
        usage = client.get("/api/settings").json()["usage"]
    restarted = create_app(database, static_dir=tmp_path / "static")

    def forbidden(_):
        pytest.fail("Restoration/replay must not access a model")

    monkeypatch.setattr(restarted.state.models, "model", forbidden)
    with TestClient(restarted, base_url="http://localhost") as client:
        restored = client.get(f"/api/runs/{run_id}").json()
        for field in ("state", "activations", "requests", "turns", "events", "measurements"):
            assert restored[field] == paused[field]
        assert client.post(f"/api/runs/{run_id}/verify").json()["verified_reads"] == 1
        assert client.get("/api/settings").json()["usage"] == usage
        read_exposure = client.get(f"/api/runs/{run_id}/exposure").json()
        read_opportunity = next(
            r for r in read_exposure["opportunities"] if r["kind"] == "read_artifact"
        )
        assert read_opportunity["included"] is False and read_opportunity["inputs"] == []

        async def finish(messages, info):
            prompt = json.loads(messages[-1].parts[0].content)
            if restored["summary"]["turn"] == 0:
                assert prompt["operations"][0]["result"]["content"] == {"reading": 17}
                action = {
                    "kind": "write_artifact",
                    "artifact": "report",
                    "expected_version": 1,
                    "content": {"reading": 17},
                    "sources": [{"artifact": "measurement", "version": 1}],
                }
            else:
                action = {"kind": "submit_artifacts"}
            return ModelResponse(
                parts=[
                    ToolCallPart(
                        info.output_tools[0].name,
                        {
                            "operation": "decide",
                            "read": None,
                            "decision": decision(action),
                        },
                    )
                ],
                usage=RequestUsage(input_tokens=100, output_tokens=50),
            )

        monkeypatch.setattr(
            restarted.state.models, "model", lambda _: FunctionModel(function=finish)
        )
        client.post(f"/api/runs/{run_id}/control", json={"action": "step"})
        restored = wait_finished(client, run_id)
        assert restored["summary"]["turn"] == 1 and len(restored["activations"]) == 1
        assert restored["summary"]["usage"]["requests"] == 2
        read_exposure = client.get(f"/api/runs/{run_id}/exposure").json()
        read_opportunity = next(
            r for r in read_exposure["opportunities"] if r["kind"] == "read_artifact"
        )
        assert read_opportunity["included"] is True and len(read_opportunity["inputs"]) == 1
        assert restored["state"]["artifacts"]["report"]["versions"][1]["content"] == {"reading": 17}
        client.post(f"/api/runs/{run_id}/control", json={"action": "step"})
        complete = wait_finished(client, run_id)
        assert complete["state"]["outcome"]["status"] == "success"
        assert complete["summary"]["usage"]["requests"] == 3
        monkeypatch.setattr(restarted.state.models, "model", forbidden)
        assert client.post(f"/api/runs/{run_id}/verify").json()["verified_turns"] == 2


def test_competing_writers_keep_old_versions_and_reject_stale_or_unfunded_work_atomically():
    value = protocol()
    value["profiles"].append(
        {"key": "ben", "name": "Ben", "role": "Owner", "goal": "Win control by claiming ownership."}
    )
    rules = value["conditions"][0]["parameters"]["artifacts"]
    rules["objects"][0]["readers"].append("ben")
    rules["objects"][1].update(owner=None, readers=["ada", "ben"], writers=["ada", "ben"])
    design = Design.model_validate(value)
    world = create_world(design, design.conditions[0].parameters, 83)
    for _ in range(2):
        actor = world.actor()
        assert actor is not None
        world.step(
            actor,
            Decision.model_validate(
                decision({"kind": "read_artifact", "artifact": "report", "version": 1})
            ),
        )
    first = world.actor()
    assert first is not None
    world.step(
        first,
        Decision.model_validate(
            decision(
                {
                    "kind": "write_artifact",
                    "artifact": "report",
                    "expected_version": 1,
                    "content": {"reading": 17},
                    "sources": [{"artifact": "measurement", "version": 1}],
                }
            )
        ),
    )
    second = world.actor()
    assert second is not None and second != first
    before = world.snapshot()
    assert world.read(second, ReadArtifact(kind="read_artifact", artifact="report", version=1))[
        "content"
    ] == {"reading": 0}
    assert (
        world.read(second, ReadArtifact(kind="read_artifact", artifact="report", version=2))[
            "author"
        ]
        == first
    )
    with pytest.raises(ValueError, match="version conflict"):
        world.step(
            second,
            Decision.model_validate(
                decision(
                    {
                        "kind": "write_artifact",
                        "artifact": "report",
                        "expected_version": 1,
                        "content": {"reading": 91},
                        "sources": [],
                    }
                )
            ),
        )
    assert world.snapshot() == before
    world.step(
        second,
        Decision.model_validate(
            decision(
                {
                    "kind": "write_artifact",
                    "artifact": "report",
                    "expected_version": 2,
                    "content": {"reading": 23},
                    "sources": [{"artifact": "measurement", "version": 1}],
                }
            )
        ),
    )
    assert [v["content"] for v in world.snapshot()["artifacts"]["report"]["versions"]] == [
        {"reading": 0},
        {"reading": 17},
        {"reading": 23},
    ]
    assert world.snapshot()["writes_remaining"] == 0
    before = world.snapshot()
    exhausted_actor = world.actor()
    assert exhausted_actor is not None
    with pytest.raises(ValueError, match="allowance exhausted"):
        world.step(
            exhausted_actor,
            Decision.model_validate(
                decision(
                    {
                        "kind": "write_artifact",
                        "artifact": "report",
                        "expected_version": 3,
                        "content": {"reading": 17},
                        "sources": [],
                    }
                )
            ),
        )
    assert world.snapshot() == before
    restored = create_world(design, design.conditions[0].parameters, 83, before)
    for actor in ["ada", "ben"]:
        assert restored.observe(actor) == world.observe(actor)
    checking_actor = restored.actor()
    assert checking_actor is not None
    restored.step(checking_actor, Decision.model_validate(decision({"kind": "check_artifacts"})))
    assert restored.snapshot()["last_results"][checking_actor]["passed"] is False


@pytest.mark.parametrize(
    "failure",
    ["foreign_actor", "sealed", "nonexistent", "unreadable_source", "future_source", "forecast"],
)
def test_rejected_operation_changes_no_document_allowance_note_or_history(failure):
    design = Design.model_validate(protocol())
    world = create_world(design, design.conditions[0].parameters, 83)
    action = {
        "kind": "write_artifact",
        "artifact": "report",
        "expected_version": 1,
        "content": {"reading": 17},
        "sources": [{"artifact": "measurement", "version": 1}],
    }
    if failure in {"sealed", "nonexistent"}:
        action["artifact"] = failure
    elif failure == "unreadable_source":
        action["sources"] = [{"artifact": "sealed", "version": 1}]
    elif failure == "future_source":
        action["sources"] = [{"artifact": "measurement", "version": 2}]
    proposed = decision(action) | {"memory": "I changed the document."}
    if failure == "forecast":
        proposed["forecast"] = 0.5
    before = world.snapshot()
    with pytest.raises(ValueError):
        world.step(
            "intruder" if failure == "foreign_actor" else "ada", Decision.model_validate(proposed)
        )
    assert world.snapshot() == before
    assert world.read("ada", ReadArtifact(kind="read_artifact", artifact="report", version=1))[
        "content"
    ] == {"reading": 0}


def test_population_and_immutable_source_versions_are_validated_by_the_public_api(tmp_path):
    with TestClient(
        create_app(f"sqlite:///{tmp_path}/validation.sqlite3"), base_url="http://localhost"
    ) as client:
        solo = protocol()
        assert client.post("/api/design/validate", json={"design": solo}).status_code == 200
        twelve = protocol()
        twelve["profiles"].extend(
            {"key": f"p{i}", "name": f"P {i}", "goal": "Inspect authorized work."}
            for i in range(2, 13)
        )
        assert client.post("/api/design/validate", json={"design": twelve}).status_code == 200
        twelve["profiles"].append({"key": "thirteenth", "name": "Extra", "goal": "Inspect."})
        assert client.post("/api/design/validate", json={"design": twelve}).status_code == 422
        catalog = client.get("/api/catalog").json()
        for environment in ["commons", "trust_exchange", "institution", "bargaining"]:
            value = next(t["design"] for t in catalog["templates"] if t["id"] == environment)
            value["profiles"] = value["profiles"][:1]
            rejected = client.post("/api/design/validate", json={"design": value})
            assert rejected.status_code == 422 and "at least two" in rejected.text
        value = protocol()
        value["conditions"][0]["parameters"]["artifacts"]["objects"][0]["owner"] = "ada"
        rejected = client.post("/api/design/validate", json={"design": value})
        assert rejected.status_code == 422 and "immutable evidence" in rejected.text
        source = next(
            e["source"] for e in catalog["environments"] if e["key"] == "artifact_workspace"
        )
        source["format"] = "jas-environment-v3"
        rejected = client.post(
            "/api/design/use-environment",
            json={
                "source": source,
                "example": source["definition"]["examples"][0]["key"],
                "bindings": {},
            },
        )
        assert rejected.status_code == 422
        assert client.get("/api/settings").json()["usage"]["requests"] == 0


def test_rejected_tool_read_retains_attempt_but_never_delivers_another_objects_content(
    tmp_path, monkeypatch
):
    async def respond(_messages, info):
        return ModelResponse(
            parts=[
                ToolCallPart(
                    info.output_tools[0].name,
                    {
                        "operation": "read_artifact",
                        "read": {"kind": "read_artifact", "artifact": "sealed", "version": 1},
                        "decision": None,
                    },
                )
            ],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    app = create_app(f"sqlite:///{tmp_path}/denied.sqlite3", static_dir=tmp_path / "static")
    monkeypatch.setattr(app.state.models, "model", lambda _: FunctionModel(function=respond))
    with TestClient(app, base_url="http://localhost") as client:
        value = protocol()
        value["conditions"][0]["harness"] = {"kind": "tool_using", "tools": ["read_artifact"]}
        _, run_id = save(client, value)
        initial = client.get(f"/api/runs/{run_id}").json()["state"]
        client.post(f"/api/runs/{run_id}/control", json={"action": "start"})
        run = wait_finished(client, run_id)
        assert run["summary"]["status"] == "failed" and run["state"] == initial
        assert run["summary"]["usage"]["requests"] == 1
        operation = run["activations"][0]["operations"][0]
        assert operation["request"]["read"]["artifact"] == "sealed"
        assert (
            operation["status"] == "rejected"
            and operation["result"] == "Artifact operation is unavailable"
        )
        assert "hidden-83" not in json.dumps(run["activations"])
        assert client.post(f"/api/runs/{run_id}/verify").json()["verified_reads"] == 0


@pytest.mark.parametrize("record", ["event", "measurement"])
def test_replay_rejects_forged_terminal_evidence_without_spending(tmp_path, monkeypatch, record):
    from agent_sim.db import Measurement, RecordedEvent
    from sqlalchemy import select

    async def respond(_messages, info):
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, decision({"kind": "submit_artifacts"}))],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    app = create_app(f"sqlite:///{tmp_path}/forged.sqlite3", static_dir=tmp_path / "static")
    monkeypatch.setattr(app.state.models, "model", lambda _: FunctionModel(function=respond))
    with TestClient(app, base_url="http://localhost") as client:
        _, run_id = save(client, protocol())
        client.post(f"/api/runs/{run_id}/control", json={"action": "start"})
        run = wait_finished(client, run_id)
        assert run["state"]["outcome"]["status"] == "failure"
        before = client.get("/api/settings").json()["usage"]
        with app.state.db.session.begin() as session:
            if record == "event":
                event = session.scalars(
                    select(RecordedEvent).where(RecordedEvent.run_id == run_id)
                ).one()
                event.data = {**event.data, "passed": True}
            else:
                session.scalars(
                    select(Measurement).where(Measurement.run_id == run_id)
                ).one().value = 1
        verified = client.post(f"/api/runs/{run_id}/verify")
        assert verified.status_code == 422, verified.text
        assert client.get("/api/settings").json()["usage"] == before
        assert client.get(f"/api/runs/{run_id}").json()["state"] == run["state"]
