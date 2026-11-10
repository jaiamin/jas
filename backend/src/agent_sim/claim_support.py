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
            "artifact_versions_when_defined",
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
            "artifact_versions_when_defined",
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
        fact: dict = {
            "run_id": rid,
            "through_turn": cutoff,
            "state_hash": recorded["state_hash"],
            "balances": balances,
            "artifact_state": recorded.get("artifact_state"),
            **(
                {"coordination_state": recorded["coordination_state"]}
                if "coordination_state" in recorded
                else {}
            ),
            **(
                {"reliance_state": recorded["reliance_state"]}
                if "reliance_state" in recorded
                else {}
            ),
            **(
                {"workflow_state": recorded["workflow_state"]}
                if "workflow_state" in recorded
                else {}
            ),
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
                "value": math.fsum(balances.values()) if balances is not None else None,
                "formula": "sum(balances.values()); unavailable when the World has no balances",
                "inputs": {"balances": balances},
                "sources": [fact["source"]],
                "assumptions": ["Utility balances are World accounting, not evidence of motive."],
            }
        )
        if artifact_state := fact["artifact_state"]:
            outcome = artifact_state["outcome"]
            artifact_calculations = [
                (
                    "artifact_writes",
                    sum(len(obj["versions"]) - 1 for obj in artifact_state["artifacts"].values()),
                    "sum(len(artifact.versions) - 1): initial versions are not writes",
                ),
            ]
            if "coordination_state" not in fact and "workflow_state" not in fact:
                artifact_calculations.append(
                    (
                        "artifact_success",
                        int(outcome["status"] == "success") if outcome is not None else None,
                        "1 if recorded terminal outcome is success else 0; null before termination",
                    )
                )
            for name, value, formula in artifact_calculations:
                calculations.append(
                    {
                        "id": f"run:{rid}:{name}",
                        "label": name.replace("_", " ").capitalize(),
                        "scope": "captured_run",
                        "value": value,
                        "formula": formula,
                        "inputs": artifact_state,
                        "sources": [fact["snapshot_source"]],
                        "assumptions": [
                            "Executable artifact outcomes are distinct from utility, actual "
                            "reading, input inclusion, attention or private intent."
                        ],
                    }
                )
        if workflow := fact.get("workflow_state"):
            for name, value, formula in (
                (
                    "workflow_materials_remaining",
                    workflow["resource_stock"],
                    "recorded shared material stock at cutoff",
                ),
                (
                    "workflow_materials_spent",
                    workflow["resource_spent"],
                    "recorded cumulative material debits at cutoff",
                ),
                (
                    "workflow_accepted",
                    sum(w["status"] == "accepted" for w in workflow["work"].values()),
                    "count(work.status == accepted): only selected recipient acceptance counts",
                ),
                (
                    "workflow_unfinished",
                    sum(w["status"] != "accepted" for w in workflow["work"].values()),
                    "count(work.status != accepted): ownership, writes and readiness "
                    "do not finish work",
                ),
            ):
                calculations.append(
                    {
                        "id": f"run:{rid}:{name}",
                        "label": name.replace("_", " ").capitalize(),
                        "scope": "captured_run",
                        "value": value,
                        "formula": formula,
                        "inputs": workflow,
                        "sources": [fact["snapshot_source"]],
                        "assumptions": [
                            "Materials and handoffs are executable World facts, "
                            "not utility or intent."
                        ],
                    }
                )
        if coordination := fact.get("coordination_state"):
            outcome = coordination["outcome"]
            choice_calculations = (
                (
                    "coordination_value",
                    sum(outcome["payoffs"].values()) if outcome is not None else None,
                    "sum(recorded terminal choice payoffs); null before terminal settlement",
                ),
                (
                    "coordination_match",
                    int(outcome["matched"]) if outcome is not None else None,
                    "1 if all three terminal choices match, else 0; null before termination",
                ),
            )
            if reliance := fact.get("reliance_state"):
                eligible = [r for r in reliance["commitments"].values() if r["eligible"]]
                choice_calculations = (
                    (
                        "reliance_value",
                        sum(outcome["payoffs"].values()) if outcome else None,
                        "sum(terminal choice_values + settled recipient reliance "
                        "effects); null before termination",
                    ),
                    (
                        "reliance_fulfillment",
                        sum(r["status"] == "fulfilled" for r in eligible) / len(eligible)
                        if eligible
                        else None,
                        "fulfilled / due relied promises with feasible and actual "
                        "opportunities; null without eligibility",
                    ),
                    (
                        "reliance_effect_total",
                        sum(reliance["reliance_effects"].values()),
                        "sum(recipient effects settled by captured cutoff); unresolved "
                        "deadlines settle nothing",
                    ),
                )
            for name, value, formula in choice_calculations:
                calculations.append(
                    {
                        "id": f"run:{rid}:{name}",
                        "label": name.replace("_", " ").capitalize(),
                        "scope": "captured_run",
                        "value": value,
                        "formula": formula,
                        "inputs": coordination,
                        "sources": [fact["snapshot_source"]],
                        "assumptions": [
                            "Declared choice payoffs are nonfinancial World outcomes, not "
                            "utility balances, a preferred social result or evidence of motive. "
                            "Pending proposals are not settled choices; queued mail is not input."
                        ],
                    }
                )
        claims = [e for e in events if e.kind == "claim" and e.data.get("eligible")]
        resolutions = [e for e in events if e.kind in {"commitment_resolved", "reliance_resolved"}]
        counters = {
            "decisions": len(turns),
            "messages": sum(e.kind in {"message", "message_queued"} for e in events),
            **(
                {
                    "messages_queued": sum(e.kind == "message_queued" for e in events),
                    "messages_delivered": sum(e.kind == "message_delivered" for e in events),
                }
                if "coordination_state" in fact or "workflow_state" in fact
                else {}
            ),
            "reports": len(claims),
            "false_reports": sum(e.data["reported"] != e.data["known_truth"] for e in claims),
            "feasible_commitments": sum(bool(e.data.get("eligible")) for e in resolutions),
            "feasible_commitment_breaches": sum(
                bool(e.data.get("eligible"))
                and (
                    e.data["status"] == "breached"
                    if e.kind == "reliance_resolved"
                    else e.data["actual"] < e.data["amount"]
                )
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
                        "messages": "count(events.kind in {message, message_queued}); "
                        "a queued message does not establish recipient delivery",
                        "messages_queued": "count(events.kind == message_queued)",
                        "messages_delivered": "count(events.kind == message_delivered); "
                        "mailbox arrival does not establish model input",
                        "reports": "count(events.kind == claim and data.eligible)",
                        "false_reports": "count(eligible claims where reported != known_truth)",
                        "feasible_commitments": "count(commitment_resolved or "
                        "reliance_resolved where data.eligible)",
                        "feasible_commitment_breaches": "count(eligible resolutions "
                        "where actual < amount "
                        "or typed reliance status is breached)",
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
                "message_opportunities": sum(
                    r["eligible_opportunities"]
                    for r in exposure[rid]["summary"]
                    if r["kind"]
                    == (
                        "message_delivered"
                        if "coordination_state" in fact or "workflow_state" in fact
                        else "message"
                    )
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
                            "history_records": len(t.observation["public_history"])
                            if "public_history" in t.observation
                            else None,
                            "experience_records": len(t.observation["your_experiences"])
                            if "your_experiences" in t.observation
                            else None,
                            "artifact_history_records": len(t.observation["artifact_history"])
                            if "artifact_history" in t.observation
                            else None,
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
                    "label": (
                        f"{effect['condition']} minus {effect['baseline']} · {effect['metric']}"
                    ),
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
        fact = next(f for f in frozen["facts"] if f["run_id"] == rid)
        artifact = fact.get("artifact_state")
        coordination = fact.get("coordination_state")
        workflow = fact.get("workflow_state")
        if key == "communication":
            messages = row["opportunities"]
            text = (
                f"{messages['messages']} recorded messages; "
                f"{messages['reports']} factual reports; "
                f"{messages['feasible_commitment_breaches']} feasible breaches. "
                f"{row['message_opportunities']} message opportunities; "
                f"input capture {row['exposure_capture']}."
            )
            if coordination or workflow:
                text += (
                    f" {messages['messages_queued']} queued; "
                    f"{messages['messages_delivered']} delivered to mailboxes. "
                    "Queued mail and mailbox arrival alone do not establish model input."
                )
        elif workflow:
            accepted = values[f"run:{rid}:workflow_accepted"]
            text = (
                f"{row['recorded_turns']} recorded proposals; "
                f"materials remaining {workflow['resource_stock']}; "
                f"spent {workflow['resource_spent']}; "
                f"accepted {accepted}/{len(workflow['work'])}; "
                f"unfinished {values[f'run:{rid}:workflow_unfinished']}; "
                f"logical time {workflow['logical_time']}. "
                "Financial utility unavailable; completion is not a required social outcome."
            )
        elif reliance := fact.get("reliance_state"):
            value = values[f"run:{rid}:reliance_value"]
            text = (
                f"{row['recorded_turns']} recorded proposals; "
                f"{len(reliance['commitments'])} explicit promises; "
                f"{row['opportunities']['feasible_commitment_breaches']} eligible "
                "deadline breaches; "
                f"declared value {value if value is not None else 'pending'}. "
                "Recipient effects are independent. Financial balances unavailable; "
                "intent and betrayal unassessed."
            )
        elif coordination:
            value = values[f"run:{rid}:coordination_value"]
            text = (
                f"{row['recorded_turns']} recorded proposals; "
                f"{len(coordination['choices'])} settled choices; declared choice value "
                f"{value if value is not None else 'pending'}. "
                "Financial balances unavailable; agreement is not a required outcome."
            )
        elif artifact:
            text = (
                f"{row['recorded_turns']} recorded artifact decisions; retained writes "
                f"{values[f'run:{rid}:artifact_writes']}; outcome "
                f"{artifact['outcome']['status'] if artifact['outcome'] else 'unfinished'}."
            )
        else:
            utility = values[f"run:{rid}:total_utility"]
            text = (
                f"{row['recorded_turns']} recorded decisions; cumulative utility "
                f"{format(utility, 'g') if utility is not None else 'unavailable'}."
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
                status, reason = (
                    "unavailable",
                    "Calculation or required inputs are unavailable in this frozen lens.",
                )
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
