"""Three-person option choice with explicit logical phases, not provider-time priority."""

import copy
from enum import StrEnum
from functools import lru_cache, reduce
from operator import or_
from typing import cast

from pydantic import create_model

from ..domain import (
    ChooseAlternative,
    Decision,
    DistributedRules,
    Event,
    Measure,
    ReadArtifact,
    SendMessage,
    StopArtifact,
    WaitCoordination,
    WriteArtifact,
)
from .addressed import deliver_messages, queue_message
from .artifacts import ArtifactWorkspace
from .checkpoints import DistributedCheckpoint, Observation


class DistributedCoordination(ArtifactWorkspace):
    version = "1.0.0"

    @property
    def coordination(self) -> DistributedRules:
        rules = self.parameters.coordination
        if rules is None:
            raise ValueError("Distributed coordination requires explicit rules")
        return rules

    @property
    def checkpoint(self) -> DistributedCheckpoint:
        return cast(DistributedCheckpoint, self.state)

    def initial_state(self) -> DistributedCheckpoint:
        return {
            **super().initial_state(),
            "logical_time": 0,
            "phase_actors": self.coordination.turn_order.copy(),
            "pending_actions": {},
            "choices": {},
            "pending_deliveries": [],
            "inboxes": {a: [] for a in self.ids},
            "outboxes": {a: [] for a in self.ids},
            "message_sequences": {},
            "proposal_count": 0,
            "pending_reads": {},
        }

    def order(self) -> list[str]:
        return self.checkpoint["phase_actors"]

    def actor(self) -> str | None:
        s = self.checkpoint
        return (
            None
            if s["done"]
            else next((a for a in s["phase_actors"] if a not in s["pending_actions"]), None)
        )

    def new_round(self) -> None:
        self.state["position"] = 0

    def can_check(self, actor: str) -> bool:
        return False

    def read(self, actor: str, request: ReadArtifact) -> dict:
        if self.state["done"] or actor not in self.checkpoint["phase_actors"]:
            raise ValueError("Artifact operation is unavailable")
        self.accessible(actor, request.artifact)
        versions = self.state["artifacts"][request.artifact]["versions"]
        number = request.version or len(versions)
        if number > len(versions):
            raise ValueError("Artifact operation is unavailable")
        return self.project_version(actor, {"artifact": request.artifact, **versions[number - 1]})

    def observe(self, agent: str) -> Observation:
        observation = super().observe(agent)
        observation["legal_actions"] += [
            {"kind": "choose_alternative", "targets": self.coordination.alternatives},
            {"kind": "wait_coordination"},
        ]
        observation["logical_time"] = self.checkpoint["logical_time"]
        observation["choices"] = copy.deepcopy(self.checkpoint["choices"])
        observation["coordination"] = self.coordination.model_dump(exclude={"information"})
        observation["inbox"] = copy.deepcopy(self.checkpoint["inboxes"][agent][-64:])
        observation["outbox"] = copy.deepcopy(self.checkpoint["outboxes"][agent][-64:])
        routes = [r.recipient for r in self.coordination.routes if r.sender == agent]
        enabled = (
            self.parameters.communication and "messages" in self.parameters.communication_channels
        )
        observation["communication"] = self.parameters.communication
        observation["communication_channels"] = ["messages"] if enabled else []
        if enabled and routes:
            observation["legal_actions"].append({"kind": "send_message", "targets": routes})
        observation["rules"] = (
            "Choose any declared alternative, wait, inspect permitted artifacts, or stop to "
            "abstain personally. Each final choice earns your immutable value for that option, "
            f"plus {self.coordination.match_bonus} only if all three choose the same option. "
            "Unchosen/abstaining actors earn zero. Role labels confer no permissions. "
            "Sequential decisions settle immediately, one logical tick per action. Phased "
            "decisions use a frozen observation until all active actors propose, then settle "
            "in declared conflict_order with one tick per barrier. Provider requests may be "
            "sampled serially; provider latency never advances logical time or sets priority. "
            "Choices are final and published only at settlement. Stop affects only you. "
            "The round horizon ends remaining work without forcing choices."
            " Messages use only declared directed routes; route list order controls equal-time "
            "delivery ordering. Each addressed message arrives after delivery_delay logical "
            "ticks, after settlement, never while a phase is collecting proposals. Inbox and "
            "outbox are persistent current mailbox state in every memory mode. Queued is not "
            "delivered; terminal runs do not advance time to flush future messages."
        )
        return observation

    def decision_schema(self, observation: Observation) -> type[Decision]:
        return self._coordination_schema(
            super().decision_schema(observation),
            tuple(self.coordination.alternatives),
            any(a["kind"] == "choose_alternative" for a in observation["legal_actions"]),
            tuple(
                next(
                    (
                        a["targets"]
                        for a in observation["legal_actions"]
                        if a["kind"] == "send_message"
                    ),
                    [],
                )
            ),
        )

    @staticmethod
    @lru_cache(maxsize=256)
    def _coordination_schema(
        base: type[Decision],
        alternatives: tuple[str, ...],
        can_choose: bool,
        recipients: tuple[str, ...],
    ) -> type[Decision]:
        Choice = StrEnum("Choice", {f"a{i}": a for i, a in enumerate(alternatives)})
        choose = create_model(
            "PermittedAlternative", __base__=ChooseAlternative, alternative=(Choice, ...)
        )
        annotation = base.model_fields["action"].annotation
        if annotation is None:
            raise TypeError("Coordination decision schema requires an action type")
        variants: list[type] = [cast(type, annotation), WaitCoordination]
        if can_choose:
            variants.insert(1, choose)
        if recipients:
            Recipient = StrEnum("Recipient", {f"a{i}": a for i, a in enumerate(recipients)})
            variants.append(
                create_model("AddressedMessage", __base__=SendMessage, recipient=(Recipient, ...))
            )
        return create_model(
            "DistributedDecision",
            __base__=Decision,
            action=(reduce(or_, variants), ...),
            forecast=(type(None), ...),
        )

    def exposure_paths(self, event: dict, observation: Observation) -> list[list[str | int]]:
        if event["kind"] == "alternative_chosen":
            actor = event["actor"]
            return (
                [["choices", actor]]
                if actor in observation["choices"]
                and observation["choices"][actor] == event["data"]["alternative"]
                else []
            )
        if event["kind"] in {"message_queued", "message_delivered"}:
            field = "outbox" if event["kind"] == "message_queued" else "inbox"
            return [
                [field, i]
                for i, row in enumerate(observation[field])
                if row["id"] == event["data"]["id"]
            ]
        return (
            super().exposure_paths(event, observation)
            if event["kind"] in {"read_artifact", "write_artifact", "artifact_conflict"}
            else []
        )

    def deliver(self) -> list[Event]:
        return deliver_messages(self.checkpoint, self.coordination.routes)

    def settle_commitment_action(self, actor: str, decision: Decision) -> Event | None:
        return None

    def settle_commitments(self, actors: list[str], events: list[Event]) -> list[Event]:
        return []

    def active_actors(self) -> list[str]:
        return [a for a in self.coordination.turn_order if a not in self.checkpoint["choices"]]

    def finished(self, barrier: bool) -> bool:
        return (
            len(self.checkpoint["choices"]) == 3
            or barrier
            and self.state["round"] >= self.design.rounds
        )

    def finish(self, choices: dict, matched: bool, payoffs: dict) -> tuple[dict, list[Measure]]:
        return {
            "choices": choices,
            "matched": matched,
            "payoffs": payoffs,
            "reason": "choices_complete" if len(self.checkpoint["choices"]) == 3 else "horizon",
        }, [
            Measure(key="coordination_match", value=float(matched), denominator=1),
            Measure(key="coordination_value", value=sum(payoffs.values()), denominator=1),
        ]

    def step(self, actor: str, decision: Decision) -> tuple[list[Event], list[Measure]]:
        s = self.checkpoint
        if s["done"] or actor not in s["phase_actors"] or actor in s["pending_actions"]:
            raise ValueError("Expected an active participant with no pending proposal")
        if self.coordination.timing == "sequential" and actor != self.actor():
            raise ValueError("Expected the declared sequential actor")
        self.decision_schema(self.observe(actor)).model_validate(decision.model_dump())
        action = decision.action
        read_result = self.read(actor, action) if isinstance(action, ReadArtifact) else None
        if isinstance(action, WriteArtifact):
            self.accessible(actor, action.artifact, write=True)
            if action.expected_version != len(s["artifacts"][action.artifact]["versions"]):
                raise ValueError(
                    "Artifact version conflict; read the current version before writing"
                )
            if s["writes_remaining"] < 1:
                raise ValueError("Artifact write allowance exhausted")
            for reference in action.sources:
                self.read(actor, ReadArtifact(kind="read_artifact", **reference.model_dump()))
        # All validation precedes mutation. Phased conflicts are settlement outcomes.
        s["pending_actions"][actor] = decision.model_dump()
        if read_result is not None:
            s["pending_reads"][actor] = read_result
        s["proposal_count"] += 1
        s["position"] += 1
        barrier = len(s["pending_actions"]) == len(s["phase_actors"])
        if self.coordination.timing == "phased_simultaneous" and not barrier:
            return [
                Event(
                    kind="proposal_sealed",
                    actor=actor,
                    visibility="researcher",
                    text="Proposal committed; hidden until the phase barrier.",
                    data={"logical_time": s["logical_time"]},
                )
            ], []
        settle = (
            [actor]
            if self.coordination.timing == "sequential"
            else [a for a in self.coordination.conflict_order if a in s["pending_actions"]]
        )
        events = []
        for participant in settle:
            proposal = Decision.model_validate(s["pending_actions"][participant])
            action = proposal.action
            special = self.settle_commitment_action(participant, proposal)
            if special is not None:
                event = special
            elif isinstance(action, ChooseAlternative | StopArtifact):
                selected = action.alternative if isinstance(action, ChooseAlternative) else None
                s["choices"][participant] = selected
                event = Event(
                    kind="alternative_chosen",
                    actor=participant,
                    text=f"Chose {selected}." if selected else "Abstained.",
                    data={"alternative": selected, "logical_time": s["logical_time"]},
                )
            elif isinstance(action, ReadArtifact):
                result = copy.deepcopy(s["pending_reads"][participant])
                s["last_results"][participant] = result
                row = {
                    **copy.deepcopy(result),
                    "operation": s["proposal_count"],
                    "round": s["round"],
                    "actor": participant,
                    "kind": action.kind,
                    "request": action.model_dump(),
                }
                s["artifact_history"].append(row)
                event = Event(
                    kind=action.kind,
                    actor=participant,
                    visibility="private",
                    text="Artifact read settled.",
                    data=row,
                )
            elif isinstance(action, WriteArtifact):
                versions = s["artifacts"][action.artifact]["versions"]
                rejected = action.expected_version != len(versions) or s["writes_remaining"] < 1
                if rejected:
                    result = {
                        "artifact": action.artifact,
                        "rejected": True,
                        "requested_version": action.expected_version,
                        "actual_version": len(versions),
                        "reason": "version_conflict"
                        if action.expected_version != len(versions)
                        else "write_allowance",
                    }
                else:
                    version = {
                        "version": len(versions) + 1,
                        "content": copy.deepcopy(action.content),
                        "sources": [r.model_dump() for r in action.sources],
                        "author": participant,
                        "operation": s["proposal_count"],
                    }
                    versions.append(copy.deepcopy(version))
                    s["writes_remaining"] -= 1
                    result = {"artifact": action.artifact, **version}
                s["last_results"][participant] = copy.deepcopy(result)
                row = {
                    **copy.deepcopy(result),
                    "operation": s["proposal_count"],
                    "round": s["round"],
                    "actor": participant,
                    "kind": "artifact_conflict" if rejected else action.kind,
                    "request": action.model_dump(),
                }
                s["artifact_history"].append(row)
                event = Event(
                    kind=row["kind"],
                    actor=participant,
                    visibility="private",
                    text="Artifact write conflicted; no write consumed."
                    if rejected
                    else "Artifact write settled.",
                    data=row,
                )
            elif isinstance(action, SendMessage):
                event = queue_message(s, participant, action, self.coordination.delivery_delay)
            else:
                event = Event(
                    kind="coordination_wait",
                    actor=participant,
                    visibility="private",
                    text="Waited.",
                    data={"logical_time": s["logical_time"]},
                )
            s["notes"][participant] = proposal.memory
            events.append(event)
        s["logical_time"] += 1
        events.extend(self.deliver())
        events.extend(self.settle_commitments(settle, events))
        self.remember(events)
        measures = []
        if self.finished(barrier):
            s["done"] = True
            choices = {a: s["choices"].get(a) for a in self.ids}
            matched = len(set(choices.values())) == 1 and None not in choices.values()
            objects = {obj.key: obj for obj in self.rules.objects}
            payoffs = {
                a: int(objects[self.coordination.information[a]].content[choice])
                + (self.coordination.match_bonus if matched else 0)
                if choice
                else 0
                for a, choice in choices.items()
            }
            s["outcome"], measures = self.finish(choices, matched, payoffs)
            events.append(
                Event(
                    kind="coordination_outcome",
                    visibility="researcher",
                    text="Declared choice values settled.",
                    data=copy.deepcopy(s["outcome"]),
                )
            )
            s["pending_actions"] = {}
            s["pending_reads"] = {}
        elif barrier:
            s["round"] += 1
            s["pending_actions"] = {}
            s["pending_reads"] = {}
            s["phase_actors"] = self.active_actors()
            self.new_round()
        return events, measures
