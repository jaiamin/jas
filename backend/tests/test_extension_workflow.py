"""DEVELOPMENT: actual bounded Sol orchestration with a keyless external stand-in.

The reviewed full-domain oracle is independently authored in test_extension_generation,
not produced by this stand-in. No held-out or paid/live competence claim follows.
"""

import asyncio
import hashlib
import json
import subprocess
import sys
import threading
from pathlib import Path

import pytest
from agent_sim.api import create_app
from fastapi.testclient import TestClient
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.models.function import DeltaToolCall, FunctionModel
from pydantic_ai.usage import RequestUsage
from test_extension_generation import refundable_permit


def finish(client, response):
    assert response.status_code == 202, response.text
    key = response.json()["id"]

    async def done():
        await client.app.state.assistants.tasks[key]

    assert client.portal is not None
    client.portal.call(done)
    return client.get(f"/api/analyses/{key}").json()


def test_authorized_question_generates_actual_wat_then_returns_pending_reviewed_proposal(
    tmp_path, monkeypatch
):
    app = create_app(f"sqlite:///{tmp_path}/generation.sqlite3")
    code = Path(__file__).with_name("fixtures").joinpath("t17_refundable_permit.wat").read_text()
    question = "Design a study of a revocable single-use permit with escrow refund and reissue."
    prompts = []
    with TestClient(app, base_url="http://localhost") as client:
        contract = client.post("/api/extensions/contracts", json=refundable_permit()).json()
        assert client.post("/api/extensions/qualify").json()["status"] == "qualified"

        def answer(prompt):
            prompts.append(prompt)
            if "extension_generation" in prompt:
                assert prompt["contract"] == contract
                return {
                    "format": "jas-extension-candidate-v1",
                    "name": "Sol-scripted new permit",
                    "provenance": "DEVELOPMENT external provider stand-in; not live intelligence",
                    "source": code,
                    "examples": [{"state": 20, "expected": 4}],
                }
            if "operations_remaining" in prompt:
                operations = prompt["research"]["operations"]
                return {
                    "answer": "Prepare the explicitly authorized external-table extension."
                    if not operations
                    else "Review the checked mechanics in a pending protocol.",
                    "citations": [],
                    "caveats": ["Finite-table synthesis, not verified intent."],
                    "propose_experiment": bool(operations),
                    "requests": []
                    if operations
                    else [
                        {"kind": "capabilities"},
                        {"kind": "generate_extension", "contract_id": contract["id"]},
                    ],
                }
            if "candidate" in prompt and "preflight" in prompt:
                return {
                    "issues": [],
                    "summary": "Inspect permit, refund and unsuccessful paths. "
                    "This pending finite study has not sampled participants.",
                }
            if "brief" in prompt:
                sources = next(
                    op["data"]["custom_environments"]
                    for op in prompt["research_operations"]["operations"]
                    if op["request"]["kind"] == "capabilities"
                    and op["data"].get("custom_environments")
                )
                source = next(
                    s for s in sources if s["definition"]["environment"] == "reviewed_finite"
                )
                return {
                    "explanation": "Actual checked artifact; user still reviews protocol intent.",
                    "design": {
                        "title": "Permit DEVELOPMENT",
                        "question": question,
                        "environment": "reviewed_finite",
                        "environment_source": source,
                        "profiles": [
                            {
                                "key": "grantor",
                                "name": "Grantor",
                                "role": "Holder",
                                "goal": "Inspect and decide.",
                            },
                            {
                                "key": "holder",
                                "name": "Holder",
                                "role": "Grantor",
                                "goal": "Inspect and decide.",
                            },
                        ],
                        "conditions": [
                            {
                                "key": "permit",
                                "name": "Permit",
                                "parameters": {
                                    "finite": {
                                        "bindings": {"grantor": "grantor", "holder": "holder"},
                                        "private": {"grantor": {"docket": "permit-37"}},
                                    },
                                },
                            }
                        ],
                        "seeds": [17],
                        "repetitions": 1,
                        "rounds": 3,
                        "budget_usd": 0.1,
                        "response_tokens": 4096,
                        "limitations": [
                            "External finite table required; intent awaits human review."
                        ],
                    },
                }
            return {
                "supported": True,
                "explanation": "Use the independently checked new artifact.",
                "operationalization": "Inspect issue, revoke, reissue, redeem, "
                "wait, stop and resource histories.",
                "size_rationale": "Two distinct permission holders; six opportunities "
                "with terminal early stop. "
                "One condition and fixed seed describe a trajectory, not population inference.",
                "agents": 2,
                "conditions": 1,
                "seeds": 1,
                "repetitions": 1,
                "rounds": 3,
                "research_query": None,
                "requirements": [
                    {
                        "source": "revocable single-use permit",
                        "capability": "reviewed_finite_transitions",
                        "mapping": "direct",
                        "explanation": "Exact external finite contract; intent remains reviewed.",
                    }
                ],
            }

        async def respond(messages, info):
            return ModelResponse(
                parts=[
                    ToolCallPart(
                        info.output_tools[0].name, answer(json.loads(messages[-1].parts[0].content))
                    )
                ],
                usage=RequestUsage(input_tokens=100, output_tokens=50),
            )

        async def stream(messages, info):
            yield {
                0: DeltaToolCall(
                    name=info.output_tools[0].name,
                    json_args=json.dumps(answer(json.loads(messages[-1].parts[0].content))),
                )
            }

        monkeypatch.setattr(
            app.state.models,
            "model",
            lambda name: (
                FunctionModel(function=respond, stream_function=stream)
                if name == "openai:gpt-6.1-sol"
                else (_ for _ in ()).throw(AssertionError(f"Unexpected model substitution {name}"))
            ),
        )
        authorization = {
            "contract_id": contract["id"],
            "max_candidates": 1,
            "max_requests": 6,
            "max_output_tokens": 16384,
            "max_input_bytes": 180000,
            "budget_usd": 3.0,
        }
        row = finish(
            client,
            client.post(
                "/api/chats",
                json={
                    "question": question,
                    "generation": authorization,
                },
            ),
        )
        assert row["status"] == "complete", row
        assert row["purpose"] == "design" and row["output"]["supported"] is True
        assert row["output"]["design"]["question"] == question
        assert row["generation"]["authorization"] == authorization
        assert (row["generation"]["requests"], row["generation"]["candidates"]) == (6, 1)
        operations = row["output"]["research"]["operations"]
        generated = next(op for op in operations if op["request"]["kind"] == "generate_extension")
        assert generated["status"] == "complete", generated
        attempt = client.get(f"/api/extensions/generations/{generated['data']['id']}").json()
        assert attempt["contract"] == contract
        assert attempt["format"] == "jas-extension-generation-v2"
        assert len(attempt["requests"]) == 1 and attempt["requests"][0]["charged"] == 700
        assert attempt["stop_reason"] == "admitted_pending_review"
        assert attempt["candidate"]["source"] == code  # generated artifact, not catalog selection
        assert attempt["source"] == row["output"]["design"]["environment_source"]
        assert client.get("/api/extensions/generations").json() == [attempt]
        assert all(source["hash"] for source in generated["sources"])
        assert client.get("/api/studies").json() == []

        calls = client.get(f"/api/analyses/{row['id']}/requests").json()
        assert len(calls) == 6
        assert all(
            c["model"] == "openai:gpt-6.1-sol" and c["status"] == "complete" and c["reserved"] > 0
            for c in calls
        )
        assert sum(c["purpose"] == "extension_generation" for c in calls) == 1
        assert row["usage"]["requests"] == 6 and not row["usage"]["partial"]
        before = client.get("/api/settings").json()["usage"]
        saved = client.post(
            "/api/studies", json={"design": row["output"]["design"], "plan_id": row["id"]}
        )
        assert saved.status_code == 201, saved.text
        assert client.get("/api/settings").json()["usage"] == before


def test_cosigned_escrow_retains_external_failure_receipt_before_explicit_repair(
    tmp_path, monkeypatch
):
    """Frozen second DEVELOPMENT contract; a candidate cannot author its own oracle.

    The first wrong artifact really reaches the worker and fails the external table.
    Inspect its immutable request/cost receipt before releasing the provider's repair
    decision. The correct repair WAT was absent for the retained initial RED.
    """
    fixtures = Path(__file__).with_name("fixtures")
    specification = fixtures.joinpath("t17_cosigned_escrow_contract.json").read_bytes()
    assert hashlib.sha256(specification).hexdigest() == (
        "eef4d9c9c7f23e3079d8ff140284be3792dd31496dc86e30c5cef477766a4407"
    )
    question = "Study an irrevocable co-signature escrow with refundable pre-sign cancellation."
    app = create_app(f"sqlite:///{tmp_path}/cosigned.sqlite3")
    repair_requested = threading.Event()
    release_repair = asyncio.Event()
    generated = []
    with TestClient(app, base_url="http://localhost") as client:
        response = client.post("/api/extensions/contracts", json=json.loads(specification))
        assert response.status_code == 201, response.text
        contract = response.json()
        assert client.post("/api/extensions/qualify").json()["status"] == "qualified"

        async def answer(prompt):
            if "extension_generation" in prompt:
                assert prompt["contract"] == contract
                generated.append(prompt["extension_generation"])
                repair = prompt["extension_generation"]["repair_of"]
                code = (
                    fixtures.joinpath("t17_cosigned_escrow.wat").read_text()
                    if repair
                    else '(module (func (export "step") (param i32) (result i32) i32.const 4))'
                )
                return {
                    "format": "jas-extension-candidate-v1",
                    "name": "Scripted co-signature repair" if repair else "Wrong constant artifact",
                    "provenance": "Keyless DEVELOPMENT provider stand-in; "
                    "actual paid spend is zero.",
                    "source": code,
                    "examples": [{"state": 24, "expected": 4}],
                }
            if "operations_remaining" in prompt:
                operations = prompt["research"]["operations"]
                attempts = [
                    op for op in operations if op["request"]["kind"] == "generate_extension"
                ]
                if not attempts:
                    return {
                        "answer": "Inspect installed mechanics, then try "
                        "the authorized external contract.",
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
                latest = attempts[-1]
                if latest["data"]["stop_reason"] == "external_check_failed":
                    repair_requested.set()
                    await release_repair.wait()
                    return {
                        "answer": "The independent table rejected the artifact; "
                        "explicitly repair that attempt.",
                        "citations": [],
                        "caveats": ["The failed artifact remains rejected."],
                        "propose_experiment": False,
                        "requests": [
                            {
                                "kind": "generate_extension",
                                "contract_id": contract["id"],
                                "repair_of": latest["data"]["id"],
                            }
                        ],
                    }
                return {
                    "answer": "Inspect the repaired, independently checked mechanics "
                    "in a pending proposal.",
                    "citations": [],
                    "caveats": ["Finite table conformance does not establish intent."],
                    "propose_experiment": True,
                    "requests": [],
                }
            if "candidate" in prompt and "preflight" in prompt:
                return {
                    "issues": [],
                    "summary": "Inspect pre-sign refunds, the signature lock and final "
                    "release. No participant has been sampled.",
                }
            if "brief" in prompt:
                sources = next(
                    op["data"]["custom_environments"]
                    for op in prompt["research_operations"]["operations"]
                    if op["request"]["kind"] == "capabilities"
                    and op["data"].get("custom_environments")
                )
                source = next(
                    s for s in sources if s["definition"]["environment"] == "reviewed_finite"
                )
                return {
                    "explanation": "Review whether the externally specified consent lock "
                    "answers the question.",
                    "design": {
                        "title": "Co-signature DEVELOPMENT",
                        "question": question,
                        "environment": "reviewed_finite",
                        "environment_source": source,
                        "profiles": [
                            {
                                "key": "initiator",
                                "name": "Initiator",
                                "role": "No implied authority",
                                "goal": "Inspect and decide.",
                            },
                            {
                                "key": "counterparty",
                                "name": "Counterparty",
                                "role": "No implied authority",
                                "goal": "Inspect and decide.",
                            },
                        ],
                        "conditions": [
                            {
                                "key": "consent",
                                "name": "Consent",
                                "parameters": {
                                    "finite": {
                                        "bindings": {
                                            "initiator": "initiator",
                                            "counterparty": "counterparty",
                                        },
                                        "private": {"initiator": {"docket": "consent-37"}},
                                    },
                                },
                            }
                        ],
                        "seeds": [23],
                        "repetitions": 1,
                        "rounds": 2,
                        "budget_usd": 0.1,
                        "response_tokens": 4096,
                        "limitations": [
                            "Externally supplied exhaustive table; intent awaits human review."
                        ],
                    },
                }
            return {
                "supported": True,
                "explanation": "Use the actual independently checked co-signature artifact.",
                "operationalization": "Observe pre-sign cancel/veto, signature lock "
                "and initiator-only release.",
                "size_rationale": "Two explicit actors have four opportunities, "
                "with a three-step success path. "
                "One fixed seed and one trajectory do not establish population inference.",
                "agents": 2,
                "conditions": 1,
                "seeds": 1,
                "repetitions": 1,
                "rounds": 2,
                "research_query": None,
                "requirements": [
                    {
                        "source": "irrevocable co-signature escrow",
                        "capability": "reviewed_finite_transitions",
                        "mapping": "direct",
                        "explanation": "Exact external table; its fit remains "
                        "subject to human review.",
                    }
                ],
            }

        async def respond(messages, info):
            result = await answer(json.loads(messages[-1].parts[0].content))
            return ModelResponse(
                parts=[ToolCallPart(info.output_tools[0].name, result)],
                usage=RequestUsage(input_tokens=100, output_tokens=50),
            )

        async def stream(messages, info):
            result = await answer(json.loads(messages[-1].parts[0].content))
            yield {0: DeltaToolCall(name=info.output_tools[0].name, json_args=json.dumps(result))}

        def provider(name):
            assert name == "openai:gpt-6.1-sol", f"Unexpected model substitution {name}"
            return FunctionModel(function=respond, stream_function=stream)

        monkeypatch.setattr(app.state.models, "model", provider)
        response = client.post(
            "/api/chats",
            json={
                "question": question,
                "generation": {
                    "contract_id": contract["id"],
                    "max_candidates": 2,
                    "max_requests": 8,
                    "max_output_tokens": 16384,
                    "max_input_bytes": 180000,
                    "budget_usd": 3.0,
                },
            },
        )
        assert response.status_code == 202, response.text
        key = response.json()["id"]
        assert repair_requested.wait(20), client.get(f"/api/analyses/{key}").json()
        records = client.get("/api/extensions/generations").json()
        assert len(records) == 1
        failed = records[0]
        assert failed["stop_reason"] == "external_check_failed"
        assert failed["review"]["outputs"] == [4] and not failed["check"]["passed"]
        assert failed["check"]["expected"] == (contract["specification"]["table"] + [-1] * 4) * 2
        assert failed["check"]["observed"] == [4] * 368
        assert failed["admission"] is None and failed["source"] is None
        assert client.get("/api/studies").json() == []
        calls = client.get(f"/api/analyses/{key}/requests").json()
        generation_call = next(c for c in calls if c["purpose"] == "extension_generation")
        # Intended first RED: append-only attempt has no individual request/cost receipt.
        assert len(failed["requests"]) == 1
        receipt = failed["requests"][0]
        assert receipt["id"] == generation_call["id"]
        assert (
            receipt["status"],
            receipt["input_tokens"],
            receipt["output_tokens"],
            receipt["charged"],
        ) == (
            "complete",
            100,
            50,
            700,
        )
        assert receipt["model"] == "openai:gpt-6.1-sol" and receipt["reserved"] >= 700
        assert failed["format"] == "jas-extension-generation-v2"
        assert [e["data"] for e in failed["events"] if e["kind"] == "request"] == [receipt]
        frozen_failure = json.dumps(failed, sort_keys=True)

        assert client.portal is not None
        client.portal.call(release_repair.set)
        row = finish(client, response)
        assert row["status"] == "complete" and row["output"]["supported"], row
        records = client.get("/api/extensions/generations").json()
        repaired = next(record for record in records if record["id"] != failed["id"])
        assert (
            repaired["repair_of"] == failed["id"]
            and repaired["stop_reason"] == "admitted_pending_review"
        )
        assert repaired["contract"] == failed["contract"] == contract
        assert repaired["candidate"]["source"] != failed["candidate"]["source"]
        assert repaired["source"] == row["output"]["design"]["environment_source"]
        assert len(repaired["requests"]) == 1 and repaired["requests"][0]["charged"] == 700
        assert (
            json.dumps(
                client.get(f"/api/extensions/generations/{failed['id']}").json(), sort_keys=True
            )
            == frozen_failure
        )
        assert len(generated) == 2 and generated[1]["repair_of"] == failed["id"]
        assert (row["generation"]["requests"], row["generation"]["candidates"]) == (8, 2)
        assert client.get("/api/studies").json() == []
        calls = client.get(f"/api/analyses/{key}/requests").json()
        assert len(calls) == 8 and all(c["status"] == "complete" for c in calls)
        assert sum(c["charged"] for c in calls if c["purpose"] == "extension_generation") == 1400
        requests = [client.get(f"/api/requests/{call['id']}").json()["request"] for call in calls]
        for request in requests:
            assert (
                len(
                    (request["prompt"] + request["instructions"] + json.dumps(request["schema"]))
                    .encode()
                )
                + 4096
                <= 180000
            )
        reviewed = next(
            data
            for request in requests
            if "candidate" in (data := json.loads(request["prompt"])) and "preflight" in data
        )
        assert reviewed["candidate"]["design"] == row["output"]["design"]
        assert reviewed["preflight"] == row["output"]["planning"]["preflight"]
        assert reviewed["brief"]["requirements"][0]["source"] == "irrevocable co-signature escrow"
        assert any(
            repaired["source"] in operation.get("data", {}).get("custom_environments", [])
            for operation in reviewed["research_operations"]["operations"]
        )
        usage = client.get("/api/settings").json()["usage"]
        saved = client.post(
            "/api/studies", json={"design": row["output"]["design"], "plan_id": key}
        )
        assert saved.status_code == 201, saved.text
        exported = client.get(f"/api/studies/{saved.json()['id']}/export").json()
        # Next intended RED: executable failure/repair history is not exported.
        assert exported["extension_generations"] == records
        assert exported["version"] == 19
        analysis = next(a for a in exported["analyses"] if a["id"] == key)
        assert analysis["generation"] == {
            "authorization": row["generation"]["authorization"],
            "contract": contract,
            "requests": 8,
            "candidates": 2,
            "charged_microdollars": sum(c["charged"] for c in calls),
        }
        assert {c["id"] for c in exported["requests"]} == {c["id"] for c in calls}
        for request in exported["requests"]:
            retained = next(c for c in calls if c["id"] == request["id"])
            assert request["reserved"] == retained["reserved"]
            assert request["charged"] == retained["charged"]
            assert request["purpose"] == retained["purpose"]
        assert (
            sum(
                c["charged"] for c in exported["requests"] if c["purpose"] == "extension_generation"
            )
            == 1400
        )
        assert client.get("/api/settings").json()["usage"] == usage


@pytest.mark.parametrize("request_limit", [1, 2])
def test_generation_request_ceiling_and_unknown_usage_keep_failure_without_retry(
    tmp_path, monkeypatch, request_limit
):
    """Independent failure expectations; no executable candidate is returned here."""
    external = (
        Path(__file__)
        .with_name("fixtures")
        .joinpath("t17_cosigned_escrow_contract.json")
        .read_bytes()
    )
    assert hashlib.sha256(external).hexdigest() == (
        "eef4d9c9c7f23e3079d8ff140284be3792dd31496dc86e30c5cef477766a4407"
    )
    app = create_app(f"sqlite:///{tmp_path}/limits.sqlite3")
    sent = []
    with TestClient(app, base_url="http://localhost") as client:
        response = client.post("/api/extensions/contracts", json=json.loads(external))
        assert response.status_code == 201, response.text
        contract = response.json()
        assert client.post("/api/extensions/qualify").json()["status"] == "qualified"

        async def respond(messages, info):
            prompt = json.loads(messages[-1].parts[0].content)
            assert "extension_generation" in prompt
            sent.append(prompt)
            raise RuntimeError("DEVELOPMENT provider failed before reporting usage")

        async def stream(messages, info):
            prompt = json.loads(messages[-1].parts[0].content)
            assert not prompt["research"]["operations"]
            yield {
                0: DeltaToolCall(
                    name=info.output_tools[0].name,
                    json_args=json.dumps(
                        {
                            "answer": "Inspect installed mechanics "
                            "before authorized finite generation.",
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

        monkeypatch.setattr(app.state.models, "model", provider)
        row = finish(
            client,
            client.post(
                "/api/chats",
                json={
                    "question": "Generate the independently specified co-signature escrow.",
                    "generation": {
                        "contract_id": contract["id"],
                        "max_candidates": 2,
                        "max_requests": request_limit,
                        "max_output_tokens": 16384,
                        "max_input_bytes": 180000,
                        "budget_usd": 3.0,
                    },
                },
            ),
        )
        assert row["status"] == "failed"
        assert (row["generation"]["requests"], row["generation"]["candidates"]) == (
            request_limit,
            1,
        )
        calls = client.get(f"/api/analyses/{row['id']}/requests").json()
        assert len(calls) == request_limit and calls[0]["status"] == "complete"
        assert all(c["model"] == "openai:gpt-6.1-sol" for c in calls)
        attempts = client.get("/api/extensions/generations").json()
        assert len(attempts) == 1
        attempt = attempts[0]
        assert attempt["stop_reason"] == "provider_failure"
        assert attempt["candidate"] is None and attempt["review"] is None
        assert (
            attempt["check"] is None and attempt["admission"] is None and attempt["source"] is None
        )
        if request_limit == 1:
            assert sent == [] and attempt["requests"] == []
            assert "allowance reached" in row["error"]
            assert row["usage"]["partial"] is False
        else:
            assert len(sent) == 1
            request = calls[1]
            assert request["purpose"] == "extension_generation"
            assert request["status"] == "unknown" and request["error"] == "RuntimeError"
            assert request["reserved"] > 0 and request["charged"] == request["reserved"]
            assert (request["input_tokens"], request["output_tokens"]) == (0, 0)
            assert len(attempt["requests"]) == 1
            assert attempt["requests"][0]["charged"] == request["reserved"]
            assert attempt["requests"][0]["error"] == "RuntimeError"
            assert row["usage"]["partial"] is True
            assert "RuntimeError" in row["error"]
        assert round(row["generation"]["charged_usd"] * 1_000_000) == sum(
            c["charged"] for c in calls
        )
        assert client.get("/api/studies").json() == []


@pytest.mark.parametrize("shutdown", ["abrupt", "graceful"])
def test_restart_closes_unfinished_generation_and_retains_unknown_reservation(
    tmp_path, monkeypatch, shutdown
):
    """A real abrupt process exit must not leave public generation activity running."""
    from agent_sim.llm import LanguageModels

    database = tmp_path / "interrupted.sqlite3"
    receipt = tmp_path / "crash-receipt.json"
    result = subprocess.run(
        [
            sys.executable,
            "-B",
            str(Path(__file__).with_name("fixtures") / "t17_generation_crash.py"),
            str(database),
            str(receipt),
            shutdown,
        ],
        capture_output=True,
        text=True,
        timeout=35,
    )
    tmp_path.joinpath("child-stdout.log").write_text(result.stdout)
    tmp_path.joinpath("child-stderr.log").write_text(result.stderr)
    assert result.returncode == 0, result.stdout + result.stderr
    before = json.loads(receipt.read_text())
    key = before["analysis_id"]

    def no_provider(_self, _name):
        raise AssertionError("Restart must construct no provider or sample again")

    monkeypatch.setattr(LanguageModels, "model", no_provider)
    with TestClient(create_app(f"sqlite:///{database}"), base_url="http://localhost") as client:
        row = client.get(f"/api/analyses/{key}").json()
        assert row["status"] == "failed"
        assert row["error"] == (
            "Server stopped. Request was not automatically retried."
            if shutdown == "abrupt"
            else "Request interrupted."
        )
        calls = client.get(f"/api/analyses/{key}/requests").json()
        assert len(calls) == 2 and (
            row["generation"]["requests"],
            row["generation"]["candidates"],
        ) == (2, 1)
        request = calls[1]
        assert request["id"] == before["calls"][1]["id"]
        assert request["status"] == "unknown" and request["charged"] == request["reserved"] > 0
        assert request["error"] == (
            "Server stopped; reserved cost retained." if shutdown == "abrupt" else "CancelledError"
        )
        assert request["charged"] == before["calls"][1]["charged"]
        assert (request["input_tokens"], request["output_tokens"]) == (0, 0)
        attempt = client.get(f"/api/extensions/generations/{before['attempt']['id']}").json()
        # Intended RED: the server task is gone but this public journal is still in_progress.
        assert attempt["stop_reason"] == "interrupted"
        assert attempt["events"][: len(before["attempt"]["events"])] == before["attempt"]["events"]
        assert len(attempt["events"]) == len(before["attempt"]["events"]) + 2
        assert len(attempt["requests"]) == 1
        assert attempt["requests"][0]["id"] == request["id"]
        assert attempt["requests"][0]["status"] == "unknown"
        assert attempt["requests"][0]["charged"] == request["reserved"]
        assert attempt["candidate"] is None and attempt["source"] is None
        operation = next(
            op
            for op in row["output"]["research"]["operations"]
            if op["request"]["kind"] == "generate_extension"
        )
        assert operation["status"] == "failed" and operation["data"]["stop_reason"] == "interrupted"
        source = next(s for s in operation["sources"] if s["kind"] == "extension_generation")
        assert source["hash"] == attempt["sha256"]
        assert row["usage"]["partial"] and row["usage"]["requests"] == 2
        assert round(row["generation"]["charged_usd"] * 1_000_000) == sum(
            c["charged"] for c in calls
        )
        assert client.get("/api/studies").json() == []
        usage = client.get("/api/settings").json()["usage"]
    with TestClient(create_app(f"sqlite:///{database}"), base_url="http://localhost") as client:
        assert client.get(f"/api/extensions/generations/{attempt['id']}").json() == attempt
        assert client.get(f"/api/analyses/{key}/requests").json() == calls
        assert client.get("/api/settings").json()["usage"] == usage
