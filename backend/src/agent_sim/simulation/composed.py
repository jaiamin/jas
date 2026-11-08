"""A bounded resource economy composed from typed, deterministic primitives."""

from ..domain import Action, CompositionRules, Event, Measure
from .checkpoints import ComposedCheckpoint, Observation
from .mechanisms import Mechanism, legal


class Composed(Mechanism[ComposedCheckpoint]):
    version = "1.0.0"

    @property
    def composition(self) -> CompositionRules:
        rules = self.parameters.composition
        if rules is None:
            raise ValueError("Composed environments require explicit mechanics")
        return rules

    def initial_state(self) -> ComposedCheckpoint:
        resources = self.composition.resources
        return {
            **self.common_state(),
            "stocks": {r.key: float(r.initial_stock) for r in resources},
            "inventories": {r.key: dict.fromkeys(self.ids, 0.0) for r in resources},
            "consumed": {r.key: dict.fromkeys(self.ids, 0.0) for r in resources},
            "unmet": {r.key: dict.fromkeys(self.ids, 0.0) for r in resources},
        }

    def order(self) -> list[str]:
        order = super().order()
        if self.composition.controllers_first:
            controllers = {key for r in self.composition.resources for key in r.controllers}
            order.sort(key=lambda key: key not in controllers)
        return order

    def observe(self, agent: str) -> Observation:
        options = []
        resources = []
        for r in self.composition.resources:
            manages = agent in r.controllers
            inventory = self.state["inventories"][r.key]
            if manages:
                options.append(
                    legal(
                        "allocate",
                        r.action_limit,
                        [f"{r.key}:*", *(f"{r.key}:{key}" for key in self.ids)],
                    )
                )
            elif not r.controllers:
                options.append(legal("extract", r.action_limit, [r.key]))
            if r.transfers:
                options.append(
                    legal(
                        "send",
                        min(r.action_limit, int(inventory[agent])),
                        [f"{r.key}:{key}" for key in self.ids if key != agent],
                    )
                )
            resources.append(
                {
                    "key": r.key,
                    "name": r.name,
                    "capacity": r.capacity,
                    "stock": self.state["stocks"][r.key]
                    if r.stock_visibility == "public" or manages
                    else None,
                    "stock_visibility": r.stock_visibility,
                    "allocation_visibility": r.allocation_visibility,
                    "controllers": r.controllers.copy(),
                    "action_limit": r.action_limit,
                    "replenishment": r.replenishment,
                    "need_per_round": r.need,
                    "consumption_value": r.consumption_value,
                    "shortfall_penalty": r.shortfall_penalty,
                    "terminal_value": r.terminal_value,
                    "your_inventory": inventory[agent],
                    "inventories": inventory.copy()
                    if r.allocation_visibility == "public"
                    else {agent: inventory[agent]},
                    "your_consumed": self.state["consumed"][r.key][agent],
                    "your_unmet": self.state["unmet"][r.key][agent],
                    "transfers": r.transfers,
                }
            )
        options.append(legal("wait"))
        observation = self.base_observation(
            agent,
            "A finite resource economy. Each participant takes ONE action per round across all "
            "resources. The announced controller-first rule is "
            f"{self.composition.controllers_first}; order is seeded within priority groups. "
            "Controllers allocate shared stock to a participant (including themselves) or to "
            "everyone equally. For everyone, amount is the TOTAL request, divided equally, "
            "not an amount per recipient. With no controllers, each participant can extract. "
            "Requests exceeding remaining stock receive only the available amount. Legal "
            "request limits do not reveal hidden stock. Send transfers integer units of your "
            "inventory to another participant. Target uses resource:participant or "
            "resource:* for allocation; extract uses the resource key; wait uses empty. "
            "At round end, each participant automatically consumes up to their need from their "
            "own inventory, earning consumption_value per unit and losing shortfall_penalty "
            "per unmet unit. Remaining personal inventory persists. Shared stock receives "
            "replenishment up to capacity before the next round; no replenishment at run end. "
            "Terminal personal inventory earns terminal_value per unit. Balances are utility, "
            "not spendable resources. Stock visibility and allocation visibility are separate "
            "rules listed for each resource; null stock is hidden, not empty. Public allocation "
            "visibility also reveals current personal inventories. Otherwise only parties learn "
            "a transfer; everyone still sees their own inventory and consumption. Knowledge of "
            "the configured initial stock is not supplied when stock is hidden. Messages are "
            "public and unverified. Reports concern only the incidental synthetic private signal, "
            "not resource stock; promise and forecast must be null.",
            options,
        )
        observation["resources"] = resources
        return observation

    def communication_events(self, agent: str, action: Action) -> list[Event]:
        return super().communication_events(agent, action.model_copy(update={"target": ""}))

    def apply(self, agent: str, action: Action) -> tuple[list[Event], list[Measure]]:
        self.validate(agent, action)
        events = self.public_communication_events(agent, action)
        measures = []
        if action.kind != "wait":
            resource_key, _, target = action.target.partition(":")
            r = next(r for r in self.composition.resources if r.key == resource_key)
            inventory = self.state["inventories"][r.key]
            if action.kind == "send":
                actual = float(action.amount)
                inventory[agent] -= actual
                recipients = [target]
            else:
                actual = min(float(action.amount), self.state["stocks"][r.key])
                self.state["stocks"][r.key] -= actual
                recipients = self.ids if target == "*" else [target or agent]
            for recipient in recipients:
                amount = actual / len(recipients)
                inventory[recipient] += amount
                events.append(
                    Event(
                        kind="resource_transfer",
                        actor=agent,
                        target=recipient,
                        visibility="public" if r.allocation_visibility == "public" else "private",
                        text=f"{r.name}: {amount:g} units received by {recipient} from {agent}.",
                        data={"resource": r.key, "amount": amount, "source": action.kind},
                    )
                )
            events.append(
                Event(
                    kind="resource_request",
                    actor=agent,
                    visibility="researcher",
                    text="Resource request settled.",
                    data={
                        "resource": r.key,
                        "requested": action.amount,
                        "actual": actual,
                        "recipients": recipients,
                    },
                )
            )
            if action.kind == "allocate":
                own = actual / len(recipients) if agent in recipients else 0
                measures.append(
                    Measure(
                        key="retention_rate",
                        agent=agent,
                        value=own / actual if actual else None,
                        denominator=actual,
                    )
                )
        if self.state["position"] == len(self.ids) - 1:
            for r in self.composition.resources:
                inventory = self.state["inventories"][r.key]
                for key in self.ids:
                    consumed = min(float(r.need), inventory[key])
                    unmet = max(0.0, r.need - consumed)
                    inventory[key] = max(0.0, inventory[key] - consumed)
                    self.state["consumed"][r.key][key] += consumed
                    self.state["unmet"][r.key][key] += unmet
                    utility = consumed * r.consumption_value - unmet * r.shortfall_penalty
                    if self.state["round"] == self.design.rounds:
                        utility += inventory[key] * r.terminal_value
                    self.state["balances"][key] += utility
                    events.append(
                        Event(
                            kind="consumption",
                            actor=key,
                            visibility="private",
                            text=f"{r.name}: consumed {consumed:g}; unmet need {unmet:g}.",
                            data={
                                "resource": r.key,
                                "consumed": consumed,
                                "unmet": unmet,
                                "inventory": inventory[key],
                                "utility": utility,
                            },
                        )
                    )
                if self.state["round"] < self.design.rounds:
                    self.state["stocks"][r.key] = min(
                        float(r.capacity), self.state["stocks"][r.key] + r.replenishment
                    )
            total_need = sum(r.need for r in self.composition.resources) * len(self.ids)
            unmet_round = sum(float(e.data["unmet"]) for e in events if e.kind == "consumption")
            measures.append(
                Measure(
                    key="unmet_need_rate",
                    value=unmet_round / total_need if total_need else None,
                    denominator=total_need,
                )
            )
            for key in self.ids:
                measures.append(
                    Measure(
                        key="inventory",
                        agent=key,
                        value=sum(
                            self.state["inventories"][r.key][key]
                            for r in self.composition.resources
                        ),
                    )
                )
            measures.append(
                Measure(key="group_utility", value=sum(self.state["balances"].values()))
            )
        return self.finish(events, measures)
