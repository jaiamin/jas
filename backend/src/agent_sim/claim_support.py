"""Read-only, explicit calculation assertions; generated wording is never certified."""

import math
from typing import Literal

from sqlalchemy import select

from .comparisons import ComparisonRun, compare_runs
from .db import Measurement, RecordedEvent, Turn, digest
from .domain import Finding
from .metrics import aggregate_metrics
from .research import Research, event_dict

VERSION = 1
LensKey = Literal["behavior", "communication"]
LENSES = {
    "behavior": {
        "name": "Recorded behavior",
        "requirements": [
            "cutoff_checkpoint",
            "settled_turns",
            "recorded_events",
            "versioned_measurements",
            "planned_membership",
        ],
    },
    "communication": {
        "name": "Communication evidence",
        "requirements": [
            "cutoff_checkpoint",
            "settled_turns",
            "recorded_events",
            "versioned_measurements",
            "planned_membership",
            "authorized_observations",
            "exact_request_delivery",
            "feasible_commitment_resolution",
        ],
    },
}


def capture_lens(
    research: Research,
    cutoffs: dict[str, int],
    comparisons: dict | None = None,
    exposure: dict | None = None,
    key: LensKey = "behavior",
    *,
    index: dict,
    analysis_id: str,
) -> dict:
    """Retain the literal World inputs rather than trusting analyst arithmetic."""
    facts, calculations, coverage = [], [], []
    comparisons = comparisons if comparisons is not None else research.capture_comparisons(cutoffs)
    exposure = exposure if exposure is not None else research.capture_exposure(cutoffs)
    indexed = {row["run_id"]: row for row in index["runs"]}
    for rid, cutoff in cutoffs.items():
        recorded = indexed[rid]
        balances = recorded["outcome"]["balances"]
        with research.db.session() as session:
            measurements = session.scalars(
                select(Measurement)
                .where(
                    Measurement.run_id == rid,
                    Measurement.turn <= cutoff,
                )
                .order_by(Measurement.id)
            ).all()
            turns = session.scalars(
                select(Turn)
                .where(
                    Turn.run_id == rid,
                    Turn.number <= cutoff,
                )
                .order_by(Turn.number)
            ).all()
            events = session.scalars(
                select(RecordedEvent)
                .where(
                    RecordedEvent.run_id == rid,
                    RecordedEvent.turn <= cutoff,
                )
                .order_by(RecordedEvent.id)
            ).all()
        raw_measurements = [
            {
                "turn": row.turn,
                "key": row.key,
                "value": row.value,
                "denominator": row.denominator,
                "version": row.version,
            }
            for row in measurements
        ]
        fact = {
            "run_id": rid,
            "through_turn": cutoff,
            "state_hash": recorded["state_hash"],
            "balances": balances,
            "measurements": raw_measurements,
            "rule_version": recorded["recorded_rule_version"],
            "turns": [
                {
                    "turn": t.number,
                    "actor": t.actor,
                    "action": t.decision["action"],
                    "state_hash": t.state_hash,
                }
                for t in turns
            ],
            "events": [event_dict(e) for e in events],
            "input_membership": exposure[rid]["membership"],
            "source": {"href": f"/api/runs/{rid}/turns/{cutoff}", "pointer": "/checkpoint"},
            "snapshot_source": {
                "href": f"/api/analyses/{analysis_id}",
                "pointer": f"/output/lens/facts/{len(facts)}",
            },
        }
        facts.append(fact)
        calculations.append(
            {
                "id": f"run:{rid}:total_utility",
                "label": "Recorded total utility",
                "scope": "captured_run",
                "value": math.fsum(balances.values()),
                "formula": "sum(balances.values())",
                "inputs": {"balances": balances},
                "sources": [fact["source"]],
                "assumptions": ["Utility balances are World accounting, not evidence of motive."],
            }
        )
        claims = [e for e in events if e.kind == "claim" and e.data.get("eligible")]
        resolutions = [e for e in events if e.kind == "commitment_resolved"]
        counters = {
            "decisions": len(turns),
            "messages": sum(e.kind == "message" for e in events),
            "reports": len(claims),
            "false_reports": sum(e.data["reported"] != e.data["known_truth"] for e in claims),
            "feasible_commitments": sum(bool(e.data.get("eligible")) for e in resolutions),
            "feasible_commitment_breaches": sum(
                bool(e.data.get("eligible")) and e.data["actual"] < e.data["amount"]
                for e in resolutions
            ),
        }
        for name, value in counters.items():
            calculations.append(
                {
                    "id": f"run:{rid}:{name}",
                    "label": name.replace("_", " ").capitalize(),
                    "scope": "captured_run",
                    "value": value,
                    "formula": {
                        "decisions": "count(recorded turns <= cutoff)",
                        "messages": "count(events.kind == message)",
                        "reports": "count(events.kind == claim and data.eligible)",
                        "false_reports": "count(eligible claims where reported != known_truth)",
                        "feasible_commitments": "count(commitment_resolved where data.eligible)",
                        "feasible_commitment_breaches": "count(eligible commitment_resolved "
                        "where actual < amount)",
                    }[name],
                    "inputs": {"fact_run_id": rid, "through_turn": cutoff},
                    "sources": [fact["snapshot_source"]],
                    "assumptions": [
                        "Only explicitly recorded World fields are measured. Free-text "
                        "falsehood, voluntary reliance, causality and intent are unassessed."
                    ],
                }
            )
        for row in exposure[rid]["summary"]:
            calculations.append(
                {
                    "id": f"run:{rid}:{row['kind']}_exposed_participants",
                    "label": f"{row['kind']} · confirmed input participants",
                    "scope": "captured_run",
                    "value": row["exposed_participants"],
                    "formula": "count(distinct eligible participants with confirmed exact input); "
                    "null if coverage or receipt is unavailable",
                    "inputs": {"summary": row, "membership": exposure[rid]["membership"]},
                    "sources": [
                        {
                            "href": f"/api/analyses/{analysis_id}",
                            "pointer": f"/output/exposure/{rid}/opportunities",
                        }
                    ],
                    "assumptions": exposure[rid]["interpretation"],
                }
            )
        covered = {t.number for t in turns}
        coverage.append(
            {
                "run_id": rid,
                "through_turn": cutoff,
                "recorded_turns": len(turns),
                "missing_turns": sorted(set(range(1, cutoff + 1)) - covered),
                "event_records": len(events),
                "exposure_capture": exposure[rid]["capture"],
                "message_opportunities": next(
                    r["eligible_opportunities"]
                    for r in exposure[rid]["summary"]
                    if r["kind"] == "message"
                ),
                "unknown_requests": exposure[rid]["delivery"]["unknown_requests"],
                "opportunities": counters,
                "truncation": {
                    "run_continues": not recorded["completed_at_cutoff"],
                    "unrecorded_history": "Unavailable: a lens cannot reconstruct omitted history, "
                    "attention, private beliefs or uncaptured artifact versions.",
                    "observation_windows": [
                        {
                            "turn": t.number,
                            "history_records": len(t.observation.get("history", [])),
                            "experience_records": len(t.observation.get("experiences", [])),
                        }
                        for t in turns
                    ],
                    "note": "Observations preserve their original bounded memory windows. "
                    "Complete settled events do not imply complete participant memory.",
                },
            }
        )
    by_run = {row["run_id"]: row for row in facts}
    for revision, report in comparisons.items():
        cells = report["comparison"]["cells"]
        selected = [c for c in cells if c["run_id"] in by_run]
        _, design, _ = research.configuration(selected[0]["run_id"])
        # Reuse T06's metric aggregation and matching; raw measurements are retained.
        # No analyst-supplied outcome or reimplemented statistical engine participates.
        computed = compare_runs(
            [
                ComparisonRun(
                    run_id=c["run_id"],
                    condition_key=c["condition_key"],
                    seed=c["seed"],
                    repetition=c["repetition"],
                    status=c["status"],
                    through_turn=c["through_turn"],
                    attempted=c["attempted"],
                    error=c["reason"],
                    metrics=aggregate_metrics(
                        (m["key"], m["value"]) for m in by_run[c["run_id"]]["measurements"]
                    ),
                )
                for c in selected
            ],
            design,
        )
        for effect in computed["effects"]:
            calculations.append(
                {
                    "id": f"contrast:{revision}:{effect['condition_key']}:{effect['metric']}",
                    "label": f"{effect['condition']} minus {effect['baseline']} · {effect['metric']}",
                    "scope": "observed_pairs",
                    "value": effect["mean"],
                    "formula": "T06 comparison v1: condition - baseline per matched terminal cell; "
                    "mean repetitions within seed, then mean observed seed clusters",
                    "inputs": {
                        "condition_key": effect["condition_key"],
                        "baseline_key": effect["baseline_key"],
                        "metric": effect["metric"],
                        "design": design.model_dump(),
                        "cells": cells,
                        "measurements": {
                            c["run_id"]: [
                                m
                                for m in by_run[c["run_id"]]["measurements"]
                                if m["key"] == effect["metric"]
                            ]
                            for c in selected
                        },
                    },
                    "coverage": {
                        "pairs": effect["pairs"],
                        "planned_pairs": effect["planned_pairs"],
                        "seed_clusters": effect["seeds"],
                    },
                    "missing": effect["missing_pairs"],
                    "sensitivity": effect["sensitivity"],
                    "sources": [by_run[c["run_id"]]["snapshot_source"] for c in selected],
                    "assumptions": [effect["selection_assumption"], effect["uncertainty_reason"]],
                }
            )
    cells = [c for report in comparisons.values() for c in report["comparison"]["cells"]]
    frozen = {
        "version": VERSION,
        "key": key,
        **LENSES[key],
        "cutoffs": cutoffs,
        "facts": facts,
        "calculations": calculations,
        "coverage": {
            "runs": coverage,
            "planned_cells": len(cells),
            "failed_cells": sum(c["status"] == "failed" for c in cells),
            "not_captured_cells": sum(c["status"] == "not_captured" for c in cells),
            "nonterminal_cells": sum(c["status"] != "complete" for c in cells),
        },
        "inputs_sha256": digest(
            {"cutoffs": cutoffs, "facts": facts, "comparisons": comparisons, "exposure": exposure}
        ),
        "limitations": [
            "Generated prose and semantic support require review.",
            "Absent recorded opportunities do not establish attention, belief or intent.",
            "False factual reports and feasible commitment breaches are distinct from deception.",
            "Observed fixed seed clusters do not establish independent population support; "
            "T06 uncertainty withholding, selection assumptions and bounds apply.",
        ],
    }
    return apply_lens(frozen, key)


def apply_lens(frozen: dict, key: LensKey) -> dict:
    if frozen.get("version") != VERSION:
        raise ValueError("Unsupported analysis lens version; no conversion is available")
    values = {c["id"]: c["value"] for c in frozen["calculations"]}
    account = []
    for row in frozen["coverage"]["runs"]:
        rid = row["run_id"]
        text = (
            (
                f"{row['recorded_turns']} recorded decisions; cumulative utility "
                f"{values[f'run:{rid}:total_utility']:g}."
            )
            if key == "behavior"
            else (
                f"{row['opportunities']['messages']} recorded messages; "
                f"{row['opportunities']['reports']} factual reports; "
                f"{row['opportunities']['feasible_commitment_breaches']} feasible breaches. "
                f"{row['message_opportunities']} message opportunities; "
                f"input capture {row['exposure_capture']}."
            )
        )
        account.append({"run_id": rid, "turn": row["through_turn"], "text": text})
    return {**frozen, "key": key, **LENSES[key], "account": account}


def assess(answer: Finding, lens: dict) -> dict:
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
                status, reason = (
                    "unsupported",
                    "Claim scope differs from the calculation's support.",
                )
            else:
                computed = calculation["value"]
                status = (
                    "checked"
                    if claim.value is not None
                    and math.isclose(
                        claim.value,
                        computed,
                        rel_tol=1e-12,
                        abs_tol=1e-12,
                    )
                    else "contradicted"
                )
                if claim.pairs is not None and claim.pairs != calculation.get("coverage", {}).get(
                    "pairs"
                ):
                    status = "contradicted"
                reason = "Only the structured value and scope were checked; wording is unassessed."
        assessed.append(
            {**claim.model_dump(), "status": status, "computed": computed, "reason": reason}
        )
    return {
        "version": VERSION,
        "prose_status": "unassessed",
        "claims": assessed,
        "status": "contradicted"
        if any(c["status"] == "contradicted" for c in assessed)
        else "needs_review",
        "limitation": "Exact checks concern structured assertions only. Citations, schemas and "
        "model agreement do not certify wording, interpretation, causality or intent.",
        "numeric_tolerance": {"relative": 1e-12, "absolute": 1e-12},
    }
