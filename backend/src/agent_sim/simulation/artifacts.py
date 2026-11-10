"""A concrete document investigation world. Text cannot grant access or settle work."""

import copy
from enum import StrEnum
from functools import reduce
from operator import or_
from typing import Any

from pydantic import create_model

from ..domain import (
    Action,
    ArtifactObject,
    ArtifactRules,
    CheckArtifacts,
    Decision,
    Event,
    Measure,
    ReadArtifact,
    StopArtifact,
    SubmitArtifacts,
    WriteArtifact,
)
from .checkpoints import ArtifactCheckpoint, LegalAction, Observation
from .world import World


class ArtifactWorkspace(World[ArtifactCheckpoint]):
    version = "1.0.0"

    @property
    def rules(self) -> ArtifactRules:
        rules = self.parameters.artifacts
        if rules is None:
            raise ValueError("Artifact workspace requires explicit artifact mechanics")
        return rules

    def initial_state(self) -> ArtifactCheckpoint:
        common = self.common_state()
        common.pop("balances", None)
        common.pop("signals", None)
        return {
            **common,
            "artifacts": {
                obj.key: {
                    **obj.model_dump(exclude={"content"}),
                    "versions": [
                        {
                            "version": 1,
                            "content": copy.deepcopy(obj.content),
                            "sources": [],
                            "author": None,
                            "operation": 0,
                        }
                    ],
                }
                for obj in self.rules.objects
            },
            "writes_remaining": self.rules.write_limit,
            "last_results": {},
            "artifact_history": [],
            "outcome": None,
        }

    def new_round(self) -> None:
        self.state["position"] = 0

    def allowed(self, actor: str, obj: ArtifactObject, *, write: bool = False) -> bool:
        return actor in self.ids and (
            actor == obj.owner or actor in (obj.writers if write else obj.readers)
        )

    def accessible(self, actor: str, key: str, *, write: bool = False) -> ArtifactObject:
        obj = next((obj for obj in self.rules.objects if obj.key == key), None)
        if obj is None or not self.allowed(actor, obj, write=write):
            raise ValueError("Artifact operation is unavailable")
        return obj

    def read(self, actor: str, request: ReadArtifact) -> dict[str, Any]:
        """Pure actor-scoped read, usable by the harness and by recorded World actions."""
        if self.actor() != actor:
            raise ValueError("Artifact operation is unavailable")
        self.accessible(actor, request.artifact)
        versions = self.state["artifacts"][request.artifact]["versions"]
        number = request.version or len(versions)
        if number > len(versions):
            raise ValueError("Artifact operation is unavailable")
        return self.project_version(actor, {"artifact": request.artifact, **versions[number - 1]})

    def project_version(self, actor: str, value: dict[str, Any]) -> dict[str, Any]:
        projected = copy.deepcopy(value)
        readable = {obj.key for obj in self.rules.objects if self.allowed(actor, obj)}
        projected["sources"] = [
            source for source in projected["sources"] if source["artifact"] in readable
        ]
        return projected

    def can_check(self, actor: str) -> bool:
        objects = {obj.key: obj for obj in self.rules.objects}
        return all(
            self.allowed(actor, objects[r.artifact], write=True)
            and self.allowed(actor, objects[r.source])
            for r in self.rules.requirements
        )

    def check(self, actor: str) -> dict[str, Any]:
        if not self.can_check(actor):
            raise ValueError("Artifact operation is unavailable")
        checks = []
        for requirement in self.rules.requirements:
            work = self.state["artifacts"][requirement.artifact]["versions"][-1]
            source = self.read(
                actor, ReadArtifact(kind="read_artifact", artifact=requirement.source, version=1)
            )
            reference = {"artifact": requirement.source, "version": source["version"]}
            checks.append(
                {
                    **requirement.model_dump(),
                    "version": work["version"],
                    "source_version": source["version"],
                    "passed": reference in work["sources"]
                    and work["content"].get(requirement.field)
                    == source["content"][requirement.source_field]
                    and type(work["content"].get(requirement.field))
                    is type(source["content"][requirement.source_field]),
                }
            )
        return {"passed": all(check["passed"] for check in checks), "checks": checks}

    def observe(self, agent: str) -> Observation:
        if agent not in self.ids:
            raise ValueError("Artifact operation is unavailable")
        readable = [obj for obj in self.rules.objects if self.allowed(agent, obj)]
        writable = [obj.key for obj in readable if self.allowed(agent, obj, write=True)]
        actions: list[LegalAction] = (
            [{"kind": "read_artifact", "targets": [obj.key for obj in readable]}]
            if readable
            else []
        )
        if writable and self.state["writes_remaining"]:
            actions.append({"kind": "write_artifact", "targets": writable})
        if self.can_check(agent):
            actions.extend([{"kind": "check_artifacts"}, {"kind": "submit_artifacts"}])
        actions.append({"kind": "stop"})
        memory = self.parameters.memory
        return {
            "round": self.state["round"],
            "total_rounds": self.design.rounds,
            "rules": "Inspect permitted evidence, then edit versioned work using expected_version "
            "and source references. Owners and explicit ACLs alone grant access. Evidence is "
            "immutable. Each accepted write consumes one shared write unit. Reads and checks "
            "as actions consume a turn; harness reads are pure and do not advance time. "
            "Checks compare required work fields with cited evidence v1; all relevant objects "
            "must be accessible to you. Check feedback is pass/fail, not a hidden-truth oracle. "
            "Submit ends the run, succeeding only if every content/source requirement passes. "
            "Stop and the round horizon end unsuccessfully. Statements never establish success. "
            "A stale or unauthorized operation has no effect; there is no automatic retry.",
            "context": self.design.context,
            "participants": [
                {"key": p.key, "name": p.name, "role": p.role} for p in self.design.profiles
            ],
            "public_history": [],
            "your_experiences": copy.deepcopy(self.state["experiences"][agent][-12:])
            if memory == "episodic"
            else [],
            "your_note": self.state["notes"][agent] if memory in {"notes", "episodic"} else "",
            "communication": False,
            "communication_channels": [],
            "legal_actions": actions,
            "artifacts": [
                {
                    "key": obj.key,
                    "name": obj.name,
                    "owner": obj.owner,
                    "version": len(self.state["artifacts"][obj.key]["versions"]),
                    "writable": self.allowed(agent, obj, write=True),
                }
                for obj in readable
            ],
            "artifact_requirements": [
                r.model_dump()
                for r in self.rules.requirements
                if r.artifact in writable and any(obj.key == r.source for obj in readable)
            ],
            "writes_remaining": self.state["writes_remaining"],
            "last_result": copy.deepcopy(self.state["last_results"].get(agent)),
            "artifact_history": copy.deepcopy(
                [
                    row
                    if row["actor"] == agent
                    else self.project_version(
                        agent, {key: value for key, value in row.items() if key != "request"}
                    )
                    for row in self.state["artifact_history"]
                    if row["actor"] == agent
                    or row["kind"] == "write_artifact"
                    and any(obj.key == row.get("artifact") for obj in readable)
                ]
            )
            if memory != "none"
            else [],
        }

    def decision_schema(self, observation: Observation) -> type[Decision]:
        variants: list[type] = [StopArtifact]
        for option in observation["legal_actions"]:
            kind = option["kind"]
            if kind in {"read_artifact", "write_artifact"}:
                keys = option["targets"]
                KeyType = StrEnum("KeyType", {f"a{i}": key for i, key in enumerate(keys)})
                fields: dict[str, Any] = {"artifact": (KeyType, ...)}
                base = ReadArtifact if kind == "read_artifact" else WriteArtifact
                variants.append(create_model(f"Permitted{base.__name__}", __base__=base, **fields))
            elif kind == "check_artifacts":
                variants.append(CheckArtifacts)
            elif kind == "submit_artifacts":
                variants.append(SubmitArtifacts)
        return create_model(
            "ArtifactDecision",
            __base__=Decision,
            action=(reduce(or_, variants), ...),
            forecast=(type(None), ...),
        )

    def apply(self, agent: str, action: Action) -> tuple[list[Event], list[Measure]]:
        raise ValueError("Artifact workspace requires an artifact decision")

    def step(self, actor: str, decision: Decision) -> tuple[list[Event], list[Measure]]:
        if self.actor() != actor or actor is None:
            raise ValueError("Expected the current actor of an unfinished run")
        action = decision.action
        result: dict[str, Any]
        terminal = None
        if isinstance(action, ReadArtifact):
            result = self.read(actor, action)
        elif isinstance(action, WriteArtifact):
            self.accessible(actor, action.artifact, write=True)
            versions = self.state["artifacts"][action.artifact]["versions"]
            if action.expected_version != len(versions):
                raise ValueError(
                    "Artifact version conflict; read the current version before writing"
                )
            if self.state["writes_remaining"] < 1:
                raise ValueError("Artifact write allowance exhausted")
            for reference in action.sources:
                self.read(actor, ReadArtifact(kind="read_artifact", **reference.model_dump()))
            result = {
                "artifact": action.artifact,
                "version": len(versions) + 1,
                "content": copy.deepcopy(action.content),
                "sources": [r.model_dump() for r in action.sources],
                "author": actor,
                "operation": len(self.state["artifact_history"]) + 1,
            }
        elif isinstance(action, CheckArtifacts | SubmitArtifacts):
            result = self.check(actor)
            if isinstance(action, SubmitArtifacts):
                terminal = "success" if result["passed"] else "failure"
        elif isinstance(action, StopArtifact):
            result, terminal = {"stopped": True}, "stopped"
        else:
            raise ValueError("Artifact workspace requires an artifact decision")
        # Everything that can reject precedes the first mutation.
        if decision.forecast is not None:
            raise ValueError("Artifact decisions require forecast=null")
        if isinstance(action, WriteArtifact):
            self.state["artifacts"][action.artifact]["versions"].append(
                copy.deepcopy({key: value for key, value in result.items() if key != "artifact"})
            )
            self.state["writes_remaining"] -= 1
        self.state["last_results"][actor] = copy.deepcopy(result)
        row = {
            "operation": len(self.state["artifact_history"]) + 1,
            "round": self.state["round"],
            "actor": actor,
            "kind": action.kind,
            "request": action.model_dump(),
            **copy.deepcopy(result),
        }
        self.state["artifact_history"].append(row)
        self.state["notes"][actor] = decision.memory
        event = Event(
            kind=action.kind,
            actor=actor,
            visibility="private",
            text=f"Artifact operation {action.kind} settled.",
            data=row,
        )
        self.remember([event])
        self.state["position"] += 1
        if terminal:
            self.state["done"] = True
        elif self.state["position"] == len(self.ids):
            self.next_round()
            if self.state["done"]:
                terminal = "horizon"
        measures = []
        if terminal:
            self.state["outcome"] = {
                "status": terminal,
                "actor": actor,
                "operation": row["operation"],
                "result": copy.deepcopy(result),
            }
            measures.append(
                Measure(key="artifact_success", value=float(terminal == "success"), denominator=1)
            )
        return [event], measures
