"""Deterministic research diagnostics and explicit, terminal-outcome calculations."""

import copy
import math
from collections import Counter
from functools import lru_cache
from itertools import product
from typing import TypedDict

from .comparisons import ComparisonRun, compare_runs
from .db import digest
from .domain import Design, Parameters, PlannedOutcome
from .reference_policies import reference_decision
from .simulation.environments import create_world


def coordination_values(design: Design, parameters: Parameters) -> dict[str, int]:
    """Enumerate joint actions, including abstention; never expose this to actors."""
    rules, artifacts = parameters.coordination, parameters.artifacts
    if design.environment != "distributed_coordination" or rules is None or artifacts is None:
        raise ValueError("Joint-value regret requires distributed_coordination")
    objects = {obj.key: obj for obj in artifacts.objects}
    tables = [objects[rules.information[p.key]].content for p in design.profiles]

    def value(choices):
        return sum(
            int(table[choice]) if choice is not None else 0
            for table, choice in zip(tables, choices, strict=True)
        ) + (
            len(tables) * rules.match_bonus if None not in choices and len(set(choices)) == 1 else 0
        )

    # Use the actual actor-only control, including ACL order and the declared horizon.
    reference = create_world(design.model_copy(update={"scenarios": []}), parameters, 0)
    while (actor := reference.actor()) is not None:
        observed = reference.observe(actor)
        decision = reference_decision(
            "local_value_v1", observed, reference.decision_schema(observed)
        )
        reference.step(actor, decision)
    return {
        "local_value": sum(reference.snapshot()["outcome"]["payoffs"].values()),
        "joint_optimum": max(
            value(choices) for choices in product([None, *rules.alternatives], repeat=len(tables))
        ),
    }


def scientific_review(design: Design) -> dict:
    return copy.deepcopy(_scientific_review(design.model_dump_json()))


@lru_cache(maxsize=32)
def _scientific_review(specification: str) -> dict:
    design = Design.model_validate_json(specification)
    issues, variation = [], []

    def issue(code: str, message: str, next_test: str) -> None:
        issues.append({"code": code, "message": message, "next_test": next_test})

    if design.analysis_plan is None:
        issue(
            "analysis_not_declared",
            "Prose outcomes have no executable analysis plan.",
            "Declare computed outcomes or a manual coding plan before new trials.",
        )
    if len(design.conditions) == 1:
        issue(
            "descriptive_only",
            "One condition describes behavior without an intervention contrast.",
            "Add a matched control if the question asks what causes a difference.",
        )
    if all(c.harness.kind != "scripted" for c in design.conditions):
        issue(
            "no_reference_policy",
            "No non-model reference policy is declared.",
            "Use a supported actor-only reference or a matched harness ablation where informative.",
        )
    if design.environment in {"sealed_relay", "reviewed_finite"}:
        issue(
            "scenario_probe_unavailable",
            "Initial-scenario census is unavailable for executable extensions.",
            "Inspect independently admitted cases and their initial states.",
        )
    else:
        for condition in design.conditions:
            states, payoff_cases = {}, []
            for seed in design.seeds:
                world = create_world(design.resolve(condition), condition.parameters, seed)
                states[str(seed)] = digest(world.snapshot())
                if design.environment == "distributed_coordination":
                    payoff_cases.append(
                        {
                            "seed": seed,
                            **coordination_values(
                                design, design.scenario_parameters(condition.parameters, seed)
                            ),
                        }
                    )
            distinct = len(set(states.values()))
            variation.append(
                {
                    "condition_key": condition.key,
                    "seeds": len(states),
                    "distinct_initial_states": distinct,
                    "initial_state_sha256": states,
                    "payoff_cases": payoff_cases,
                }
            )
            if payoff_cases and all(c["local_value"] == c["joint_optimum"] for c in payoff_cases):
                issue(
                    "local_information_sufficient",
                    f"{condition.name}: the declared local-value reference already attains "
                    "the joint optimum in every scenario; optimal payoff does not require pooling.",
                    "Include independently checked cases where the local-value control has "
                    "positive regret before attributing optimal choices to coordination.",
                )
            if len(states) > 1 and distinct == 1:
                issue(
                    "fixed_initial_scenario",
                    f"{condition.name}: {len(states)} seed labels produce "
                    "one identical initial state; later randomness has not been assessed.",
                    "Vary actual tables/scenarios and counterbalance roles/order; "
                    "do not count labels as new problems.",
                )
    if design.environment == "distributed_coordination":
        issue(
            "free_waiting",
            "Waiting has no world-utility cost; only the finite horizon limits it. "
            "API spending is separate from participant payoffs.",
            "Compare explicit shorter horizons before claiming delay harms choice quality. "
            "A per-wait payoff cost requires separately reviewed mechanics; prose cannot add it.",
        )
        issue(
            "fixed_roles_order",
            "Names, roles, directory and action/conflict order are fixed within each condition.",
            "Counterbalance those factors in separately declared conditions/studies "
            "before attributing leadership.",
        )
    return {
        "version": 1,
        "scientific_validity": "not_certified",
        "issues": issues,
        "variation": variation,
        "limits": "Initial states are not trajectories or independent population draws. "
        "These diagnostics do not certify question fit, sensitivity, "
        "model intelligence or real-world validity.",
    }


def completion(status: str, state: dict, turns: int, maximum: int, environment: str) -> dict:
    outcome = state.get("outcome") or {}
    reason = outcome.get("reason") or outcome.get("status")
    if status != "complete":
        reason = status
    elif not reason:
        if environment == "coordination" and all(t["completed_by"] for t in state.get("tasks", [])):
            reason = "tasks_complete"
        else:
            reason = "horizon" if turns >= maximum else "world_terminal"
    return {
        "reason": reason,
        "actual_turns": turns,
        "maximum_turns": maximum,
        "success": outcome.get("success"),
        "interpretation": "Complete means the rules ended this trajectory; "
        "it does not establish success or competence.",
    }


FORMULAS = {
    "metric": "Registered metric aggregated with its installed denominator/terminal semantics.",
    "turn_count": "Number of committed actor decisions at terminal capture.",
    "request_count": "All run-linked participant and adjudication attempts; "
    "Researcher analysis calls are excluded.",
    "cost_usd": "Sum of participant/adjudication integer ledger microdollars / 1,000,000; "
    "Researcher calls excluded; unavailable while usage is pending/unknown. No price backfill.",
    "wait_count": "Count of coordination_wait events; "
    "phased proposals count only after settlement.",
    "message_count": "Count of message or message_queued events; queued does not mean received.",
    "coordination_regret": "Maximum feasible terminal joint value (including abstention) "
    "minus recorded coordination_value. Researcher-only omniscient comparator, "
    "not an information-constrained actor policy or a test of irrationality.",
    "manual": "Not computed; requires the declared coding/assessment procedure.",
}


class OutcomeUsage(TypedDict):
    requests: int
    charged: int
    partial: bool
    unpriced: bool


def outcome_value(
    outcome: PlannedOutcome,
    design: Design,
    condition,
    run: dict,
    metrics: dict,
    events: Counter,
    usage: OutcomeUsage,
) -> tuple[float | None, str | None]:
    if outcome.calculation == "manual":
        return None, outcome.manual_reason
    if run["status"] != "complete":
        return None, f"Run {run['status']}; no eligible terminal outcome."
    match outcome.calculation:
        case "metric":
            value = metrics.get(outcome.metric)
        case "turn_count":
            value = run["turn"]
        case "request_count":
            value = usage["requests"]
        case "cost_usd":
            value = None if usage["partial"] or usage["unpriced"] else usage["charged"] / 1_000_000
        case "wait_count":
            value = events["coordination_wait"]
        case "message_count":
            value = events["message"] + events["message_queued"]
        case "coordination_regret":
            actual = metrics.get("coordination_value")
            value = (
                None
                if actual is None
                else coordination_values(
                    design, design.scenario_parameters(condition.parameters, run["seed"])
                )["joint_optimum"]
                - actual
            )
        case _:
            raise ValueError("Unsupported calculation")
    return (
        (float(value), None)
        if value is not None and math.isfinite(value)
        else (None, "Required terminal measurement or settled usage is unavailable.")
    )


def findings_report(
    design: Design,
    revision: int,
    sha256: str,
    runs: list[dict],
    metrics: dict,
    events: dict,
    usage: dict[str, OutcomeUsage],
) -> dict:
    # An undeclared plan exposes registered results/effort, never pretends to preregister them.
    outcomes = (
        design.analysis_plan.outcomes
        if design.analysis_plan
        else [PlannedOutcome(key=key, calculation="metric", metric=key) for key in design.measures]
    )
    conditions = {c.key: c for c in design.conditions}
    values, evidence = {}, []
    for run in runs:
        values[run["id"]] = {}
        for outcome in outcomes:
            value, missing = outcome_value(
                outcome,
                design,
                conditions[run["condition_key"]],
                run,
                metrics[run["id"]],
                events[run["id"]],
                usage[run["id"]],
            )
            if value is not None:
                values[run["id"]][f"analysis:{outcome.key}"] = value
            evidence.append(
                {
                    "outcome": outcome.key,
                    "run_id": run["id"],
                    "value": value,
                    "missing_reason": missing,
                    "through_turn": run["turn"],
                    "source": f"/api/runs/{run['id']}/turns/{run['turn']}",
                }
            )
    calculated = design.model_copy(update={"measures": [f"analysis:{o.key}" for o in outcomes]})
    comparison = compare_runs(
        [
            ComparisonRun(
                run_id=r["id"],
                condition_key=r["condition_key"],
                seed=r["seed"],
                repetition=r["repetition"],
                status=r["status"],
                through_turn=r["turn"],
                attempted=r["turn"] > 0
                or usage[r["id"]]["requests"] > 0
                or r["status"] == "failed",
                metrics=values[r["id"]],
                error=r["error"],
            )
            for r in runs
        ],
        calculated,
        metric_sources={f"analysis:{o.key}": o.metric for o in outcomes if o.metric is not None},
    )
    for row in comparison["results"] + comparison["effects"]:
        row["metric"] = row["metric"].removeprefix("analysis:")
    complete = sum(r["status"] == "complete" for r in runs)
    review = scientific_review(design)
    effort = []
    for condition in design.conditions:
        group = [r for r in runs if r["condition_key"] == condition.key]
        effort.append(
            {
                "condition_key": condition.key,
                "condition": condition.name,
                "requests": sum(usage[r["id"]]["requests"] for r in group),
                "cost_usd": None
                if any(usage[r["id"]]["unpriced"] for r in group)
                else sum(usage[r["id"]]["charged"] for r in group) / 1_000_000,
                "partial": any(usage[r["id"]]["partial"] for r in group),
                "committed_turns": sum(r["turn"] for r in group),
                "waits": sum(events[r["id"]]["coordination_wait"] for r in group),
            }
        )
    observations = []
    for outcome in outcomes:
        if outcome.calculation == "manual":
            continue
        captured = [
            row for row in evidence if row["outcome"] == outcome.key and row["value"] is not None
        ]
        if captured and len({row["value"] for row in captured}) == 1:
            value = captured[0]["value"]
            observations.append(
                {
                    "outcome": outcome.key,
                    "runs": len(captured),
                    "text": f"{outcome.key}: every eligible terminal run has value {value:g}. "
                    + (
                        "All observed choices attained the feasible joint-value optimum. "
                        if outcome.calculation == "coordination_regret" and value == 0
                        else ""
                    )
                    + "No observed variation does not establish equivalence or general robustness.",
                }
            )
    return {
        "version": 1,
        "revision": revision,
        "design_sha256": sha256,
        "plan_status": "declared" if design.analysis_plan else "not_declared",
        "plan": design.analysis_plan.model_dump() if design.analysis_plan else None,
        "complete": complete,
        "planned": design.run_count,
        "status": "complete" if complete == design.run_count else "incomplete",
        "summary": f"{complete} of {design.run_count} planned trajectories completed. "
        "Results describe this pinned protocol; no independent population support is established.",
        "outcomes": [
            {
                "key": o.key,
                "calculation": o.calculation,
                "status": "manual" if o.calculation == "manual" else "computed",
                "formula": FORMULAS[o.calculation],
                "manual_reason": o.manual_reason,
            }
            for o in outcomes
        ],
        "results": comparison["results"],
        "effects": comparison["effects"],
        "evidence": evidence,
        "observations": observations,
        "effort": effort,
        "review": review,
        "next_tests": list(dict.fromkeys(i["next_test"] for i in review["issues"])),
        "interpretation": "Numerical calculations are checked against recorded fields. "
        "They do not validate prose, causation, attention, motives or general intelligence. "
        "Failures remain in the planned denominator; "
        "outcome means use eligible terminal runs only.",
    }
