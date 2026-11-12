"""Independent DEVELOPMENT boundary oracles through the public HTTP workflow."""

import asyncio
import copy
import json
import threading
from contextlib import contextmanager

import pytest
from agent_sim.api import create_app
from agent_sim.db import ProviderCall, RecordedEvent, Run, Study, Turn, Workspace, digest
from fastapi.testclient import TestClient
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.models.function import FunctionModel
from pydantic_ai.usage import RequestUsage
from sqlalchemy import select, text
from test_fallible_adjudication import ADJUDICATOR, GUIDANCE, INPUTS, RULING, finished, protocol

from benchmarks.provider_fixtures import output_args


def response(info, value, *, judge=False):
    return ModelResponse(
        parts=[ToolCallPart(info.output_tools[0].name, output_args(info, copy.deepcopy(value)))],
        usage=RequestUsage(input_tokens=41 if judge else 101, output_tokens=19 if judge else 37),
    )


def decision(action):
    return {
        "action": action,
        "rationale": "Scripted development action.",
        "memory": "",
        "forecast": None,
    }


def write_action(**content):
    return {
        "kind": "write_artifact",
        "artifact": "report",
        "expected_version": 1,
        "content": {"desk": "west", "closes_at": 17, "guidance": GUIDANCE, **content},
        "sources": [{"artifact": "pickup", "version": 1}],
    }


@contextmanager
def workflow(tmp_path, *, ruling=None, design=None, actions=None, judge=None, participant=None):
    actions = iter(actions or [write_action(), {"kind": "submit_artifacts"}])
    participant_inputs, judge_inputs = [], []

    async def author(messages, info):
        participant_inputs.append(json.loads(messages[-1].parts[0].content))
        if participant is not None:
            return await participant(messages, info)
        return response(info, decision(next(actions)))

    async def adjudicator(messages, info):
        judge_inputs.append(json.loads(messages[-1].parts[0].content))
        if judge is not None:
            return await judge(messages, info)
        return response(info, ruling if ruling is not None else RULING, judge=True)

    database = f"sqlite:///{tmp_path}/judgment.sqlite3"
    app = create_app(database, static_dir=tmp_path / "static")
    app.state.models.models["openai:gpt-6-luna"] = FunctionModel(function=author)
    app.state.models.models["openai:gpt-6.1-sol"] = FunctionModel(function=adjudicator)
    with TestClient(app, base_url="http://localhost") as client:
        created = client.post("/api/studies", json={"design": design or protocol()})
        assert created.status_code == 201, created.text
        study_id = created.json()["id"]
        study = client.get(f"/api/studies/{study_id}").json()
        yield app, client, study_id, study["runs"][0]["id"], participant_inputs, judge_inputs


def start(client, run_id, action="start"):
    result = client.post(f"/api/runs/{run_id}/control", json={"action": action})
    assert result.status_code == 200, result.text
    return finished(client, run_id)


def test_contradictory_accept_is_recorded_but_cannot_change_facts_or_settle(tmp_path):
    ruling: dict = copy.deepcopy(RULING)
    ruling["facts"][1]["value"] = 18
    with workflow(tmp_path, ruling=ruling) as (_, client, study_id, run_id, author, judge):
        written = start(client, run_id, "step")
        assert written["summary"]["turn"] == 1 and len(author) == 1 and judge == []
        failed = start(client, run_id)
        assert failed["summary"]["status"] == "failed"
        assert failed["summary"]["turn"] == 1
        assert failed["state"] == written["state"]
        assert failed["events"] == written["events"]
        assert failed["measurements"] == written["measurements"]
        assert failed["summary"]["usage"]["cost_usd"] == 0.000330
        assert len(author) == 2 and len(judge) == 1
        assert "contradicts or exceeds executable facts" in failed["summary"]["error"]
        rejection = failed["activations"][-1]["operations"][-1]
        assert rejection["kind"] == "reject" and rejection["status"] == "rejected"
        assert rejection["request"]["adjudication"]["ruling"] == ruling
        request_id = rejection["request"]["adjudication"]["request_id"]
        request = client.get(f"/api/requests/{request_id}").json()
        assert (request["purpose"], request["status"]) == ("adjudication", "complete")
        assert request["response"][0]["parts"][0]["args"] == ruling
        exported = client.get(f"/api/studies/{study_id}/export").json()
        assert exported["activations"][-1]["operations"][-1] == rejection
        verified = client.post(f"/api/runs/{run_id}/verify")
        assert verified.status_code == 200, verified.text
        assert verified.json()["verified_turns"] == 1
        assert verified.json()["verified_rejections"] == 1
        assert verified.json()["model_requests"] == 0
        assert len(author) == 2 and len(judge) == 1


def test_judgment_scope_and_configuration_remain_pinned_after_library_and_revision_edits(tmp_path):
    with workflow(tmp_path) as (_, client, _, _, author, judge):
        extracted = client.post("/api/design/environment", json={"design": protocol()})
        assert extracted.status_code == 200, extracted.text
        definition = extracted.json()
        assert "adjudicator" not in json.dumps(definition)
        saved = client.post("/api/environments", json={"definition": definition})
        assert saved.status_code == 201, saved.text
        source = saved.json()
        example = source["definition"]["examples"][0]
        # Reusable mechanics never invent an implicit spending identity.
        missing = client.post(
            "/api/design/use-environment",
            json={
                "source": source,
                "example": example["key"],
                "bindings": {},
            },
        )
        assert missing.status_code == 422
        assert "Declare the adjudicator" in missing.text
        reused = client.post(
            "/api/design/use-environment",
            json={
                "design": protocol(),
                "source": source,
                "example": example["key"],
                "bindings": {example["roles"][0]: "author"},
            },
        )
        assert reused.status_code == 200, reused.text
        value = reused.json()
        assert value["conditions"][0]["adjudicator"] == ADJUDICATOR
        created = client.post("/api/studies", json={"design": value})
        assert created.status_code == 201, created.text
        sid = created.json()["id"]
        rid = client.get(f"/api/studies/{sid}").json()["runs"][0]["id"]
        changed = copy.deepcopy(definition)
        changed["examples"][0]["parameters"]["artifacts"]["objects"][0]["content"]["desk"] = "north"
        updated = client.put(
            f"/api/environments/{source['id']}",
            json={
                "definition": changed,
                "revision": 1,
            },
        )
        assert updated.status_code == 200, updated.text
        assert client.delete(f"/api/environments/{source['id']}?revision=2").status_code == 200
        later = copy.deepcopy(value)
        later["conditions"][0]["adjudicator"]["openai_reasoning_effort"] = "high"
        revised = client.post(f"/api/studies/{sid}/revisions", json={"design": later})
        assert revised.status_code == 201, revised.text
        assert client.get("/api/settings").json()["usage"]["requests"] == 0
        assert author == judge == []
        result = start(client, rid)
        assert result["summary"]["status"] == "complete", result["summary"]
        assert result["state"]["outcome"]["status"] == "success"
        assert result["design"] == value
        assert judge == [INPUTS] and len(author) == 2
        assert result["summary"]["usage"]["cost_usd"] == 0.000330
        assert result["state"]["adjudications"][0]["adjudicator"] == ADJUDICATOR
        exported = client.get(f"/api/studies/{sid}/export").json()
        assert exported["revisions"][0]["design"] == value
        assert exported["revisions"][1]["design"] == later
        assert exported["revisions"][0]["design"]["environment_source"] == source
        verified = client.post(f"/api/runs/{rid}/verify")
        assert verified.status_code == 200, verified.text
        assert verified.json()["verified_turns"] == 2
        assert verified.json()["model_requests"] == 0
        assert judge == [INPUTS] and len(author) == 2


@pytest.mark.parametrize("harness", ["direct_action", "tool_using"])
def test_pause_before_judgment_holds_the_decision_and_resume_does_not_resample(tmp_path, harness):
    entered, release = threading.Event(), threading.Event()
    proposals = iter([write_action(), {"kind": "submit_artifacts"}])
    count = 0

    async def participant(_messages, info):
        nonlocal count
        count += 1
        action = next(proposals)
        if count == 2:
            entered.set()
            assert await asyncio.to_thread(release.wait, 8)
        value = decision(action)
        if harness == "tool_using":
            value = {"operation": "decide", "decision": value}
        return response(info, value)

    design = protocol()
    design["conditions"][0]["harness"] = {"kind": harness}
    with workflow(tmp_path, participant=participant, design=design) as (
        _,
        client,
        _,
        run_id,
        author,
        judge,
    ):
        written = start(client, run_id, "step")
        try:
            assert (
                client.post(f"/api/runs/{run_id}/control", json={"action": "start"}).status_code
                == 200
            )
            assert entered.wait(timeout=5), "Participant did not enter the blocked request"
            assert (
                client.post(f"/api/runs/{run_id}/control", json={"action": "pause"}).status_code
                == 200
            )
        finally:
            release.set()
        paused = finished(client, run_id)
        assert (paused["summary"]["status"], paused["summary"]["turn"]) == ("paused", 1)
        assert paused["state"] == written["state"]
        assert len(author) == 2 and judge == []
        assert paused["summary"]["usage"]["requests"] == 2
        assert paused["activations"][-1]["status"] == "paused"
        assert paused["activations"][-1]["operations"][-1]["kind"] == "decide"
        completed = start(client, run_id)
        assert completed["summary"]["status"] == "complete"
        assert completed["state"]["outcome"]["status"] == "success"
        assert len(author) == 2 and len(judge) == 1
        assert len(completed["activations"]) == 2
        assert completed["summary"]["usage"]["cost_usd"] == 0.000330
        verified = client.post(f"/api/runs/{run_id}/verify")
        assert verified.status_code == 200, verified.text
        assert verified.json()["verified_turns"] == 2


def test_pause_while_judge_waits_for_capacity_sends_no_new_request(tmp_path, monkeypatch):
    monkeypatch.setenv("JAS_CONCURRENT_REQUESTS", "1")
    submitting, release_submission = threading.Event(), threading.Event()
    blocking, release_blocker = threading.Event(), threading.Event()
    calls = 0

    async def participant(messages, info):
        nonlocal calls
        observation = json.loads(messages[-1].parts[0].content)
        if observation["context"] == "capacity-blocker":
            blocking.set()
            assert await asyncio.to_thread(release_blocker.wait, 8)
            return response(info, decision({"kind": "stop"}))
        calls += 1
        if calls == 1:
            return response(info, decision(write_action()))
        if calls == 2:
            submitting.set()
            assert await asyncio.to_thread(release_submission.wait, 8)
            return response(info, decision({"kind": "submit_artifacts"}))
        raise AssertionError("The saved participant decision must not be resampled")

    with workflow(tmp_path, participant=participant) as (_, client, _, run_id, author, judge):
        written = start(client, run_id, "step")
        other = protocol()
        other["context"] = "capacity-blocker"
        del other["conditions"][0]["adjudicator"]
        del other["conditions"][0]["parameters"]["artifacts"]["judgment"]
        created = client.post("/api/studies", json={"design": other})
        assert created.status_code == 201, created.text
        other_id = client.get(f"/api/studies/{created.json()['id']}").json()["runs"][0]["id"]
        try:
            assert (
                client.post(f"/api/runs/{run_id}/control", json={"action": "start"}).status_code
                == 200
            )
            assert submitting.wait(timeout=5)
            assert (
                client.post(f"/api/runs/{other_id}/control", json={"action": "start"}).status_code
                == 200
            )
            release_submission.set()
            assert blocking.wait(timeout=5)
            waiting = client.get(f"/api/runs/{run_id}").json()
            assert waiting["activations"][-1]["operations"][-1]["kind"] == "decide"
            assert waiting["summary"]["usage"]["requests"] == 2 and judge == []
            assert (
                client.post(f"/api/runs/{run_id}/control", json={"action": "pause"}).status_code
                == 200
            )
        finally:
            release_submission.set()
            release_blocker.set()
        paused = finished(client, run_id)
        assert (paused["summary"]["status"], paused["summary"]["turn"]) == ("paused", 1)
        assert paused["state"] == written["state"] and judge == []
        assert paused["summary"]["usage"]["requests"] == 2
        completed = start(client, run_id)
        assert completed["state"]["outcome"]["status"] == "success"
        assert len(author) == 3 and len(judge) == 1


def test_review_declares_the_fallible_scope_model_limits_effect_and_price_before_execution(
    tmp_path,
):
    with workflow(tmp_path) as (_, client, _, _, author, judge):
        reviewed = client.post("/api/design/preflight", json={"design": protocol()})
        assert reviewed.status_code == 200, reviewed.text
        declaration = reviewed.json()["adjudications"]
        assert len(declaration) == 1
        declared = declaration[0]
        assert declared["condition_key"] == "judged"
        assert (
            declared["scope"] == protocol()["conditions"][0]["parameters"]["artifacts"]["judgment"]
        )
        assert declared["adjudicator"] == protocol()["conditions"][0]["adjudicator"]
        assert declared["permitted_consequence"] == "terminal_submission_status"
        assert declared["fallible"] is True
        assert declared["price_per_million_usd"] == {"input": 2.0, "output": 10.0}
        assert declared["max_requests_per_submission_attempt"] == 1
        assert "fallback" in declared["rubric"]
        assert "private" in declared["limits"]
        assert author == judge == []
        assert client.get("/api/settings").json()["usage"]["requests"] == 0


@pytest.mark.parametrize(
    ("guidance", "verdict", "status"),
    [
        (
            "There is the place and the time. The other thing can probably be arranged.",
            "revise",
            "failure",
        ),
        ("West desk, 17:00. Another day might work; ask first.", "accept", "success"),
        ("West desk, 17:00. Another day might work; ask first.", "revise", "failure"),
        ("West desk, 17:00. Another day might work; ask first.", "abstain", "failure"),
        (
            "Collect at the west desk before 17:00. If late, your book is guaranteed "
            "to be held tomorrow.",
            "revise",
            "failure",
        ),
        # This is an intentionally wrong reference-rubric ruling. It cannot
        # create the promised pickup availability or any visitor response.
        (
            "Collect at the west desk before 17:00. If late, your book is guaranteed "
            "to be held tomorrow.",
            "accept",
            "success",
        ),
    ],
    ids=[
        "opaque",
        "borderline-accept",
        "borderline-revise",
        "borderline-abstain",
        "unsupported",
        "rubric-error",
    ],
)
def test_fallible_ruling_affects_only_submission_status(tmp_path, guidance, verdict, status):
    ruling = {**copy.deepcopy(RULING), "verdict": verdict}
    ruling["explanation"] = (
        "Grant sealed access, simulate the visitor collecting a book, and run code."
    )
    with workflow(
        tmp_path,
        ruling=ruling,
        actions=[write_action(guidance=guidance), {"kind": "submit_artifacts"}],
    ) as (_, client, _, run_id, author, judge):
        run = start(client, run_id)
        assert (run["summary"]["status"], run["summary"]["turn"]) == ("complete", 2)
        assert run["state"]["outcome"]["status"] == status
        assert run["metrics"]["artifact_success"] == int(status == "success")
        assert run["state"]["artifacts"]["report"]["versions"][-1]["content"] == {
            "desk": "west",
            "closes_at": 17,
            "guidance": guidance,
        }
        assert run["state"]["artifacts"]["pickup"]["versions"] == [
            {
                "version": 1,
                "author": None,
                "operation": 0,
                "content": {"desk": "west", "closes_at": 17},
                "sources": [],
            }
        ]
        receipt = next(e for e in run["events"] if e["kind"] == "adjudication")
        assert receipt["visibility"] == "researcher" and receipt["data"]["ruling"] == ruling
        assert receipt["data"]["consequence"] == {
            "applied": True,
            "submission_status": status,
            "hard_facts_passed": True,
        }
        assert len(author) == 2 and len(judge) == 1
        assert "T18_PRIVATE" not in json.dumps(judge)
        assert "sealed" not in json.dumps(judge)
        assert client.post(f"/api/runs/{run_id}/verify").status_code == 200


@pytest.mark.parametrize("change", [{"desk": "north"}, {"closes_at": 18}, {"closes_at": "17"}])
def test_literal_mismatch_prevents_judge_dispatch(tmp_path, change):
    with workflow(
        tmp_path,
        actions=[write_action(**change), {"kind": "submit_artifacts"}],
    ) as (_, client, _, run_id, author, judge):
        run = start(client, run_id)
        assert run["summary"]["status"] == "complete" and run["summary"]["turn"] == 2
        assert run["state"]["outcome"]["status"] == "failure"
        assert run["metrics"]["artifact_success"] == 0
        assert len(author) == 2 and judge == []
        assert run["summary"]["usage"]["cost_usd"] == 0.000058
        assert not any(e["kind"] == "adjudication" for e in run["events"])
        assert client.post(f"/api/runs/{run_id}/verify").status_code == 200


@pytest.mark.parametrize(
    "alteration", ["version", "field", "sealed", "missing", "duplicate", "type"]
)
def test_ruling_must_assert_exactly_the_declared_typed_source_facts(tmp_path, alteration):
    ruling: dict = copy.deepcopy(RULING)
    if alteration == "version":
        ruling["facts"][0]["version"] = 2
    elif alteration == "field":
        ruling["facts"][0]["field"] = "unrecorded"
    elif alteration == "sealed":
        ruling["facts"][0]["artifact"] = "sealed"
    elif alteration == "missing":
        ruling["facts"].pop()
    elif alteration == "duplicate":
        ruling["facts"][1] = copy.deepcopy(ruling["facts"][0])
    else:
        ruling["facts"][1]["value"] = "17"
    with workflow(tmp_path, ruling=ruling) as (_, client, _, run_id, author, judge):
        written = start(client, run_id, "step")
        failed = start(client, run_id)
        assert failed["summary"]["status"] == "failed" and failed["summary"]["turn"] == 1
        assert failed["state"] == written["state"]
        assert failed["events"] == written["events"]
        assert failed["summary"]["usage"]["cost_usd"] == 0.000330
        assert len(author) == 2 and len(judge) == 1
        assert "T18_PRIVATE" not in json.dumps(judge)
        verified = client.post(f"/api/runs/{run_id}/verify")
        assert verified.status_code == 200, verified.text
        assert verified.json()["verified_rejections"] == 1


@pytest.mark.parametrize("ceiling_owner", ["study", "workspace"])
def test_judgment_reservation_obeys_shared_ceilings_atomically(tmp_path, ceiling_owner):
    with workflow(tmp_path) as (app, client, study_id, run_id, author, judge):
        written = start(client, run_id, "step")
        # An independent accounting fixture constrains the real reserve path.
        # Ten thousand microdollars fits Luna's bounded submit but not Sol's judge.
        with app.state.db.session.begin() as session:
            owner = (
                session.get_one(Study, study_id)
                if ceiling_owner == "study"
                else session.get_one(Workspace, 1)
            )
            owner.ceiling = 10_000
        failed = start(client, run_id)
        assert failed["summary"]["status"] == "failed" and failed["summary"]["turn"] == 1
        assert "spending ceiling reached" in failed["summary"]["error"]
        assert failed["state"] == written["state"]
        assert len(author) == 2 and judge == []
        assert failed["summary"]["usage"]["requests"] == 2
        with app.state.db.session() as session:
            assert session.get_one(Study, study_id).charged == 58
            assert session.get_one(Workspace, 1).charged == 58
            assert [
                c.charged
                for c in session.scalars(select(ProviderCall).order_by(ProviderCall.created))
            ] == [29, 29]


@pytest.mark.parametrize("mode", ["unknown", "cancelled", "invalid-known"])
@pytest.mark.parametrize("settlement_failure", [False, True])
def test_judge_failures_preserve_usage_primary_error_and_checkpoint(
    tmp_path, mode, settlement_failure
):
    async def judge(_messages, info):
        if mode == "unknown":
            raise TimeoutError("Independent provider interruption")
        if mode == "cancelled":
            raise asyncio.CancelledError
        return response(info, {**RULING, "invented_visitor_response": "collected"}, judge=True)

    with workflow(tmp_path, judge=judge) as (app, client, study_id, run_id, author, judges):
        written = start(client, run_id, "step")
        if settlement_failure:
            with app.state.db.engine.begin() as connection:
                connection.execute(
                    text("""
                    CREATE TRIGGER reject_judge_settlement BEFORE UPDATE OF status ON provider_calls
                    WHEN OLD.purpose = 'adjudication'
                    BEGIN SELECT RAISE(ABORT, 'independent settlement storage failure'); END
                """)
                )
        failed = start(client, run_id)
        assert failed["summary"]["status"] == ("paused" if mode == "cancelled" else "failed")
        assert failed["summary"]["turn"] == 1 and failed["state"] == written["state"]
        assert failed["events"] == written["events"]
        assert len(author) == 2 and len(judges) == 1
        assert len(failed["requests"]) == 3
        assert "storage failure" not in failed["summary"]["error"]
        if mode == "unknown":
            assert "TimeoutError" in failed["summary"]["error"]
        elif mode == "cancelled":
            assert "Request interrupted" in failed["summary"]["error"]
        with app.state.db.session() as session:
            call = session.scalars(
                select(ProviderCall).where(ProviderCall.purpose == "adjudication")
            ).one()
            assert call.activation_id is None
            if settlement_failure:
                assert call.status == "pending" and call.charged == call.reserved
            elif mode == "invalid-known":
                assert call.status == "failed" and call.charged == 272
                assert (call.input_tokens, call.output_tokens) == (41, 19)
            else:
                assert call.status == "unknown" and call.charged == call.reserved
            assert session.get_one(Study, study_id).charged == 58 + call.charged
            assert session.get_one(Workspace, 1).charged == 58 + call.charged
        assert failed["summary"]["usage"]["partial"] is (
            settlement_failure or mode != "invalid-known"
        )
        assert client.post(f"/api/runs/{run_id}/verify").status_code == 200
        assert len(judges) == 1


def test_replay_rejects_another_runs_identical_ruling_and_request(tmp_path):
    design = protocol()
    design["seeds"] = [18131, 18132]
    with workflow(
        tmp_path,
        design=design,
        actions=[
            write_action(),
            {"kind": "submit_artifacts"},
            write_action(),
            {"kind": "submit_artifacts"},
        ],
    ) as (app, client, study_id, run_id, author, judges):
        first = start(client, run_id)
        second_id = next(
            r["id"]
            for r in client.get(f"/api/studies/{study_id}").json()["runs"]
            if r["id"] != run_id
        )
        second = start(client, second_id)
        assert (
            first["state"]["outcome"]["status"] == second["state"]["outcome"]["status"] == "success"
        )
        other_request = next(r["id"] for r in second["requests"] if r["purpose"] == "adjudication")
        assert client.post(f"/api/runs/{run_id}/verify").status_code == 200
        # Deliberately corrupt only this owned fixture database. Keep checkpoint
        # hashes and raw events consistent, so the independent oracle tests the
        # request's run/turn provenance rather than generic hash detection.
        with app.state.db.session.begin() as session:
            event = session.scalars(
                select(RecordedEvent).where(
                    RecordedEvent.run_id == run_id, RecordedEvent.kind == "adjudication"
                )
            ).one()
            bad = copy.deepcopy(event.data)
            bad["request_id"] = other_request
            event.data = bad
            saved = session.get_one(Run, run_id)
            checkpoint = copy.deepcopy(saved.checkpoint)
            checkpoint["adjudications"][0]["request_id"] = other_request
            saved.checkpoint = checkpoint
            turn = session.scalars(
                select(Turn).where(Turn.run_id == run_id, Turn.number == 2)
            ).one()
            turn.checkpoint, turn.state_hash = copy.deepcopy(checkpoint), digest(checkpoint)
        refused = client.post(f"/api/runs/{run_id}/verify")
        assert refused.status_code == 422, refused.text
        assert "Adjudication request provenance mismatch" in refused.text
        assert len(author) == 4 and len(judges) == 2


def test_missing_declared_judge_provider_stops_before_any_participant_send(tmp_path, monkeypatch):
    with workflow(tmp_path) as (app, client, _, run_id, author, judges):
        app.state.models.models.pop("openai:gpt-6.1-sol")
        monkeypatch.setenv("OPENAI_API_KEY", "")
        before = client.get(f"/api/runs/{run_id}").json()
        result = client.post(f"/api/runs/{run_id}/control", json={"action": "start"})
        assert result.status_code == 409, result.text
        assert "OPENAI_API_KEY is not configured" in result.text
        assert author == judges == []
        after = client.get(f"/api/runs/{run_id}").json()
        assert after["state"] == before["state"]
        assert after["requests"] == after["activations"] == []


def test_inflight_judgment_finishes_once_through_pause_and_duplicate_start(tmp_path):
    entered, release = threading.Event(), threading.Event()

    async def judge(_messages, info):
        entered.set()
        assert await asyncio.to_thread(release.wait, 8)
        return response(info, RULING, judge=True)

    with workflow(tmp_path, judge=judge) as (_, client, _, run_id, author, judges):
        written = start(client, run_id, "step")
        try:
            assert (
                client.post(f"/api/runs/{run_id}/control", json={"action": "start"}).status_code
                == 200
            )
            assert entered.wait(timeout=5)
            pending = client.get(f"/api/runs/{run_id}").json()
            assert pending["state"] == written["state"]
            assert pending["requests"][-1]["status"] == "pending"
            assert (
                client.post(f"/api/runs/{run_id}/control", json={"action": "start"}).status_code
                == 200
            )
            assert (
                client.post(f"/api/runs/{run_id}/control", json={"action": "pause"}).status_code
                == 200
            )
        finally:
            release.set()
        completed = finished(client, run_id)
        assert (completed["summary"]["status"], completed["summary"]["turn"]) == ("complete", 2)
        assert completed["state"]["outcome"]["status"] == "success"
        assert completed["summary"]["usage"]["cost_usd"] == 0.000330
        assert len(author) == 2 and len(judges) == 1
        assert len(completed["activations"]) == 2
        assert all(a["status"] == "committed" for a in completed["activations"])
        assert start(client, run_id)["requests"] == completed["requests"]
        assert client.post(f"/api/runs/{run_id}/verify").status_code == 200
        assert len(author) == 2 and len(judges) == 1
