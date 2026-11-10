"""Provider-free checks of what a protocol implements, not a score for its story."""

import copy
import hashlib
import json
from collections import Counter
from functools import lru_cache
from math import prod
from typing import Literal

from pydantic import Field, field_validator

from .domain import Action, Decision, Design, Strict, Treatment
from .simulation.checkpoints import Observation
from .simulation.environments import CATALOG, create_world
from .simulation.world import World

COMMON = {
    "participant_profiles": "Private goal/role instructions and condition overrides; "
    "labels do not create permissions or enforce preferences.",
    "model_assignment": "Registered condition/participant models; no model-weight training.",
    "messaging": "Optional participant messages; no external tools or real-world enforcement.",
    "signal_disclosure": "Private versus public synthetic signals, not arbitrary resource facts.",
    "retained_memory": "History, private notes and retrieved experience; no weight training.",
    "repeated_interaction": "Finite repeated model decisions, not calibrated human prediction.",
}
CAPABILITIES = {
    "commons": {
        "contributions": "Sealed contributions to a multiplied shared fund; fresh round budgets.",
        "capacity_shocks": "Scheduled per-round credit capacity changes, not physical needs.",
        "commitments": "Recorded promises with due feasible/infeasible fulfillment scoring.",
    },
    "trust_exchange": {
        "reciprocal_transfers": "Paired multiplied transfers and optional costly returns.",
        "capacity_shocks": "Scheduled per-round credit capacity changes, not physical needs.",
        "commitments": "Recorded promises with feasible/infeasible fulfillment scoring.",
    },
    "coordination": {
        "task_dependencies": "Public authoritative tasks, effort and prerequisites; any agent "
        "can work on any task and useful work pays personally. No private skills or task state.",
    },
    "institution": {
        "allocation_power": "Authorities allocate fresh credits or sanction workers.",
        "sanction_visibility": "Public/party-only sanctions; allocations stay public.",
        "oversight": "Independent audit probability and deterministic sanction appeals.",
        "allocation_budget": "Fresh authority budget, not finite stock or unmet physical needs.",
    },
    "bargaining": {
        "binding_negotiation": "Dyadic offers, acceptance, delay discount and outside options.",
    },
    "information": {
        "noisy_evidence": "Binary evidence accuracy; hidden truth redraws each round.",
        "outcome_feedback": "Immediate versus delayed rewards/outcomes; a bundled feedback rule.",
    },
    "composed": {
        "shared_extraction": "Resources with no controllers permit each participant to extract "
        "from the persistent shared stock, under the action limit.",
        "finite_stock": "Explicit persistent stocks; no fresh allocation credits.",
        "resource_depletion": "Consumption, stock extraction and configured replenishment.",
        "allocation_power": "Configured controllers alone allocate each controlled stock; "
        "one recipient or an equal split of the total among everyone per turn.",
        "resource_visibility": "Separate public/controller-only stock and public/party-only "
        "allocation records. Public allocation visibility also reveals current inventories.",
        "consumption_needs": "Automatic round consumption, unmet-need penalties and terminal "
        "inventory utility. Needs are uniform per resource, not calibrated physiology.",
        "inventory_transfers": "Optional transfers from personally held resources; no loans.",
    },
    "renewable_resource": {
        "shared_extraction": "Every participant has equal extraction permissions.",
        "finite_stock": "Renewable stock, sealed extraction, proportional rationing.",
        "resource_depletion": "Extraction, regeneration and collapse; stock is always visible.",
    },
}


class Requirement(Strict):
    source: str = Field(
        min_length=1,
        max_length=300,
        description="Verbatim phrase naming an essential mechanic; "
        "exclude behavioral outcome labels.",
    )
    capability: Literal[
        "allocation_budget",
        "allocation_power",
        "binding_negotiation",
        "capacity_shocks",
        "commitments",
        "contributions",
        "finite_stock",
        "messaging",
        "model_assignment",
        "noisy_evidence",
        "outcome_feedback",
        "oversight",
        "participant_profiles",
        "reciprocal_transfers",
        "repeated_interaction",
        "resource_depletion",
        "resource_visibility",
        "shared_extraction",
        "consumption_needs",
        "inventory_transfers",
        "retained_memory",
        "sanction_visibility",
        "signal_disclosure",
        "task_dependencies",
        "unavailable",
    ]
    mapping: Literal["direct", "proxy", "missing"] = Field(
        description="Direct means the requested mechanic is enforced. Operationalizing "
        "observable behavior with supported actions and caveats is not a proxy. Proxy means "
        "replacing an essential mechanic with a different one."
    )
    explanation: str = Field(min_length=1, max_length=400)

    @field_validator("source")
    @classmethod
    def quoted_phrase(cls, value: str) -> str:
        value = " ".join(value.split())
        if len(value) >= 2 and (value[0], value[-1]) in {
            ('"', '"'),
            ("'", "'"),
            ("“", "”"),
            ("‘", "’"),
            ("`", "`"),
        }:
            value = value[1:-1].strip()
        if not value:
            raise ValueError("Question construct must contain words")
        return value


def capabilities(environment: str) -> dict[str, str]:
    return {**COMMON, **CAPABILITIES[environment]}


def requirement_issues(
    environment: str, requirements: list[Requirement], design: Design | None = None
) -> list[str]:
    available = capabilities(environment)
    if environment == "composed" and design is not None:
        compositions = [c.parameters.composition for c in design.conditions]
        if not any(
            r
            and any(
                resource.controllers
                and set(resource.controllers) < {p.key for p in design.profiles}
                for resource in r.resources
            )
            for r in compositions
        ):
            available.pop("allocation_power", None)
        if not any(r and any(resource.need > 0 for resource in r.resources) for r in compositions):
            available.pop("consumption_needs", None)
        if not any(r and any(resource.transfers for resource in r.resources) for r in compositions):
            available.pop("inventory_transfers", None)
        if not any(
            r and any(not resource.controllers for resource in r.resources) for r in compositions
        ):
            available.pop("shared_extraction", None)
    return [
        f"{r.source}: {r.explanation} (requires {r.capability}; {r.mapping} mapping)."
        for r in requirements
        if r.mapping != "direct" or r.capability not in available
    ]


def _differences(left: dict, right: dict, prefix: str = "") -> list[str]:
    result = []
    for key in sorted(left.keys() | right.keys()):
        path = f"{prefix}.{key}" if prefix else key
        a, b = left.get(key), right.get(key)
        if isinstance(a, dict) and isinstance(b, dict):
            result.extend(_differences(a, b, path))
        elif (
            isinstance(a, list)
            and isinstance(b, list)
            and a
            and b
            and all(isinstance(v, dict) and "key" in v for v in [*a, *b])
            and {v["key"] for v in a} == {v["key"] for v in b}
        ):
            if [v["key"] for v in a] != [v["key"] for v in b]:
                result.append(f"{path}.order")
            result.extend(_differences({v["key"]: v for v in a}, {v["key"]: v for v in b}, path))
        elif a != b:
            result.append(path)
    return result


def participant_assignment(design: Design, condition: Treatment) -> dict:
    scripted = condition.harness.kind == "scripted"
    return {
        "model": None if scripted else condition.model,
        "profiles": [
            p.model_dump() | ({"model": None} if scripted else {})
            for p in design.resolve(condition).profiles
        ],
    }


def condition_grid(design: Design) -> dict:
    """Crossing of executable settings; perfectly coupled fields form one bundle."""

    def fields(value: object, prefix: str = "") -> dict:
        if (
            isinstance(value, list)
            and value
            and all(isinstance(item, dict) and "key" in item for item in value)
        ):
            return {
                f"{prefix}.order": [item["key"] for item in value],
                **fields({item["key"]: item for item in value}, prefix),
            }
        if isinstance(value, dict):
            return {
                path: leaf
                for key, item in value.items()
                for path, leaf in fields(item, f"{prefix}.{key}" if prefix else key).items()
            }
        return {prefix: value}

    rows = [
        fields(
            {
                "parameters": c.parameters.model_dump(),
                "harness": c.harness.model_dump(),
                **participant_assignment(design, c),
            }
        )
        for c in design.conditions
    ]
    bundles: dict[tuple[int, ...], list[str]] = {}
    for path in sorted(set().union(*(row.keys() for row in rows))):
        levels: dict[str, int] = {}
        partition = []
        for row in rows:
            value = json.dumps([path in row, row.get(path)], sort_keys=True)
            partition.append(levels.setdefault(value, len(levels)))
        if len(levels) > 1:
            bundles.setdefault(tuple(partition), []).append(path)
    cells: dict[tuple[int, ...], list[str]] = {}
    for i, c in enumerate(design.conditions):
        cells.setdefault(tuple(axis[i] for axis in bundles), []).append(c.key)
    expected = prod(len(set(axis)) for axis in bundles)
    return {
        "factors": [{"fields": paths, "levels": len(set(axis))} for axis, paths in bundles.items()],
        "expected_cells": expected,
        "observed_cells": len(cells),
        "complete": expected == len(cells),
        "duplicate_conditions": [keys for keys in cells.values() if len(keys) > 1],
        "limits": "Inferred from executable settings. Perfectly coupled fields count as one "
        "bundled factor; coverage does not establish causal isolation or statistical power.",
    }


def factorial_issues(grid: dict) -> list[dict]:
    if len(grid["factors"]) >= 2 and grid["complete"]:
        return []
    return [
        {
            "code": "incomplete_factorial",
            "severity": "error",
            "message": "Declared factorial requires at least two independently varied factor "
            f"bundles and every crossed cell; found {len(grid['factors'])} bundles and "
            f"{grid['observed_cells']}/{grid['expected_cells']} cells. "
            "Duplicate arms do not replace missing cells.",
        }
    ]


def _instrument(world: World, actor: str, observation: Observation, variant: int) -> Decision:
    """Legal diagnostic choices only. Never used by participant execution."""
    options = observation["legal_actions"]
    option = options[0] if variant < 2 else options[-1]
    kind = option["kind"]
    target = option.get("target", option.get("targets", [""])[0])
    amount = option.get("amount_min", 0) if variant == 0 else option.get("amount_max", 0)
    if "tasks" in observation:
        completed = {t["key"] for t in observation["tasks"] if t["completed_by"]}
        task = next(
            (
                t
                for t in observation["tasks"]
                if not t["completed_by"] and set(t["dependencies"]) <= completed
            ),
            None,
        )
        kind, target = ("work", task["key"]) if variant != 0 and task else ("wait", "")
        amount = 0
    elif kind == "allocate" and "resources" not in observation:
        target = next(p["key"] for p in observation["participants"] if p["key"] != actor)
    elif "pie" in observation and variant == 2:
        kind = "offer" if observation["proposer"] == actor else "reject"
        target, amount = "", observation["pie"] // 2 if kind == "offer" else 0
    elif kind == "offer":
        amount = 0 if variant == 0 else observation["pie"] // 2
    elif kind == "choose":
        amount = (
            observation["your_private_signal"]
            if variant
            else 1 - observation["your_private_signal"]
        )
    # The third instrument deliberately creates sanction/appeal opportunities.
    if variant == 2 and any(o["kind"] == "sanction" for o in options):
        option = next(o for o in options if o["kind"] == "sanction")
        kind, target, amount = "sanction", option["targets"][0], option["amount_max"]
    elif variant == 2 and any(o["kind"] == "appeal" for o in options):
        kind, target, amount = "appeal", "", 0
    rules = world.schema_rules(observation)
    channels = observation["communication_channels"] if observation["communication"] else []
    return Decision(
        action=Action.model_validate(
            {
                "kind": kind,
                "amount": amount,
                "target": target,
                "message": f"Diagnostic message, round {observation['round']}"
                if "messages" in channels
                else "",
                "report": observation["your_private_signal"] if "reports" in channels else None,
                "promise": 0 if "promises" in channels and rules.promise_limit else None,
            }
        ),
        rationale="Preflight instrument; not model behavior.",
        memory=f"Diagnostic private note, round {observation['round']}",
        forecast=None,
    )


def _trace(design: Design, condition: Treatment, variant: int) -> dict:
    resolved = design.resolve(condition)
    world = create_world(resolved, condition.parameters, design.seeds[0])
    observations, outcomes = [], []
    for _ in range(min(design.turn_count, 96)):
        actor = world.actor()
        if actor is None:
            break
        observation = world.observe(actor)
        observation["you"] = next(p.model_dump() for p in resolved.profiles if p.key == actor)
        observations.append(
            hashlib.sha256(json.dumps(observation, sort_keys=True).encode()).hexdigest()
        )
        decision = _instrument(world, actor, observation, variant)
        events, measures = world.step(actor, decision)
        outcomes.append(
            hashlib.sha256(
                json.dumps(
                    {
                        "events": [e.model_dump() for e in events],
                        "measures": [m.model_dump() for m in measures],
                        "balances": world.state["balances"],
                    },
                    sort_keys=True,
                ).encode()
            ).hexdigest()
        )
    return {
        "observations": observations,
        "outcomes": outcomes,
        "turns": len(observations),
        "complete": world.actor() is None,
    }


def preflight(design: Design) -> dict:
    return copy.deepcopy(_preflight(design.model_dump_json()))


def require_valid(report: dict) -> None:
    errors = [i["message"] for i in report["issues"] if i["severity"] == "error"]
    if errors:
        raise ValueError("Experiment check failed: " + " ".join(errors))


@lru_cache(maxsize=64)
def _preflight(specification: str) -> dict:
    design = Design.model_validate_json(specification)
    issues, comparisons = [], []

    def issue(code: str, message: str, severity: str = "warning") -> None:
        issues.append({"code": code, "severity": severity, "message": message})

    if design.environment == "institution":
        issue(
            "aligned_work_payoff",
            "Work earns 2 personal credits and adds shared output; wait earns 1. Work "
            "rate alone does not measure costly cooperation or sacrifice.",
        )
        issue(
            "fresh_allocation_budget",
            "Allocation credits are renewed each round. This world has no finite "
            "resource stock, consumption needs or deprivation.",
        )
    if design.environment == "composed":
        issue(
            "composition_limits",
            "Each participant has one action per round across all resources. "
            "A controller can allocate to one recipient or split a total equally among everyone. "
            "Private records still permit inference from personal receipts or messages.",
        )
        for c in design.conditions:
            composition = c.parameters.composition
            assert composition is not None
            communicative = c.parameters.communication and bool(
                set(c.parameters.communication_channels) & {"messages", "reports"}
            )
            active = {
                key
                for r in composition.resources
                for key in (r.controllers or [p.key for p in design.profiles])
            }
            passive = [p.key for p in design.profiles if p.key not in active]
            if (
                passive
                and not communicative
                and not any(r.transfers for r in composition.resources)
            ):
                issue(
                    "passive_resource_audience",
                    f"{c.name}: {', '.join(passive)} can only wait; communication and personal "
                    "transfers are disabled and they control no resource. Disclosure gives them "
                    "no action to respond with. Any effect concerns allocators' response to "
                    "announced visibility or presented information, not responsive community "
                    "cooperation or an enforced accountability consequence.",
                )
            for r in composition.resources:
                capacity_per_round = r.action_limit * (len(r.controllers) or len(design.profiles))
                fastest_empty_round = (
                    r.initial_stock + capacity_per_round - 1
                ) // capacity_per_round
                if (
                    r.initial_stock > 0
                    and r.replenishment == 0
                    and fastest_empty_round < design.rounds
                ):
                    issue(
                        "early_resource_exhaustion",
                        f"{c.name} / {r.name}: legal maximum requests can empty shared stock "
                        f"within {fastest_empty_round} round(s), before the {design.rounds}-round "
                        "horizon. Later rounds do not guarantee further stock-allocation "
                        "opportunities. Match action limits and timing claims to the question; "
                        "one-shot allocation can still be valid, and personal transfers and "
                        "consumption may continue after shared stock is exhausted.",
                    )
                need = r.need * len(design.profiles) * design.rounds
                supply = r.initial_stock + r.replenishment * (design.rounds - 1)
                if need and supply < need:
                    issue(
                        "unavoidable_shortfall",
                        f"{c.name} / {r.name}: at most {supply} units "
                        f"can meet {need} required units. Some deprivation is unavoidable even "
                        "under ideal sharing; compare its distribution and magnitude.",
                    )
                elif need:
                    issue(
                        "scarcity_not_guaranteed",
                        f"{c.name} / {r.name}: the total supply bound "
                        "covers needs. Timing and access may still constrain consumption; "
                        "do not presume a real shortage.",
                    )
                if r.allocation_visibility == "public":
                    issue(
                        "published_inventories",
                        f"{c.name} / {r.name}: public allocation "
                        "visibility publishes both receipts and current personal inventories. "
                        "This is an information bundle, not receipt visibility alone.",
                    )
                if r.stock_visibility == "controllers" and not r.controllers:
                    issue(
                        "hidden_stock_without_controller",
                        f"{c.name} / {r.name}: stock is "
                        "hidden from everyone; extraction receipts can still support inference.",
                    )
    if design.environment == "commons":
        for c in design.conditions:
            marginal = c.parameters.multiplier / len(design.profiles) - 1
            if marginal >= 0:
                issue(
                    "aligned_contribution_payoff",
                    f"{c.name} [{c.key}]: each contributed credit changes own immediate payoff "
                    f"by {marginal:+.3f}; contribution need not involve private sacrifice.",
                )
    if design.environment == "coordination":
        issue(
            "public_task_coordination",
            "All task dependencies and progress are public; any agent can work on any task. "
            "Useful work earns 1 personal credit; waiting earns none. Completion need not "
            "require communication or personal sacrifice. Private expertise is not enforced.",
        )
        for c in design.conditions:
            effort = (
                sum(t.effort for t in design.tasks)
                if design.tasks
                else sum(2 + i % 2 for i in range(c.parameters.task_count))
            )
            if effort > design.turn_count:
                issue(
                    "completion_ceiling",
                    f"{c.name} [{c.key}]: tasks require {effort} effort actions but the run has "
                    f"{design.turn_count} turns. Full completion is infeasible; "
                    "partial progress may still be informative.",
                )
            elif effort < design.turn_count:
                issue(
                    "completion_slack",
                    f"{c.name} [{c.key}]: a strategy selecting an available unfinished task "
                    f"can finish in {effort} work actions without messages, within "
                    f"{design.turn_count} available turns. Final completion can saturate; "
                    "inspect completion timing and blocked/duplicate work too. This is a "
                    "solvability bound, not a prediction of model behavior.",
                )
    if len(design.seeds) < 3:
        issue(
            "limited_replication",
            "Fewer than three environment seeds: treat this as a descriptive pilot, not "
            "a reliable population effect.",
        )
    traces = {}
    if design.turn_count > 96:
        issue(
            "bounded_horizon",
            "Scripted probes stop after 96 turns per instrument; later shocks, memory "
            "and consequences require targeted checks.",
        )
    for c in design.conditions:
        try:
            traces[c.key] = [_trace(design, c, variant) for variant in range(3)]
        except (ValueError, AssertionError) as error:
            issue(
                "invalid_witness",
                f"{c.name} [{c.key}]: legal preflight instrument failed "
                f"({type(error).__name__}); execution is blocked pending correction.",
                "error",
            )
    baseline = design.conditions[0]
    # Endowment also sets incidental synthetic signal ranges in these worlds.
    active = set(CATALOG[design.environment].parameters) | {"private_signal", "endowment"}
    for c in design.conditions[1:]:
        changes = _differences(baseline.parameters.model_dump(), c.parameters.model_dump())
        assignment_changed = participant_assignment(design, baseline) != participant_assignment(
            design, c
        )
        inactive = [p for p in changes if p.split(".")[0] not in active]
        if design.tasks and "task_count" in changes:
            inactive.append("task_count (custom tasks replace generated tasks)")
        if inactive:
            issue(
                "inactive_intervention",
                f"{c.name} [{c.key}]: changed settings are inactive in this world: "
                f"{', '.join(inactive)}.",
                "error",
            )
        if len(changes) > 1:
            issue(
                "bundled_intervention",
                f"{c.name} [{c.key}]: {len(changes)} parameter fields change. "
                "Interpret the bundle; separate it before claiming an individual component effect.",
            )
        if "memory" in changes:
            modes = {baseline.parameters.memory, c.parameters.memory}
            if modes not in ({"history", "notes"}, {"notes", "episodic"}):
                issue(
                    "bundled_memory",
                    f"{c.name} [{c.key}]: this memory contrast changes multiple retained "
                    "information sources; it does not isolate private notes or retrieval alone.",
                )
        if (
            design.environment == "institution"
            and "institution.transparent" in changes
            and len(design.profiles) == 2
        ):
            issue(
                "no_disclosure_audience",
                f"{c.name} [{c.key}]: only the sanctioning agent and its target exist. "
                "Public and party-only sanction records have the same recipients. "
                "Rule announcements can differ, but this does not test wider disclosure.",
            )
        a, b = traces.get(baseline.key), traces.get(c.key)
        witnesses = []
        if a and b:
            for variant, (left, right) in enumerate(zip(a, b, strict=True)):
                observation = left["observations"] != right["observations"]
                outcome = left["outcomes"] != right["outcomes"]
                witnesses.append(
                    {
                        "instrument": variant,
                        "observation_difference": observation,
                        "outcome_difference": outcome,
                    }
                )
            if not assignment_changed and not any(
                w["observation_difference"] or w["outcome_difference"] for w in witnesses
            ):
                issue(
                    "unwitnessed_treatment",
                    f"{c.name} [{c.key}]: bounded scripted probes found no information or "
                    "consequence difference. This is inconclusive, not proof of equivalence; "
                    "inspect timing and eligible opportunities before spending.",
                )
        comparisons.append(
            {
                "baseline": baseline.key,
                "condition": c.key,
                "changed_parameters": changes,
                "changed_harness": _differences(
                    baseline.harness.model_dump(), c.harness.model_dump()
                ),
                "agent_assignment_changed": assignment_changed,
                "witnesses": witnesses,
            }
        )
    grid = condition_grid(design)
    for keys in grid["duplicate_conditions"]:
        issue(
            "identical_conditions",
            f"Conditions {', '.join(keys)} have identical executable settings, profiles and "
            "models. Labels do not create a treatment; valid as replication/placebo arms, "
            "not as a manipulated contrast.",
        )
    if not grid["complete"]:
        issue(
            "partial_condition_grid",
            f"Observed {grid['observed_cells']}/{grid['expected_cells']} crossed cells. "
            "Partial comparisons can be valid, but do not claim a complete factorial.",
        )
    return {
        "status": "blocked"
        if any(i["severity"] == "error" for i in issues)
        else "review"
        if issues
        else "checked",
        "issues": issues,
        "comparisons": comparisons,
        "condition_grid": grid,
        "probe_turns": sum(r["turns"] for rows in traces.values() for r in rows),
        "probe_limit_per_instrument": 96,
        "limits": f"Checks use current rules {CATALOG[design.environment].world.version}. "
        "Three legal scripted instruments on the first seed, up to 96 turns each. "
        "These are mechanism witnesses, not predictions, exhaustive strategy search "
        "or certification of question fidelity.",
    }


def exposure(environment: str, actions: list[dict], events: list[dict]) -> dict:
    counts = Counter(a["kind"] for a in actions)
    warnings = []
    if environment == "institution":
        if not counts["sanction"]:
            warnings.append(
                "No sanctions occurred: sanction-record disclosure had no realized events. "
                "Rule announcements can still affect anticipation; verify recorded "
                "observations before attributing an effect."
            )
        eligible = counts["work"] + counts["wait"]
        if eligible and counts["work"] == eligible:
            warnings.append(
                "Work rate is at its ceiling on the captured work/wait choices; work also "
                "pays more personally than waiting."
            )
    if environment == "composed":
        receipts = [e for e in events if e["kind"] == "resource_transfer"]
        if not any(e["data"]["amount"] > 0 for e in receipts):
            warnings.append(
                "No positive resource transfers occurred in this cutoff. "
                "Allocation-record visibility had no positive receipts to expose; "
                "announced rules or visible inventories may still differ."
            )
    commitments = sum(e["kind"] == "commitment_resolved" for e in events)
    return {
        "action_counts": dict(counts),
        "resolved_commitments": commitments,
        "warnings": warnings,
    }
