"""Source-stamped, keyless T04 DEVELOPMENT evidence through the public workflow."""

import argparse
import hashlib
import json
import os
import sys
import time
from datetime import UTC, datetime
from importlib.metadata import version
from pathlib import Path
from unittest.mock import patch

from agent_sim.api import create_app
from fastapi.testclient import TestClient
from pydantic_ai import models
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.models.function import FunctionModel
from pydantic_ai.usage import RequestUsage

from .research_baseline import ROOT, snapshot, write_json

CASES = ROOT / "benchmarks/participant-harness-cases.json"


def provider(case):
    async def respond(messages, info):
        prompt = json.loads(messages[-1].parts[0].content)
        decision = {
            "action": {
                "kind": "contribute",
                "amount": 2,
                "target": "",
                "message": "",
                "report": None,
                "promise": None,
            },
            "memory": "",
            "rationale": "T04 deterministic mechanics witness.",
            "forecast": None,
        }
        if "operations" in prompt:
            if case["mode"] == "unknown_usage" and prompt["operations"]:
                raise TimeoutError("T04 controlled unknown-usage failure")
            operation = ["observe", "rules", "legal_options", "decide"][len(prompt["operations"])]
            output = {
                "operation": operation,
                "decision": decision if operation == "decide" else None,
            }
            if case["mode"] == "forbidden_actor":
                output["actor"] = "b"
        else:
            output = decision
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, output)],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
            model_name="t04-development-deterministic-v1",
        )

    return FunctionModel(function=respond)


def exercise(client, case, output, operations):
    def request(method, path, body=None):
        row = {"case": case["id"], "number": len(operations) + 1, "method": method, "path": path}
        try:
            response = client.request(method, path, json=body)
            row["status"] = response.status_code
            response.raise_for_status()
            return response.json()
        finally:
            operations.append(row)
            with (output / "operations.jsonl").open("a") as stream:
                stream.write(json.dumps(row) + "\n")

    row = {"id": case["id"], "checks": {}, "passed": False}
    study_id = None
    try:
        design = {
            "title": case["id"],
            "question": "Inspect declared mechanics under bounded policies.",
            "profiles": [
                {
                    "key": key,
                    "name": key.upper(),
                    "goal": f"Private goal for {key}; choose a legal action.",
                }
                for key in ["a", "b"]
            ],
            "rounds": case.get("rounds", 1),
            "seeds": [73],
            "response_tokens": 512,
            "openai_reasoning_effort": "low",
            "conditions": [],
        }
        policies = ["direct_action", "tool_using"] if case["mode"] == "matched" else ["tool_using"]
        for policy in policies:
            harness = {"kind": policy}
            if case["mode"] == "request_limit":
                harness["max_requests"] = 1
            design["conditions"].append(
                {
                    "key": policy,
                    "name": policy,
                    "harness": harness,
                    "parameters": {
                        "endowment": 10,
                        "multiplier": 2,
                        "memory": "none" if case["mode"] == "no_memory" else "episodic",
                    },
                }
            )
        normalized = request("POST", "/api/design/validate", {"design": design})
        write_json(output / f"{case['id']}-design.json", normalized)
        write_json(
            output / f"{case['id']}-preflight.json",
            request("POST", "/api/design/preflight", {"design": normalized}),
        )
        usage_before = request("GET", "/api/settings")["usage"]["requests"]
        study_id = request("POST", "/api/studies", {"design": normalized})["id"]
        row["checks"]["save_does_not_spend"] = (
            request("GET", "/api/settings")["usage"]["requests"] == usage_before
        )
        study = request("GET", f"/api/studies/{study_id}")
        runs = []
        for planned in study["runs"]:
            run_id = planned["id"]
            initial = request("GET", f"/api/runs/{run_id}")["state"]
            request("POST", f"/api/runs/{run_id}/control", {"action": "start"})
            deadline = time.monotonic() + 10
            while True:
                run = request("GET", f"/api/runs/{run_id}")
                if run["summary"]["status"] not in {"running", "queued", "pausing"}:
                    break
                if time.monotonic() > deadline:
                    raise TimeoutError("T04 development run did not stop")
                time.sleep(0.005)
            prefix = run["summary"]["condition_key"]
            checks = row["checks"]
            if case["expected_turns"]:
                checks[f"{prefix}:complete"] = run["summary"]["status"] == "complete"
                checks[f"{prefix}:payoffs"] = run["state"]["balances"] == case["expected_balances"]
                checks[f"{prefix}:replay"] = request("POST", f"/api/runs/{run_id}/verify")[
                    "verified_turns"
                ] == 2 * case.get("rounds", 1)
                expected_operations = (
                    ["decide", "settle"]
                    if prefix == "direct_action"
                    else ["observe", "rules", "legal_options", "decide", "settle"]
                )
                checks[f"{prefix}:real_operations"] = all(
                    [o["kind"] for o in a["operations"]] == expected_operations
                    for a in run["activations"]
                )
            else:
                checks[f"{prefix}:no_effects"] = run["state"] == initial and run["events"] == []
                checks[f"{prefix}:failed_attempt"] = (
                    run["summary"]["status"] == "failed"
                    and run["activations"][0]["stop_reason"] == case["expected_stop"]
                )
            checks[f"{prefix}:linked_reservations"] = all(
                r["activation_id"] in {a["id"] for a in run["activations"]} for r in run["requests"]
            )
            checks[f"{prefix}:identity"] = all(
                a["identity"]["model"] == "openai:gpt-6-luna"
                and a["identity"]["harness"]["version"] == "1.0.0"
                and a["identity"]["implementation_sha256"]
                for a in run["activations"]
            )
            checks[f"{prefix}:private_reads"] = all(
                o["result"]["you"]["key"] == a["actor"]
                and not o["result"]["public_signals"]
                and "signals" not in o["result"]
                for a in run["activations"]
                for o in a["operations"]
                if o["kind"] == "observe"
            )
            if case["mode"] == "no_memory":
                checks["memory_ablation"] = all(
                    not o["result"]["public_history"]
                    and not o["result"]["your_experiences"]
                    and not o["result"]["your_note"]
                    for a in run["activations"]
                    for o in a["operations"]
                    if o["kind"] == "observe"
                )
            if case["mode"] == "unknown_usage":
                checks["unknown_usage_retained"] = (
                    run["requests"][-1]["status"] == "unknown"
                    and run["requests"][-1]["cost_usd"] > 0
                    and run["summary"]["usage"]["partial"]
                )
            runs.append(run["summary"])
        row["checks"]["request_count"] = (
            sum(r["usage"]["requests"] for r in runs) == case["expected_requests"]
        )
        row["checks"]["turn_count"] = sum(r["turn"] for r in runs) == case["expected_turns"]
        row["runs"] = runs
        row["passed"] = all(row["checks"].values())
    except Exception as error:
        row["error"] = type(error).__name__
    finally:
        if study_id:
            try:
                exported = request("GET", f"/api/studies/{study_id}/export")
                write_json(output / f"{case['id']}-export.json", exported)
            except Exception as error:
                row["export_error"] = type(error).__name__
                row["passed"] = False
        with (output / "attempts.jsonl").open("a") as stream:
            stream.write(json.dumps(row) + "\n")
    return row


def run_trial(output):
    output = Path(output)
    output.mkdir(parents=True, exist_ok=False)
    source = snapshot(output)
    suite = json.loads(CASES.read_text())
    report = {
        "version": 1,
        "started": datetime.now(UTC).isoformat(),
        "source": source,
        "suite": suite,
        "suite_sha256": hashlib.sha256(CASES.read_bytes()).hexdigest(),
        "harness_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        "runtime": {"python": sys.version, "pydantic-ai-slim": version("pydantic-ai-slim")},
        "evidence_kind": "deterministic-api-correctness",
        "live_requests": 0,
    }
    write_json(output / "manifest.json", report)
    operations = []
    with (
        patch.dict(
            os.environ,
            {"OPENAI_API_KEY": "", "ANTHROPIC_API_KEY": "", "JAS_CONCURRENT_REQUESTS": "1"},
        ),
        patch.object(models, "ALLOW_MODEL_REQUESTS", False),
    ):
        app = create_app(f"sqlite:///{output.resolve()}/workspace.sqlite3", concurrent_runs=1)
        with TestClient(app, base_url="http://localhost") as client:
            report["attempts"] = []
            for case in suite["cases"]:
                with patch.object(app.state.models, "model", return_value=provider(case)):
                    report["attempts"].append(exercise(client, case, output, operations))
            write_json(output / "settings.json", client.get("/api/settings").json())
    report["source_unchanged"] = all(
        (ROOT / name).is_file() and hashlib.sha256((ROOT / name).read_bytes()).hexdigest() == value
        for name, value in source["files"].items()
    )
    report["finished"] = datetime.now(UTC).isoformat()
    write_json(output / "report.json", report)
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    report = run_trial(parser.parse_args().output)
    print(json.dumps({"passed": all(r["passed"] for r in report["attempts"]), "live_requests": 0}))
    sys.exit(
        0 if report["source_unchanged"] and all(r["passed"] for r in report["attempts"]) else 1
    )
