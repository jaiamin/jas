"""One explicitly authorized workflow over the existing design, run and evidence services."""

import asyncio
from typing import Literal

from pydantic import Field, model_validator
from sqlalchemy import select, update

from .assistants import Assistants
from .db import Analysis, Database, InvestigationRecord, ProviderCall, Study, digest, now, uid
from .diagnostics import log_failure
from .domain import Design, EnvironmentId, Strict
from .execution import Engine
from .investigation_limits import InvestigationStopped, wait_ready
from .llm import LanguageModels, ProviderFailure
from .research import Research
from .simulation.environments import CATALOG


class InvestigationAuthorization(Strict):
    question: str = Field(min_length=1, max_length=4000)
    chat_id: str | None = Field(default=None, max_length=80)
    researcher_model: Literal["openai:gpt-6.1-sol"] = "openai:gpt-6.1-sol"
    participant_model: Literal["openai:gpt-6-luna"] = "openai:gpt-6-luna"
    environments: list[EnvironmentId] = Field(min_length=1, max_length=12)
    harnesses: list[Literal["direct_action", "tool_using"]] = Field(min_length=1, max_length=2)
    budget_usd: float = Field(ge=0, le=10, allow_inf_nan=False)
    study_budget_usd: float = Field(ge=0, le=10, allow_inf_nan=False)
    max_requests: int = Field(ge=1, le=256)
    max_runs: int = Field(ge=1, le=48)
    max_turns: int = Field(ge=1, le=1000)
    max_agents: int = Field(ge=1, le=12)
    max_rounds: int = Field(ge=1, le=100)
    max_operations: int = Field(default=32, ge=1, le=256)
    max_design_attempts: int = Field(default=2, ge=1, le=4)
    intent: Literal["exploratory", "confirmatory"]
    pilot: bool = False
    adapt_after_pilot: bool = False
    stopping: Literal["scope_ambiguity_allowance_or_failure"] = (
        "scope_ambiguity_allowance_or_failure"
    )

    @model_validator(mode="after")
    def supported_scope(self):
        self.question = self.question.strip()
        if not self.question:
            raise ValueError("Choose a question")
        if self.adapt_after_pilot and not self.pilot:
            raise ValueError("Adaptation after a pilot requires a pilot allowance")
        return self


class Investigations:
    def __init__(
        self,
        db: Database,
        research: Research,
        models: LanguageModels,
        assistants: Assistants,
        engine: Engine,
    ):
        self.db, self.research, self.models = db, research, models
        self.assistants, self.engine = assistants, engine
        self.tasks: dict[str, asyncio.Task] = {}
        self.closing = False
        with db.session.begin() as session:
            for row in session.scalars(
                select(InvestigationRecord).where(
                    InvestigationRecord.status.in_(["running", "pausing", "paused", "cancelling"])
                )
            ):
                row.status, row.stop_reason = "paused", "server_restart"
                row.decisions = [*row.decisions, {"at": now(), "decision": "restart_paused"}]
                parent = session.get_one(Analysis, row.id)
                parent.status, parent.error = "pending", None

    def start(self, authorization: InvestigationAuthorization) -> dict:
        if self.closing:
            raise ValueError("Server is stopping")
        available = set(CATALOG) | {
            source.definition.environment for source in self.research.environments.list()
        }
        if not set(authorization.environments) <= available:
            raise ValueError("Choose installed environments with actual admission")
        scope = authorization.model_dump()
        chat_id, key = authorization.chat_id or uid(), uid()
        if authorization.chat_id:
            self.assistants.chat(chat_id)
        with self.db.session.begin() as session:
            if session.scalar(
                select(Analysis.id).where(
                    Analysis.chat_id == chat_id,
                    Analysis.status == "pending",
                )
            ):
                raise ValueError("Wait for the current request to finish")
            parent = InvestigationRecord(
                id=key,
                authorization=scope,
                ceiling=round(authorization.budget_usd * 1_000_000),
                decisions=[{"at": now(), "decision": "authorized", "scope_hash": digest(scope)}],
            )
            session.add(parent)
            session.flush()
            study = Study(
                title=authorization.question[:100],
                question=authorization.question,
                revision=0,
                ceiling=round(authorization.study_budget_usd * 1_000_000),
                investigation_id=key,
            )
            session.add(study)
            session.flush()
            session.add(
                Analysis(
                    id=key,
                    chat_id=chat_id,
                    purpose="investigation",
                    question=authorization.question,
                    study_id=study.id,
                    investigation_id=key,
                    output={"investigation_id": key, "stage": "design"},
                )
            )
        self.tasks[key] = asyncio.create_task(self._execute(key), name=f"investigation-{key}")
        return {"id": key, "chat_id": chat_id}

    def get(self, key: str) -> dict:
        with self.db.session() as session:
            row = session.get_one(InvestigationRecord, key)
            parent = session.get_one(Analysis, key)
            study = session.get_one(Study, parent.study_id)
            ledger = session.scalars(
                select(ProviderCall)
                .where(
                    ProviderCall.investigation_id == key,
                )
                .order_by(ProviderCall.created, ProviderCall.id)
            ).all()
            proposal = (
                session.get(Analysis, row.attempts[-1]["design_id"]) if row.attempts else None
            )
            analysis_id = next(
                (
                    d["analysis_id"]
                    for d in reversed(row.decisions)
                    if d["decision"] == "read_only_analysis"
                ),
                None,
            )
            return {
                "id": row.id,
                "chat_id": parent.chat_id,
                "study_id": study.id,
                "authorization": row.authorization,
                "status": row.status,
                "stage": row.stage,
                "stop_reason": row.stop_reason,
                "requests": row.requests,
                "clarification": (proposal.output or {}).get("clarification") if proposal else None,
                "runs": row.runs,
                "turns": row.turns,
                "operations": row.operations,
                "charged_usd": row.charged / 1_000_000,
                "study_charged_usd": study.charged / 1_000_000,
                "study_budget_usd": study.ceiling / 1_000_000,
                "attempts": row.attempts,
                "decisions": row.decisions,
                "confirmation": row.confirmation,
                "result": row.result,
                "analysis": self.assistants.get(analysis_id) if analysis_id else None,
                "usage": self.models.usage(investigation_id=key),
                "ledger": [
                    {
                        "id": call.id,
                        "purpose": call.purpose,
                        "model": call.model,
                        "study_id": call.study_id,
                        "run_id": call.run_id,
                        "analysis_id": call.analysis_id,
                        "status": call.status,
                        "reserved": call.reserved,
                        "charged": call.charged,
                        "error": call.error,
                    }
                    for call in ledger
                ],
            }

    def _update(self, key: str, *, decision: dict | None = None, **changes):
        with self.db.session.begin() as session:
            if decision is not None:
                # Serialize read/append with API controls while a worker saves a revision.
                session.execute(
                    update(InvestigationRecord)
                    .where(InvestigationRecord.id == key)
                    .values(stage=InvestigationRecord.stage)
                )
            row = session.get_one(InvestigationRecord, key)
            for name, value in changes.items():
                setattr(row, name, value)
            if decision is not None:
                row.decisions = [*row.decisions, decision]
            parent = session.get_one(Analysis, key)
            parent.output = {**(parent.output or {}), "stage": row.stage}

    def _scope(self, key: str, output: dict) -> Design:
        row = self.get(key)
        authorization = InvestigationAuthorization.model_validate(row["authorization"])
        if not output.get("supported") or output.get("clarification") or not output.get("design"):
            raise InvestigationStopped("material_ambiguity_or_unsupported_scope")
        design = Design.model_validate(output["design"])
        brief = output.get("planning", {}).get("brief", {})
        if brief.get("intent", "exploratory") != authorization.intent:
            raise InvestigationStopped("intent_changed")
        if design.environment not in authorization.environments:
            raise InvestigationStopped("environment_outside_scope")
        if (
            len(design.profiles) > authorization.max_agents
            or design.rounds > authorization.max_rounds
        ):
            raise InvestigationStopped("population_or_horizon_outside_scope")
        for condition in design.conditions:
            # The current displayed authorization covers researcher and participant
            # identities only. It grants no judge identity or judgment scope.
            if condition.adjudicator is not None:
                raise InvestigationStopped("adjudicator_outside_scope")
            resolved = design.resolve(condition)
            if condition.harness.kind not in authorization.harnesses or any(
                (profile.model or condition.model) != authorization.participant_model
                for profile in resolved.profiles
            ):
                raise InvestigationStopped("participant_identity_outside_scope")
        planned = len(design.conditions) * len(design.seeds) * design.repetitions
        if planned + row["runs"] > authorization.max_runs:
            raise InvestigationStopped("runs_allowance_exhausted")
        return design

    def control(self, key: str, action: Literal["pause", "resume", "cancel"]) -> dict:
        row = self.get(key)
        if action == "pause" and row["status"] == "running":
            self._update(
                key,
                status="pausing",
                decision={"at": now(), "decision": "pause_requested"},
            )
            for attempt in row["attempts"]:
                for run_id in attempt["run_ids"]:
                    if self.research.configuration(run_id)[0].status in {
                        "running",
                        "queued",
                        "pausing",
                        "paused",
                    }:
                        self.engine.pause(run_id)
        elif action == "resume" and row["status"] == "paused":
            self._update(
                key,
                status="running",
                stop_reason=None,
                decision={"at": now(), "decision": "resumed"},
            )
            if key not in self.tasks or self.tasks[key].done():
                self.tasks[key] = asyncio.create_task(
                    self._execute(key), name=f"investigation-{key}"
                )
        elif action == "cancel" and row["status"] in {"running", "pausing", "paused"}:
            self._update(key, status="cancelling", stop_reason="user_cancel")
            task = self.tasks.get(key)
            if task and not task.done():
                task.cancel()
                task.add_done_callback(lambda _task: self._cancel_if_pending(key))
            else:
                self._finish(key, "cancelled", "user_cancel")
        elif action == "cancel" and row["status"] in {"cancelling", "cancelled"}:
            pass
        else:
            raise ValueError("This investigation cannot perform that action in its current state")
        return self.get(key)

    def _cancel_if_pending(self, key: str) -> None:
        if self.get(key)["status"] == "cancelling":
            self._finish(key, "cancelled", "user_cancel")

    def adapt(self, key: str, instruction: str) -> dict:
        instruction = instruction.strip()
        if self.closing or not instruction:
            raise ValueError("Choose an adaptation while the server is available")
        with self.db.session.begin() as session:
            row = session.get_one(InvestigationRecord, key)
            parent = session.get_one(Analysis, key)
            scope = row.authorization
            if (
                row.status not in {"stopped", "failed"}
                or scope["intent"] != "exploratory"
                or row.confirmation
            ):
                raise ValueError("Only a stopped exploratory investigation can adapt within scope")
            if (
                len(row.attempts) >= scope["max_design_attempts"]
                or any(
                    getattr(row, kind) >= scope[f"max_{kind}"]
                    for kind in ["requests", "runs", "turns", "operations"]
                )
                or row.charged >= row.ceiling
            ):
                raise ValueError(
                    "The original allowance is exhausted; authorize a new investigation"
                )
            if session.scalar(
                select(Analysis.id).where(
                    Analysis.chat_id == parent.chat_id,
                    Analysis.status == "pending",
                )
            ):
                raise ValueError("Wait for the current request to finish")
            row.decisions = [
                *row.decisions,
                {"at": now(), "decision": "adaptation_requested", "instruction": instruction},
            ]
            row.status, row.stage, row.stop_reason, row.result = "running", "adaptation", None, None
            parent.status, parent.error = "pending", None
            parent.output = {"investigation_id": key, "stage": "adaptation"}
        self.tasks[key] = asyncio.create_task(self._execute(key), name=f"investigation-{key}")
        return {"id": key, "chat_id": parent.chat_id}

    async def _design(self, key: str, *, feedback: list[dict] | None = None) -> tuple[str, Design]:
        row = self.get(key)
        scope = row["authorization"]
        if len(row["attempts"]) >= scope["max_design_attempts"]:
            raise InvestigationStopped("design_attempt_allowance_exhausted")
        design_id = await self.assistants.start(
            scope["question"],
            purpose="design",
            study_id=row["study_id"],
            investigation_id=key,
            chat_id=self.assistants.get(row["attempts"][-1]["design_id"])["chat_id"]
            if row["attempts"]
            else None,
        )
        attempts = [
            *row["attempts"],
            {
                "design_id": design_id,
                "chat_id": self.assistants.get(design_id)["chat_id"],
                "kind": "pilot"
                if scope["pilot"] and not row["attempts"]
                else "confirmatory"
                if scope["intent"] == "confirmatory"
                else "exploratory",
                "revision": None,
                "run_ids": [],
                "status": "designing",
                "adaptation": feedback,
            },
        ]
        self._update(key, attempts=attempts, stage="design")
        await self.assistants.tasks[design_id]
        await wait_ready(self.db, key)
        proposal = self.assistants.get(design_id)
        if proposal["status"] != "complete":
            if (proposal["output"] or {}).get("stop_reason"):
                raise InvestigationStopped(proposal["output"]["stop_reason"])
            raise ValueError(proposal["error"] or "Design stopped")
        return design_id, self._scope(key, proposal["output"])

    async def _after_pilot(self, key: str) -> None:
        row = self.get(key)
        pilot = row["attempts"][-1]
        feedback = [
            {
                "run_id": run_id,
                "status": self.research.configuration(run_id)[0].status,
                "through_turn": self.research.configuration(run_id)[0].turn,
                "metrics": self.research.metrics(run_id),
                "phase": "exploratory_pilot",
            }
            for run_id in pilot["run_ids"]
        ]
        if row["authorization"]["adapt_after_pilot"]:
            design_id, design = await self._design(key, feedback=feedback)
        else:
            design_id = pilot["design_id"]
            design = self._scope(key, self.assistants.get(design_id)["output"])
            if len(row["attempts"]) >= row["authorization"]["max_design_attempts"]:
                raise InvestigationStopped("design_attempt_allowance_exhausted")
            self._update(
                key,
                attempts=[
                    *row["attempts"],
                    {
                        "design_id": design_id,
                        "kind": "confirmatory"
                        if row["authorization"]["intent"] == "confirmatory"
                        else "exploratory",
                        "revision": None,
                        "run_ids": [],
                        "status": "designing",
                        "chat_id": self.assistants.get(design_id)["chat_id"],
                        "adaptation": {"decision": "retain_checked_protocol", "pilot": feedback},
                    },
                ],
            )
        await self._save(key, design_id, design)
        await self._runs(key)

    async def _save(self, key: str, design_id: str, design: Design) -> None:
        work = asyncio.create_task(asyncio.to_thread(self._commit_design, key, design_id, design))
        cancelled = False
        while True:
            try:
                await asyncio.shield(work)
                break
            except asyncio.CancelledError:
                cancelled = True
        if cancelled:
            raise asyncio.CancelledError

    def _commit_design(self, key: str, design_id: str, design: Design) -> None:
        row = self.get(key)
        self.research.save_design(
            design,
            study_id=row["study_id"],
            plan_id=design_id,
            investigation_id=key,
        )
        detail = self.research.study(row["study_id"])
        attempts = [dict(attempt) for attempt in row["attempts"]]
        attempts[-1].update(
            revision=detail["revision"],
            design_hash=digest(design.model_dump()),
            run_ids=[run["id"] for run in detail["runs"]],
            status="checked",
        )
        confirmation = row["confirmation"]
        decision = None
        if attempts[-1]["kind"] == "confirmatory":
            confirmation = {
                "frozen_at": now(),
                "revision": detail["revision"],
                "design": design.model_dump(),
                "design_hash": digest(design.model_dump()),
                "run_ids": attempts[-1]["run_ids"],
                "stopping": row["authorization"]["stopping"],
            }
            decision = {
                "at": now(),
                "decision": "confirmation_frozen",
                "design_hash": confirmation["design_hash"],
            }
        self._update(
            key, attempts=attempts, confirmation=confirmation, decision=decision, stage="runs"
        )

    async def _runs(self, key: str) -> None:
        row = self.get(key)
        for run_id in row["attempts"][-1]["run_ids"]:
            while True:
                await wait_ready(self.db, key)
                run = self.research.configuration(run_id)[0]
                if run.status == "complete":
                    break
                try:
                    await self.engine.start(run_id)
                except InvestigationStopped as error:
                    if error.reason not in {"pausing", "paused"}:
                        raise
                    # Pause may arrive while start waits for another run's preflight.
                    continue
                execution = self.engine.executions.get(run_id)
                if execution and execution.task:
                    await execution.task
                await wait_ready(self.db, key)
                run = self.research.configuration(run_id)[0]
                if run.status == "failed":
                    raise InvestigationStopped(run.error or "run_failed")
                if run.status not in {"complete", "paused"}:
                    raise InvestigationStopped(f"run_{run.status}")
        attempts = [dict(attempt) for attempt in self.get(key)["attempts"]]
        attempts[-1]["status"] = "complete"
        self._update(key, attempts=attempts)

    async def _analysis(self, key: str) -> None:
        await wait_ready(self.db, key)
        row = self.get(key)
        previous = next(
            (
                decision
                for decision in reversed(row["decisions"])
                if decision["decision"] == "read_only_analysis"
                and decision["revision"] == row["attempts"][-1]["revision"]
            ),
            None,
        )
        if previous:
            analysis_id = previous["analysis_id"]
        else:
            analysis_id = await self.assistants.start(
                "Describe recorded outcomes and failures only. State missing-run and small-sample "
                "limits; do not infer causal effects, intent, intelligence or research validity.",
                purpose="analysis",
                study_id=row["study_id"],
                investigation_id=key,
            )
            self._update(
                key,
                stage="analysis",
                decision={
                    "at": now(),
                    "decision": "read_only_analysis",
                    "analysis_id": analysis_id,
                    "revision": row["attempts"][-1]["revision"],
                },
            )
        if analysis_id in self.assistants.tasks:
            await self.assistants.tasks[analysis_id]
        await wait_ready(self.db, key)
        analysis = self.assistants.get(analysis_id)
        if analysis["status"] != "complete":
            raise ValueError(analysis["error"] or "Analysis stopped")

    def _finish(self, key: str, status: str, reason: str):
        row = self.get(key)
        attempts = [dict(attempt) for attempt in row["attempts"]]
        if attempts and attempts[-1]["status"] != "complete":
            attempts[-1].update(status=status, stop_reason=reason)
        runs = [
            self.research.run(run_id)["summary"]
            for attempt in row["attempts"]
            for run_id in attempt["run_ids"]
        ]
        complete = sum(run["status"] == "complete" for run in runs)
        failed = sum(run["status"] == "failed" for run in runs)
        result = {
            "planned": len(runs),
            "complete": complete,
            "failed": failed,
            "missing": len(runs) - complete,
            "research_validity": "unassessed",
            "runs": [
                {
                    "id": run["id"],
                    "status": run["status"],
                    "through_turn": run["turn"],
                    "error": run["error"],
                }
                for run in runs
            ],
            "limitations": [
                "Descriptive recorded trajectories only. Fixed seeds, dependent decisions and "
                "small samples do not establish population or causal effects.",
                "Failed, interrupted and unattempted runs are retained; missing outcomes are "
                "not zero. Completion does not certify intelligence or research validity.",
                "Model analysis is a separate interpretation; structured checks do not certify "
                "its prose. Inspect source evidence and coverage.",
            ],
        }
        self._update(
            key,
            status=status,
            stop_reason=reason,
            result=result,
            attempts=attempts,
            decision={"at": now(), "decision": status, "reason": reason},
        )
        with self.db.session.begin() as session:
            parent = session.get_one(Analysis, key)
            parent.status = "complete"
            parent.output = {
                **(parent.output or {}),
                "answer": f"{complete} of {len(runs)} planned runs completed; {failed} failed, "
                f"{len(runs) - complete} missing complete outcomes. Stopped: {reason}.",
                "caveats": result["limitations"],
            }

    async def _execute(self, key: str):
        try:
            row = self.get(key)
            if row["stage"] == "adaptation":
                decision = next(
                    d for d in reversed(row["decisions"]) if d["decision"] == "adaptation_requested"
                )
                design_id, design = await self._design(
                    key,
                    feedback=[
                        {
                            "instruction": decision["instruction"],
                            "prior_attempts": row["attempts"],
                        }
                    ],
                )
                await self._save(key, design_id, design)
            if row["stage"] == "design":
                if row["attempts"]:
                    design_id = row["attempts"][-1]["design_id"]
                    proposal = self.assistants.get(design_id)
                    if proposal["status"] != "complete":
                        raise InvestigationStopped("interrupted_design_requires_new_attempt")
                    design = self._scope(key, proposal["output"])
                else:
                    design_id, design = await self._design(key)
                await self._save(key, design_id, design)
            if self.get(key)["stage"] == "runs":
                await self._runs(key)
                if self.get(key)["attempts"][-1]["kind"] == "pilot":
                    await self._after_pilot(key)
            await self._analysis(key)
            self._finish(key, "complete", "bounded_work_complete")
        except asyncio.CancelledError:
            if self.closing:
                self._update(key, status="paused", stop_reason="server_stopped_usage_retained")
            else:
                self._finish(key, "cancelled", "cancelled_unknown_usage_retained")
            raise
        except InvestigationStopped as error:
            self._finish(key, "stopped", error.reason)
        except (ValueError, ProviderFailure) as error:
            self._finish(key, "stopped", str(error))
        except Exception as error:
            log_failure(f"Investigation {key} failed", error)
            self._finish(key, "failed", f"{type(error).__name__}; no retry or substitute")

    async def close(self):
        self.closing = True
        for task in self.tasks.values():
            if not task.done():
                task.cancel()
        await asyncio.gather(*self.tasks.values(), return_exceptions=True)
