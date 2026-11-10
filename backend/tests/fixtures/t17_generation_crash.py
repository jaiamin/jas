"""Own DEVELOPMENT process: leave a real reserved generation request unfinished.

No server socket/provider request is used. os._exit deliberately tests crash
recovery rather than the already supported graceful cancellation path.
"""

import asyncio
import hashlib
import json
import os
import sys
import threading
from pathlib import Path

from agent_sim.api import create_app
from fastapi.testclient import TestClient
from pydantic_ai import models
from pydantic_ai.models.function import DeltaToolCall, FunctionModel

models.ALLOW_MODEL_REQUESTS = False
external = Path(__file__).with_name("t17_cosigned_escrow_contract.json").read_bytes()
assert hashlib.sha256(external).hexdigest() == (
    "eef4d9c9c7f23e3079d8ff140284be3792dd31496dc86e30c5cef477766a4407"
)
app = create_app(f"sqlite:///{sys.argv[1]}")
ready = threading.Event()
mode = sys.argv[3]
assert mode in {"abrupt", "graceful"}

with TestClient(app, base_url="http://localhost") as client:
    response = client.post("/api/extensions/contracts", json=json.loads(external))
    assert response.status_code == 201, response.text
    contract = response.json()
    assert client.post("/api/extensions/qualify").json()["status"] == "qualified"

    async def respond(messages, info):
        prompt = json.loads(messages[-1].parts[0].content)
        assert "extension_generation" in prompt
        ready.set()
        await asyncio.Event().wait()
        raise AssertionError("The deliberate crash must precede any candidate output")

    async def stream(messages, info):
        yield {
            0: DeltaToolCall(
                name=info.output_tools[0].name,
                json_args=json.dumps(
                    {
                        "answer": "Inspect mechanics, then attempt "
                        "the explicitly authorized contract.",
                        "citations": [],
                        "caveats": [],
                        "propose_experiment": False,
                        "requests": [
                            {"kind": "capabilities"},
                            {
                                "kind": "generate_extension",
                                "contract_id": contract["id"],
                            },
                        ],
                    }
                ),
            )
        }

    def provider(name):
        assert name == "openai:gpt-6.1-sol", f"Unexpected model substitution {name}"
        return FunctionModel(function=respond, stream_function=stream)

    app.state.models.model = provider
    response = client.post(
        "/api/chats",
        json={
            "question": "Attempt co-signature escrow, preserving an interrupted request.",
            "generation": {
                "contract_id": contract["id"],
                "max_candidates": 2,
                "max_requests": 3,
                "max_output_tokens": 16384,
                "max_input_bytes": 180000,
                "budget_usd": 3.0,
            },
        },
    )
    assert response.status_code == 202, response.text
    assert ready.wait(20)
    key = response.json()["id"]
    calls = client.get(f"/api/analyses/{key}/requests").json()
    attempts = client.get("/api/extensions/generations").json()
    assert len(calls) == 2 and calls[1]["status"] == "pending"
    assert len(attempts) == 1 and attempts[0]["stop_reason"] == "in_progress"
    with Path(sys.argv[2]).open("x") as output:
        json.dump({"analysis_id": key, "calls": calls, "attempt": attempts[0]}, output)
    print(f"DEVELOPMENT {mode} shutdown boundary retained", flush=True)
    if mode == "abrupt":
        os._exit(0)
