"""Compare committed paths, excluding model explanations and incidental timings."""

from collections.abc import Sequence


def changes(before: object, after: object, path: str = "") -> list[str]:
    if before == after:
        return []
    if isinstance(before, dict) and isinstance(after, dict):
        return [
            field
            for key in sorted(before.keys() | after.keys())
            for field in changes(before.get(key), after.get(key), f"{path}.{key}".lstrip("."))
        ]
    return [path]


def world_state(checkpoint: dict) -> dict:
    # Private model notes/history prose are not enforced world consequences.
    return {k: v for k, v in checkpoint.items() if k not in {"notes", "experiences", "history"}}


def first_divergence(left: Sequence[dict], right: Sequence[dict]) -> dict | None:
    for a, b in zip(left, right, strict=False):
        if (a["actor"], a["round"], a["observation"].get("logical_time")) != (
            b["actor"],
            b["round"],
            b["observation"].get("logical_time"),
        ):
            return {
                "turn": a["number"],
                "kind": "schedule",
                "description": "Actor or schedule first differs.",
            }
        if a["decision"]["action"] != b["decision"]["action"]:
            return {
                "turn": a["number"],
                "kind": "action",
                "description": "Accepted action or message first differs.",
            }
        if a["consequences"] != b["consequences"] or world_state(a["checkpoint"]) != world_state(
            b["checkpoint"]
        ):
            return {
                "turn": a["number"],
                "kind": "consequence",
                "description": "Enforced consequence first differs.",
            }
    return None
