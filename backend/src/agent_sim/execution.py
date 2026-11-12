import asyncio
import json
import time
from dataclasses import dataclass

from sqlalchemy import select, update

from .adjudication import INSTRUCTIONS as ADJUDICATION_INSTRUCTIONS
from .db import (
    Database,
    InvestigationRecord,
    Measurement,
    ParticipantActivation,
    ParticipantOperation,
    ProviderCall,
    RecordedEvent,
    Run,
    Turn,
    digest,
    now,
)
from .diagnostics import log_failure
from .domain import AdjudicationRuling, Decision, ReadArtifact, RecordedAdjudication, Treatment
from .investigation_limits import InvestigationStopped, claim_turn, claim_work
from .llm import LanguageModels, ProviderFailure
from .participants import Activation, event_wait
from .participants import operations as activation_record_operations
from .research import Research


@dataclass
class Execution:
    task: asyncio.Task | None = None
    stop: bool = False


class AdjudicationPaused(Exception):
    """No judge reservation or request has started; retain the proposed decision."""


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
        self.start_lock = asyncio.Lock()
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

    async def start(self, run_id: str, *, single: bool = False) -> None:
        """Enqueue a run on the current event loop without waiting for completion."""
        loop = asyncio.get_running_loop()
        if self.closing:
            raise ValueError("Server is stopping")
        async with self.start_lock:
            existing = self.executions.get(run_id)
            if existing and existing.task and not existing.task.done():
                return
            preparing = Execution()
            self.executions[run_id] = preparing
            try:
                eligible = await asyncio.to_thread(self._preflight, run_id)
                if eligible and not preparing.stop and not self.closing:
                    self._enqueue(loop, run_id, single=single)
            finally:
                if self.executions.get(run_id) is preparing:
                    del self.executions[run_id]

    def _preflight(self, run_id: str) -> bool:
        """Check eligibility without changing run state or scheduling work."""
        existing = self.executions.get(run_id)
        if existing and existing.task and not existing.task.done():
            return False
        run, design, condition = self.research.configuration(run_id)
        if run.status == "complete":
            return False
        if run.investigation_id:
            with self.db.session() as session:
                parent = session.get_one(InvestigationRecord, run.investigation_id)
                if parent.status != "running":
                    raise InvestigationStopped(parent.status)
                if session.scalar(
                    select(ParticipantActivation.id)
                    .where(
                        ParticipantActivation.run_id == run_id,
                        ParticipantActivation.turn == run.turn + 1,
                        ParticipantActivation.status.in_(["failed", "interrupted"]),
                    )
                    .limit(1)
                ):
                    raise InvestigationStopped("interrupted_turn_requires_new_attempt")
        self.research.check_run(run_id)
        if condition.harness.kind != "scripted":
            for model in {p.model or condition.model for p in design.profiles}:
                self.models.model(model)
        if condition.adjudicator is not None:
            self.models.model(condition.adjudicator.model)
        return True

    def _enqueue(
        self, loop: asyncio.AbstractEventLoop, run_id: str, *, single: bool = False
    ) -> None:
        with self.db.session.begin() as session:
            saved = session.get_one(Run, run_id)
            if not saved.investigation_started and saved.investigation_id:
                claim_work(self.db, saved.investigation_id, "runs")
                saved.investigation_started = True
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
                if run.investigation_id:
                    parent = session.get_one(InvestigationRecord, run.investigation_id)
                    if parent.status == "running":
                        parent.status = "pausing"
                        parent.decisions = [
                            *parent.decisions,
                            {"at": now(), "decision": "pause_requested", "run_id": run_id},
                        ]

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
                    if run.investigation_id:
                        claim_turn(self.db, run_id)
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
                    receipt = None
                    try:
                        inputs = world.adjudication_inputs(actor, decision)
                        if inputs is not None:
                            if execution.stop:
                                activation.finish("paused", "user_pause")
                                self._status(run_id, "paused")
                                return
                            adjudicator = condition.adjudicator
                            if adjudicator is None:
                                raise ValueError("Declare the adjudicator before execution")
                            request_ids: list[str] = []

                            def before_reserve() -> None:
                                if execution.stop:
                                    raise AdjudicationPaused

                            ruling = await self.models.generate(
                                AdjudicationRuling,
                                model=adjudicator.model,
                                prompt=json.dumps(inputs),
                                instructions=ADJUDICATION_INSTRUCTIONS,
                                purpose="adjudication",
                                study_id=run.study_id,
                                run_id=run_id,
                                turn=run.turn + 1,
                                max_tokens=adjudicator.response_tokens,
                                openai_reasoning_effort=adjudicator.openai_reasoning_effort,
                                on_reserved=request_ids.append,
                                before_reserve=before_reserve,
                            )
                            receipt = RecordedAdjudication(
                                mechanism=inputs["mechanism"],
                                version=inputs["version"],
                                adjudicator=adjudicator,
                                inputs=inputs,
                                ruling=ruling,
                                request_id=request_ids[0],
                            ).model_dump()
                            events, measures = world.settle_adjudication(actor, decision, receipt)
                        elif design.environment in {"sealed_relay", "reviewed_finite"}:
                            events, measures = await asyncio.to_thread(world.step, actor, decision)
                        else:
                            events, measures = world.step(actor, decision)
                    except AdjudicationPaused:
                        activation.finish("paused", "user_pause")
                        self._status(run_id, "paused")
                        return
                    except ValueError as error:
                        rejected = (
                            {"decision": decision.model_dump(), "adjudication": receipt}
                            if receipt is not None
                            else decision.model_dump()
                        )
                        activation.append("reject", rejected, str(error), "rejected")
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
        except InvestigationStopped as error:
            self._status(run_id, "failed", error.reason)
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

    async def start_study(self, study_id: str) -> None:
        loop = asyncio.get_running_loop()
        if self.closing:
            raise ValueError("Server is stopping")
        async with self.start_lock:
            preparing = {
                run.id: Execution()
                for run in self.research.operational_runs(study_id)
                if not (
                    (existing := self.executions.get(run.id))
                    and existing.task
                    and not existing.task.done()
                )
            }
            self.executions.update(preparing)
            try:
                candidates = await asyncio.to_thread(
                    lambda: [run_id for run_id in preparing if self._preflight(run_id)]
                )
                for run_id in candidates:
                    if not preparing[run_id].stop and not self.closing:
                        self._enqueue(loop, run_id)
            finally:
                for run_id, execution in preparing.items():
                    if self.executions.get(run_id) is execution:
                        del self.executions[run_id]

    def pause_study(self, study_id: str) -> None:
        for run in self.research.operational_runs(study_id):
            self.pause(run.id)

    def _check_adjudication(
        self, run: Run, turn: int, condition: Treatment, receipt: RecordedAdjudication
    ) -> None:
        """Verify recorded provenance only; never load a provider for replay."""
        if receipt.adjudicator != condition.adjudicator:
            raise ValueError("Adjudicator configuration mismatch")
        with self.db.session() as session:
            call = session.get(ProviderCall, receipt.request_id)
            if (
                call is None
                or call.run_id != run.id
                or call.study_id != run.study_id
                or call.turn != turn
                or call.purpose != "adjudication"
                or call.model != receipt.adjudicator.model
                or call.activation_id is not None
                or call.status != "complete"
                or call.request_payload is None
            ):
                raise ValueError("Adjudication request provenance mismatch")
            payload = call.request_payload
            try:
                rulings = [
                    AdjudicationRuling.model_validate(
                        json.loads(part["args"]) if isinstance(part["args"], str) else part["args"]
                    )
                    for response in call.response_payload or []
                    for part in response["parts"]
                    if part.get("part_kind") == "tool-call"
                ]
                matches = (
                    json.loads(payload["prompt"]) == receipt.inputs
                    and payload["instructions"] == ADJUDICATION_INSTRUCTIONS
                    and payload["schema"] == AdjudicationRuling.model_json_schema()
                    and payload["settings"]["max_tokens"] == receipt.adjudicator.response_tokens
                    and payload["settings"].get("openai_reasoning_effort")
                    == receipt.adjudicator.openai_reasoning_effort
                    and rulings == [receipt.ruling]
                )
            except (KeyError, TypeError, ValueError):
                matches = False
            if not matches:
                raise ValueError("Adjudication request provenance mismatch")

    def replay(self, run_id: str) -> dict:
        run, design, condition = self.research.configuration(run_id)
        if design.environment in {"sealed_relay", "reviewed_finite"}:
            assert design.environment_source and design.environment_source.definition.extension
            # Even an empty replay needs the matching current runtime. The trusted
            # revision carries its admission; original sidecars are not required.
            self.research.extensions.check_runtime(design.environment_source.definition.extension)
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
            if design.environment
            in {
                "institutional_workflow",
                "artifact_workspace",
                "sealed_relay",
                "reviewed_finite",
                "distributed_coordination",
                "reliance_commitments",
            }
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
            decision = Decision.model_validate(turn.decision)
            adjudications = [
                event["data"]
                for event in (consequence_record or {}).get("events", [])
                if event["turn"] == turn.number and event["kind"] == "adjudication"
            ]
            if world.adjudication_inputs(turn.actor, decision) is not None:
                if len(adjudications) != 1:
                    raise ValueError(f"Adjudication receipt mismatch at turn {turn.number}")
                receipt = RecordedAdjudication.model_validate(
                    {k: v for k, v in adjudications[0].items() if k != "consequence"}
                )
                self._check_adjudication(run, turn.number, condition, receipt)
                events, measures = world.settle_adjudication(
                    turn.actor, decision, receipt.model_dump()
                )
            else:
                if adjudications:
                    raise ValueError(f"Unexpected adjudication at turn {turn.number}")
                events, measures = world.step(turn.actor, decision)
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
        if design.environment in {
            "institutional_workflow",
            "artifact_workspace",
            "sealed_relay",
            "reviewed_finite",
            "distributed_coordination",
            "reliance_commitments",
        }:
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
                    if operation["kind"] == "event_wait":
                        if condition.harness.kind != "event_wait":
                            raise ValueError("Undeclared event-wait policy")
                        repeated = event_wait(
                            self.models,
                            run_id,
                            actor,
                            activation["turn"],
                            observed,
                            condition.harness.max_wait_turns,
                        )
                        if (
                            repeated is None
                            or operation["request"] != {"source_turn": repeated[1]}
                            or operation["result"] != repeated[0].model_dump()
                        ):
                            raise ValueError("Event-wait receipt mismatch")
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
                        rejected = operation["request"]
                        try:
                            if "adjudication" in rejected:
                                receipt = RecordedAdjudication.model_validate(
                                    rejected["adjudication"]
                                )
                                self._check_adjudication(
                                    run, activation["turn"], condition, receipt
                                )
                                restored.settle_adjudication(
                                    actor,
                                    Decision.model_validate(rejected["decision"]),
                                    receipt.model_dump(),
                                )
                            else:
                                restored.step(actor, Decision.model_validate(rejected))
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
