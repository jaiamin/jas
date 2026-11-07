import random
import statistics
from collections import defaultdict
from collections.abc import Iterable
from dataclasses import dataclass
from functools import lru_cache

from .domain import Design


def aggregate_metrics(measurements: Iterable[tuple[str, float | None]]) -> dict[str, float]:
    groups: dict[str, list[float]] = defaultdict(list)
    for key, value in measurements:
        if value is not None:
            groups[key].append(value)
    result = {}
    for key, values in groups.items():
        if key in {"completion_rate", "stock_fraction"}:
            result[key] = values[-1]
        elif key == "collapse_rate":
            result[key] = max(values)
        else:
            result[key] = statistics.mean(values)
    return result


@dataclass(frozen=True)
class RunMetrics:
    condition_key: str
    condition: str
    seed: int
    repetition: int
    metrics: dict[str, float]


@lru_cache(maxsize=512)
def bootstrap_mean_interval(values: tuple[float, ...]) -> list[float] | None:
    if len(values) < 3:
        return None
    rng = random.Random(71)
    samples = sorted(statistics.mean(rng.choices(values, k=len(values))) for _ in range(1000))
    return [samples[24], samples[974]]


def condition_results(runs: list[RunMetrics]) -> list[dict[str, object]]:
    by_condition: dict[str, list[RunMetrics]] = defaultdict(list)
    for run in runs:
        by_condition[run.condition_key].append(run)
    results: list[dict[str, object]] = []
    for key, group in by_condition.items():
        keys = sorted({metric for run in group for metric in run.metrics})
        for metric in keys:
            values = [r.metrics[metric] for r in group if r.metrics.get(metric) is not None]
            results.append(
                {
                    "condition_key": key,
                    "condition": group[0].condition,
                    "metric": metric,
                    "mean": statistics.mean(values) if values else None,
                    "runs": len(values),
                    "interval": bootstrap_mean_interval(tuple(values)),
                    "method": "run-level percentile bootstrap, 1000 resamples"
                    if len(values) >= 3
                    else "Too few independent runs for an interval",
                }
            )
    return results


def matched_effects(runs: list[RunMetrics], design: Design) -> list[dict[str, object]]:
    baseline = design.conditions[0]
    controls = {(r.seed, r.repetition): r for r in runs if r.condition_key == baseline.key}
    effects: list[dict[str, object]] = []
    for condition in design.conditions[1:]:
        differences: dict[str, dict[int, list[float]]] = defaultdict(lambda: defaultdict(list))
        for run in runs:
            control = controls.get((run.seed, run.repetition))
            if run.condition_key != condition.key or control is None:
                continue
            for key in design.measures:
                left, right = control.metrics.get(key), run.metrics.get(key)
                if left is not None and right is not None:
                    differences[key][run.seed].append(right - left)
        for key, seeds in differences.items():
            values = tuple(statistics.mean(pairs) for pairs in seeds.values())
            effects.append(
                {
                    "condition": condition.name,
                    "baseline": baseline.name,
                    "metric": key,
                    "mean": statistics.mean(values),
                    "seeds": len(values),
                    "pairs": sum(map(len, seeds.values())),
                    "interval": bootstrap_mean_interval(values),
                    "method": "Matched differences; repetitions averaged within seed; "
                    "95% seed-level percentile bootstrap, 1000 resamples",
                }
            )
    return effects
