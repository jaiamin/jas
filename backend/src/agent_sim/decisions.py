from dataclasses import dataclass
from enum import StrEnum
from functools import lru_cache, reduce
from operator import or_
from typing import Annotated, Any, Literal

from pydantic import Field, create_model

from .domain import Action, Decision


@dataclass(frozen=True)
class ActionOption:
    kind: str
    minimum: int
    maximum: int
    targets: tuple[str, ...]


@lru_cache(maxsize=256)
def decision_schema(
    environment: str,
    communication: bool,
    options: tuple[ActionOption, ...],
    channels: tuple[str, ...] = ("messages", "reports", "promises"),
) -> type[Decision]:
    variants = []
    legacy = environment in {"commons", "trust_exchange", "coordination"}
    for index, option in enumerate(options):
        fields: dict[str, Any] = {
            "kind": (StrEnum(f"Kind{index}", {option.kind: option.kind}), ...),
            "amount": (Annotated[int, Field(ge=option.minimum, le=option.maximum)], ...),
            "target": (
                StrEnum(f"Target{index}", {f"t{i}": t for i, t in enumerate(option.targets)}),
                ...,
            ),
        }
        if environment == "commons":
            fields["promise"] = (Annotated[int, Field(ge=0, le=option.maximum)] | None, ...)
        elif environment != "trust_exchange":
            fields["promise"] = (type(None), ...)
        if environment == "information":
            fields["report"] = (Annotated[int, Field(ge=0, le=1)] | None, ...)
        if not communication or "messages" not in channels:
            fields["message"] = (Literal[""], ...)
        if not communication or "reports" not in channels:
            fields["report"] = (type(None), ...)
        if not communication or "promises" not in channels:
            fields["promise"] = (type(None), ...)
        variants.append(create_model(f"LegalAction{index}", __base__=Action, **fields))
    if not variants:
        raise ValueError("A decision requires at least one legal action")
    fields = {} if legacy else {"forecast": (type(None), ...)}
    return create_model(
        "TurnDecision", __base__=Decision, action=(reduce(or_, variants), ...), **fields
    )
