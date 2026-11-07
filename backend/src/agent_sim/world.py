import copy
import random
from abc import ABC, abstractmethod

from .decisions import ActionOption, decision_schema
from .domain import Action, Decision, Design, Event, Measure, Parameters

RULE_VERSION = "1.0.0"


class World(ABC):
    version = RULE_VERSION

    @abstractmethod
    def observe(self, agent: str) -> dict: ...

    @abstractmethod
    def apply(self, agent: str, action: Action) -> tuple[list[Event], list[Measure]]: ...

    def __init__(
        self, design: Design, parameters: Parameters, seed: int, state: dict | None = None
    ):
        self.design, self._parameters, self.seed = design, parameters, seed
        self.ids = [p.key for p in design.profiles]
        self.state = (
            copy.deepcopy(state)
            if state is not None
            else {
                "rule_version": self.version,
                "round": 1,
                "position": 0,
                "done": False,
                "balances": dict.fromkeys(self.ids, 0.0),
                "pending": {},
                "history": [],
                "notes": dict.fromkeys(self.ids, ""),
                "experiences": {key: [] for key in self.ids},
                "promises": {},
                "signals": {},
                "relations": {},
                "tasks": [],
                "phase": "send",
                "escrow": {},
            }
        )
        if state is None:
            self.new_round()

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
        self.state["pending"] = {}
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

    def base_observation(self, agent: str, rules: str, actions: list[dict]) -> dict:
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
            "public_signals": self.state["signals"] if not self.parameters.private_signal else {},
            "public_history": self.state["history"][-12:] if memory != "none" else [],
            "your_experiences": self.state["experiences"][agent][-12:]
            if memory == "episodic"
            else [],
            "your_note": self.state["notes"][agent] if memory in {"episodic", "notes"} else "",
            "communication": self.parameters.communication,
            "communication_channels": self.parameters.communication_channels
            if self.parameters.communication
            else [],
            "legal_actions": actions,
        }

    def communication(self, agent: str, action: Action) -> list[Event]:
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
            for key in self.ids:
                if event.visibility == "researcher":
                    continue
                if event.visibility == "private" and key not in (event.actor, event.target):
                    continue
                safe = {
                    "round": self.state["round"],
                    "kind": event.kind,
                    "actor": event.actor,
                    "target": event.target,
                    "text": event.text,
                }
                # Truth is researcher-only even when the claim itself is public.
                self.state["experiences"][key].append(safe)
                self.state["experiences"][key] = self.state["experiences"][key][-64:]

    def next_round(self) -> None:
        if self.state["round"] >= self.design.rounds:
            self.state["done"] = True
        else:
            self.state["round"] += 1
            self.new_round()

    def decision_schema(self, observation: dict) -> type[Decision]:
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
            self.design.environment,
            self.parameters.communication,
            options,
            tuple(self.parameters.communication_channels),
        )

    def _apply_decision(self, actor: str, decision: Decision) -> tuple[list[Event], list[Measure]]:
        return self.apply(actor, decision.action)

    def step(self, actor: str, decision: Decision) -> tuple[list[Event], list[Measure]]:
        change = next(
            (
                c
                for c in self.parameters.resource_schedule
                if c.round == self.state["round"] and self.state["position"] == 0
            ),
            None,
        )
        self.state.setdefault("forecasts", {})
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
            elif event.kind in (
                "task_progress",
                "task_completed",
                "blocked_work",
                "duplicate_work",
            ):
                for kind in ("blocked_work", "duplicate_work"):
                    measures.append(
                        Measure(
                            key=f"{kind}_rate",
                            agent=event.actor,
                            value=float(event.kind == kind),
                            denominator=1,
                        )
                    )
        self.state["notes"][actor] = decision.memory
        return events, measures

    def snapshot(self) -> dict:
        return copy.deepcopy(self.state)
