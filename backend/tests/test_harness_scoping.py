"""Harness capability discovery and bounded review of unsupported experiment scopes."""

import copy
import json

import pytest
from agent_sim.api import create_app
from fastapi.testclient import TestClient
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.models.function import FunctionModel
from pydantic_ai.usage import RequestUsage

from backend.tests.test_participant_harnesses import wait_finished
from backend.tests.test_researcher_designs import artifact_design, finish, provider, scope
from benchmarks.provider_fixtures import output_args


@pytest.mark.parametrize(
    "question",
    [
        "Create an experiment for the following: When a checkout outage makes scaling look "
        "like the obvious fix, does tool access help an agent choose the right response or "
        "recognize when it needs more evidence, under the same model and budget?",
        "Create an experiment: does tool access help an agent evaluate conflicting compliance "
        "documents and recognize missing evidence, under the same model and budget?",
    ],
)
def test_harness_comparison_recovers_an_invented_external_tool_requirement(
    tmp_path, monkeypatch, question
):
    app = create_app(f"sqlite:///{tmp_path}/harness.sqlite3")
    with TestClient(app, base_url="http://localhost") as client:
        design = artifact_design(client)
        design.update(question=question, seeds=[23], budget_usd=3)
        baseline = design["conditions"][0]
        baseline.update(key="direct", name="Direct action", harness={"kind": "direct_action"})
        tool = copy.deepcopy(baseline)
        tool.update(
            key="tool",
            name="Tool using",
            harness={
                "kind": "tool_using",
                "tools": ["observe", "read_artifact"],
                "max_requests": 4,
                "max_tool_operations": 3,
            },
        )
        design["conditions"] = [baseline, tool]
        design["limitations"] = [
            "Prewritten synthetic evidence, not an operational service simulator. Both arms can "
            "read authorized artifacts; tool using adds reads within an activation. The budget "
            "is shared by the whole experiment, not separately enforced equal per-arm caps."
        ]
        scopes = []

        def brief(prompt):
            scopes.append(prompt)
            if len(scopes) == 1:
                # Replay the observed rejection: it adds live queries to 'tool access'.
                return scope(
                    design,
                    supported=False,
                    requirements=[
                        {
                            "source": "tool access",
                            "capability": "unavailable",
                            "mapping": "missing",
                            "explanation": "No World implements executable service queries.",
                        }
                    ],
                )
            assert prompt["scope_feedback"]["issues"]
            harnesses = prompt["research_operations"]["participant_harnesses"]
            schema = harnesses["configuration_schema"]["$defs"]
            assert schema["DirectActionHarness"]["properties"]["max_requests"]["const"] == 1
            assert (
                "read_artifact"
                in schema["ToolUsingHarness"]["properties"]["tools"]["items"]["enum"]
            )
            return scope(
                design,
                requirements=[
                    {
                        "source": "tool access",
                        "capability": "versioned_artifacts",
                        "mapping": "direct",
                        "explanation": "Authorized evidence retrieval through installed harnesses.",
                    }
                ],
            )

        calls = provider(client, monkeypatch, design, brief=brief)
        result = finish(
            client, client.post("/api/chats", json={"question": question, "context": "new"})
        )
        assert result["status"] == "complete", result["error"]
        assert result["output"]["supported"] is True, result["output"]["explanation"]
        assert len(scopes) == 2
        proposal = result["output"]["design"]
        direct, tools = proposal["conditions"]
        assert proposal["question"] == question
        assert proposal["budget_usd"] == 3
        assert direct["model"] == tools["model"] == "openai:gpt-6-luna"
        assert direct["parameters"] == tools["parameters"]
        assert direct["harness"]["kind"] == "direct_action"
        assert tools["harness"]["kind"] == "tool_using"
        assert len(calls) == result["usage"]["requests"] == 4
        assert result["output"]["planning"]["reviews"][0]["kind"] == "scope_validation"
        assert client.get("/api/studies").json() == []

        saved = client.post("/api/studies", json={"design": proposal, "plan_id": result["id"]})
        assert saved.status_code == 201, saved.text
        study = client.get(f"/api/studies/{saved.json()['id']}").json()
        delivered = []

        async def participant(messages, info):
            prompt = json.loads(messages[-1].parts[0].content)
            delivered.append(prompt)
            wrapped = "operations" in prompt
            operations = prompt.get("operations", [])
            if wrapped and not operations:
                value = {"operation": "observe", "read": None, "decision": None}
            else:
                observation = operations[0]["result"] if wrapped else prompt
                report = next(a for a in observation["artifacts"] if a["key"] == "folio")
                reads = [op["result"] for op in operations if op["kind"] == "read_artifact"]
                receipt = reads[-1] if reads else observation["last_result"]
                if report["version"] > 1:
                    action = {"kind": "submit_artifacts"}
                elif receipt is not None and "content" in receipt:
                    action = {
                        "kind": "write_artifact",
                        "artifact": "folio",
                        "expected_version": 1,
                        "content": {**receipt["content"], "recommendation": "roll_back"},
                        "sources": [{"artifact": "amber", "version": 1}],
                    }
                else:
                    action = {"kind": "read_artifact", "artifact": "amber", "version": 1}
                decision = {
                    "action": action,
                    "rationale": "Deterministic interface witness.",
                    "memory": "",
                    "forecast": None,
                }
                value = (
                    {"operation": "read_artifact", "read": action, "decision": None}
                    if wrapped and action["kind"] == "read_artifact"
                    else {"operation": "decide", "read": None, "decision": decision}
                    if wrapped
                    else decision
                )
            return ModelResponse(
                parts=[ToolCallPart(info.output_tools[0].name, output_args(info, value))],
                usage=RequestUsage(input_tokens=100, output_tokens=50),
            )

        monkeypatch.setattr(
            app.state.models, "model", lambda _: FunctionModel(function=participant)
        )
        completed = {}
        for run in study["runs"]:
            rid = run["id"]
            assert client.post(f"/api/runs/{rid}/control", json={"action": "start"}).is_success
            final = wait_finished(client, rid)
            assert final["summary"]["status"] == "complete", final["summary"]
            assert final["state"]["outcome"]["status"] == "success"
            assert final["state"]["artifacts"]["folio"]["versions"][-1]["content"] == {
                "reading": 63,
                "recommendation": "roll_back",
            }
            assert (
                client.post(f"/api/runs/{rid}/verify").json()["verified_turns"]
                == final["summary"]["turn"]
            )
            completed[run["condition_key"]] = final
        assert completed["direct"]["summary"]["turn"] == 3
        assert completed["tool"]["summary"]["turn"] == 2
        assert completed["direct"]["summary"]["usage"]["requests"] == 3
        assert completed["tool"]["summary"]["usage"]["requests"] == 5
        assert '"reading": 904' not in json.dumps(delivered)  # Private vault never delivered.


@pytest.mark.parametrize(
    "clarification", [None, "Do you mean simulated records or live service access?"]
)
def test_scope_review_preserves_real_external_limits_and_permission_clarification(
    tmp_path, monkeypatch, clarification
):
    app = create_app(f"sqlite:///{tmp_path}/external.sqlite3")
    with TestClient(app, base_url="http://localhost") as client:
        design = artifact_design(client)
        question = "Create a study where agents execute commands against a checkout service."
        scopes = []

        def brief(prompt):
            scopes.append(prompt)
            return scope(
                design,
                supported=False,
                clarification=clarification,
                explanation="Live service integrations are unavailable.",
                requirements=[
                    {
                        "source": "execute commands",
                        "capability": "unavailable",
                        "mapping": "missing",
                        "explanation": "No service execution integration.",
                    }
                ],
            )

        calls = provider(client, monkeypatch, design, brief=brief)
        result = finish(
            client, client.post("/api/chats", json={"question": question, "context": "new"})
        )
        assert result["status"] == "complete"
        assert result["output"]["supported"] is False
        assert result["output"]["design"] is None
        assert result["output"]["clarification"] == clarification
        assert len(scopes) == len(calls) == (1 if clarification else 2)
        assert all("candidate" not in call["prompt"] for call in calls)
        assert client.get("/api/studies").json() == []


@pytest.mark.parametrize(("budget", "available"), [(1, False), (10, True)])
def test_planning_research_availability_respects_workspace_budget(
    tmp_path, monkeypatch, budget, available
):
    app = create_app(f"sqlite:///{tmp_path}/research-budget.sqlite3", budget_usd=budget)
    with TestClient(app, base_url="http://localhost") as client:
        design = artifact_design(client)
        seen = []

        def brief(prompt):
            seen.append(prompt)
            assert prompt["research_available"] is available
            return scope(design, research_query=None)

        provider(client, monkeypatch, design, brief=brief)
        result = finish(
            client,
            client.post("/api/chats", json={"question": design["question"], "context": "new"}),
        )
        assert result["status"] == "complete", result["error"]
        assert result["output"]["supported"]
        assert len(seen) == 1
        assert result["usage"]["requests"] == 3


def test_review_budget_clarification_returns_a_question_without_an_executable_draft(
    tmp_path, monkeypatch
):
    app = create_app(f"sqlite:///{tmp_path}/review-clarification.sqlite3")
    with TestClient(app, base_url="http://localhost") as client:
        design = artifact_design(client)
        question = "Do you accept a shared total ceiling, rather than equal per-arm caps?"
        waiting = True

        def review(_):
            return (
                {
                    "issues": ["A shared total ceiling does not enforce equal per-arm caps."],
                    "summary": "The intended budget control needs your confirmation.",
                    "clarification": question,
                }
                if waiting
                else {"issues": [], "summary": "A pilot under a shared total ceiling."}
            )

        calls = provider(
            client,
            monkeypatch,
            design,
            review=review,
        )
        result = finish(
            client,
            client.post("/api/chats", json={"question": design["question"], "context": "new"}),
        )
        assert result["status"] == "complete", result["error"]
        assert result["error"] is None
        assert result["output"]["supported"] is False
        assert result["output"]["design"] is None
        assert result["output"]["clarification"] == question
        assert question in result["output"]["explanation"]
        assert result["output"]["planning"]["reviews"][-1]["clarification"] == question
        assert len(calls) == result["usage"]["requests"] == 3
        assert client.get("/api/studies").json() == []
        waiting = False
        followup = finish(
            client,
            client.post(
                "/api/chats",
                json={
                    "question": "Yes, use the shared experiment-wide ceiling.",
                    "context": "general",
                    "chat_id": result["chat_id"],
                },
            ),
        )
        assert followup["status"] == "complete", followup["error"]
        assert followup["chat_id"] == result["chat_id"]
        assert followup["output"]["supported"] is True
        assert followup["output"]["design"]["budget_usd"] == design["budget_usd"]
        assert len(calls) == 7
        assert client.get("/api/studies").json() == []
