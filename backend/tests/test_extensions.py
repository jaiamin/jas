"""Candidate admission is a public review, never permission to run an experiment."""

import pytest
from agent_sim.api import create_app
from fastapi.testclient import TestClient

SAFE = (
    '(module (func (export "step") (param i32) (result i32) '
    "local.get 0 i32.const 2 i32.mul i32.const 3 i32.add))"
)


def candidate(source=SAFE):
    return {
        "format": "jas-extension-candidate-v1",
        "name": "Double plus three",
        "provenance": "Independently specified T02 development fixture",
        "source": source,
        "examples": [{"state": -4, "expected": -5}, {"state": 8, "expected": 19}],
    }


@pytest.fixture
def client(tmp_path):
    with TestClient(
        create_app(f"sqlite:///{tmp_path}/extensions.sqlite3"), base_url="http://localhost"
    ) as value:
        yield value


def test_unqualified_candidate_is_inert_and_its_review_can_be_restored(client):
    runtime = client.get("/api/extensions/runtime")
    assert runtime.status_code == 200
    assert runtime.json()["status"] == "unqualified"
    assert runtime.json()["validation_enabled"] is False
    # Invalid code is retained as data; no parser or start function may run yet.
    submitted = candidate("this is not executable WAT")
    response = client.post("/api/extensions/validate", json=submitted)
    assert response.status_code == 201
    report = response.json()
    assert report["admission"] == "blocked"
    assert report["runnable"] is False
    assert report["candidate"] == submitted
    assert report["activity"][-1]["status"] == "blocked"
    assert client.get(f"/api/extensions/reviews/{report['id']}").json() == report
    assert client.get("/api/extensions/reviews").json()[0]["id"] == report["id"]
    assert client.get("/api/studies").json() == []
    assert client.get("/api/settings").json()["usage"]["requests"] == 0


def test_local_containment_must_pass_real_safe_denial_and_limit_cases(client):
    response = client.post("/api/extensions/qualify", json={})
    assert response.status_code == 200
    runtime = response.json()
    assert runtime["status"] == "qualified", runtime
    assert runtime["validation_enabled"] is True
    assert runtime["execution_enabled"] is False
    cases = {case["name"]: case for case in runtime["checks"]}
    assert cases["safe-transition"]["observed"] == ["ok", [-5, 3, 19]]
    assert cases["filesystem"]["observed"][0] == "imports_denied"
    assert cases["fuel"]["observed"][0] == "fuel_exhausted"
    assert cases["wall-termination"]["observed"][0] == "timeout"
    assert all(case["passed"] and case["cleaned"] for case in cases.values())
    assert runtime["fingerprint"]
    assert runtime["case_sha256"]
    assert client.get("/api/settings").json()["usage"]["requests"] == 0


def test_qualified_candidate_examples_and_restore_are_reviewed_but_not_admitted(client):
    assert client.post("/api/extensions/qualify", json={}).json()["status"] == "qualified"
    response = client.post("/api/extensions/validate", json=candidate())
    assert response.status_code == 201
    report = response.json()
    assert report["admission"] == "needs_world_review"
    assert report["runnable"] is False
    assert report["outputs"] == [-5, 19]
    assert {a["stage"]: a["status"] for a in report["activity"]} == {
        "artifact": "passed",
        "containment": "passed",
        "examples": "passed",
        "restoration": "passed",
        "world_admission": "blocked",
    }
    assert not any(
        e["key"] == report["id"] for e in client.get("/api/catalog").json()["environments"]
    )
    assert client.get("/api/settings").json()["usage"]["requests"] == 0


def test_runtime_failure_revokes_qualification_and_preserves_a_blocked_review(client, monkeypatch):
    assert client.post("/api/extensions/qualify", json={}).json()["status"] == "qualified"

    def unavailable(*args, **kwargs):
        raise PermissionError("T02 fake process denial")

    # External process boundary only; no world/provider implementation is mocked.
    monkeypatch.setattr("subprocess.Popen", unavailable)
    report = client.post("/api/extensions/validate", json=candidate()).json()
    assert report["admission"] == "blocked"
    assert report["runtime"]["validation_enabled"] is False
    runtime = client.post("/api/extensions/qualify", json={}).json()
    assert runtime["status"] == "failed"
    assert runtime["validation_enabled"] is False
    assert any(not case["passed"] for case in runtime["checks"])
    assert (
        client.post("/api/extensions/validate", json=candidate()).json()["admission"] == "blocked"
    )


@pytest.mark.parametrize(
    ("source", "expected_status", "stop"),
    [
        (SAFE, "rejected", "differ"),
        (
            '(module (import "application" "admin_api" (func)) '
            '(func (export "step") (param i32) (result i32) i32.const 99))',
            "rejected",
            "imports_denied",
        ),
        (
            '(module (func (export "step") (param i32) (result i32) '
            "(loop $again br $again) i32.const 99))",
            "rejected",
            "fuel_exhausted",
        ),
        ('print("not executable Python")', "rejected", "invalid_module"),
    ],
)
def test_independent_bad_examples_and_hostile_variants_remain_rejected(
    client, source, expected_status, stop
):
    client.post("/api/extensions/qualify", json={})
    body = candidate(source)
    body["examples"] = [{"state": 3, "expected": 99}]
    report = client.post("/api/extensions/validate", json=body).json()
    assert report["admission"] == expected_status
    assert report["runnable"] is False
    assert any(stop in item["detail"] for item in report["activity"])
    assert client.get("/api/settings").json()["usage"]["requests"] == 0
    # A rejection cannot corrupt the worker used by the next review.
    assert client.post("/api/extensions/validate", json=candidate()).json()["admission"] == (
        "needs_world_review"
    )


def test_restart_retains_immutable_reviews_but_requires_fresh_local_qualification(tmp_path):
    database = f"sqlite:///{tmp_path}/restart.sqlite3"
    with TestClient(create_app(database), base_url="http://localhost") as first:
        first.post("/api/extensions/qualify", json={})
        review = first.post("/api/extensions/validate", json=candidate()).json()
    with TestClient(create_app(database), base_url="http://localhost") as second:
        assert second.get("/api/extensions/runtime").json()["validation_enabled"] is False
        assert second.get(f"/api/extensions/reviews/{review['id']}").json() == review
        assert second.post("/api/extensions/validate", json=candidate()).json()["admission"] == (
            "blocked"
        )


def test_candidate_boundary_rejects_unsupported_formats_and_runtime_overrides(client):
    for overrides in [
        {"format": "jas-extension-candidate-v0"},
        {"qualification": "output"},
        {"runtime": {"validation_enabled": True}},
        {"examples": [{"state": True, "expected": 3}]},
        {"examples": [{"state": 2**31, "expected": 3}]},
        {"source": "x" * 65537},
    ]:
        assert (
            client.post("/api/extensions/validate", json=candidate() | overrides).status_code == 422
        )
    assert (
        client.post(
            "/api/extensions/qualify", json={}, headers={"Origin": "https://foreign.example"}
        ).status_code
        == 403
    )
    assert client.get("/api/extensions/reviews").json() == []


def test_candidate_probes_leave_checkpoint_evidence_and_next_delivery_unchanged(
    client, monkeypatch, fake_model, design
):
    from agent_sim.domain import Decision
    from agent_sim.simulation.environments import create_world
    from conftest import decision_for

    monkeypatch.setattr(client.app.state.models, "model", lambda _name: fake_model)
    sid = client.post("/api/studies", json={"design": design.model_dump()}).json()["id"]
    rid = client.get(f"/api/studies/{sid}").json()["runs"][0]["id"]

    def step():
        client.post(f"/api/runs/{rid}/control", json={"action": "step"})

        async def settled():
            await client.app.state.engine.executions[rid].task

        client.portal.call(settled)

    step()
    before = client.get(f"/api/runs/{rid}").json()
    exported = client.get(f"/api/studies/{sid}/export").json()
    usage = client.get("/api/settings").json()["usage"]
    source = create_world(design, design.conditions[0].parameters, 7, before["state"])
    actor = source.actor()
    assert actor is not None
    delivery = source.observe(actor)
    checkpoint = source.snapshot()
    # Advance a restored World copy, including private notes and observations.
    probe = create_world(design, design.conditions[0].parameters, 7, checkpoint)
    probe.step(actor, Decision.model_validate(decision_for(dict(probe.observe(actor)))))
    assert probe.snapshot() != checkpoint
    assert source.snapshot() == checkpoint
    assert source.observe(actor) == delivery
    assert before["state"] == checkpoint

    client.post("/api/extensions/qualify", json={})
    assert client.post("/api/extensions/validate", json=candidate()).json()["admission"] == (
        "needs_world_review"
    )
    assert client.get(f"/api/runs/{rid}").json() == before
    assert client.get(f"/api/studies/{sid}/export").json() == exported
    assert client.get("/api/settings").json()["usage"] == usage
    assert client.post(f"/api/runs/{rid}/verify", json={}).json()["verified_turns"] == 1
    step()
    profile = next(profile for profile in design.profiles if profile.key == actor)
    assert client.get(f"/api/runs/{rid}/turns/2").json()["observation"] == (
        delivery | {"you": profile.model_dump()}
    )


def test_qualification_exercises_the_documented_worker_deadline(client):
    import time

    started = time.monotonic()
    result = client.post("/api/extensions/qualify", json={}).json()
    elapsed = time.monotonic() - started
    assert result["status"] == "qualified"
    # The independent termination fixture must actually reach the documented
    # four-second worker deadline, rather than a cheaper test-only timeout.
    assert 4 <= elapsed < 25
