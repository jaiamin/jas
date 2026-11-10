"""Independent DEVELOPMENT process interrupted at declared journal boundaries."""

import json
import os
import re
import sys
from pathlib import Path

from agent_sim.api import create_app
from agent_sim.db import Analysis, ProviderCall
from agent_sim.generation_store import GenerationStore
from agent_sim.llm import LanguageModels
from fastapi.testclient import TestClient
from pydantic_ai import models
from pydantic_ai.models.function import DeltaToolCall, FunctionModel
from sqlalchemy import select

models.ALLOW_MODEL_REQUESTS = False
fault = sys.argv[3]
if fault == "recovery_event":
    append = GenerationStore.append

    def stop_recovery(self, key, kind, data):
        append(self, key, kind, data)
        if kind == "stopped" and data["stop_reason"] == "interrupted":
            os._exit(75)

    def forbidden_provider(*_args, **_kwargs):
        raise AssertionError("Recovery must not construct a provider")

    GenerationStore.append = stop_recovery
    LanguageModels.model = forbidden_provider
    create_app(f"sqlite:///{sys.argv[1]}")
    raise AssertionError("The declared recovery interruption did not happen")

app = create_app(f"sqlite:///{sys.argv[1]}")
assert fault in {"origin", "request_event"}
specification = json.loads(
    Path(__file__).with_name("t17_cosigned_escrow_contract.json").read_text()
)

with TestClient(app, base_url="http://localhost") as client:
    response = client.post("/api/extensions/contracts", json=specification)
    assert response.status_code == 201, response.text
    contract = response.json()
    assert client.post("/api/extensions/qualify").json()["status"] == "qualified"

    async def stream(messages, info):
        yield {
            0: DeltaToolCall(
                name=info.output_tools[0].name,
                json_args=json.dumps(
                    {
                        "answer": "Inspect capabilities before authorized finite synthesis.",
                        "citations": [],
                        "caveats": [],
                        "propose_experiment": False,
                        "requests": [
                            {"kind": "capabilities"},
                            {"kind": "generate_extension", "contract_id": contract["id"]},
                        ],
                    }
                ),
            )
        }

    async def candidate(messages, info):
        assert fault == "request_event", "Origin interruption must precede generation dispatch"
        from pydantic_ai.messages import ModelResponse, ToolCallPart
        from pydantic_ai.usage import RequestUsage

        return ModelResponse(
            parts=[
                ToolCallPart(
                    info.output_tools[0].name,
                    {
                        "format": "jas-extension-candidate-v1",
                        "name": "Unpublished candidate",
                        "provenance": "Independent keyless DEVELOPMENT interruption probe",
                        "source": '(module (func (export "step") '
                        '(param i32) (result i32) i32.const 4))',
                        "examples": [{"state": 24, "expected": 4}],
                    },
                )
            ],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    def provider(name):
        assert name == "openai:gpt-6.1-sol"
        return FunctionModel(function=candidate, stream_function=stream)

    app.state.models.model = provider
    mkdir = Path.mkdir
    journal_root = app.state.extensions.generations.root

    def stop(attempt_dir):
        with app.state.db.session() as session:
            analysis = session.scalars(select(Analysis).where(Analysis.status == "pending")).one()
            calls = session.scalars(
                select(ProviderCall)
                .where(ProviderCall.analysis_id == analysis.id)
                .order_by(ProviderCall.created, ProviderCall.id)
            ).all()
        Path(sys.argv[2]).write_text(
            json.dumps(
                {
                    "analysis_id": analysis.id,
                    "phase": fault,
                    "events": [
                        json.loads(p.read_text()) for p in sorted(attempt_dir.glob("*.json"))
                    ],
                    "event_bytes": {p.name: p.read_text() for p in attempt_dir.glob("*.json")},
                    "requests": [
                        {
                            "id": c.id,
                            "purpose": c.purpose,
                            "status": c.status,
                            "charged": c.charged,
                            "reserved": c.reserved,
                        }
                        for c in calls
                    ],
                }
            )
        )
        os._exit(73 if fault == "origin" else 74)

    def interrupt_origin(path, *args, **kwargs):
        mkdir(path, *args, **kwargs)
        if path.parent == journal_root and re.fullmatch(r"(?:\.pending-)?[a-f0-9]{16}", path.name):
            stop(path)

    replace = Path.replace

    def interrupt_event(self, target):
        target = Path(target)
        if (
            target.parent.parent == journal_root
            and re.fullmatch(r"[a-f0-9]{16}", target.parent.name)
            and target.name == "0001.json"
        ):
            stop(target.parent)
        return replace(self, target)

    if fault == "origin":
        Path.mkdir = interrupt_origin
    else:
        Path.replace = interrupt_event
    response = client.post(
        "/api/chats",
        json={
            "question": "Design externally reviewed escrow; interrupt before its origin commit.",
            "generation": {
                "contract_id": contract["id"],
                "max_candidates": 1,
                "max_requests": 3,
                "max_output_tokens": 4096,
                "max_input_bytes": 180000,
                "budget_usd": 1.0,
            },
        },
    )
    assert response.status_code == 202, response.text

    async def finish():
        await app.state.assistants.tasks[response.json()["id"]]

    assert client.portal is not None
    client.portal.call(finish)
    raise AssertionError("The independently declared process interruption did not happen")
