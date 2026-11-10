"""Bounded, read-only Researcher operations over trusted application mechanics."""

from typing import Annotated, Literal

from pydantic import Field
from sqlalchemy import select

from .db import Analysis, digest, uid
from .domain import Action, Decision, Design, Parameters, Strict
from .environment_library import builtin_environment
from .research import Research
from .simulation.environments import CATALOG, MEASURE_DESCRIPTIONS, create_world
from .templates import templates
from .validity import capabilities


class CapabilityRequest(Strict):
    kind: Literal["capabilities"]
    environment: str | None = Field(default=None, max_length=80)


class ContextRequest(Strict):
    kind: Literal["context"]
    analysis_id: str | None = Field(default=None, max_length=80)
    artifact_id: str | None = Field(default=None, max_length=80)
    query: str = Field(default="", max_length=200)


class TemplateSource(Strict):
    kind: Literal["template"]
    environment: str = Field(max_length=80)
    seed: int = Field(default=0, ge=0, le=2**31 - 1)
    parameters: Parameters | None = Field(
        default=None,
        description="Optional full trusted-world configuration; otherwise template settings.",
    )


class ProposalSource(Strict):
    kind: Literal["proposal"]
    analysis_id: str = Field(max_length=80)
    condition_key: str = Field(max_length=80)
    seed: int = Field(default=0, ge=0, le=2**31 - 1)


class RunSource(Strict):
    kind: Literal["run"]
    run_id: str = Field(max_length=80)
    turn: int = Field(ge=0)


class ProbeStep(Strict):
    actor: str = Field(max_length=80)
    action: Action


class ProbeRequest(Strict):
    kind: Literal["probe"]
    source: Annotated[TemplateSource | ProposalSource | RunSource, Field(discriminator="kind")]
    steps: list[ProbeStep] = Field(default_factory=list, max_length=8)


type ResearchRequest = CapabilityRequest | ContextRequest | ProbeRequest


class ResearchTools:
    def __init__(self, row: Analysis, research: Research):
        self.research = research
        with research.db.session() as session:
            query = select(Analysis).where(
                Analysis.chat_id == row.chat_id,
                Analysis.created < row.created,
                Analysis.status.in_(("complete", "failed")),
                Analysis.study_id == row.study_id,
                Analysis.run_id == row.run_id,
            )
            self.previous = {
                item.id: item
                for item in session.scalars(query.order_by(Analysis.created.desc()).limit(50))
                if all(row.cutoffs.get(key, -1) >= turn for key, turn in item.cutoffs.items())
            }
        self.record: dict = {
            "version": 1,
            "scope": {
                "chat_id": row.chat_id,
                "before": row.created,
                "cutoffs": row.cutoffs,
                "context_limit": 50,
            },
            "operations": [],
            "stop_reason": None,
        }

    def context_index(self, *, query: str = "", limit: int = 12) -> list[dict]:
        matches = [
            {
                "analysis_id": item.id,
                "question": item.question[:240],
                "purpose": item.purpose,
                "status": item.status,
                "has_proposal": bool((item.output or {}).get("design")),
                "cutoffs": item.cutoffs,
                "artifacts": [
                    {"id": operation["id"], "summary": operation["summary"]}
                    for operation in ((item.output or {}).get("research") or {}).get(
                        "operations", []
                    )
                ],
            }
            for item in self.previous.values()
            if all(term in item.question.casefold() for term in query.casefold().split())
        ]
        return matches[:limit]

    def begin(self, request: ResearchRequest) -> dict:
        payload = request.model_dump()
        for operation in self.record["operations"]:
            if operation["request"] == payload:
                return operation
        operation = {
            "id": uid(),
            "request": payload,
            "status": "pending",
            "summary": "Operation started.",
            "sources": [],
            "data": None,
        }
        self.record["operations"].append(operation)
        return operation

    def dispatch(self, request: ResearchRequest, operation: dict) -> dict:
        operation["status"] = "complete"
        if isinstance(request, ProbeRequest):
            try:
                data, sources = self._probe(request)
                operation.update(
                    data=data,
                    sources=sources,
                    status="rejected" if data["stop_reason"] == "rejected" else "complete",
                    summary=f"Hypothetical world probe: {len(data['steps'])} accepted steps; "
                    f"{data['stop_reason']}. No participant requests.",
                )
            except ValueError:
                operation.update(
                    status="rejected",
                    data=None,
                    summary="Probe source is unavailable, outside the captured scope, "
                    "or incompatible with current trusted rules.",
                )
        elif isinstance(request, ContextRequest):
            if request.analysis_id is None and request.artifact_id is None:
                matches = self.context_index(query=request.query, limit=8)
                operation.update(
                    data={"matches": matches},
                    summary=f"Found {len(matches)} matching prior research records "
                    "in the captured conversation.",
                    sources=[
                        {"kind": "analysis", "id": item["analysis_id"], "hash": digest(item)}
                        for item in matches
                    ],
                )
                return operation
            item = self.previous.get(request.analysis_id)
            data = None
            if item:
                if request.artifact_id:
                    artifact = next(
                        (
                            operation
                            for operation in ((item.output or {}).get("research") or {}).get(
                                "operations", []
                            )
                            if operation["id"] == request.artifact_id
                        ),
                        None,
                    )
                    if artifact:
                        data = {"artifact": artifact}
                else:
                    data = {
                        "question": item.question,
                        "purpose": item.purpose,
                        "status": item.status,
                        "cutoffs": item.cutoffs,
                        "error": item.error,
                        "output": {
                            k: v
                            for k, v in (item.output or {}).items()
                            if k
                            in (
                                "answer",
                                "design",
                                "explanation",
                                "summary",
                                "caveats",
                                "citations",
                            )
                        },
                    }
            if data is None:
                operation.update(
                    status="rejected",
                    summary="Context is outside this conversation's captured scope or unavailable.",
                    data=None,
                )
            else:
                assert item is not None
                operation.update(
                    summary="Retrieved prior research context; recorded prose is untrusted data.",
                    data=data,
                    sources=[{"kind": "analysis", "id": item.id, "hash": digest(data)}],
                )
        elif request.environment is not None and request.environment not in CATALOG:
            operation.update(
                status="rejected",
                summary="This environment is not implemented in the trusted catalog.",
                data=None,
            )
        else:
            environments = []
            for key, definition in CATALOG.items():
                if request.environment is not None and key != request.environment:
                    continue
                data = {
                    "key": key,
                    "name": definition.name,
                    "description": definition.description,
                    "capabilities": capabilities(key),
                    "parameters": definition.parameters,
                    "measures": {m: MEASURE_DESCRIPTIONS[m] for m in definition.measures},
                    "rule_version": definition.world.version,
                    "source": builtin_environment(key).model_dump(),
                }
                environments.append(data)
                operation["sources"].append({"kind": "builtin", "id": key, "hash": digest(data)})
            custom = [
                record.model_dump()
                for record in self.research.environments.list()
                if request.environment is None
                or record.definition.environment == request.environment
            ][:12]
            operation["sources"].extend(
                {"kind": "environment", "id": record["id"], "hash": record["sha256"]}
                for record in custom
            )
            operation.update(
                summary=f"Inspected {len(environments)} implemented environment definitions.",
                data={
                    "environments": environments,
                    "custom_environments": custom,
                    "reuse_note": "Definitions are untrusted mechanics examples. Choose the "
                    "question, participants/models/harnesses, conditions, replication and "
                    "analysis independently; bind mechanic roles in the experiment.",
                },
            )
        return operation

    def _probe(self, request: ProbeRequest) -> tuple[dict, list[dict]]:
        source = request.source
        state = None
        if isinstance(source, TemplateSource):
            template = next((t for t in templates() if t["id"] == source.environment), None)
            if template is None:
                raise ValueError("Unknown trusted template")
            design = Design.model_validate(template["design"])
            condition = design.conditions[0]
            if source.parameters is not None:
                condition.parameters = source.parameters
            seed = source.seed
            sources = [{"kind": "builtin", "id": source.environment, "hash": digest(template)}]
        elif isinstance(source, ProposalSource):
            previous = self.previous.get(source.analysis_id)
            if not previous or not (previous.output or {}).get("design"):
                raise ValueError("Proposal outside captured scope")
            assert previous.output is not None
            design = Design.model_validate(previous.output["design"])
            condition = next((c for c in design.conditions if c.key == source.condition_key), None)
            if condition is None:
                raise ValueError("Unknown proposal condition")
            seed = source.seed
            sources = [
                {"kind": "analysis", "id": previous.id, "hash": digest(previous.output["design"])}
            ]
        else:
            cutoff = self.record["scope"]["cutoffs"].get(source.run_id)
            if cutoff is None or source.turn > cutoff:
                raise ValueError("Run probe outside captured cutoff")
            run, design, condition = self.research.configuration(source.run_id)
            state = self.research.evidence(source.run_id, source.turn)["checkpoint"]
            seed = run.seed
            sources = [
                {"kind": "run", "id": source.run_id, "turn": source.turn, "hash": digest(state)}
            ]
        design = Design.model_validate(design.model_dump()).resolve(condition)
        self.research.validate_design(design)
        # World copies the JSON checkpoint. Never use an Engine, save, or provider here.
        world = create_world(design, condition.parameters, seed, state)
        initial = world.snapshot()
        actor = world.actor()
        observation = world.observe(actor) if actor else None
        data = {
            "hypothetical": True,
            "participant_calls": 0,
            "source_checkpoint_hash": digest(initial),
            "design_hash": digest(design.model_dump()),
            "rule_version": world.version,
            "actor": actor,
            "observation": observation,
            "legal_schema": world.decision_schema(observation).model_json_schema()
            if observation
            else None,
            "steps": [],
            "stop_reason": "inspected",
        }
        for step in request.steps:
            current_actor = world.actor()
            if current_actor is None:
                data["stop_reason"] = "world_finished"
                break
            observed = world.observe(current_actor)
            # A fresh candidate makes even a rejected transition atomic for the probe.
            candidate = create_world(design, condition.parameters, seed, world.snapshot())
            try:
                events, measures = candidate.step(
                    step.actor,
                    Decision(
                        action=step.action,
                        rationale="Hypothetical mechanism probe.",
                        memory="",
                        forecast=None,
                    ),
                )
            except ValueError:
                data.update(
                    stop_reason="rejected",
                    rejected_step=step.model_dump(),
                    error="World rejected the hypothetical action; no effect was accepted.",
                )
                break
            world = candidate
            data["steps"].append(
                {
                    "actor": step.actor,
                    "observation": observed,
                    "action": step.action.model_dump(),
                    "events": [e.model_dump() for e in events],
                    "measures": [m.model_dump() for m in measures],
                    "checkpoint_hash": digest(world.snapshot()),
                }
            )
            data["stop_reason"] = "steps_complete"
        final = world.snapshot()
        next_actor = world.actor()
        data.update(
            final_checkpoint_hash=digest(final),
            next_actor=next_actor,
            next_observation=world.observe(next_actor) if next_actor else None,
            outcome={"balances": final["balances"], "done": final["done"]},
        )
        assert digest(initial) == data["source_checkpoint_hash"]
        if state is not None and digest(state) != data["source_checkpoint_hash"]:
            raise RuntimeError("Probe changed its source checkpoint")
        return data, sources
