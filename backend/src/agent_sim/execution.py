import asyncio
import time
from dataclasses import dataclass

from sqlalchemy import select, update

from .db import (
    Database,
    Measurement,
    ParticipantActivation,
    ParticipantOperation,
    RecordedEvent,
    Run,
    Turn,
    digest,
    now,
)
from .diagnostics import log_failure
from .domain import Decision, ReadArtifact
from .llm import LanguageModels, ProviderFailure
from .participants import Activation
from .participants import operations as activation_record_operations
from .research import Research
from .simulation.environments import get_environment


@dataclass
class Execution:
    task: asyncio.Task | None = None
    stop: bool = False


class Engine:
    def __init__(
        self, db: Database, research: Research, models: LanguageModels, concurrency: int = 3
    ):
        self.db, self.research, self.models = db, research, models
        self.executions: dict[str, Execution] = {}
        if not 1 <= concurrency <= 16:
            raise ValueError("Concurrent runs must be between 1 and 16")
        self.concurrency = concurrency
        self.capacity = asyncio.Semaphore(concurrency)
        self.closing = False
        with db.session.begin() as session:
            session.execute(
                update(ParticipantActivation)
                .where(ParticipantActivation.status == "running")
                .values(
                    status="interrupted",
                    stop_reason="server_restart",
                    error="Server stopped; this attempt will not be retried.",
                    updated=now(),
                )
            )
            session.execute(
                update(Run)
                .where(Run.status.in_(["running", "queued", "pausing"]))
                .values(
                    status="paused",
                    error="Server stopped. Saved evidence is intact; resume explicitly.",
                )
            )
        models.recover()

    def start(self, run_id: str, *, single: bool = False) -> None:
        """Enqueue a run on the current event loop without waiting for completion."""
        loop = asyncio.get_running_loop()
        if self.closing:
            raise ValueError("Server is stopping")
        if self._preflight(run_id):
            self._enqueue(loop, run_id, single=single)

    def _preflight(self, run_id: str) -> bool:
        """Check eligibility without changing run state or scheduling work."""
        existing = self.executions.get(run_id)
        if existing and existing.task and not existing.task.done():
            return False
        run, design, condition = self.research.configuration(run_id)
        if run.status == "complete":
            return False
        self.research.check_run(run_id)
        if run.checkpoint.get("rule_version") != get_environment(design.environment).world.version:
            raise ValueError("This saved run requires a different environment rule version")
        if condition.harness.kind != "scripted":
            for model in {p.model or condition.model for p in design.profiles}:
                self.models.model(model)
        return True

    def _enqueue(
        self, loop: asyncio.AbstractEventLoop, run_id: str, *, single: bool = False
    ) -> None:
        with self.db.session.begin() as session:
            saved = session.get_one(Run, run_id)
            saved.status, saved.error = "queued", None
        execution = Execution()
        self.executions[run_id] = execution
        execution.task = loop.create_task(
            self._run(run_id, execution, single), name=f"run-{run_id}"
        )

    def pause(self, run_id: str) -> None:
        execution = self.executions.get(run_id)
        if execution:
            execution.stop = True
        with self.db.session.begin() as session:
            run = session.get_one(Run, run_id)
            if run.status != "complete":
                run.status = "pausing" if run.status == "running" else "paused"

    async def _run(self, run_id: str, execution: Execution, single: bool) -> None:
        try:
            async with self.capacity:
                while not execution.stop:
                    run, design, condition = self.research.configuration(run_id)
                    world = self.research.world(
                        design, condition.parameters, run.seed, run.checkpoint
                    )
                    actor = world.actor()
                    if actor is None:
                        self._status(run_id, "complete")
                        return
                    self._status(run_id, "running")
                    observation = world.observe(actor)
                    profile = next(p for p in design.profiles if p.key == actor)
                    observation["you"] = profile.model_dump()
                    started = time.monotonic()
                    activation = Activation(
                        self.models, run, design, condition, world, actor, profile, observation
                    )
                    decision = await activation.decide(lambda: execution.stop)
                    if decision is None:
                        self._status(run_id, "paused")
                        return
                    # A final response commits even when Pause arrived while awaiting it.
                    try:
                        if design.environment == "sealed_relay":
                            events, measures = await asyncio.to_thread(world.step, actor, decision)
                        else:
                            events, measures = world.step(actor, decision)
                    except ValueError as error:
                        activation.append("reject", decision.model_dump(), str(error), "rejected")
                        activation.finish("failed", "world_rejected", str(error))
                        raise
                    checkpoint = world.snapshot()
                    number = run.turn + 1
                    operation_number = (
                        len(activation_record_operations(self.models, activation.row.id)) + 1
                    )
                    with self.db.session.begin() as session:
                        changed = session.execute(
                            update(Run)
                            .where(Run.id == run_id, Run.turn == run.turn)
                            .values(
                                turn=number,
                                round=observation["round"],
                                checkpoint=checkpoint,
                                status="complete"
                                if world.actor() is None
                                else "paused"
                                if execution.stop or single
                                else "running",
                                updated=now(),
                                error=None,
                            )
                            .returning(Run.id)
                        ).scalar_one_or_none()
                        if changed is None:
                            raise ValueError(
                                "Run advanced in another writer; refusing to overwrite evidence"
                            )
                        session.add(
                            Turn(
                                run_id=run_id,
                                number=number,
                                round=observation["round"],
                                actor=actor,
                                observation=observation,
                                decision=decision.model_dump(),
                                checkpoint=checkpoint,
                                state_hash=digest(checkpoint),
                                latency_ms=round((time.monotonic() - started) * 1000),
                            )
                        )
                        session.add_all(
                            [
                                RecordedEvent(
                                    run_id=run_id,
                                    turn=number,
                                    round=observation["round"],
                                    **event.model_dump(),
                                )
                                for event in events
                            ]
                        )
                        session.add_all(
                            [
                                Measurement(
                                    run_id=run_id,
                                    turn=number,
                                    round=observation["round"],
                                    **measure.model_dump(),
                                )
                                for measure in measures
                            ]
                        )
                        session.execute(
                            update(ParticipantActivation)
                            .where(ParticipantActivation.id == activation.row.id)
                            .values(
                                status="committed", stop_reason="decision_committed", updated=now()
                            )
                        )
                        session.add(
                            ParticipantOperation(
                                activation_id=activation.row.id,
                                number=operation_number,
                                kind="settle",
                                status="complete",
                                request={},
                                result={"settled_turn": number, "state_hash": digest(checkpoint)},
                            )
                        )
                    if world.actor() is None or single:
                        return
                    await asyncio.sleep(0)
                self._status(run_id, "paused")
        except asyncio.CancelledError:
            self._status(
                run_id,
                "paused",
                "Request interrupted; last committed checkpoint retained. Usage may be unknown.",
            )
            raise
        except (ValueError, ProviderFailure) as error:
            if isinstance(error, ValueError):
                log_failure(f"Run {run_id} failed", error)
            self._status(run_id, "failed", str(error))
        except Exception as error:
            log_failure(f"Run {run_id} failed", error)
            self._status(
                run_id, "failed", f"Execution failed ({type(error).__name__}); checkpoint retained."
            )

    def _status(self, run_id: str, status: str, error: str | None = None) -> None:
        with self.db.session.begin() as session:
            run = session.get_one(Run, run_id)
            run.status, run.error, run.updated = status, error, now()
            if error and status in {"failed", "paused"}:
                session.execute(
                    update(ParticipantActivation)
                    .where(
                        ParticipantActivation.run_id == run_id,
                        ParticipantActivation.status == "running",
                    )
                    .values(
                        status="failed" if status == "failed" else "interrupted",
                        stop_reason="execution_failure" if status == "failed" else "cancelled",
                        error=error,
                        updated=now(),
                    )
                )

    def start_study(self, study_id: str) -> None:
        loop = asyncio.get_running_loop()
        if self.closing:
            raise ValueError("Server is stopping")
        candidates = [
            run.id for run in self.research.operational_runs(study_id) if self._preflight(run.id)
        ]
        for run_id in candidates:
            self._enqueue(loop, run_id)

    def pause_study(self, study_id: str) -> None:
        for run in self.research.operational_runs(study_id):
            self.pause(run.id)

    def replay(self, run_id: str) -> dict:
        run, design, condition = self.research.configuration(run_id)
        world = self.research.world(design, condition.parameters, run.seed)
        if run.checkpoint["rule_version"] != world.version:
            raise ValueError("This saved run requires a different environment rule version")
        with self.db.session() as session:
            turns = session.scalars(
                select(Turn).where(Turn.run_id == run_id).order_by(Turn.number)
            ).all()
        checkpoints = {0: world.snapshot()}
        consequence_record = (
            self.research.run(run_id)
            if design.environment in {"artifact_workspace", "sealed_relay"}
            else None
        )
        checked_events = checked_measures = 0
        for turn in turns:
            if world.actor() != turn.actor:
                raise ValueError(f"Actor mismatch at turn {turn.number}")
            observed = world.observe(turn.actor)
            observed["you"] = next(p.model_dump() for p in design.profiles if p.key == turn.actor)
            if observed != turn.observation:
                raise ValueError(f"Observation mismatch at turn {turn.number}")
            events, measures = world.step(turn.actor, Decision.model_validate(turn.decision))
            if consequence_record is not None:
                recorded_events = [
                    {
                        key: event[key]
                        for key in ("kind", "actor", "target", "visibility", "text", "data")
                    }
                    for event in consequence_record["events"]
                    if event["turn"] == turn.number and event["round"] == turn.round
                ]
                recorded_measures = [
                    {key: measure[key] for key in ("key", "value", "denominator", "agent")}
                    for measure in consequence_record["measurements"]
                    if measure["turn"] == turn.number
                    and measure["round"] == turn.round
                    and measure["version"] == 1
                ]
                if recorded_events != [event.model_dump() for event in events]:
                    raise ValueError(f"World consequence mismatch at turn {turn.number}")
                if recorded_measures != [measure.model_dump() for measure in measures]:
                    raise ValueError(f"World measurement mismatch at turn {turn.number}")
                checked_events += len(recorded_events)
                checked_measures += len(recorded_measures)
            if digest(world.snapshot()) != turn.state_hash or world.snapshot() != turn.checkpoint:
                raise ValueError(f"State mismatch at turn {turn.number}")
            checkpoints[turn.number] = world.snapshot()
        if len(turns) != run.turn or world.snapshot() != run.checkpoint:
            raise ValueError("Run checkpoint does not match recorded consequences")
        if consequence_record is not None and (
            checked_events != len(consequence_record["events"])
            or checked_measures != len(consequence_record["measurements"])
        ):
            raise ValueError("World consequences contain unrecorded turn references")
        result = {"verified_turns": len(turns), "model_requests": 0, "rule_version": world.version}
        if design.environment in {"artifact_workspace", "sealed_relay"}:
            reads = rejections = 0
            for activation in self.research.activations(run_id):
                prior = checkpoints.get(activation["turn"] - 1)
                if prior is None or digest(prior) != activation["checkpoint_hash"]:
                    raise ValueError("Activation checkpoint mismatch")
                restored = self.research.world(design, condition.parameters, run.seed, prior)
                actor = activation["actor"]
                if restored.actor() != actor:
                    raise ValueError("Activation actor mismatch")
                observed = restored.observe(actor)
                observed["you"] = next(p.model_dump() for p in design.profiles if p.key == actor)
                if observed != activation["observation"]:
                    raise ValueError("Activation observation mismatch")
                for operation in activation["operations"]:
                    if (
                        operation["kind"] == "read_artifact"
                        or operation["request"].get("operation") == "read_artifact"
                    ) and operation["request"].get("operation") != operation["kind"]:
                        raise ValueError("Artifact read operation mismatch")
                    if operation["kind"] == "read_artifact":
                        request = operation["request"]
                        error = None
                        actual = None
                        if request.get("read") is None or any(
                            request.get(field) is not None
                            for field in (
                                "decision",
                                "plan",
                                "retrieval",
                                "investigation",
                                "verification",
                            )
                        ):
                            error = "Unexpected operation payload."
                        elif "read_artifact" not in condition.harness.tools:
                            error = "Operation is not authorized by this harness."
                        elif (
                            sum(
                                prior_op["kind"]
                                in {
                                    "observe",
                                    "rules",
                                    "legal_options",
                                    "read_artifact",
                                    "plan",
                                    "retrieve",
                                    "investigate",
                                    "verify",
                                    "decide",
                                }
                                for prior_op in activation["operations"]
                                if prior_op["number"] < operation["number"]
                            )
                            >= condition.harness.max_tool_operations
                        ):
                            error = "Tool-operation limit reached."
                        else:
                            try:
                                actual = restored.read(
                                    actor, ReadArtifact.model_validate(request["read"])
                                )
                            except ValueError as failure:
                                error = str(failure)
                        if (
                            error is None
                            and operation["status"] == "complete"
                            and actual == operation["result"]
                        ):
                            reads += 1
                        elif (
                            error is not None
                            and operation["status"] == "rejected"
                            and error == operation["result"]
                        ):
                            rejections += 1
                        else:
                            raise ValueError("Artifact read receipt mismatch")
                        if restored.snapshot() != prior:
                            raise ValueError("Artifact read changed the checkpoint")
                    elif operation["kind"] == "reject" and operation["status"] == "rejected":
                        try:
                            restored.step(actor, Decision.model_validate(operation["request"]))
                        except ValueError as error:
                            if str(error) != operation["result"] or restored.snapshot() != prior:
                                raise ValueError("World rejection receipt mismatch") from error
                        else:
                            raise ValueError("Recorded World rejection was not rejected")
                        rejections += 1
            result["verified_reads"] = reads
            result["verified_rejections"] = rejections
        return result

    async def close(self) -> None:
        self.closing = True
        for execution in self.executions.values():
            execution.stop = True
        await asyncio.gather(
            *(e.task for e in self.executions.values() if e.task), return_exceptions=True
        )
