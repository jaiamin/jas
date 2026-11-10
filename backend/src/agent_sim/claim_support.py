"""Read-only, explicit calculation assertions; generated wording is never certified."""

import math
from typing import Literal

from pydantic import Field

from .domain import Finding, Strict

VERSION = 1


class ClaimProposal(Strict):
    kind: Literal["calculation", "annotation", "causal", "intent"]
    text: str = Field(min_length=1, max_length=2000)
    calculation_id: str | None = None
    value: float | None = Field(default=None, allow_inf_nan=False)
    scope: Literal["captured_run", "observed_pairs", "planned_sample"] = "captured_run"


class AnalysisFinding(Finding):
    claims: list[ClaimProposal] = Field(default_factory=list, max_length=24)


def capture_lens(research, cutoffs: dict[str, int]) -> dict:
    """Retain the literal World inputs rather than trusting analyst arithmetic."""
    facts, calculations = [], []
    for rid, cutoff in cutoffs.items():
        evidence = research.evidence(rid, cutoff)
        balances = evidence["checkpoint"]["balances"]
        fact = {
            "run_id": rid,
            "through_turn": cutoff,
            "state_hash": evidence["state_hash"],
            "balances": balances,
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
