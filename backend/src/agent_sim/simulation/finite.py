"""Narrow finite-table World alongside, rather than replacing, richer installed Worlds."""

import copy
from collections.abc import Callable
from enum import StrEnum
from typing import Any, Literal

from pydantic import create_model

from ..domain import (
    Decision,
    Event,
    ExecutablePackage,
    FiniteAction,
    FiniteExtensionPackage,
    FiniteRules,
    Measure,
)
from ..finite_profile import expected, validate_package
from .checkpoints import Checkpoint, Observation
from .world import World


class FiniteCheckpoint(Checkpoint):
    finite_state: int
    credits: int
    escrow: int
    spent: int
    outcome: dict | None
    package_sha256: str


class ReviewedFinite(World[FiniteCheckpoint]):
    version = "1.0.0"
    runner: Callable[[ExecutablePackage, list[int]], list[int]] | None = None

    @property
    def package(self) -> FiniteExtensionPackage:
        source = self.design.environment_source
        if source is None or not isinstance(source.definition.extension, FiniteExtensionPackage):
            raise ValueError("Independent finite admission is required")
        return source.definition.extension

    def __init__(self, design, parameters, seed, state=None):
        self.contract = validate_package(
            design.environment_source.definition.extension
        ).specification
        super().__init__(design, parameters, seed, state)
        phase, credits = self.state.get("finite_state"), self.state.get("credits")
        if (
            self.state.get("package_sha256") != self.package.sha256
            or type(phase) is not int
            or not 0 <= phase < len(self.contract.states)
            or type(credits) is not int
            or not 0 <= credits <= self.contract.max_credits
            or credits + self.contract.states[phase].escrow > self.contract.total_resource
            or type(self.state.get("escrow")) is not int
            or type(self.state.get("spent")) is not int
            or self.state.get("escrow") != self.contract.states[phase].escrow
            or self.state.get("spent")
            != self.contract.total_resource - credits - self.state["escrow"]
            or set(self.state["notes"]) != set(self.ids)
            or set(self.state["experiences"]) != set(self.ids)
            or type(self.state.get("round")) is not int
            or not 1 <= self.state["round"] <= self.design.rounds
            or type(self.state.get("position")) is not int
            or not 0 <= self.state["position"] <= len(self.ids)
            or type(self.state.get("done")) is not bool
        ):
            raise ValueError("Invalid or incompatible complete finite checkpoint")
        status = self.contract.states[phase].status
        terminal = status != "running" or credits == 0
        if self.state["done"]:
            horizon = self.state["round"] == self.design.rounds and self.state["position"] == len(
                self.ids
            )
            reason = (
                self.contract.states[phase].key
                if status != "running"
                else ("exhausted" if credits == 0 else "horizon")
            )
            if (not terminal and not horizon) or self.state.get("outcome") != {
                "success": status == "success",
                "reason": reason,
            }:
                raise ValueError("Finite checkpoint terminal fact differs from its state/time")
        elif (
            terminal
            or self.state["position"] == len(self.ids)
            or self.state.get("outcome") is not None
        ):
            raise ValueError("Finite checkpoint cannot resume a terminal or inconsistent state")

    def initial_state(self) -> FiniteCheckpoint:
        common = self.common_state()
        common.pop("balances", None)
        common.pop("signals", None)
        state = self.contract.states[self.contract.initial_state]
        return {
            **common,
            "finite_state": self.contract.initial_state,
            "credits": self.contract.initial_credits,
            "escrow": state.escrow,
            "spent": self.contract.total_resource - self.contract.initial_credits - state.escrow,
            "outcome": None,
            "package_sha256": self.package.sha256,
        }

    def new_round(self) -> None:
        self.state["position"] = 0

    @property
    def rules(self) -> FiniteRules:
        rules = self.parameters.finite
        if rules is None:
            raise ValueError("Explicit finite role bindings are required")
        return rules

    def order(self) -> list[str]:
        bindings = self.rules.bindings
        return [bindings[role] for role in self.contract.roles]

    def encoded(self, actor: str, operation: str) -> int:
        return (
            (self.state["finite_state"] * (self.contract.max_credits + 1) + self.state["credits"])
            * len(self.contract.roles)
            + self.order().index(actor)
        ) * len(self.contract.operations) + [op.key for op in self.contract.operations].index(
            operation
        )

    def operations(self, actor: str) -> list[str]:
        return [
            op.key
            for op in self.contract.operations
            if not self.state["done"] and expected(self.contract, self.encoded(actor, op.key)) >= 0
        ]

    def observe(self, agent: str) -> Observation:
        if agent not in self.ids:
            raise ValueError("Finite operation is unavailable")
        rules = self.rules
        memory = self.parameters.memory
        state = self.contract.states[self.state["finite_state"]]
        return {
            "round": self.state["round"],
            "total_rounds": self.design.rounds,
            "rules": self.contract.model_dump_json()
            + (
                " External exhaustive finite contract; fixed role order, no communication. "
                "Zero available credits or horizon ends unsuccessfully unless in success state. "
                "Private information confers no authority; refunds cannot mint resources."
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
            "private_information": copy.deepcopy(rules.private.get(agent, {})),
            "legal_actions": [{"kind": op} for op in self.operations(agent)],
            "finite": {
                "state": state.key,
                "state_index": self.state["finite_state"],
                "credits": self.state["credits"],
                "escrow": self.state["escrow"],
                "spent": self.state["spent"],
                "outcome": copy.deepcopy(self.state["outcome"]),
                "role": self.contract.roles[self.order().index(agent)],
            },
        }

    def decision_schema(self, observation: Observation) -> type[Decision]:
        operations = tuple(op["kind"] for op in observation["legal_actions"])
        fields: dict[str, Any] = {
            "operation": (StrEnum("ScopedFiniteOperation", {op: op for op in operations}), ...)
        }
        action_type = create_model("ScopedFiniteAction", __base__=FiniteAction, **fields)
        return create_model(
            "ScopedFiniteDecision",
            __base__=Decision,
            action=(action_type, ...),
            forecast=(Literal[None], None),
        )

    def _apply_decision(self, actor: str, decision: Decision) -> tuple[list[Event], list[Measure]]:
        if not isinstance(decision.action, FiniteAction) or self.runner is None:
            raise ValueError("Extension execution blocked: qualified isolated runner required")
        operation = decision.action.operation
        value = self.encoded(actor, operation)
        consequence = expected(self.contract, value)
        if consequence < 0:
            raise ValueError("Finite operation is unavailable")
        if self.runner(self.package, [value]) != [consequence]:
            raise ValueError("Extension consequence differs from independently reviewed contract")
        before = {key: self.state[key] for key in ("finite_state", "credits", "escrow", "spent")}
        phase, credits = divmod(consequence, self.contract.max_credits + 1)
        escrow = self.contract.states[phase].escrow
        self.state.update(
            finite_state=phase,
            credits=credits,
            escrow=escrow,
            spent=self.contract.total_resource - credits - escrow,
        )
        self.state["position"] += 1
        if self.state["position"] == len(self.ids):
            self.next_round()
        status = self.contract.states[phase].status
        self.state["done"] = self.state["done"] or status != "running" or credits == 0
        after = {
            "finite_state": phase,
            "credits": credits,
            "escrow": escrow,
            "spent": self.state["spent"],
        }
        events = [
            Event(
                kind="finite_transition",
                actor=actor,
                text=f"Finite operation {operation} settled.",
                data={
                    "operation": operation,
                    "before": before,
                    "after": after,
                    "package_sha256": self.package.sha256,
                },
            )
        ]
        measures = []
        if self.state["done"]:
            reason = (
                self.contract.states[phase].key
                if status != "running"
                else ("exhausted" if credits == 0 else "horizon")
            )
            self.state["outcome"] = {"success": status == "success", "reason": reason}
            events.append(
                Event(
                    kind="finite_outcome",
                    text=f"Finite World ended: {reason}.",
                    data=self.state["outcome"].copy(),
                )
            )
            measures.append(
                Measure(key="finite_success", value=float(status == "success"), denominator=1)
            )
        self.remember(events)
        self.state["history"].append(
            {
                "round": self.state["round"],
                "kind": "finite_transition",
                "actor": actor,
                "operation": operation,
                **after,
            }
        )
        return events, measures
