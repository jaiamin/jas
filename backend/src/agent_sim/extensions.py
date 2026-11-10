"""Review-only extension candidates. Nothing here registers an experiment World."""

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

from .db import now, uid
from .domain import Strict
from .extension_sandbox import WORKER, execute

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
    execution_enabled: Literal[False] = False
    detail: str = "Check containment in this runtime before validating executable candidates."
    fingerprint: str | None = None
    case_sha256: str | None = None
    wasmtime_version: str | None = None
    checks: list["QualificationCheck"] = Field(default_factory=list)


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

    def list(self) -> list[ExtensionReview]:
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
        for path in (Path(__file__), WORKER, WORKER.with_name("extension_sandbox.py"), CASES):
            fingerprint.update(path.read_bytes())
        fingerprint.update(f"{version('wasmtime')}:{sys.version}:{platform.platform()}".encode())
        return fingerprint.hexdigest()

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
                detail=(
                    "Local import-free Wasm containment passed. Candidate validation is available; "
                    "experiment execution still requires independent world admission."
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
