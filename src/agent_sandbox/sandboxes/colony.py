"""Frontier Colony: all mechanics, randomness and visibility live here."""

import copy
import random
from typing import Literal

from pydantic import Field, field_validator

from ..config import ConfigModel
from ..sandbox import Event, SandboxSpec

FacilityId = Literal["habitat", "greenhouse", "reactor", "quarry", "workshop"]
FACILITIES = {
    "habitat": ("Habitat", 360, 115),
    "greenhouse": ("Greenhouse", 140, 245),
    "reactor": ("Reactor", 580, 245),
    "quarry": ("Quarry", 200, 430),
    "workshop": ("Workshop", 490, 430),
}
EDGES = [
    ("habitat", "greenhouse"),
    ("habitat", "reactor"),
    ("habitat", "workshop"),
    ("greenhouse", "quarry"),
    ("reactor", "workshop"),
    ("quarry", "workshop"),
]
RULES = (
    "One action per turn, six turns per cycle. Move only along a connection (3 stamina). "
    "Work costs 12 stamina; greenhouse makes food, reactor energy, quarry materials. "
    "Greenhouse/quarry use 1 energy; workshop converts 2 energy into 3 materials. "
    "Habitat has no work. Repair costs 3 materials and 8 stamina, restores 20 integrity. "
    "Build upgrades your current facility (max level 3), costs 8 + 4*current level materials, "
    "2 energy and 15 stamina. Rest restores 35 stamina at habitat, 25 elsewhere. "
    "Damaged facilities below 30 integrity produce half; zero integrity prevents work. "
    "Each cycle consumes food and energy; shortages harm all settlers. Storms damage facilities. "
    "You see public infrastructure and resources, local settlers, and your private radio inbox. "
    "Attach an optional radio message to any action. Recipient 'all' broadcasts. "
    "Invalid actions spend a turn but cannot change resources."
)


class Parameters(ConfigModel):
    food: int = Field(default=60, ge=0, le=10000)
    energy: int = Field(default=45, ge=0, le=10000)
    materials: int = Field(default=30, ge=0, le=10000)
    initial_integrity: int = Field(default=90, ge=0, le=100)
    food_per_cycle: int = Field(default=6, ge=0, le=100)
    energy_per_cycle: int = Field(default=4, ge=0, le=100)
    storm_chance: float = Field(default=0.3, ge=0, le=1)


class Action(ConfigModel):
    kind: Literal["move", "work", "rest", "repair", "build"]
    target: FacilityId | None = None
    message: str = Field(default="", max_length=240)
    recipient: str = Field(default="all", max_length=32)

    @field_validator("message", mode="before")
    @classmethod
    def bound_message(cls, value):
        # Radio is optional prose; always enforce its transmission limit locally.
        return value[:240] if isinstance(value, str) else value


def _tuples(value):
    return tuple(_tuples(item) for item in value) if isinstance(value, list) else value


class Colony:
    action_type = Action

    def initialize(self, parameters: dict, agent_ids: list[str], seed: int) -> None:
        if len(agent_ids) != 6:
            raise ValueError("Frontier Colony requires exactly six settlers")
        self.parameters = Parameters.model_validate(parameters)
        self.rng = random.Random(seed)
        self.turn = 0
        self.resources = {
            key: getattr(self.parameters, key) for key in ("food", "energy", "materials")
        }
        self.facilities = {
            key: {"integrity": self.parameters.initial_integrity, "level": 0} for key in FACILITIES
        }
        starts = ["habitat", "greenhouse", "reactor", "quarry", "workshop", "habitat"]
        self.settlers = {
            key: {"location": starts[i], "stamina": 80, "health": 100, "inbox": []}
            for i, key in enumerate(agent_ids)
        }
        self.order = agent_ids.copy()

    def next_agent(self) -> str | None:
        for offset in range(len(self.order)):
            agent = self.order[(self.turn + offset) % len(self.order)]
            if self.settlers[agent]["health"] > 0:
                return agent
        return None

    def observe(self, agent_id: str) -> dict:
        me = self.settlers[agent_id]
        return {
            "rules": RULES,
            "turn": self.turn,
            "self": {"id": agent_id, **copy.deepcopy(me)},
            "resources": self.resources.copy(),
            "facilities": copy.deepcopy(self.facilities),
            "connections": EDGES,
            "local_settlers": {
                key: {k: v for k, v in value.items() if k != "inbox"}
                for key, value in self.settlers.items()
                if value["location"] == me["location"] and key != agent_id
            },
        }

    def step(self, agent_id: str, action: Action) -> list[Event]:
        if agent_id != self.next_agent():
            raise ValueError("Only the selected settler can act")
        action = Action.model_validate(action)
        me = self.settlers[agent_id]
        place = me["location"]
        facility = self.facilities[place]
        events: list[Event] = []

        def event(kind: str, text: str):
            events.append(Event(kind=kind, text=text, agent=agent_id))

        def apply() -> str:
            if action.kind != "move" and action.target not in (None, place):
                return "Action target must be your current facility"
            if action.kind == "move":
                if not any({place, action.target} == set(edge) for edge in EDGES):
                    return "Destination must be directly connected"
                if me["stamina"] < 3:
                    return "Need 3 stamina to move"
                me["location"] = action.target
                me["stamina"] -= 3
                event("move", f"{agent_id} moved to {action.target}.")
            elif action.kind == "rest":
                me["stamina"] = min(100, me["stamina"] + (35 if place == "habitat" else 25))
                event("rest", f"{agent_id} rested at {place}.")
            elif action.kind == "work":
                resource = {"greenhouse": "food", "reactor": "energy", "quarry": "materials"}
                if place == "habitat":
                    return "There is no production work at the habitat"
                if me["stamina"] < 12 or facility["integrity"] == 0:
                    return "Need 12 stamina and an operational facility"
                energy_cost = 0 if place == "reactor" else (2 if place == "workshop" else 1)
                if self.resources["energy"] < energy_cost:
                    return "Insufficient energy to work"
                amount = (
                    3 if place == "workshop" else 4 + facility["level"] * 2 + self.rng.randrange(3)
                )
                if facility["integrity"] < 30:
                    amount = max(1, amount // 2)
                key = resource.get(place, "materials")
                self.resources["energy"] -= energy_cost
                self.resources[key] += amount
                me["stamina"] -= 12
                facility["integrity"] = max(0, facility["integrity"] - 2)
                event("work", f"{agent_id} produced {amount} {key} at {place}.")
            elif action.kind == "repair":
                if facility["integrity"] == 100:
                    return "Facility already has full integrity"
                if me["stamina"] < 8 or self.resources["materials"] < 3:
                    return "Repair needs 8 stamina and 3 materials"
                self.resources["materials"] -= 3
                me["stamina"] -= 8
                facility["integrity"] = min(100, facility["integrity"] + 20)
                event("repair", f"{agent_id} repaired {place} to {facility['integrity']}%.")
            elif action.kind == "build":
                cost = 8 + 4 * facility["level"]
                if facility["level"] >= 3:
                    return "Facility is already at maximum level"
                if (
                    me["stamina"] < 15
                    or self.resources["materials"] < cost
                    or self.resources["energy"] < 2
                ):
                    return f"Build needs 15 stamina, {cost} materials and 2 energy"
                self.resources["materials"] -= cost
                self.resources["energy"] -= 2
                me["stamina"] -= 15
                facility["level"] += 1
                event("build", f"{agent_id} upgraded {place} to level {facility['level']}.")
            return ""

        rejected = apply()
        if rejected:
            event("rejected", f"{agent_id}: {rejected}.")
        if action.message:
            recipients = list(self.settlers) if action.recipient == "all" else [action.recipient]
            if all(key in self.settlers for key in recipients):
                message = {"turn": self.turn + 1, "from": agent_id, "text": action.message}
                for key in recipients:
                    if key != agent_id:
                        inbox = self.settlers[key]["inbox"]
                        inbox.append(message.copy())
                        del inbox[:-12]
                event("radio", f"{agent_id} → {action.recipient}: {action.message}")
            else:
                event("rejected", f"Unknown radio recipient: {action.recipient}.")
        self.turn += 1
        if self.turn % 6 == 0:
            shortage = False
            for resource in ("food", "energy"):
                needed = getattr(self.parameters, f"{resource}_per_cycle")
                shortage |= self.resources[resource] < needed
                self.resources[resource] = max(0, self.resources[resource] - needed)
            for settler in self.settlers.values():
                if settler["health"] > 0:
                    settler["health"] = max(
                        0, min(100, settler["health"] + (-8 if shortage else 2))
                    )
            events.append(
                Event(
                    kind="shortage" if shortage else "cycle",
                    text=(
                        "Supply shortage: settlers lost 8 health."
                        if shortage
                        else "Cycle complete. Supplies consumed."
                    ),
                )
            )
            if self.rng.random() < self.parameters.storm_chance:
                key = self.rng.choice(list(self.facilities))
                damage = self.rng.randint(8, 22)
                self.facilities[key]["integrity"] = max(
                    0, self.facilities[key]["integrity"] - damage
                )
                events.append(Event(kind="storm", text=f"Dust storm damaged {key} by {damage}%."))
        return events

    def metrics(self) -> dict[str, float]:
        return {
            **{k: float(v) for k, v in self.resources.items()},
            "alive": float(sum(s["health"] > 0 for s in self.settlers.values())),
            "mean_health": sum(s["health"] for s in self.settlers.values()) / 6,
            "mean_integrity": sum(f["integrity"] for f in self.facilities.values()) / 5,
            "upgrades": float(sum(f["level"] for f in self.facilities.values())),
        }

    def snapshot(self) -> dict:
        return copy.deepcopy(
            {
                "version": 1,
                "parameters": self.parameters.model_dump(),
                "turn": self.turn,
                "resources": self.resources,
                "facilities": self.facilities,
                "settlers": self.settlers,
                "order": self.order,
                "rng": self.rng.getstate(),
            }
        )

    def restore(self, snapshot: dict) -> None:
        data = copy.deepcopy(snapshot)
        if data["version"] != 1:
            raise ValueError("Unsupported colony snapshot version")
        self.parameters = Parameters.model_validate(data["parameters"])
        for key in ("turn", "resources", "facilities", "settlers", "order"):
            setattr(self, key, data[key])
        self.rng = random.Random()
        self.rng.setstate(_tuples(data["rng"]))


def panel(snapshot: dict, select):
    from .colony_panel import render

    render(snapshot, select)


SPEC = SandboxSpec(parameters=Parameters, create=Colony, panel=panel)
