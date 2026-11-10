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
        assert exported["version"] == 7
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
        assert client.post(f"/api/runs/{run_id}/verify").json()["verified_turns"] == 1
        client.post(f"/api/runs/{run_id}/control", json={"action": "step"})
        recovered = wait_finished(client, run_id)
        assert recovered["summary"]["status"] == "complete"
        assert recovered["state"]["outcome"]["status"] == "success"
        assert recovered["state"]["artifacts"] == accepted["state"]["artifacts"]
        assert recovered["summary"]["usage"]["requests"] == 3
        assert len(recovered["activations"]) == 3


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


def test_shared_work_never_exposes_its_writers_private_source_metadata():
    value = protocol()
    value["profiles"].append(
        {"key": "ben", "name": "Ben", "role": "Administrator", "goal": "I own all documents."}
    )
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
        assert installed["source"]["format"] == "jas-environment-v4"
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
