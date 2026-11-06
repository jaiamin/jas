"""Read-only presentation helpers shared by the evaluation views."""

from .costs import estimate_cost


def title(key: str) -> str:
    return key.replace("_", " ").replace("-", " ").capitalize()


def model_label(name: str) -> str:
    known = {
        "openai:gpt-6-luna": "GPT-6 Luna",
        "openai:gpt-4.1-mini": "GPT-4.1 Mini",
        "anthropic:claude-haiku-4-5": "Claude Haiku 4.5",
    }
    return known.get(name, name.split(":", 1)[-1])


def run_models(scenario: dict) -> str:
    if any(a.get("policy") == "demo" for a in scenario["agents"]):
        return "Historical demo"
    return ", ".join(
        dict.fromkeys(model_label(scenario["models"][a["model"]]) for a in scenario["agents"])
    )


def cost_label(record: dict) -> str:
    cost = estimate_cost(record)
    if cost is None:
        return "Unavailable"
    label = f"${cost:.4f}"
    if record["charged_tokens"] > record["input_tokens"] + record["output_tokens"]:
        label += " (partial)"
    return label


def run_row(record: dict) -> dict:
    scenario = record["scenario"]
    return {
        "id": record["id"],
        "name": scenario["name"],
        "environment": title(scenario["sandbox"]),
        "model": run_models(scenario),
        "status": "Archived"
        if "Historical demo" == run_models(scenario)
        else title(record["status"]),
        "tick": record["tick"],
        "max_steps": scenario["max_steps"],
        "seed": scenario["seed"],
        "cost": estimate_cost(record),
        "cost_label": cost_label(record),
        "created": record["created"][:16].replace("T", " "),
        "experiment": record["metadata"].get("experiment", ""),
    }


def comparison_metrics(records: list[dict]) -> list[str]:
    if len(records) < 2:
        raise ValueError("Select at least two runs to compare.")
    if len({r["scenario"]["sandbox"] for r in records}) != 1:
        raise ValueError("Choose runs from the same environment to compare their metrics.")
    common = set(records[0]["metrics"])
    for record in records[1:]:
        common.intersection_update(record["metrics"])
    return [key for key in records[0]["metrics"] if key in common]


def chart_options(histories: list[tuple[str, list[dict]]], metric: str) -> dict:
    return {
        "backgroundColor": "transparent",
        "color": ["#85b8d2", "#bcadcf", "#d6b57b", "#8ebca7"],
        "tooltip": {
            "trigger": "axis",
            "backgroundColor": "#20262d",
            "borderColor": "#39434e",
            "textStyle": {"color": "#e7e9ed"},
        },
        "legend": {
            "show": len(histories) > 1,
            "type": "scroll",
            "bottom": 0,
            "textStyle": {"color": "#adb5c0"},
            "pageTextStyle": {"color": "#adb5c0"},
        },
        "grid": {
            "left": 50,
            "right": 24,
            "top": 25,
            "bottom": 85 if len(histories) > 1 else 52,
        },
        "xAxis": {
            "type": "value",
            "min": 0,
            "minInterval": 1,
            "name": "Turn",
            "nameLocation": "middle",
            "nameGap": 30,
            "nameTextStyle": {"color": "#adb5c0"},
            "axisLine": {"lineStyle": {"color": "#39434e"}},
            "axisLabel": {"color": "#adb5c0"},
            "splitLine": {"show": False},
        },
        "yAxis": {
            "type": "value",
            "scale": True,
            "axisLabel": {"color": "#adb5c0"},
            "splitLine": {"lineStyle": {"color": "#29313a"}},
        },
        "series": [
            {
                "name": name,
                "type": "line",
                "showSymbol": len(history) < 2,
                "symbolSize": 6,
                "lineStyle": {"width": 2},
                "animation": False,
                "data": [[frame["tick"], frame["metrics"].get(metric)] for frame in history],
            }
            for name, history in histories
        ],
    }
