import json

import httpx
import pytest
from fastapi.testclient import TestClient
from pydantic_ai.models.function import FunctionModel

from benchmarks import research_baseline
from benchmarks.research_baseline import run_baseline


def assert_current_workflow_with_frozen_v4_oracle(attempts):
    # Keep T01's case/harness bytes unchanged across the paired comparison.
    # T04/T06 version the export contract; every other check must pass.
    for row in attempts:
        failures = {key for key, passed in row["checks"].items() if not passed}
        if "export-v4" in row["checks"]:
            assert failures == {"export-v4"}
            assert row["passed"] is False
        else:
            assert failures == set() and row["passed"] is True


def test_keyless_baseline_retains_real_api_evidence_and_operation_counts(tmp_path):
    output = tmp_path / "baseline"
    report = run_baseline(output)
    assert report["evidence_kind"] == "deterministic-api-correctness"
    assert report["live_requests"] == 0
    assert len(report["attempts"]) == 6
    assert_current_workflow_with_frozen_v4_oracle(report["attempts"])
    simple = report["attempts"][0]
    assert simple["stop_reason"] == "check-failure"
    assert all(run["status"] == "complete" for run in simple["run_stops"])
    assert simple["usage"]["requests"] == 2
    exported = json.loads((output / simple["export"]).read_text())
    assert exported["version"] == 6
    assert len(exported["activations"]) == 2
    assert len(exported["runs"][0]["evidence"]) == 3
    rejected = report["attempts"][-1]
    assert rejected["stop_reason"] == "expected-schema-rejection"
    assert rejected["usage"]["requests"] == 0
    operations = [
        json.loads(line) for line in (output / "operations.jsonl").read_text().splitlines()
    ]
    assert len(operations) == report["http_operations"]
    assert any(row["path"].endswith("/verify") for row in operations)
    assert all(row["case_id"] for row in operations)


def test_provider_failure_is_retained_and_never_automatically_retried(tmp_path, monkeypatch):
    async def fail(*args, **kwargs):
        raise RuntimeError("Controlled provider failure")

    monkeypatch.setattr(FunctionModel, "request", fail)
    output = tmp_path / "failed"
    report = run_baseline(output)
    failed = report["attempts"][0]
    assert failed["passed"] is False
    assert failed["stop_reason"] == "failed"
    assert failed["usage"]["requests"] == 1
    exported = json.loads((output / failed["export"]).read_text())
    assert len(exported["requests"]) == 1
    assert exported["runs"][0]["record"]["summary"]["turn"] == 0
    assert exported["requests"][0]["status"] == "unknown"
    assert exported["requests"][0]["error"] == "RuntimeError"
    assert report["attempts"][-1]["passed"] is True


def test_comparison_retains_prior_failures_and_reports_each_regression():
    before = {
        "version": 1,
        "suite_sha256": "frozen-cases",
        "harness": {"id": "scripted-v1"},
        "evidence_kind": "deterministic-api-correctness",
        "source": {"head": "before"},
        "attempts": [
            {
                "id": "one",
                "checks": {"privacy": True, "replay": False},
                "passed": False,
                "stop_reason": "check-failure",
                "usage": {"requests": 2},
            },
        ],
    }
    after = before | {
        "source": {"head": "after"},
        "attempts": [
            {
                "id": "one",
                "checks": {"privacy": False, "replay": True},
                "passed": False,
                "stop_reason": "check-failure",
                "usage": {"requests": 2},
            },
        ],
    }
    result = research_baseline.compare(before, after)
    assert result["regressions"] == ["one:privacy"]
    assert result["improvements"] == ["one:replay"]
    assert result["before_failures"] == ["one:replay", "one:passed"]
    assert result["after_failures"] == ["one:privacy", "one:passed"]
    with pytest.raises(ValueError, match="suite_sha256"):
        research_baseline.compare(before, after | {"suite_sha256": "changed-cases"})
    with pytest.raises(ValueError, match="case"):
        research_baseline.compare(before, after | {"attempts": []})


def test_api_transport_failure_keeps_attempt_and_continues_other_cases(tmp_path, monkeypatch):
    request = TestClient.request
    failed = False

    def interrupted(self, method, url, **kwargs):
        nonlocal failed
        if url == "/api/settings" and not failed:
            failed = True
            raise httpx.ConnectError("Controlled disconnect")
        return request(self, method, url, **kwargs)

    monkeypatch.setattr(TestClient, "request", interrupted)
    output = tmp_path / "disconnected"
    report = run_baseline(output)
    first = report["attempts"][0]
    assert first["passed"] is False
    assert first["stop_reason"] == "error"
    assert first["usage"]["requests"] is None
    assert first["usage"]["partial"] is True
    assert_current_workflow_with_frozen_v4_oracle(report["attempts"][1:])
    operations = [
        json.loads(line) for line in (output / "operations.jsonl").read_text().splitlines()
    ]
    assert len(operations) == report["http_operations"]
    assert any(row.get("error") == "ConnectError" for row in operations)
