"""Real API planner and engine trials, sharing a persistent aggregate spending ledger."""

import argparse
import asyncio
import fcntl
import gzip
import hashlib
import json
import os
import random
import sqlite3
import subprocess
import time
from collections import Counter
from pathlib import Path

import httpx
from agent_sim.api import create_app
from agent_sim.db import Measurement, ProviderCall, Turn, Workspace
from agent_sim.domain import Design
from dotenv import load_dotenv
from sqlalchemy import select

from benchmarks.cases import MODEL, cases, fingerprint
from benchmarks.oracles import score_trace
from benchmarks.provenance import backend_digest
from benchmarks.quality import assess

ROOT = Path(__file__).resolve().parents[1]


def source_digest() -> str:
    paths = sorted((ROOT / "backend/src").rglob("*.py")) + sorted(
        (ROOT / "benchmarks").glob("*.py")
    )
    return hashlib.sha256(
        b"".join(str(p.relative_to(ROOT)).encode() + p.read_bytes() for p in paths)
    ).hexdigest()


async def planner_trial(app, client, case) -> dict:
    response = await client.post("/api/chats", json={"question": case.prompt, "context": "new"})
    response.raise_for_status()
    key = response.json()["id"]
    await app.state.assistants.tasks[key]
    record = app.state.assistants.get(key)
    return {
        "id": case.id,
        "family": case.family.key,
        "analysis_id": key,
        "checks": {
            "complete": record["status"] == "complete",
            **assess(case, record.get("output") or {}),
        },
        "evidence": record,
    }


async def participant_trial(app, case, mode: str, repetition: int) -> dict:
    design = case.design()
    # All arms keep a 24-decision allowance; bargaining may terminate early.
    data = design.model_dump()
    data.update(rounds=max(2, 24 // case.agents), repetitions=1)
    data["conditions"] = data["conditions"][:1]
    params = data["conditions"][0]["parameters"]
    if mode.startswith("memory-"):
        params["memory"] = mode.removeprefix("memory-")
    elif mode == "no-communication":
        params["communication"] = False
    elif mode == "medium-effort":
        data["openai_reasoning_effort"] = "medium"
    design = Design.model_validate(data)
    study_id = app.state.research.save_design(design)
    run_id = app.state.research.operational_runs(study_id)[0].id
    initial = app.state.research.evidence(run_id, 0)["checkpoint"]
    app.state.engine.start(run_id)
    await app.state.engine.executions[run_id].task
    record, _, _ = app.state.research.configuration(run_id)
    replay = app.state.engine.replay(run_id)
    with app.state.db.session() as session:
        turns = session.scalars(
            select(Turn).where(Turn.run_id == run_id).order_by(Turn.number)
        ).all()
        measures = session.scalars(select(Measurement).where(Measurement.run_id == run_id)).all()
    rows = []
    for turn in turns:
        evidence = app.state.research.evidence(run_id, turn.number)
        rows.append(
            dict(
                actor=turn.actor,
                observation=turn.observation,
                decision=turn.decision,
                checkpoint=turn.checkpoint,
                events=evidence["events"],
                measures=[
                    dict(key=m.key, value=m.value) for m in measures if m.turn == turn.number
                ],
            )
        )
    return {
        "id": case.id,
        "family": case.family.key,
        "run_id": run_id,
        "mode": mode,
        "agents": case.agents,
        "seed": case.seed,
        "repetition": repetition,
        "rounds": design.rounds,
        "decision_allowance": design.turn_count,
        "status": record.status,
        "error": record.error,
        "replay": replay,
        "checks": {
            "complete": record.status == "complete",
            "replay": replay["verified_turns"] == len(rows),
        },
        "behavior": score_trace(rows, initial),
        "usage": app.state.models.usage(run_id=run_id),
        "trace": rows,
    }


async def run(args) -> dict:
    output = Path(args.output)
    gate = json.loads(await asyncio.to_thread(Path(args.gate).read_text))
    if (
        gate["failures"]
        or gate["backend_sha256"] != backend_digest()
        or gate["suite_sha256"] != fingerprint()
        or gate["cases"] != 288
    ):
        raise ValueError("Fresh complete validity gate must pass before paid evaluation")
    await asyncio.to_thread(output.mkdir, parents=True, exist_ok=False)
    selected = cases(args.split)
    if args.variants:
        selected = [c for c in selected if int(c.id.rsplit("-", 1)[1]) in args.variants]
    if args.families:
        selected = [c for c in selected if c.family.key in args.families]
    if args.limit:
        selected = selected[: args.limit]
    if not selected:
        raise ValueError("No selected cases")
    if args.kind == "participants":
        selected = [c for c in selected if c.family.environment]
    if args.split == "heldout":
        final = json.loads((ROOT / "benchmarks/final-checkpoint.json").read_text())
        if final["source_sha256"] != source_digest() or final["suite_sha256"] != fingerprint():
            raise ValueError("Final checkpoint does not match source/suite")
    db_path = await asyncio.to_thread(Path(args.database).resolve)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    # File lock remains held for the entire app lifespan: no competing evaluator/recovery.
    with db_path.with_suffix(".lock").open("w") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        if db_path.exists():
            with sqlite3.connect(db_path) as db:
                (cap,) = db.execute("SELECT ceiling FROM workspace WHERE id=1").fetchone()
                if cap > 75_000_000:
                    raise ValueError("Existing ledger has a ceiling above the authorized cap")
        cap = 75 if args.split == "heldout" else 60
        manifest = dict(
            suite_sha256=fingerprint(),
            source_sha256=source_digest(),
            model=MODEL,
            checkpoint=args.checkpoint,
            split=args.split,
            kind=args.kind,
            database=str(db_path),
            aggregate_cap_usd=75,
            phase_ceiling_usd=cap,
            selected=[c.id for c in selected],
            modes=args.modes,
            repetitions=args.repetitions,
            concurrency=args.concurrency,
            git_head=(
                await asyncio.to_thread(
                    subprocess.check_output, ["git", "rev-parse", "HEAD"], text=True
                )
            ).strip(),
        )
        (output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
        app = create_app(f"sqlite:///{db_path}", budget_usd=cap, concurrent_runs=args.concurrency)
        generate = app.state.models.generate

        async def luna_only(output_type, **kwargs):
            if kwargs["model"] != MODEL or kwargs.get("web_search"):
                raise ValueError("Evaluation permits only Luna without paid external tools")
            return await generate(output_type, **kwargs)

        app.state.models.generate = luna_only
        records = []
        capacity = asyncio.Semaphore(args.concurrency)
        async with app.router.lifespan_context(app):
            async with httpx.AsyncClient(
                transport=httpx.ASGITransport(app=app), base_url="http://localhost", timeout=1800
            ) as client:

                async def trial(case, mode, repetition):
                    async with capacity:
                        started = time.monotonic()
                        try:
                            result = await (
                                planner_trial(app, client, case)
                                if args.kind == "planner"
                                else participant_trial(app, case, mode, repetition)
                            )
                        except Exception as e:
                            # Provider exception bodies can contain credentials; class only.
                            result = dict(
                                id=case.id,
                                family=case.family.key,
                                mode=mode,
                                repetition=repetition,
                                checks={"complete": False},
                                error=type(e).__name__,
                            )
                        result["seconds"] = round(time.monotonic() - started, 3)
                        result.update(mode=mode, repetition=repetition)
                        result["passed"] = all(result["checks"].values())
                        records.append(result)
                        with gzip.open(output / "attempts.jsonl.gz", "at") as stream:
                            stream.write(json.dumps(result) + "\n")
                        print(
                            case.id,
                            mode,
                            repetition,
                            "PASS" if result["passed"] else "FAIL",
                            [k for k, v in result["checks"].items() if not v],
                            flush=True,
                        )

                jobs = [
                    (c, m, r)
                    for c in selected
                    for m in (args.modes if args.kind == "participants" else ["planner"])
                    for r in range(args.repetitions)
                ]
                random.Random(20261108).shuffle(jobs)
                await asyncio.gather(*(trial(*job) for job in jobs))
            with app.state.db.session() as session:
                ledger = session.get_one(Workspace, 1)
                calls = session.scalars(select(ProviderCall)).all()
                assert all(c.model == MODEL for c in calls), "Non-Luna evaluation call"
                usage = app.state.models.usage()
                with gzip.open(output / "provider-calls.jsonl.gz", "wt") as stream:
                    for c in calls:
                        stream.write(
                            json.dumps(
                                dict(
                                    id=c.id,
                                    purpose=c.purpose,
                                    model=c.model,
                                    analysis_id=c.analysis_id,
                                    run_id=c.run_id,
                                    status=c.status,
                                    reserved=c.reserved,
                                    charged=c.charged,
                                    input_tokens=c.input_tokens,
                                    output_tokens=c.output_tokens,
                                    request=c.request_payload,
                                    response=c.response_payload,
                                    error=c.error,
                                )
                            )
                            + "\n"
                        )
                assert ledger.charged <= 75_000_000, "Aggregate cap exceeded"
            counts = Counter(k for r in records for k, v in r["checks"].items() if not v)
            summary = dict(
                manifest=manifest,
                attempted=len(records),
                passed=sum(r["passed"] for r in records),
                failures=dict(counts),
                ledger=usage,
                by_family={
                    f: dict(
                        attempted=sum(r["family"] == f for r in records),
                        passed=sum(r["family"] == f and r["passed"] for r in records),
                    )
                    for f in {c.family.key for c in selected}
                },
            )
            (output / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
            print(json.dumps(summary), flush=True)
            return summary


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--live", action="store_true", required=True)
    parser.add_argument("--checkpoint", required=True)
    parser.add_argument("--split", choices=["development", "heldout"], default="development")
    parser.add_argument("--kind", choices=["planner", "participants"], default="planner")
    parser.add_argument("--database", default="data/quality/aggregate.sqlite3")
    parser.add_argument("--gate", default="data/quality/preflight/validity.json")
    parser.add_argument("--output", required=True)
    parser.add_argument("--variants", nargs="+", type=int)
    parser.add_argument("--families", nargs="+")
    parser.add_argument("--limit", type=int)
    parser.add_argument("--repetitions", type=int, default=1, choices=range(1, 4))
    parser.add_argument("--concurrency", type=int, default=4, choices=range(1, 9))
    parser.add_argument(
        "--modes",
        nargs="+",
        default=["baseline"],
        choices=[
            "baseline",
            "no-communication",
            "memory-none",
            "memory-history",
            "memory-notes",
            "memory-episodic",
            "medium-effort",
        ],
    )
    args = parser.parse_args()
    load_dotenv(ROOT / ".env", override=True, interpolate=False)
    os.environ["JAS_PLANNER_MODEL"] = MODEL
    asyncio.run(run(args))


if __name__ == "__main__":
    main()
