"""Real process restoration and declared adjudication boundaries, with no live models."""

import json
import os
import subprocess
import sys
import time

import pytest
from agent_sim.api import create_app
from fastapi.testclient import TestClient
from pydantic_ai.models.function import FunctionModel
from test_fallible_adjudication import GUIDANCE, RULING, protocol


@pytest.mark.parametrize("boundary", ["inflight", "settled-before-commit"])
def test_actual_restart_never_resubmits_a_pending_or_completed_judge(tmp_path, boundary):
    source = tmp_path / "case.json"
    source.write_text(json.dumps({"design": protocol(), "guidance": GUIDANCE, "ruling": RULING}))
    ready = tmp_path / "ready.json"
    database = f"sqlite:///{tmp_path}/restart.sqlite3"
    script = r'''
import asyncio, json, os, sys, time
from pathlib import Path
from agent_sim.api import create_app
from fastapi.testclient import TestClient
from pydantic_ai import models
from pydantic_ai.models.function import FunctionModel
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.usage import RequestUsage
from benchmarks.provider_fixtures import output_args
from sqlalchemy import event, text
models.ALLOW_MODEL_REQUESTS = False
case = json.loads(Path(sys.argv[2]).read_text())
app = create_app(sys.argv[1], static_dir=Path(sys.argv[2]).parent / "static")
actions = iter([
    {"kind": "write_artifact", "artifact": "report", "expected_version": 1,
     "content": {"desk": "west", "closes_at": 17, "guidance": case["guidance"]},
     "sources": [{"artifact": "pickup", "version": 1}]},
    {"kind": "submit_artifacts"},
])
async def author(messages, info):
    return ModelResponse(parts=[ToolCallPart(info.output_tools[0].name, output_args(info, {
        "action": next(actions), "rationale": "Literal development action.",
        "memory": "", "forecast": None,
    }))], usage=RequestUsage(input_tokens=101, output_tokens=37))
def publish_ready():
    # The parent kills this process as soon as the signal appears.
    ready = Path(sys.argv[3])
    pending = ready.with_suffix(".tmp")
    pending.write_text(json.dumps({"run_id": run_id}))
    pending.replace(ready)
async def judge(messages, info):
    if sys.argv[4] == "inflight":
        publish_ready()
        await asyncio.Event().wait()
    return ModelResponse(parts=[ToolCallPart(info.output_tools[0].name, case["ruling"])],
                         usage=RequestUsage(input_tokens=41, output_tokens=19))
app.state.models.models["openai:gpt-6-luna"] = FunctionModel(function=author)
app.state.models.models["openai:gpt-6.1-sol"] = FunctionModel(function=judge)
if sys.argv[4] == "settled-before-commit":
    def abrupt_stop():
        os._exit(73)
    def configure(connection, _record):
        connection.create_function("abrupt_stop", 0, abrupt_stop)
    event.listen(app.state.db.engine, "connect", configure)
    with app.state.db.engine.begin() as connection:
        configure(connection.connection.driver_connection, None)
        connection.execute(text("""CREATE TRIGGER crash_turn BEFORE INSERT ON turns
            WHEN NEW.number = 2 BEGIN SELECT abrupt_stop(); END"""))
with TestClient(app, base_url="http://localhost") as client:
    created = client.post("/api/studies", json={"design": case["design"]})
    assert created.status_code == 201, created.text
    study = client.get(f"/api/studies/{created.json()['id']}").json()
    run_id = study["runs"][0]["id"]
    if sys.argv[4] != "inflight":
        publish_ready()
    assert client.post(f"/api/runs/{run_id}/control", json={"action": "start"}).status_code == 200
    while True:
        time.sleep(0.02)
'''
    output = tmp_path / "process.log"
    with output.open("w") as log:
        child = subprocess.Popen(
            [sys.executable, "-B", "-c", script, database, str(source), str(ready), boundary],
            stdout=log,
            stderr=subprocess.STDOUT,
            env={**os.environ, "OPENAI_API_KEY": "", "ANTHROPIC_API_KEY": ""},
        )
        try:
            deadline = time.monotonic() + 10
            while time.monotonic() < deadline:
                if child.poll() is not None or (boundary == "inflight" and ready.exists()):
                    break
                time.sleep(0.01)
            assert ready.exists(), f"Owned process did not reach its declared boundary: {output}"
            if boundary != "inflight":
                assert child.poll() == 73, f"Expected the pre-commit crash: {output}"
        finally:
            if child.poll() is None:
                child.kill()
            child.wait(timeout=5)
    run_id = json.loads(ready.read_text())["run_id"]

    async def forbidden(_messages, _info):
        raise AssertionError("Restart, inspection and replay must not request a fresh judgment")

    restored = create_app(database, static_dir=tmp_path / "static")
    for name in ("openai:gpt-6-luna", "openai:gpt-6.1-sol"):
        restored.state.models.models[name] = FunctionModel(function=forbidden)
    with TestClient(restored, base_url="http://localhost") as client:
        run = client.get(f"/api/runs/{run_id}").json()
        assert (run["summary"]["status"], run["summary"]["turn"]) == ("paused", 1)
        assert run["activations"][-1]["status"] == "interrupted"
        assert run["activations"][-1]["stop_reason"] == "server_restart"
        assert len(run["requests"]) == 3
        judge = next(r for r in run["requests"] if r["purpose"] == "adjudication")
        assert judge["status"] == ("unknown" if boundary == "inflight" else "complete")
        if boundary != "inflight":
            assert run["summary"]["usage"]["cost_usd"] == 0.000330
            raw = client.get(f"/api/requests/{judge['id']}").json()
            assert raw["response"][0]["parts"][0]["args"] == RULING
        assert run["state"]["outcome"] is None
        assert run["state"]["adjudications"] == []
        assert not any(e["kind"] == "adjudication" for e in run["events"])
        assert run["state"]["artifacts"]["report"]["versions"][-1]["content"] == {
            "desk": "west",
            "closes_at": 17,
            "guidance": GUIDANCE,
        }
        usage = client.get("/api/settings").json()["usage"]
        verified = client.post(f"/api/runs/{run_id}/verify")
        assert verified.status_code == 200, verified.text
        assert verified.json()["verified_turns"] == 1 and verified.json()["model_requests"] == 0
        assert client.get("/api/settings").json()["usage"] == usage
