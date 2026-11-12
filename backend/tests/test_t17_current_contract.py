"""Fresh literal current-contract qualification; no retired historical comparator."""

import hashlib
import json
import time
from copy import deepcopy
from decimal import Decimal
from pathlib import Path

import pytest
from agent_sim.api import create_app
from agent_sim.domain import Decision, Design, Parameters
from agent_sim.simulation.environments import create_world
from fastapi.testclient import TestClient
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.models.function import FunctionModel
from pydantic_ai.usage import RequestUsage

FIXTURE = Path(__file__).with_name("fixtures") / "t17_current_contract_v2.json"
FIXTURE_SHA256 = "3864f978694cbd293b0a6fdac0369f5c3a8d682f9ab8a2e2b4645b0e1d8188a2"


def facts(event):
    return {key: event[key] for key in ("kind", "actor", "target", "visibility", "text", "data")}


def settled(client, run_id, turns):
    deadline = time.monotonic() + 10
    while time.monotonic() < deadline:
        row = client.get(f"/api/runs/{run_id}").json()
        if row["summary"]["status"] not in {"running", "queued", "pausing"}:
            assert row["summary"]["turn"] == turns, row
            return row
        time.sleep(0.005)
    pytest.fail("The explicitly stepped current-contract turn did not settle")


def test_literal_current_contract_five_runs_22_complete_inputs_ledgers_restore_and_replay(
    tmp_path, monkeypatch
):
    assert hashlib.sha256(FIXTURE.read_bytes()).hexdigest() == FIXTURE_SHA256
    oracle = json.loads(FIXTURE.read_text())
    assert oracle["totals"] == {
        "runs": 5,
        "turns": 22,
        "requests": 22,
        "input_tokens": 2200,
        "output_tokens": 1100,
        "charged": 770,
        "reserved": 29062,
    }
    fixture_source = Path(__file__).resolve().parents[2] / oracle["source_cases"]
    assert hashlib.sha256(fixture_source.read_bytes()).hexdigest() == oracle["source_cases_sha256"]
    database = f"sqlite:///{tmp_path}/current-contract.sqlite3"
    current = {}
    delivered = []
    models = []

    async def respond(messages, info):
        delivered.append(json.loads(messages[-1].parts[0].content))
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, deepcopy(current["decision"]))],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    provider = FunctionModel(function=respond)

    def model(name):
        assert name == "openai:gpt-6-luna"
        models.append(name)
        return provider

    records = []

    def check_turn(client, record, number):
        expected = record["oracle"]["turns"][number - 1]
        current.clear()
        current.update(expected)
        sent_before = len(delivered)
        result = client.post(f"/api/runs/{record['run_id']}/control", json={"action": "step"})
        assert result.status_code == 200, result.text
        run = settled(client, record["run_id"], number)
        assert len(delivered) == sent_before + 1
        assert delivered[-1] == expected["observation"]
        assert run["state"] == expected["checkpoint"]
        evidence = client.get(f"/api/runs/{record['run_id']}/turns/{number}").json()
        assert evidence["observation"] == expected["observation"]
        assert evidence["decision"] == expected["decision"]
        assert evidence["checkpoint"] == expected["checkpoint"]
        assert evidence["state_hash"] == expected["state_hash"]
        assert [facts(ev) for ev in evidence["events"]] == expected["events"]
        actual_measures = [
            {key: value[key] for key in ("key", "value", "denominator", "agent")}
            for value in run["measurements"]
            if value["turn"] == number and value["version"] == 1
        ]
        assert actual_measures == expected["measures"]
        activation = run["activations"][-1]
        assert activation["observation"] == expected["observation"]
        assert activation["status"] == "committed"
        assert activation["identity"]["harness"] == {
            "kind": "direct_action",
            "version": "1.0.0",
            "max_requests": 1,
            "max_tool_operations": 0,
            "tools": [],
        }
        assert [operation["kind"] for operation in activation["operations"]] == ["decide", "settle"]
        request = client.get(f"/api/requests/{run['requests'][-1]['id']}").json()
        assert (request["purpose"], request["model"], request["status"], request["turn"]) == (
            "decision",
            "openai:gpt-6-luna",
            "complete",
            number,
        )
        payload = request["request"]
        assert set(payload) == {
            "instructions",
            "prompt",
            "schema",
            "strict_output",
            "web_search",
            "settings",
            "price_per_million",
            "provider_adapter",
            "input_evidence",
        }
        assert payload["instructions"] == oracle["instructions"]
        assert json.loads(payload["prompt"]) == expected["observation"]
        assert payload["schema"] == expected["schema"]
        assert payload["strict_output"] is None
        assert payload["web_search"] is False
        assert payload["settings"] == oracle["settings"]
        assert payload["price_per_million"] == [0.1, 0.5]
        assert payload["provider_adapter"] == {
            "class": "pydantic_ai.models.function.FunctionModel",
            "model_name": provider.model_name,
            "system": provider.system,
        }
        bindings = [
            {"key": "rules", "surface": "prompt", "path": ["rules"], "operation": None},
            {"key": "choices", "surface": "schema", "path": [], "operation": None},
            {"key": "choices", "surface": "prompt", "path": ["legal_actions"], "operation": None},
            {"key": "observation", "surface": "prompt", "path": [], "operation": None},
        ]
        prior_events = [event for event in run["events"] if event["turn"] < number]
        bindings.extend(
            {
                "key": f"event:{prior_events[item['event_index']]['id']}",
                "surface": "prompt",
                "path": item["path"],
                "operation": None,
            }
            for item in expected["event_bindings"]
        )
        assert payload["input_evidence"] == {"version": 1, "items": bindings}
        assert (
            len(
                (
                    payload["prompt"] + payload["instructions"] + json.dumps(payload["schema"])
                ).encode()
            )
            + 4096
            == expected["input_bound_bytes"]
        )
        # Restore the independently specified checkpoint, not an expected value
        # copied from the actual run. World and public Engine are distinct witnesses.
        restored = create_world(
            Design.model_validate(run["design"]),
            Parameters.model_validate(run["parameters"]),
            run["summary"]["seed"],
            expected["checkpoint"],
        )
        assert restored.snapshot() == expected["checkpoint"]
        if number < len(record["oracle"]["turns"]):
            following = record["oracle"]["turns"][number]
            assert restored.actor() == following["actor"]
            observed = restored.observe(following["actor"])
            observed["you"] = following["observation"]["you"]
            assert observed == following["observation"]
        else:
            assert restored.actor() is None
            before = restored.snapshot()
            with pytest.raises(ValueError):
                restored.step(expected["actor"], Decision.model_validate(expected["decision"]))
            assert restored.snapshot() == before
        return run

    app = create_app(database, static_dir=tmp_path / "static")
    monkeypatch.setattr(app.state.models, "model", model)
    with TestClient(app, base_url="http://localhost") as client:
        for case in oracle["cases"]:
            before = len(delivered)
            saved = client.post("/api/studies", json={"design": case["design"]})
            assert saved.status_code == 201, saved.text
            study_id = saved.json()["id"]
            study = client.get(f"/api/studies/{study_id}").json()
            assert len(delivered) == before
            for planned in case["runs"]:
                summary = next(
                    run for run in study["runs"] if run["condition_key"] == planned["condition"]
                )
                record = {"study_id": study_id, "run_id": summary["id"], "oracle": planned}
                initial = client.get(f"/api/runs/{summary['id']}").json()
                assert initial["state"] == planned["initial_checkpoint"]
                initial_evidence = client.get(f"/api/runs/{summary['id']}/turns/0").json()
                assert initial_evidence["state_hash"] is None  # no committed Turn at zero
                initial_hash = hashlib.sha256(
                    json.dumps(
                        initial_evidence["checkpoint"], sort_keys=True, allow_nan=False
                    ).encode()
                ).hexdigest()
                assert initial_hash == planned["initial_state_hash"]
                assert initial["requests"] == initial["activations"] == []
                record["first"] = check_turn(client, record, 1)
                assert record["first"]["summary"]["status"] == "paused"
                record["evidence1"] = client.get(f"/api/runs/{summary['id']}/turns/1").json()
                record["cutoff1"] = client.get(
                    f"/api/runs/{summary['id']}/exposure?through_turn=1"
                ).json()
                assert record["cutoff1"]["delivery"] == {
                    "confirmed_requests": 1,
                    "unknown_requests": 0,
                    "unsent_attempts": 0,
                }
                records.append(record)
        assert len(delivered) == len(records) == 5
        usage5 = client.get("/api/settings").json()["usage"]

    def no_model(_name):
        raise AssertionError("Restart and replay must construct zero providers")

    app = create_app(database, static_dir=tmp_path / "static")
    monkeypatch.setattr(app.state.models, "model", no_model)
    with TestClient(app, base_url="http://localhost") as client:
        assert client.get("/api/settings").json()["usage"] == usage5
        assert len(delivered) == 5
        for record in records:
            rid = record["run_id"]
            assert client.get(f"/api/runs/{rid}").json()["state"] == record["first"]["state"]
            assert client.get(f"/api/runs/{rid}").json()["summary"]["status"] == "paused"
            assert client.get(f"/api/runs/{rid}/turns/1").json() == record["evidence1"]
        monkeypatch.setattr(app.state.models, "model", model)
        for record in records:
            rid = record["run_id"]
            for number in range(2, len(record["oracle"]["turns"]) + 1):
                record["final"] = check_turn(client, record, number)
            assert record["final"]["summary"]["status"] == "complete"
            assert client.get(f"/api/runs/{rid}/turns/1").json() == record["evidence1"]
            assert (
                client.get(f"/api/runs/{rid}/exposure?through_turn=1").json() == record["cutoff1"]
            )
        assert len(delivered) == 22
        usage = client.get("/api/settings").json()["usage"]
        assert {
            key: usage[key] for key in ("requests", "input_tokens", "output_tokens", "partial")
        } == {
            "requests": 22,
            "input_tokens": 2200,
            "output_tokens": 1100,
            "partial": False,
        }
        assert Decimal(str(usage["cost_usd"])) * 1_000_000 == 770
        exported = {}
        for record in records:
            sid = record["study_id"]
            exported[sid] = client.get(f"/api/studies/{sid}/export").json()
            assert exported[sid]["version"] == 19
            requests = [
                request
                for request in exported[sid]["requests"]
                if request["run_id"] == record["run_id"]
            ]
            assert len(requests) == len(record["oracle"]["turns"])
            for request, expected in zip(requests, record["oracle"]["turns"], strict=True):
                assert (
                    request["input_tokens"],
                    request["output_tokens"],
                    request["status"],
                    request["charged"],
                ) == (100, 50, "complete", 35)
                assert request["reserved"] == expected["reserved"]
                assert request["error"] is None
            assert sum(request["reserved"] for request in requests) == record["oracle"]["reserved"]
        assert (
            sum(request["reserved"] for value in exported.values() for request in value["requests"])
            == 29062
        )
        for sid, value in exported.items():
            (tmp_path / f"{sid}-export.json").write_text(json.dumps(value, indent=2))
        monkeypatch.setattr(app.state.models, "model", no_model)
        for record in records:
            verified = client.post(f"/api/runs/{record['run_id']}/verify")
            assert verified.status_code == 200, verified.text
            assert verified.json()["verified_turns"] == len(record["oracle"]["turns"])
            assert verified.json()["model_requests"] == 0
            assert (
                client.get(f"/api/studies/{record['study_id']}/export").json()
                == exported[record["study_id"]]
            )
        assert client.get("/api/settings").json()["usage"] == usage
        assert len(delivered) == 22
