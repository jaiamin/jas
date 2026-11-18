"""A narrow admitted World; the guest proposes integers, trusted rules settle them."""

import copy
from collections.abc import Callable
from enum import StrEnum
from typing import Any, Literal

from pydantic import create_model

from ..domain import Action, Decision, Event, ExtensionPackage, Measure, RelayAction, RelayRules
from ..extension_profile import OPERATIONS, expected, validate_package
from .checkpoints import Checkpoint, Observation
from .world import World

Transition = Callable[[ExtensionPackage, list[int]], list[int]]


class RelayCheckpoint(Checkpoint):
    phase: int
    credits: int
    outcome: dict | None
    package_sha256: str


class SealedRelay(World[RelayCheckpoint]):
    version = "1.0.0"
    runner: Transition | None = None

    def __init__(self, design, parameters, seed, state=None):
        super().__init__(design, parameters, seed, state)
        if (
            self.state.get("package_sha256") != self.package.sha256
            or type(self.state.get("phase")) is not int
            or self.state["phase"] not in range(4)
            or type(self.state.get("credits")) is not int
            or self.state["credits"] not in range(4)
            or set(self.state["notes"]) != set(self.ids)
            or set(self.state["experiences"]) != set(self.ids)
        ):
            raise ValueError("Invalid or incompatible complete relay checkpoint")

    @property
    def package(self) -> ExtensionPackage:
        source = self.design.environment_source
        if source is None or not isinstance(source.definition.extension, ExtensionPackage):
            raise ValueError("Independent extension admission is required")
        validate_package(source.definition.extension)
        return source.definition.extension

    def initial_state(self) -> RelayCheckpoint:
        validate_package(self.package)
        common = self.common_state()
        common.pop("balances", None)
        common.pop("signals", None)
        return {
            **common,
            "phase": 0,
            "credits": 3,
            "outcome": None,
            "package_sha256": self.package.sha256,
        }

    def new_round(self) -> None:
        self.state["position"] = 0

    @property
    def rules(self) -> RelayRules:
        rules = self.parameters.relay
        if rules is None:
            raise ValueError("Explicit relay permissions are required")
        return rules

    def order(self) -> list[str]:
        rules = self.rules
        return [rules.submitter, rules.reviewer]

    def encoded(self, actor: str, operation: str) -> int:
        return (
            (self.state["phase"] * 4 + self.state["credits"]) * 2 + self.order().index(actor)
        ) * 4 + OPERATIONS.index(operation)

    def operations(self, actor: str) -> list[str]:
        return (
            [op for op in OPERATIONS if expected(self.encoded(actor, op)) >= 0]
            if not self.state["done"]
            else []
        )

    def observe(self, agent: str) -> Observation:
        if agent not in self.ids:
            raise ValueError("Relay operation is unavailable")
        memory = self.parameters.memory
        relay = {
            "phase": self.state["phase"],
            "credits": self.state["credits"],
            "permission": "submitter" if agent == self.order()[0] else "reviewer",
            "outcome": copy.deepcopy(self.state["outcome"]),
        }
        rules = self.rules
        if agent == rules.reviewer:
            relay["docket"] = rules.docket
        return {
            "round": self.state["round"],
            "total_rounds": self.design.rounds,
            "rules": (
                "Sealed relay v1. Submitter may lodge for 1 credit in phase 0; "
                "reviewer may release for 2 in phase 1. Wait costs 1; stop costs 1 and"
                " ends unsuccessfully. Three credits total; zero credits or "
                "horizon ends unsuccessfully unless released. Fixed "
                "submitter/reviewer order; private docket confers no authority. "
                "Only finite mechanics are admitted."
            ),
            "context": self.design.context,
            "participants": [
                {"key": p.key, "name": p.name, "role": p.role} for p in self.design.profiles
            ],
            "public_history": copy.deepcopy(self.state["history"][-64:])
            if memory != "none"
            else [],
            "your_experiences": copy.deepcopy(self.state["experiences"][agent][-12:])
            if memory == "episodic"
            else [],
            "your_note": self.state["notes"][agent] if memory in {"episodic", "notes"} else "",
            "communication": False,
            "communication_channels": [],
            "legal_actions": [{"kind": op} for op in self.operations(agent)],
            "relay": relay,
        }

    def decision_schema(self, observation: Observation) -> type[Decision]:
        operations = tuple(option["kind"] for option in observation["legal_actions"])
        fields: dict[str, Any] = {
            "operation": (StrEnum("ScopedRelayOperation", {op: op for op in operations}), ...)
        }
        action_type = create_model("ScopedRelayAction", __base__=RelayAction, **fields)
        return create_model(
            "ScopedRelayDecision",
            __base__=Decision,
            action=(action_type, ...),
            forecast=(Literal[None], None),
        )

    def apply(self, agent: str, action: Action) -> tuple[list[Event], list[Measure]]:
        raise ValueError("Sealed relay requires a typed relay operation")

    def _apply_decision(self, actor: str, decision: Decision) -> tuple[list[Event], list[Measure]]:
        action = decision.action
        if not isinstance(action, RelayAction) or self.runner is None:
            raise ValueError("Extension execution blocked: qualified isolated runner required")
        value = self.encoded(actor, action.operation)
        consequence = expected(value)
        if consequence < 0:
            raise ValueError("Relay operation is unavailable")
        # The untrusted result never supplies an event, fact, permission or observation.
        if self.runner(self.package, [value]) != [consequence]:
            raise ValueError("Extension consequence differs from independent specification")
        phase, credits = divmod(consequence, 4)
        previous = {"phase": self.state["phase"], "credits": self.state["credits"]}
        self.state["phase"], self.state["credits"] = phase, credits
        self.state["position"] += 1
        if self.state["position"] == 2:
            self.next_round()
        self.state["done"] = self.state["done"] or phase >= 2 or credits == 0
        events = [
            Event(
                kind="relay_transition",
                actor=actor,
                text=f"Relay operation {action.operation} settled.",
                data={
                    "operation": action.operation,
                    "before": previous,
                    "after": {"phase": phase, "credits": credits},
                    "package_sha256": self.package.sha256,
                },
            )
        ]
        measures = []
        if self.state["done"]:
            reason = (
                "released"
                if phase == 2
                else "stopped"
                if phase == 3
                else "exhausted"
                if credits == 0
                else "horizon"
            )
            self.state["outcome"] = {"success": phase == 2, "reason": reason}
            events.append(
                Event(
                    kind="relay_outcome",
                    text=f"Relay ended: {reason}.",
                    data=self.state["outcome"].copy(),
                )
            )
            measures.append(Measure(key="relay_success", value=float(phase == 2), denominator=1))
        self.remember(events)
        self.state["history"].append(
            {
                "round": self.state["round"],
                "kind": "relay_transition",
                "actor": actor,
                "operation": action.operation,
                "phase": phase,
                "credits": credits,
            }
        )
        return events, measures
