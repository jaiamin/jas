"""Actor capability policies consume authorized data, never researcher state or providers."""

import hashlib
import json
from collections.abc import Mapping
from dataclasses import dataclass, field
from typing import Any, Literal

from pydantic import Field

from .domain import Decision, Strict


class PlanRequest(Strict):
    text: str = Field(min_length=1, max_length=2000)
    source_ids: list[str] = Field(default_factory=list, max_length=16)


class RetrievalRequest(Strict):
    query: str = Field(default="", max_length=200)
    source_ids: list[str] = Field(default_factory=list, max_length=16)
    limit: int = Field(default=8, ge=1, le=16)
    cutoff_turn: int | None = Field(default=None, ge=0)


class InvestigationRequest(Strict):
    facet: Literal["state", "rules", "legal_options"]


class EvidenceQuote(Strict):
    source_id: str = Field(max_length=200)
    quote: str = Field(min_length=1, max_length=500)


class VerificationRequest(Strict):
    proposed: Decision
    checks: list[EvidenceQuote] = Field(default_factory=list, max_length=8)


@dataclass
class ActorContext:
    activation_id: str
    turn: int
    round: int
    observation: Mapping[str, Any] = field(default_factory=dict)
    retained: list[dict] = field(default_factory=list)
    decision_type: type[Decision] | None = None
    max_memory_items: int = 8
    current_artifacts: list[dict] = field(default_factory=list)

    @property
    def cutoff(self) -> dict:
        return {"turn": self.turn, "round": self.round}

    def source(self, name: str, content: object, index: int | None = None) -> dict:
        suffix = f":{index}" if index is not None else ""
        return {
            "id": f"observation:{self.activation_id}:{name}{suffix}",
            "kind": name,
            "content": content,
            "sha256": hashlib.sha256(json.dumps(content, sort_keys=True).encode()).hexdigest(),
            "cutoff": self.cutoff,
            "origin": {"activation_id": self.activation_id, "field": name, "index": index},
            "epistemic_status": "self_report" if name == "your_note" else "recorded_observation",
        }

    def memory_sources(self) -> list[dict]:
        # Observation is already World's bounded, memory-mode-filtered projection.
        # No complete state, event table, other activation or researcher summary is read.
        result = [*self.current_artifacts, *self.retained]
        if self.observation.get("your_note"):
            result.append(self.source("your_note", self.observation["your_note"]))
        for name in ["your_experiences", "public_history"]:
            result.extend(
                self.source(name, item, index)
                for index, item in enumerate(self.observation.get(name, []))
            )
        return result

    def selected_sources(self, ids: list[str]) -> list[dict]:
        sources = {
            item["id"]: item
            for item in [
                *self.memory_sources(),
                *(self.inspection_source(facet) for facet in ["state", "rules", "legal_options"]),
            ]
        }
        if any(source_id not in sources for source_id in ids):
            raise ValueError("Source is unavailable in this actor context")
        return [sources[source_id] for source_id in ids]

    def inspection_source(self, facet: str) -> dict:
        field_name = "legal_actions" if facet == "legal_options" else facet
        content = (
            {
                key: value
                for key, value in self.observation.items()
                if key
                not in {"your_experiences", "your_note", "public_history", "rules", "legal_actions"}
            }
            if facet == "state"
            else self.observation[field_name]
        )
        return self.source(field_name, content)


class ActorPlan:
    """An intentional private artifact, not a request for provider reasoning."""

    @staticmethod
    def execute(context: ActorContext, request: dict, number: int) -> dict:
        plan = PlanRequest.model_validate(request["plan"])
        sources = context.selected_sources(plan.source_ids)
        return {
            "artifact": {
                "id": f"plan:{context.activation_id}:{number}",
                "text": plan.text,
                "visibility": "actor",
                "epistemic_status": "self_report",
                "sources": [source_reference(source) for source in sources],
                "cutoff": context.cutoff,
            }
        }


class ActorSources:
    @staticmethod
    def execute(context: ActorContext, request: dict, number: int) -> dict:
        query = RetrievalRequest.model_validate(request["retrieval"])
        cutoff = context.turn if query.cutoff_turn is None else query.cutoff_turn
        if cutoff > context.turn:
            raise ValueError("Cutoff is outside this actor context")
        sources = (
            context.selected_sources(query.source_ids)
            if query.source_ids
            else context.memory_sources()
        )
        matches = [
            source
            for source in sources
            if source["cutoff"]["turn"] <= cutoff
            and query.query.casefold() in json.dumps(source["content"]).casefold()
        ]
        limit = min(query.limit, context.max_memory_items)
        return {
            "cutoff": {"turn": cutoff, "round": context.round},
            "items": matches[:limit],
            "returned": len(matches[:limit]),
            "has_more": len(matches) > limit,
            "limit": limit,
            "scope": "actor_memory",
        }


class ActorInspection:
    @staticmethod
    def execute(context: ActorContext, request: dict, number: int) -> dict:
        query = InvestigationRequest.model_validate(request["investigation"])
        return {"source": context.inspection_source(query.facet), "scope": "actor_observation"}


class LegalEvidence:
    @staticmethod
    def execute(context: ActorContext, request: dict, number: int) -> dict:
        query = VerificationRequest.model_validate(request["verification"])
        if context.decision_type is None:
            raise ValueError("Legal schema is unavailable")
        try:
            context.decision_type.model_validate(query.proposed.model_dump())
            valid = True
        except ValueError:
            valid = False
        sources = context.selected_sources([check.source_id for check in query.checks])
        return {
            "schema_valid": valid,
            "checks": [
                {
                    "source": source_reference(source),
                    "quote_present": check.quote
                    in json.dumps(source["content"], ensure_ascii=False),
                }
                for source, check in zip(sources, query.checks, strict=True)
            ],
            "cutoff": context.cutoff,
            "scope": "actor_legal_schema_and_source_quotes",
            "limitation": "No action executed or outcome predicted. A matching quote confirms only "
            "the recorded source text, not its truth; self-reports remain self-reports.",
        }


# The selected versioned policy is part of the condition's experimental identity.
# Implementations receive the same actor-scoped contract, with no Engine/DB/provider.
CAPABILITY_POLICIES = {
    "actor_plan_v1": ActorPlan,
    "actor_sources_v1": ActorSources,
    "actor_inspection_v1": ActorInspection,
    "legal_evidence_v1": LegalEvidence,
}
OPERATION_CAPABILITY = {
    "plan": "planning",
    "retrieve": "memory",
    "investigate": "investigation",
    "verify": "verification",
}


def source_reference(source: dict) -> dict:
    """Keep provenance without recursively nesting prior artifacts/evidence."""
    return {key: value for key, value in source.items() if key != "content"}


def artifact_source(artifact: dict, activation_id: str, number: int, cutoff: dict) -> dict:
    return {
        "id": artifact["id"],
        "kind": "plan",
        "content": artifact,
        "sha256": hashlib.sha256(json.dumps(artifact, sort_keys=True).encode()).hexdigest(),
        "cutoff": cutoff,
        "origin": {"activation_id": activation_id, "operation": number},
        "epistemic_status": "self_report",
    }


def bounded_prompt(payload: dict, limit: int, activation_id: str) -> str:
    """Compact only already-authorized data; full receipts remain in the journal."""
    payload = payload | {"operations": list(payload["operations"])}
    encoded = json.dumps(payload)
    for index, op in enumerate(payload["operations"]):
        if len(encoded) <= limit:
            return encoded
        payload["operations"][index] = {
            "number": op["number"],
            "kind": op["kind"],
            "status": op["status"],
            "receipt": {"activation_id": activation_id, "operation": op["number"]},
            "result": "Content omitted by context budget; receipt retained for inspection.",
        }
        encoded = json.dumps(payload)
    if len(encoded) > limit:
        payload["retained_artifacts"] = [
            source_reference(source) for source in payload["retained_artifacts"]
        ]
        encoded = json.dumps(payload)
    if len(encoded) > limit:
        raise ValueError("Actor context exceeds its declared character budget")
    return encoded
