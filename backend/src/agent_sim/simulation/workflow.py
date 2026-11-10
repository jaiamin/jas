"""Owned artifact work and a finite material ledger share one World transaction."""

import copy
from enum import StrEnum
from functools import reduce
from operator import or_
from typing import Any, cast

from pydantic import create_model

from ..domain import (
    AcceptHandoff,
    ArtifactObject,
    ClaimWork,
    Decision,
    DelegateWork,
    Event,
    HandoffWork,
    Measure,
    PerformWork,
    ReadArtifact,
    SendMessage,
    StopArtifact,
    WaitWorkflow,
    WorkflowRules,
)
from .addressed import deliver_messages, queue_message
from .artifacts import ArtifactWorkspace
from .checkpoints import Observation, WorkflowCheckpoint


class InstitutionalWorkflow(ArtifactWorkspace):
    version = "1.0.0"

    @property
    def workflow(self) -> WorkflowRules:
        rules = self.parameters.workflow
        if rules is None:
            raise ValueError("Institutional workflow requires explicit rules")
        return rules

    @property
    def checkpoint(self) -> WorkflowCheckpoint:
        return cast(WorkflowCheckpoint, self.state)

    def initial_state(self) -> WorkflowCheckpoint:
        return {
            **super().initial_state(),
            "logical_time": 0,
            "phase_actors": self.workflow.turn_order.copy(),
            "pending_actions": {},
            "pending_reads": {},
            "withdrawn": [],
            "resource_stock": self.workflow.resource_stock,
            "resource_spent": 0,
            "work": {
                item.key: {
                    "owner": None,
                    "status": "unclaimed",
                    "due_at": None,
                    "artifact_version": None,
                    "handoff": None,
                }
                for item in self.workflow.work_items
            },
            "work_history": [],
            "read_grants": {a: [] for a in self.ids},
            "pending_deliveries": [],
            "inboxes": {a: [] for a in self.ids},
            "outboxes": {a: [] for a in self.ids},
            "message_sequences": {},
        }

    def allowed(self, actor: str, obj: ArtifactObject, *, write: bool = False) -> bool:
        return super().allowed(actor, obj, write=write) or (
            not write and obj.key in self.checkpoint["read_grants"].get(actor, [])
        )

    def order(self) -> list[str]:
        return self.checkpoint["phase_actors"]

    def actor(self) -> str | None:
        s = self.checkpoint
        return (
            None
            if s["done"]
            else next((a for a in s["phase_actors"] if a not in s["pending_actions"]), None)
        )

    def read(self, actor: str, request: ReadArtifact) -> dict:
        if (
            self.state["done"]
            or actor not in self.checkpoint["phase_actors"]
            or actor in self.checkpoint["withdrawn"]
        ):
            raise ValueError("Artifact operation is unavailable")
        self.accessible(actor, request.artifact)
        versions = self.state["artifacts"][request.artifact]["versions"]
        number = request.version or len(versions)
        if number > len(versions):
            raise ValueError("Artifact operation is unavailable")
        return self.project_version(actor, {"artifact": request.artifact, **versions[number - 1]})

    def observe(self, agent: str) -> Observation:
        observation = super().observe(agent)
        observation["legal_actions"] = [
            a for a in observation["legal_actions"] if a["kind"] == "read_artifact"
        ]
        s = self.checkpoint
        visible = [w for w in self.workflow.work_items if agent in [*w.workers, *w.handoff_to]]
        unblocked = {
            w.key
            for w in visible
            if all(s["work"][d]["status"] == "accepted" for d in w.dependencies)
        }
        owned = {w.key for w in visible if s["work"][w.key]["owner"] == agent}
        for kind, keys in [
            (
                "claim_work",
                [
                    w.key
                    for w in visible
                    if agent in w.workers
                    and w.key in unblocked
                    and s["work"][w.key]["owner"] is None
                ],
            ),
            (
                "perform_work",
                [
                    w.key
                    for w in visible
                    if w.key in owned
                    and w.key in unblocked
                    and s["work"][w.key]["status"] == "claimed"
                    and s["resource_stock"] >= w.resource_cost
                    and s["writes_remaining"] > 0
                ],
            ),
            (
                "delegate_work",
                [
                    w.key
                    for w in visible
                    if w.key in owned
                    and s["work"][w.key]["status"] == "claimed"
                    and any(a != agent for a in w.workers)
                ],
            ),
            (
                "handoff_work",
                [
                    w.key
                    for w in visible
                    if w.key in owned and s["work"][w.key]["status"] == "ready"
                ],
            ),
            (
                "accept_handoff",
                [
                    w.key
                    for w in visible
                    if s["work"][w.key]["status"] == "handed_off"
                    and s["work"][w.key]["handoff"]["recipient"] == agent
                ],
            ),
        ]:
            if keys:
                observation["legal_actions"].append({"kind": kind, "targets": keys})
        observation["legal_actions"].append({"kind": "wait_workflow"})
        enabled = (
            self.parameters.communication and "messages" in self.parameters.communication_channels
        )
        recipients = [r.recipient for r in self.workflow.routes if r.sender == agent]
        if enabled and recipients:
            observation["legal_actions"].append({"kind": "send_message", "targets": recipients})
        observation["communication"] = self.parameters.communication
        observation["communication_channels"] = ["messages"] if enabled else []
        observation["inbox"] = copy.deepcopy(s["inboxes"][agent][-64:])
        observation["outbox"] = copy.deepcopy(s["outboxes"][agent][-64:])
        observation["logical_time"] = s["logical_time"]
        observation["workflow"] = {
            "resource_stock": s["resource_stock"],
            "resource_spent": s["resource_spent"],
            "timing": self.workflow.timing,
            "turn_order": self.workflow.turn_order.copy(),
            "conflict_order": self.workflow.conflict_order.copy(),
            "delivery_delay": self.workflow.delivery_delay,
            "work": [{**w.model_dump(), **copy.deepcopy(s["work"][w.key])} for w in visible],
        }
        observation["rules"] = (
            "Claim eligible unowned work, then start only work you own. Starting work requires "
            "accepted prerequisite handoffs, the exact artifact version, authorized sources, "
            "a write allowance and the full material cost. Its version, material debit and "
            "due time settle atomically. Role labels and prose confer no authority. "
            "Sequential actions advance one logical tick. Phased proposals use one committed "
            "snapshot and settle at the barrier in declared conflict priority, then advance "
            "one tick. Provider latency never changes time or priority. Reads are actor-scoped. "
            "Stop withdraws only you; it neither hands off nor releases your owned work. "
            "All accepted handoffs, all participants withdrawn or the round horizon end the run."
        )
        observation["withdrawn"] = s["withdrawn"].copy()
        if s["done"] or agent in s["withdrawn"]:
            observation["legal_actions"] = []
        else:
            observation["legal_actions"].append({"kind": "stop"})
        return observation

    def decision_schema(self, observation: Observation) -> type[Decision]:
        variants: list[type] = [WaitWorkflow, StopArtifact]
        for option in observation["legal_actions"]:
            base = {
                "read_artifact": ReadArtifact,
                "claim_work": ClaimWork,
                "perform_work": PerformWork,
                "handoff_work": HandoffWork,
                "accept_handoff": AcceptHandoff,
                "delegate_work": DelegateWork,
                "send_message": SendMessage,
            }.get(option["kind"])
            if base is not None:
                key = (
                    "artifact"
                    if base is ReadArtifact
                    else "recipient"
                    if base is SendMessage
                    else "work"
                )
                Target = StrEnum("Target", {f"a{i}": k for i, k in enumerate(option["targets"])})
                fields: dict[str, Any] = {key: (Target, ...)}
                variants.append(create_model(f"Permitted{base.__name__}", __base__=base, **fields))
        return create_model(
            "WorkflowDecision",
            __base__=Decision,
            action=(reduce(or_, variants), ...),
            forecast=(type(None), ...),
        )

    def validate_work(self, actor: str, decision: Decision) -> None:
        action = decision.action
        if isinstance(action, SendMessage):
            if not (
                self.parameters.communication
                and "messages" in self.parameters.communication_channels
                and any(
                    r.sender == actor and r.recipient == action.recipient
                    for r in self.workflow.routes
                )
            ):
                raise ValueError("Message route is unavailable")
            return
        if not isinstance(
            action, ClaimWork | PerformWork | HandoffWork | AcceptHandoff | DelegateWork
        ):
            if isinstance(action, ReadArtifact):
                self.read(actor, action)
            return
        item = next((w for w in self.workflow.work_items if w.key == action.work), None)
        if item is None:
            raise ValueError("Work operation is unavailable")
        state = self.checkpoint["work"][item.key]
        if isinstance(action, AcceptHandoff):
            handoff = state["handoff"]
            if (
                state["status"] != "handed_off"
                or handoff is None
                or handoff["recipient"] != actor
                or handoff["version"] != action.version
            ):
                raise ValueError("Work handoff is unavailable")
            return
        if actor not in item.workers:
            raise ValueError("Work operation is unavailable")
        if isinstance(action, DelegateWork):
            if (
                state["owner"] != actor
                or state["status"] != "claimed"
                or action.recipient not in item.workers
                or action.recipient == actor
            ):
                raise ValueError("Work delegation is unavailable")
            return
        if isinstance(action, HandoffWork):
            if (
                state["owner"] != actor
                or state["status"] != "ready"
                or action.recipient not in item.handoff_to
                or action.recipient == actor
                or action.version != state["artifact_version"]
            ):
                raise ValueError("Work handoff is unavailable")
            return
        if any(self.checkpoint["work"][d]["status"] != "accepted" for d in item.dependencies):
            raise ValueError("Work dependencies have not been accepted")
        if isinstance(action, ClaimWork):
            if state["owner"] is not None:
                raise ValueError("Work already has an owner")
            return
        if state["owner"] != actor or state["status"] != "claimed":
            raise ValueError("Work operation is unavailable")
        self.accessible(actor, item.artifact, write=True)
        if action.expected_version != len(self.state["artifacts"][item.artifact]["versions"]):
            raise ValueError("Work artifact version conflict")
        if self.checkpoint["resource_stock"] < item.resource_cost:
            raise ValueError("Insufficient workflow materials")
        if self.state["writes_remaining"] < 1:
            raise ValueError("Artifact write allowance exhausted")
        for source in action.sources:
            self.read(actor, ReadArtifact(kind="read_artifact", **source.model_dump()))

    def step(self, actor: str, decision: Decision):
        s = self.checkpoint
        if (
            s["done"]
            or actor not in s["phase_actors"]
            or actor in s["pending_actions"]
            or actor in s["withdrawn"]
        ):
            raise ValueError("Expected an active participant with no pending proposal")
        if self.workflow.timing == "sequential" and actor != self.actor():
            raise ValueError("Expected the declared sequential actor")
        self.decision_schema(self.observe(actor)).model_validate(decision.model_dump())
        self.validate_work(actor, decision)
        read_result = (
            self.read(actor, decision.action) if isinstance(decision.action, ReadArtifact) else None
        )
        s["pending_actions"][actor] = decision.model_dump()
        if read_result is not None:
            s["pending_reads"][actor] = read_result
        s["position"] += 1
        barrier = len(s["pending_actions"]) == len(s["phase_actors"])
        if self.workflow.timing == "phased_simultaneous" and not barrier:
            return [
                Event(
                    kind="proposal_sealed",
                    actor=actor,
                    visibility="researcher",
                    text="Proposal committed; hidden until the phase barrier.",
                    data={"logical_time": s["logical_time"]},
                )
            ], []
        events = []
        order = (
            [actor]
            if self.workflow.timing == "sequential"
            else [a for a in self.workflow.conflict_order if a in s["pending_actions"]]
        )
        for participant in order:
            proposed = Decision.model_validate(s["pending_actions"][participant])
            action = proposed.action
            row = {
                "actor": participant,
                "logical_time": s["logical_time"],
                "kind": action.kind,
                "request": action.model_dump(),
                "operation": len(s["work_history"]) + 1,
                "round": s["round"],
            }
            try:
                if not isinstance(action, ReadArtifact):
                    self.validate_work(participant, proposed)
            except ValueError as error:
                row.update(kind="workflow_conflict", reason=str(error))
            else:
                if isinstance(action, ClaimWork):
                    s["work"][action.work].update(owner=participant, status="claimed")
                elif isinstance(action, PerformWork):
                    item = next(w for w in self.workflow.work_items if w.key == action.work)
                    versions = s["artifacts"][item.artifact]["versions"]
                    version = {
                        "version": len(versions) + 1,
                        "content": copy.deepcopy(action.content),
                        "sources": [r.model_dump() for r in action.sources],
                        "author": participant,
                        "operation": len(s["work_history"]) + 1,
                    }
                    versions.append(version)
                    s["resource_stock"] -= item.resource_cost
                    s["resource_spent"] += item.resource_cost
                    s["writes_remaining"] -= 1
                    s["work"][item.key].update(
                        status="in_progress",
                        due_at=s["logical_time"] + item.duration,
                        artifact_version=version["version"],
                    )
                    row.update(
                        artifact=item.artifact,
                        **copy.deepcopy(version),
                        resource_cost=item.resource_cost,
                    )
                    s["artifact_history"].append(
                        {**copy.deepcopy(row), "kind": "write_artifact", "round": s["round"]}
                    )
                elif isinstance(action, ReadArtifact):
                    row.update(copy.deepcopy(s["pending_reads"][participant]))
                    s["artifact_history"].append(copy.deepcopy(row))
                elif isinstance(action, HandoffWork):
                    item = next(w for w in self.workflow.work_items if w.key == action.work)
                    handoff = {
                        "sender": participant,
                        "recipient": action.recipient,
                        "version": action.version,
                        "sent_at": s["logical_time"],
                        "accepted_at": None,
                    }
                    s["work"][item.key].update(status="handed_off", handoff=handoff)
                    if item.artifact not in s["read_grants"][action.recipient]:
                        s["read_grants"][action.recipient].append(item.artifact)
                    row.update(handoff=copy.deepcopy(handoff), artifact=item.artifact)
                elif isinstance(action, AcceptHandoff):
                    work = s["work"][action.work]
                    work["status"] = "accepted"
                    work["handoff"]["accepted_at"] = s["logical_time"]
                    row["handoff"] = copy.deepcopy(work["handoff"])
                elif isinstance(action, DelegateWork):
                    s["work"][action.work]["owner"] = action.recipient
                    row["recipient"] = action.recipient
                elif isinstance(action, SendMessage):
                    queued = queue_message(s, participant, action, self.workflow.delivery_delay)
                    row.update(**copy.deepcopy(queued.data), kind=queued.kind)
                elif isinstance(action, StopArtifact):
                    s["withdrawn"].append(participant)
                s["notes"][participant] = proposed.memory
            s["last_results"][participant] = copy.deepcopy(row)
            s["work_history"].append(copy.deepcopy(row))
            events.append(
                Event(
                    kind=row["kind"],
                    actor=participant,
                    visibility="private",
                    text=f"Workflow operation {row['kind']} settled.",
                    data=row,
                )
            )
        s["logical_time"] += 1
        events.extend(deliver_messages(s, self.workflow.routes))
        for key, work in s["work"].items():
            if work["status"] == "in_progress" and work["due_at"] <= s["logical_time"]:
                work.update(status="ready", ready_at=s["logical_time"])
                row = {
                    "actor": work["owner"],
                    "kind": "work_ready",
                    "work": key,
                    "logical_time": s["logical_time"],
                    "version": work["artifact_version"],
                }
                s["work_history"].append(copy.deepcopy(row))
                events.append(
                    Event(
                        kind="work_ready",
                        actor=work["owner"],
                        visibility="private",
                        text="Delayed work is ready for handoff.",
                        data=row,
                    )
                )
        self.remember(events)
        accepted = sum(w["status"] == "accepted" for w in s["work"].values())
        measures = [
            Measure(
                key="workflow_completion",
                value=accepted / len(s["work"]),
                denominator=len(s["work"]),
            )
        ]
        terminal = (
            "all_accepted"
            if accepted == len(s["work"])
            else (
                "withdrawn"
                if len(s["withdrawn"]) == len(self.ids)
                else "horizon"
                if barrier and s["round"] >= self.design.rounds
                else None
            )
        )
        if terminal:
            s["done"] = True
            s["outcome"] = {
                "status": terminal,
                "accepted": [key for key, w in s["work"].items() if w["status"] == "accepted"],
                "unfinished": [key for key, w in s["work"].items() if w["status"] != "accepted"],
            }
        if barrier or terminal:
            s["pending_actions"] = {}
            s["pending_reads"] = {}
            s["position"] = 0
            if not terminal:
                s["round"] += 1
                s["phase_actors"] = [a for a in self.workflow.turn_order if a not in s["withdrawn"]]
        return events, measures
