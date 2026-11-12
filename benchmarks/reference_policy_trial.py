"""Neutral T15 DEVELOPMENT trials through the public API; no live requests."""

import argparse
import hashlib
import json
import os
import time
from pathlib import Path
from unittest.mock import patch

from agent_sim.api import create_app
from fastapi.testclient import TestClient
from pydantic_ai import models
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.models.function import FunctionModel
from pydantic_ai.usage import RequestUsage

from benchmarks.provider_fixtures import output_args
from benchmarks.research_baseline import snapshot, write_json

CASES = Path(__file__).with_name("reference-policy-cases.json")


def provider():
    async def respond(messages, info):
        prompt = json.loads(messages[-1].parts[0].content)
        capable = "operations" in prompt
        history = prompt.get("operations", [])
        if capable and not history:
            value = {"operation": "observe", "decision": None}
        else:
            observation = history[0]["result"] if capable else prompt
            signal = "choices" in observation
            decision = {
                "action": {
                    "kind": "choose" if signal else "contribute",
                    "amount": observation["your_private_signal"] if signal else 0,
                    "target": "",
                    "message": "",
                    "report": None,
                    "promise": None,
                },
                "memory": "",
                "rationale": "T15 deterministic development witness; no intelligence claim.",
                "forecast": None,
            }
            value = {"operation": "decide", "decision": decision} if capable else decision
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, output_args(info, value))],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
            model_name="t15-development-v1",
        )

    return FunctionModel(function=respond)


def protocol(catalog, case):
    design = next(
        t["design"]
        for t in catalog["templates"]
        if t["design"]["environment"] == case["environment"]
    )
    design = json.loads(json.dumps(design))
    design.update(
        title=case["id"],
        question=case["expected"],
        profiles=design["profiles"][:2],
        rounds=1,
        seeds=case["seeds"],
        repetitions=case["repetitions"],
        response_tokens=512,
        openai_reasoning_effort="low",
        budget_usd=1,
    )
    base = design["conditions"][0]
    if case["environment"] == "commons":
        base["parameters"].update(endowment=4, multiplier=case["multiplier"])
    configurations = {
        "direct": {"kind": "direct_action"},
        "capable": {"kind": "tool_using", "max_requests": 2},
        "limited": {"kind": "tool_using", "max_requests": 1},
        "keep": {"kind": "scripted", "policy": "commons_keep_v1"},
        "half": {"kind": "scripted", "policy": "commons_half_v1"},
        "signal": {"kind": "scripted", "policy": "private_signal_v1"},
    }
    design["conditions"] = [
        dict(base, key=key, name=key, harness=configurations[key]) for key in case["conditions"]
    ]
    return design


def wait(client, run_id):
    deadline = time.monotonic() + 10
    while time.monotonic() < deadline:
        record = client.get(f"/api/runs/{run_id}").json()
        if record["summary"]["status"] not in {"queued", "running", "pausing"}:
            return record
        time.sleep(0.005)
    raise TimeoutError("Bounded development run did not stop")


def exercise(client, case, output):
    record = {"id": case["id"], "checks": {}, "stop_reason": "error"}
    study_id = None
    try:
        design = protocol(client.get("/api/catalog").json(), case)
        write_json(output / "design.json", design)
        saved = client.post("/api/studies", json={"design": design})
        write_json(output / "save.json", {"status": saved.status_code, "body": saved.json()})
        saved.raise_for_status()
        study_id = saved.json()["id"]
        study = client.get(f"/api/studies/{study_id}").json()
        runs = []
        for run in sorted(
            study["runs"], key=lambda r: (r["seed"], r["repetition"], r["condition_key"])
        ):
            action = "start"
            if case.get("missing") and run["seed"] == 853:
                if run["condition_key"] == "limited":
                    runs.append(client.get(f"/api/runs/{run['id']}").json())
                    continue
                if run["condition_key"] == "direct":
                    action = "step"
            client.post(
                f"/api/runs/{run['id']}/control", json={"action": action}
            ).raise_for_status()
            result = wait(client, run["id"])
            runs.append(result)
            if result["summary"]["turn"]:
                replay = client.post(f"/api/runs/{run['id']}/verify").json()
                assert replay["verified_turns"] == result["summary"]["turn"]
        write_json(output / "runs.json", runs)
        study = client.get(f"/api/studies/{study_id}").json()
        checks = record["checks"]
        scripted = [r for r in runs if r["harness"]["kind"] == "scripted"]
        checks["no-scripted-provider-work"] = bool(scripted) and all(
            not r["requests"] and r["summary"]["usage"]["requests"] == 0 for r in scripted
        )
        checks["luna-model-participants"] = all(
            a["identity"]["model"] == "openai:gpt-6-luna"
            for r in runs
            if r not in scripted
            for a in r["activations"]
        )
        checks["uncertainty-withheld"] = (
            all(e["interval"] is None for e in study["effects"])
            and study["comparison"]["independent_support"] is None
        )
        # No reports/promises are issued in these cases. Their conditional endpoints
        # are undefined, so T06 correctly excludes those pairs from inference.
        eligible = (
            {"contribution_rate", "group_payoff"}
            if case["environment"] == "commons"
            else {"accuracy", "signal_override_rate"}
        )
        if case.get("missing"):
            conditions = {c["condition_key"]: c for c in study["comparison"]["conditions"]}
            checks["missingness-retained"] = (
                conditions["limited"]["failed"] == 1
                and conditions["limited"]["ready"] == 1
                and conditions["direct"]["interrupted"] == 1
                and conditions["keep"]["unmatched"] == 1
            )
            checks["no-fallback"] = all(
                r["summary"]["turn"] == 0
                and r["summary"]["usage"]["requests"] == 1
                and r["activations"][0]["stop_reason"] == "request_limit"
                for r in runs
                if r["summary"]["status"] == "failed"
            )
            checks["matching"] = all(
                e["pairs"] == (1 if e["condition_key"] == "keep" and e["metric"] in eligible else 0)
                for e in study["effects"]
            )
        else:
            checks["complete-matrix"] = all(r["summary"]["status"] == "complete" for r in runs)
            checks["matching"] = all(
                (
                    e["pairs"] == len(case["seeds"]) * case["repetitions"]
                    and e["seeds"] == len(case["seeds"])
                )
                if e["metric"] in eligible
                else e["pairs"] == 0 and e["mean"] is None
                for e in study["effects"]
            )
            if case["environment"] == "commons":
                rates = {
                    r["condition_key"]: r["mean"]
                    for r in study["results"]
                    if r["metric"] == "contribution_rate"
                }
                checks["actual-behavior"] = rates == {
                    "direct": 0,
                    "capable": 0,
                    "keep": 0,
                    "half": 0.5,
                }
                balances = {
                    r["summary"]["condition_key"]: sorted(r["state"]["balances"].values())
                    for r in runs
                }
                checks["neutral-null-or-simple-win"] = (
                    balances["half"] == balances["direct"]
                    if case["multiplier"] == 1
                    else min(balances["half"]) > max(balances["direct"])
                )
            else:
                exported = client.get(f"/api/studies/{study_id}/export").json()
                checks["own-signal-only"] = all(
                    t["decision"]["action"]["amount"] == t["observation"]["your_private_signal"]
                    for r in exported["runs"]
                    for t in r["evidence"]
                    if t["number"] > 0
                )
                checks["null-contrast"] = all(
                    e["mean"] == (0 if e["metric"] in eligible else None) for e in study["effects"]
                )
        checks["mechanics-replay"] = True
        write_json(output / "study.json", study)
        record["stop_reason"] = "complete" if all(checks.values()) else "check-failure"
    except Exception as error:
        record["error"] = f"{type(error).__name__}: {error}"
    finally:
        if study_id:
            write_json(output / "export.json", client.get(f"/api/studies/{study_id}/export").json())
        record["passed"] = (
            bool(record["checks"]) and all(record["checks"].values()) and "error" not in record
        )
        write_json(output / "attempt.json", record)
    return record


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=False)
    suite = json.loads(CASES.read_text())
    report = {
        "version": 1,
        "live_requests": 0,
        "suite_sha256": hashlib.sha256(CASES.read_bytes()).hexdigest(),
        "harness_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        "source": snapshot(args.output),
        "attempts": [],
    }
    with (
        patch.dict(os.environ, {"OPENAI_API_KEY": "", "ANTHROPIC_API_KEY": ""}),
        patch.object(models, "ALLOW_MODEL_REQUESTS", False),
    ):
        app = create_app(
            f"sqlite:///{args.output.resolve()}/workspace.sqlite3",
            static_dir=args.output / "static",
        )
        with (
            patch.object(app.state.models, "model", return_value=provider()),
            TestClient(app, base_url="http://localhost") as client,
        ):
            for case in suite["cases"]:
                out = args.output / case["id"]
                out.mkdir()
                report["attempts"].append(exercise(client, case, out))
    write_json(args.output / "report.json", report)
    print(
        json.dumps(
            {
                "cases": len(report["attempts"]),
                "passed": sum(a["passed"] for a in report["attempts"]),
                "live_requests": 0,
            }
        )
    )
    raise SystemExit(0 if all(a["passed"] for a in report["attempts"]) else 1)


if __name__ == "__main__":
    main()
