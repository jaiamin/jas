"""Keyless T08 development witnesses through real HTTP, with all failures retained."""

import argparse
import hashlib
import json
import os
import subprocess
import sys
import time
from importlib.metadata import version
from pathlib import Path
from unittest.mock import patch

import agent_sim
from agent_sim.api import create_app
from fastapi.testclient import TestClient
from pydantic_ai import models
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.models.function import FunctionModel
from pydantic_ai.usage import RequestUsage

from benchmarks.provider_fixtures import output_args

from .research_baseline import ROOT, snapshot, write_json

CASES = ROOT / "benchmarks/participant-context-cases.json"


def provider(case):
    async def respond(messages, info):
        prompt = json.loads(messages[-1].parts[0].content)
        journal = prompt["operations"]
        count = len(journal)
        if case["mode"] == "unknown" and count:
            raise TimeoutError("T08 controlled auxiliary failure")
        value = {"operation": "decide", "decision": None}
        if case["mode"] == "denied":
            value |= {
                "operation": "verify",
                "verification": {
                    "proposed": final_decision(case),
                    "checks": [{"source_id": "observation:foreign:state", "quote": "private"}],
                },
            }
        elif case["mode"] == "immediate":
            value["decision"] = final_decision(case)
        elif count == 0:
            value |= {"operation": "investigate", "investigation": {"facet": "state"}}
        elif count == 1:
            value |= {"operation": "retrieve", "retrieval": {"query": "", "limit": 8}}
        elif count == 2:
            source = journal[0]["result"]["source"]
            value |= {
                "operation": "plan",
                "plan": {
                    "text": "Use the observed measurement and available budget for this choice.",
                    "source_ids": [source["id"]],
                },
            }
        elif count == 3:
            value |= {"operation": "investigate", "investigation": {"facet": "legal_options"}}
        elif count == 4:
            source = journal[0]["result"]["source"]
            observation = source["content"]
            value |= {
                "operation": "verify",
                "verification": {
                    "proposed": final_decision(case, observation),
                    "checks": [{"source_id": source["id"], "quote": "your_private_signal"}],
                },
            }
        else:
            value["decision"] = final_decision(case, journal[0]["result"]["source"]["content"])
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, output_args(info, value))],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
            model_name="t08-neutral-development-v1",
        )

    return FunctionModel(function=respond)


def final_decision(case, observation=None):
    return {
        "action": {
            "kind": "choose" if case["environment"] == "information" else "contribute",
            "amount": observation["your_private_signal"]
            if case["environment"] == "information" and observation
            else 5,
            "target": "",
            "message": "",
            "report": None,
            "promise": None,
        },
        "memory": "Observed measurement retained as an intentional private note.",
        "rationale": "Neutral deterministic mechanics witness; no intelligence claim.",
        "forecast": None,
    }


def exercise(client, case, suite, output):
    row = {"id": case["id"], "checks": {}, "passed": False}
    study_id = None

    def request(method, path, body=None):
        response = client.request(method, path, json=body)
        with (output / "operations.jsonl").open("a") as stream:
            stream.write(
                json.dumps(
                    {
                        "case": case["id"],
                        "method": method,
                        "path": path,
                        "status": response.status_code,
                        **(
                            {"error_response": response.json()}
                            if response.status_code >= 400
                            else {}
                        ),
                    }
                )
                + "\n"
            )
        response.raise_for_status()
        return response.json()

    try:
        harness = {"kind": "tool_using", "version": "2.0.0", **suite["effort"]}
        response_tokens = harness.pop("response_tokens")
        if case["mode"] == "immediate":
            harness["capabilities"] = dict.fromkeys(
                ["planning", "memory", "investigation", "verification"], "disabled"
            )
        design = {
            "title": case["id"],
            "question": "Inspect permitted evidence and choose a legal action.",
            "environment": case["environment"],
            "rounds": case["rounds"],
            "seeds": [103],
            "response_tokens": response_tokens,
            "openai_reasoning_effort": "low",
            "profiles": [
                {"key": key, "name": key, "goal": "Choose from permitted options."}
                for key in "abc"[: case["participants"]]
            ],
            "conditions": [
                {
                    "key": "bounded",
                    "name": "Bounded",
                    "harness": harness,
                    "parameters": {
                        "endowment": 13,
                        "multiplier": 1,
                        "memory": case["memory"],
                        "information": {"accuracy": 1, "correct_reward": 9},
                    },
                }
            ],
        }
        write_json(output / f"{case['id']}-input.json", design)
        normalized = request("POST", "/api/design/validate", {"design": design})
        write_json(output / f"{case['id']}-design.json", normalized)
        study_id = request("POST", "/api/studies", {"design": normalized})["id"]
        study = request("GET", f"/api/studies/{study_id}")
        run_id = study["runs"][0]["id"]
        initial = request("GET", f"/api/runs/{run_id}")["state"]
        request("POST", f"/api/runs/{run_id}/control", {"action": "start"})
        deadline = time.monotonic() + 15
        while True:
            run = request("GET", f"/api/runs/{run_id}")
            if run["summary"]["status"] not in {"queued", "running", "pausing"}:
                break
            if time.monotonic() > deadline:
                raise TimeoutError("T08 development activation did not stop")
            time.sleep(0.005)
        checks = row["checks"]
        checks["status"] = run["summary"]["status"] == case["expected_status"]
        checks["turns"] = run["summary"]["turn"] == case["expected_turns"]
        checks["balances"] = sorted(run["state"]["balances"].values()) == case["expected_balances"]
        checks["requests"] = len(run["requests"]) == case["expected_requests"]
        checks["replay"] = (
            request("POST", f"/api/runs/{run_id}/verify")["verified_turns"]
            == case["expected_turns"]
        )
        checks["request_links"] = all(
            r["activation_id"] in {a["id"] for a in run["activations"]} for r in run["requests"]
        )
        if case["mode"] == "capabilities":
            checks["actual_capabilities"] = all(
                [op["kind"] for op in a["operations"]]
                == ["investigate", "retrieve", "plan", "investigate", "verify", "decide", "settle"]
                and a["operations"][2]["result"]["artifact"]["sources"]
                and a["operations"][4]["result"]["schema_valid"]
                and a["operations"][4]["result"]["checks"][0]["quote_present"]
                for a in run["activations"]
            )
        if case["expected_turns"] == 0:
            checks["atomic_failure"] = run["state"] == initial and run["events"] == []
        if case["mode"] == "unknown":
            checks["unknown_retained"] = (
                run["requests"][-1]["status"] == "unknown" and run["summary"]["usage"]["partial"]
            )
        row["usage"] = run["summary"]["usage"]
        row["passed"] = all(checks.values())
    except Exception as error:
        row["error"] = f"{type(error).__name__}: {error}"
    finally:
        if study_id:
            write_json(
                output / f"{case['id']}-export.json",
                client.get(f"/api/studies/{study_id}/export").json(),
            )
        with (output / "attempts.jsonl").open("a") as stream:
            stream.write(json.dumps(row) + "\n")
    return row


def run_trial(output):
    output.mkdir(parents=True, exist_ok=False)
    source = snapshot(output)
    suite = json.loads(CASES.read_text())
    package = Path(agent_sim.__file__).parent
    app_files = {
        str(path.relative_to(package)): hashlib.sha256(path.read_bytes()).hexdigest()
        for path in sorted(package.rglob("*.py"))
    }
    report = {
        "suite": suite,
        "suite_sha256": hashlib.sha256(CASES.read_bytes()).hexdigest(),
        "harness_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        "source": source,
        "application_source": {"path": str(package), "files": app_files},
        "live_requests": 0,
        "actual_spend_usd": 0,
        "runtime": {
            "python": sys.version,
            "packages": {
                name: version(name) for name in ["pydantic-ai-slim", "pydantic", "fastapi", "httpx"]
            },
        },
        "attempts": [],
    }
    write_json(output / "manifest.json", report)
    with (
        patch.dict(os.environ, {"OPENAI_API_KEY": "", "ANTHROPIC_API_KEY": ""}),
        patch.object(models, "ALLOW_MODEL_REQUESTS", False),
    ):
        app = create_app(f"sqlite:///{output.resolve()}/workspace.sqlite3", concurrent_runs=1)
        with TestClient(app, base_url="http://localhost") as client:
            for case in suite["cases"]:
                with patch.object(app.state.models, "model", return_value=provider(case)):
                    report["attempts"].append(exercise(client, case, suite, output))
            write_json(output / "settings.json", client.get("/api/settings").json())
    status = subprocess.check_output(["git", "status", "--short"], cwd=ROOT).decode().splitlines()
    report["source_unchanged"] = status == source["working_changes"] and all(
        (ROOT / name).is_file() and hashlib.sha256((ROOT / name).read_bytes()).hexdigest() == digest
        for name, digest in source["files"].items()
    )
    write_json(output / "report.json", report)
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    report = run_trial(parser.parse_args().output)
    print(
        json.dumps(
            {
                "output": str(report["source"]["head"]),
                "failed": [a["id"] for a in report["attempts"] if not a["passed"]],
            }
        )
    )
    sys.exit(
        0 if report["source_unchanged"] and all(a["passed"] for a in report["attempts"]) else 1
    )
