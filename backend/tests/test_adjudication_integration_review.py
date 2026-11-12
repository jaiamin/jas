"""Independent public boundaries for judge costs, hard facts and concurrent export."""

import asyncio
import json
import threading
import time
from concurrent.futures import ThreadPoolExecutor

from agent_sim.api import create_app
from fastapi.testclient import TestClient
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.models.function import FunctionModel
from pydantic_ai.usage import RequestUsage

from benchmarks.provider_fixtures import output_args

GUIDANCE = (
    "Use the north desk before 19:00. If you miss it, ask about another date; "
    "a replacement pickup is not confirmed."
)
JUDGE = {
    "version": "1.0.0",
    "model": "openai:gpt-6.1-sol",
    "openai_reasoning_effort": "low",
    "response_tokens": 512,
}
RULING = {
    "verdict": "accept",
    "explanation": "A pickup action and explicitly uncertain alternative are stated.",
    "facts": [
        {"artifact": "notice", "version": 1, "field": "desk", "value": "north"},
        {"artifact": "notice", "version": 1, "field": "closes_at", "value": 19},
    ],
}


def north_desk_protocol():
    return {
        "title": "North desk pickup",
        "question": "Does a declared fallible rubric preserve independent fact authority?",
        "environment": "artifact_workspace",
        "profiles": [{"key": "writer", "name": "Writer", "goal": "PRIVATE_NORTH_GOAL"}],
        "seeds": [419],
        "rounds": 2,
        "budget_usd": 1,
        "response_tokens": 512,
        "openai_reasoning_effort": "low",
        "measures": ["artifact_success"],
        "conditions": [
            {
                "key": "declared",
                "name": "Declared review",
                "model": "openai:gpt-6-luna",
                "harness": {"kind": "direct_action", "version": "1.0.0"},
                "adjudicator": JUDGE,
                "parameters": {
                    "artifacts": {
                        "write_limit": 1,
                        "judgment": {
                            "mechanism": "pickup_note_actionability",
                            "version": "1.0.0",
                            "artifact": "note",
                            "field": "guidance",
                            "evidence": [
                                {
                                    "artifact": "notice",
                                    "version": 1,
                                    "fields": ["desk", "closes_at"],
                                }
                            ],
                        },
                        "objects": [
                            {
                                "key": "notice",
                                "name": "Pinned pickup notice",
                                "readers": ["writer"],
                                "content": {"desk": "north", "closes_at": 19},
                            },
                            {
                                "key": "note",
                                "name": "Pickup note",
                                "owner": "writer",
                                "content": {"desk": "", "closes_at": 0, "guidance": ""},
                            },
                            {
                                "key": "sealed",
                                "name": "Sealed unrelated record",
                                "content": {"note": "PRIVATE_NORTH_SEALED"},
                            },
                        ],
                        "requirements": [
                            {
                                "artifact": "note",
                                "field": field,
                                "source": "notice",
                                "source_field": field,
                            }
                            for field in ("desk", "closes_at")
                        ],
                    }
                },
            }
        ],
    }


def settled(client, run_id):
    deadline = time.monotonic() + 8
    while time.monotonic() < deadline:
        response = client.get(f"/api/runs/{run_id}")
        assert response.status_code == 200, response.text
        run = response.json()
        if run["summary"]["status"] not in {"running", "queued", "pausing"}:
            return run
        time.sleep(0.005)
    raise AssertionError("The actual turn did not settle")


def provider_stand_ins(app, closing_hour, entered=None, release=None):
    actions = iter(
        [
            {
                "kind": "write_artifact",
                "artifact": "note",
                "expected_version": 1,
                "content": {"desk": "north", "closes_at": closing_hour, "guidance": GUIDANCE},
                "sources": [{"artifact": "notice", "version": 1}],
            },
            {"kind": "submit_artifacts"},
        ]
    )
    participant_inputs, judge_inputs = [], []

    async def participant(messages, info):
        participant_inputs.append(json.loads(messages[-1].parts[0].content))
        return ModelResponse(
            parts=[
                ToolCallPart(
                    info.output_tools[0].name,
                    output_args(
                        info,
                        {
                            "action": next(actions),
                            "rationale": "Development action.",
                            "memory": "",
                            "forecast": None,
                        },
                    ),
                )
            ],
            usage=RequestUsage(input_tokens=101, output_tokens=37),
        )

    async def judge(messages, info):
        judge_inputs.append(json.loads(messages[-1].parts[0].content))
        if entered is not None and release is not None:
            entered.set()
            assert await asyncio.to_thread(release.wait, 8), "Judge barrier timed out"
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, output_args(info, RULING))],
            usage=RequestUsage(input_tokens=41, output_tokens=19),
        )

    app.state.models.models["openai:gpt-6-luna"] = FunctionModel(function=participant)
    app.state.models.models["openai:gpt-6.1-sol"] = FunctionModel(function=judge)
    return participant_inputs, judge_inputs


def saved_run(client):
    response = client.post("/api/studies", json={"design": north_desk_protocol()})
    assert response.status_code == 201, response.text
    study_id = response.json()["id"]
    return study_id, client.get(f"/api/studies/{study_id}").json()["runs"][0]["id"]


def assert_reopened_twice(database, static, run_id, run, export, usage, monkeypatch):
    for _ in range(2):
        restored = create_app(database, static_dir=static)

        def forbidden(_name):
            raise AssertionError("Read/replay must not construct a provider")

        monkeypatch.setattr(restored.state.models, "model", forbidden)
        with TestClient(restored, base_url="http://localhost") as client:
            assert client.get(f"/api/runs/{run_id}").json() == run
            verified = client.post(f"/api/runs/{run_id}/verify")
            assert verified.status_code == 200, verified.text
            assert verified.json()["verified_turns"] == 2
            assert verified.json()["model_requests"] == 0
            sid = run["summary"]["study_id"]
            assert client.get(f"/api/studies/{sid}/export").json() == export
            assert client.get("/api/settings").json()["usage"] == usage


def test_judge_commit_cannot_cross_an_active_export_snapshot(tmp_path, monkeypatch):
    entered, release = threading.Event(), threading.Event()
    captured, finish_export = threading.Event(), threading.Event()
    database = f"sqlite:///{tmp_path}/snapshot.sqlite3"
    static = tmp_path / "static"
    app = create_app(database, static_dir=static)
    participants, judges = provider_stand_ins(app, 19, entered, release)
    with TestClient(app, base_url="http://localhost") as client:
        sid, rid = saved_run(client)
        assert client.post(f"/api/runs/{rid}/control", json={"action": "start"}).status_code == 200
        assert entered.wait(8), "The actual adjudication was never dispatched"
        prior = client.get(f"/api/studies/{sid}/export").json()
        assert prior["version"] == 20
        assert prior["runs"][0]["record"]["summary"]["turn"] == 1
        assert len(prior["requests"]) == 3
        pending = next(r for r in prior["requests"] if r["purpose"] == "adjudication")
        assert pending["status"] == "pending"
        assert pending["reserved"] == pending["charged"] == 21025
        assert sum(r["charged"] for r in prior["requests"] if r["status"] == "complete") == 58
        original = app.state.research.study

        def stop_after_real_read(study_id):
            detail = original(study_id)
            captured.set()
            assert finish_export.wait(8), "Export barrier timed out"
            return detail

        monkeypatch.setattr(app.state.research, "study", stop_after_real_read)
        try:
            with ThreadPoolExecutor(max_workers=1) as pool:
                response = pool.submit(client.get, f"/api/studies/{sid}/export")
                try:
                    assert captured.wait(8), "The export did not enter its real read transaction"
                    release.set()
                    run = settled(client, rid)
                    assert run["summary"]["turn"] == 2
                finally:
                    release.set()
                    finish_export.set()
                snapshot = response.result(timeout=8)
        finally:
            release.set()
            finish_export.set()
            monkeypatch.setattr(app.state.research, "study", original)
        assert snapshot.status_code == 200, snapshot.text
        assert snapshot.json() == prior
        assert len(participants) == 2 and len(judges) == 1
        assert judges == [
            {
                "mechanism": "pickup_note_actionability",
                "version": "1.0.0",
                "artifact": "note",
                "artifact_version": 2,
                "content": {"guidance": GUIDANCE, "desk": "north", "closes_at": 19},
                "evidence": [
                    {
                        "artifact": "notice",
                        "version": 1,
                        "content": {"desk": "north", "closes_at": 19},
                    }
                ],
            }
        ]
        assert "PRIVATE_NORTH" not in json.dumps(judges)
        assert "PRIVATE_NORTH_SEALED" not in json.dumps(participants)
        assert run["state"]["outcome"]["status"] == "success"
        event = next(e for e in run["events"] if e["kind"] == "adjudication")
        assert event["data"]["ruling"] == RULING
        assert event["data"]["consequence"] == {
            "applied": True,
            "submission_status": "success",
            "hard_facts_passed": True,
        }
        export = client.get(f"/api/studies/{sid}/export").json()
        assert export != prior
        assert sum(r["charged"] for r in export["requests"]) == 330
        judge = next(r for r in export["requests"] if r["id"] == event["data"]["request_id"])
        assert (
            judge["status"],
            judge["charged"],
            judge["input_tokens"],
            judge["output_tokens"],
        ) == ("complete", 272, 41, 19)
        assert judge["activation_id"] is None
        assert run["effort"]["usage"]["cost_usd"] == 0.000058
        usage = client.get("/api/settings").json()["usage"]
        assert usage["requests"] == 3 and usage["cost_usd"] == 0.000330
    assert_reopened_twice(database, static, rid, run, export, usage, monkeypatch)


def test_contradictory_work_fails_before_judge_dispatch(tmp_path, monkeypatch):
    database = f"sqlite:///{tmp_path}/facts.sqlite3"
    static = tmp_path / "static"
    app = create_app(database, static_dir=static)
    participants, judges = provider_stand_ins(app, 20)
    with TestClient(app, base_url="http://localhost") as client:
        sid, rid = saved_run(client)
        assert client.post(f"/api/runs/{rid}/control", json={"action": "start"}).status_code == 200
        run = settled(client, rid)
        assert run["summary"]["status"] == "complete" and run["summary"]["turn"] == 2
        assert run["state"]["outcome"]["status"] == "failure"
        assert run["metrics"]["artifact_success"] == 0
        assert run["state"]["artifacts"]["notice"]["versions"][0]["content"] == {
            "desk": "north",
            "closes_at": 19,
        }
        assert len(participants) == 2 and judges == []
        assert "PRIVATE_NORTH_SEALED" not in json.dumps(participants)
        assert not any(e["kind"] == "adjudication" for e in run["events"])
        assert all(r["purpose"] == "decision" for r in run["requests"])
        export = client.get(f"/api/studies/{sid}/export").json()
        assert len(export["requests"]) == 2
        assert sum(r["charged"] for r in export["requests"]) == 58
        usage = client.get("/api/settings").json()["usage"]
        assert usage["requests"] == 2 and usage["cost_usd"] == 0.000058
    assert_reopened_twice(database, static, rid, run, export, usage, monkeypatch)
