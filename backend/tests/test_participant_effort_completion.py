"""A bounded tool activation must leave its last request usable for a decision."""

import json

import pytest
from agent_sim.api import create_app
from fastapi.testclient import TestClient
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.models.function import FunctionModel
from pydantic_ai.usage import RequestUsage

from backend.tests.test_participant_harnesses import save, step
from backend.tests.test_researcher_designs import artifact_design
from benchmarks.provider_fixtures import output_args


@pytest.mark.parametrize(("requests", "tools"), [(4, 3), (5, 2), (3, 8), (1, 3), (4, 0)])
def test_last_available_request_commits_a_model_chosen_action(
    tmp_path, monkeypatch, requests, tools
):
    app = create_app(f"sqlite:///{tmp_path}/completion.sqlite3")
    prompts = []
    read = {"kind": "read_artifact", "artifact": "azure", "version": 1}

    async def respond(messages, info):
        prompt = json.loads(messages[-1].parts[0].content)
        prompts.append(prompt)
        final = prompt["decision_required"]
        count = len(prompt["operations"])
        if final:
            value = {
                "operation": "decide",
                "read": None,
                "decision": {
                    "action": read,
                    "rationale": "Read the remaining authorized evidence as a World action.",
                    "memory": "",
                    "forecast": None,
                },
            }
        elif count == 0:
            value = {"operation": "observe", "decision": None, "read": None}
        else:
            value = {
                "operation": "read_artifact",
                "decision": None,
                "read": {**read, "artifact": ["amber", "folio", "azure"][min(count - 1, 2)]},
            }
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, output_args(info, value))],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    monkeypatch.setattr(app.state.models, "model", lambda _: FunctionModel(function=respond))
    with TestClient(app, base_url="http://localhost") as client:
        design = artifact_design(client)
        design["seeds"] = [23]
        design["conditions"][0]["harness"] = {
            "kind": "tool_using",
            "tools": ["observe", "read_artifact"],
            "max_requests": requests,
            "max_tool_operations": tools,
        }
        _, run_id = save(client, design)
        run = step(client, run_id)
        assert run["summary"]["turn"] == 1, run["summary"]
        activation = run["activations"][0]
        assert activation["stop_reason"] == "decision_committed"
        assert activation["requests"] == min(requests, tools + 1)
        assert all(op["status"] == "complete" for op in activation["operations"])
        assert run["turns"][0]["action"] == read
        assert prompts[-1]["requests_remaining"] >= 1
        assert prompts[-1]["decision_required"] is True
        assert prompts[-1]["tool_operations_remaining"] >= 0
        assert "observation" not in prompts[-1]
        assert '"reading": 904' not in json.dumps(prompts)
        assert run["summary"]["usage"]["requests"] == activation["requests"]
        usage = client.get("/api/settings").json()["usage"]
        replay = client.post(f"/api/runs/{run_id}/verify").json()
        assert replay["verified_turns"] == 1 and replay["model_requests"] == 0
        assert client.get("/api/settings").json()["usage"] == usage


@pytest.mark.parametrize("harness", ["direct_action", "tool_using"])
def test_provider_write_precondition_advances_after_its_own_write(tmp_path, monkeypatch, harness):
    from backend.tests.test_artifact_workspace import protocol

    versions = []

    async def respond(messages, info):
        schema = info.output_tools[0].parameters_json_schema
        definitions = schema["$defs"]
        writes = [
            value
            for name, value in definitions.items()
            if name.startswith("PermittedWriteArtifactEntries")
            and value.get("properties", {}).get("kind", {}).get("const") == "write_artifact"
        ]
        expected = writes[0]["properties"]["expected_version"]
        assert expected.get("const") == len(versions) + 1, expected
        versions.append(expected["const"])
        value = {
            "action": {
                "kind": "write_artifact",
                "artifact": "report",
                "expected_version": versions[-1],
                "content": {"reading": 17},
                "sources": [{"artifact": "measurement", "version": 1}],
            },
            "rationale": "Write with the advertised current precondition.",
            "memory": "",
            "forecast": None,
        }
        if harness == "tool_using":
            value = {"operation": "decide", "decision": value}
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, output_args(info, value))],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    app = create_app(f"sqlite:///{tmp_path}/version.sqlite3")
    monkeypatch.setattr(app.state.models, "model", lambda _: FunctionModel(function=respond))
    with TestClient(app, base_url="http://localhost") as client:
        design = protocol()
        design["conditions"][0]["harness"] = {"kind": harness}
        _, rid = save(client, design)
        for number in [1, 2]:
            run = step(client, rid)
            assert run["summary"]["turn"] == number, run["summary"]
        assert versions == [1, 2]
        assert run["state"]["artifacts"]["report"]["versions"][-1]["version"] == 3
        assert client.post(f"/api/runs/{rid}/verify").json()["verified_turns"] == 2


def test_large_work_history_keeps_observed_actions_and_versions_in_context(tmp_path, monkeypatch):
    from backend.tests.test_artifact_workspace import protocol

    prompts = []
    content = {"reading": 17, **{f"note_{i}": "recorded detail " * 50 for i in range(10)}}

    async def respond(messages, info):
        prompt = json.loads(messages[-1].parts[0].content)
        prompts.append(prompt)
        if not prompt["operations"]:
            value = {"operation": "observe"}
        else:
            observed = prompt["operations"][0]["result"]
            assert isinstance(observed, dict), "Context discarded the entire requested observation"
            assert any(a["kind"] == "submit_artifacts" for a in observed["legal_actions"])
            report = next(a for a in observed["artifacts"] if a["key"] == "report")
            assert report["version"] == prompt["context_cutoff"]["turn"] + 1
            action = (
                {"kind": "submit_artifacts"}
                if prompt["context_cutoff"]["turn"]
                else {
                    "kind": "write_artifact",
                    "artifact": "report",
                    "expected_version": 1,
                    "content": content,
                    "sources": [{"artifact": "measurement", "version": 1}],
                }
            )
            value = {
                "operation": "decide",
                "decision": {
                    "action": action,
                    "rationale": "Use the requested current observation.",
                    "memory": "",
                    "forecast": None,
                },
            }
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, output_args(info, value))],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    app = create_app(f"sqlite:///{tmp_path}/large-history.sqlite3")
    monkeypatch.setattr(app.state.models, "model", lambda _: FunctionModel(function=respond))
    with TestClient(app, base_url="http://localhost") as client:
        design = protocol()
        design["conditions"][0]["harness"] = {
            "kind": "tool_using",
            "tools": ["observe"],
            "max_requests": 2,
            "max_tool_operations": 1,
            "max_context_chars": 4000,
        }
        _, rid = save(client, design)
        first = step(client, rid)
        assert first["summary"]["turn"] == 1, first["summary"]
        final = step(client, rid)
        assert final["summary"]["turn"] == 2, final["summary"]
        assert final["state"]["outcome"]["status"] == "success"
        assert (
            final["activations"][1]["operations"][0]["result"]["last_result"]["content"] == content
        )
        assert all(len(json.dumps(p)) <= 4000 for p in prompts)
        assert "hidden-83" not in json.dumps(prompts)
        last = client.get(f"/api/requests/{final['requests'][-1]['id']}").json()
        items = last["request"]["input_evidence"]["items"]
        assert any(i["key"] == "rules" for i in items)
        assert not any(i["key"] == "observation" for i in items)
        before = client.get("/api/settings").json()["usage"]
        assert client.post(f"/api/runs/{rid}/verify").json()["verified_turns"] == 2
        assert client.get("/api/settings").json()["usage"] == before
