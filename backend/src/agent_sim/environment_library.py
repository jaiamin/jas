"""Reusable mechanics; experiment revisions embed independent, complete rules."""

import json
import os
import re
from pathlib import Path
from tempfile import NamedTemporaryFile, TemporaryDirectory
from threading import RLock

from sqlalchemy.exc import NoResultFound

from .db import digest, now, uid
from .domain import (
    Design,
    EnvironmentConfiguration,
    EnvironmentMechanics,
    MechanicsParameters,
    Parameters,
    Profile,
    SavedEnvironment,
    Treatment,
)
from .simulation.environments import CATALOG
from .templates import templates
from .validity import preflight, require_valid


def validate_definition(definition: EnvironmentMechanics) -> None:
    installed = CATALOG[definition.environment]
    if definition.rule_version != installed.world.version:
        raise ValueError(
            f"Unsupported environment rule version {definition.rule_version}; "
            f"{definition.environment} requires {installed.world.version}"
        )
    defaults = Parameters().model_dump(exclude={"memory"})
    for example in definition.examples:
        params = example.parameters
        references = (
            set(params.institution.authorities)
            if definition.environment == "institution"
            else set()
        )
        if params.composition:
            references.update(role for r in params.composition.resources for role in r.controllers)
        if len(set(example.roles)) != len(example.roles) or references != set(example.roles):
            raise ValueError("Example roles must name exactly the unbound mechanic roles")
        if any(
            value != defaults[key] and key not in installed.parameters
            for key, value in params.model_dump().items()
        ):
            raise ValueError("Configuration contains controls unsupported by this environment")
        keys = list(example.roles)
        for index in range(1, 13):
            if len(keys) >= min(12, max(2, len(example.roles) + 1)):
                break
            key = f"member_{index}"
            if key not in keys:
                keys.append(key)
        design = Design(
            title="Environment configuration check",
            question="Do these declared mechanics execute?",
            environment=definition.environment,
            profiles=[
                Profile(key=key, name=key, goal="Inspect the rules and decide.") for key in keys
            ],
            conditions=[
                Treatment(
                    key="baseline", name="Baseline", parameters=Parameters(**params.model_dump())
                )
            ],
            tasks=example.tasks,
            seeds=[7],
            rounds=max([12, *(change.round for change in params.resource_schedule)]),
        )
        require_valid(preflight(design))


def validate_source(source: SavedEnvironment) -> None:
    if source.sha256 != digest(source.definition.model_dump()):
        raise ValueError("Environment source has an invalid content hash")
    validate_definition(source.definition)


def definition_from_design(design: Design) -> EnvironmentMechanics:
    """Extract examples, discarding study commitments and actual participant bindings."""
    installed = CATALOG[design.environment]
    examples = []
    seen = set()
    for condition in design.conditions:
        values = condition.parameters.model_dump()
        parameters = MechanicsParameters.model_validate(
            {key: values[key] for key in installed.parameters if key != "memory"}
        ).model_dump()
        references = set(parameters["institution"]["authorities"])
        if parameters["composition"]:
            references.update(
                role for r in parameters["composition"]["resources"] for role in r["controllers"]
            )
        bindings = {
            profile.key: f"role_{index}"
            for index, profile in enumerate(
                (profile for profile in design.profiles if profile.key in references), 1
            )
        }
        parameters["institution"]["authorities"] = [
            bindings[key] for key in parameters["institution"]["authorities"]
        ]
        if parameters["composition"]:
            for resource in parameters["composition"]["resources"]:
                resource["controllers"] = [bindings[key] for key in resource["controllers"]]
        content = {
            "parameters": parameters,
            "roles": list(bindings.values()),
            "tasks": [task.model_dump() for task in design.tasks],
        }
        identity = digest(content)
        if identity in seen:
            continue
        seen.add(identity)
        number = len(examples) + 1
        examples.append(
            EnvironmentConfiguration(
                key=f"configuration-{number}", name=f"Configuration {number}", **content
            )
        )
    definition = EnvironmentMechanics(
        name=design.title,
        environment=design.environment,
        rule_version=installed.world.version,
        examples=examples,
    )
    validate_definition(definition)
    return definition


def builtin_environment(key: str) -> SavedEnvironment:
    design = Design.model_validate(
        next(item["design"] for item in templates() if item["id"] == key)
    )
    definition = definition_from_design(design).model_copy(
        update={
            "name": CATALOG[key].name,
            "description": CATALOG[key].description,
        }
    )
    return SavedEnvironment(
        id=f"builtin:{key}",
        revision=1,
        updated=definition.rule_version,
        sha256=digest(definition.model_dump()),
        definition=definition,
    )


def use_environment(
    design: Design | None, source: SavedEnvironment, example_key: str, bindings: dict[str, str]
) -> Design:
    validate_source(source)
    example = next((item for item in source.definition.examples if item.key == example_key), None)
    if example is None:
        raise ValueError("Unknown environment configuration example")
    if design is None:
        count = min(12, max(2, len(example.roles) + 1))
        profiles = [
            Profile(
                key=f"member_{index}",
                name=f"Participant {index}",
                goal="Inspect the rules and decide.",
            )
            for index in range(1, count + 1)
        ]
        design = Design(
            title=f"{source.definition.name[:89]} experiment",
            question="What behavior do participants exhibit under these rules?",
            profiles=profiles,
            seeds=[7],
            rounds=max([12, *(change.round for change in example.parameters.resource_schedule)]),
            conditions=[Treatment(key="baseline", name="Baseline")],
        )
        if not bindings:
            bindings = {role: profiles[index].key for index, role in enumerate(example.roles)}
    if (
        set(bindings) != set(example.roles)
        or len(set(bindings.values())) != len(bindings)
        or not set(bindings.values()) <= {profile.key for profile in design.profiles}
    ):
        raise ValueError("Bind every mechanic role to a distinct existing participant")
    parameters = example.parameters.model_dump()
    parameters["institution"]["authorities"] = [
        bindings[role] for role in parameters["institution"]["authorities"]
    ]
    if parameters["composition"]:
        for resource in parameters["composition"]["resources"]:
            resource["controllers"] = [bindings[role] for role in resource["controllers"]]
    payload = design.model_dump()
    payload.update(
        environment=source.definition.environment,
        environment_source=source.model_dump(),
        tasks=[task.model_dump() for task in example.tasks],
        measures=[
            m for m in design.measures if m in CATALOG[source.definition.environment].measures
        ],
    )
    for condition in payload["conditions"]:
        condition["parameters"] = parameters | {"memory": condition["parameters"]["memory"]}
    return Design.model_validate(payload)


class EnvironmentConflict(ValueError):
    pass


class EnvironmentLibrary:
    def __init__(self, database_path: str | None):
        self.temporary = (
            TemporaryDirectory(prefix="jas-environments-")
            if database_path in (None, "", ":memory:")
            else None
        )
        self.root = (
            Path(self.temporary.name)
            if self.temporary
            else Path(str(database_path)).with_suffix(".environments")
        )
        self.lock = RLock()

    def _path(self, key: str) -> Path:
        if not re.fullmatch(r"[a-f0-9]{16}", key):
            raise NoResultFound()
        return self.root / f"{key}.json"

    def get(self, key: str) -> SavedEnvironment:
        try:
            payload = json.loads(self._path(key).read_text())
        except FileNotFoundError:
            raise NoResultFound() from None
        if not isinstance(payload, dict) or payload.get("format") != "jas-environment-v3":
            raise ValueError("Unsupported custom environment format; expected jas-environment-v3")
        record = SavedEnvironment.model_validate(payload)
        if record.id != key or record.sha256 != digest(record.definition.model_dump()):
            raise ValueError("Custom environment has an invalid identity or content hash")
        validate_definition(record.definition)
        return record

    def list(self) -> list[SavedEnvironment]:
        with self.lock:
            return sorted(
                (self.get(path.stem) for path in self.root.glob("*.json")),
                key=lambda record: record.updated,
                reverse=True,
            )

    def save(
        self, definition: EnvironmentMechanics, key: str | None = None, revision: int | None = None
    ) -> SavedEnvironment:
        definition = EnvironmentMechanics.model_validate_json(definition.model_dump_json())
        validate_definition(definition)
        with self.lock:
            previous = self.get(key) if key else None
            if previous and revision != previous.revision:
                raise EnvironmentConflict(
                    "Environment changed since opening; reload before updating"
                )
            record = SavedEnvironment(
                id=key or uid(),
                revision=previous.revision + 1 if previous else 1,
                updated=now(),
                sha256=digest(definition.model_dump()),
                definition=definition,
            )
            self.root.mkdir(parents=True, exist_ok=True)
            temporary = None
            try:
                with NamedTemporaryFile(
                    mode="w", dir=self.root, suffix=".tmp", delete=False
                ) as stream:
                    temporary = Path(stream.name)
                    stream.write(record.model_dump_json(indent=2))
                    stream.flush()
                    os.fsync(stream.fileno())
                temporary.replace(self._path(record.id))
            finally:
                if temporary is not None:
                    temporary.unlink(missing_ok=True)
            return record

    def delete(self, key: str, revision: int) -> None:
        with self.lock:
            if self.get(key).revision != revision:
                raise EnvironmentConflict(
                    "Environment changed since opening; reload before deleting"
                )
            self._path(key).unlink()

    def close(self) -> None:
        if self.temporary:
            self.temporary.cleanup()
