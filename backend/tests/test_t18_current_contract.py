"""Fresh current-contract qualification; frozen literal expectations precede outputs.

Public HTTP is primary. The provider sees/asserts complete literal prompt and
instructions; real SQLite supplies independent per-request integer-ledger checks.
No historical comparator, candidate-generated oracle, network or live judge.
"""

import copy
import json
import sqlite3
from pathlib import Path

import pytest
from agent_sim.api import create_app
from fastapi.testclient import TestClient
from pydantic_ai import models
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.models.function import FunctionModel
from pydantic_ai.usage import RequestUsage
from test_fallible_adjudication import finished

from benchmarks.research_baseline import design_for

ROOT = Path(__file__).absolute().parents[2]
REFERENCE = ROOT / "backend/tests/fixtures/current-contract.json"


def api(client, method, path, body=None):
    response = client.request(method, path, json=body)
    assert response.is_success, response.text
    return response.json()


@pytest.mark.parametrize("case_index,indices", [(0, [0]), (1, [1, 2]), (2, [3]), (3, [4])])
def test_frozen_current_contract(case_index, indices, tmp_path, monkeypatch):
    frozen = json.loads(REFERENCE.read_text())
    expected_runs = [frozen["runs"][index] for index in indices]
    cases = json.loads((ROOT / "benchmarks/research-cases.json").read_text())["cases"]
    value = design_for(cases[case_index])
    database = tmp_path / "contract.sqlite3"
    url = f"sqlite:///{database}"
    seen, identifiers, captured = [], {}, {}
    expected = iter(turn for run in expected_runs for turn in run["turns"])

    async def respond(messages, info):
        turn = next(expected)
        # Before replying, assert actual external-boundary inputs, not a final summary.
        assert messages[-1].parts[0].content == turn["request"]["prompt"]
        assert info.instructions == turn["provider_instructions"]
        assert info.model_settings == turn["request"]["settings"]
        assert len(info.output_tools) == 1
        tool = info.output_tools[0]
        assert tool.parameters_json_schema == turn["provider_tool"]["schema"]
        assert tool.name == turn["provider_tool"]["name"]
        assert tool.description == turn["provider_tool"]["description"]
        assert tool.strict is True
        assert info.function_tools == [] and info.allow_text_output is False
        seen.append(copy.deepcopy(turn))
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, turn["decision"])],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    monkeypatch.setattr(models, "ALLOW_MODEL_REQUESTS", False)
    app = create_app(url, static_dir=tmp_path / "static")
    app.state.models.models["openai:gpt-6-luna"] = FunctionModel(
        function=respond, model_name="t18-current-contract-v1"
    )
    with TestClient(app, base_url="http://localhost") as client:
        api(client, "POST", "/api/design/validate", {"design": value})
        api(client, "POST", "/api/design/preflight", {"design": value})
        sid = api(client, "POST", "/api/studies", {"design": value})["id"]
        study = api(client, "GET", f"/api/studies/{sid}")
        assert api(client, "GET", "/api/settings")["usage"]["requests"] == 0
        assert seen == []
        runs = sorted(study["runs"], key=lambda run: run["condition_key"])
        for run, oracle in zip(runs, expected_runs, strict=True):
            rid = run["id"]
            initial = api(client, "GET", f"/api/runs/{rid}/turns/0")
            assert initial["checkpoint"] == oracle["initial"]
            api(client, "POST", f"/api/runs/{rid}/control", {"action": "step"})
            first = finished(client, rid)
            assert first["summary"]["turn"] == 1
            assert first["summary"]["status"] == "paused"
            cutoff = api(client, "GET", f"/api/runs/{rid}/exposure?through_turn=1")
            first_evidence = api(client, "GET", f"/api/runs/{rid}/turns/1")
            api(client, "POST", f"/api/runs/{rid}/control", {"action": "pause"})
            api(client, "POST", f"/api/runs/{rid}/control", {"action": "start"})
            final = finished(client, rid)
            assert final["summary"]["status"] == "complete", final["summary"]
            assert final["summary"]["turn"] == len(oracle["turns"])
            assert final["state"] == oracle["turns"][-1]["checkpoint"]
            assert api(client, "GET", f"/api/runs/{rid}/turns/1") == first_evidence
            assert api(client, "GET", f"/api/runs/{rid}/exposure?through_turn=1") == cutoff
            denied = client.get(f"/api/runs/{rid}/turns/{len(oracle['turns']) + 1}")
            assert denied.status_code == 422

            evidence = []
            for turn in oracle["turns"]:
                row = api(client, "GET", f"/api/runs/{rid}/turns/{turn['number']}")
                for key in (
                    "number",
                    "round",
                    "actor",
                    "observation",
                    "decision",
                    "checkpoint",
                    "state_hash",
                ):
                    assert row[key] == turn[key], (rid, turn["number"], key)
                assert [
                    {k: e[k] for k in ("kind", "actor", "target", "visibility", "text", "data")}
                    for e in row["events"]
                ] == turn["events"]
                assert [
                    {k: m[k] for k in ("key", "value", "denominator", "agent")}
                    for m in final["measurements"]
                    if m["turn"] == turn["number"]
                ] == turn["measures"]
                for i, e in enumerate(row["events"], 1):
                    identifiers[f"event:{e['id']}"] = f"event:t{turn['number']}:e{i}"
                observation = row["observation"]
                assert "pending" not in observation and "truth" not in observation
                assert "signals" not in observation and "notes" not in observation
                assert "experiences" not in observation
                if oracle["environment"] == "information":
                    assert len(observation["public_signals"]) == (3 if oracle["public"] else 0)
                if oracle["environment"] == "institution":
                    assert observation["authority"] == (row["actor"] == "a")
                evidence.append(row)
            captured[rid] = dict(evidence=evidence, oracle=oracle)
        export = api(client, "GET", f"/api/studies/{sid}/export")
        assert export["version"] == frozen["contracts"]["export"]
        assert len(export["requests"]) == sum(len(r["turns"]) for r in expected_runs)
        for call in export["requests"]:
            turn = captured[call["run_id"]]["oracle"]["turns"][call["turn"] - 1]
            request = copy.deepcopy(call["request"])
            for item in request["input_evidence"]["items"]:
                item["key"] = identifiers.get(item["key"], item["key"])
            assert request == turn["request"]
            assert api(client, "GET", f"/api/requests/{call['id']}")["request"] == call["request"]
            assert call["purpose"] == "decision" and call["analysis_id"] is None
            assert call["activation_id"] is not None and call["model"] == "openai:gpt-6-luna"
            assert call["status"] == "complete" and call["error"] is None
        for run in export["runs"]:
            rid = run["record"]["summary"]["id"]
            assert [e["checkpoint"] for e in run["evidence"]] == [
                captured[rid]["oracle"]["initial"],
                *(t["checkpoint"] for t in captured[rid]["oracle"]["turns"]),
            ]
        usage = api(client, "GET", "/api/settings")["usage"]
        count = sum(len(r["turns"]) for r in expected_runs)
        assert usage == dict(
            requests=count,
            input_tokens=100 * count,
            output_tokens=50 * count,
            cost_usd=35 * count / 1_000_000,
            partial=False,
        )
        # Independent integer ledger, including the full-request-derived reservation.
        with sqlite3.connect(database) as db:
            rows = db.execute(
                "SELECT run_id,turn,reserved,charged,input_tokens,output_tokens,"
                "status,purpose FROM provider_calls ORDER BY run_id,turn"
            ).fetchall()
            for rid, number, *values in rows:
                ledger = captured[rid]["oracle"]["turns"][number - 1]["ledger"]
                assert values == [
                    ledger[k]
                    for k in (
                        "reserved",
                        "charged",
                        "input_tokens",
                        "output_tokens",
                        "status",
                        "purpose",
                    )
                ]
        before = copy.deepcopy(export)
    calls_before = len(seen)

    def forbidden(*args, **kwargs):
        raise AssertionError("Restoration/replay attempted a provider call")

    restored = create_app(url, static_dir=tmp_path / "static-restored")
    monkeypatch.setattr(restored.state.models, "model", forbidden)
    with TestClient(restored, base_url="http://localhost") as client:
        for rid, data in captured.items():
            result = api(client, "POST", f"/api/runs/{rid}/verify")
            assert result["verified_turns"] == len(data["oracle"]["turns"])
        assert api(client, "GET", f"/api/studies/{sid}/export") == before
        assert api(client, "GET", "/api/settings")["usage"] == usage
    assert len(seen) == calls_before == count


def test_current_replacement_rejects_unsupported_artifact_alias_without_spending(tmp_path):
    # T01's historical "no artifact support" wording is obsolete; only alias rejection holds.
    from test_fallible_adjudication import protocol

    value = protocol()
    value["environment"] = "artifact"
    app = create_app(f"sqlite:///{tmp_path}/alias.sqlite3", static_dir=tmp_path / "static")
    with TestClient(app, base_url="http://localhost") as client:
        result = client.post("/api/design/validate", json={"design": value})
        assert result.status_code == 422
        assert any(
            error["loc"] == ["body", "design", "environment"] for error in result.json()["detail"]
        )
        assert client.get("/api/studies").json() == []
        assert client.get("/api/settings").json()["usage"]["requests"] == 0
