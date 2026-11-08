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
import tarfile
import time
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path

import httpx
from agent_sim.api import create_app
from agent_sim.db import Measurement, ProviderCall, Turn, Workspace
from agent_sim.domain import Design
from dotenv import load_dotenv
from sqlalchemy import select

from benchmarks.analysis import analysis_trial
from benchmarks.cases import MODEL, cases, fingerprint
from benchmarks.oracles import score_trace
from benchmarks.provenance import backend_digest, gate_digest
from benchmarks.quality import assess

ROOT = Path(__file__).resolve().parents[1]


def source_paths() -> list[Path]:
    return (
        sorted((ROOT / "backend/src").rglob("*.py"))
        + sorted((ROOT / "benchmarks").glob("*.py"))
        + sorted(p for p in (ROOT / "frontend/src").rglob("*") if p.is_file())
        + [
            ROOT / p
            for p in (
                "pyproject.toml",
                "uv.lock",
                "frontend/package.json",
                "frontend/pnpm-lock.yaml",
                "Dockerfile",
                "compose.yaml",
                ".env.example",
                "benchmarks/quality-cases.jsonl",
                "benchmarks/families.json",
                "benchmarks/protocol.md",
            )
        ]
        + sorted(p for p in (ROOT / "frontend/public").rglob("*") if p.is_file())
    )


def source_digest() -> str:
    return hashlib.sha256(
        b"".join(str(p.relative_to(ROOT)).encode() + p.read_bytes() for p in source_paths())
    ).hexdigest()


def evaluation_config(args, selected) -> dict:
    return dict(
        selected=[c.id for c in selected],
        modes=args.modes if args.kind == "participants" else [args.kind],
        repetitions=args.repetitions,
        concurrency=args.concurrency,
        request_concurrency=args.request_concurrency,
    )


def validate_final(args, selected, final: dict) -> None:
    if final["source_sha256"] != source_digest() or final["suite_sha256"] != fingerprint():
        raise ValueError("Final checkpoint does not match source/suite")
    if final["evaluations"].get(args.kind) != evaluation_config(args, selected):
        raise ValueError("Held-out configuration differs from the declared final evaluation")


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


async def participant_trial(app, case, mode: str, repetition: int, arm: int, studies: dict) -> dict:
    design = case.design()
    # Equal 48-decision allowances preserve round-three shocks even with 12 agents.
    data = design.model_dump()
    data.update(rounds=max(2, 48 // case.agents), repetitions=1)
    for condition in data["conditions"]:
        params = condition["parameters"]
        if mode.startswith("memory-"):
            if case.family.factor == "memory":
                raise ValueError("A configuration must not erase the intended memory intervention")
            params["memory"] = mode.removeprefix("memory-")
        elif mode == "no-communication":
            if case.family.factor in {"communication", "communication_channels"}:
                raise ValueError("A configuration must not erase the communication intervention")
            params["communication"] = False
        elif mode == "medium-effort":
            data["openai_reasoning_effort"] = "medium"
    design = Design.model_validate(data)
    key = (case.id, mode, repetition)
    if key not in studies:
        studies[key] = app.state.research.save_design(design)
    study_id = studies[key]
    run_id = next(
        r["id"]
        for r in app.state.research.study(study_id)["runs"]
        if r["condition_key"] == design.conditions[arm].key
    )
    params = data["conditions"][arm]["parameters"]
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
        "study_id": study_id,
        "mode": mode,
        "arm": arm,
        "parameters": params,
        "agents": case.agents,
        "seed": case.seed,
        "repetition": repetition,
        "rounds": design.rounds,
        "decision_allowance": design.rounds * len(design.profiles),
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
    started = time.monotonic()
    started_utc = datetime.now(UTC).isoformat()
    output = Path(args.output)
    gate = json.loads(await asyncio.to_thread(Path(args.gate).read_text))
    if (
        gate["failures"]
        or gate.get("gate_sha256") != gate_digest()
        or gate["backend_sha256"] != backend_digest()
        or gate["suite_sha256"] != fingerprint()
        or gate["cases"] != 288
        or len(gate.get("records", [])) != 576
        or any(
            not all(value is True for value in row["checks"].values())
            for row in gate.get("records", [])
        )
        or len(gate.get("privacy_matrix", [])) != 28
        or any(row["checks"] != row["passed"] for row in gate.get("privacy_matrix", []))
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
    if args.kind in {"participants", "analysis"}:
        selected = [c for c in selected if c.family.environment]
    if args.split == "heldout":
        final = json.loads((ROOT / "benchmarks/final-checkpoint.json").read_text())
        validate_final(args, selected, final)
    sources = {}
    if args.kind == "analysis":
        with gzip.open(args.source_runs, "rt") as stream:
            sources = {
                (r["id"], r["repetition"], r["arm"]): r
                for line in stream
                if (r := json.loads(line)).get("mode") == "baseline" and "trace" in r
            }
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
        if args.split == "heldout":
            # Exclusive marker survives interruption; never silently repeat a frozen test.
            marker = db_path.parent / f"heldout-{args.kind}.attempted.json"
            with marker.open("x") as stream:
                json.dump(
                    {"checkpoint": args.checkpoint, "selected": [c.id for c in selected]}, stream
                )
        cap = 75 if args.split == "heldout" else 60
        manifest = dict(
            started_utc=started_utc,
            source_runs_sha256=hashlib.sha256(
                await asyncio.to_thread(Path(args.source_runs).read_bytes)
            ).hexdigest()
            if args.kind == "analysis"
            else None,
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
            decision_allowance_per_arm=48,
            request_concurrency=args.request_concurrency,
            planner_reasoning_effort="medium",
            participant_reasoning_effort="low unless medium-effort",
            git_head=(
                await asyncio.to_thread(
                    subprocess.check_output, ["git", "rev-parse", "HEAD"], text=True
                )
            ).strip(),
        )
        (output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
        with tarfile.open(output / "source.tar.gz", "w:gz") as archive:
            for path in source_paths():
                archive.add(path, arcname=str(path.relative_to(ROOT)))
        os.environ["JAS_CONCURRENT_REQUESTS"] = str(args.request_concurrency)
        app = create_app(f"sqlite:///{db_path}", budget_usd=cap, concurrent_runs=args.concurrency)
        generate = app.state.models.generate

        async def luna_only(output_type, **kwargs):
            if kwargs["model"] != MODEL or kwargs.get("web_search"):
                raise ValueError("Evaluation permits only Luna without paid external tools")
            return await generate(output_type, **kwargs)

        app.state.models.generate = luna_only
        with app.state.db.session() as session:
            previous_calls = set(session.scalars(select(ProviderCall.id)).all())
        records = []
        studies = {}
        capacity = asyncio.Semaphore(args.concurrency)
        async with app.router.lifespan_context(app):
            async with httpx.AsyncClient(
                transport=httpx.ASGITransport(app=app), base_url="http://localhost", timeout=1800
            ) as client:

                async def trial(case, mode, repetition, arm):
                    async with capacity:
                        started = time.monotonic()
                        try:
                            if args.kind == "planner":
                                result = await planner_trial(app, client, case)
                            elif args.kind == "analysis":
                                result = await analysis_trial(
                                    app, client, sources[(case.id, repetition, arm)]
                                )
                            else:
                                result = await participant_trial(
                                    app, case, mode, repetition, arm, studies
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
                        result.update(mode=mode, repetition=repetition, arm=arm)
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
                    (c, m, r, arm)
                    for c in selected
                    for m in (args.modes if args.kind == "participants" else [args.kind])
                    for r in range(args.repetitions)
                    for arm in (range(2) if args.kind in {"participants", "analysis"} else [None])
                ]
                random.Random(20261108).shuffle(jobs)
                await asyncio.gather(*(trial(*job) for job in jobs))
            with app.state.db.session() as session:
                ledger = session.get_one(Workspace, 1)
                calls = [
                    c
                    for c in session.scalars(select(ProviderCall)).all()
                    if c.id not in previous_calls
                ]
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
                elapsed_seconds=round(time.monotonic() - started, 3),
                source_unchanged=manifest["source_sha256"] == source_digest(),
                phase_usage={
                    "requests": len(calls),
                    "cost_usd": sum(c.charged for c in calls) / 1_000_000,
                    "input_tokens": sum(c.input_tokens for c in calls),
                    "output_tokens": sum(c.output_tokens for c in calls),
                    "partial": any(c.status in {"pending", "unknown"} for c in calls),
                },
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
    parser.add_argument(
        "--kind", choices=["planner", "participants", "analysis"], default="planner"
    )
    parser.add_argument("--source-runs", help="Baseline participant attempts for evidence analysis")
    parser.add_argument("--request-concurrency", type=int, default=4, choices=range(1, 33))
    parser.add_argument("--database", default="data/quality/aggregate.sqlite3")
    parser.add_argument("--gate", default="data/quality/preflight/validity.json")
    parser.add_argument("--output", required=True)
    parser.add_argument("--variants", nargs="+", type=int)
    parser.add_argument("--families", nargs="+")
    parser.add_argument("--limit", type=int)
    parser.add_argument("--repetitions", type=int, default=1, choices=range(1, 4))
    parser.add_argument("--concurrency", type=int, default=4, choices=range(1, 17))
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
    os.environ["JAS_ASSISTANT_MODEL"] = MODEL
    asyncio.run(run(args))


if __name__ == "__main__":
    main()
