"""Post-checkpoint planner diagnostics. Public development cases, never held-out scores."""

import argparse
import asyncio
import fcntl
import gzip
import hashlib
import json
import os
import random
import sqlite3
import tarfile
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path

import httpx
from agent_sim.api import create_app
from agent_sim.db import ProviderCall, Workspace
from dotenv import load_dotenv
from sqlalchemy import select

from benchmarks.cases import MODEL

# Independently specified before trials. Factor paths name actual required manipulations.
# None means the essential combination is unavailable, not an invitation to narrow silently.
EXAMPLES = [
    (
        "costly-contributions",
        "Does public messaging change costly contributions to a shared fund? Use six "
        "agents, multiplier 2, four rounds, two arms differing only in messaging availability.",
        "commons",
        "communication_channels",
    ),
    (
        "private-notes",
        "Do private notes improve reciprocal returns compared with public-history-only "
        "memory? Use four agents in a repeated trust exchange for six rounds; isolate "
        "notes, not all memory.",
        "trust_exchange",
        "memory",
    ),
    (
        "retrieval",
        "Does retrieving one's past experiences change reciprocity beyond private notes and "
        "public history? Use six agents, six trust-exchange rounds, notes versus episodic "
        "memory.",
        "trust_exchange",
        "memory",
    ),
    (
        "task-dependencies",
        "Does communication help four agents complete a project with prerequisite tasks "
        "within eight rounds? Compare communication on/off with the same task graph.",
        "coordination",
        "communication",
    ),
    (
        "sanction-disclosure",
        "Does announcing public rather than party-only sanction records change an "
        "authority's sanction choices? Use four agents in a token institution, six rounds, "
        "fixed audit probability, allocation budget and roles.",
        "institution",
        "institution.transparent",
    ),
    (
        "oversight",
        "Does independent oversight of unjustified sanctions change authority behavior? "
        "Compare audit probabilities 0 and 1 in a token institution with four agents and "
        "six rounds.",
        "institution",
        "institution.oversight",
    ),
    (
        "negotiation-delay",
        "Does a shrinking bargaining pie reduce agreement efficiency? Compare discount 0.5 "
        "versus 1, two negotiators, six rounds, the same initial pie and outside options.",
        "bargaining",
        "bargaining.discount",
    ),
    (
        "noisy-evidence",
        "Does public disclosure of everyone's noisy binary signals improve prediction "
        "accuracy? Compare private and public signals for six agents over five rounds, "
        "keeping accuracy and communication fixed.",
        "information",
        "private_signal",
    ),
    (
        "delayed-feedback",
        "Does delayed outcome feedback change binary prediction accuracy? Compare immediate "
        "versus end-of-run feedback with six agents, eight rounds and identical signal "
        "accuracy.",
        "information",
        "information.reveal_outcome",
    ),
    (
        "resource-regeneration",
        "How does regeneration affect extraction and collapse of a persistent renewable "
        "stock? Compare regeneration 0.1 versus 0.5 for six agents over eight rounds; stock "
        "is always visible.",
        "renewable_resource",
        "resource.regeneration",
    ),
    (
        "depleted-start",
        "Does starting with depleted stock change extraction relative to starting at "
        "carrying capacity? Use six agents and eight renewable-resource rounds; fix "
        "capacity and regeneration.",
        "renewable_resource",
        "resource.initial_stock",
    ),
    (
        "changing-capacity",
        "How does an unannounced round-three reduction in per-round credit capacity affect "
        "promises and contributions? Use six agents, six commons rounds, matched unchanged "
        "and reduced-capacity arms.",
        "commons",
        "resource_schedule",
    ),
    (
        "neutral-signal",
        "Does disclosing payoff-irrelevant synthetic private signals change commons "
        "contributions? Compare private/public signals for six agents over four rounds, "
        "with identical payoff rules.",
        "commons",
        "private_signal",
    ),
    (
        "small-pilot",
        "Describe how two agents divide a binding bargaining pie in one two-round pilot "
        "condition. Do not claim a treatment effect or population inference.",
        "bargaining",
        None,
    ),
    (
        "large-project",
        "Do twelve agents coordinate prerequisite work more effectively with public "
        "messages than without? Use a thirty-task project and twenty rounds, keeping public "
        "task state and all other mechanics fixed.",
        "coordination",
        "communication_channels",
    ),
    (
        "stated-goals",
        "In a six-agent commons over six rounds, compare private goals emphasizing personal "
        "credits versus group credits. Keep affordances and payoff rules identical; treat "
        "goals as instructions, not enforced preferences.",
        "commons",
        "profiles",
    ),
    (
        "shortage-power",
        "When a community of AI agents faces a real resource shortage, does transparent "
        "information encourage cooperation, or help powerful agents hoard more effectively? "
        "Require finite stock, unequal enforced allocation rights and configurable "
        "stock/allocation visibility.",
        None,
        None,
    ),
    (
        "hidden-stock",
        "Does hiding the renewable stock from participants improve long-run conservation "
        "relative to showing it? Require a persistent stock and a configurable "
        "stock-visibility treatment.",
        None,
        None,
    ),
    (
        "physical-needs",
        "Do transparent food inventories prevent starvation under unequal food-access "
        "rights? Require food consumption, deprivation and enforceable unequal access, not "
        "token allocations.",
        None,
        None,
    ),
    (
        "weight-learning",
        "Do agents learn better negotiation policies through gradient updates to their "
        "model weights after each run? Require actual weight training, not retained context.",
        None,
        None,
    ),
    (
        "human-election",
        "Predict the vote share in next year's real national election using agents "
        "calibrated to a representative human population.",
        None,
        None,
    ),
    (
        "binding-promises",
        "Do legally binding promises to contribute, automatically enforced by escrow and "
        "penalties, improve public-goods contributions? Verbal nonbinding commitments are "
        "insufficient.",
        None,
        None,
    ),
    (
        "resource-coalitions",
        "Do enforceable coalitions with exclusive extraction rights and sanctions protect a "
        "renewable stock? Require both coalition membership permissions and persistent "
        "shared-stock dynamics.",
        None,
        None,
    ),
    (
        "epidemic",
        "Does public disease reporting reduce deaths in a spatial epidemic with movement, "
        "transmission, hospital capacity and false-negative tests? Require these enforced "
        "mechanics.",
        None,
        None,
    ),
    (
        "broad-shortage",
        "When a community of AI agents faces a real resource shortage, does "
        "transparent information encourage cooperation, or help powerful agents "
        "hoard more effectively?",
        None,
        None,
    ),
    (
        "broad-stock-visibility",
        "If I let everyone see the remaining fish in a shared lake, "
        "will they save it or empty it faster?",
        None,
        None,
    ),
    (
        "broad-distributions",
        "Would workers trust leaders more if food distributions were transparent during a drought?",
        None,
        None,
    ),
    ("broad-binding", "Do enforceable group promises keep a fragile commons alive?", None, None),
    (
        "broad-negotiators",
        "Does communication make six negotiators reach a fair binding deal faster?",
        None,
        None,
    ),
    (
        "broad-epidemic",
        "Can rumors of illness change where people travel and overwhelm hospitals?",
        None,
        None,
    ),
]


def at(value, path):
    for key in path.split("."):
        value = value[key]
    return value


def assess(example, record):
    _, _, environment, factor = example
    output = record.get("output") or {}
    checks = {"completed": record["status"] == "complete"}
    checks["capability_decision"] = output.get("supported") is (environment is not None)
    design = output.get("design")
    if environment is None:
        checks["no_substitute"] = design is None
    else:
        checks["world"] = bool(design) and design["environment"] == environment
        conditions = design["conditions"] if design else []
        checks["intervention"] = bool(design) and (
            factor is None
            or (factor == "profiles" and any(c["profile_overrides"] for c in conditions))
            or (
                factor != "profiles"
                and len(
                    {json.dumps(at(c["parameters"], factor), sort_keys=True) for c in conditions}
                )
                > 1
            )
        )
    return checks


async def evaluate(args):
    selected = [e for e in EXAMPLES if not args.cases or e[0] in args.cases]
    if args.cases and {e[0] for e in selected} != set(args.cases):
        raise ValueError("Unknown development case identifier")
    output = Path(args.output)
    await asyncio.to_thread(output.mkdir, parents=True, exist_ok=False)
    database = await asyncio.to_thread(Path(args.database).resolve)
    # Require the existing ledger; never silently create/reset the aggregate accounting DB.
    with database.with_suffix(".lock").open("w") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        with sqlite3.connect(f"file:{database}?mode=ro", uri=True) as connection:
            ceiling, charged = connection.execute(
                "SELECT ceiling,charged FROM workspace WHERE id=1"
            ).fetchone()
        if ceiling > 75_000_000:
            raise ValueError("Ledger ceiling exceeds the authorized $75 aggregate cap")
        cap = min(ceiling, charged + round(args.max_usd * 1_000_000))
        # Fingerprint the backend actually imported, including a separately archived baseline.
        import agent_sim

        root = Path(agent_sim.__file__).parent
        sources = sorted(root.rglob("*.py"))
        source_hash = hashlib.sha256(
            b"".join(str(p.relative_to(root)).encode() + p.read_bytes() for p in sources)
        ).hexdigest()
        manifest = dict(
            label=args.label,
            started=datetime.now(UTC).isoformat(),
            model=MODEL,
            source_sha256=source_hash,
            examples=selected,
            repetitions=args.repetitions,
            phase_cap_usd=cap / 1_000_000,
            aggregate_cap_usd=75,
            kind="public development; not held-out",
            limitations="Mechanical acceptance checks, not independent semantic/human validation.",
        )
        (output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
        with tarfile.open(output / "backend-source.tar.gz", "w:gz") as archive:
            for path in sources:
                archive.add(path, arcname=str(path.relative_to(root.parent)))
        app = create_app(f"sqlite:///{database}", budget_usd=cap / 1_000_000)
        generate = app.state.models.generate

        async def luna_only(output_type, **kwargs):
            if kwargs["model"] != MODEL or kwargs.get("web_search"):
                raise ValueError("Only Luna without paid external tools is permitted")
            return await generate(output_type, **kwargs)

        app.state.models.generate = luna_only
        records, analysis_ids = [], []
        capacity = asyncio.Semaphore(3)
        async with app.router.lifespan_context(app):
            try:
                async with httpx.AsyncClient(
                    transport=httpx.ASGITransport(app=app), base_url="http://localhost"
                ) as client:

                    async def trial(example, repetition):
                        async with capacity:
                            response = await client.post(
                                "/api/chats", json={"question": example[1], "context": "new"}
                            )
                            response.raise_for_status()
                            key = response.json()["id"]
                            analysis_ids.append(key)
                            await app.state.assistants.tasks[key]
                            evidence = app.state.assistants.get(key)
                            checks = assess(example, evidence)
                            row = dict(
                                id=example[0],
                                repetition=repetition,
                                checks=checks,
                                passed=all(checks.values()),
                                evidence=evidence,
                            )
                            records.append(row)
                            with (output / "attempts.jsonl").open("a") as stream:
                                stream.write(json.dumps(row) + "\n")
                            print(
                                json.dumps({k: v for k, v in row.items() if k != "evidence"}),
                                flush=True,
                            )

                    jobs = [(e, r) for e in selected for r in range(args.repetitions)]
                    random.Random(20261108).shuffle(jobs)
                    results = await asyncio.gather(
                        *(trial(*job) for job in jobs), return_exceptions=True
                    )
                    errors = [r for r in results if isinstance(r, BaseException)]
                    if errors:
                        raise errors[0]
            finally:
                await app.state.assistants.close()
                with app.state.db.session.begin() as session:
                    calls = session.scalars(
                        select(ProviderCall).where(ProviderCall.analysis_id.in_(analysis_ids))
                    ).all()
                    with gzip.open(output / "provider-calls.jsonl.gz", "wt") as stream:
                        for call in calls:
                            stream.write(
                                json.dumps(
                                    {
                                        "id": call.id,
                                        "analysis_id": call.analysis_id,
                                        "model": call.model,
                                        "status": call.status,
                                        "charged": call.charged,
                                        "request": call.request_payload,
                                        "response": call.response_payload,
                                        "error": call.error,
                                    }
                                )
                                + "\n"
                            )
                    workspace = session.get_one(Workspace, 1)
                    summary = dict(
                        label=args.label,
                        attempted=len(records),
                        passed=sum(r["passed"] for r in records),
                        failures=dict(
                            Counter(k for r in records for k, v in r["checks"].items() if not v)
                        ),
                        requests=len(calls),
                        cost_usd=sum(c.charged for c in calls) / 1_000_000,
                        aggregate_usd=workspace.charged / 1_000_000,
                        unknown=sum(c.status in {"pending", "unknown"} for c in calls),
                        source_sha256=source_hash,
                    )
                    assert workspace.charged <= 75_000_000
                    workspace.ceiling = ceiling
                (output / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
                print(json.dumps(summary), flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", default="data/quality/aggregate.sqlite3")
    parser.add_argument("--output", required=True)
    parser.add_argument("--label", required=True)
    parser.add_argument("--cases", nargs="+")
    parser.add_argument("--repetitions", type=int, choices=range(1, 5), default=2)
    parser.add_argument("--max-usd", type=float, default=2)
    args = parser.parse_args()
    if not 0 < args.max_usd <= 10:
        parser.error("Phase allowance must be above $0 and at most $10 within the aggregate cap")
    load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=True, interpolate=False)
    os.environ["JAS_PLANNER_MODEL"] = MODEL
    os.environ["JAS_ASSISTANT_MODEL"] = MODEL
    asyncio.run(evaluate(args))


if __name__ == "__main__":
    main()
