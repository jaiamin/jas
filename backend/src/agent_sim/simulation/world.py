import copy
import random
from abc import ABC, abstractmethod
from collections.abc import Mapping
from typing import Any, cast

from ..domain import Action, Decision, Design, Event, Measure, Parameters, ReadArtifact
from .checkpoints import Checkpoint, LegalAction, Observation
from .decisions import ActionOption, DecisionRules, decision_schema

RULE_VERSION = "4.0.0"


class World[StateT: Checkpoint](ABC):
    version = RULE_VERSION
    decision_rules = DecisionRules()

    @abstractmethod
    def observe(self, agent: str) -> Observation: ...

    @abstractmethod
    def apply(self, agent: str, action: Action) -> tuple[list[Event], list[Measure]]: ...

    def __init__(
        self,
        design: Design,
        parameters: Parameters,
        seed: int,
        state: Mapping[str, Any] | None = None,
    ):
        self.design, self._parameters, self.seed = design, parameters, seed
        self.ids = [p.key for p in design.profiles]
        # The database boundary is JSON; each concrete world owns its typed shape.
        self.state: StateT = (
            cast(StateT, copy.deepcopy(state)) if state is not None else self.initial_state()
        )
        if self.state["rule_version"] != self.version:
            raise ValueError("This saved run requires a different environment rule version")
        if state is None:
            self.new_round()

    @abstractmethod
    def initial_state(self) -> StateT: ...

    def common_state(self) -> Checkpoint:
        return {
            "rule_version": self.version,
            "round": 1,
            "position": 0,
            "done": False,
            "balances": dict.fromkeys(self.ids, 0.0),
            "history": [],
            "notes": dict.fromkeys(self.ids, ""),
            "experiences": {key: [] for key in self.ids},
            "signals": {},
        }

    def order(self) -> list[str]:
        order = self.ids.copy()
        random.Random(f"{self.seed}:order:{self.state['round']}").shuffle(order)
        return order

    @property
    def parameters(self) -> Parameters:
        effective = self._parameters
        for change in sorted(effective.resource_schedule, key=lambda x: x.round):
            if change.round <= self.state["round"]:
                effective = effective.model_copy(update={"endowment": change.endowment})
        return effective

    def actor(self) -> str | None:
        return None if self.state["done"] else self.order()[self.state["position"]]

    def new_round(self) -> None:
        self.state["position"] = 0
        self.state["signals"] = {
            key: random.Random(f"{self.seed}:signal:{self.state['round']}:{key}").randint(
                0, self.parameters.endowment
            )
            for key in self.ids
        }
        if any(c.round == self.state["round"] for c in self._parameters.resource_schedule):
            self.state["history"].append(
                {
                    "round": self.state["round"],
                    "event": "resource_change",
                    "credits_per_round": self.parameters.endowment,
                }
            )

    def base_observation(self, agent: str, rules: str, actions: list[LegalAction]) -> Observation:
        memory = self.parameters.memory
        return {
            "round": self.state["round"],
            "total_rounds": self.design.rounds,
            "rules": rules,
            "context": self.design.context,
            "participants": [
                {"key": p.key, "name": p.name, "role": p.role} for p in self.design.profiles
            ],
            "your_balance": self.state["balances"][agent],
            "your_private_signal": self.state["signals"][agent],
            "public_signals": self.state["signals"].copy()
            if not self.parameters.private_signal
            else {},
            "public_history": copy.deepcopy(self.state["history"][-64:])
            if memory != "none"
            else [],
            "your_experiences": copy.deepcopy(self.state["experiences"][agent][-12:])
            if memory == "episodic"
            else [],
            "your_note": self.state["notes"][agent] if memory in {"episodic", "notes"} else "",
            "communication": self.parameters.communication,
            "communication_channels": self.parameters.communication_channels.copy()
            if self.parameters.communication
            else [],
            "legal_actions": actions,
        }

    def communication_events(self, agent: str, action: Action) -> list[Event]:
        if action.target and action.target not in self.ids:
            raise ValueError("Message recipient must be a participant key or empty for everyone")
        if not self.parameters.communication and (
            action.message or action.report is not None or action.promise is not None
        ):
            raise ValueError("Communication is disabled in this condition")
        channels = self.parameters.communication_channels
        if (
            (action.message and "messages" not in channels)
            or (action.report is not None and "reports" not in channels)
            or (action.promise is not None and "promises" not in channels)
        ):
            raise ValueError("This communication channel is disabled in this condition")
        events = []
        if action.message:
            events.append(
                Event(
                    kind="message",
                    actor=agent,
                    target=action.target or None,
                    visibility="private" if action.target else "public",
                    text=action.message,
                    data={"channel": "direct" if action.target else "public"},
                )
            )
        if action.report is not None:
            signal = self.state["signals"][agent]
            events.append(
                Event(
                    kind="claim",
                    actor=agent,
                    target=action.target or None,
                    text=f"Reports private signal {action.report}.",
                    visibility="private" if action.target else "public",
                    data={
                        "reported": action.report,
                        "known_truth": signal,
                        "accurate": action.report == signal,
                        "subject": "private_signal",
                        "eligible": True,
                    },
                )
            )
        return events

    def remember(self, events: list[Event]) -> None:
        for event in events:
            safe = {
                "round": self.state["round"],
                "kind": event.kind,
                "actor": event.actor,
                "target": event.target,
                "text": event.text,
            }
            if event.visibility == "public" and event.kind in {
                "message",
                "claim",
                "commitment",
                "commitment_resolved",
            }:
                self.state["history"].append(safe)
            for key in self.ids:
                if event.visibility == "researcher":
                    continue
                if event.visibility == "private" and key not in (event.actor, event.target):
                    continue
                # Truth is researcher-only even when the claim itself is public.
                self.state["experiences"][key].append(safe)
                self.state["experiences"][key] = self.state["experiences"][key][-64:]

    def next_round(self) -> None:
        if self.state["round"] >= self.design.rounds:
            self.state["done"] = True
        else:
            self.state["round"] += 1
            self.new_round()

    def schema_rules(self, observation: Observation) -> DecisionRules:
        return self.decision_rules

    def decision_schema(self, observation: Observation) -> type[Decision]:
        grouped: dict[tuple[str, int, int], list[str]] = {}
        for action in observation["legal_actions"]:
            key = (action["kind"], action.get("amount_min", 0), action.get("amount_max", 0))
            targets = (
                [action["target"]] if "target" in action else action.get("targets", ["", *self.ids])
            )
            grouped.setdefault(key, []).extend(targets)
        options = tuple(
            ActionOption(kind, minimum, maximum, tuple(dict.fromkeys(targets)))
            for (kind, minimum, maximum), targets in grouped.items()
        )
        return decision_schema(
            self.schema_rules(observation),
            self.parameters.communication,
            options,
            tuple(self.parameters.communication_channels),
        )

    def _apply_decision(self, actor: str, decision: Decision) -> tuple[list[Event], list[Measure]]:
        if not isinstance(decision.action, Action):
            raise ValueError("Expected a controlled-world action")
        return self.apply(actor, decision.action)

    def step(self, actor: str, decision: Decision) -> tuple[list[Event], list[Measure]]:
        if actor != self.actor() or self.actor() is None:
            raise ValueError("Expected the current actor of an unfinished run")
        # Validate before forecast bookkeeping or any other state mutation.
        self.decision_schema(self.observe(actor)).model_validate(decision.model_dump())
        change = next(
            (
                c
                for c in self.parameters.resource_schedule
                if c.round == self.state["round"] and self.state["position"] == 0
            ),
            None,
        )
        events, measures = self._apply_decision(actor, decision)
        if change:
            events.insert(
                0,
                Event(
                    kind="resource_change",
                    text=f"Credits per round changed to {change.endowment}.",
                    data=change.model_dump(),
                ),
            )
        for event in events:
            if event.kind == "claim":
                measures.append(
                    Measure(
                        key="false_report_rate",
                        agent=event.actor,
                        value=float(not event.data["accurate"]),
                        denominator=1,
                    )
                )
            elif event.kind == "commitment_resolved" and event.data.get("eligible", True):
                measures.append(
                    Measure(
                        key="promise_fulfillment_rate",
                        agent=event.actor,
                        value=float(event.data["fulfilled"]),
                        denominator=1,
                    )
                )
        self.state["notes"][actor] = decision.memory
        return events, measures

    def snapshot(self) -> StateT:
        return copy.deepcopy(self.state)

    def read(self, actor: str, request: ReadArtifact) -> dict[str, Any]:
        raise ValueError("Artifact operation is unavailable")
