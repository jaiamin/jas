"""Rule-declared first occurrences. Recorded prose never defines a key moment."""

RULES: dict[str, list[tuple[str, str, dict]]] = {
    "commons": [("Broken promise", "commitment_resolved", {"eligible": True, "fulfilled": False})],
    "trust_exchange": [
        ("Broken promise", "commitment_resolved", {"eligible": True, "fulfilled": False})
    ],
    "coordination": [
        ("Task completed", "task_completed", {}),
        ("Blocked work", "blocked_work", {}),
    ],
    "institution": [("Sanction", "sanction", {}), ("Oversight", "oversight", {})],
    "bargaining": [("Agreement", "agreement", {})],
    "information": [("Outcomes settled", "outcome", {})],
    "artifact_workspace": [
        ("Evidence read", "read_artifact", {}),
        ("Work submitted", "submit_artifacts", {}),
    ],
    "distributed_coordination": [("Choice committed", "choose_alternative", {})],
    "reliance_commitments": [
        ("Promise resolved", "reliance_resolved", {}),
        ("Recipient consequence", "reliance_consequence", {}),
    ],
    "institutional_workflow": [
        ("Work started", "perform_work", {}),
        ("Work ready", "work_ready", {}),
        ("Handoff accepted", "accept_handoff", {}),
    ],
}


def key_moments(environment: str, events: list[dict], measurements: list[dict]) -> list[dict]:
    moments = []
    for title, kind, fields in RULES.get(environment, []):
        event = next(
            (
                e
                for e in events
                if e["kind"] == kind
                and all(
                    e["data"].get(key) is value
                    if isinstance(value, bool)
                    else e["data"].get(key) == value
                    for key, value in fields.items()
                )
            ),
            None,
        )
        if event:
            moments.append({"turn": event["turn"], "title": f"First {title.lower()}", "kind": kind})
    if environment == "renewable_resource":
        collapse = next(
            (m for m in measurements if m["key"] == "collapse_rate" and m["value"] == 1), None
        )
        if collapse:
            moments.append(
                {"turn": collapse["turn"], "title": "Stock collapsed", "kind": "collapse_rate"}
            )
    return sorted(moments, key=lambda moment: moment["turn"])
