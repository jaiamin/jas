"""Inspect-backed application evaluation; paid calls require --live."""

import argparse
import asyncio
import hashlib
import json
import os
import subprocess
import time
from collections import Counter
from pathlib import Path

import httpx
from agent_sim.api import create_app
from dotenv import load_dotenv
from inspect_ai import Task, eval_async
from inspect_ai.dataset import Sample
from inspect_ai.model import ModelOutput
from inspect_ai.scorer import Score, accuracy, scorer, stderr
from inspect_ai.solver import solver
from suite import Case, assess, cases, fingerprint


@scorer(metrics=[accuracy(), stderr()])
def workflow():
    async def score(state, target):
        result = state.metadata["result"]
        return Score(
            value=int(result["passed"]), metadata=result["checks"], explanation=result.get("error")
        )

    return score


async def wait_for(client, path, ready):
    async with asyncio.timeout(1800):
        while True:
            response = await client.get(path)
            response.raise_for_status()
            data = response.json()
            if ready(data):
                return data
            await asyncio.sleep(0.25)


async def evaluate(client, case, record):
    record.update(
        {
            "id": case.id,
            "split": case.split,
            "environment": case.environment,
            "question": case.question,
            "checks": {},
            "runs": [],
            "passed": False,
        }
    )
    response = await client.post("/api/plan", json={"question": case.prompt})
    response.raise_for_status()
    key = response.json()["id"]
    record["analysis_id"] = key
    plan = await wait_for(client, f"/api/analyses/{key}", lambda a: a["status"] != "pending")
    record["planning"] = plan
    record["checks"] = {
        "planning_complete": plan["status"] == "complete",
        **assess(case, plan.get("output") or {}),
    }
    if plan["status"] != "complete":
        record["error"] = plan.get("error")
        return record
    design = (plan.get("output") or {}).get("design")
    if design and record["checks"].get("model"):
        response = await client.post("/api/studies", json={"design": design, "plan_id": key})
        response.raise_for_status()
        study = response.json()["id"]
        record["study_id"] = study
        response = await client.post(f"/api/studies/{study}/control", json={"action": "start"})
        response.raise_for_status()
        detail = await wait_for(
            client,
            f"/api/studies/{study}",
            lambda d: all(r["status"] in {"complete", "failed", "paused"} for r in d["runs"]),
        )
        record["runs"] = detail["runs"]
        record["results"] = detail["results"]
        record["effects"] = detail["effects"]
        record["checks"]["matrix_complete"] = all(r["status"] == "complete" for r in detail["runs"])
        replay = []
        for run in detail["runs"]:
            response = await client.post(f"/api/runs/{run['id']}/verify")
            response.raise_for_status()
            replay.append(response.json())
        record["replay"] = replay
        record["checks"]["exact_replay"] = all(
            x["verified_turns"] == r["turn"] and x["model_requests"] == 0
            for x, r in zip(replay, detail["runs"], strict=True)
        )
        response = await client.get(f"/api/studies/{study}/export")
        response.raise_for_status()
        export = response.json()
        record["checks"]["export"] = bool(export.get("revisions")) and bool(export.get("runs"))
        record["checks"]["outcomes"] = bool(detail["results"])
        record["usage"] = detail["usage"]
    record["passed"] = all(record["checks"].values())
    return record


async def run(args):
    selected = [
        c
        for c in cases()
        if (not args.split or c.split in args.split) and (not args.ids or c.id in args.ids)
    ]
    if args.limit:
        selected = selected[: args.limit]
    output = Path(args.output)
    await asyncio.to_thread(output.mkdir, parents=True, exist_ok=True)
    records_file = output / "attempts.jsonl"
    prior = (
        [json.loads(line) for line in records_file.read_text().splitlines()]
        if records_file.exists()
        else []
    )
    attempted = {r["id"] for r in prior}
    selected = [c for c in selected if c.id not in attempted]
    if not selected:
        print("No unattempted cases. Use a new output directory for an explicit retest.")
        return
    database = await asyncio.to_thread(Path(args.database).resolve)
    app = create_app(
        f"sqlite:///{database}", budget_usd=args.budget_usd, concurrent_runs=args.concurrency
    )
    app.state.models.capacity = asyncio.Semaphore(args.concurrency)
    git_head = await asyncio.to_thread(
        subprocess.check_output, ["git", "rev-parse", "HEAD"], text=True
    )

    def source_digest():
        source_hash = hashlib.sha256()
        paths = sorted(Path("backend/src/agent_sim").glob("*.py"))
        for source in paths + [Path(__file__), Path(__file__).with_name("suite.py")]:
            source_hash.update(source.read_bytes())
        return source_hash.hexdigest()

    source_hash = await asyncio.to_thread(source_digest)
    manifest = {
        "suite_sha256": fingerprint(),
        "model": "openai:gpt-6-luna",
        "harness_model": "mockllm/model (no provider calls)",
        "git_head": git_head.strip(),
        "source_sha256": source_hash,
        "database": args.database,
        "budget_usd": args.budget_usd,
        "concurrency": args.concurrency,
        "cases": [c.model_dump() for c in selected],
        "provider_retries": 0,
    }
    manifest_file = output / "manifest.json"
    if manifest_file.exists():
        previous = json.loads(manifest_file.read_text())
        for field in ["suite_sha256", "source_sha256", "model", "database", "budget_usd"]:
            if previous.get(field) != manifest[field]:
                raise ValueError(f"{field} changed: use a new output directory")
    else:
        manifest_file.write_text(json.dumps(manifest, indent=2) + "\n")
    records = prior.copy()
    async with app.router.lifespan_context(app):
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://ass.test", timeout=60
        ) as client:

            @solver
            def application():
                async def solve(state, generate):
                    case = Case.model_validate(state.metadata["case"])
                    started = time.monotonic()
                    result = {}
                    try:
                        result = await evaluate(client, case, result)
                    except Exception as error:
                        result.update(
                            {
                                "id": case.id,
                                "split": case.split,
                                "environment": case.environment,
                                "passed": False,
                                "checks": {**result.get("checks", {}), "workflow": False},
                                "error": f"{type(error).__name__}: {error}",
                            }
                        )
                    result["seconds"] = round(time.monotonic() - started, 3)
                    records.append(result)
                    with records_file.open("a") as stream:
                        stream.write(json.dumps(result) + "\n")
                    state.metadata["result"] = result
                    state.output = ModelOutput.from_content("openai:gpt-6-luna", json.dumps(result))
                    print(
                        case.id,
                        "PASS" if result["passed"] else "FAIL",
                        [k for k, v in result["checks"].items() if not v],
                        flush=True,
                    )
                    return state

                return solve

            task = Task(
                name="ass-e2e",
                version="1",
                solver=application(),
                scorer=workflow(),
                dataset=[
                    Sample(id=c.id, input=c.prompt, metadata={"case": c.model_dump()})
                    for c in selected
                ],
            )
            await eval_async(
                task,
                model="mockllm/model",
                max_samples=args.concurrency,
                retry_on_error=0,
                fail_on_error=False,
                log_dir=str(output / "inspect"),
                log_format="eval",
            )
            settings = (await client.get("/api/settings")).json()
            summary = {
                "suite_sha256": fingerprint(),
                "model": "openai:gpt-6-luna",
                "attempted": len(records),
                "passed": sum(r["passed"] for r in records),
                "failures": dict(
                    Counter(k for r in records for k, v in r["checks"].items() if not v)
                ),
                "by_split": {
                    split: {
                        "attempted": sum(r["split"] == split for r in records),
                        "passed": sum(r["split"] == split and r["passed"] for r in records),
                    }
                    for split in {c.split for c in cases()}
                },
                "completed_runs": sum(
                    run["status"] == "complete" for r in records for run in r.get("runs", [])
                ),
                "replayed_turns": sum(
                    x["verified_turns"] for r in records for x in r.get("replay", [])
                ),
                "ledger": settings["usage"],
                "limits": "Workflow/mechanic checks, not human validity or proof of motives.",
            }
            (output / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
            print(json.dumps(summary), flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--live", action="store_true", required=True)
    parser.add_argument(
        "--split",
        nargs="*",
        choices=["development", "generalization", "longitudinal", "capability"],
    )
    parser.add_argument("--ids", nargs="*")
    parser.add_argument("--limit", type=int)
    parser.add_argument("--output", required=True)
    parser.add_argument("--database", default="data/evaluation.sqlite3")
    parser.add_argument("--budget-usd", type=float, default=18)
    parser.add_argument("--concurrency", type=int, choices=range(1, 17), default=8)
    args = parser.parse_args()
    load_dotenv(Path.cwd() / ".env", override=True, interpolate=False)
    os.environ["ASS_PLANNER_MODEL"] = "openai:gpt-6-luna"
    os.environ["PYDANTIC_AI_NO_BANNER"] = "1"
    asyncio.run(run(args))


if __name__ == "__main__":
    main()
