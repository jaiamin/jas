"""Independent public lifecycle probes; keyless DEVELOPMENT, no model competence claim."""

import asyncio
import json
import os
import subprocess
import sys
import threading
from pathlib import Path

import pytest
from agent_sim.api import create_app
from agent_sim.llm import LanguageModels
from fastapi.testclient import TestClient
from pydantic_ai.models.function import DeltaToolCall, FunctionModel


@pytest.mark.parametrize(
    "fault,code,count,candidates",
    [("origin", 73, 1, 0), ("request_event", 74, 2, 1), ("recovery", 74, 2, 1)],
)
def test_interrupted_generation_origin_cannot_prevent_workspace_restart(
    tmp_path, monkeypatch, fault, code, count, candidates
):
    database = tmp_path / "origin.sqlite3"
    boundary = tmp_path / "origin-boundary.json"
    first_fault = "request_event" if fault == "recovery" else fault
    process = subprocess.run(
        [
            sys.executable,
            "-B",
            str(Path(__file__).with_name("fixtures") / "generation_origin_crash.py"),
            str(database),
            str(boundary),
            first_fault,
        ],
        env={
            **os.environ,
            "PYTHONDONTWRITEBYTECODE": "1",
            "OPENAI_API_KEY": "",
            "ANTHROPIC_API_KEY": "",
        },
        capture_output=True,
        text=True,
        timeout=40,
    )
    assert process.returncode == code, process.stdout + process.stderr
    observed = json.loads(boundary.read_text())
    assert observed["phase"] == first_fault
    assert len(observed["requests"]) == count
    assert all(c["status"] == "complete" for c in observed["requests"])
    assert observed["requests"][0]["purpose"] != "extension_generation"

    if fault == "recovery":
        interrupted = subprocess.run(
            [
                sys.executable,
                "-B",
                str(Path(__file__).with_name("fixtures") / "generation_origin_crash.py"),
                str(database),
                str(boundary),
                "recovery_event",
            ],
            env={
                **os.environ,
                "PYTHONDONTWRITEBYTECODE": "1",
                "OPENAI_API_KEY": "",
                "ANTHROPIC_API_KEY": "",
            },
            capture_output=True,
            text=True,
            timeout=40,
        )
        assert interrupted.returncode == 75, interrupted.stdout + interrupted.stderr

    def forbidden_provider(*_args, **_kwargs):
        raise AssertionError("Restart must not construct a provider")

    monkeypatch.setattr(LanguageModels, "model", forbidden_provider)
    recovered = None
    recovered_row = None
    for _ in range(2):
        app = create_app(f"sqlite:///{database}")
        with TestClient(app, base_url="http://localhost") as client:
            row = client.get(f"/api/analyses/{observed['analysis_id']}").json()
            assert row["status"] == "failed" and "Server stopped" in row["error"]
            assert row["generation"]["candidates"] == candidates
            attempts = client.get("/api/extensions/generations").json()
            if fault == "origin":
                assert attempts == []
            else:
                assert len(attempts) == 1
                attempt = attempts[0]
                assert attempt["stop_reason"] == "interrupted"
                assert attempt["events"][: len(observed["events"])] == observed["events"]
                assert len(attempt["events"]) == len(observed["events"]) + 2
                directory = app.state.extensions.generations.root / attempt["id"]
                assert all(
                    (directory / name).read_text() == text
                    for name, text in observed["event_bytes"].items()
                )
                assert attempt["candidate"] is None
                assert len(attempt["requests"]) == 1
                assert attempt["requests"][0]["id"] == observed["requests"][1]["id"]
                assert attempt["requests"][0]["charged"] == 700
                operation = next(
                    item
                    for item in row["output"]["research"]["operations"]
                    if item["request"]["kind"] == "generate_extension"
                )
                assert operation["status"] == "failed"
                assert operation["data"]["stop_reason"] == "interrupted"
                source = next(
                    item for item in operation["sources"] if item["kind"] == "extension_generation"
                )
                assert source["hash"] == attempt["sha256"]
            if recovered is not None:
                assert attempts == recovered
                assert row == recovered_row
            recovered = attempts
            recovered_row = row
            calls = client.get(f"/api/analyses/{observed['analysis_id']}/requests").json()
            assert [
                {key: call[key] for key in ("id", "purpose", "status", "charged", "reserved")}
                for call in calls
            ] == observed["requests"]
            usage = client.get("/api/settings").json()["usage"]
            assert usage["requests"] == count and not usage["partial"]


def test_pending_generation_cannot_be_attached_to_a_study_or_expand_its_export(
    tmp_path, monkeypatch, design
):
    """Exercise supported HTTP provenance boundaries while a real call is pending."""
    app = create_app(f"sqlite:///{tmp_path}/pending.sqlite3")
    pending = threading.Event()
    received = []
    with TestClient(app, base_url="http://localhost") as client:
        saved = client.post("/api/studies", json={"design": design.model_dump()})
        assert saved.status_code == 201, saved.text
        sid = saved.json()["id"]
        exported = client.get(f"/api/studies/{sid}/export").json()
        specification = json.loads(
            Path(__file__)
            .with_name("fixtures")
            .joinpath("t17_cosigned_escrow_contract.json")
            .read_text()
        )
        frozen = client.post("/api/extensions/contracts", json=specification)
        assert frozen.status_code == 201, frozen.text
        contract = frozen.json()
        assert client.post("/api/extensions/qualify").json()["status"] == "qualified"

        async def research(messages, info):
            received.append(messages)
            yield {
                0: DeltaToolCall(
                    name=info.output_tools[0].name,
                    json_args=json.dumps(
                        {
                            "answer": "Inspect capabilities and generate only "
                            "the authorized finite contract.",
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

        async def generation(messages, _info):
            received.append(messages)
            pending.set()
            await asyncio.Event().wait()

        monkeypatch.setattr(
            app.state.models,
            "model",
            lambda _: FunctionModel(function=generation, stream_function=research),
        )
        authorization = {
            "contract_id": contract["id"],
            "max_candidates": 1,
            "max_requests": 3,
            "max_output_tokens": 4096,
            "max_input_bytes": 180000,
            "budget_usd": 1.0,
        }
        started = client.post(
            "/api/chats",
            json={
                "question": "Generate the explicitly authorized finite escrow.",
                "generation": authorization,
            },
        )
        assert started.status_code == 202, started.text
        assert pending.wait(20), client.get(f"/api/analyses/{started.json()['id']}").text
        key = started.json()["id"]
        usage = client.get("/api/settings").json()["usage"]
        assert usage["requests"] == len(received) == 2
        assert client.get(f"/api/analyses/{key}").json()["status"] == "pending"
        rejected = client.post(
            "/api/studies",
            json={
                "design": design.model_dump(),
                "plan_id": key,
            },
        )
        assert rejected.status_code == 422
        assert rejected.json() == {"detail": "Choose a completed, supported AI design"}
        scoped = client.post(
            "/api/chats",
            json={
                "question": "Generate in the existing study.",
                "context": f"study:{sid}",
                "generation": authorization,
            },
        )
        assert scoped.status_code == 422
        assert scoped.json() == {
            "detail": "Extension generation requires an unscoped question or proposal"
        }
        assert client.get(f"/api/studies/{sid}/export").json() == exported
        assert (
            exported["extension_generations"] == exported["requests"] == exported["analyses"] == []
        )
        assert client.get("/api/settings").json()["usage"] == usage
        assert len(received) == 2
