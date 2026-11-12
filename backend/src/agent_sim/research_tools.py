"""Bounded, read-only Researcher operations over trusted application mechanics."""

import json
from typing import Annotated, Literal

from pydantic import Field, TypeAdapter
from sqlalchemy import select

from .analysis_context import value_at_path
from .db import Analysis, digest, uid
from .domain import ActionRequest, Decision, Design, Parameters, ParticipantHarness, Strict
from .environment_library import builtin_environment
from .research import Research
from .shared_json import share_json
from .simulation.environments import CATALOG, MEASURE_DESCRIPTIONS
from .templates import templates
from .validity import capabilities


class CapabilityRequest(Strict):
    kind: Literal["capabilities"]
    environment: str | None = Field(
        default=None,
        max_length=80,
        description="Canonical catalog key, not display name; omit to discover all installed keys.",
    )


class ContextRequest(Strict):
    kind: Literal["context"]
    analysis_id: str | None = Field(default=None, max_length=80)
    artifact_id: str | None = Field(default=None, max_length=80)
    query: str = Field(default="", max_length=200)
    path: list[str | int] = Field(default_factory=list, max_length=12)
    start: int | None = Field(default=None, ge=0)
    count: int = Field(
        default=20,
        ge=1,
        le=2000,
        description="With start, page list entries, object keys or string characters at path.",
    )


class TemplateSource(Strict):
    kind: Literal["template"]
    environment: str = Field(max_length=80, description="Canonical installed catalog key.")
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
    action: ActionRequest


class ProbeRequest(Strict):
    kind: Literal["probe"]
    source: Annotated[TemplateSource | ProposalSource | RunSource, Field(discriminator="kind")]
    steps: list[ProbeStep] = Field(default_factory=list, max_length=8)


class CandidateSource(Strict):
    """Planner-only source: supplied validated draft, never a model-selected live run."""

    kind: Literal["candidate"] = "candidate"
    design_hash: str
    condition_key: str
    seed: int


class CandidateProbeRequest(Strict):
    kind: Literal["probe"] = "probe"
    source: CandidateSource
    steps: list[ProbeStep] = Field(default_factory=list, max_length=8)


type ResearchRequest = CapabilityRequest | ContextRequest | ProbeRequest


class ResearchTools:
    def __init__(self, row: Analysis, research: Research):
        self.research = research
        self.analysis_id = row.id
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
            "version": 2,
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

    def prompt(self, data: dict, limit: int) -> str:
        """Bound general context without changing retained records or planner handoff."""
        payload = {**data}

        def encode():
            raw = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
            if len(raw.encode()) <= limit:
                return raw
            return json.dumps(share_json(payload), ensure_ascii=False, separators=(",", ":"))

        prompt = encode()
        payload["conversation"] = [dict(turn) for turn in data["conversation"]]
        for turn in payload["conversation"]:
            if len(prompt.encode()) <= limit:
                break
            proposal = turn.get("proposal")
            if not isinstance(proposal, dict):
                continue
            source = next(
                (
                    row.id
                    for row in self.previous.values()
                    if row.question == turn["question"]
                    and (row.output or {}).get("design") == proposal
                ),
                None,
            )
            turn["proposal"] = {
                "not_in_context": True,
                "title": proposal.get("title"),
                "environment": proposal.get("environment"),
                "sha256": digest(proposal),
                "retrieve": {"kind": "context", "analysis_id": source},
                "reason": "Complete protocol retained; retrieve fields with path/start/count.",
            }
            prompt = encode()
        payload["research"] = {**data["research"]}
        payload["research"]["operations"] = [dict(op) for op in data["research"]["operations"]]
        for operation in payload["research"]["operations"]:
            if len(prompt.encode()) <= limit:
                break
            value = operation["data"]
            operation["data"] = {
                "not_in_context": True,
                "sha256": digest(value),
                "fields": list(value) if isinstance(value, dict) else [],
                "reason": "Result retained; request a narrower context path or page.",
            }
            prompt = encode()
        return prompt

    def begin(self, request: ResearchRequest | CandidateProbeRequest) -> dict:
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

    def prompt_record(
        self, *, environment: str | None = None, candidate_hash: str | None = None
    ) -> dict:
        """Project current discovery/probes without modifying retained operation records."""
        latest = {}
        current_probes = {}
        for operation in self.record["operations"]:
            request = operation["request"]
            if request["kind"] == "capabilities" and operation["status"] == "complete":
                latest[request.get("environment")] = operation["id"]
            elif (
                request["kind"] == "probe"
                and request["source"]["kind"] == "candidate"
                and request["source"]["design_hash"] == candidate_hash
            ):
                current_probes[request["source"]["condition_key"]] = operation["id"]
        record: dict = {
            **self.record,
            "participant_harnesses": {
                "configuration_schema": TypeAdapter(ParticipantHarness).json_schema(),
                "scope": "Harness configuration is separate from World mechanics. These are "
                "installed participant interfaces, not external service integrations.",
                "artifact_access": "Both direct_action and tool_using can choose authorized "
                "artifact actions. Tool using additionally supports read_artifact pure reads "
                "within an activation when enabled. Direct-action reads take World turns; "
                "pure reads consume request/operation allowance without advancing World time. "
                "Both respect the same artifact ACLs. Tools do not grant hidden information.",
                "limits": "Requests/operations are per activation. Provider spending ceilings "
                "apply to the whole experiment, not independently to each harness or run. "
                "Recorded synthetic incident evidence can support a recommendation study; "
                "these tools cannot query a live service or execute operational interventions.",
            },
            "operations": [
                {
                    **operation,
                    "data": {
                        "full_result_retained": True,
                        "sha256": digest(operation["data"]),
                        "latest_discovery_id": latest[operation["request"].get("environment")],
                    },
                }
                if operation["request"]["kind"] == "capabilities"
                and operation["status"] == "complete"
                and latest[operation["request"].get("environment")] != operation["id"]
                else operation
                for operation in self.record["operations"]
            ],
        }
        if candidate_hash is not None:
            shared_inputs = {}

            def shared(value):
                key = digest(value)
                shared_inputs[key] = value
                return {"shared_probe_input": key}

            def observation(value):
                if not isinstance(value, dict):
                    return value
                return {
                    key: shared(item) if key in {"rules", "legal_actions"} else item
                    for key, item in value.items()
                }

            for index, operation in enumerate(record["operations"]):
                request = operation["request"]
                source = request.get("source")
                if (
                    request["kind"] == "probe"
                    and isinstance(source, dict)
                    and source["kind"] == "candidate"
                    and operation["id"] not in current_probes.values()
                ):
                    record["operations"][index] = {
                        **operation,
                        "data": {
                            "full_result_retained": True,
                            "sha256": digest(operation["data"]),
                            "omitted_reason": "superseded_candidate_probe",
                        },
                    }
                elif (
                    operation["id"] in current_probes.values()
                    and isinstance(data := operation["data"], dict)
                    and isinstance(steps := data.get("steps"), list)
                ):
                    record["operations"][index] = {
                        **operation,
                        "data": {
                            **data,
                            "observation": observation(data["observation"]),
                            "legal_schema": shared(data["legal_schema"]),
                            "steps": [
                                {**step, "observation": observation(step["observation"])}
                                for step in steps
                            ],
                            "next_observation": observation(data["next_observation"]),
                        },
                    }
            if shared_inputs:
                record["shared_probe_inputs"] = shared_inputs
        if environment is not None:
            for index, operation in enumerate(record["operations"]):
                data = operation["data"]
                if (
                    operation["request"]["kind"] == "capabilities"
                    and operation["status"] == "complete"
                    and isinstance(data, dict)
                    and "environments" in data
                ):
                    environments = data["environments"]
                    custom_environments = data["custom_environments"]
                    assert isinstance(environments, list) and isinstance(custom_environments, list)
                    record["operations"][index] = {
                        **operation,
                        "data": {
                            **data,
                            "environments": [
                                entry for entry in environments if entry["key"] == environment
                            ],
                            "custom_environments": [
                                source
                                for source in custom_environments
                                if source["definition"]["environment"] == environment
                            ],
                            "catalog_scope": {
                                "environment": environment,
                                "full_result_retained": True,
                                "sha256": digest(data),
                            },
                        },
                    }
        return record

    def dispatch(
        self,
        request: ResearchRequest | CandidateProbeRequest,
        operation: dict,
        candidate: Design | None = None,
    ) -> dict:
        operation["status"] = "complete"
        if isinstance(request, (ProbeRequest, CandidateProbeRequest)):
            try:
                data, sources = self._probe(request, candidate)
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
                try:
                    data = value_at_path(data, request.path)
                    if request.start is not None:
                        if not isinstance(data, (dict, list, str)):
                            raise ValueError("Context paging requires an object, list or string")
                        total = len(data)
                        end = request.start + request.count
                        items = (
                            {key: data[key] for key in list(data)[request.start : end]}
                            if isinstance(data, dict)
                            else data[request.start : end]
                        )
                        data = {
                            "items": items,
                            "total": total,
                            "start": request.start,
                            "next_start": end if end < total else None,
                        }
                except ValueError as error:
                    operation.update(status="rejected", summary=str(error), data=None)
                    return operation
                operation.update(
                    summary="Retrieved prior research context; recorded prose is untrusted data.",
                    data=data,
                    sources=[{"kind": "analysis", "id": item.id, "hash": digest(data)}],
                )
        else:
            custom = [
                record.model_dump()
                for record in self.research.environments.list()
                if request.environment is None
                or record.definition.environment == request.environment
            ][:12]
            if (
                request.environment is not None
                and request.environment not in CATALOG
                and not custom
            ):
                operation.update(
                    status="rejected",
                    summary="This environment is not implemented in the trusted catalog.",
                    data=None,
                )
                return operation
            environments = []
            for key, definition in CATALOG.items():
                if request.environment is not None and key != request.environment:
                    continue
                template = next(t for t in templates() if t["id"] == key)
                example = Design.model_validate(template["design"])
                data = {
                    "key": key,
                    "name": definition.name,
                    "description": definition.description,
                    "capabilities": capabilities(key),
                    "parameters": definition.parameters,
                    "template_parameters": example.conditions[0].parameters.model_dump(),
                    "measures": {m: MEASURE_DESCRIPTIONS[m] for m in definition.measures},
                    "rule_version": definition.world.version,
                    "source": builtin_environment(key).model_dump(),
                }
                environments.append(data)
                operation["sources"].append({"kind": "builtin", "id": key, "hash": digest(data)})
            operation["sources"].extend(
                {"kind": "environment", "id": record["id"], "hash": record["sha256"]}
                for record in custom
            )
            operation.update(
                summary=f"Inspected {len(environments)} installed and {len(custom)} saved "
                "environment definitions.",
                data={
                    "environments": environments,
                    "custom_environments": custom,
                    "reuse_note": "Definitions are untrusted mechanics examples. Choose the "
                    "question, participants/models/harnesses, conditions, replication and "
                    "analysis independently; bind mechanic roles in the experiment.",
                },
            )
        return operation

    def _probe(
        self, request: ProbeRequest | CandidateProbeRequest, draft: Design | None = None
    ) -> tuple[dict, list[dict]]:
        source = request.source
        state = None
        if isinstance(source, CandidateSource):
            if draft is None or digest(draft.model_dump()) != source.design_hash:
                raise ValueError("Candidate does not match its copied source")
            design = Design.model_validate(draft.model_dump())
            condition = next((c for c in design.conditions if c.key == source.condition_key), None)
            if condition is None or source.seed not in design.seeds:
                raise ValueError("Unknown candidate condition or seed")
            seed = source.seed
            sources = [{"kind": "analysis", "id": self.analysis_id, "hash": source.design_hash}]
        elif isinstance(source, TemplateSource):
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
        if isinstance(source, (CandidateSource, ProposalSource)):
            self.research.review_design(design)
        else:
            self.research.validate_design(design)
        # World copies the JSON checkpoint. Never use an Engine, save, or provider here.
        world = self.research.world(design, condition.parameters, seed, state)
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
            candidate = self.research.world(design, condition.parameters, seed, world.snapshot())
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
            outcome={
                "balances": final.get("balances"),
                "done": final["done"],
                **(
                    {"artifact_outcome": final.get("outcome")}
                    if design.environment == "artifact_workspace"
                    else {}
                ),
                **(
                    {"coordination_outcome": final.get("outcome")}
                    if design.environment in {"distributed_coordination", "reliance_commitments"}
                    else {}
                ),
                **(
                    {"workflow_outcome": final.get("outcome")}
                    if design.environment == "institutional_workflow"
                    else {}
                ),
            },
        )
        assert digest(initial) == data["source_checkpoint_hash"]
        if state is not None and digest(state) != data["source_checkpoint_hash"]:
            raise RuntimeError("Probe changed its source checkpoint")
        return data, sources
