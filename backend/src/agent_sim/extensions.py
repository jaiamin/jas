"""Immutable candidate review and independent finite, capability-free World admission."""

from __future__ import annotations

import hashlib
import json
import platform
import re
import sys
from importlib.metadata import version
from pathlib import Path
from tempfile import TemporaryDirectory
from threading import RLock
from typing import Literal

from pydantic import Field
from sqlalchemy.exc import NoResultFound

from .db import digest, now, uid
from .domain import (
    AdmissionCheck,
    ExecutablePackage,
    ExtensionPackage,
    FiniteExtensionPackage,
    Strict,
)
from .extension_profile import (
    CAPABILITIES,
    INPUTS,
    PROFILE,
    expected,
    profile_hash,
    validate_package,
)
from .extension_sandbox import WORKER, execute
from .finite_contract import (
    FiniteArtifactCheck,
    FiniteContract,
    ReviewedFiniteContract,
    contract_inputs,
    contract_outputs,
)
from .finite_profile import (
    STAGES as FINITE_STAGES,
)
from .finite_profile import (
    profile_hash as finite_profile_hash,
)
from .finite_profile import (
    validate_package as validate_finite_package,
)
from .generation_store import GenerationStore

CASES = Path(__file__).with_name("extension_qualification.json")


class Example(Strict):
    state: int = Field(ge=-(2**31), lt=2**31, strict=True)
    expected: int = Field(ge=-(2**31), lt=2**31, strict=True)


class ExtensionCandidate(Strict):
    format: Literal["jas-extension-candidate-v1"]
    name: str = Field(min_length=1, max_length=120)
    provenance: str = Field(min_length=1, max_length=2000)
    source: str = Field(min_length=1, max_length=65536)
    examples: list[Example] = Field(min_length=1, max_length=16)


class ValidationActivity(Strict):
    stage: str
    status: Literal["passed", "blocked", "failed"]
    detail: str


class ExtensionRuntime(Strict):
    status: Literal["unqualified", "qualified", "failed"] = "unqualified"
    validation_enabled: bool = False
    execution_enabled: bool = False
    detail: str = "Check containment in this runtime before validating executable candidates."
    fingerprint: str | None = None
    case_sha256: str | None = None
    wasmtime_version: str | None = None
    checks: list[QualificationCheck] = Field(default_factory=list)


class QualificationCheck(Strict):
    name: str
    passed: bool
    observed: list[str | list[int]]
    cleaned: bool


class ExtensionReview(Strict):
    format: Literal["jas-extension-review-v1"] = "jas-extension-review-v1"
    id: str
    created: str
    candidate_sha256: str
    candidate: ExtensionCandidate
    admission: Literal["blocked", "rejected", "needs_world_review"]
    runnable: Literal[False] = False
    runtime: ExtensionRuntime
    activity: list[ValidationActivity]
    outputs: list[int] = Field(default_factory=list)


class ExtensionAdmission(Strict):
    format: Literal["jas-extension-admission-v1"] = "jas-extension-admission-v1"
    id: str
    created: str
    review_id: str
    profile: str
    runnable: bool = False
    checks: list[AdmissionCheck]
    package: ExtensionPackage | None = None
    cases: list[dict] = Field(default_factory=list)
    limitations: list[str] = Field(
        default_factory=lambda: [
            "Only sealed-relay-v1 finite semantics are independently specified.",
            "Finite checks do not certify arbitrary programs, intelligence or research validity.",
            (
                "Native code, host imports, external data, network, adjudication "
                "and generation are unsupported."
            ),
            "Current local containment qualification is required for every execution and replay.",
        ]
    )


class FiniteAdmission(Strict):
    format: Literal["jas-finite-admission-v1"] = "jas-finite-admission-v1"
    id: str
    created: str
    artifact_check_id: str
    runnable: bool = False
    checks: list[AdmissionCheck]
    package: FiniteExtensionPackage | None = None
    sha256: str = ""
    limitations: list[str] = Field(
        default_factory=lambda: [
            "External exhaustive finite transition table is a prerequisite, not understood intent.",
            "Supports bounded deterministic role/state/credit transitions "
            "and static actor-private facts.",
            "Richer worlds, dynamic information, imports, native code "
            "and external systems unsupported.",
            "Copied probe isolation differs from qualified executable containment; "
            "current runtime required.",
            "Participant trials require separate explicit user execution; "
            "no live competence established.",
        ]
    )


class Extensions:
    def __init__(self, database_path: str | None):
        self.temporary = (
            TemporaryDirectory(prefix="jas-extensions-")
            if database_path in (None, "", ":memory:")
            else None
        )
        self.root = (
            Path(self.temporary.name)
            if self.temporary
            else Path(str(database_path)).with_suffix(".extensions")
        )
        self.lock = RLock()
        self.runtime = ExtensionRuntime()
        self.generations = GenerationStore(self.root / "generations")

    def freeze_contract(self, specification: FiniteContract) -> ReviewedFiniteContract:
        with self.lock:
            record = ReviewedFiniteContract(
                id=uid(),
                created=now(),
                specification=specification.model_copy(deep=True),
                sha256=digest(specification.model_dump()),
            )
            path = self.root / "contracts" / f"{record.id}.json"
            path.parent.mkdir(parents=True, exist_ok=True)
            temporary = path.with_suffix(".tmp")
            try:
                with temporary.open("x") as stream:
                    stream.write(record.model_dump_json())
                temporary.replace(path)
            finally:
                temporary.unlink(missing_ok=True)
            return record

    def contract(self, key: str) -> ReviewedFiniteContract:
        if not re.fullmatch(r"[a-f0-9]{16}", key):
            raise NoResultFound()
        try:
            record = ReviewedFiniteContract.model_validate_json(
                (self.root / "contracts" / f"{key}.json").read_text()
            )
        except FileNotFoundError:
            raise NoResultFound() from None
        if record.id != key or record.sha256 != digest(record.specification.model_dump()):
            raise ValueError("Invalid independent finite contract identity or content hash")
        return record

    def contracts(self) -> list[ReviewedFiniteContract]:
        with self.lock:
            return sorted(
                (self.contract(p.stem) for p in (self.root / "contracts").glob("*.json")),
                key=lambda r: r.created,
                reverse=True,
            )

    def check_finite_artifact(self, key: str, review_id: str) -> FiniteArtifactCheck:
        with self.lock:
            contract, review = self.contract(key), self.get(review_id)
            inputs, oracle = (
                contract_inputs(contract.specification),
                contract_outputs(contract.specification),
            )
            result: dict = {"code": "blocked"}
            detail = "Candidate validation and current containment qualification are required."
            try:
                self.require_qualified()
                if review.admission != "needs_world_review":
                    raise ValueError("Blocked or rejected candidate cannot pass independent checks")
                result = execute(review.candidate.source, inputs)
                if (
                    result["code"] in {"worker_failed", "worker_unavailable"}
                    or not result["cleaned"]
                ):
                    self.runtime = ExtensionRuntime(status="failed", detail="Finite worker failed.")
                detail = (
                    "External exhaustive table and four invalid encodings checked twice from fresh "
                    "instances. This does not establish natural-language understanding or admit a "
                    "World. Candidate prose/examples/self-tests cannot change this oracle."
                )
            except ValueError as error:
                detail = str(error)
            observed = result.get("outputs", [])
            record = FiniteArtifactCheck(
                id=uid(),
                created=now(),
                contract=contract,
                review_id=review.id,
                candidate_sha256=review.candidate_sha256,
                runtime=self.runtime.model_dump(),
                code=result["code"],
                inputs=inputs,
                expected=oracle,
                observed=observed,
                passed=(
                    result["code"] == "ok" and result.get("cleaned", False) and observed == oracle
                ),
                wasm_sha256=result.get("wasm_sha256"),
                detail=detail,
                sha256="",
            )
            record.sha256 = digest(record.model_dump(exclude={"sha256"}))
            path = self.root / "finite-checks" / f"{record.id}.json"
            path.parent.mkdir(parents=True, exist_ok=True)
            temporary = path.with_suffix(".tmp")
            try:
                with temporary.open("x") as stream:
                    stream.write(record.model_dump_json())
                temporary.replace(path)
            finally:
                temporary.unlink(missing_ok=True)
            return record

    def finite_check(self, key: str) -> FiniteArtifactCheck:
        if not re.fullmatch(r"[a-f0-9]{16}", key):
            raise NoResultFound()
        try:
            record = FiniteArtifactCheck.model_validate_json(
                (self.root / "finite-checks" / f"{key}.json").read_text()
            )
        except FileNotFoundError:
            raise NoResultFound() from None
        if record.id != key or record.sha256 != digest(record.model_dump(exclude={"sha256"})):
            raise ValueError("Invalid finite artifact check identity or content hash")
        return record

    def finite_checks(self) -> list[FiniteArtifactCheck]:
        with self.lock:
            return sorted(
                (self.finite_check(p.stem) for p in (self.root / "finite-checks").glob("*.json")),
                key=lambda r: r.created,
                reverse=True,
            )

    def admit_finite(self, key: str) -> FiniteAdmission:
        with self.lock:
            check = self.finite_check(key)
            record = FiniteAdmission(id=uid(), created=now(), artifact_check_id=key, checks=[])
            try:
                self.require_qualified()
                if (
                    not check.passed
                    or check.runtime.get("fingerprint") != self.runtime.fingerprint
                    or self.contract(check.contract.id) != check.contract
                ):
                    raise ValueError(
                        "Matching passed external check and actual frozen contract required"
                    )
                review = self.get(check.review_id)
                if review.candidate_sha256 != check.candidate_sha256:
                    raise ValueError("Checked candidate identity differs")
                # Re-execute at admission. Earlier examples or a copied claimed proof do not admit.
                result = execute(review.candidate.source, check.inputs)
                if (
                    result["code"] != "ok"
                    or not result["cleaned"]
                    or result["outputs"] != check.expected
                ):
                    raise ValueError("Finite artifact failed independent recheck")
                checks = [
                    AdmissionCheck(stage=stage, status="passed", detail=detail)
                    for stage, detail in zip(
                        FINITE_STAGES,
                        [
                            "Current credential-free/import-free bounded worker is qualified.",
                            "Actual artifact matched the immutable external full domain twice.",
                            "External table consequences, role guards, resource conservation, "
                            "private projections and exact World checkpoint/event/measurement "
                            "restoration/replay.",
                        ],
                        strict=True,
                    )
                ]
                package = FiniteExtensionPackage(
                    name=review.candidate.name,
                    provenance=review.candidate.provenance,
                    source=review.candidate.source,
                    source_sha256=hashlib.sha256(review.candidate.source.encode()).hexdigest(),
                    wasm_sha256=result["wasm_sha256"],
                    profile_sha256=finite_profile_hash(),
                    contract=check.contract.model_dump(),
                    review_id=review.id,
                    artifact_check_id=key,
                    admission_id=record.id,
                    created=record.created,
                    containment=self.runtime.model_dump(),
                    checks=checks,
                    verification={
                        "inputs_sha256": digest(check.inputs),
                        "expected_sha256": digest(check.expected),
                        "observed_sha256": digest(result["outputs"]),
                        "fresh_instances": len(check.inputs),
                        "world_checks_sha256": hashlib.sha256(
                            WORKER.with_name("finite_checks.py").read_bytes()
                        ).hexdigest(),
                    },
                    sha256="0" * 64,
                )
                package.sha256 = digest(package.model_dump(exclude={"sha256"}))
                from .finite_checks import qualify_world

                qualify_world(package, self.transition)
                record.checks, record.package, record.runnable = checks, package, True
            except ValueError as error:
                record.checks.append(
                    AdmissionCheck(
                        stage="admission",
                        status="failed" if self.runtime.validation_enabled else "blocked",
                        detail=str(error),
                    )
                )
            record.sha256 = digest(record.model_dump(exclude={"sha256"}))
            path = self.root / "finite-admissions" / f"{record.id}.json"
            path.parent.mkdir(parents=True, exist_ok=True)
            temporary = path.with_suffix(".tmp")
            try:
                with temporary.open("x") as stream:
                    stream.write(record.model_dump_json())
                temporary.replace(path)
            finally:
                temporary.unlink(missing_ok=True)
            return record

    def finite_admission(self, key: str) -> FiniteAdmission:
        if not re.fullmatch(r"[a-f0-9]{16}", key):
            raise NoResultFound()
        try:
            record = FiniteAdmission.model_validate_json(
                (self.root / "finite-admissions" / f"{key}.json").read_text()
            )
        except FileNotFoundError:
            raise NoResultFound() from None
        if record.id != key or record.sha256 != digest(record.model_dump(exclude={"sha256"})):
            raise ValueError("Invalid finite admission identity or content hash")
        if record.package:
            validate_finite_package(record.package)
        return record

    def finite_admissions(self) -> list[FiniteAdmission]:
        with self.lock:
            return sorted(
                (
                    self.finite_admission(p.stem)
                    for p in (self.root / "finite-admissions").glob("*.json")
                ),
                key=lambda r: r.created,
                reverse=True,
            )

    def get(self, key: str) -> ExtensionReview:
        if not re.fullmatch(r"[a-f0-9]{16}", key):
            raise NoResultFound()
        try:
            record = ExtensionReview.model_validate_json((self.root / f"{key}.json").read_text())
        except FileNotFoundError:
            raise NoResultFound() from None
        if record.id != key or record.candidate_sha256 != self._hash(record.candidate):
            raise ValueError("Extension review has an invalid identity or content hash")
        return record

    def reviews(self) -> list[ExtensionReview]:
        with self.lock:
            return sorted(
                (self.get(path.stem) for path in self.root.glob("*.json")),
                key=lambda record: record.created,
                reverse=True,
            )

    @staticmethod
    def _hash(candidate: ExtensionCandidate) -> str:
        return hashlib.sha256(candidate.model_dump_json().encode()).hexdigest()

    @staticmethod
    def _fingerprint() -> str:
        fingerprint = hashlib.sha256()
        for path in (
            Path(__file__),
            WORKER,
            WORKER.with_name("extension_sandbox.py"),
            CASES,
            WORKER.with_name("extension_profile.py"),
            WORKER.with_name("extension_checks.py"),
            WORKER.with_name("finite_contract.py"),
            WORKER.with_name("finite_profile.py"),
            WORKER.with_name("finite_checks.py"),
            *(
                WORKER.with_name("simulation") / name
                for name in (
                    "extension.py",
                    "finite.py",
                    "world.py",
                    "environments.py",
                    "checkpoints.py",
                    "decisions.py",
                )
            ),
            WORKER.with_name("domain.py"),
        ):
            fingerprint.update(path.read_bytes())
        fingerprint.update(f"{version('wasmtime')}:{sys.version}:{platform.platform()}".encode())
        return fingerprint.hexdigest()

    def require_qualified(self) -> None:
        if self.runtime.validation_enabled and self.runtime.fingerprint != self._fingerprint():
            self.runtime = ExtensionRuntime(
                status="failed", detail="Runtime changed; check containment again."
            )
        if not self.runtime.validation_enabled:
            raise ValueError(
                "Extension execution blocked: check local containment before "
                "admission, execution or replay"
            )

    def check_runtime(self, package: ExecutablePackage) -> None:
        self.require_qualified()
        if isinstance(package, FiniteExtensionPackage):
            validate_finite_package(package)
        else:
            validate_package(package)
        if package.containment["fingerprint"] != self.runtime.fingerprint:
            raise ValueError(
                "Pinned extension requires a different qualified runtime; re-admit explicitly"
            )

    def transition(self, package: ExecutablePackage, inputs: list[int]) -> list[int]:
        """Only copied bounded integers reach the qualified capability-free worker."""
        with self.lock:
            self.check_runtime(package)
            result = execute(package.source, inputs)
            if result["code"] in {"worker_failed", "worker_unavailable"} or not result["cleaned"]:
                self.runtime = ExtensionRuntime(
                    status="failed", detail="Extension worker failed; check containment again."
                )
            if result["code"] != "ok" or not result["cleaned"]:
                raise ValueError(f"Extension execution stopped: {result['code']}")
            if result.get("wasm_sha256") != package.wasm_sha256:
                raise ValueError("Pinned extension bytecode hash differs")
            return result["outputs"]

    def check_package(self, package: ExecutablePackage) -> None:
        # A pasted manifest or self-reported proof never authorizes execution.
        if isinstance(package, FiniteExtensionPackage):
            admission = self.finite_admission(package.admission_id)
            if not admission.runnable or admission.package != package:
                raise ValueError("Package differs from its actual immutable finite admission")
            contract = validate_finite_package(package).specification
            if self.transition(package, contract_inputs(contract)) != contract_outputs(contract):
                raise ValueError("Pinned finite artifact failed independent admission checks")
            return
        admission = self.admission(package.admission_id)
        if not admission.runnable or admission.package != package:
            raise ValueError("Package does not match its immutable independent admission record")
        actual = self.transition(package, INPUTS + INPUTS)
        oracle = [expected(value) for value in INPUTS] * 2
        if actual != oracle:
            raise ValueError("Pinned extension failed independent admission checks")

    def admission(self, key: str) -> ExtensionAdmission:
        if not re.fullmatch(r"[a-f0-9]{16}", key):
            raise NoResultFound()
        try:
            record = ExtensionAdmission.model_validate_json(
                (self.root / "admissions" / f"{key}.json").read_text()
            )
        except FileNotFoundError:
            raise NoResultFound() from None
        if record.id != key:
            raise ValueError("Invalid extension admission identity")
        if record.package:
            validate_package(record.package)
        return record

    def admissions(self) -> list[ExtensionAdmission]:
        with self.lock:
            return sorted(
                (self.admission(path.stem) for path in (self.root / "admissions").glob("*.json")),
                key=lambda r: r.created,
                reverse=True,
            )

    def admit(self, key: str, profile: str) -> ExtensionAdmission:
        with self.lock:
            review = self.get(key)
            record = ExtensionAdmission(
                id=uid(), created=now(), review_id=key, profile=profile, checks=[]
            )
            try:
                self.require_qualified()
                if profile != PROFILE:
                    raise ValueError(
                        "Unsupported independent admission profile; "
                        "only sealed-relay-v1 is specified"
                    )
                if review.admission != "needs_world_review":
                    raise ValueError(
                        "Candidate validation did not pass; its failed/blocked review "
                        "cannot authorize execution"
                    )
                record.checks.append(
                    AdmissionCheck(
                        stage="containment",
                        status="passed",
                        detail=(
                            "Current local access/resource/termination/cleanup qualification "
                            "passed; full proof pinned."
                        ),
                    )
                )
                result = execute(review.candidate.source, INPUTS + INPUTS)
                if result["code"] != "ok" or not result["cleaned"]:
                    if (
                        result["code"] in {"worker_failed", "worker_unavailable"}
                        or not result["cleaned"]
                    ):
                        self.runtime = ExtensionRuntime(
                            status="failed",
                            detail="Admission worker failed; check containment again.",
                        )
                    raise ValueError(f"Independent execution stopped: {result['code']}")
                oracle = [expected(value) for value in INPUTS]
                record.cases = [
                    {"input": value, "expected": target, "observed": output}
                    for value, target, output in zip(
                        INPUTS + INPUTS, oracle * 2, result["outputs"], strict=True
                    )
                ]
                if result["outputs"][: len(INPUTS)] != oracle:
                    raise ValueError(
                        "Candidate differs from independent "
                        "action/permission/consequence/resource/termination specification"
                    )
                record.checks.append(
                    AdmissionCheck(
                        stage="action_authorization_consequence",
                        status="passed",
                        detail=(
                            "All 128 finite state/resource/actor/action inputs and four invalid"
                            " integers match the independent specification, including "
                            "rejection and terminal guards."
                        ),
                    )
                )
                record.checks.append(
                    AdmissionCheck(
                        stage="observation",
                        status="passed",
                        detail=(
                            "The guest receives only packed public phase/credits, actor slot "
                            "and operation; no docket, names, notes, history, credentials or "
                            "host interface."
                        ),
                    )
                )
                if result["outputs"][len(INPUTS) :] != oracle:
                    raise ValueError("Independent fresh-checkpoint restoration differs")
                record.checks.append(
                    AdmissionCheck(
                        stage="restoration",
                        status="passed",
                        detail=(
                            "Every finite input repeated from a fresh bounded instance; no "
                            "hidden guest state crosses transitions."
                        ),
                    )
                )
                world_check = AdmissionCheck(
                    stage="world_permissions_projection_restoration_replay",
                    status="passed",
                    detail=(
                        "Independent literal World witnesses: actor/schema/atomic "
                        "rejection, private observation/schema invariance, resources, "
                        "unsuccessful stops, complete checkpoint restoration and exact "
                        "event/measurement replay."
                    ),
                )
                payload = dict(
                    name=review.candidate.name,
                    provenance=review.candidate.provenance,
                    source=review.candidate.source,
                    source_sha256=hashlib.sha256(review.candidate.source.encode()).hexdigest(),
                    wasm_sha256=result["wasm_sha256"],
                    profile_sha256=profile_hash(),
                    capabilities=CAPABILITIES,
                    review_id=key,
                    admission_id=record.id,
                    created=record.created,
                    containment=self.runtime.model_dump(),
                    checks=[c.model_dump() for c in [*record.checks, world_check]],
                    verification={
                        "inputs_sha256": digest(INPUTS + INPUTS),
                        "expected_sha256": digest(oracle * 2),
                        "observed_sha256": digest(result["outputs"]),
                        "fresh_instances": len(INPUTS) * 2,
                        "world_checks_sha256": hashlib.sha256(
                            WORKER.with_name("extension_checks.py").read_bytes()
                        ).hexdigest(),
                    },
                )
                package = ExtensionPackage.model_validate(payload | {"sha256": "0" * 64})
                package.sha256 = digest(package.model_dump(exclude={"sha256"}))
                validate_package(package)
                from .extension_checks import qualify_world

                qualify_world(package, self.transition)
                record.checks.append(world_check)
                record.package, record.runnable = package, True
            except ValueError as error:
                record.checks.append(
                    AdmissionCheck(
                        stage="admission",
                        status="failed" if self.runtime.validation_enabled else "blocked",
                        detail=str(error),
                    )
                )
            path = self.root / "admissions" / f"{record.id}.json"
            path.parent.mkdir(parents=True, exist_ok=True)
            temporary = path.with_suffix(".tmp")
            try:
                with temporary.open("x") as stream:
                    stream.write(record.model_dump_json())
                temporary.replace(path)
            finally:
                temporary.unlink(missing_ok=True)
            return record

    def validate(self, candidate: ExtensionCandidate) -> ExtensionReview:
        # Round-trip the boundary input: the worker never receives a live object.
        candidate = ExtensionCandidate.model_validate_json(candidate.model_dump_json())
        with self.lock:
            if self.runtime.validation_enabled and self.runtime.fingerprint != self._fingerprint():
                self.runtime = ExtensionRuntime(
                    status="failed",
                    detail="Runtime changed; check containment again.",
                )
            activity = [
                ValidationActivity(
                    stage="artifact",
                    status="passed",
                    detail="Versioned candidate and examples pinned.",
                )
            ]
            admission = "blocked"
            outputs = []
            if self.runtime.validation_enabled:
                activity.append(
                    ValidationActivity(
                        stage="containment",
                        status="passed",
                        detail=self.runtime.detail,
                    )
                )
                states = [example.state for example in candidate.examples]
                expected = [example.expected for example in candidate.examples]
                result = execute(candidate.source, states + states)
                if (
                    result["code"] in {"worker_unavailable", "worker_failed"}
                    or not result["cleaned"]
                ):
                    self.runtime = ExtensionRuntime(
                        status="failed",
                        detail="Worker or cleanup failed; check containment again "
                        "before validation.",
                    )
                    activity.append(
                        ValidationActivity(
                            stage="examples",
                            status="blocked",
                            detail=self.runtime.detail,
                        )
                    )
                elif result["code"] == "ok":
                    outputs = result["outputs"][: len(states)]
                    matches = outputs == expected
                    restored = result["outputs"][len(states) :] == outputs
                    activity.extend(
                        [
                            ValidationActivity(
                                stage="examples",
                                status="passed" if matches else "failed",
                                detail="Supplied examples matched."
                                if matches
                                else "Candidate results differ from the supplied expected values.",
                            ),
                            ValidationActivity(
                                stage="restoration",
                                status="passed" if restored else "failed",
                                detail="Fresh instances repeated the copied checkpoints."
                                if restored
                                else "Fresh instances did not reproduce the same results.",
                            ),
                        ]
                    )
                    admission = "needs_world_review" if matches and restored else "rejected"
                else:
                    admission = "rejected"
                    activity.append(
                        ValidationActivity(
                            stage="examples",
                            status="failed",
                            detail=f"Candidate stopped: {result['code']}.",
                        )
                    )
                activity.append(
                    ValidationActivity(
                        stage="world_admission",
                        status="blocked",
                        detail="Examples do not admit world mechanics. "
                        "Independent action, privacy, "
                        "consequence and replay review is required before experiment execution.",
                    )
                )
            else:
                activity.append(
                    ValidationActivity(
                        stage="containment",
                        status="blocked",
                        detail=self.runtime.detail,
                    )
                )
            report = ExtensionReview(
                id=uid(),
                created=now(),
                candidate=candidate,
                candidate_sha256=self._hash(candidate),
                admission=admission,
                runtime=self.runtime.model_copy(deep=True),
                activity=activity,
                outputs=outputs,
            )
            self.root.mkdir(parents=True, exist_ok=True)
            # New immutable records only; partial writes never become visible.
            path = self.root / f"{report.id}.tmp"
            try:
                with path.open("x") as stream:
                    json.dump(report.model_dump(), stream)
                path.replace(self.root / f"{report.id}.json")
            finally:
                path.unlink(missing_ok=True)
            return report

    def qualify(self) -> ExtensionRuntime:
        with self.lock:
            # Revoke first: an interrupted/failed requalification cannot retain
            # an earlier permission. There is no persisted or user-supplied bypass.
            self.runtime = ExtensionRuntime(
                status="failed",
                detail="Containment qualification did not complete.",
            )
            cases = json.loads(CASES.read_text())
            checks = []
            # A sentinel is owned fixture data, never an actual database or key.
            with TemporaryDirectory(prefix="jas-extension-qualification-") as scratch:
                sentinel = Path(scratch) / "fake-private-data.json"
                sentinel.write_text('{"credential":"T02-FAKE-SENTINEL","balance":17}')
                before = sentinel.read_bytes()
                for case in cases["cases"]:
                    result = execute(
                        "x" * case["source_bytes"] if "source_bytes" in case else case["source"],
                        case["states"],
                        qualification=case["qualification"],
                    )
                    observed = [result["code"]]
                    if "outputs" in result:
                        observed.append(result["outputs"])
                    checks.append(
                        QualificationCheck(
                            name=case["name"],
                            observed=observed,
                            passed=observed == case["expected"] and result["cleaned"],
                            cleaned=result["cleaned"],
                        )
                    )
                checks.append(
                    QualificationCheck(
                        name="source-sentinel",
                        passed=sentinel.read_bytes() == before,
                        observed=["unchanged" if sentinel.read_bytes() == before else "changed"],
                        cleaned=True,
                    )
                )
            qualified = all(check.passed for check in checks)
            runtime_version = version("wasmtime")
            self.runtime = ExtensionRuntime(
                status="qualified" if qualified else "failed",
                validation_enabled=qualified,
                execution_enabled=qualified,
                detail=(
                    "Local import-free Wasm containment passed. Candidate validation is available; "
                    "only independently admitted finite packages may execute as worlds."
                    if qualified
                    else "Containment qualification failed; "
                    "executable candidate validation is disabled."
                ),
                fingerprint=self._fingerprint(),
                case_sha256=hashlib.sha256(CASES.read_bytes()).hexdigest(),
                wasmtime_version=runtime_version,
                checks=checks,
            )
            return self.runtime.model_copy(deep=True)

    def close(self) -> None:
        if self.temporary:
            self.temporary.cleanup()
