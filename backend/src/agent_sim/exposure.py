"""Source-linked input provenance, separate from World availability and interpretation.

Only researcher inspection consumes these records. Participant prompts are assembled
from actor projections as before; neither this index nor researcher sources enter them.
"""

from collections.abc import Sequence

from .db import ParticipantActivation, ProviderCall, RecordedEvent, Revision, Run, digest
from .domain import Design, Treatment
from .simulation.checkpoints import Observation
from .simulation.world import World

VERSION = 1
NOTES = [
    "Assignment-based descriptions retain assigned runs, including absent opportunities "
    "and failures.",
    "Exposure-conditioned descriptions use post-treatment selection on realized input; "
    "exposed-only "
    "filtering does not automatically identify a causal effect.",
    "Confirmed inclusion is evidence of model input, not attention, belief or intent.",
    "Eligibility counts recipients permitted by a record's visibility, including its author; "
    "memory mode and later scheduling can still prevent input. Counts describe participants "
    "and recipient-record opportunities, not independent experimental units.",
    "No sanction event does not imply no exposure to sanction rules or available choices.",
    "Unavailable historical capture and unknown provider delivery are not measured zero exposure.",
]


def event_source(event: RecordedEvent, run_id: str) -> dict:
    return {
        "href": f"/api/runs/{run_id}/turns/{event.turn}",
        "pointer": f"/events/id={event.id}",
        "label": f"Turn {event.turn} · {event.kind} · event {event.id}",
    }


def available_inputs(
    world: World, observation: Observation, actor: str, events: Sequence[RecordedEvent]
) -> dict:
    items: list[dict] = [
        {"key": key, "paths": [[field]], "sha256": digest(dict(observation)[field])}
        for key, field in [("rules", "rules"), ("choices", "legal_actions")]
    ]
    items.append({"key": "observation", "paths": [[]], "sha256": digest(observation)})
    # Recipient enforcement precedes even producer lookup. The producer can only
    # identify content already in the actor projection; it cannot disclose a source.
    for event in events:
        if event.visibility == "researcher" or (
            event.visibility == "private" and actor not in (event.actor, event.target)
        ):
            continue
        paths = world.exposure_paths(
            {
                key: getattr(event, key)
                for key in ("round", "kind", "actor", "target", "text", "data")
            },
            observation,
        )
        if paths:
            items.append({"key": f"event:{event.id}", "paths": paths})
    return {"version": VERSION, "items": items}


def input_bindings(capture: dict | None, transcript: list[dict] | None) -> dict | None:
    """Bind only the inputs actually used by the two current participant policies.

    A read result sitting in the operation journal is available locally, not yet
    delivered. It becomes a candidate input when a subsequent prompt includes it.
    A provider response is additionally required to confirm receipt.
    """
    if capture is None or capture.get("version") != VERSION:
        return None
    items = []
    for item in capture["items"]:
        key = item["key"]
        if key == "choices":
            items.append({"key": key, "surface": "schema", "path": [], "operation": None})
        if transcript is None:
            items.extend(
                {"key": key, "surface": "prompt", "path": path, "operation": None}
                for path in item["paths"]
            )
        else:
            for index, operation in enumerate(transcript):
                if operation["status"] != "complete":
                    continue
                for path in item["paths"]:
                    kind = operation["kind"]
                    if (
                        kind == "observe"
                        or (kind == "rules" and key == "rules")
                        or (kind == "legal_options" and key == "choices")
                    ):
                        items.append(
                            {
                                "key": key,
                                "surface": "prompt",
                                "path": [
                                    "operations",
                                    index,
                                    "result",
                                    *(path if kind == "observe" else []),
                                ],
                                "operation": operation["number"],
                            }
                        )
    return {"version": VERSION, "items": items}


def exposure_report(
    run: Run,
    design: Design,
    condition: Treatment,
    revision: Revision,
    activations: Sequence[ParticipantActivation],
    calls: Sequence[ProviderCall],
    events: Sequence[RecordedEvent],
    operations: dict[str, list[int]],
    *,
    through_turn: int,
) -> dict:
    source = {
        "href": f"/api/studies/{run.study_id}?revision={revision.number}",
        "pointer": "/design",
        "label": f"Revision {revision.number} · {revision.sha256[:12]}",
    }
    opportunities: list[dict] = []
    for kind in ("observation", "rules", "choices"):
        for profile in design.profiles:
            opportunities.append(
                {
                    "id": f"{kind}:{profile.key}",
                    "key": kind,
                    "kind": kind,
                    "participant": profile.key,
                    "after_turn": -1,
                    "source": source,
                    "available": [],
                    "inputs": [],
                    "included": False,
                }
            )
    for event in events:
        if event.visibility == "researcher":
            continue
        for profile in design.profiles:
            if event.visibility == "private" and profile.key not in (event.actor, event.target):
                continue
            opportunities.append(
                {
                    "id": f"event:{event.id}:{profile.key}",
                    "key": f"event:{event.id}",
                    "kind": event.kind,
                    "participant": profile.key,
                    "after_turn": event.turn,
                    "source": event_source(event, run.id),
                    "available": [],
                    "inputs": [],
                    "included": False,
                }
            )
    by_actor: dict[str, list[ParticipantActivation]] = {
        profile.key: [] for profile in design.profiles
    }
    for activation in activations:
        by_actor[activation.actor].append(activation)
    by_activation: dict[str, list[ProviderCall]] = {}
    for call in calls:
        if call.activation_id is not None:
            by_activation.setdefault(call.activation_id, []).append(call)
    covered = {
        a.turn for a in activations if a.identity.get("exposure", {}).get("version") == VERSION
    }
    historical = any(a.identity.get("exposure", {}).get("version") != VERSION for a in activations)
    missing_turns = any(turn not in covered for turn in range(1, through_turn + 1))
    capture = "partial" if historical or missing_turns else "complete"
    if capture == "partial" and not covered:
        capture = "unavailable"
    for opportunity in opportunities:
        unknown_capture = missing_turns
        for activation in by_actor[opportunity["participant"]]:
            if activation.turn <= opportunity["after_turn"]:
                continue
            available = activation.identity.get("exposure")
            if available is None or available.get("version") != VERSION:
                unknown_capture = True
                continue
            if any(item["key"] == opportunity["key"] for item in available["items"]):
                opportunity["available"].append(
                    {
                        "href": f"/api/runs/{run.id}",
                        "pointer": f"/activations/id={activation.id}/observation",
                        "label": (
                            f"Turn {activation.turn} · {activation.actor} · available observation"
                        ),
                    }
                )
            for call in by_activation.get(activation.id, []):
                evidence = (call.request_payload or {}).get("input_evidence")
                if evidence is None or evidence.get("version") != VERSION:
                    unknown_capture = True
                    continue
                for binding in evidence["items"]:
                    if binding["key"] != opportunity["key"]:
                        continue
                    # A stored prompt or reservation is not a delivery receipt.
                    # Even an invalid output can confirm input if a response exists.
                    delivery = "confirmed" if call.response_payload else "unknown"
                    opportunity["inputs"].append(
                        {
                            "activation_id": activation.id,
                            "operation": binding["operation"],
                            "delivery": delivery,
                            "request_status": call.status,
                            "source": {
                                "href": f"/api/requests/{call.id}",
                                "pointer": "/".join(
                                    ["", "request", binding["surface"]]
                                    + [str(part) for part in binding["path"]]
                                ),
                                "label": f"Turn {call.turn} · {binding['surface']} · {call.id[:8]}",
                            },
                        }
                    )
        confirmed = any(item["delivery"] == "confirmed" for item in opportunity["inputs"])
        uncertain = unknown_capture or any(
            item["delivery"] == "unknown" for item in opportunity["inputs"]
        )
        opportunity["included"] = True if confirmed else None if uncertain else False
        opportunity["capture_unavailable"] = unknown_capture
    summary = []
    kinds = dict.fromkeys(
        [
            "observation",
            "rules",
            "choices",
            "message",
            "claim",
            "sanction",
            *(item["kind"] for item in opportunities),
        ]
    )
    for kind in kinds:
        selected = [item for item in opportunities if item["kind"] == kind]
        confirmed = [item for item in selected if item["included"] is True]
        unknown = [item for item in selected if item["included"] is None]
        unavailable = capture != "complete" or bool(unknown)
        summary.append(
            {
                "kind": kind,
                "eligible_participants": len({item["participant"] for item in selected}),
                "exposed_participants": None
                if unavailable
                else len({item["participant"] for item in confirmed}),
                "confirmed_participants": len({item["participant"] for item in confirmed}),
                "eligible_opportunities": len(selected),
                "exposed_opportunities": None if unavailable else len(confirmed),
                "confirmed_opportunities": len(confirmed),
                "unknown_opportunities": len(unknown),
            }
        )
    return {
        "version": VERSION,
        "run_id": run.id,
        "through_turn": through_turn,
        "capture": capture,
        "delivery": {
            "confirmed_requests": sum(bool(c.response_payload) for c in calls),
            "unknown_requests": sum(not bool(c.response_payload) for c in calls),
            "unsent_attempts": sum(
                max(0, a.requests - len(by_activation.get(a.id, []))) for a in activations
            ),
        },
        "membership": {
            "activations": [a.id for a in activations],
            "requests": [c.id for c in calls],
            "operations": operations,
        },
        "assignment": {
            "condition_key": condition.key,
            "condition_name": condition.name,
            "revision": revision.number,
            "design_sha256": revision.sha256,
            "source": source,
            "configuration": condition.model_dump(),
        },
        "summary": summary,
        "opportunities": opportunities,
        "interpretation": NOTES,
    }
