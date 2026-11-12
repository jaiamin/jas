"""Fresh current qualification; no deleted historical reference or comparator."""

import asyncio
import gzip
import hashlib
import json
from decimal import Decimal

import pytest
from agent_sim.api import create_app
from fastapi.testclient import TestClient
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.models.function import FunctionModel
from pydantic_ai.usage import RequestUsage

from backend.tests.current_contract_oracle import INSTRUCTIONS, observations
from backend.tests.test_claim_support import run as control
from benchmarks.research_baseline import CASES, design_for

MATRIX = [
    ("simple-binding-split", 0, "bargaining", 2, 70),
    ("three-signal-disclosure", 0, "information", 3, 105),
    ("three-signal-disclosure", 1, "information", 3, 105),
    ("four-feasible-promises", 0, "commons", 8, 280),
    ("six-token-permissions", 0, "institution", 6, 210),
]


def microdollars(value):
    result = Decimal(str(value)) * 1_000_000
    assert result == int(result), "Accounting must be an exact integer number of microdollars"
    return int(result)


def assert_schema(schema, observation, environment):
    """Independently inspect all supplied alternatives, recipients and payload bounds."""

    def resolve(value):
        return schema["$defs"][value["$ref"].split("/")[-1]] if "$ref" in value else value

    assert schema["additionalProperties"] is False
    assert set(schema["properties"]) == {"action", "rationale", "memory", "forecast"}
    assert set(schema["required"]) == {"action", "rationale", "memory", "forecast"}
    action_schema = schema["properties"]["action"]
    variants = action_schema.get("anyOf", [action_schema])
    expected = observation["legal_actions"]
    assert len(variants) == len(expected)
    for variant, option in zip(variants, expected, strict=True):
        definition = resolve(variant)
        assert definition["additionalProperties"] is False
        assert set(definition["properties"]) == {
            "kind",
            "amount",
            "target",
            "message",
            "report",
            "promise",
        }
        assert set(definition["required"]) == set(definition["properties"])
        props = definition["properties"]
        assert resolve(props["kind"])["enum"] == [option["kind"]]
        assert props["amount"]["type"] == "integer"
        assert props["amount"]["minimum"] == option["amount_min"]
        assert props["amount"]["maximum"] == option["amount_max"]
        assert resolve(props["target"])["enum"] == option.get("targets", ["", "a", "b", "c", "d"])
        assert props["message"]["type"] == "string" and props["message"]["maxLength"] == 1000
        if environment != "commons":
            assert props["promise"]["type"] == "null"
        report = props["report"]["anyOf"][0]
        assert (report["minimum"], report["maximum"]) == (
            0,
            1 if environment == "information" else 100,
        )
    if environment != "commons":
        assert schema["properties"]["forecast"]["type"] == "null"


@pytest.mark.parametrize(
    "case_id,arm,environment,count,charged",
    MATRIX,
    ids=["binding", "private", "shared", "promises", "permissions"],
)
def test_fresh_current_contract_complete_public_workflow(
    tmp_path, monkeypatch, case_id, arm, environment, count, charged
):
    case = next(c for c in json.loads(CASES.read_text())["cases"] if c["id"] == case_id)
    design = design_for(case)
    design["conditions"] = [design["conditions"][arm]]
    initial, actors, actions, events, states, expected_inputs = observations(environment, arm == 1)
    assert len(actors) == count
    trace, reservations, received = [], [], []
    database = f"sqlite:///{tmp_path}/current.sqlite3"
    app = create_app(database, static_dir=tmp_path / "static")

    async def respond(messages, info):
        index = len(received)
        received.append(messages[-1].parts[0].content)
        # Inspect the actual in-flight reservation through public HTTP while the
        # provider is pending. This read does not use internal storage or a mock ledger.
        pending_response = await asyncio.to_thread(client.get, f"/api/runs/{rid}")
        pending = pending_response.json()
        call = pending["requests"][-1]
        detail = (await asyncio.to_thread(client.get, f"/api/requests/{call['id']}")).json()
        request = detail["request"]
        expected_prompt = json.dumps(expected_inputs[index])
        assert received[-1] == request["prompt"] == expected_prompt
        assert request["instructions"] == INSTRUCTIONS
        assert_schema(request["schema"], expected_inputs[index], environment)
        assert request["settings"] == {
            "max_tokens": 512,
            "timeout": 90,
            "openai_reasoning_effort": "low",
        }
        assert request["price_per_million"] == [0.1, 0.5] and request["web_search"] is False
        assert detail["model"] == "openai:gpt-6-luna" and detail["purpose"] == "decision"
        assert call["status"] == "pending" and call["turn"] == index + 1
        nbytes = len((expected_prompt + INSTRUCTIONS + json.dumps(request["schema"])).encode())
        reserved = (nbytes + 4096 + 7) // 8 + 256
        assert microdollars(call["cost_usd"]) == reserved
        workspace = (await asyncio.to_thread(client.get, "/api/settings")).json()
        study = (await asyncio.to_thread(client.get, f"/api/studies/{sid}")).json()
        assert microdollars(workspace["usage"]["cost_usd"]) == index * 35 + reserved
        assert microdollars(study["usage"]["cost_usd"]) == index * 35 + reserved
        reservations.append(
            {"turn": index + 1, "input_bytes": nbytes, "reserved_microdollars": reserved}
        )
        return ModelResponse(
            parts=[
                ToolCallPart(
                    info.output_tools[0].name,
                    {
                        "action": actions[index],
                        "memory": "",
                        "forecast": None,
                        "rationale": "Independent literal current-contract witness.",
                    },
                )
            ],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    monkeypatch.setattr(app.state.models, "model", lambda _: FunctionModel(function=respond))
    try:
        with TestClient(app, base_url="http://localhost") as client:
            original_request = client.request

            def record(method, path, **kwargs):
                response = original_request(method, path, **kwargs)
                trace.append(
                    {
                        "method": method,
                        "path": str(path),
                        "body": kwargs.get("json"),
                        "status": response.status_code,
                        "response": response.json(),
                    }
                )
                return response

            monkeypatch.setattr(client, "request", record)
            validated = client.post("/api/design/validate", json={"design": design})
            assert validated.status_code == 200, validated.text
            created = client.post("/api/studies", json={"design": design})
            assert created.status_code == 201, created.text
            sid = created.json()["id"]
            study = client.get(f"/api/studies/{sid}").json()
            rid = study["runs"][0]["id"]
            assert client.get("/api/settings").json()["usage"]["requests"] == 0
            prefix = [client.get(f"/api/runs/{rid}/turns/0").json()]
            assert prefix[0]["checkpoint"] == initial
            for i in range(count):
                result = control(client, rid, "step")
                assert result["status"] == ("complete" if i == count - 1 else "paused"), result
                assert result["turn"] == i + 1
                evidence = client.get(f"/api/runs/{rid}/turns/{i + 1}").json()
                prefix.append(evidence)
                assert evidence["observation"] == expected_inputs[i]
                assert evidence["decision"]["action"] == actions[i]
                assert evidence["checkpoint"] == states[i]
                expected_hash = hashlib.sha256(
                    json.dumps(states[i], sort_keys=True, allow_nan=False).encode()
                ).hexdigest()
                assert evidence["state_hash"] == expected_hash
                actual_events = [{k: e[k] for k in events[i][0]} for e in evidence["events"]]
                assert actual_events == events[i]
                assert all(e["turn"] == i + 1 for e in evidence["events"])
                usage = client.get("/api/settings").json()["usage"]
                assert (
                    usage["requests"],
                    usage["input_tokens"],
                    usage["output_tokens"],
                    microdollars(usage["cost_usd"]),
                ) == (i + 1, (i + 1) * 100, (i + 1) * 50, (i + 1) * 35)
                assert usage["partial"] is False
                assert [
                    client.get(f"/api/runs/{rid}/turns/{n}").json() for n in range(i + 2)
                ] == prefix
            for cutoff in range(count + 1):
                exposure = client.get(f"/api/runs/{rid}/exposure?through_turn={cutoff}").json()
                assert exposure["through_turn"] == cutoff
                assert len(exposure["membership"]["requests"]) == cutoff
                assert exposure["delivery"]["confirmed_requests"] == cutoff
            exported = client.get(f"/api/studies/{sid}/export").json()
            assert exported["version"] == 20
            assert len(exported["activations"]) == len(exported["requests"]) == count
            assert len(exported["runs"][0]["evidence"]) == count + 1
            assert [microdollars(r["cost_usd"]) for r in exported["requests"]] == [35] * count
            assert all(
                (r["input_tokens"], r["output_tokens"], r["status"]) == (100, 50, "complete")
                for r in exported["requests"]
            )
            usage = client.get("/api/settings").json()["usage"]
            assert microdollars(usage["cost_usd"]) == charged
            assert client.post(f"/api/runs/{rid}/verify").json() == {
                "verified_turns": count,
                "model_requests": 0,
                "rule_version": initial["rule_version"],
            }
            assert client.get("/api/settings").json()["usage"] == usage
            assert client.get(f"/api/studies/{sid}/export").json() == exported
        restarted = create_app(database, static_dir=tmp_path / "static")

        def forbidden(_):
            pytest.fail("Restoration/replay must not choose a model")

        monkeypatch.setattr(restarted.state.models, "model", forbidden)
        with TestClient(restarted, base_url="http://localhost") as restored:
            assert restored.get(f"/api/runs/{rid}").json()["state"] == states[-1]
            assert restored.post(f"/api/runs/{rid}/verify").json()["model_requests"] == 0
            assert restored.get("/api/settings").json()["usage"] == usage
        (tmp_path / "qualification.json").write_text(
            json.dumps(
                {
                    "case": case_id,
                    "arm": arm,
                    "runs": 1,
                    "turns": count,
                    "requests": count,
                    "settled_microdollars": charged,
                    "reservations": reservations,
                    "input_tokens": count * 100,
                    "output_tokens": count * 50,
                    "historical_comparison": False,
                    "paid_requests": 0,
                },
                indent=2,
            )
        )
    finally:
        with gzip.open(tmp_path / "raw-public-http.json.gz", "wt") as stream:
            json.dump(
                {"http": trace, "full_inputs": received, "reservation_witnesses": reservations},
                stream,
            )
