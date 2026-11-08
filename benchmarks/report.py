"""Summarize all attempts with paired seed effects and explicit missing-pair counts."""

import argparse
import gzip
import json
import random
import statistics
from collections import Counter, defaultdict
from pathlib import Path

from benchmarks.cases import cases

METRICS = (
    "utility",
    "completion",
    "stock",
    "false_report_rate",
    "fulfillment_rate",
    "forecast_error",
)


def interval(values):
    if len(values) < 3:
        return None
    rng = random.Random(20261108)
    means = sorted(statistics.mean(rng.choices(values, k=len(values))) for _ in range(2000))
    return [means[49], means[1949]]


def summarize(records):
    groups = defaultdict(list)
    sizes = {case.id: case.agents for case in cases()}
    for row in records:
        groups[(row["family"], row["mode"], sizes[row["id"]])].append(row)
    result = []
    for (family, mode, agents), rows in sorted(groups.items()):
        arms = {}
        for arm in (0, 1):
            samples = [r for r in rows if r["arm"] == arm]
            observed = [r for r in samples if "behavior" in r]
            eligible = [r for r in observed if r["passed"]]
            arms[arm] = dict(
                attempted=len(samples),
                completed=len(eligible),
                missing_traces=len(samples) - len(observed),
                turns=sum(r["behavior"]["turns"] for r in observed),
                decision_allowance=48 * len(samples),
                cost_usd=sum(r["usage"]["cost_usd"] for r in observed),
                reports=sum(r["behavior"]["reports"] for r in observed),
                false_reports=sum(r["behavior"]["false_reports"] for r in observed),
                eligible_commitments=sum(r["behavior"]["eligible_commitments"] for r in observed),
                infeasible_commitments=sum(
                    r["behavior"]["infeasible_commitments"] for r in observed
                ),
                fulfilled_commitments=sum(r["behavior"]["fulfilled_commitments"] for r in observed),
                seed_means={
                    key: {
                        str(seed): statistics.mean(values)
                        for seed in sorted({r["seed"] for r in eligible})
                        if (
                            values := [
                                r["behavior"][key]
                                for r in eligible
                                if r["seed"] == seed and r["behavior"][key] is not None
                            ]
                        )
                    }
                    for key in METRICS
                },
            )
            arms[arm]["means"] = {
                key: statistics.mean(seeds.values()) if seeds else None
                for key, seeds in arms[arm]["seed_means"].items()
            }
        controls = {(r["id"], r["repetition"]): r for r in rows if r["arm"] == 0}
        effects = {}
        for metric in METRICS:
            seeds = defaultdict(list)
            for row in rows:
                control = controls.get((row["id"], row["repetition"]))
                if row["arm"] != 1 or not control or not row["passed"] or not control["passed"]:
                    continue
                left, right = control["behavior"][metric], row["behavior"][metric]
                if left is not None and right is not None:
                    seeds[row["seed"]].append(right - left)
            values = [statistics.mean(v) for v in seeds.values()]
            effects[metric] = dict(
                seed_effects={str(k): statistics.mean(v) for k, v in seeds.items()},
                mean=statistics.mean(values) if values else None,
                interval=interval(values),
                pairs=sum(map(len, seeds.values())),
                attempted_pairs=len(rows) // 2,
                method="Arm1 minus arm0; repetitions averaged within seed; "
                "95% percentile bootstrap, 2000 resamples. Three seeds give weak uncertainty.",
            )
        result.append(dict(family=family, mode=mode, agents=agents, arms=arms, effects=effects))
    return dict(
        attempted=len(records),
        passed=sum(r["passed"] for r in records),
        failures=dict(Counter(k for r in records for k, v in r["checks"].items() if not v)),
        missing_traces=sum("behavior" not in r for r in records),
        comparisons=result,
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("attempts", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    with gzip.open(args.attempts, "rt") as stream:
        records = [json.loads(line) for line in stream]
    args.output.write_text(json.dumps(summarize(records), indent=2) + "\n")


if __name__ == "__main__":
    main()
