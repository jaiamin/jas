from collections import Counter, defaultdict
from collections.abc import Sequence
from dataclasses import dataclass
from typing import TypedDict

from sqlalchemy import delete, or_, select, update

from .comparisons import ComparisonRun, compare_runs, empty_effort
from .db import (
    Agent,
    Analysis,
    Annotation,
    Condition,
    Database,
    Measurement,
    ParticipantActivation,
    ParticipantOperation,
    ProviderCall,
    RecordedEvent,
    Revision,
    Run,
    Study,
    Turn,
    digest,
)
from .domain import Design, Treatment
from .environment_library import EnvironmentLibrary, validate_source
from .exposure import exposure_report
from .extensions import Extensions
from .llm import PRICES, LanguageModels, Usage, empty_usage
from .metrics import aggregate_metrics
from .participant_context import OPERATION_CAPABILITY
from .participants import activation_record, operation_record
from .simulation.environments import create_world, get_environment
from .validity import Requirement, factorial_issues, preflight, require_valid, requirement_issues


def study_status(statuses: Sequence[str]) -> str:
    counts = Counter(statuses)
    if any(counts[status] for status in ("running", "queued", "pausing")):
        return "running"
    if counts["complete"] == len(statuses):
        return "complete"
    if counts["failed"]:
        return "failed"
    if counts["ready"] == len(statuses):
        return "ready"
    return "paused"


def event_dict(event: RecordedEvent) -> dict:
    return {
        "id": event.id,
        "turn": event.turn,
        "round": event.round,
        "kind": event.kind,
        "actor": event.actor,
        "target": event.target,
        "visibility": event.visibility,
        "text": event.text,
        "data": event.data,
    }


class RunSummary(TypedDict):
    id: str
    study_id: str
    study_title: str
    revision: int
    condition: str
    condition_key: str
    environment: str
    model: str | None
    models: list[str]
    status: str
    turn: int
    round: int
    total_turns: int
    total_rounds: int
    seed: int
    repetition: int
    created: str
    error: str | None
    usage: Usage


@dataclass(frozen=True)
class OperationalRun:
    id: str
    turn: int


class Research:
    def __init__(self, db: Database, models: LanguageModels):
        self.db, self.models = db, models
        self.extensions = Extensions(db.engine.url.database)
        self.environments = EnvironmentLibrary(db.engine.url.database, self.extensions)

    def world(self, design: Design, parameters, seed: int, state: dict | None = None):
        return create_world(design, parameters, seed, state, runner=self.extensions.transition)

    def review_design(self, design: Design, plan_id: str | None = None) -> dict:
        """Authorize an untrusted draft before any executable preflight witness."""
        self.validate_design(design)
        if design.environment in {"sealed_relay", "reviewed_finite"}:
            source = design.environment_source
            if source is None or source.definition.extension is None:
                raise ValueError("Independent extension admission is required")
            self.extensions.check_package(source.definition.extension)
        return self.preflight(design, plan_id)

    def preflight(self, design: Design, plan_id: str | None = None) -> dict:
        # Persisted revisions carry their exact package and provenance. Their checks
        # must remain possible after loss of the original review/admission sidecars.
        result = preflight(design, runner=self.extensions.transition)
        result["question_mapping"] = []
        result["original_question"] = None
        if plan_id:
            with self.db.session() as session:
                plan = session.get_one(Analysis, plan_id)
                if (
                    plan.purpose != "design"
                    or plan.status != "complete"
                    or not (plan.output or {}).get("supported")
                ):
                    raise ValueError("Choose a completed, supported AI design")
                brief = ((plan.output or {}).get("planning") or {}).get("brief") or {}
                if brief.get("factorial"):
                    problems = factorial_issues(result["condition_grid"])
                    result["issues"].extend(problems)
                    if problems:
                        result["status"] = "blocked"
                requirements = [
                    Requirement.model_validate(r) for r in brief.get("requirements", [])
                ]
                result["original_question"] = plan.question
                if design.model_dump() != (plan.output or {}).get("design"):
                    result["issues"].append(
                        {
                            "code": "edited_proposal",
                            "severity": "warning",
                            "message": "Protocol changed since model review. "
                            "Supported capabilities "
                            "were rechecked; semantic fit to the question was not re-reviewed.",
                        }
                    )
                    if result["status"] == "checked":
                        result["status"] = "review"
            result["question_mapping"] = [r.model_dump() for r in requirements]
            for message in requirement_issues(design.environment, requirements, design):
                result["issues"].append(
                    {"code": "missing_construct", "severity": "error", "message": message}
                )
                result["status"] = "blocked"
        return result

    @staticmethod
    def validate_design(design: Design) -> None:
        if design.environment_source:
            if design.environment_source.definition.environment != design.environment:
                raise ValueError("Pinned environment source must match the experiment's world")
            validate_source(design.environment_source)
        if any(c.model not in PRICES for c in design.conditions) or any(
            p.model is not None and p.model not in PRICES
            for p in design.profiles + [p for c in design.conditions for p in c.profile_overrides]
        ):
            raise ValueError("Choose a model in the reviewed provider catalog")
        environment_definition = get_environment(design.environment)
        unsupported = sorted(set(design.measures) - set(environment_definition.measures))
        if unsupported:
            raise ValueError(
                f"Unsupported measurements {unsupported}; "
                f"choose from {list(environment_definition.measures)}"
            )

    def save_design(
        self,
        design: Design,
        *,
        study_id: str | None = None,
        plan_id: str | None = None,
        investigation_id: str | None = None,
    ) -> str:
        require_valid(self.review_design(design, plan_id))
        payload = design.model_dump()
        with self.db.session.begin() as session:
            if plan_id:
                plan = session.get_one(Analysis, plan_id)
                if (
                    plan.purpose != "design"
                    or plan.status != "complete"
                    or not (plan.output or {}).get("supported")
                ):
                    raise ValueError("Choose a completed, supported AI design")
            if study_id:
                study = session.get_one(Study, study_id)
                if study.investigation_id != investigation_id:
                    raise ValueError("Investigation revisions must use its bounded workflow")
                study.revision += 1
                study.title, study.question = design.title, design.question
                study.ceiling = (
                    min(study.ceiling, round(design.budget_usd * 1_000_000))
                    if investigation_id
                    else round(design.budget_usd * 1_000_000)
                )
                if study.ceiling < study.charged:
                    raise ValueError("Study budget cannot be below already committed usage")
            else:
                study = Study(
                    title=design.title,
                    question=design.question,
                    ceiling=round(design.budget_usd * 1_000_000),
                )
                session.add(study)
                session.flush()
            revision = Revision(
                study_id=study.id,
                number=study.revision,
                design=payload,
                sha256=digest(payload),
                source=f"plan:{plan_id}" if plan_id else "manual",
            )
            session.add(revision)
            session.flush()
            for condition in design.conditions:
                record = Condition(
                    revision_id=revision.id,
                    key=condition.key,
                    name=condition.name,
                    specification=condition.model_dump(),
                )
                session.add(record)
                session.flush()
                for seed in design.seeds:
                    for repetition in range(1, design.repetitions + 1):
                        resolved = design.resolve(condition)
                        world = self.world(resolved, condition.parameters, seed)
                        run = Run(
                            study_id=study.id,
                            condition_id=record.id,
                            seed=seed,
                            repetition=repetition,
                            checkpoint=world.snapshot(),
                            investigation_id=investigation_id,
                        )
                        session.add(run)
                        session.flush()
                        session.add_all(
                            [
                                Agent(
                                    run_id=run.id,
                                    key=p.key,
                                    profile=p.model_dump(),
                                    model=p.model or condition.model,
                                )
                                for p in resolved.profiles
                            ]
                        )
            return study.id

    def delete_study(
        self,
        study_id: str,
        *,
        active_runs: set[str],
        active_analyses: set[str],
    ) -> None:
        """Delete a whole experiment, never individual cells of its matched matrix.

        The caller runs this synchronously on the engine/assistant event loop, so
        no new task can start between checking live ownership and committing.
        Keep provider-call accounting, including unknown usage, after deletion.
        """
        with self.db.session.begin() as session:
            # Take the write lock before reading dependents (also on SQLite).
            session.execute(
                update(Study)
                .where(Study.id == study_id)
                .values(title=Study.title)
                .returning(Study.id)
            ).scalar_one()
            if session.get_one(Study, study_id).investigation_id:
                raise ValueError("Investigation evidence and attempts must be retained")
            runs = session.scalars(select(Run).where(Run.study_id == study_id)).all()
            run_ids = {run.id for run in runs}
            if run_ids & active_runs or any(
                run.status in ("running", "queued", "pausing") for run in runs
            ):
                raise ValueError("Pause all runs and wait for them to stop before deleting.")
            chat_ids = set(
                session.scalars(
                    select(Analysis.chat_id).where(
                        or_(Analysis.study_id == study_id, Analysis.run_id.in_(run_ids))
                    )
                )
            )
            chat_turns = session.scalars(
                select(Analysis).where(Analysis.chat_id.in_(chat_ids))
            ).all()
            if any(turn.id in active_analyses or turn.status == "pending" for turn in chat_turns):
                raise ValueError("Wait for related chats to finish before deleting.")
            # Preserve unrelated messages/proposals in conversations with mixed contexts.
            analysis_ids = {
                turn.id
                for turn in chat_turns
                if turn.study_id == study_id or turn.run_id in run_ids
            }
            calls = or_(
                ProviderCall.study_id == study_id,
                ProviderCall.run_id.in_(run_ids),
                ProviderCall.analysis_id.in_(analysis_ids),
            )
            if session.scalar(
                select(ProviderCall.id).where(calls, ProviderCall.status == "pending").limit(1)
            ):
                raise ValueError("Wait for pending requests to settle before deleting.")
            session.execute(
                update(ProviderCall)
                .where(calls)
                .values(request_payload=None, response_payload=None, activation_id=None)
            )
            session.execute(
                update(ProviderCall).where(ProviderCall.study_id == study_id).values(study_id=None)
            )
            session.execute(
                update(ProviderCall).where(ProviderCall.run_id.in_(run_ids)).values(run_id=None)
            )
            session.execute(
                update(ProviderCall)
                .where(ProviderCall.analysis_id.in_(analysis_ids))
                .values(analysis_id=None)
            )
            session.execute(delete(Analysis).where(Analysis.id.in_(analysis_ids)))
            for record in (Annotation, Measurement, RecordedEvent, Turn, Agent):
                session.execute(delete(record).where(record.run_id.in_(run_ids)))
            activation_ids = select(ParticipantActivation.id).where(
                ParticipantActivation.run_id.in_(run_ids)
            )
            session.execute(
                delete(ParticipantOperation).where(
                    ParticipantOperation.activation_id.in_(activation_ids)
                )
            )
            session.execute(
                delete(ParticipantActivation).where(ParticipantActivation.run_id.in_(run_ids))
            )
            session.execute(delete(Run).where(Run.id.in_(run_ids)))
            revisions = select(Revision.id).where(Revision.study_id == study_id)
            session.execute(delete(Condition).where(Condition.revision_id.in_(revisions)))
            session.execute(delete(Revision).where(Revision.study_id == study_id))
            session.execute(delete(Study).where(Study.id == study_id))

    def check_run(self, run_id: str) -> None:
        with self.db.session() as session:
            revision = session.scalars(
                select(Revision)
                .join(Condition, Condition.revision_id == Revision.id)
                .join(Run, Run.condition_id == Condition.id)
                .where(Run.id == run_id)
            ).one()
        plan_id = (
            revision.source.removeprefix("plan:") if revision.source.startswith("plan:") else None
        )
        require_valid(self.preflight(Design.model_validate(revision.design), plan_id))

    def configuration(self, run_id: str) -> tuple[Run, Design, Treatment]:
        with self.db.session() as session:
            run = session.get_one(Run, run_id)
            condition = session.get_one(Condition, run.condition_id)
            revision = session.get_one(Revision, condition.revision_id)
            treatment = Treatment.model_validate(condition.specification)
            return run, Design.model_validate(revision.design).resolve(treatment), treatment

    def run_summary(
        self,
        run: Run,
        design: Design,
        condition: Treatment,
        revision: int,
        usage: Usage | None = None,
    ) -> RunSummary:
        return {
            "id": run.id,
            "study_id": run.study_id,
            "study_title": design.title,
            "revision": revision,
            "condition": condition.name,
            "condition_key": condition.key,
            "environment": design.environment,
            "model": None if condition.harness.kind == "scripted" else condition.model,
            "models": sorted(
                {p.model or condition.model for p in design.resolve(condition).profiles}
            )
            if condition.harness.kind != "scripted"
            else [],
            "status": run.status,
            "turn": run.turn,
            "round": run.round,
            "total_turns": design.turn_count,
            "total_rounds": design.rounds,
            "seed": run.seed,
            "repetition": run.repetition,
            "created": run.created,
            "error": run.error,
            "usage": usage if usage is not None else self.models.usage(run_id=run.id),
        }

    def runs(
        self, study_id: str | None = None, *, run_ids: set[str] | None = None
    ) -> list[RunSummary]:
        with self.db.session() as session:
            query = (
                select(Run, Condition, Revision)
                .join(Condition, Run.condition_id == Condition.id)
                .join(Revision, Condition.revision_id == Revision.id)
                .order_by(Run.created.desc())
            )
            if study_id:
                query = query.where(Run.study_id == study_id)
            if run_ids is not None:
                query = query.where(Run.id.in_(run_ids))
            rows = session.execute(query).all()
            usage = self.models.usage_by_run({run.id for run, _, _ in rows})
            empty = empty_usage()
            designs = {
                revision.id: Design.model_validate(revision.design) for _, _, revision in rows
            }
            return [
                self.run_summary(
                    run,
                    designs[revision.id],
                    Treatment.model_validate(condition.specification),
                    revision.number,
                    usage.get(run.id, empty),
                )
                for run, condition, revision in rows
            ]

    def studies(self) -> list[dict]:
        with self.db.session() as session:
            records = session.scalars(
                select(Study).where(Study.revision > 0).order_by(Study.created.desc())
            ).all()
            revisions = session.scalars(
                select(Revision)
                .join(Study, Study.id == Revision.study_id)
                .where(Revision.number == Study.revision)
            ).all()
            latest = {r.study_id: r for r in revisions}
            status_rows = session.execute(
                select(Revision.study_id, Run.status)
                .join(Condition, Condition.revision_id == Revision.id)
                .join(Run, Run.condition_id == Condition.id)
                .join(Study, Study.id == Revision.study_id)
                .where(Revision.number == Study.revision)
            ).all()
            by_study: dict[str, list[str]] = defaultdict(list)
            for key, status in status_rows:
                by_study[key].append(status)
            result = []
            for study in records:
                design = Design.model_validate(latest[study.id].design)
                statuses = by_study[study.id]
                counts = Counter(statuses)
                status = study_status(statuses)
                result.append(
                    {
                        "id": study.id,
                        "title": study.title,
                        "question": study.question,
                        "created": study.created,
                        "revision": study.revision,
                        "environment": design.environment,
                        "status": status,
                        "run_count": len(statuses),
                        "completed_runs": counts["complete"],
                        "cost_usd": study.charged / 1_000_000,
                        "budget_usd": study.ceiling / 1_000_000,
                    }
                )
            return result

    def operational_runs(self, study_id: str, number: int | None = None) -> list[OperationalRun]:
        """Read a revision's runnable identities without computing report statistics."""
        with self.db.session() as session:
            study = session.get_one(Study, study_id)
            rows = session.execute(
                select(Run.id, Run.turn)
                .join(Condition, Condition.id == Run.condition_id)
                .join(Revision, Revision.id == Condition.revision_id)
                .where(Revision.study_id == study_id, Revision.number == (number or study.revision))
                .order_by(Run.created.desc())
            ).all()
        return [OperationalRun(run_id, turn) for run_id, turn in rows]

    def study(self, study_id: str, number: int | None = None) -> dict:
        with self.db.session() as session:
            study = session.get_one(Study, study_id)
            revision = session.scalars(
                select(Revision).where(
                    Revision.study_id == study_id, Revision.number == (number or study.revision)
                )
            ).one()
            revisions = session.scalars(
                select(Revision)
                .where(Revision.study_id == study_id)
                .order_by(Revision.number.desc())
            ).all()
        selected_ids = {run.id for run in self.operational_runs(study_id, revision.number)}
        summaries = self.runs(study_id, run_ids=selected_ids)
        with self.db.session() as session:
            attempted = set(
                session.scalars(
                    select(ParticipantActivation.run_id)
                    .where(ParticipantActivation.run_id.in_(selected_ids))
                    .distinct()
                )
            )
        completed = [run for run in summaries if run["status"] == "complete"]
        metrics = self.metrics_many({run["id"] for run in completed})
        effort = self.participant_effort({run["id"]: run["turn"] + 1 for run in summaries})
        comparison = compare_runs(
            [
                ComparisonRun(
                    run_id=run["id"],
                    condition_key=run["condition_key"],
                    seed=run["seed"],
                    repetition=run["repetition"],
                    status=run["status"],
                    through_turn=run["turn"],
                    attempted=run["turn"] > 0
                    or run["id"] in attempted
                    or run["status"] == "failed",
                    metrics=metrics.get(run["id"], {}),
                    error=run["error"],
                    effort=effort[run["id"]],
                )
                for run in summaries
            ],
            Design.model_validate(revision.design),
        )
        comparison["comparison"]["revision"] = revision.number
        comparison["comparison"]["design_sha256"] = revision.sha256
        check = self.preflight(
            Design.model_validate(revision.design),
            revision.source.removeprefix("plan:") if revision.source.startswith("plan:") else None,
        )
        with self.db.session() as session:
            versions = session.execute(
                select(Run.status, Run.checkpoint["rule_version"].as_string())
                .join(Condition, Run.condition_id == Condition.id)
                .where(Condition.revision_id == revision.id)
            ).all()
        current_version = get_environment(revision.design["environment"]).world.version
        incompatible = [
            (status, version) for status, version in versions if version != current_version
        ]
        if incompatible:
            blocked = any(status != "complete" for status, _ in incompatible)
            check["issues"].append(
                {
                    "code": "historical_rules",
                    "severity": "error" if blocked else "warning",
                    "message": "Saved runs use a different rule version. Evidence stays readable; "
                    "replay/resume requires its original engine. "
                    "Save a new revision for current rules. "
                    "The mechanical checks below use current rules.",
                }
            )
            check["status"] = "blocked" if blocked or check["status"] == "blocked" else "review"
        return {
            "id": study_id,
            "design": revision.design,
            "revision": revision.number,
            "sha256": revision.sha256,
            "plan_id": revision.source.removeprefix("plan:")
            if revision.source.startswith("plan:")
            else None,
            "created": study.created,
            "revisions": [
                {"number": r.number, "created": r.created, "sha256": r.sha256} for r in revisions
            ],
            "runs": summaries,
            **comparison,
            "usage": self.models.usage(study_id=study_id),
            "preflight": check,
        }

    def run(self, run_id: str) -> dict:
        run, design, condition = self.configuration(run_id)
        with self.db.session() as session:
            revision = session.execute(
                select(Revision.number)
                .join(Condition, Condition.revision_id == Revision.id)
                .where(Condition.id == run.condition_id)
            ).scalar_one()
            calls = session.scalars(
                select(ProviderCall)
                .where(ProviderCall.run_id == run_id)
                .order_by(ProviderCall.created)
            ).all()
            turns = session.scalars(
                select(Turn).where(Turn.run_id == run_id).order_by(Turn.number)
            ).all()
            events = session.scalars(
                select(RecordedEvent)
                .where(RecordedEvent.run_id == run_id)
                .order_by(RecordedEvent.id)
            ).all()
            measurements = session.scalars(
                select(Measurement).where(Measurement.run_id == run_id).order_by(Measurement.id)
            ).all()
        blocked = None
        if run.checkpoint["rule_version"] != get_environment(design.environment).world.version:
            blocked = (
                "Saved rules differ from this engine. Inspect evidence or save a new revision; "
                "this run cannot resume or replay here."
            )
        elif design.environment in {"sealed_relay", "reviewed_finite"}:
            assert design.environment_source and design.environment_source.definition.extension
            try:
                self.extensions.check_runtime(design.environment_source.definition.extension)
            except ValueError as error:
                blocked = str(error)
        return {
            "summary": self.run_summary(run, design, condition, revision),
            "design": design.model_dump(),
            "parameters": condition.parameters.model_dump(),
            "harness": condition.harness.model_dump(),
            "activations": self.activations(run_id),
            "effort": self.participant_effort({run_id: run.turn + 1})[run_id],
            "next_actor": self.world(design, condition.parameters, run.seed, run.checkpoint).actor()
            if run.checkpoint["rule_version"] == get_environment(design.environment).world.version
            else None,
            "execution_blocked": blocked,
            "requests": [
                {
                    "id": c.id,
                    "activation_id": c.activation_id,
                    "analysis_id": c.analysis_id,
                    "purpose": c.purpose,
                    "model": c.model,
                    "turn": c.turn,
                    "status": c.status,
                    "error": c.error,
                    "created": c.created,
                    "input_tokens": c.input_tokens,
                    "output_tokens": c.output_tokens,
                    "cost_usd": c.charged / 1_000_000,
                }
                for c in calls
            ],
            "state": run.checkpoint,
            "turns": [
                {
                    "number": t.number,
                    "round": t.round,
                    "actor": t.actor,
                    "action": t.decision["action"],
                    "rationale": t.decision["rationale"],
                    "latency_ms": t.latency_ms,
                }
                for t in turns
            ],
            "events": [event_dict(e) for e in events],
            "measurements": [
                {
                    "turn": m.turn,
                    "round": m.round,
                    "key": m.key,
                    "value": m.value,
                    "denominator": m.denominator,
                    "agent": m.agent,
                    "version": m.version,
                }
                for m in measurements
            ],
            "metrics": self.metrics(run_id),
            "relationships": self.relationships(events),
        }

    def capture_exposure(self, cutoffs: dict[str, int]) -> dict:
        # Analysis capture runs off the API loop: the Engine can advance while
        # these reads run, so always carry the accepted turn into the reader.
        return {
            rid: self.exposure(rid, cutoff, include_pending=True) for rid, cutoff in cutoffs.items()
        }

    def exposure(
        self, run_id: str, through_turn: int | None = None, *, include_pending: bool = False
    ) -> dict:
        run, design, condition = self.configuration(run_id)
        cutoff = run.turn if through_turn is None else through_turn
        if cutoff < 0 or cutoff > run.turn:
            raise ValueError("Exposure cutoff is outside recorded evidence")
        # Explicit historical turn cutoffs exclude later activations, including
        # observations made after the last event at that boundary. Current capture
        # also retains uncommitted attempts, with exact frozen membership.
        attempt_cutoff = cutoff + (through_turn is None or (include_pending and cutoff == run.turn))
        with self.db.session() as session:
            revision = session.scalars(
                select(Revision)
                .join(Condition, Condition.revision_id == Revision.id)
                .where(Condition.id == run.condition_id)
            ).one()
            activations = session.scalars(
                select(ParticipantActivation)
                .where(
                    ParticipantActivation.run_id == run_id,
                    ParticipantActivation.turn <= attempt_cutoff,
                )
                .order_by(ParticipantActivation.created, ParticipantActivation.id)
            ).all()
            ids = [a.id for a in activations]
            calls = session.scalars(
                select(ProviderCall)
                .where(ProviderCall.activation_id.in_(ids))
                .order_by(ProviderCall.created, ProviderCall.id)
            ).all()
            events = session.scalars(
                select(RecordedEvent)
                .where(RecordedEvent.run_id == run_id, RecordedEvent.turn <= cutoff)
                .order_by(RecordedEvent.id)
            ).all()
            operations: dict[str, list[int]] = {key: [] for key in ids}
            artifact_reads = []
            for operation in session.scalars(
                select(ParticipantOperation)
                .where(ParticipantOperation.activation_id.in_(ids))
                .order_by(ParticipantOperation.number)
            ):
                operations[operation.activation_id].append(operation.number)
                if operation.kind == "read_artifact" and operation.status == "complete":
                    artifact_reads.append(operation)
        return exposure_report(
            run,
            design,
            condition,
            revision,
            activations,
            calls,
            events,
            operations,
            through_turn=cutoff,
            artifact_reads=artifact_reads,
        )

    def activations(self, run_id: str) -> list[dict]:
        with self.db.session() as session:
            rows = session.scalars(
                select(ParticipantActivation)
                .where(ParticipantActivation.run_id == run_id)
                .order_by(ParticipantActivation.created, ParticipantActivation.id)
            ).all()
            journals: dict[str, list[dict]] = {row.id: [] for row in rows}
            if rows:
                for op in session.scalars(
                    select(ParticipantOperation)
                    .where(ParticipantOperation.activation_id.in_(journals))
                    .order_by(ParticipantOperation.number)
                ):
                    journals[op.activation_id].append(operation_record(op))
            return [activation_record(row, journals[row.id]) for row in rows]

    def evidence(self, run_id: str, number: int) -> dict:
        run, design, condition = self.configuration(run_id)
        if number < 0 or number > run.turn:
            raise ValueError("Turn is outside this run's recorded evidence")
        with self.db.session() as session:
            if number == 0:
                if run.turn == 0:
                    checkpoint = run.checkpoint
                elif (
                    run.checkpoint["rule_version"]
                    != get_environment(design.environment).world.version
                ):
                    raise ValueError(
                        "Initial state cannot be reconstructed with different rules; "
                        "inspect recorded turns"
                    )
                else:
                    checkpoint = self.world(design, condition.parameters, run.seed).snapshot()
                return {
                    "round": checkpoint["round"],
                    "number": 0,
                    "actor": None,
                    "observation": {},
                    "decision": {},
                    "checkpoint": checkpoint,
                    "events": [],
                    "state_hash": None,
                }
            turn = session.scalars(
                select(Turn).where(Turn.run_id == run_id, Turn.number == number)
            ).one()
            events = session.scalars(
                select(RecordedEvent).where(
                    RecordedEvent.run_id == run_id, RecordedEvent.turn == number
                )
            ).all()
            return {
                "number": number,
                "round": turn.round,
                "actor": turn.actor,
                "observation": turn.observation,
                "decision": turn.decision,
                "checkpoint": turn.checkpoint,
                "state_hash": turn.state_hash,
                "events": [event_dict(e) for e in events],
            }

    def metrics(self, run_id: str) -> dict[str, float]:
        return self.metrics_many({run_id})[run_id]

    def capture_comparisons(self, cutoffs: dict[str, int]) -> dict:
        """Freeze sample membership, run disposition and terminal metrics together."""
        with self.db.session() as session:
            rows = session.execute(
                select(Run, Condition, Revision)
                .join(Condition, Run.condition_id == Condition.id)
                .join(Revision, Condition.revision_id == Revision.id)
                .where(Run.id.in_(cutoffs))
            ).all()
            measures = session.scalars(
                select(Measurement).where(Measurement.run_id.in_(cutoffs)).order_by(Measurement.id)
            ).all()
            activations = session.execute(
                select(ParticipantActivation.run_id, ParticipantActivation.turn).where(
                    ParticipantActivation.run_id.in_(cutoffs)
                )
            ).all()
        effort = self.participant_effort(
            {run.id: cutoffs[run.id] + (run.turn == cutoffs[run.id]) for run, _, _ in rows}
        )
        values: dict[str, list[tuple[str, float | None]]] = defaultdict(list)
        for measure in measures:
            if measure.turn <= cutoffs[measure.run_id]:
                values[measure.run_id].append((measure.key, measure.value))
        attempted = {rid for rid, turn in activations if turn <= cutoffs[rid] + 1}
        groups: dict[str, list[ComparisonRun]] = defaultdict(list)
        revisions = {}
        for run, condition, revision in rows:
            cutoff = cutoffs[run.id]
            state = (
                run.checkpoint
                if run.turn == cutoff
                else self.evidence(run.id, cutoff)["checkpoint"]
            )
            terminal = state["done"]
            status = "complete" if terminal else run.status if run.turn == cutoff else "cutoff"
            groups[revision.id].append(
                ComparisonRun(
                    run_id=run.id,
                    condition_key=condition.key,
                    seed=run.seed,
                    repetition=run.repetition,
                    status=status,
                    through_turn=cutoff,
                    attempted=cutoff > 0 or run.id in attempted or status == "failed",
                    metrics=aggregate_metrics(values[run.id]) if terminal else {},
                    error=run.error if run.turn == cutoff else None,
                    effort=effort[run.id],
                )
            )
            revisions[revision.id] = revision
        comparisons = {}
        for key, group in groups.items():
            revision = revisions[key]
            result = compare_runs(group, Design.model_validate(revision.design))
            result["comparison"].update(revision=revision.number, design_sha256=revision.sha256)
            comparisons[key] = result
        return comparisons

    def participant_effort(self, through_turns: dict[str, int]) -> dict[str, dict]:
        """Capture all recorded attempts/charges, independently of terminal eligibility."""
        result = {run_id: empty_effort() for run_id in through_turns}
        charges = dict.fromkeys(through_turns, 0)
        with self.db.session() as session:
            activations = session.scalars(
                select(ParticipantActivation).where(ParticipantActivation.run_id.in_(through_turns))
            ).all()
            allowed = {a.id: a for a in activations if a.turn <= through_turns[a.run_id]}
            journal = session.scalars(
                select(ParticipantOperation).where(ParticipantOperation.activation_id.in_(allowed))
            ).all()
            calls = session.scalars(
                select(ProviderCall).where(ProviderCall.activation_id.in_(allowed))
            ).all()
        for activation in allowed.values():
            effort = result[activation.run_id]
            effort["activations"] += 1
            effort["inference_attempts"] += activation.requests
            effort["committed_decisions"] += activation.status == "committed"
            reason = activation.stop_reason or "in_progress"
            effort["stop_reasons"][reason] = effort["stop_reasons"].get(reason, 0) + 1
            source = {
                key: value
                for key, value in activation.identity.items()
                if key.endswith("implementation_sha256") or key == "versions"
            }
            if source not in effort["implementation_sources"]:
                effort["implementation_sources"].append(source)
        for op in journal:
            effort = result[allowed[op.activation_id].run_id]
            if op.kind in {
                "observe",
                "rules",
                "legal_options",
                "read_artifact",
                *OPERATION_CAPABILITY,
            }:
                effort["tool_attempts"] += 1
                effort["tool_operations"] += op.status == "complete"
            elif op.kind == "reference":
                effort["scripted_attempts"] += 1
                effort["scripted_decisions"] += op.status == "complete"
        for call in calls:
            assert call.activation_id is not None
            effort = result[allowed[call.activation_id].run_id]
            usage = effort["usage"]
            usage["requests"] += 1
            usage["input_tokens"] += call.input_tokens
            usage["output_tokens"] += call.output_tokens
            charges[allowed[call.activation_id].run_id] += call.charged
            usage["partial"] |= call.status in {"pending", "unknown"}
            effort["reasoning_tokens"] += call.reasoning_tokens
            statuses = effort["request_statuses"]
            statuses[call.status] = statuses.get(call.status, 0) + 1
        for run_id, charged in charges.items():
            result[run_id]["usage"]["cost_usd"] = charged / 1_000_000
        return result

    def metrics_many(self, run_ids: set[str]) -> dict[str, dict[str, float]]:
        with self.db.session() as session:
            measures = session.scalars(
                select(Measurement).where(Measurement.run_id.in_(run_ids)).order_by(Measurement.id)
            ).all()
        groups: dict[str, list[tuple[str, float | None]]] = {key: [] for key in run_ids}
        for measure in measures:
            groups[measure.run_id].append((measure.key, measure.value))
        return {run_id: aggregate_metrics(values) for run_id, values in groups.items()}

    @staticmethod
    def relationships(events: Sequence[RecordedEvent]) -> list[dict]:
        pairs: dict[tuple[str, str], dict] = {}
        for event in events:
            if (
                not event.actor
                or not event.target
                or event.kind
                not in (
                    "transfer",
                    "resource_transfer",
                    "message",
                    "claim",
                    "commitment_resolved",
                    "message_delivered",
                    "handoff_work",
                    "accept_handoff",
                )
            ):
                continue
            row = pairs.setdefault(
                (event.actor, event.target),
                {
                    "source": event.actor,
                    "target": event.target,
                    "transfers": 0.0,
                    "interactions": 0,
                    "kept": 0,
                    "eligible_promises": 0,
                    "false_reports": 0,
                    "claims": 0,
                },
            )
            row["interactions"] += 1
            if event.kind in {"transfer", "resource_transfer"}:
                row["transfers"] += event.data["amount"]
            if event.kind == "claim":
                row["claims"] += 1
                row["false_reports"] += not event.data["accurate"]
            if event.kind == "commitment_resolved" and event.data.get("eligible", True):
                row["eligible_promises"] += 1
                row["kept"] += event.data["fulfilled"]
        return list(pairs.values())
