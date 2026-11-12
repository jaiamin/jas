"""Keyless DEVELOPMENT workflow evidence; never a live intelligence score."""

import argparse
import hashlib
import json
import os
import subprocess
import sys
import tarfile
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

from benchmarks.provenance import backend_digest
from benchmarks.provider_fixtures import output_args

ROOT = Path(__file__).resolve().parents[1]
CASES = ROOT / "benchmarks/research-cases.json"


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2) + "\n")


def snapshot(output):
    paths = (
        subprocess.check_output(
            ["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard"], cwd=ROOT
        )
        .decode()
        .split("\0")
    )
    files = {
        name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest()
        for name in sorted(set(paths))
        if name and (ROOT / name).is_file()
    }
    with tarfile.open(output / "source.tar.gz", "w:gz") as archive:
        for name in files:
            archive.add(ROOT / name, arcname=name)
    return {
        "head": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT).decode().strip(),
        "working_changes": subprocess.check_output(["git", "status", "--short"], cwd=ROOT)
        .decode()
        .splitlines(),
        "files": files,
        "tree_sha256": hashlib.sha256(json.dumps(files, sort_keys=True).encode()).hexdigest(),
        "archive_sha256": hashlib.sha256((output / "source.tar.gz").read_bytes()).hexdigest(),
        "backend_sha256": backend_digest(),
    }


def design_for(case):
    return {
        "title": case["id"],
        "question": case["request"],
        "environment": case["environment"],
        "profiles": [
            {
                "key": key,
                "name": key.upper(),
                "goal": "Inspect the rules and decide.",
                "role": "Authority",
            }
            for key in "abcdefghijkl"[: case["participants"]]
        ],
        "seeds": [case["seed"]],
        "rounds": case["rounds"],
        "repetitions": 1,
        "response_tokens": 512,
        "budget_usd": 1,
        "openai_reasoning_effort": "low",
        "conditions": [
            {
                "key": f"arm-{i}",
                "name": f"Arm {i}",
                "model": "openai:gpt-6-luna",
                "parameters": {**case["parameters"], **contrast},
            }
            for i, contrast in enumerate(case.get("contrasts", [{}]))
        ],
    }


def provider_for(case):
    async def respond(messages, info):
        observation = json.loads(messages[-1].parts[0].content)
        policy = case["policy"]
        kind, amount, target, promise = "", 0, "", None
        if policy == "offer-five-accept":
            kind = (
                "accept"
                if any(a["kind"] == "accept" for a in observation["legal_actions"])
                else "offer"
            )
            amount = 5 if kind == "offer" else 0
        elif policy == "choose-own-signal":
            kind, amount = "choose", observation["your_private_signal"]
        elif policy == "one-feasible-breach":
            kind = "contribute"
            if observation["round"] == 1:
                amount, promise = 2, 3
            else:
                amount = 0 if observation["you"]["key"] == "a" else 3
        elif policy == "allocate-four-workers-work":
            kind = "allocate" if observation["authority"] else "work"
            if kind == "allocate":
                amount, target = 4, "b"
        else:
            raise ValueError(f"Unknown deterministic policy: {policy}")
        decision = {
            "action": {
                "kind": kind,
                "amount": amount,
                "target": target,
                "message": "",
                "report": None,
                "promise": promise,
            },
            "memory": "",
            "rationale": "Scripted T01 correctness witness.",
            "forecast": None,
        }
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, output_args(info, decision))],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    return FunctionModel(function=respond)


def exercise(client, case, output, operations):
    def request(method, path, body=None):
        row = {
            "number": len(operations) + 1,
            "case_id": case["id"],
            "method": method,
            "path": path,
            "status": None,
        }
        try:
            response = client.request(method, path, json=body)
            row["status"] = response.status_code
            return response
        except Exception as error:
            row["error"] = type(error).__name__
            raise
        finally:
            operations.append(row)
            with (output / "operations.jsonl").open("a") as stream:
                stream.write(json.dumps(row) + "\n")

    def api(method, path, body=None):
        response = request(method, path, body)
        response.raise_for_status()
        return response.json()

    row = {"id": case["id"], "attempt": 1, "checks": {}, "run_stops": [], "stop_reason": "error"}
    checks = row["checks"]
    operation_start = len(operations)
    initial_usage, sid = None, None
    try:
        if not operations:
            write_json(output / "catalog.json", api("GET", "/api/catalog"))
        initial_usage = api("GET", "/api/settings")["usage"]
        initial = initial_usage["requests"]
        design = design_for(case)
        validation = request("POST", "/api/design/validate", {"design": design})
        expected = case["expected"]
        if "validation_status" in expected:
            row["rejection"] = validation.json()
            checks["expected_rejection"] = validation.status_code == expected["validation_status"]
            checks["rejection_scope"] = any(
                error["loc"] == expected["error_location"]
                for error in validation.json().get("detail", [])
            )
            row["stop_reason"] = "expected-schema-rejection"
        else:
            validation.raise_for_status()
            design = validation.json()
            write_json(output / f"{case['id']}-design.json", design)
            preflight = api("POST", "/api/design/preflight", {"design": design})
            write_json(output / f"{case['id']}-preflight.json", preflight)
            created = api("POST", "/api/studies", {"design": design})
            sid = created["id"]
            study = api("GET", f"/api/studies/{sid}")
            checks["save_does_not_spend"] = (
                api("GET", "/api/settings")["usage"]["requests"] == initial
            )
            for run in study["runs"]:
                i = int(run["condition_key"].removeprefix("arm-"))
                rid = run["id"]
                api("POST", f"/api/runs/{rid}/control", {"action": "step"})
                deadline = time.monotonic() + 10
                while True:
                    current = api("GET", f"/api/runs/{rid}")
                    if current["summary"]["status"] not in {"queued", "running", "pausing"}:
                        break
                    if time.monotonic() >= deadline:
                        raise TimeoutError("Step did not settle in ten seconds")
                    time.sleep(0.01)
                checks[f"arm-{i}-step"] = current["summary"]["turn"] == 1
                if current["summary"]["status"] == "failed":
                    row["run_stops"].append(current["summary"])
                    row["stop_reason"] = "failed"
                    break
                api("POST", f"/api/runs/{rid}/control", {"action": "pause"})
                checks[f"arm-{i}-pause"] = (
                    api("GET", f"/api/runs/{rid}")["summary"]["status"] == "paused"
                )
                api("POST", f"/api/runs/{rid}/control", {"action": "start"})
                deadline = time.monotonic() + 10
                while True:
                    current = api("GET", f"/api/runs/{rid}")
                    if current["summary"]["status"] not in {"queued", "running", "pausing"}:
                        break
                    if time.monotonic() >= deadline:
                        raise TimeoutError("Run did not settle in ten seconds")
                    time.sleep(0.01)
                checks[f"arm-{i}-complete"] = current["summary"]["status"] == "complete"
                row["run_stops"].append(current["summary"])
                if current["summary"]["status"] == "failed":
                    row["stop_reason"] = "failed"
                    break
                checks[f"arm-{i}-turns"] = current["summary"]["turn"] == expected["turns"]
                checks[f"arm-{i}-payoffs"] = (
                    sorted(current["state"]["balances"].values()) == expected["balances_sorted"]
                )
                verified = api("POST", f"/api/runs/{rid}/verify")
                checks[f"arm-{i}-replay"] = verified["verified_turns"] == expected["turns"]
                evidence = [
                    api("GET", f"/api/runs/{rid}/turns/{n}")
                    for n in range(1, current["summary"]["turn"] + 1)
                ]
                checks[f"arm-{i}-private-state"] = all(
                    "pending" not in e["observation"] and "truth" not in e["observation"]
                    for e in evidence
                )
                if "public_signal_counts" in expected:
                    checks[f"arm-{i}-disclosure"] = all(
                        len(e["observation"]["public_signals"])
                        == expected["public_signal_counts"][i]
                        for e in evidence
                    )
                if "eligible_commitments" in expected:
                    resolved = [
                        e["data"]
                        for turn in evidence
                        for e in turn["events"]
                        if e["kind"] == "commitment_resolved"
                    ]
                    checks["feasible-promises"] = (
                        sum(e["eligible"] for e in resolved) == expected["eligible_commitments"]
                    )
                    checks["fulfilled-promises"] = (
                        sum(e["fulfilled"] for e in resolved) == expected["fulfilled_commitments"]
                    )
                if "shared_output" in expected:
                    checks["work-output"] = (
                        current["state"]["shared_output"] == expected["shared_output"]
                    )
                    checks["permissions"] = all(
                        e["observation"]["authority"] == (e["actor"] == "a") for e in evidence
                    )
            export = api("GET", f"/api/studies/{sid}/export")
            row["export"] = f"{case['id']}-export.json"
            write_json(output / row["export"], export)
            checks["export-v4"] = export["format"] == "jas-study" and export["version"] == 4
            checks["one-request-per-turn"] = len(export["requests"]) == sum(
                expected["turns"] for _ in study["runs"]
            )
            if row["stop_reason"] != "failed":
                row["stop_reason"] = "complete" if all(checks.values()) else "check-failure"
    except Exception as error:
        row["error"] = f"{type(error).__name__}: {error}"
    finally:
        if sid is not None and "export" not in row:
            try:
                export = api("GET", f"/api/studies/{sid}/export")
                row["export"] = f"{case['id']}-export.json"
                write_json(output / row["export"], export)
            except Exception as error:
                row["export_error"] = type(error).__name__
        row["usage"] = dict.fromkeys(("requests", "input_tokens", "output_tokens", "cost_usd"))
        row["usage"]["partial"] = True
        try:
            settings = api("GET", "/api/settings")
            write_json(output / "settings.json", settings)
            usage = settings["usage"]
            if initial_usage is not None:
                row["usage"] = {
                    key: usage[key] - initial_usage[key]
                    for key in ("requests", "input_tokens", "output_tokens", "cost_usd")
                } | {"partial": usage["partial"]}
        except Exception as error:
            row["usage_error"] = type(error).__name__
        row["http_operations"] = len(operations) - operation_start
        if "validation_status" in case["expected"]:
            checks["rejection-does-not-spend"] = row["usage"]["requests"] == 0
        row["passed"] = (
            bool(checks)
            and all(checks.values())
            and "error" not in row
            and "usage_error" not in row
        )
        with (output / "attempts.jsonl").open("a") as stream:
            stream.write(json.dumps(row) + "\n")
    return row


def run_baseline(output):
    output = Path(output)
    output.mkdir(parents=True, exist_ok=False)
    suite = json.loads(CASES.read_text())
    source = snapshot(output)
    report = {
        "version": 1,
        "started": datetime.now(UTC).isoformat(),
        "evidence_kind": "deterministic-api-correctness",
        "live_requests": 0,
        "source": source,
        "runtime": {
            "python": sys.version,
            "packages": {name: version(name) for name in ("pydantic-ai-slim", "fastapi", "httpx")},
        },
        "suite_sha256": hashlib.sha256(CASES.read_bytes()).hexdigest(),
        "suite": suite,
        "harness": {
            "id": "t01-scripted-provider-v1",
            "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
            "provider": "pydantic-ai FunctionModel",
            "participant_model_label": "openai:gpt-6-luna",
            "researcher_model_label": "openai:gpt-6.1-sol",
            "reasoning_effort": "low",
            "usage_per_response": {"input_tokens": 100, "output_tokens": 50},
            "limits": "10s per control; single run; no live requests; no retries",
        },
        "attempts": [],
    }
    write_json(output / "manifest.json", report)
    operations = []
    with (
        patch.dict(
            os.environ,
            {
                "OPENAI_API_KEY": "",
                "ANTHROPIC_API_KEY": "",
                "JAS_CONCURRENT_REQUESTS": "1",
                "JAS_PLANNER_MODEL": "openai:gpt-6.1-sol",
                "JAS_ASSISTANT_MODEL": "openai:gpt-6.1-sol",
            },
        ),
        patch.object(models, "ALLOW_MODEL_REQUESTS", False),
    ):
        app = create_app(f"sqlite:///{output.resolve()}/workspace.sqlite3", concurrent_runs=1)
        with TestClient(app, base_url="http://localhost") as client:
            for case in suite["cases"]:
                with patch.object(app.state.models, "model", return_value=provider_for(case)):
                    report["attempts"].append(exercise(client, case, output, operations))
    settings_path = output / "settings.json"
    report["settings"] = json.loads(settings_path.read_text()) if settings_path.exists() else None
    report["http_operations"] = len(operations)
    report["source_unchanged"] = all(
        (ROOT / name).is_file() and hashlib.sha256((ROOT / name).read_bytes()).hexdigest() == digest
        for name, digest in source["files"].items()
    )
    report["finished"] = datetime.now(UTC).isoformat()
    write_json(output / "report.json", report)
    return report


def compare(before, after):
    for key in ("version", "suite_sha256", "harness", "evidence_kind"):
        if before[key] != after[key]:
            raise ValueError(f"Incomparable {key}; rerun both sources with the same cases/harness")
    if before.get("runtime") != after.get("runtime"):
        raise ValueError("Incomparable runtime; report dependency/toolchain changes separately")
    if not before.get("source_unchanged", True) or not after.get("source_unchanged", True):
        raise ValueError("Source changed during an attempt; use its archive and rerun")
    old, new = ({r["id"]: r for r in report["attempts"]} for report in (before, after))
    if old.keys() != new.keys() or any(
        len(rows) != len(report["attempts"]) for rows, report in ((old, before), (new, after))
    ):
        raise ValueError("Missing or duplicate case attempts")
    result = {
        "before_source": {k: v for k, v in before["source"].items() if k != "files"},
        "after_source": {k: v for k, v in after["source"].items() if k != "files"},
        "suite_sha256": before["suite_sha256"],
        "harness": before["harness"],
        "regressions": [],
        "improvements": [],
        "before_failures": [],
        "after_failures": [],
        "cases": [],
    }
    for key in old:
        a, b = old[key], new[key]
        if a["checks"].keys() != b["checks"].keys():
            raise ValueError(
                f"Changed checks for case {key}; retain failures and rerun both sources"
            )
        # Include the terminal outcome so exceptions cannot be hidden by earlier passing checks.
        for check in [*a["checks"], "passed"]:
            av = a["passed"] if check == "passed" else a["checks"][check]
            bv = b["passed"] if check == "passed" else b["checks"][check]
            label = f"{key}:{check}"
            if not av:
                result["before_failures"].append(label)
            if not bv:
                result["after_failures"].append(label)
            if av and not bv:
                result["regressions"].append(label)
            if bv and not av:
                result["improvements"].append(label)
        result["cases"].append(
            {
                "id": key,
                "before_stop": a["stop_reason"],
                "after_stop": b["stop_reason"],
                "before_usage": a["usage"],
                "after_usage": b["usage"],
            }
        )
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", help="New evidence directory; existing directories are refused")
    parser.add_argument(
        "--compare", nargs=2, metavar=("BEFORE", "AFTER"), help="Two report.json paths"
    )
    args = parser.parse_args()
    if args.compare:
        if args.output:
            parser.error("Use either --compare or --output")
        result = compare(*(json.loads(Path(p).read_text()) for p in args.compare))
        print(json.dumps(result, indent=2))
        raise SystemExit(1 if result["regressions"] or result["after_failures"] else 0)
    if not args.output:
        parser.error("--output is required for a baseline run")
    report = run_baseline(args.output)
    print(
        json.dumps(
            {
                "output": args.output,
                "attempts": len(report["attempts"]),
                "failures": [r["id"] for r in report["attempts"] if not r["passed"]],
            }
        )
    )
    raise SystemExit(
        0 if report["source_unchanged"] and all(r["passed"] for r in report["attempts"]) else 1
    )


if __name__ == "__main__":
    main()
