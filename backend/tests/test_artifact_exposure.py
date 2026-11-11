"""Artifact content delivery crosses the public workflow and recorded request seam."""

import json
import time

import pytest
from agent_sim.api import create_app
from fastapi.testclient import TestClient
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.models.function import FunctionModel
from pydantic_ai.usage import RequestUsage

from backend.tests.test_artifact_workspace import save
from backend.tests.test_claim_support import claim_client as claim_client
from backend.tests.test_claim_support import run as run_control
from backend.tests.test_coordination_integration import ACTORS
from backend.tests.test_coordination_integration import protocol as coordination_protocol
from backend.tests.test_reliance_commitments import ACTORS as RELIANCE_ACTORS
from backend.tests.test_reliance_commitments import protocol as reliance_protocol
from backend.tests.test_workflow_integration_review import review_protocol


def artifact_protocol(*, harness="tool_using", compact=False, memory="episodic"):
    content = {"temperature": 43}
    if compact:
        content.update({f"detail_{i}": "x" * 900 for i in range(5)})
    return {
        "title": "Independent artifact delivery witness",
        "question": "Which evidence content reaches the bounded participant request?",
        "environment": "artifact_workspace",
        "profiles": [
            {"key": "rhea", "name": "Rhea", "role": "Administrator", "goal": "Inspect or stop."}
        ],
        "seeds": [229],
        "rounds": 3,
        "conditions": [
            {
                "key": "audit",
                "name": "Audit",
                "harness": (
                    {
                        "kind": "tool_using",
                        "tools": ["read_artifact"],
                        "max_requests": 2,
                        "max_tool_operations": 1,
                        "max_context_chars": 4000,
                    }
                    if harness == "tool_using"
                    else {"kind": "direct_action"}
                ),
                "parameters": {
                    "memory": memory,
                    "artifacts": {
                        "write_limit": 1,
                        "objects": [
                            {
                                "key": "thermometer",
                                "name": "Thermometer",
                                "readers": ["rhea"],
                                "content": content,
                            },
                            {
                                "key": "worksheet",
                                "name": "Worksheet",
                                "owner": "rhea",
                                "content": {"temperature": 0},
                            },
                        ],
                        "requirements": [
                            {
                                "artifact": "worksheet",
                                "field": "temperature",
                                "source": "thermometer",
                                "source_field": "temperature",
                            }
                        ],
                    },
                },
            }
        ],
        "measures": ["artifact_success"],
    }


def decision(action):
    return {"action": action, "rationale": "Scripted witness.", "memory": "", "forecast": None}


def settle(client, rid):
    assert client.post(f"/api/runs/{rid}/control", json={"action": "start"}).status_code == 200
    deadline = time.monotonic() + 8
    while time.monotonic() < deadline:
        run = client.get(f"/api/runs/{rid}").json()
        if run["summary"]["status"] not in {"queued", "running", "pausing"}:
            return run
        time.sleep(0.005)
    pytest.fail("Witness did not settle")


@pytest.mark.parametrize("compact,unknown", [(False, False), (True, False), (False, True)])
def test_artifact_tool_exposure_requires_actual_bounded_content_and_delivery(
    tmp_path, monkeypatch, compact, unknown
):
    prompts = []

    async def respond(messages, info):
        payload = json.loads(messages[-1].parts[0].content)
        prompts.append(payload)
        if len(prompts) == 2 and unknown:
            raise TimeoutError("Independent missing delivery receipt")
        read = not payload["operations"]
        output = {
            "operation": "read_artifact" if read else "decide",
            "read": {"kind": "read_artifact", "artifact": "thermometer", "version": 1}
            if read
            else None,
            "decision": None if read else decision({"kind": "stop"}),
        }
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, output)],
            usage=RequestUsage(input_tokens=71, output_tokens=29),
        )

    app = create_app(f"sqlite:///{tmp_path}/tool.sqlite3", static_dir=tmp_path / "static")
    provider = FunctionModel(function=respond)
    monkeypatch.setattr(app.state.models, "model", lambda _: provider)
    with TestClient(app, base_url="http://localhost") as client:
        created = client.post("/api/studies", json={"design": artifact_protocol(compact=compact)})
        assert created.status_code == 201, created.text
        sid = created.json()["id"]
        study = client.get(f"/api/studies/{sid}").json()
        rid = study["runs"][0]["id"]
        before = client.get(f"/api/runs/{rid}/exposure").json()
        revision_source = {
            "href": f"/api/studies/{sid}?revision=1",
            "pointer": "/design",
            "label": f"Revision 1 · {study['sha256'][:12]}",
        }
        assert before["assignment"]["source"] == revision_source
        run = settle(client, rid)
        assert len(prompts) == 2
        operation = run["activations"][0]["operations"][0]
        assert operation["kind"] == "read_artifact"
        assert operation["result"]["content"]["temperature"] == 43
        exposure = client.get(f"/api/runs/{rid}/exposure").json()
        assert exposure["assignment"] == before["assignment"], (
            "Artifact read receipts must preserve the immutable design assignment source"
        )
        assert (
            client.get(revision_source["href"]).json()["sha256"]
            == exposure["assignment"]["design_sha256"]
        )
        rows = [r for r in exposure["opportunities"] if r["kind"] == "read_artifact"]
        assert len(rows) == 1, "A real pure read needs its own source-linked opportunity"
        assert rows[0]["source"]["href"] == f"/api/runs/{rid}"
        assert rows[0]["source"]["pointer"].endswith("/operations/number=1/result")
        expected = None if unknown else not compact
        assert rows[0]["included"] is expected
        assert len(rows[0]["inputs"]) == (0 if compact else 1)
        if not compact:
            receipt = rows[0]["inputs"][0]
            assert receipt["delivery"] == ("unknown" if unknown else "confirmed")
            raw = client.get(receipt["source"]["href"]).json()
            assert "43" in raw["request"]["prompt"]
        else:
            assert "receipt" in prompts[-1]["operations"][0]
        usage = client.get("/api/settings").json()["usage"]
        assert client.post(f"/api/runs/{rid}/verify").json()["model_requests"] == 0
        assert client.get("/api/settings").json()["usage"] == usage
        (tmp_path / "evidence.json").write_text(
            json.dumps(
                {
                    "run": run,
                    "prompts": prompts,
                    "exposure": exposure,
                    "export": client.get(f"/api/studies/{sid}/export").json(),
                }
            )
        )


@pytest.mark.parametrize("memory", ["none", "episodic"])
def test_direct_artifact_read_content_is_bound_to_the_next_actual_request(
    tmp_path, monkeypatch, memory
):
    actions = iter(
        [{"kind": "read_artifact", "artifact": "thermometer", "version": 1}, {"kind": "stop"}]
    )

    async def respond(_messages, info):
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, decision(next(actions)))],
            usage=RequestUsage(input_tokens=71, output_tokens=29),
        )

    app = create_app(f"sqlite:///{tmp_path}/direct.sqlite3", static_dir=tmp_path / "static")
    provider = FunctionModel(function=respond)
    monkeypatch.setattr(app.state.models, "model", lambda _: provider)
    with TestClient(app, base_url="http://localhost") as client:
        created = client.post(
            "/api/studies",
            json={"design": artifact_protocol(harness="direct_action", memory=memory)},
        )
        assert created.status_code == 201, created.text
        rid = client.get(f"/api/studies/{created.json()['id']}").json()["runs"][0]["id"]
        run = settle(client, rid)
        assert run["summary"]["turn"] == 2
        exposure = client.get(f"/api/runs/{rid}/exposure").json()
        row = next(r for r in exposure["opportunities"] if r["kind"] == "read_artifact")
        assert row["included"] is True, (
            "Last read content was actually delivered even without memory"
        )
        assert any("last_result" in i["source"]["pointer"] for i in row["inputs"])


@pytest.mark.parametrize("corruption", ["result", "request", "operation", "kind"])
def test_replay_checks_rejected_artifact_read_receipts(tmp_path, monkeypatch, corruption):
    from agent_sim.db import ParticipantOperation
    from sqlalchemy import select

    async def respond(_messages, info):
        return ModelResponse(
            parts=[
                ToolCallPart(
                    info.output_tools[0].name,
                    {
                        "operation": "read_artifact",
                        "read": {"kind": "read_artifact", "artifact": "unavailable", "version": 1},
                        "decision": None,
                    },
                )
            ],
            usage=RequestUsage(input_tokens=71, output_tokens=29),
        )

    app = create_app(f"sqlite:///{tmp_path}/denied.sqlite3", static_dir=tmp_path / "static")
    provider = FunctionModel(function=respond)
    monkeypatch.setattr(app.state.models, "model", lambda _: provider)
    with TestClient(app, base_url="http://localhost") as client:
        created = client.post("/api/studies", json={"design": artifact_protocol()})
        assert created.status_code == 201, created.text
        rid = client.get(f"/api/studies/{created.json()['id']}").json()["runs"][0]["id"]
        run = settle(client, rid)
        assert run["summary"]["status"] == "failed"
        assert client.post(f"/api/runs/{rid}/verify").status_code == 200
        usage = client.get("/api/settings").json()["usage"]
        with app.state.db.session.begin() as session:
            receipt = session.scalars(select(ParticipantOperation)).one()
            if corruption == "result":
                receipt.result = "Forged rejection"
            elif corruption == "operation":
                receipt.request = {**receipt.request, "operation": "decide"}
            elif corruption == "kind":
                receipt.kind = "observe"
            else:
                receipt.request = {
                    **receipt.request,
                    "read": {
                        "kind": "read_artifact",
                        "artifact": "thermometer",
                        "version": 1,
                    },
                }
        verified = client.post(f"/api/runs/{rid}/verify")
        assert verified.status_code == 422, verified.text
        assert client.get("/api/settings").json()["usage"] == usage
        assert client.get(f"/api/runs/{rid}").json()["state"] == run["state"]


@pytest.mark.parametrize(
    "memory,readers,included",
    [
        pytest.param("episodic", ACTORS, ACTORS, id="shared"),
        pytest.param("episodic", ACTORS[:2], ACTORS[:2], id="restricted"),
        pytest.param("none", ACTORS, ACTORS[:1], id="no-memory"),
    ],
)
def test_shared_artifact_exposure_follows_authorized_actual_inputs(
    claim_client, memory, readers, included
):
    client, controls, seen = claim_client
    value = coordination_protocol()
    parameters = value["conditions"][0]["parameters"]
    parameters["memory"] = memory
    parameters["artifacts"]["objects"][-1].update(readers=readers, writers=ACTORS[:1])
    controls["artifact_actions"] = iter(
        [
            {
                "kind": "write_artifact",
                "artifact": "work",
                "expected_version": 1,
                "content": {"proposal": "shared-artifact-payload-43"},
                "sources": [],
            },
            *[{"kind": "wait_coordination"}] * 5,
        ]
    )
    study, rid = save(client, value)
    for tick in range(1, 4):
        assert run_control(client, rid, "step")["turn"] == tick
    cutoff = client.get(f"/api/runs/{rid}/exposure?through_turn=3").json()
    for tick in range(4, 7):
        assert run_control(client, rid, "step")["turn"] == tick
    run = client.get(f"/api/runs/{rid}").json()
    assert len(seen) == 6
    for actor, prompt in zip(ACTORS, seen[3:], strict=True):
        assert ("shared-artifact-payload-43" in json.dumps(prompt)) is (actor in included)
        assert {obj["key"] for obj in prompt["artifacts"]} == {
            f"evidence-{ACTORS.index(actor)}",
            *(["work"] if actor in readers else []),
        }
    exposure = client.get(f"/api/runs/{rid}/exposure").json()
    summary = next(row for row in exposure["summary"] if row["kind"] == "write_artifact")
    assert summary["exposed_participants"] == len(included)
    assert summary["eligible_participants"] == len(readers)
    rows = [row for row in exposure["opportunities"] if row["kind"] == "write_artifact"]
    assert {row["participant"] for row in rows} == set(readers)
    assert {row["participant"] for row in rows if row["included"]} == set(included)
    before = next(row for row in cutoff["summary"] if row["kind"] == "write_artifact")
    assert before["eligible_participants"] == len(readers)
    assert before["exposed_participants"] == 0
    assert client.get(f"/api/runs/{rid}/exposure?through_turn=3").json() == cutoff
    exported = client.get(f"/api/studies/{study['id']}/export").json()
    assert exported["exposure"][0] == exposure
    assert client.post(f"/api/runs/{rid}/verify").json()["verified_turns"] == 6
    assert client.get(f"/api/runs/{rid}").json()["summary"]["usage"] == run["summary"]["usage"]


def test_artifact_read_grant_changes_eligibility_only_at_its_recorded_cutoff(claim_client):
    client, controls, seen = claim_client
    value = reliance_protocol("sequential")
    value["conditions"][0]["parameters"]["commitments"]["opportunities"][0].update(
        opens_at=8, deadline=12
    )
    controls["artifact_actions"] = iter(
        [
            {"kind": "wait_coordination"},
            {
                "kind": "write_artifact",
                "artifact": "sealed-fen",
                "expected_version": 1,
                "content": {"reading": "new-private-write-43"},
                "sources": [],
            },
            {"kind": "wait_coordination"},
            {"kind": "wait_coordination"},
            {"kind": "make_commitment", "opportunity": "alpha"},
            {"kind": "rely_on_commitment", "opportunity": "alpha"},
            *[{"kind": "wait_coordination"}] * 3,
        ]
    )
    _, rid = save(client, value)

    def writes(cutoff):
        response = client.get(f"/api/runs/{rid}/exposure?through_turn={cutoff}")
        assert response.status_code == 200, response.text
        return [row for row in response.json()["opportunities"] if row["kind"] == "write_artifact"]

    for turn in range(1, 6):
        assert run_control(client, rid, "step")["turn"] == turn
    before = writes(5)
    assert {row["participant"] for row in before} == {"fen-2"}
    assert not any(row["included"] for row in before)
    assert run_control(client, rid, "step")["turn"] == 6
    granted = writes(6)
    assert {row["participant"] for row in granted} == {"oak-7", "fen-2"}
    assert {row["participant"] for row in granted if row["included"]} == {"fen-2"}
    for turn in range(7, 10):
        assert run_control(client, rid, "step")["turn"] == turn
    assert "new-private-write-43" in json.dumps(seen[8])
    assert all(
        "new-private-write-43" not in json.dumps(prompt)
        for actor, prompt in zip(RELIANCE_ACTORS * 2, seen[:8], strict=True)
        if actor in {"ash-9", "bay-4"}
    )
    assert {row["participant"] for row in writes(9) if row["included"]} == {"oak-7", "fen-2"}
    assert writes(5) == before
    assert writes(6) == granted
    usage = client.get("/api/settings").json()["usage"]
    assert client.post(f"/api/runs/{rid}/verify").json()["verified_turns"] == 9
    assert client.get("/api/settings").json()["usage"] == usage


def test_workflow_owner_exposure_counts_every_authorized_work_observation(claim_client):
    client, controls, seen = claim_client
    controls["artifact_actions"] = iter(
        [{"kind": "claim_work", "work": "draft"}, *[{"kind": "wait_workflow"}] * 11]
    )
    _, rid = save(client, review_protocol())
    for turn in range(1, 13):
        assert run_control(client, rid, "step")["turn"] == turn
    for actor, prompt in zip("abcdef", seen[6:], strict=True):
        draft = [work for work in prompt["workflow"]["work"] if work["key"] == "draft"]
        assert [work["owner"] for work in draft] == (["a"] if actor in "abcd" else [])
    exposure = client.get(f"/api/runs/{rid}/exposure").json()
    row = next(row for row in exposure["summary"] if row["kind"] == "claim_work")
    assert row["eligible_participants"] == row["exposed_participants"] == 4
    opportunities = [row for row in exposure["opportunities"] if row["kind"] == "claim_work"]
    assert {row["participant"] for row in opportunities} == set("abcd")
    before = client.get(f"/api/runs/{rid}/exposure?through_turn=6").json()
    row = next(row for row in before["summary"] if row["kind"] == "claim_work")
    assert row["eligible_participants"] == 4 and row["exposed_participants"] == 0
    state = client.get(f"/api/runs/{rid}").json()["state"]
    assert (state["resource_stock"], state["resource_spent"]) == (8, 0)
    usage = client.get("/api/settings").json()["usage"]
    assert client.post(f"/api/runs/{rid}/verify").json()["verified_turns"] == 12
    assert client.get("/api/settings").json()["usage"] == usage
