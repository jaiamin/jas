"""A small sequential experiment matrix, using the same runner as the CLI/UI."""

from pathlib import Path
from statistics import mean

from .config import Experiment, Scenario, load_scenario, read_yaml, validate_scenario
from .policies import check_paid
from .runner import Runner
from .sandboxes import get_sandbox
from .store import Store


def expand(path: str | Path) -> tuple[Experiment, list[tuple[str, int, Scenario]]]:
    path = Path(path)
    experiment = Experiment.model_validate(read_yaml(path))
    base = load_scenario(path.parent / experiment.scenario)
    matrix = []
    for condition in experiment.conditions:
        unknown = set(condition.profiles) - {a.id for a in base.agents}
        if unknown:
            raise ValueError(f"Unknown profile overrides: {sorted(unknown)}")
        for seed in experiment.seeds:
            data = base.model_dump(mode="json")
            data["seed"] = seed
            if experiment.max_steps is not None:
                data["max_steps"] = experiment.max_steps
            data["models"].update(experiment.models)
            data["parameters"].update(condition.parameters)
            if condition.limits:
                data["limits"] = condition.limits.model_dump()
            for profile in data["agents"]:
                profile.update(policy=condition.policy, model=condition.model)
                if profile["id"] in condition.profiles:
                    profile.update(condition.profiles[profile["id"]].model_dump(exclude_none=True))
            scenario = validate_scenario(data)
            environment = get_sandbox(scenario.sandbox).create()
            environment.initialize(scenario.parameters, [a.id for a in scenario.agents], seed)
            unknown_metrics = set(experiment.metrics) - environment.metrics().keys()
            if unknown_metrics:
                raise ValueError(f"Unknown metrics: {sorted(unknown_metrics)}")
            for repetition in range(experiment.repetitions):
                matrix.append((condition.name, repetition + 1, scenario.model_copy(deep=True)))
    return experiment, matrix


async def run_experiment(path: str | Path, store: Store, *, paid: bool = False) -> dict:
    experiment, matrix = expand(path)
    for _, _, scenario in matrix:
        check_paid(scenario, paid)
        if any(a.policy == "model" for a in scenario.agents) and experiment.max_model_calls < 1:
            raise ValueError("Paid experiments require a positive experiment max_model_calls")
    rows, calls = [], 0
    for condition, repetition, scenario in matrix:
        if any(a.policy == "model" for a in scenario.agents):
            remaining = experiment.max_model_calls - calls
            if remaining < 1:
                raise ValueError("Experiment call budget exhausted; completed runs are saved")
            scenario.limits.max_model_calls = min(scenario.limits.max_model_calls, remaining)
        runner = Runner.create(
            store,
            scenario,
            paid=paid,
            metadata={
                "experiment": experiment.name,
                "condition": condition,
                "repetition": repetition,
                "metrics": experiment.metrics,
            },
        )
        await runner.play()
        calls += store.run(runner.id)["calls"]
        metrics = runner.environment.metrics()
        rows.append(
            {
                "run": runner.id,
                "condition": condition,
                "seed": scenario.seed,
                "repetition": repetition,
                "metrics": {key: metrics[key] for key in experiment.metrics},
            }
        )
    return {
        "experiment": experiment.name,
        "model_calls": calls,
        "runs": rows,
        "means": {
            condition.name: {
                key: mean(row["metrics"][key] for row in rows if row["condition"] == condition.name)
                for key in experiment.metrics
            }
            for condition in experiment.conditions
        },
    }
