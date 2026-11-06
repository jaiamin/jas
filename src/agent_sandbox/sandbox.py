"""The complete environment contract; no runner, database or UI dependencies."""

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any, Generic, Protocol, TypeVar

from pydantic import BaseModel, Field, ValidationInfo, field_validator

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
    memory: str = Field(
        default="", max_length=800, description="Private note, at most 800 characters"
    )
    rationale: str = Field(
        default="", max_length=400, description="One short sentence, at most 400 characters"
    )

    @field_validator("memory", "rationale", mode="before")
    @classmethod
    def bound_notes(cls, value: Any, info: ValidationInfo) -> Any:
        # Verbosity must not discard a valid action or spend another model request.
        # Preserve non-string values so ordinary type validation still rejects them.
        if isinstance(value, str):
            return value[:800 if info.field_name == "memory" else 400]
        return value


@dataclass(frozen=True)
class SandboxSpec:
    parameters: type[BaseModel]
    create: Callable[[], Sandbox]
    # Optional NiceGUI renderer. It receives a snapshot and selection callback,
    # returns nothing, and is never imported by the headless runner.
    panel: Callable[[dict, Callable[[str], None]], Any] | None = None
