"""Keyless crash fixture for the public T11 restoration workflow."""

import asyncio
import json
import sys
import time
from pathlib import Path

from agent_sim.api import create_app
from fastapi.testclient import TestClient
from pydantic_ai import models
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.models.function import FunctionModel
from pydantic_ai.usage import RequestUsage

from benchmarks.provider_fixtures import output_args

models.ALLOW_MODEL_REQUESTS = False
app = create_app(sys.argv[1], static_dir=Path(sys.argv[2]).parent / "static")
requests = 0


async def respond(messages, info):
    global requests
    requests += 1
    if requests == 7:
        await asyncio.to_thread(Path(sys.argv[3]).write_text, json.dumps({"run_id": rid}))
        await asyncio.Event().wait()
    observation = json.loads(messages[-1].parts[0].content)
    actor, tick = observation["you"]["key"], observation["logical_time"]
    action = {"kind": "wait_coordination"}
    if tick == 0 and actor == "oak-7":
        action = {"kind": "make_commitment", "opportunity": "alpha"}
    if tick == 0 and actor == "ash-9":
        action = {"kind": "send_message", "recipient": "bay-4", "text": "private-queued-41"}
    if tick == 1 and actor == "fen-2":
        action = {"kind": "rely_on_commitment", "opportunity": "alpha"}
    return ModelResponse(
        parts=[
            ToolCallPart(
                info.output_tools[0].name,
                output_args(
                    info,
                    {
                        "action": action,
                        "rationale": "Synthetic restoration witness.",
                        "memory": "retained note",
                        "forecast": None,
                    },
                ),
            )
        ],
        usage=RequestUsage(input_tokens=100, output_tokens=50),
    )


app.state.models.models["openai:gpt-6-luna"] = FunctionModel(function=respond)
with TestClient(app, base_url="http://localhost") as client:
    created = client.post(
        "/api/studies", json={"design": json.loads(Path(sys.argv[2]).read_text())}
    )
    assert created.status_code == 201, created.text
    rid = client.get("/api/studies/" + created.json()["id"]).json()["runs"][0]["id"]
    assert client.post(f"/api/runs/{rid}/control", json={"action": "start"}).status_code == 200
    while True:
        time.sleep(0.02)
