"""Local provider configuration. Credentials never enter experiment evidence."""

import os
import re
from pathlib import Path
from tempfile import NamedTemporaryFile
from threading import RLock
from typing import Annotated, Literal
from urllib.parse import urlsplit

from pydantic import Field, field_validator, model_validator

from .config import gallery_origin
from .domain import ModelId, Strict

PRICES: dict[str, tuple[float, float]] = {
    "openai:gpt-6-luna": (0.10, 0.50),
    "openai:gpt-6.1-sol": (2.0, 10.0),
    "openai:gpt-6.1-terra": (1.0, 5.0),
    "anthropic:claude-haiku-4-5": (1.0, 5.0),
}
ProviderId = Annotated[str, Field(pattern=r"^[a-z][a-z0-9_-]{0,31}$")]


class ProviderConfiguration(Strict):
    kind: Literal["openai", "anthropic", "openrouter", "compatible"]
    base_url: str = Field(min_length=1, max_length=2048)
    api_key: str | None = Field(default=None, max_length=4096, repr=False)

    @field_validator("base_url")
    @classmethod
    def endpoint(cls, value: str) -> str:
        parsed = urlsplit(value)
        if (
            parsed.scheme not in {"http", "https"}
            or not parsed.hostname
            or parsed.username is not None
            or parsed.password is not None
            or parsed.query
            or parsed.fragment
        ):
            raise ValueError("Use an HTTP(S) base URL without credentials, query or fragment")
        if parsed.scheme == "http" and parsed.hostname not in {"localhost", "127.0.0.1", "::1"}:
            raise ValueError("Remote providers require HTTPS; HTTP is available for localhost")
        return value.rstrip("/")


class ModelConfiguration(Strict):
    id: ModelId
    input_per_million: float | None = Field(default=None, ge=0, le=10000)
    output_per_million: float | None = Field(default=None, ge=0, le=10000)

    @model_validator(mode="after")
    def both_prices(self):
        if (self.input_per_million is None) != (self.output_per_million is None):
            raise ValueError("Supply both prices or leave both unknown")
        return self


class WorkspacePreferences(Strict):
    token_budget: int | None = Field(default=None, ge=1, le=10**12)
    developer: bool = False
    planner_web_research: bool = False
    default_visibility: Literal["public", "unlisted"] = "unlisted"
    planner_model: ModelId | None = None
    assistant_model: ModelId | None = None
    gallery_url: str | None = Field(default=None, max_length=2048)

    @field_validator("gallery_url")
    @classmethod
    def valid_gallery(cls, value: str | None) -> str | None:
        if not value:
            return None
        return gallery_origin(value)


class LocalConfiguration(Strict):
    version: Literal[1] = 1
    workspace_budget_usd: float | None = Field(default=None, ge=0, le=10000)
    providers: dict[ProviderId, ProviderConfiguration] = Field(default_factory=dict)
    models: dict[str, ModelConfiguration] = Field(default_factory=dict)
    preferences: WorkspacePreferences = Field(default_factory=WorkspacePreferences)


class ModelRegistry:
    def __init__(self, database: str | None):
        self.path = (
            Path(database).resolve().with_suffix(".settings.json")
            if database and database != ":memory:"
            else None
        )
        self.lock = RLock()
        self.configuration = (
            LocalConfiguration.model_validate_json(self.path.read_text())
            if self.path and self.path.exists()
            else LocalConfiguration()
        )

    def save(self, configuration: LocalConfiguration) -> None:
        with self.lock:
            if self.path:
                self.path.parent.mkdir(parents=True, exist_ok=True)
                temporary = None
                try:
                    with NamedTemporaryFile(mode="w", dir=self.path.parent, delete=False) as file:
                        temporary = Path(file.name)
                        os.chmod(temporary, 0o600)
                        file.write(configuration.model_dump_json(indent=2))
                        file.flush()
                        os.fsync(file.fileno())
                    temporary.replace(self.path)
                finally:
                    if temporary and temporary.exists():
                        temporary.unlink()
            self.configuration = configuration

    def provider(self, name: str) -> ProviderConfiguration:
        if name in self.configuration.providers:
            return self.configuration.providers[name].model_copy(deep=True)
        defaults: dict[
            str, tuple[Literal["openai", "anthropic", "openrouter", "compatible"], str]
        ] = {
            "openai": ("openai", "https://api.openai.com/v1"),
            "anthropic": ("anthropic", "https://api.anthropic.com"),
            "openrouter": ("openrouter", "https://openrouter.ai/api/v1"),
        }
        if name not in defaults:
            raise ValueError(f"Configure provider {name} in Settings before running")
        kind, endpoint = defaults[name]
        return ProviderConfiguration(
            kind=kind,
            base_url=os.getenv(f"{name.upper()}_BASE_URL", endpoint),
            api_key=os.getenv(f"{name.upper()}_API_KEY") or None,
        )

    def availability(self) -> dict[str, bool]:
        return {
            name: bool((p := self.provider(name)).api_key) or p.kind == "compatible"
            for name in dict.fromkeys(
                ["openai", "anthropic", "openrouter", *self.configuration.providers]
            )
        }

    def public_providers(self) -> list[dict]:
        return [
            {"id": name, **self.provider(name).model_dump(exclude={"api_key"}), "configured": ready}
            for name, ready in self.availability().items()
        ]

    def price(self, name: str) -> tuple[float, float] | None:
        if saved := self.configuration.models.get(name):
            if saved.input_per_million is None or saved.output_per_million is None:
                return None
            return saved.input_per_million, saved.output_per_million
        return PRICES.get(name)

    def catalog(self) -> list[dict]:
        return [
            {
                "id": name,
                "input_per_million": price[0] if price else None,
                "output_per_million": price[1] if price else None,
            }
            for name in dict.fromkeys([*PRICES, *self.configuration.models])
            for price in [self.price(name)]
        ]

    def set_provider(self, name: str, provider: ProviderConfiguration) -> None:
        if not re.fullmatch(r"[a-z][a-z0-9_-]{0,31}", name):
            raise ValueError(
                "Provider ID must use lowercase letters, numbers, underscores or hyphens"
            )
        configuration = self.configuration.model_copy(deep=True)
        if provider.api_key is None:
            previous = configuration.providers.get(name)
            provider = provider.model_copy(
                update={"api_key": previous.api_key if previous else None}
            )
        configuration.providers[name] = provider
        self.save(configuration)

    def set_model(self, model: ModelConfiguration) -> None:
        configuration = self.configuration.model_copy(deep=True)
        configuration.models[model.id] = model
        self.save(configuration)
