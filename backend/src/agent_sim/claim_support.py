"""Read-only, explicit calculation assertions; generated wording is never certified."""

import math
from typing import Literal

from pydantic import Field
from sqlalchemy import select

from .comparisons import ComparisonRun, compare_runs
from .db import Measurement, RecordedEvent, Turn
from .domain import Finding, Strict
from .metrics import aggregate_metrics
from .research import Research, event_dict

VERSION = 1


class ClaimProposal(Strict):
    kind: Literal["calculation", "annotation", "causal", "intent"]
    text: str = Field(min_length=1, max_length=2000)
    calculation_id: str | None = None
    value: float | None = Field(default=None, allow_inf_nan=False)
    scope: Literal["captured_run", "observed_pairs", "planned_sample"] = "captured_run"


class AnalysisFinding(Finding):
    claims: list[ClaimProposal] = Field(default_factory=list, max_length=24)


def capture_lens(
    research: Research, cutoffs: dict[str, int], comparisons: dict | None = None,
) -> dict:
    """Retain the literal World inputs rather than trusting analyst arithmetic."""
    facts, calculations = [], []
    for rid, cutoff in cutoffs.items():
        evidence = research.evidence(rid, cutoff)
        balances = evidence["checkpoint"]["balances"]
        with research.db.session() as session:
            measurements = session.scalars(select(Measurement).where(
                Measurement.run_id == rid, Measurement.turn <= cutoff,
            ).order_by(Measurement.id)).all()
        raw_measurements = [{"turn": row.turn, "key": row.key, "value": row.value,
                             "denominator": row.denominator, "version": row.version}
                            for row in measurements]
        fact = {
            "run_id": rid,
            "through_turn": cutoff,
            "state_hash": evidence["state_hash"],
            "balances": balances,
            "measurements": raw_measurements,
            "source": {"href": f"/api/runs/{rid}/turns/{cutoff}", "pointer": "/checkpoint"},
        }
        facts.append(fact)
        calculations.append({
            "id": f"run:{rid}:total_utility", "label": "Recorded total utility",
            "scope": "captured_run", "value": math.fsum(balances.values()),
            "formula": "sum(balances.values())", "inputs": {"balances": balances},
            "sources": [fact["source"]],
            "assumptions": ["Utility balances are World accounting, not evidence of motive."],
        })
    by_run = {row["run_id"]: row for row in facts}
    for revision, report in (comparisons or research.capture_comparisons(cutoffs)).items():
        cells = report["comparison"]["cells"]
        selected = [c for c in cells if c["run_id"] in by_run]
        _, design, _ = research.configuration(selected[0]["run_id"])
        # Reuse T06's metric aggregation and matching; raw measurements are retained.
        # No analyst-supplied outcome or reimplemented statistical engine participates.
        computed = compare_runs([
            ComparisonRun(
                run_id=c["run_id"], condition_key=c["condition_key"], seed=c["seed"],
                repetition=c["repetition"], status=c["status"], through_turn=c["through_turn"],
                attempted=c["attempted"], error=c["reason"],
                metrics=aggregate_metrics((m["key"], m["value"])
                                          for m in by_run[c["run_id"]]["measurements"]),
            ) for c in selected
        ], design)
        for effect in computed["effects"]:
            calculations.append({
                "id": f"contrast:{revision}:{effect['condition_key']}:{effect['metric']}",
                "label": f"{effect['condition']} minus {effect['baseline']} · {effect['metric']}",
                "scope": "observed_pairs", "value": effect["mean"],
                "formula": "T06 comparison v1: condition - baseline per matched terminal cell; "
                "mean repetitions within seed, then mean observed seed clusters",
                "inputs": {
                    "condition_key": effect["condition_key"], "baseline_key": effect["baseline_key"],
                    "metric": effect["metric"], "design": design.model_dump(), "cells": cells,
                    "measurements": {c["run_id"]: [m for m in by_run[c["run_id"]]["measurements"]
                                                     if m["key"] == effect["metric"]]
                                     for c in selected},
                },
                "coverage": {"pairs": effect["pairs"], "planned_pairs": effect["planned_pairs"],
                             "seed_clusters": effect["seeds"]},
                "missing": effect["missing_pairs"], "sensitivity": effect["sensitivity"],
                "sources": [by_run[c["run_id"]]["source"] for c in selected],
                "assumptions": [effect["selection_assumption"], effect["uncertainty_reason"]],
            })
    return {
        "version": VERSION, "key": "behavior", "name": "Recorded behavior",
        "requirements": ["Cutoff checkpoint and its recorded utility balances"],
        "cutoffs": cutoffs, "facts": facts, "calculations": calculations,
        "limitations": ["Generated prose and semantic support require review."],
    }


def assess(answer: AnalysisFinding, lens: dict) -> dict:
    calculations = {row["id"]: row for row in lens["calculations"]}
    assessed = []
    for claim in answer.claims:
        calculation = calculations.get(claim.calculation_id)
        status, computed = "unassessed", None
        reason = "Semantic interpretation has not been independently established."
        if claim.kind in {"causal", "intent"}:
            status = "unsupported"
            reason = "These recorded traces do not establish causation or private intent."
        elif claim.kind == "calculation":
            if calculation is None or calculation["value"] is None:
                status, reason = "unavailable", "No such calculation in this frozen lens."
            elif claim.scope != calculation["scope"]:
                status, reason = "unsupported", "Claim scope differs from the calculation's support."
            else:
                computed = calculation["value"]
                status = "checked" if claim.value is not None and math.isclose(
                    claim.value, computed, rel_tol=1e-12, abs_tol=1e-12,
                ) else "contradicted"
                reason = "Only the structured value and scope were checked; wording is unassessed."
        assessed.append({**claim.model_dump(), "status": status, "computed": computed,
                         "reason": reason})
    return {
        "version": VERSION, "prose_status": "unassessed", "claims": assessed,
        "status": "contradicted" if any(c["status"] == "contradicted" for c in assessed)
        else "needs_review",
        "limitation": "Exact checks concern structured assertions only. Citations, schemas and "
        "model agreement do not certify wording, interpretation, causality or intent.",
    }
