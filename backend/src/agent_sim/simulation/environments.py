import copy
from dataclasses import dataclass
from typing import cast

from ..domain import Action, Decision, Design, Event, Measure, Parameters
from .artifacts import ArtifactWorkspace
from .checkpoints import (
    ActionPayload,
    CommonsCheckpoint,
    CoordinationCheckpoint,
    Observation,
    Promise,
    TrustCheckpoint,
)
from .composed import Composed
from .decisions import DecisionRules
from .distributed import DistributedCoordination
from .mechanisms import Bargaining, Information, Institution, RenewableResource
from .world import World


class Commons(World[CommonsCheckpoint]):
    decision_rules = DecisionRules(allow_forecast=True, promise_limit="action")

    def initial_state(self) -> CommonsCheckpoint:
        return {**self.common_state(), "pending": {}, "promises": {}}

    def new_round(self) -> None:
        super().new_round()
        self.state["pending"] = {}

    def _apply_decision(self, actor: str, decision: Decision) -> tuple[list[Event], list[Measure]]:
        if not isinstance(decision.action, Action):
            raise ValueError("Expected a controlled-world action")
        endowment = self.parameters.endowment
        forecasts = self.state.setdefault("forecasts", {})
        forecasts[actor] = decision.forecast
        events, measures = self.apply(actor, decision.action)
        if any(e.kind == "contribution" for e in events):
            contributions = {e.actor: e.data["amount"] for e in events if e.kind == "contribution"}
            for key, amount in contributions.items():
                prediction = forecasts.get(key)
                if prediction is not None:
                    actual = (sum(contributions.values()) - amount) / (
                        (len(contributions) - 1) * endowment
                    )
                    measures.append(
                        Measure(
                            key="forecast_error",
                            agent=key,
                            value=abs(prediction - actual),
                            denominator=1,
                        )
                    )
        return events, measures

    def observe(self, agent: str) -> Observation:
        endowment = self.parameters.endowment
        return self.base_observation(
            agent,
            f"Each round you receive {endowment} credits. Privately choose a contribution "
            f"from 0 to {endowment}. All choices are sealed until everyone decides. "
            f"Contributions are multiplied by {self.parameters.multiplier:g} and shared equally. "
            "You keep unspent credits. Messages/reports become visible after settlement. "
            "A promise is your minimum contribution NEXT round; the researcher checks it. "
            "A report states your exact private signal; that signal does not change payoffs. "
            "Forecast predicts the other agents' mean contribution fraction this round. "
            "Use an empty target for public communication; otherwise use a participant key.",
            [{"kind": "contribute", "amount_min": 0, "amount_max": endowment}],
        )

    def apply(self, agent: str, action: Action) -> tuple[list[Event], list[Measure]]:
        if agent != self.actor() or action.kind != "contribute":
            raise ValueError("Expected a contribution from the current actor")
        if action.amount > self.parameters.endowment:
            raise ValueError("Contribution exceeds the round endowment")
        if action.promise is not None and action.promise > self.parameters.endowment:
            raise ValueError("Promise exceeds the round endowment")
        self.communication_events(agent, action)
        self.state["pending"][agent] = cast(ActionPayload, action.model_dump())
        self.state["position"] += 1
        if self.state["position"] < len(self.ids):
            return [
                Event(
                    kind="decision_sealed",
                    actor=agent,
                    visibility="researcher",
                    text="Contribution recorded; hidden until round settlement.",
                )
            ], []
        choices = {key: Action.model_validate(self.state["pending"][key]) for key in self.ids}
        total = sum(a.amount for a in choices.values())
        dividend = total * self.parameters.multiplier / len(self.ids)
        events, measures = [], []
        for key, chosen in choices.items():
            payoff = self.parameters.endowment - chosen.amount + dividend
            self.state["balances"][key] += payoff
            events.append(
                Event(
                    kind="contribution",
                    actor=key,
                    text=f"Contributed {chosen.amount} of {self.parameters.endowment} credits.",
                    data={
                        "amount": chosen.amount,
                        "available": self.parameters.endowment,
                        "payoff": payoff,
                    },
                )
            )
            measures.append(Measure(key="payoff", agent=key, value=payoff))
            prior = self.state["promises"].pop(key, None)
            if prior is not None:
                fulfilled = chosen.amount >= prior["amount"]
                eligible = prior["amount"] <= self.parameters.endowment
                events.append(
                    Event(
                        kind="commitment_resolved",
                        actor=key,
                        text="Promise exceeded the available credits after a resource change."
                        if not eligible
                        else "Kept the contribution promise."
                        if fulfilled
                        else "Did not meet the contribution promise.",
                        data={
                            **prior,
                            "actual": chosen.amount,
                            "fulfilled": fulfilled,
                            "eligible": eligible,
                        },
                    )
                )
            events += self.communication_events(key, chosen)
            if chosen.promise is not None and self.state["round"] < self.design.rounds:
                promise: Promise = {"amount": chosen.promise, "due_round": self.state["round"] + 1}
                self.state["promises"][key] = promise
                events.append(
                    Event(
                        kind="commitment",
                        actor=key,
                        text=f"Promises at least {chosen.promise} next round.",
                        data=promise,
                    )
                )
        capacity = len(self.ids) * self.parameters.endowment
        measures += [
            Measure(key="contribution_rate", value=total / capacity, denominator=capacity),
            Measure(key="group_payoff", value=sum(m.value or 0 for m in measures)),
        ]
        self.state["history"].append(
            {
                "round": self.state["round"],
                "contributions": {k: a.amount for k, a in choices.items()},
                "contribution_rate": total / capacity,
            }
        )
        self.remember(events)
        self.next_round()
        return events, measures


class TrustExchange(World[TrustCheckpoint]):
    def schema_rules(self, observation: Observation) -> DecisionRules:
        return DecisionRules(
            allow_forecast=observation["role"] == "sender", promise_limit="unbounded"
        )

    def initial_state(self) -> TrustCheckpoint:
        return {**self.common_state(), "promises": {}, "escrow": {}, "relations": {}}

    def _apply_decision(self, actor: str, decision: Decision) -> tuple[list[Event], list[Measure]]:
        if not isinstance(decision.action, Action):
            raise ValueError("Expected a controlled-world action")
        forecasts = self.state.setdefault("forecasts", {})
        events, measures = self.apply(actor, decision.action)
        transfer = next(e for e in events if e.kind == "transfer")
        if transfer.data["phase"] == "send":
            if transfer.target is None:
                raise ValueError("Transfer must name its counterparty")
            forecasts[transfer.target] = decision.forecast
        else:
            prediction = forecasts.pop(actor, None)
            if prediction is not None and transfer.data["available"]:
                measures.append(
                    Measure(
                        key="forecast_error",
                        agent=transfer.target,
                        value=abs(
                            prediction - transfer.data["amount"] / transfer.data["available"]
                        ),
                        denominator=1,
                    )
                )
        return events, measures

    def partners(self) -> tuple[str, str]:
        order = self.order()
        position = self.state["position"]
        pair = position // 2 * 2
        return order[pair], order[pair + 1]

    def observe(self, agent: str) -> Observation:
        sender, receiver = self.partners()
        receiving = agent == receiver
        available = (
            self.state["escrow"].get(receiver, 0) if receiving else self.parameters.endowment
        )
        observation = self.base_observation(
            agent,
            f"You are {'the receiver' if receiving else 'the sender'} in a trust exchange. "
            f"The sender gets {self.parameters.endowment} credits and can transfer some. "
            f"Sent credits are multiplied by {self.parameters.multiplier:g} (rounded down). "
            "The receiver may return any received amount; both keep what remains. "
            "Pairs change by a seeded round schedule. A promise is a minimum future transfer "
            "next time you act, scored only if you have enough credits available. "
            "Report states your private signal. On a sender turn, forecast predicts the partner's "
            "return divided by received credits; it is scored when received credits are positive. "
            "On receiver turns forecast is null. "
            "Target selects a message recipient; the exchange partner is set by the rules.",
            [{"kind": "return" if receiving else "send", "amount_min": 0, "amount_max": available}],
        )
        observation.update(
            partner=sender if receiving else receiver,
            available=available,
            role="receiver" if receiving else "sender",
        )
        return observation

    def apply(self, agent: str, action: Action) -> tuple[list[Event], list[Measure]]:
        if agent != self.actor():
            raise ValueError("Expected the current actor")
        sender, receiver = self.partners()
        receiving = agent == receiver
        available = (
            self.state["escrow"].get(receiver, 0) if receiving else self.parameters.endowment
        )
        if action.kind != ("return" if receiving else "send") or action.amount > available:
            raise ValueError("Transfer must match the current role and available credits")
        events = self.communication_events(agent, action)
        target = sender if receiving else receiver
        previous = self.state["promises"].pop(agent, None)
        if previous is not None:
            eligible = previous["amount"] <= available
            events.append(
                Event(
                    kind="commitment_resolved",
                    actor=agent,
                    target=target,
                    text="Transfer commitment evaluated."
                    if eligible
                    else "Commitment not eligible: insufficient opportunity.",
                    data={
                        **previous,
                        "actual": action.amount,
                        "eligible": eligible,
                        "fulfilled": action.amount >= previous["amount"],
                    },
                )
            )
        if action.promise is not None and self.state["round"] < self.design.rounds:
            self.state["promises"][agent] = {"amount": action.promise}
            events.append(
                Event(
                    kind="commitment",
                    actor=agent,
                    target=target,
                    text=f"Promises a transfer of at least {action.promise} on their next action.",
                    data={"amount": action.promise},
                )
            )
        if not receiving:
            self.state["balances"][sender] += available - action.amount
            self.state["escrow"][receiver] = int(action.amount * self.parameters.multiplier)
        else:
            self.state["balances"][receiver] += available - action.amount
            self.state["balances"][sender] += action.amount
        events.append(
            Event(
                kind="transfer",
                actor=agent,
                target=target,
                text=f"Transferred {action.amount} of {available} credits.",
                data={
                    "amount": action.amount,
                    "available": available,
                    "phase": "return" if receiving else "send",
                },
            )
        )
        relation = self.state["relations"].setdefault(
            f"{agent}:{target}", {"amount": 0, "count": 0}
        )
        relation["amount"] += action.amount
        relation["count"] += 1
        measure = Measure(
            key="return_rate" if receiving else "trust_rate",
            value=action.amount / available if available else None,
            denominator=available,
            agent=agent,
        )
        self.state["history"].append(
            {
                "round": self.state["round"],
                "actor": agent,
                "target": target,
                "amount": action.amount,
                "available": available,
                "phase": "return" if receiving else "send",
            }
        )
        self.remember(events)
        self.state["position"] += 1
        if self.state["position"] == len(self.ids):
            self.next_round()
        return events, [measure]


class Coordination(World[CoordinationCheckpoint]):
    decision_rules = DecisionRules(allow_forecast=True)

    def _apply_decision(self, actor: str, decision: Decision) -> tuple[list[Event], list[Measure]]:
        if not isinstance(decision.action, Action):
            raise ValueError("Expected a controlled-world action")
        forecasts = self.state.setdefault("forecasts", {})
        prior_coordination = forecasts.get("next_completion")
        events, measures = self.apply(actor, decision.action)
        rate = next(m.value for m in measures if m.key == "completion_rate")
        if prior_coordination is not None and rate is not None:
            measures.append(
                Measure(key="forecast_error", value=abs(prior_coordination - rate), denominator=1)
            )
        forecasts["next_completion"] = decision.forecast
        return events, measures

    def initial_state(self) -> CoordinationCheckpoint:
        return {
            **self.common_state(),
            "tasks": (
                [
                    {
                        "key": task.key,
                        "name": task.name,
                        "dependencies": task.dependencies,
                        "effort": task.effort,
                        "progress": 0,
                        "completed_by": None,
                    }
                    for task in self.design.tasks
                ]
                if self.design.tasks
                else [
                    {
                        "key": f"task-{i + 1}",
                        "name": f"Work package {i + 1}",
                        "dependencies": [f"task-{i}"] if i > 0 and i % 3 else [],
                        "effort": 2 + (i % 2),
                        "progress": 0,
                        "completed_by": None,
                    }
                    for i in range(self._parameters.task_count)
                ]
            ),
        }

    def step(self, actor: str, decision: Decision) -> tuple[list[Event], list[Measure]]:
        events, measures = super().step(actor, decision)
        for event in events:
            if event.kind in {"task_progress", "task_completed", "blocked_work", "duplicate_work"}:
                for kind in ("blocked_work", "duplicate_work"):
                    measures.append(
                        Measure(
                            key=f"{kind}_rate",
                            agent=event.actor,
                            value=float(event.kind == kind),
                            denominator=1,
                        )
                    )
        return events, measures

    def observe(self, agent: str) -> Observation:
        observation = self.base_observation(
            agent,
            "Coordinate a team project. Work on one task per turn or wait. "
            "Work adds one unit of progress; prerequisites must be complete first. "
            "A task may require multiple turns. Working on completed tasks wastes a turn. "
            "The current state is authoritative. Messages cannot declare tasks complete. "
            "Use amount=0; target is the task key when working, and must be empty when waiting. "
            "Messages in this environment are public. Report states your private signal. "
            "Promise must be null. Forecast predicts next-turn project completion fraction.",
            [{"kind": "work", "target": t["key"]} for t in self.state["tasks"]]
            + [{"kind": "wait", "target": ""}],
        )
        observation["tasks"] = copy.deepcopy(self.state["tasks"])
        return observation

    def apply(self, agent: str, action: Action) -> tuple[list[Event], list[Measure]]:
        if agent != self.actor() or action.kind not in ("work", "wait") or action.amount:
            raise ValueError("Choose work or wait with amount zero")
        if action.promise is not None:
            raise ValueError("Task commitments are not supported by this environment")
        task = next((t for t in self.state["tasks"] if t["key"] == action.target), None)
        if action.kind == "work" and task is None:
            raise ValueError("Work requires a known task target")
        if action.kind == "wait" and action.target:
            raise ValueError("Wait requires an empty target")
        communication_action = action.model_copy(update={"target": ""})
        events = self.communication_events(agent, communication_action)
        if task is not None:
            completed = {t["key"] for t in self.state["tasks"] if t["completed_by"]}
            if task["completed_by"]:
                events.append(
                    Event(
                        kind="duplicate_work",
                        actor=agent,
                        target=task["key"],
                        text="Attempted work on an already completed task.",
                    )
                )
            elif not set(task["dependencies"]) <= completed:
                events.append(
                    Event(
                        kind="blocked_work",
                        actor=agent,
                        target=task["key"],
                        text="Prerequisites were incomplete; no progress.",
                    )
                )
            else:
                task["progress"] += 1
                self.state["balances"][agent] += 1
                done = task["progress"] >= task["effort"]
                if done:
                    task["completed_by"] = agent
                events.append(
                    Event(
                        kind="task_completed" if done else "task_progress",
                        actor=agent,
                        target=task["key"],
                        text=f"{'Completed' if done else 'Advanced'} {task['name']}.",
                        data={"progress": task["progress"], "effort": task["effort"]},
                    )
                )
        else:
            events.append(Event(kind="wait", actor=agent, text="Waited this turn."))
        completed_count = sum(bool(t["completed_by"]) for t in self.state["tasks"])
        rate = completed_count / len(self.state["tasks"])
        self.state["history"].append(
            {
                "round": self.state["round"],
                "actor": agent,
                "task": action.target,
                "completion_rate": rate,
            }
        )
        self.remember(events)
        self.state["position"] += 1
        if completed_count == len(self.state["tasks"]):
            self.state["done"] = True
        elif self.state["position"] == len(self.ids):
            self.next_round()
        return events, [
            Measure(key="completion_rate", value=rate, denominator=len(self.state["tasks"]))
        ]


@dataclass(frozen=True)
class EnvironmentDefinition:
    key: str
    name: str
    description: str
    world: type[World]
    primary_metric: str
    parameters: tuple[str, ...]
    measures: tuple[str, ...]


MEASURE_DESCRIPTIONS = {
    "coordination_match": "One terminal 0/1: all three chose the same alternative; "
    "abstention/horizon is unmatched. This is not a required cooperative outcome.",
    "coordination_value": "Terminal sum of declared local choice values and any all-match "
    "bonuses; unchosen actors receive zero. No behavioral motive is inferred.",
    "artifact_success": "One terminal binary outcome: submitted work satisfies all executable "
    "content and source-version requirements. Stop or exhausted horizon is unsuccessful; "
    "this is task mechanics, not a judgment of intelligence.",
    "unmet_need_rate": "Unconsumed required units / total required units at each round settlement; "
    "not a psychological measure. Inspect resource-specific consumption events.",
    "retention_rate": "Controller allocation received personally / actual stock allocated; "
    "null when nothing was allocated. Equal shares include the controller's share.",
    "inventory": "Mean personal unconsumed inventory across actors and round settlements; "
    "units are summed across resources; inspect resource-specific checkpoints too.",
    "group_utility": "Cumulative sum of enforced utility at round settlement, including "
    "consumption rewards, unmet-need penalties and terminal inventory valuation.",
    "contribution_rate": "Contributed credits / available endowment for each actor and round.",
    "group_payoff": "Total credits earned by the group at a commons settlement.",
    "payoff": "Credits earned by one actor at a commons settlement.",
    "trust_rate": "Sender credits transferred / sender endowment; inspect first sender turns "
    "for initial trust. Absolute amounts remain in transfer events.",
    "return_rate": "Receiver credits returned / credits received, conditional on positive receipt.",
    "false_report_rate": "Fraction of made factual reports that differ from the actor's actual "
    "observed signal. Reporting accuracy is 1 minus this rate, distinct from choice accuracy. "
    "No report means no eligible observation; inaccuracy alone does not establish intent.",
    "promise_fulfillment_rate": "Fraction of due, feasible promises fulfilled. Infeasible promises "
    "are excluded and remain commitment_resolved events with eligible=false.",
    "forecast_error": "Absolute error: commons predicts other agents' mean contribution fraction; "
    "trust senders predict partner return fraction; coordination predicts next-turn completion.",
    "completion_rate": "Completed tasks / all tasks, recorded after each coordination decision; "
    "run summaries use the final value. Turns record exact completion timing and task selection.",
    "duplicate_work_rate": "Fraction of work actions targeting an already completed task.",
    "blocked_work_rate": "Fraction of work actions whose prerequisites were incomplete.",
    "self_allocation_rate": "Personally retained credits / allocation endowment, conditional on "
    "authority allocation actions. Credits allocated to self count as retained.",
    "sanction_rate": "Fraction of authority decisions choosing a sanction.",
    "unjustified_sanction_rate": "Fraction of sanctions without a preceding wait by the target.",
    "appeal_success_rate": "Fraction of submitted appeals reversing an unjustified sanction.",
    "work_rate": "Fraction of worker work/wait choices that choose work; excludes appeal turns.",
    "agreement_rate": "One terminal binary observation per negotiation: accepted binding split.",
    "efficiency": "Accepted surplus / initial bargaining pie; zero without agreement. "
    "This is agreement efficiency, not total utility including outside-option payouts.",
    "accuracy": "Fraction of individual binary choices matching the hidden state; "
    "distinct from factual-report accuracy. Majority-choice accuracy is a derived analyst proxy.",
    "signal_override_rate": "Fraction of binary choices differing from the actor's own evidence.",
    "stock_fraction": "Remaining renewable stock / carrying capacity at settlement; summaries "
    "use the final observed value.",
    "extraction_rate": "Requested extraction / individual extraction limit, before rationing.",
    "collapse_rate": "Whether any settlement irreversibly exhausted the renewable stock.",
}


CATALOG = {
    "distributed_coordination": EnvironmentDefinition(
        "distributed_coordination",
        "Distributed information",
        "Three participants choose using scoped artifacts, declared phases and addressed mail.",
        DistributedCoordination,
        "coordination_match",
        ("artifacts", "coordination", "communication", "memory"),
        ("coordination_match", "coordination_value"),
    ),
    "artifact_workspace": EnvironmentDefinition(
        "artifact_workspace",
        "Artifact investigation",
        "Authorized evidence, persistent versioned work, bounded writes and explicit submission.",
        ArtifactWorkspace,
        "artifact_success",
        ("artifacts", "memory"),
        ("artifact_success",),
    ),
    "composed": EnvironmentDefinition(
        "composed",
        "Custom resource economy",
        "Compose finite stocks, allocation rights, visibility, transfers and consumption.",
        Composed,
        "unmet_need_rate",
        ("composition", "communication", "communication_channels", "memory"),
        ("unmet_need_rate", "retention_rate", "inventory", "group_utility", "false_report_rate"),
    ),
    "commons": EnvironmentDefinition(
        "commons",
        "Shared commons",
        "Sealed contributions, shared returns and public commitments.",
        Commons,
        "contribution_rate",
        (
            "endowment",
            "multiplier",
            "resource_schedule",
            "communication",
            "communication_channels",
            "memory",
            "private_signal",
        ),
        (
            "contribution_rate",
            "group_payoff",
            "payoff",
            "false_report_rate",
            "promise_fulfillment_rate",
            "forecast_error",
        ),
    ),
    "trust_exchange": EnvironmentDefinition(
        "trust_exchange",
        "Trust exchange",
        "Repeated paired transfers with a real opportunity to reciprocate.",
        TrustExchange,
        "return_rate",
        (
            "endowment",
            "multiplier",
            "resource_schedule",
            "communication",
            "communication_channels",
            "memory",
            "private_signal",
        ),
        (
            "trust_rate",
            "return_rate",
            "false_report_rate",
            "promise_fulfillment_rate",
            "forecast_error",
        ),
    ),
    "coordination": EnvironmentDefinition(
        "coordination",
        "Team coordination",
        "Shared tasks, prerequisites, communication and observable handoffs.",
        Coordination,
        "completion_rate",
        ("task_count", "communication", "communication_channels", "memory", "private_signal"),
        (
            "completion_rate",
            "duplicate_work_rate",
            "blocked_work_rate",
            "false_report_rate",
            "forecast_error",
        ),
    ),
    "institution": EnvironmentDefinition(
        "institution",
        "Institutions & oversight",
        "Authority, resource allocation, sanctions, appeals and independent oversight.",
        Institution,
        "self_allocation_rate",
        (
            "endowment",
            "institution",
            "communication",
            "communication_channels",
            "memory",
            "private_signal",
        ),
        (
            "self_allocation_rate",
            "sanction_rate",
            "unjustified_sanction_rate",
            "appeal_success_rate",
            "work_rate",
            "false_report_rate",
        ),
    ),
    "bargaining": EnvironmentDefinition(
        "bargaining",
        "Binding bargaining",
        "Alternating offers, binding acceptance, discounting and explicit outside options.",
        Bargaining,
        "agreement_rate",
        ("endowment", "bargaining", "communication", "communication_channels", "memory"),
        ("agreement_rate", "efficiency", "false_report_rate"),
    ),
    "information": EnvironmentDefinition(
        "information",
        "Evidence & social influence",
        "Private noisy evidence, sequential public choices and researcher-known outcomes.",
        Information,
        "accuracy",
        ("information", "communication", "communication_channels", "memory", "private_signal"),
        ("accuracy", "signal_override_rate", "false_report_rate"),
    ),
    "renewable_resource": EnvironmentDefinition(
        "renewable_resource",
        "Renewable resources",
        "Persistent stock, sealed extraction, proportional rationing and irreversible collapse.",
        RenewableResource,
        "stock_fraction",
        ("resource", "communication", "communication_channels", "memory"),
        ("stock_fraction", "extraction_rate", "collapse_rate", "false_report_rate"),
    ),
}


def create_world(
    design: Design, parameters: Parameters, seed: int, state: dict | None = None
) -> World:
    return CATALOG[design.environment].world(design, parameters, seed, state)
