"""Independent experiment-identification checks. No model-as-judge truth source."""

from agent_sim.domain import Design

from benchmarks.cases import MODEL, Case


def leaves(value, path="") -> dict:
    if isinstance(value, dict):
        return {
            key: item
            for k, v in value.items()
            for key, item in leaves(v, f"{path}.{k}".strip(".")).items()
        }
    return {path: value}


def assess(case: Case, result: dict) -> dict[str, bool]:
    supported = case.family.environment is not None
    checks = {
        "capability": result.get("supported") == supported,
        "explanation": bool(result.get("explanation")),
    }
    if not supported:
        return {**checks, "no_invented_design": result.get("design") is None}
    try:
        design = Design.model_validate(result.get("design"))
    except ValueError:
        return {**checks, "valid_design": False}
    checks.update(
        valid_design=True,
        environment=design.environment == case.family.environment,
        counts=(
            len(design.profiles) == case.agents
            and len(design.conditions) == 2
            and design.rounds == case.rounds
            and design.seeds == [case.seed]
            and design.repetitions == 1
        ),
        model=all(c.model == MODEL for c in design.conditions)
        and all(
            p.model in (None, MODEL)
            for p in design.profiles + [p for c in design.conditions for p in c.profile_overrides]
        ),
        outcome=case.family.measure in design.measures,
        limitations=bool(design.limitations),
        causal_horizon=(case.family.factor != "resource_schedule" or design.rounds >= 3),
    )
    if len(design.conditions) != 2:
        return {**checks, "isolation": False, "intervention": False, "setup": False}
    variants = []
    for condition in design.conditions:
        variants.append(
            {
                "parameters": condition.parameters.model_dump(),
                "profiles": [p.model_dump() for p in design.resolve(condition).profiles],
            }
        )
    a, b = map(leaves, variants)
    differences = {k for k in a.keys() | b.keys() if a.get(k) != b.get(k)}
    expected = "parameters." + case.family.factor
    checks["isolation"] = differences == {expected}
    expected_values = case.family.levels
    actual_values = [v.get(expected) for v in (a, b)]
    checks["intervention"] = (
        actual_values == expected_values or actual_values == expected_values[::-1]
    )
    checks["setup"] = all(
        a.get("parameters." + k) == value and b.get("parameters." + k) == value
        for k, value in case.family.setup.items()
    )
    if case.family.factor != "endowment":
        checks["setup"] &= all(v["parameters.endowment"] == case.endowment for v in (a, b))
    checks["effective_channel"] = case.family.factor != "communication_channels" or all(
        c.parameters.communication for c in design.conditions
    )
    # Explicit tasks would make a task_count intervention inert.
    checks["effective_tasks"] = case.family.factor != "task_count" or not design.tasks
    return checks
