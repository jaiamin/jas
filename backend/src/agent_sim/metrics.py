import statistics
from collections import defaultdict
from collections.abc import Iterable


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
