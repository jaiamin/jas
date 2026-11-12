"""Public-HTTP DEVELOPMENT regression for declared fallible adjudication.

The scripted Sol identity is not live adjudicator authorization or an accuracy
measurement. Literal oracles were frozen before implementation; their development
record is summarized in docs/research/RESEARCH_HARNESS_COMPACT_REPORT.md.
Only the external provider boundary is replaced; workflow assertions use HTTP.
"""

import json
import time

from agent_sim.api import create_app
from fastapi.testclient import TestClient
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.models.function import FunctionModel
from pydantic_ai.usage import RequestUsage

from benchmarks.provider_fixtures import output_args

GUIDANCE = (
    "Collect the reserved book at the west desk before 17:00. If you cannot get there "
    "in time, ask the library about another pickup date; availability is not confirmed."
)
ADJUDICATOR = {
    "version": "1.0.0",
    "model": "openai:gpt-6.1-sol",
    "openai_reasoning_effort": "low",
    "response_tokens": 512,
}
SCOPE = {
    "mechanism": "pickup_note_actionability",
    "version": "1.0.0",
    "artifact": "report",
    "field": "guidance",
    "evidence": [{"artifact": "pickup", "version": 1, "fields": ["desk", "closes_at"]}],
}
INPUTS = {
    "mechanism": "pickup_note_actionability",
    "version": "1.0.0",
    "artifact": "report",
    "artifact_version": 2,
    "content": {"desk": "west", "closes_at": 17, "guidance": GUIDANCE},
    "evidence": [
        {"artifact": "pickup", "version": 1, "content": {"desk": "west", "closes_at": 17}}
    ],
}
RULING = {
    "verdict": "accept",
    "explanation": "The note gives a pickup action and qualifies its suggested fallback.",
    "facts": [
        {"artifact": "pickup", "version": 1, "field": "desk", "value": "west"},
        {"artifact": "pickup", "version": 1, "field": "closes_at", "value": 17},
    ],
}


def protocol():
    return {
        "title": "A fallible review of a pickup note",
        "question": "Does the author produce actionable guidance under a declared fallible rubric?",
        "environment": "artifact_workspace",
        "profiles": [{"key": "author", "name": "Author", "goal": "T18_PRIVATE_GOAL_18131"}],
        "seeds": [18131],
        "rounds": 2,
        "budget_usd": 1,
        "response_tokens": 512,
        "openai_reasoning_effort": "low",
        "measures": ["artifact_success"],
        "conditions": [
            {
                "key": "judged",
                "name": "Declared fallible judgment",
                "model": "openai:gpt-6-luna",
                "harness": {"kind": "direct_action", "version": "1.0.0"},
                "adjudicator": dict(ADJUDICATOR),
                "parameters": {
                    "artifacts": {
                        "write_limit": 1,
                        "judgment": json.loads(json.dumps(SCOPE)),
                        "objects": [
                            {
                                "key": "pickup",
                                "name": "Confirmed pickup facts",
                                "readers": ["author"],
                                "content": {"desk": "west", "closes_at": 17},
                            },
                            {
                                "key": "report",
                                "name": "Pickup guidance",
                                "owner": "author",
                                "content": {"desk": "", "closes_at": 0, "guidance": ""},
                            },
                            {
                                "key": "sealed",
                                "name": "Unrelated private catalog",
                                "content": {"catalog_note": "T18_PRIVATE_CATALOG_18131"},
                            },
                        ],
                        "requirements": [
                            {
                                "artifact": "report",
                                "field": "desk",
                                "source": "pickup",
                                "source_field": "desk",
                            },
                            {
                                "artifact": "report",
                                "field": "closes_at",
                                "source": "pickup",
                                "source_field": "closes_at",
                            },
                        ],
                    }
                },
            }
        ],
    }


def finished(client, run_id):
    deadline = time.monotonic() + 8
    while time.monotonic() < deadline:
        response = client.get(f"/api/runs/{run_id}")
        assert response.status_code == 200, response.text
        value = response.json()
        if value["summary"]["status"] not in {"running", "queued", "pausing"}:
            return value
        time.sleep(0.005)
    raise AssertionError("The adjudicated submission did not reach a committed boundary")


def test_declared_judgment_is_recorded_enforced_and_replayed_without_sampling(tmp_path):
    actions = iter(
        [
            {
                "kind": "write_artifact",
                "artifact": "report",
                "expected_version": 1,
                "content": {"desk": "west", "closes_at": 17, "guidance": GUIDANCE},
                "sources": [{"artifact": "pickup", "version": 1}],
            },
            {"kind": "submit_artifacts"},
        ]
    )
    participant_inputs, judge_inputs = [], []

    async def participant_response(messages, info):
        participant_inputs.append(json.loads(messages[-1].parts[0].content))
        return ModelResponse(
            parts=[
                ToolCallPart(
                    info.output_tools[0].name,
                    output_args(
                        info,
                        {
                            "action": next(actions),
                            "rationale": "An explicit development action, not a competence result.",
                            "memory": "",
                            "forecast": None,
                        },
                    ),
                )
            ],
            usage=RequestUsage(input_tokens=101, output_tokens=37),
        )

    async def judge_response(messages, info):
        judge_inputs.append(json.loads(messages[-1].parts[0].content))
        return ModelResponse(
            parts=[
                ToolCallPart(
                    info.output_tools[0].name, output_args(info, json.loads(json.dumps(RULING)))
                )
            ],
            usage=RequestUsage(input_tokens=41, output_tokens=19),
        )

    database = f"sqlite:///{tmp_path}/t18.sqlite3"
    app = create_app(database, static_dir=tmp_path / "static")
    app.state.models.models["openai:gpt-6-luna"] = FunctionModel(function=participant_response)
    app.state.models.models["openai:gpt-6.1-sol"] = FunctionModel(function=judge_response)
    with TestClient(app, base_url="http://localhost") as client:
        validated = client.post("/api/design/validate", json={"design": protocol()})
        assert validated.status_code == 200, validated.text
        design = validated.json()
        assert design["conditions"][0]["adjudicator"] == ADJUDICATOR
        assert design["conditions"][0]["parameters"]["artifacts"]["judgment"] == SCOPE
        review = client.post("/api/design/preflight", json={"design": design})
        assert review.status_code == 200, review.text
        assert review.json()["status"] in {"checked", "review"}
        created = client.post("/api/studies", json={"design": design})
        assert created.status_code == 201, created.text
        study_id = created.json()["id"]
        study = client.get(f"/api/studies/{study_id}").json()
        assert study["design"] == design
        run_id = study["runs"][0]["id"]
        assert client.get("/api/settings").json()["usage"]["requests"] == 0
        assert participant_inputs == judge_inputs == []

        started = client.post(f"/api/runs/{run_id}/control", json={"action": "start"})
        assert started.status_code == 200, started.text
        run = finished(client, run_id)
        assert (run["summary"]["status"], run["summary"]["turn"]) == ("complete", 2), run
        assert run["state"]["outcome"]["status"] == "success"
        assert run["metrics"]["artifact_success"] == 1
        assert run["state"]["writes_remaining"] == 0
        assert [v["content"] for v in run["state"]["artifacts"]["report"]["versions"]] == [
            {"desk": "", "closes_at": 0, "guidance": ""},
            {"desk": "west", "closes_at": 17, "guidance": GUIDANCE},
        ]
        assert run["state"]["artifacts"]["pickup"]["versions"][0]["content"] == {
            "desk": "west",
            "closes_at": 17,
        }
        assert judge_inputs == [INPUTS]
        assert len(participant_inputs) == 2
        assert "T18_PRIVATE_CATALOG_18131" not in json.dumps(participant_inputs)
        assert "sealed" not in json.dumps(participant_inputs)
        assert "T18_PRIVATE_CATALOG_18131" not in json.dumps(judge_inputs)
        assert "T18_PRIVATE_GOAL_18131" not in json.dumps(judge_inputs)

        events = [e for e in run["events"] if e["kind"] == "adjudication"]
        assert len(events) == 1
        receipt = events[0]["data"]
        assert receipt["mechanism"] == "pickup_note_actionability"
        assert receipt["version"] == "1.0.0"
        assert receipt["adjudicator"] == ADJUDICATOR
        assert receipt["inputs"] == INPUTS
        assert receipt["ruling"] == RULING
        assert receipt["consequence"] == {
            "applied": True,
            "submission_status": "success",
            "hard_facts_passed": True,
        }
        assert events[0]["visibility"] == "researcher"
        judge_call = next(r for r in run["requests"] if r["id"] == receipt["request_id"])
        assert (judge_call["purpose"], judge_call["model"], judge_call["status"]) == (
            "adjudication",
            "openai:gpt-6.1-sol",
            "complete",
        )
        assert judge_call["activation_id"] is None
        assert run["summary"]["usage"] == {
            "requests": 3,
            "input_tokens": 243,
            "output_tokens": 93,
            "cost_usd": 0.000330,
            "partial": False,
        }
        assert run["effort"]["usage"]["requests"] == 2
        assert run["effort"]["usage"]["cost_usd"] == 0.000058
        request = client.get(f"/api/requests/{receipt['request_id']}").json()
        assert request["purpose"] == "adjudication"
        assert json.loads(request["request"]["prompt"]) == INPUTS
        assert request["request"]["settings"]["max_tokens"] == 512
        terminal = client.get(f"/api/runs/{run_id}/turns/2").json()
        assert terminal["checkpoint"] == run["state"]
        recorded = next(e for e in terminal["events"] if e["kind"] == "adjudication")
        assert recorded["data"] == receipt
        exported = client.get(f"/api/studies/{study_id}/export").json()
        assert exported["revisions"][0]["design"] == design
        assert len(exported["requests"]) == 3
        assert (
            next(r for r in exported["requests"] if r["id"] == receipt["request_id"])["purpose"]
            == "adjudication"
        )
        assert exported["runs"][0]["evidence"][-1] == terminal
        usage = client.get("/api/settings").json()["usage"]

    async def forbidden_response(_messages, _info):
        raise AssertionError("Restoration and replay must consume the recorded ruling")

    restored = create_app(database, static_dir=tmp_path / "static")
    for model in ("openai:gpt-6-luna", "openai:gpt-6.1-sol"):
        restored.state.models.models[model] = FunctionModel(function=forbidden_response)
    with TestClient(restored, base_url="http://localhost") as client:
        before = client.get(f"/api/runs/{run_id}").json()
        assert before["state"] == run["state"]
        assert before["events"] == run["events"]
        assert before["requests"] == run["requests"]
        verified = client.post(f"/api/runs/{run_id}/verify")
        assert verified.status_code == 200, verified.text
        assert verified.json()["verified_turns"] == 2
        assert verified.json()["model_requests"] == 0
        assert client.get(f"/api/runs/{run_id}").json()["state"] == run["state"]
        assert client.get("/api/settings").json()["usage"] == usage
        assert len(participant_inputs) == 2 and len(judge_inputs) == 1
