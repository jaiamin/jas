"""DEVELOPMENT: actual bounded Sol orchestration with a keyless external stand-in.

The reviewed full-domain oracle is independently authored in test_extension_generation,
not produced by this stand-in. No held-out or paid/live competence claim follows.
"""

import json
from pathlib import Path

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
                    "format": "jas-extension-candidate-v1", "name": "Sol-scripted new permit",
                    "provenance": "DEVELOPMENT external provider stand-in; not live intelligence",
                    "source": code, "examples": [{"state": 20, "expected": 4}],
                }
            if "operations_remaining" in prompt:
                operations = prompt["research"]["operations"]
                return {
                    "answer": "Prepare the explicitly authorized external-table extension."
                    if not operations else "Review the checked mechanics in a pending protocol.",
                    "citations": [], "caveats": ["Finite-table synthesis, not verified intent."],
                    "propose_experiment": bool(operations),
                    "requests": [] if operations else [
                        {"kind": "capabilities"},
                        {"kind": "generate_extension", "contract_id": contract["id"]},
                    ],
                }
            if "candidate" in prompt and "preflight" in prompt:
                return {"issues": [], "summary": "Inspect permit, refund and unsuccessful paths. "
                        "This pending finite study has not sampled participants."}
            if "brief" in prompt:
                sources = next(op["data"]["custom_environments"] for op in prompt[
                    "research_operations"]["operations"] if op["request"]["kind"] == "capabilities"
                    and op["data"].get("custom_environments"))
                source = next(s for s in sources if s["definition"]["environment"] == "reviewed_finite")
                return {"explanation": "Actual checked artifact; user still reviews protocol intent.",
                        "design": {
                            "title": "Permit DEVELOPMENT", "question": question,
                            "environment": "reviewed_finite", "environment_source": source,
                            "profiles": [
                                {"key": "grantor", "name": "Grantor", "role": "Holder", "goal": "Inspect and decide."},
                                {"key": "holder", "name": "Holder", "role": "Grantor", "goal": "Inspect and decide."},
                            ], "conditions": [{"key": "permit", "name": "Permit", "parameters": {
                                "finite": {"bindings": {"grantor": "grantor", "holder": "holder"},
                                           "private": {"grantor": {"docket": "permit-37"}}},
                            }}], "seeds": [17], "repetitions": 1, "rounds": 3,
                            "budget_usd": 0.1, "response_tokens": 4096,
                            "limitations": ["External finite table required; intent awaits human review."],
                        }}
            return {
                "supported": True, "explanation": "Use the independently checked new artifact.",
                "operationalization": "Inspect issue, revoke, reissue, redeem, wait, stop and resource histories.",
                "size_rationale": "Two distinct permission holders; six opportunities with terminal early stop. "
                "One condition and fixed seed describe a trajectory, not population inference.",
                "agents": 2, "conditions": 1, "seeds": 1, "repetitions": 1, "rounds": 3,
                "research_query": None, "requirements": [{
                    "source": "revocable single-use permit", "capability": "reviewed_finite_transitions",
                    "mapping": "direct", "explanation": "Exact external finite contract; intent remains reviewed.",
                }],
            }

        async def respond(messages, info):
            return ModelResponse(parts=[ToolCallPart(info.output_tools[0].name,
                answer(json.loads(messages[-1].parts[0].content)))],
                usage=RequestUsage(input_tokens=100, output_tokens=50))

        async def stream(messages, info):
            yield {0: DeltaToolCall(name=info.output_tools[0].name,
                                   json_args=json.dumps(answer(json.loads(messages[-1].parts[0].content))))}

        monkeypatch.setattr(app.state.models, "model", lambda name: FunctionModel(
            function=respond, stream_function=stream
        ) if name == "openai:gpt-6.1-sol" else (_ for _ in ()).throw(
            AssertionError(f"Unexpected model substitution {name}")
        ))
        authorization = {
            "contract_id": contract["id"], "max_candidates": 1, "max_requests": 6,
            "max_output_tokens": 16384, "max_input_bytes": 180000, "budget_usd": 3.0,
        }
        row = finish(client, client.post("/api/chats", json={
            "question": question, "generation": authorization,
        }))
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
        assert attempt["stop_reason"] == "admitted_pending_review"
        assert attempt["candidate"]["source"] == code  # generated artifact, not catalog selection
        assert attempt["source"] == row["output"]["design"]["environment_source"]
        assert client.get("/api/extensions/generations").json() == [attempt]
        assert all(source["hash"] for source in generated["sources"])
        assert client.get("/api/studies").json() == []
        calls = client.get(f"/api/analyses/{row['id']}/requests").json()
        assert len(calls) == 6
        assert all(c["model"] == "openai:gpt-6.1-sol" and c["status"] == "complete" and c["reserved"] > 0
                   for c in calls)
        assert sum(c["purpose"] == "extension_generation" for c in calls) == 1
        assert row["usage"]["requests"] == 6 and not row["usage"]["partial"]
        before = client.get("/api/settings").json()["usage"]
        saved = client.post("/api/studies", json={"design": row["output"]["design"], "plan_id": row["id"]})
        assert saved.status_code == 201, saved.text
        assert client.get("/api/settings").json()["usage"] == before
