"""Closed provider records; canonical World actions and journals remain unchanged.

Arbitrary artifact keys travel as entries because strict provider schemas require
closed objects. Decode once, rejecting duplicates before constructing World content.
"""

from collections.abc import Mapping
from functools import lru_cache, reduce
from operator import or_
from typing import Annotated, Any, Literal, get_args, get_origin

from pydantic import BaseModel, Field, StrictInt, TypeAdapter, ValidationError, create_model

from .domain import ArtifactKey, Decision, PerformWork, ReadArtifact, Strict, WriteArtifact
from .participant_context import (
    InvestigationRequest,
    PlanRequest,
    RetrievalRequest,
    VerificationRequest,
)


class ContentEntry(Strict):
    key: ArtifactKey
    value: Annotated[str, Field(max_length=1000)] | StrictInt


ContentEntries = Annotated[list[ContentEntry], Field(min_length=1, max_length=12)]
CONTENT_INSTRUCTIONS = (
    "\nFor write_artifact and perform_work, encode content as a list of {key, value} "
    "entries with unique keys, rather than a JSON object. Values are strings or integers."
)


def _action_output(annotation: Any, versions: tuple[tuple[str, int], ...]) -> Any:
    if get_origin(annotation) is Annotated:
        return _action_output(get_args(annotation)[0], versions)
    variants = get_args(annotation)
    if variants:
        return reduce(or_, (_action_output(variant, versions) for variant in variants))
    if isinstance(annotation, type) and issubclass(annotation, WriteArtifact | PerformWork):
        if issubclass(annotation, WriteArtifact) and versions:
            artifact = TypeAdapter(annotation.model_fields["artifact"].annotation)
            scoped = []
            for key, version in versions:
                try:
                    artifact.validate_python(key)
                except ValidationError:
                    continue
                scoped.append(
                    create_model(
                        f"{annotation.__name__}Entries_{key}",
                        __base__=annotation,
                        content=(ContentEntries, ...),
                        artifact=(Literal.__getitem__(key), ...),
                        expected_version=(Literal.__getitem__(version), ...),
                    )
                )
            if not scoped:
                raise ValueError("Writable artifact schema has no observed current versions")
            return reduce(or_, scoped)
        return create_model(
            f"{annotation.__name__}Entries", __base__=annotation, content=(ContentEntries, ...)
        )
    return annotation


@lru_cache(maxsize=512)
def decision_output(
    decision: type[Decision], versions: tuple[tuple[str, int], ...] = ()
) -> type[BaseModel]:
    annotation = decision.model_fields["action"].annotation
    action = _action_output(annotation, versions)
    if action == annotation:
        return decision
    return create_model(
        f"{decision.__name__}Output",
        __base__=decision,
        action=(action, ...),
    )


def write_versions(observation: Mapping) -> tuple[tuple[str, int], ...]:
    """Only the actor's authorized directory supplies current write preconditions."""
    return tuple(
        (row["key"], row["version"]) for row in observation.get("artifacts", []) if row["writable"]
    )


def _decode(value: Any) -> Any:
    if isinstance(value, list):
        return [_decode(item) for item in value]
    if not isinstance(value, dict):
        return value
    result = {key: _decode(item) for key, item in value.items()}
    if result.get("kind") in {"write_artifact", "perform_work"}:
        entries = result["content"]
        content = {entry["key"]: entry["value"] for entry in entries}
        if len(content) != len(entries):
            raise ValueError("Artifact content keys must be unique")
        result["content"] = content
    return result


def decode_decision(value: BaseModel) -> Decision:
    return Decision.model_validate(_decode(value.model_dump(mode="json")))


PAYLOADS = {
    "observe": None,
    "rules": None,
    "legal_options": None,
    "read_artifact": ("read", ReadArtifact),
    "plan": ("plan", PlanRequest),
    "retrieve": ("retrieval", RetrievalRequest),
    "investigate": ("investigation", InvestigationRequest),
    "verify": ("verification", VerificationRequest),
    "decide": ("decision", Decision),
}


def _read_type(annotation: Any) -> type[ReadArtifact] | None:
    if get_origin(annotation) is Annotated:
        return _read_type(get_args(annotation)[0])
    if isinstance(annotation, type) and issubclass(annotation, ReadArtifact):
        return annotation
    for variant in get_args(annotation):
        if found := _read_type(variant):
            return found
    return None


@lru_cache(maxsize=512)
def operation_output(
    decision: type[Decision],
    operations: tuple[str, ...],
    versions: tuple[tuple[str, int], ...] = (),
) -> type[BaseModel]:
    variants = []
    for operation in operations:
        payload = PAYLOADS[operation]
        read = _read_type(decision.model_fields["action"].annotation)
        if operation == "read_artifact" and read is None:
            continue
        fields: dict[str, Any] = {"operation": (Literal.__getitem__(operation), ...)}
        if payload:
            name, model = payload
            if operation == "read_artifact":
                assert read is not None
                model = read
            elif operation == "decide":
                model = decision_output(decision, versions)
            elif operation == "verify":
                model = create_model(
                    "VerificationOutput",
                    __base__=VerificationRequest,
                    proposed=(decision_output(Decision), ...),
                )
            fields[name] = (model, ...)
        variants.append(create_model(f"Participant{operation.title()}", __base__=Strict, **fields))
    # A nested union keeps the root an object, as required by structured-output providers.
    return create_model("ParticipantRequest", __base__=Strict, request=(reduce(or_, variants), ...))


def decode_operation(value: BaseModel) -> dict:
    request = _decode(value.model_dump(mode="json")["request"])
    # Journal consumers have one canonical record, independent of provider encoding.
    return (
        dict.fromkeys(("decision", "read", "plan", "retrieval", "investigation", "verification"))
        | request
    )
