import copy
from dataclasses import dataclass

from .domain import Action, Design, Event, Measure, Parameters
from .mechanisms import Bargaining, Information, Institution, RenewableResource
from .world import RULE_VERSION as RULE_VERSION
from .world import World


class Commons(World):
    def observe(self, agent: str) -> dict:
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
        self.communication(agent, action)
        self.state["pending"][agent] = action.model_dump()
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
            events += self.communication(key, chosen)
            if chosen.promise is not None and self.state["round"] < self.design.rounds:
                promise = {"amount": chosen.promise, "due_round": self.state["round"] + 1}
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


class TrustExchange(World):
    def partners(self) -> tuple[str, str]:
        order = self.order()
        position = self.state["position"]
        pair = position // 2 * 2
        return order[pair], order[pair + 1]

    def observe(self, agent: str) -> dict:
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
            "Report states your private signal; forecast predicts the partner's transfer fraction. "
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
        events = self.communication(agent, action)
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


class Coordination(World):
    def __init__(
        self, design: Design, parameters: Parameters, seed: int, state: dict | None = None
    ):
        super().__init__(design, parameters, seed, state)
        if state is None:
            self.state["tasks"] = (
                [
                    {**task.model_dump(), "progress": 0, "completed_by": None}
                    for task in design.tasks
                ]
                if design.tasks
                else [
                    {
                        "key": f"task-{i + 1}",
                        "name": f"Work package {i + 1}",
                        "dependencies": [f"task-{i}"] if i > 0 and i % 3 else [],
                        "effort": 2 + (i % 2),
                        "progress": 0,
                        "completed_by": None,
                    }
                    for i in range(parameters.task_count)
                ]
            )

    def observe(self, agent: str) -> dict:
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
        events = self.communication(agent, communication_action)
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
class Adapter:
    key: str
    name: str
    description: str
    world: type[World]
    primary_metric: str
    parameters: tuple[str, ...]
    measures: tuple[str, ...]


CATALOG = {
    "commons": Adapter(
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
    "trust_exchange": Adapter(
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
    "coordination": Adapter(
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
    "institution": Adapter(
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
    "bargaining": Adapter(
        "bargaining",
        "Binding bargaining",
        "Alternating offers, binding acceptance, discounting and explicit outside options.",
        Bargaining,
        "agreement_rate",
        ("endowment", "bargaining", "communication", "communication_channels", "memory"),
        ("agreement_rate", "efficiency", "false_report_rate"),
    ),
    "information": Adapter(
        "information",
        "Evidence & social influence",
        "Private noisy evidence, sequential public choices and researcher-known outcomes.",
        Information,
        "accuracy",
        ("information", "communication", "communication_channels", "memory", "private_signal"),
        ("accuracy", "signal_override_rate", "false_report_rate"),
    ),
    "renewable_resource": Adapter(
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
