"""Artifact workflow lifecycle checks; replace only the external provider boundary."""

import json
import os
import subprocess
import sys
import time

import pytest
from agent_sim.api import create_app
from fastapi.testclient import TestClient
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.models.function import FunctionModel
from pydantic_ai.usage import RequestUsage
from test_artifact_workspace import decision, protocol, save, wait_finished

from benchmarks.provider_fixtures import output_args


def test_actual_process_restart_pauses_inflight_work_and_keeps_unknown_reservation(
    tmp_path, monkeypatch
):
    source = tmp_path / "protocol.json"
    source.write_text(json.dumps(protocol()))
    ready = tmp_path / "ready.json"
    database = f"sqlite:///{tmp_path}/crashed.sqlite3"
    script = r"""
import asyncio, json, sys, time
from pathlib import Path
from agent_sim.api import create_app
from fastapi.testclient import TestClient
from pydantic_ai import models
from pydantic_ai.models.function import FunctionModel
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.usage import RequestUsage
from benchmarks.provider_fixtures import output_args
models.ALLOW_MODEL_REQUESTS = False
app = create_app(sys.argv[1], static_dir=Path(sys.argv[2]).parent / "static")
requests = 0
async def respond(messages, info):
    global requests
    requests += 1
    if requests > 1:
        Path(sys.argv[3]).write_text(json.dumps({"run_id": run_id}))
        await asyncio.Event().wait()
    return ModelResponse(parts=[ToolCallPart(info.output_tools[0].name, output_args(info, {
        "action": {"kind": "write_artifact", "artifact": "report", "expected_version": 1,
                   "content": {"reading": 17},
                   "sources": [{"artifact": "measurement", "version": 1}]},
        "rationale": "Known fixture", "memory": "Retain version two.", "forecast": None,
    }))], usage=RequestUsage(input_tokens=100, output_tokens=50))
app.state.models.models["openai:gpt-6-luna"] = FunctionModel(function=respond)
with TestClient(app, base_url="http://localhost") as client:
    value = json.loads(Path(sys.argv[2]).read_text())
    created = client.post("/api/studies", json={"design": value})
    assert created.status_code == 201, created.text
    study = client.get(f"/api/studies/{created.json()['id']}").json()
    run_id = study["runs"][0]["id"]
    assert client.post(f"/api/runs/{run_id}/control", json={"action": "start"}).status_code == 200
    while True:
        time.sleep(0.05)
"""
    output = tmp_path / "child.log"
    with output.open("w") as log:
        process = subprocess.Popen(
            [sys.executable, "-c", script, database, str(source), str(ready)],
            stdout=log,
            stderr=subprocess.STDOUT,
            env={
                **os.environ,
                "OPENAI_API_KEY": "",
                "ANTHROPIC_API_KEY": "",
                "PYDANTIC_AI_NO_BANNER": "1",
            },
        )
        try:
            deadline = time.monotonic() + 10
            while not ready.exists() and time.monotonic() < deadline and process.poll() is None:
                time.sleep(0.01)
            assert ready.exists(), (
                f"Owned fixture process did not reach its blocked request: {output}"
            )
        finally:
            if process.poll() is None:
                process.kill()
            process.wait(timeout=5)
    run_id = json.loads(ready.read_text())["run_id"]
    restarted = create_app(database, static_dir=tmp_path / "static")

    def forbidden(_):
        pytest.fail("Restoring or replaying a crashed process must not contact a model")

    monkeypatch.setattr(restarted.state.models, "model", forbidden)
    with TestClient(restarted, base_url="http://localhost") as client:
        run = client.get(f"/api/runs/{run_id}").json()
        assert run["summary"]["status"] == "paused" and run["summary"]["turn"] == 1
        assert [v["content"] for v in run["state"]["artifacts"]["report"]["versions"]] == [
            {"reading": 0},
            {"reading": 17},
        ]
        assert run["state"]["writes_remaining"] == 1
        assert run["state"]["notes"]["ada"] == "Retain version two."
        assert [r["status"] for r in run["requests"]] == ["complete", "unknown"]
        assert (
            run["summary"]["usage"]["requests"] == 2 and run["summary"]["usage"]["partial"] is True
        )
        assert run["activations"][1]["status"] == "interrupted"
        assert run["activations"][1]["stop_reason"] == "server_restart"
        usage = client.get("/api/settings").json()["usage"]
        replay = client.post(f"/api/runs/{run_id}/verify")
        assert replay.status_code == 200 and replay.json()["verified_turns"] == 1
        assert client.get("/api/settings").json()["usage"] == usage
        assert client.get(f"/api/runs/{run_id}").json()["state"] == run["state"]


@pytest.mark.parametrize("harness", ["direct_action", "tool_using"])
def test_auxiliary_or_next_provider_failure_retains_actual_reads_and_unknown_usage(
    tmp_path, monkeypatch, harness
):
    requests = 0

    async def respond(_messages, info):
        nonlocal requests
        requests += 1
        if requests == 2:
            raise TimeoutError("T09 development provider interruption")
        action = {"kind": "read_artifact", "artifact": "measurement", "version": 1}
        value = (
            decision(action)
            if harness == "direct_action"
            else {"operation": "read_artifact", "read": action, "decision": None}
        )
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, output_args(info, value))],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    app = create_app(f"sqlite:///{tmp_path}/unknown.sqlite3", static_dir=tmp_path / "static")
    monkeypatch.setattr(app.state.models, "model", lambda _: FunctionModel(function=respond))
    with TestClient(app, base_url="http://localhost") as client:
        value = protocol()
        if harness == "tool_using":
            value["conditions"][0]["harness"] = {
                "kind": harness,
                "tools": ["read_artifact"],
                "max_requests": 2,
                "max_tool_operations": 1,
            }
        study, run_id = save(client, value)
        initial = client.get(f"/api/runs/{run_id}").json()["state"]
        client.post(f"/api/runs/{run_id}/control", json={"action": "start"})
        failed = wait_finished(client, run_id)
        assert failed["summary"]["status"] == "failed"
        assert failed["summary"]["turn"] == (1 if harness == "direct_action" else 0)
        assert (
            failed["summary"]["usage"]["requests"] == 2
            and failed["summary"]["usage"]["partial"] is True
        )
        assert [r["status"] for r in failed["requests"]] == ["complete", "unknown"]
        assert failed["state"]["artifacts"] == initial["artifacts"]
        assert failed["state"]["writes_remaining"] == 2
        if harness == "tool_using":
            assert failed["state"] == initial
            assert failed["activations"][0]["operations"][0]["result"]["content"] == {"reading": 17}
        else:
            assert failed["state"]["last_results"]["ada"]["content"] == {"reading": 17}
        request = client.get(f"/api/requests/{failed['requests'][1]['id']}").json()
        assert request["error"] == "TimeoutError"
        exported = client.get(f"/api/studies/{study['id']}/export").json()
        unknown = exported["requests"][1]
        assert unknown["status"] == "unknown" and unknown["cost_usd"] > 0
        assert exported["study"]["usage"] == failed["summary"]["usage"]
        usage = client.get("/api/settings").json()["usage"]
        assert client.post(f"/api/runs/{run_id}/verify").status_code == 200
        assert requests == 2
        assert client.get("/api/settings").json()["usage"] == usage
