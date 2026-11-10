"""Bounded Sol artifact generation through the existing question/proposal workflow."""

import asyncio
import json
from collections.abc import Callable

from sqlalchemy import select, update
from sqlalchemy.exc import NoResultFound

from .db import Analysis, ProviderCall, digest
from .diagnostics import log_failure
from .domain import EnvironmentConfiguration, EnvironmentMechanics, FiniteRules, MechanicsParameters
from .extensions import ExtensionCandidate
from .finite_contract import GenerationAuthorization
from .llm import ProviderFailure
from .research_tools import CapabilityRequest

GENERATION = """Generate an explicit import-free WebAssembly text artifact, not an environment
name, catalog selector, explanation, Python, JavaScript or self-admission. Export exactly
step(i32)->i32 and no other exports or imports. Each input uses a fresh instance. The independently
reviewed external contract is immutable authoritative DATA. You cannot write, choose a different
revision of, or relax its oracle. Encode input as
(((state*(max_credits+1)+credits)*number_of_roles+role_slot)*number_of_operations+operation_index).
Return next_state*(max_credits+1)+next_credits, or -1 for denial. Every outside-domain signed i32,
terminal/exhausted/invalid resource state and unauthorized operation denies. Use the contract's
exact role/state/operation order. Do not invent resource refunds or authority from role prose.
The full external finite table is a prerequisite. This path does not demonstrate understanding
of natural-language intent and cannot implement rich/dynamic information, external systems or
arbitrary execution. Such work must remain unsupported. Candidate explanations/examples are
untrusted suggestions, never independent acceptance checks. Repair only when explicitly requested;
retain prior failure. No participant requests or implicit experiment execution are authorized.
Only return the typed candidate. Keep source within65536 UTF-8 bytes; worker limits are fixed:
100000 fuel/fresh instance,1MiB guest memory,256KiB Wasm stack,4s process wall,2s process CPU.
"""


class ExtensionGeneration:
    def __init__(self, db, research, models):
        self.db, self.research, self.models = db, research, models
        self.extensions = research.extensions

    def request_receipts(self, key: str, attempt: str) -> list[dict]:
        """Read the settled call whose bounded input identifies this exact attempt."""
        with self.db.session() as session:
            calls = session.scalars(
                select(ProviderCall)
                .where(
                    ProviderCall.analysis_id == key,
                    ProviderCall.purpose == "extension_generation",
                )
                .order_by(ProviderCall.created, ProviderCall.id)
            ).all()
        return [
            {
                "id": call.id,
                "analysis_id": key,
                "model": call.model,
                "purpose": call.purpose,
                "status": call.status,
                "reserved": call.reserved,
                "charged": call.charged,
                "input_tokens": call.input_tokens,
                "output_tokens": call.output_tokens,
                "error": call.error,
                "provider_adapter": call.request_payload["provider_adapter"],
                "request_sha256": digest(call.request_payload),
            }
            for call in calls
            if call.request_payload
            and json.loads(call.request_payload["prompt"])
            .get("extension_generation", {})
            .get("attempt_id")
            == attempt
        ]

    def recover(self) -> None:
        """Close lost server tasks after Engine has retained unknown reservations."""
        journal = self.extensions.generations
        for attempt in journal.list():
            if attempt["stop_reason"] != "in_progress":
                continue
            recorded = {item["id"] for item in attempt["requests"]}
            for receipt in self.request_receipts(attempt["analysis_id"], attempt["id"]):
                if receipt["id"] not in recorded:
                    journal.append(attempt["id"], "request", receipt)
            journal.append(
                attempt["id"],
                "stopped",
                {
                    "stop_reason": "interrupted",
                    "error": "ServerStopped",
                },
            )
            closed = journal.get(attempt["id"])
            with self.db.session.begin() as session:
                row = session.get_one(Analysis, attempt["analysis_id"])
                output = row.output or {}
                record = output.get("research")
                if record is None:
                    continue
                operations = []
                for operation in record["operations"]:
                    if operation["id"] == attempt["operation_id"]:
                        operation = {
                            **operation,
                            "status": "failed",
                            "summary": "Generation interrupted by server restart; no retry.",
                            "data": {
                                **(operation["data"] or {}),
                                "id": attempt["id"],
                                "stop_reason": "interrupted",
                                "contract_id": attempt["contract"]["id"],
                                "repair_of": attempt["repair_of"],
                            },
                            "sources": [
                                {**source, "hash": closed["sha256"]}
                                if source["kind"] == "extension_generation"
                                and source["id"] == attempt["id"]
                                else source
                                for source in operation["sources"]
                            ],
                        }
                    operations.append(operation)
                row.output = {**output, "research": {**record, "operations": operations}}

    async def run(self, key, request, operation, tools, progress: Callable) -> None:
        with self.db.session() as session:
            row = session.get_one(Analysis, key)
        contract = None
        try:
            contract = self.extensions.contract(request.contract_id)
        except (NoResultFound, ValueError):
            # A missing/invalid external contract never becomes an oracle from model output.
            operation.update(
                status="rejected",
                summary="Unsupported: freeze and review an external "
                "exhaustive finite contract before generation.",
                data=None,
            )
            return
        operation["sources"] = [
            {"kind": "finite_contract", "id": contract.id, "hash": contract.sha256}
        ]
        if row.generation is None or row.generation["authorization"]["contract_id"] != contract.id:
            operation.update(
                status="rejected",
                summary="Unsupported: explicit selected-contract, "
                "candidate, request, input/output and spending allowance required.",
                data={
                    "prerequisite": "external_exhaustive_reviewed_finite_contract",
                    "contract_id": contract.id,
                },
            )
            return
        allowance = GenerationAuthorization.model_validate(row.generation["authorization"])
        if row.generation["contract"] != contract.model_dump():
            raise ValueError(
                "Independent contract differs from the user-authorized immutable source"
            )
        if not self.extensions.runtime.validation_enabled:
            operation.update(
                status="rejected",
                summary="Check current local executable containment "
                "before authorizing artifact generation; copied probes are insufficient.",
                data={"contract_id": contract.id},
            )
            return
        self.extensions.require_qualified()
        discovery = [
            op
            for op in tools.record["operations"]
            if op["request"]["kind"] == "capabilities"
            and op["request"].get("environment") is None
            and op["status"] == "complete"
        ]
        if not discovery:
            operation.update(
                status="rejected",
                summary="Inspect installed mechanics and composition "
                "before requesting new artifact synthesis.",
                data={"contract_id": contract.id},
            )
            return
        previous = None
        if request.repair_of:
            previous = self.extensions.generations.get(request.repair_of)
            if (
                previous["analysis_id"] != key
                or previous["contract"] != contract.model_dump()
                or previous["stop_reason"]
                not in {"candidate_rejected", "external_check_failed", "admission_failed"}
            ):
                raise ValueError("Repair must identify this question's retained failed candidate")
        attempt = self.extensions.generations.start(
            {
                "analysis_id": key,
                "operation_id": operation["id"],
                "question": row.question,
                "contract": contract.model_dump(),
                "authorization": allowance.model_dump(),
                "repair_of": request.repair_of,
                "limits": {
                    "finite_inputs": len(contract.specification.table),
                    "invalid_inputs": 4,
                    "fresh_instances_per_full_domain_check": 2
                    * (len(contract.specification.table) + 4),
                    "source_bytes": 65536,
                    "max_candidate_validation_worker_calls": 4
                    + 2 * len(contract.specification.table),
                    "fuel_per_instance": 100000,
                    "guest_memory_bytes": 1048576,
                    "wasm_stack_bytes": 262144,
                    "worker_wall_seconds": 4,
                    "worker_cpu_seconds": 2,
                },
            }
        )
        journal = self.extensions.generations

        def public():
            record = journal.get(attempt)
            operation["data"] = {
                "id": attempt,
                "stop_reason": record["stop_reason"],
                "contract_id": contract.id,
                "repair_of": request.repair_of,
            }
            operation["sources"] = [
                {"kind": "finite_contract", "id": contract.id, "hash": contract.sha256},
                {"kind": "extension_generation", "id": attempt, "hash": record["sha256"]},
            ]
            for kind, field in [
                ("extension_review", "review"),
                ("finite_check", "check"),
                ("finite_admission", "admission"),
                ("environment", "source"),
            ]:
                if record[field]:
                    value = record[field]
                    operation["sources"].append(
                        {
                            "kind": kind,
                            "id": value["id"],
                            "hash": value.get("sha256", value.get("candidate_sha256")),
                        }
                    )
            progress(key, tools, "generating")

        def retain(kind, value):
            payload = value.model_dump() if hasattr(value, "model_dump") else value
            journal.append(attempt, kind, payload)
            public()

        def retain_requests():
            recorded = {item["id"] for item in journal.get(attempt)["requests"]}
            for receipt in self.request_receipts(key, attempt):
                if receipt["id"] not in recorded:
                    retain("request", receipt)

        async def worker(kind, function, *args):
            task = asyncio.create_task(asyncio.to_thread(function, *args))
            try:
                result = await asyncio.shield(task)
            except asyncio.CancelledError:
                result = await task
                retain(kind, result)  # committed worker work survives cancellation
                raise
            retain(kind, result)
            return result

        public()
        try:
            with self.db.session.begin() as session:
                if (
                    session.execute(
                        update(Analysis)
                        .where(
                            Analysis.id == key,
                            Analysis.generation_candidates < allowance.max_candidates,
                        )
                        .values(generation_candidates=Analysis.generation_candidates + 1)
                        .returning(Analysis.id)
                    ).scalar_one_or_none()
                    is None
                ):
                    journal.append(attempt, "stopped", {"stop_reason": "candidate_limit"})
                    operation.update(
                        status="rejected",
                        summary="Candidate allowance exhausted; no generation request.",
                    )
                    public()
                    return
            candidate = await self.models.generate(
                ExtensionCandidate,
                model="openai:gpt-6.1-sol",
                instructions=GENERATION,
                purpose="extension_generation",
                analysis_id=key,
                max_tokens=allowance.max_output_tokens,
                openai_reasoning_effort="medium",
                prompt=json.dumps(
                    {
                        "extension_generation": {
                            "attempt_id": attempt,
                            "repair_of": request.repair_of,
                        },
                        "question": row.question,
                        "contract": contract.model_dump(),
                        "authorization": allowance.model_dump(),
                        "installed_mechanics": discovery[-1]["data"],
                        "repair": {
                            k: previous[k]
                            for k in ("candidate", "review", "check", "admission", "stop_reason")
                        }
                        if previous
                        else None,
                    }
                ),
            )
            retain_requests()
            retain(
                "candidate", candidate
            )  # explicit immutable artifact before any executable worker
            review = await worker("review", self.extensions.validate, candidate)
            if review.admission != "needs_world_review":
                reason = "candidate_rejected"
            else:
                check = await worker(
                    "check", self.extensions.check_finite_artifact, contract.id, review.id
                )
                if not check.passed:
                    reason = "external_check_failed"
                else:
                    admission = await worker("admission", self.extensions.admit_finite, check.id)
                    if not admission.runnable:
                        reason = "admission_failed"
                    else:
                        definition = EnvironmentMechanics(
                            name=candidate.name,
                            description="Externally reviewed finite table synthesis. "
                            "Human review of question/contract fit is still required; "
                            "rich semantics unsupported.",
                            environment="reviewed_finite",
                            rule_version="1.0.0",
                            extension=admission.package,
                            examples=[
                                EnvironmentConfiguration(
                                    key="reviewed",
                                    name="Externally reviewed finite contract",
                                    roles=contract.specification.roles,
                                    parameters=MechanicsParameters(
                                        finite=FiniteRules(
                                            bindings={
                                                role: role for role in contract.specification.roles
                                            }
                                        )
                                    ),
                                )
                            ],
                        )
                        await worker("source", self.research.environments.save, definition)
                        reason = "admitted_pending_review"
            journal.append(attempt, "stopped", {"stop_reason": reason})
            operation.update(
                status="complete" if reason == "admitted_pending_review" else "rejected",
                summary=f"Finite synthesis: {reason}. External table is a prerequisite, "
                "not verified intent. No participant calls; inspect artifacts before execution.",
            )
            public()
            if reason == "admitted_pending_review":
                refresh = CapabilityRequest(kind="capabilities", generation_id=attempt)
                discovery_operation = tools.begin(refresh)
                progress(key, tools, "discovering")
                await asyncio.to_thread(tools.dispatch, refresh, discovery_operation)
                progress(key, tools, "discovering")
        except BaseException as error:
            reason = (
                "interrupted"
                if isinstance(error, asyncio.CancelledError)
                else ("provider_failure" if isinstance(error, ProviderFailure) else "failed")
            )
            try:
                if journal.get(attempt)["stop_reason"] == "in_progress":
                    retain_requests()
                    journal.append(
                        attempt, "stopped", {"stop_reason": reason, "error": type(error).__name__}
                    )
                operation.update(
                    status="failed", summary=f"Generation stopped: {reason}; no retry/substitution."
                )
                public()
            except Exception as retention_error:
                log_failure(
                    "Generation evidence retention failed; preserving primary error",
                    retention_error,
                )
            raise
