"""The complete environment contract; no runner, database or UI dependencies."""

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any, Generic, Protocol, TypeVar

from pydantic import BaseModel, Field

from .config import ConfigModel


class Event(ConfigModel):
    kind: str
    text: str
    agent: str | None = None


class Sandbox(Protocol):
    action_type: type[BaseModel]

    def initialize(self, parameters: dict, agent_ids: list[str], seed: int) -> None: ...
    def observe(self, agent_id: str) -> dict: ...
    def next_agent(self) -> str | None: ...
    def step(self, agent_id: str, action: BaseModel) -> list[Event]: ...
    def metrics(self) -> dict[str, float]: ...
    def snapshot(self) -> dict: ...
    def restore(self, snapshot: dict) -> None: ...


Action = TypeVar("Action", bound=BaseModel)


class Decision(ConfigModel, Generic[Action]):
    action: Action
    memory: str = Field(default="", max_length=800)
    rationale: str = Field(default="", max_length=400)


@dataclass(frozen=True)
class SandboxSpec:
    parameters: type[BaseModel]
    create: Callable[[], Sandbox]
    # Optional NiceGUI renderer. It receives a snapshot and selection callback,
    # returns nothing, and is never imported by the headless runner.
    panel: Callable[[dict, Callable[[str], None]], Any] | None = None
