"""Addressed logical mail shared by the concrete artifact interaction Worlds."""

import copy

from ..domain import Event, MessageRoute, SendMessage
from .checkpoints import DistributedCheckpoint, WorkflowCheckpoint


def queue_message(
    state: DistributedCheckpoint | WorkflowCheckpoint,
    actor: str,
    action: SendMessage,
    delay: int,
) -> Event:
    route = f"{actor}:{action.recipient}"
    number = state["message_sequences"].get(route, 0) + 1
    state["message_sequences"][route] = number
    mail = {
        "id": f"{route}:{number}",
        "sequence": number,
        "sender": actor,
        "recipient": action.recipient,
        "text": action.text,
        "sent_at": state["logical_time"],
        "due_at": state["logical_time"] + delay,
        "delivered_at": None,
    }
    state["pending_deliveries"].append(copy.deepcopy(mail))
    state["outboxes"][actor].append(copy.deepcopy(mail))
    return Event(
        kind="message_queued",
        actor=actor,
        visibility="private",
        text="Addressed message queued.",
        data=mail,
    )


def deliver_messages(
    state: DistributedCheckpoint | WorkflowCheckpoint, routes: list[MessageRoute]
) -> list[Event]:
    route_order = {(r.sender, r.recipient): i for i, r in enumerate(routes)}
    ready = sorted(
        (row for row in state["pending_deliveries"] if row["due_at"] <= state["logical_time"]),
        key=lambda row: (
            row["due_at"],
            route_order[row["sender"], row["recipient"]],
            row["sequence"],
        ),
    )
    events = []
    for row in ready:
        delivered = {**row, "delivered_at": state["logical_time"]}
        state["inboxes"][row["recipient"]].append(copy.deepcopy(delivered))
        for sent in state["outboxes"][row["sender"]]:
            if sent["id"] == row["id"]:
                sent["delivered_at"] = state["logical_time"]
        events.append(
            Event(
                kind="message_delivered",
                actor=row["sender"],
                target=row["recipient"],
                visibility="private",
                text=row["text"],
                data=delivered,
            )
        )
    state["pending_deliveries"] = [
        row for row in state["pending_deliveries"] if row["due_at"] > state["logical_time"]
    ]
    return events
