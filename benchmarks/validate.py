"""Explicit, metered live evaluation of study design and capability honesty."""

import argparse
import json
import time
from pathlib import Path

import httpx

MEASURES = {
    "contribution_rate",
    "false_report_rate",
    "promise_fulfillment_rate",
    "return_rate",
    "payoff",
    "forecast_error",
    "completion_rate",
    "duplicate_work_rate",
}


def assess(case: dict, output: dict) -> dict[str, bool]:
    design = output.get("design") or {}
    expected = case["environment"]
    supported = case.get("supported", expected is not None)
    checks = {"capability_honesty": output.get("supported") == supported}
    if case.get("allow_decline") and output.get("supported") is False:
        return {
            "explicit_capability_limit": bool(output.get("explanation")),
            "no_invented_protocol": output.get("design") is None,
        }
    if not supported:
        checks["no_invented_protocol"] = output.get("design") is None
        return checks
    accepted = expected if isinstance(expected, list) else [expected]
    checks["adapter"] = design.get("environment") in accepted
    required = set(case["required"])
    conditions = design.get("conditions", [])
    checks["independent_seeds"] = len(set(design.get("seeds", []))) >= 3
    checks["requested_measures"] = (required & MEASURES) <= set(design.get("measures", []))
    if case.get("any_measures"):
        checks["relevant_outcome"] = bool(
            set(case["any_measures"]) & set(design.get("measures", []))
        )
    if "conditions" in required:
        checks["conditions"] = len(conditions) >= 2
    for factor in required & {"endowment", "multiplier", "memory", "communication"}:
        if "conditions" in required or factor in {"memory", "communication"}:
            values = {c.get("parameters", {}).get(factor) for c in conditions}
            checks[f"manipulates_{factor}"] = len(values) >= 2
    if "model" in required:
        checks["distinct_models"] = len({c.get("model") for c in conditions}) >= 2
    for feature, field in [("roles", "role"), ("goals", "goal")]:
        if feature in required and "conditions" in required:
            base = {p["key"]: p for p in design.get("profiles", [])}
            variants = [
                tuple(
                    sorted(
                        (
                            key,
                            {
                                **p,
                                **next(
                                    (x for x in c.get("profile_overrides", []) if x["key"] == key),
                                    {},
                                ),
                            }.get(field),
                        )
                        for key, p in base.items()
                    )
                )
                for c in conditions
            ]
            checks[f"manipulates_{feature}"] = len(set(variants)) >= 2
    return checks


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", action="store_true", required=True)
    parser.add_argument("--url", default="http://127.0.0.1:8081")
    parser.add_argument("--limit-usd", type=float, default=4)
    parser.add_argument("--cases", type=int, default=26)
    parser.add_argument("--ids", nargs="*")
    args = parser.parse_args()
    cases = json.loads(Path("benchmarks/questions.json").read_text())[: args.cases]
    if args.ids:
        cases = [c for c in cases if c["id"] in args.ids]
    client = httpx.Client(base_url=args.url, timeout=30)
    initial = client.get("/api/settings").json()["charged_usd"]
    records = []
    report = {"kind": "live OpenAI study-design benchmark", "cases": records, "passed": 0}
    for case in cases:
        spent = client.get("/api/settings").json()["charged_usd"] - initial
        if spent > args.limit_usd - 0.5:
            records.append({"id": case["id"], "status": "budget_stop"})
            break
        response = client.post("/api/plan", json={"question": case["question"]})
        response.raise_for_status()
        key = response.json()["id"]
        deadline = time.monotonic() + 180
        while time.monotonic() < deadline:
            result = client.get(f"/api/analyses/{key}").json()
            if result["status"] != "pending":
                break
            time.sleep(0.5)
        output = result.get("output") or {}
        checks = assess(case, output)
        status = "pass" if result["status"] == "complete" and all(checks.values()) else "fail"
        records.append(
            {
                "id": case["id"],
                "question": case["question"],
                "status": status,
                "analysis_id": key,
                "checks": checks,
                "capability_gap": case.get("gap"),
                "output": output,
                "error": result.get("error"),
                "usage": result.get("usage"),
            }
        )
        # The app ledger includes concurrent experiments; report these separately below.
        report = {
            "kind": "live OpenAI study-design benchmark",
            "cases": records,
            "passed": sum(r["status"] == "pass" for r in records),
        }
        Path("benchmarks/results.json").write_text(json.dumps(report, indent=2) + "\n")
        print(case["id"], status, flush=True)
    cost = sum((r.get("usage") or {}).get("cost_usd", 0) for r in records)
    client.close()
    report["cost_usd"] = cost
    Path("benchmarks/results.json").write_text(json.dumps(report, indent=2) + "\n")
    print(
        json.dumps({"passed": report["passed"], "total": len(records), "cost_usd": cost}),
        flush=True,
    )


if __name__ == "__main__":
    main()
