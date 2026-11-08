"""Cross-configuration contrasts; fixed seed blocks, no preferred utility target."""

import gzip
import json
import statistics
from collections import defaultdict
from pathlib import Path

from benchmarks.report import METRICS, interval

root = Path("benchmarks/results")


def load(name):
    p = root / name / "attempts.jsonl.gz"
    if not p.exists():
        return []
    with gzip.open(p, "rt") as f:
        return [json.loads(line) for line in f]


def value(row, metric):
    if metric == "cost_usd":
        return row["usage"]["cost_usd"]
    if metric == "seconds":
        return row["seconds"]
    return row["behavior"][metric]


def contrast(label, reference, alternative):
    records = []
    for family in sorted({r["family"] for r in reference + alternative}):
        for arm in (0, 1):
            a = {
                (r.get("seed"), r["repetition"]): r
                for r in reference
                if r["family"] == family and r["arm"] == arm
            }
            b = {
                (r.get("seed"), r["repetition"]): r
                for r in alternative
                if r["family"] == family and r["arm"] == arm
            }
            assert len(a) == sum(r["family"] == family and r["arm"] == arm for r in reference)
            assert len(b) == sum(r["family"] == family and r["arm"] == arm for r in alternative)
            metrics = {}
            for metric in (*METRICS, "cost_usd", "seconds", "turns"):
                seeds = defaultdict(list)
                for k in sorted(a.keys() & b.keys()):
                    left, right = a[k], b[k]
                    if not left["passed"] or not right["passed"]:
                        continue
                    assert left["decision_allowance"] == right["decision_allowance"] == 48

                    before, after = value(left, metric), value(right, metric)
                    if before is not None and after is not None:
                        seeds[k[0]].append(after - before)
                means = {str(k): statistics.mean(v) for k, v in seeds.items()}
                metrics[metric] = dict(
                    pairs=sum(map(len, seeds.values())),
                    seed_block_differences=means,
                    mean=statistics.mean(means.values()) if means else None,
                    interval=interval(tuple(means.values())),
                )
            records.append(
                dict(
                    comparison=label,
                    family=family,
                    arm=arm,
                    reference_attempted=len(a),
                    alternative_attempted=len(b),
                    metrics=metrics,
                )
            )
    return records


result = []
rows = load("participant-agent-counts")
for n in (4, 8, 12):
    result.extend(
        contrast(
            f"{n} agents minus 2 agents",
            [r for r in rows if r.get("agents") == 2],
            [r for r in rows if r.get("agents") == n],
        )
    )
rows = load("participant-memory")
for mode in ("memory-history", "memory-notes", "memory-episodic"):
    result.extend(
        contrast(
            f"{mode} minus memory-none",
            [r for r in rows if r["mode"] == "memory-none"],
            [r for r in rows if r["mode"] == mode],
        )
    )
rows = load("participant-effort-communication")
for mode in ("no-communication", "medium-effort"):
    result.extend(
        contrast(
            f"{mode} minus baseline",
            [r for r in rows if r["mode"] == "baseline"],
            [r for r in rows if r["mode"] == mode],
        )
    )
left, right = load("participant-serial"), load("participant-parallel")
if left and right:
    result.extend(contrast("parallel minus serial", left, right))
phases = []
for name in (
    "participant-agent-counts",
    "participant-memory",
    "participant-effort-communication",
    "participant-serial",
    "participant-parallel",
):
    p = root / name / "summary.json"
    if p.exists():
        d = json.loads(p.read_text())
        phases.append(
            dict(
                phase=name,
                attempted=d["attempted"],
                passed=d["passed"],
                elapsed_seconds=d["elapsed_seconds"],
                cost_usd=d["phase_usage"]["cost_usd"],
            )
        )
assert all(
    m["pairs"] <= min(c["reference_attempted"], c["alternative_attempted"])
    for c in result
    for m in c["metrics"].values()
)
(root / "configuration-comparisons.json").write_text(
    json.dumps(
        dict(
            method=(
                "Alternative minus reference, paired by family/arm/seed/repetition. "
                "Repetitions averaged within each of three heterogeneous seed blocks; 95% "
                "percentile bootstrap with 2,000 resamples. Conditional estimates require "
                "complete pairs; attempted denominators retained. No cross-world utility "
                "ranking. Counts trade rounds for agents at fixed 48-decision allowance. Run "
                "seconds excludes queue time; phase elapsed includes the full batch. "
            ),
            contrasts=result,
            phases=phases,
        ),
        indent=2,
    )
    + "\n"
)
print(len(result), "contrasts")
