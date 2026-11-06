"""Strict, portable configuration. No secrets belong in these files."""

from pathlib import Path
from typing import Annotated, Literal, Self

import yaml
from pydantic import BaseModel, ConfigDict, Field, model_validator


class ConfigModel(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


ModelName = Annotated[str, Field(pattern=r"^(openai|anthropic):[a-zA-Z0-9._-]+$")]


class Limits(ConfigModel):
    max_model_calls: int = Field(default=120, ge=1, le=100_000)
    max_input_tokens: int = Field(default=12_000, ge=256, le=200_000)
    max_output_tokens: int = Field(default=600, ge=64, le=16_000)
    max_total_tokens: int | None = Field(default=None, ge=1)
    timeout_seconds: float = Field(default=30, gt=0, le=300)


class AgentProfile(ConfigModel):
    id: str = Field(pattern=r"^[a-z][a-z0-9_-]{0,31}$")
    name: str = Field(min_length=1, max_length=60)
    goal: str = Field(min_length=1, max_length=1000)
    model: str


class Scenario(ConfigModel):
    version: Literal[1] = 1
    sandbox: str
    name: str = Field(min_length=1, max_length=100)
    description: str = ""
    seed: int = Field(default=7, ge=0, le=2**32 - 1)
    max_steps: int = Field(default=120, ge=1, le=100_000)
    parameters: dict = Field(default_factory=dict)
    agents: list[AgentProfile] = Field(min_length=1)
    models: dict[str, ModelName] = Field(default_factory=dict)
    limits: Limits = Field(default_factory=Limits)

    @model_validator(mode="after")
    def valid_profiles(self) -> Self:
        ids = [a.id for a in self.agents]
        if len(ids) != len(set(ids)):
            raise ValueError("Agent ids must be unique")
        for agent in self.agents:
            if agent.model not in self.models:
                raise ValueError(f"Agent {agent.id} references an unknown model alias")
        return self


class ProfileOverride(ConfigModel):
    goal: str | None = Field(default=None, min_length=1, max_length=1000)
    model: str | None = None


class Condition(ConfigModel):
    name: str = Field(min_length=1, max_length=80)
    model: str | None = None
    parameters: dict = Field(default_factory=dict)
    profiles: dict[str, ProfileOverride] = Field(default_factory=dict)
    limits: Limits | None = None


class Experiment(ConfigModel):
    version: Literal[1] = 1
    name: str
    scenario: Path
    models: dict[str, ModelName] = Field(default_factory=dict)
    conditions: list[Condition] = Field(min_length=1)
    seeds: list[int] = Field(min_length=1)
    repetitions: int = Field(default=1, ge=1, le=100)
    max_steps: int | None = Field(default=None, ge=1, le=100_000)
    metrics: list[str] = Field(min_length=1)
    max_model_calls: int = Field(ge=1)

    @model_validator(mode="after")
    def valid_matrix(self) -> Self:
        names = [c.name for c in self.conditions]
        if len(names) != len(set(names)) or len(self.seeds) != len(set(self.seeds)):
            raise ValueError("Condition names and seeds must be unique")
        if any(not 0 <= seed <= 2**32 - 1 for seed in self.seeds):
            raise ValueError("Seeds must be unsigned 32-bit integers")
        if len(set(self.metrics)) != len(self.metrics):
            raise ValueError("Metrics must be unique")
        return self


def read_yaml(path: str | Path) -> dict:
    with Path(path).open(encoding="utf-8") as file:
        data = yaml.safe_load(file)
    if not isinstance(data, dict):
        raise ValueError(f"{path}: expected a YAML mapping")
    return data


def validate_scenario(data: dict) -> Scenario:
    from .sandboxes import get_sandbox

    scenario = Scenario.model_validate(data)
    spec = get_sandbox(scenario.sandbox)
    parameters = spec.parameters.model_validate(scenario.parameters)
    scenario.parameters = parameters.model_dump(mode="json")
    return scenario


def load_scenario(path: str | Path) -> Scenario:
    return validate_scenario(read_yaml(path))
