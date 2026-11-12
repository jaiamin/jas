"""Descriptive, failure-aware comparisons of an immutable planned run matrix."""

import statistics
from collections import Counter, defaultdict
from dataclasses import dataclass
from decimal import Decimal

from .domain import Design

VERSION = 1
UNCERTAINTY = (
    "Confidence intervals withheld: the protocol does not declare population sampling, "
    "treatment randomization or independent provider sampling. Fixed seeds are observed "
    "clusters, not certified independent draws; small samples cannot establish generalization."
)
SELECTION = (
    "Observed complete, metric-eligible cells only. Generalizing to the planned sample "
    "assumes outcome-independent completion and eligibility (selection may violate this)."
)
# These endpoints are defined for every terminal run in their installed world.
BOUNDED_ENDPOINTS = {
    "contribution_rate",
    "completion_rate",
    "accuracy",
    "signal_override_rate",
    "agreement_rate",
    "stock_fraction",
    "extraction_rate",
    "collapse_rate",
}
DISPOSITIONS = {
    "complete": "Terminal run captured",
    "ready": "Not attempted",
    "paused": "Interrupted or paused before completion",
    "failed": "Run failed before completion",
    "queued": "Run is still in progress at capture",
    "running": "Run is still in progress at capture",
    "pausing": "Run is still in progress at capture",
    "cutoff": "Historical nonterminal cutoff; run disposition at that time was not captured",
    "not_captured": "Planned cell is outside the captured scope or has no run record",
}


@dataclass(frozen=True)
class ComparisonRun:
    run_id: str
    condition_key: str
    seed: int
    repetition: int
    status: str
    through_turn: int
    attempted: bool
    metrics: dict[str, float]
    error: str | None = None
    effort: dict | None = None


EFFORT_COUNTS = (
    "activations",
    "inference_attempts",
    "tool_attempts",
    "tool_operations",
    "scripted_attempts",
    "scripted_decisions",
    "committed_decisions",
    "reasoning_tokens",
)


def empty_effort() -> dict:
    return {
        "version": 1,
        **dict.fromkeys(EFFORT_COUNTS, 0),
        "usage": {
            "requests": 0,
            "input_tokens": 0,
            "output_tokens": 0,
            "cost_usd": 0.0,
            "partial": False,
        },
        "stop_reasons": {},
        "request_statuses": {},
        "implementation_sources": [],
    }


def total_effort(records: list[dict]) -> dict:
    result = empty_effort()
    result["captured_runs"] = len(records)
    for effort in records:
        for key in EFFORT_COUNTS:
            result[key] += effort[key]
        for key in ("requests", "input_tokens", "output_tokens"):
            result["usage"][key] += effort["usage"][key]
        result["usage"]["partial"] |= effort["usage"]["partial"]
        for key in ("stop_reasons", "request_statuses"):
            result[key] = dict(Counter(result[key]) + Counter(effort[key]))
        for source in effort["implementation_sources"]:
            if source not in result["implementation_sources"]:
                result["implementation_sources"].append(source)
    # Each run converts integer ledger microdollars once; preserve those decimal
    # amounts while combining runs rather than accumulating binary float error.
    result["usage"]["cost_usd"] = float(
        sum((Decimal(str(e["usage"]["cost_usd"])) for e in records), Decimal(0))
    )
    return result


def seed_mean(values: dict[int, list[float]]) -> float | None:
    return statistics.mean(statistics.mean(v) for v in values.values()) if values else None


def sensitivity(metric: str, arms: list[list[dict]], design: Design, endpoint: str) -> dict:
    """Bound the *planned* seed-weighted contrast; never create missing records."""
    undefined = any(
        cell["status"] == "complete" and metric not in cell["metrics"]
        for arm in arms
        for cell in arm
    )
    observed = all(
        cell["status"] == "complete" and metric in cell["metrics"] for arm in arms for cell in arm
    )
    if not observed and (endpoint not in BOUNDED_ENDPOINTS or undefined):
        return {
            "status": "not_identified",
            "bounds": None,
            "reason": "No defensible planned-sample bounds: endpoint eligibility is undefined "
            "or this metric has no implemented enforced range. Missing outcomes may change "
            "the conclusion; no full-sample estimate is identified without extra assumptions.",
        }
    ranges = []
    for arm in arms:
        ranges.append(
            [
                (cell["metrics"][metric], cell["metrics"][metric])
                if cell["status"] == "complete" and metric in cell["metrics"]
                else (0.0, 1.0)
                for cell in arm
            ]
        )
    count = len(design.seeds) * design.repetitions
    means = [(sum(v[0] for v in arm) / count, sum(v[1] for v in arm) / count) for arm in ranges]
    bounds = (
        list(means[0])
        if len(means) == 1
        else [means[1][0] - means[0][1], means[1][1] - means[0][0]]
    )
    missing = any(low != high for arm in ranges for low, high in arm)
    return {
        "status": "bounded" if missing else "observed",
        "bounds": bounds,
        "reason": (
            "All planned endpoint values observed; exact finite planned-sample value. "
            if observed
            else "Possible planned-sample values under enforced [0, 1] endpoint bounds; "
        )
        + "Equal planned repetitions within seed and equal planned seeds. "
        "These are worst-case sensitivity bounds, not a confidence interval or imputed outcomes.",
    }


def compare_runs(
    runs: list[ComparisonRun], design: Design, *, metric_sources: dict[str, str] | None = None
) -> dict:
    metric_sources = metric_sources or {}
    records = {(r.condition_key, r.seed, r.repetition): r for r in runs}
    cells, by_condition = [], {}
    for condition in design.conditions:
        group = []
        for seed in design.seeds:
            for repetition in range(1, design.repetitions + 1):
                run = records.get((condition.key, seed, repetition))
                status = run.status if run else "not_captured"
                reason = run.error if run and run.error else DISPOSITIONS[status]
                cell = {
                    "run_id": run.run_id if run else None,
                    "condition_key": condition.key,
                    "seed": seed,
                    "repetition": repetition,
                    "status": status,
                    "through_turn": run.through_turn if run else None,
                    "attempted": run.attempted if run else False,
                    "reason": reason,
                    "metrics": run.metrics if run and status == "complete" else {},
                    "effort": run.effort if run else None,
                }
                group.append(cell)
                cells.append(cell)
        by_condition[condition.key] = group
    conditions, results, effects = [], [], []
    baseline = design.conditions[0]
    for condition in design.conditions:
        group = by_condition[condition.key]
        statuses = Counter(c["status"] for c in group)
        others = [
            by_condition[c.key]
            for c in design.conditions
            if c.key != condition.key and (condition.key == baseline.key or c.key == baseline.key)
        ]
        unmatched = sum(
            cell["status"] == "complete" and any(arm[i]["status"] != "complete" for arm in others)
            for i, cell in enumerate(group)
        )
        conditions.append(
            {
                "condition_key": condition.key,
                "condition": condition.name,
                "participant": {
                    "version": 1,
                    "kind": "non_model_control"
                    if condition.harness.kind == "scripted"
                    else "model_participant",
                    "models": sorted(
                        {p.model or condition.model for p in design.resolve(condition).profiles}
                    )
                    if condition.harness.kind != "scripted"
                    else [],
                    "configured_models": sorted(
                        {p.model or condition.model for p in design.resolve(condition).profiles}
                    ),
                    "harness": condition.harness.model_dump(),
                    "memory": condition.parameters.memory,
                    "profiles": [p.model_dump() for p in design.resolve(condition).profiles],
                    "inference": {
                        "response_tokens": design.response_tokens,
                        "openai_reasoning_effort": design.openai_reasoning_effort,
                    }
                    if condition.harness.kind != "scripted"
                    else None,
                },
                "effort": total_effort([c["effort"] for c in group if c["effort"] is not None]),
                "planned": len(group),
                "attempted": sum(c["attempted"] for c in group),
                "complete": statuses["complete"],
                "failed": statuses["failed"],
                "interrupted": statuses["paused"],
                "ready": statuses["ready"],
                "in_progress": sum(statuses[s] for s in ("queued", "running", "pausing")),
                "not_captured": statuses["not_captured"],
                "excluded": len(group) - statuses["complete"],
                "unmatched": unmatched,
                "reasons": dict(Counter(c["reason"] for c in group if c["status"] != "complete")),
            }
        )
        for metric in design.measures:
            eligible = [c for c in group if metric in c["metrics"]]
            seeds = defaultdict(list)
            for cell in eligible:
                seeds[cell["seed"]].append(cell["metrics"][metric])
            exclusions = [
                {
                    "run_id": c["run_id"],
                    "seed": c["seed"],
                    "repetition": c["repetition"],
                    "reason": "No eligible terminal measurement "
                    "(undefined denominator or uncaptured metric)"
                    if c["status"] == "complete"
                    else c["reason"],
                }
                for c in group
                if metric not in c["metrics"]
            ]
            result = {
                "condition_key": condition.key,
                "condition": condition.name,
                "metric": metric,
                "mean": seed_mean(seeds),
                "runs": len(eligible),
                "seeds": len(seeds),
                "planned": len(group),
                "excluded": len(exclusions),
                "exclusions": exclusions,
                "interval": None,
                "method": "Observed terminal means; repetitions averaged within seed",
                "uncertainty_reason": UNCERTAINTY,
                "selection_assumption": SELECTION,
                "sensitivity": sensitivity(
                    metric, [group], design, metric_sources.get(metric, metric)
                ),
            }
            results.append(result)
            if condition.key == baseline.key:
                continue
            control = by_condition[baseline.key]
            pairs, differences, missing = 0, defaultdict(list), []
            for left, right in zip(control, group, strict=True):
                if metric in left["metrics"] and metric in right["metrics"]:
                    pairs += 1
                    differences[right["seed"]].append(
                        right["metrics"][metric] - left["metrics"][metric]
                    )
                else:
                    missing.append(
                        {
                            "seed": right["seed"],
                            "repetition": right["repetition"],
                            "baseline_run_id": left["run_id"],
                            "condition_run_id": right["run_id"],
                            "reason": "; ".join(
                                f"{name}: {c['reason']}"
                                if c["status"] != "complete"
                                else f"{name}: no eligible terminal measurement"
                                for name, c in ((baseline.name, left), (condition.name, right))
                                if metric not in c["metrics"]
                            ),
                        }
                    )
            effects.append(
                {
                    "condition_key": condition.key,
                    "baseline_key": baseline.key,
                    "condition": condition.name,
                    "baseline": baseline.name,
                    "metric": metric,
                    "mean": seed_mean(differences),
                    "seeds": len(differences),
                    "pairs": pairs,
                    "planned_pairs": len(group),
                    "missing_pairs": missing,
                    "interval": None,
                    "method": "Observed matched differences; repetitions averaged within seed",
                    "uncertainty_reason": UNCERTAINTY,
                    "selection_assumption": SELECTION,
                    "sensitivity": sensitivity(
                        metric, [control, group], design, metric_sources.get(metric, metric)
                    ),
                }
            )
    return {
        "comparison": {
            "version": VERSION,
            "matching_unit": "Immutable revision × seed × repetition",
            "inference_unit": "Seed cluster within a revision; repetitions averaged within seed",
            "independent_support": None,
            "dependence": "Agents and decisions share run histories. "
            "Repetitions share a world seed. Observed seed clusters are reported; "
            "independent population support is not established.",
            "uncertainty_reason": UNCERTAINTY,
            "selection_assumption": SELECTION,
            "effort_scope": "Recorded work across every captured run and activation, including "
            "failed, interrupted and unmatched attempts; not only outcome-eligible pairs. "
            "Request limits are per activation; token limits are per request. "
            "Reasoning tokens are included in output tokens, not additional tokens. "
            "Partial usage retains pending/unknown ledger charges; unrecorded usage is not zero. "
            "Configured model assignments are unused for declared non-model controls. "
            "Different effort envelopes are experimental factors, not compute-matched evidence.",
            "conditions": conditions,
            "cells": cells,
        },
        "results": results,
        "effects": effects,
    }
