"""Independent T16 integration DEVELOPMENT oracles; no live models or generation."""

import json
import threading
from itertools import product
from pathlib import Path

import pytest
from agent_sim.api import create_app
from agent_sim.domain import Decision, Design
from fastapi.testclient import TestClient

from backend.tests.test_researcher_tools import answer, finish, scripted


@pytest.fixture
def admitted(tmp_path):
    source = Path(__file__).with_name("fixtures").joinpath("t16_sealed_relay.wat").read_text()
    with TestClient(
        create_app(f"sqlite:///{tmp_path}/independent.sqlite3"), base_url="http://localhost"
    ) as client:
        qualification = client.post("/api/extensions/qualify", json={})
        assert qualification.json()["status"] == "qualified", qualification.text
        review = client.post(
            "/api/extensions/validate",
            json={
                "format": "jas-extension-candidate-v1",
                "name": "Independent amber/slate relay",
                "provenance": "Frozen integration DEVELOPMENT mechanics; no live calls",
                "source": source,
                "examples": [{"state": 24, "expected": 6}, {"state": 53, "expected": 8}],
            },
        ).json()
        admitted = client.post(
            f"/api/extensions/reviews/{review['id']}/admit", json={"profile": "sealed-relay-v1"}
        ).json()
        assert admitted["runnable"], admitted
        saved = client.post(
            "/api/environments",
            json={
                "definition": {
                    "name": "Independent amber/slate relay",
                    "environment": "sealed_relay",
                    "rule_version": "1.0.0",
                    "extension": admitted["package"],
                    "examples": [
                        {
                            "key": "independent",
                            "name": "Explicit finite relay",
                            "roles": ["amber", "slate"],
                            "parameters": {
                                "relay": {
                                    "submitter": "amber",
                                    "reviewer": "slate",
                                    "docket": "seal-42",
                                }
                            },
                        }
                    ],
                }
            },
        )
        assert saved.status_code == 201, saved.text
        yield client, saved.json()


@pytest.mark.parametrize("revision", [False, True])
def test_executable_save_keeps_the_contained_worker_off_the_api_loop(
    admitted, monkeypatch, revision
):
    import agent_sim.extensions as extensions

    client, source = admitted
    design = client.post(
        "/api/design/use-environment", json={"source": source, "example": "independent"}
    ).json()
    path = "/api/studies"
    if revision:
        saved = client.post(path, json={"design": design})
        assert saved.status_code == 201, saved.text
        path += f"/{saved.json()['id']}/revisions"
    assert client.portal is not None
    api_thread = client.portal.call(threading.get_ident)
    worker_threads = []
    execute = extensions.execute

    def observed(source, states, **kwargs):
        worker_threads.append(threading.get_ident())
        return execute(source, states, **kwargs)

    monkeypatch.setattr(extensions, "execute", observed)
    saved = client.post(path, json={"design": design})
    assert saved.status_code == 201, saved.text
    assert worker_threads and api_thread not in worker_threads
    exported = client.get(f"/api/studies/{saved.json()['id']}/export").json()
    assert exported["revisions"][-1]["design"]["environment_source"] == source
    assert client.get("/api/settings").json()["usage"]["requests"] == 0


def test_admitted_mechanics_are_discoverable_by_their_public_lookup_id(admitted, monkeypatch):
    client, source = admitted

    def respond(prompt):
        if not prompt.get("research", {}).get("operations"):
            return answer(
                "Inspect the admitted package.",
                requests=[{"kind": "capabilities", "environment": "sealed_relay"}],
            )
        return answer("Finite mechanics do not establish intelligence or arbitrary correctness.")

    scripted(client, monkeypatch, respond)
    final = finish(
        client,
        client.post(
            "/api/chats", json={"question": "Which independently admitted relay can I inspect?"}
        ).json(),
    )
    assert final["status"] == "complete", final
    operation = final["output"]["research"]["operations"][0]
    assert operation["status"] == "complete", operation
    assert operation["data"]["custom_environments"] == [source]
    assert {"kind": "environment", "id": source["id"], "hash": source["sha256"]} in operation[
        "sources"
    ]
    assert client.get(f"/api/environments/{source['id']}").json() == source
    assert client.get("/api/studies").json() == []
    assert final["usage"]["requests"] == 2


@pytest.mark.parametrize("runtime", ["lost", "changed"])
def test_zero_turn_replay_requires_current_runtime_without_changing_pins(
    admitted, monkeypatch, runtime
):
    from agent_sim.extensions import ExtensionRuntime

    client, source = admitted
    design = client.post(
        "/api/design/use-environment", json={"source": source, "example": "independent"}
    ).json()
    response = client.post("/api/studies", json={"design": design})
    assert response.status_code == 201, response.text
    sid = response.json()["id"]
    rid = client.get(f"/api/studies/{sid}").json()["runs"][0]["id"]
    exported = client.get(f"/api/studies/{sid}/export").json()
    assert client.post(f"/api/runs/{rid}/verify", json={}).json()["verified_turns"] == 0
    before = client.get(f"/api/runs/{rid}").json()
    usage = client.get("/api/settings").json()["usage"]
    monkeypatch.setattr(
        client.app.state.models, "model", lambda _: pytest.fail("Replay constructed a provider")
    )
    if runtime == "lost":
        client.app.state.extensions.runtime = ExtensionRuntime()
    else:
        monkeypatch.setattr(client.app.state.extensions, "_fingerprint", lambda: "changed-runtime")
    denied = client.post(f"/api/runs/{rid}/verify", json={})
    assert denied.status_code == 422, denied.text
    assert "containment" in denied.json()["detail"]
    after = client.get(f"/api/runs/{rid}").json()
    assert after["execution_blocked"]
    for key in ("state", "turns", "events", "measurements", "requests", "activations"):
        assert after[key] == before[key]
    retained = client.get(f"/api/studies/{sid}/export").json()
    for key in ("revisions", "requests", "activations", "exposure", "analyses"):
        assert retained[key] == exported[key]
    assert retained["runs"][0]["evidence"] == exported["runs"][0]["evidence"]
    assert client.get("/api/settings").json()["usage"] == usage


def test_finite_inputs_world_privacy_atomicity_and_exact_restoration(admitted):
    client, source = admitted
    package = client.app.state.research.environments.get(source["id"]).definition.extension
    assert package is not None
    # Enumerate literal transitions by their constituent dimensions, independently
    # of both the WAT and installed expected()/decoder implementation.
    inputs, oracle = [], []
    for phase, credits, slot, operation in product(range(4), range(4), range(2), range(4)):
        inputs.append(phase * 32 + credits * 8 + slot * 4 + operation)
        value = -1
        if phase < 2:
            if operation == 0 and phase == 0 and slot == 0 and credits >= 1:
                value = 4 + credits - 1
            elif operation == 1 and phase == 1 and slot == 1 and credits >= 2:
                value = 8 + credits - 2
            elif operation == 2 and credits >= 1:
                value = phase * 4 + credits - 1
            elif operation == 3 and credits >= 1:
                value = 12 + credits - 1
        oracle.append(value)
    inputs.extend([-1, 128, 2147483647, -2147483648])
    oracle.extend([-1, -1, -1, -1])
    assert client.app.state.extensions.transition(package, inputs + inputs) == oracle * 2

    design = Design.model_validate(
        {
            "title": "Independent finite relay",
            "question": "Do explicit permissions, privacy and finite resources settle exactly?",
            "environment": "sealed_relay",
            "environment_source": source,
            "profiles": [
                {"key": "amber", "name": "Amber", "role": "Reviewer", "goal": "Choose freely"},
                {"key": "slate", "name": "Slate", "role": "Submitter", "goal": "Choose freely"},
            ],
            "seeds": [347],
            "rounds": 2,
            "measures": ["relay_success"],
            "conditions": [
                {
                    "key": "explicit",
                    "name": "Explicit permissions",
                    "parameters": {
                        "relay": {"submitter": "amber", "reviewer": "slate", "docket": "seal-42"}
                    },
                }
            ],
        }
    )
    parameters = design.conditions[0].parameters

    def world(state=None, *, params=parameters, spec=design):
        return client.app.state.research.world(spec, params, 347, state)

    def proposal(operation):
        return Decision.model_validate(
            {
                "action": {"kind": "relay", "operation": operation},
                "rationale": "Prose cannot settle a transition",
                "memory": "amber-private-note",
                "forecast": None,
            }
        )

    initial = world()
    before = initial.snapshot()
    assert initial.actor() == "amber"
    hidden = parameters.model_copy(deep=True)
    assert hidden.relay is not None
    hidden.relay.docket = "seal-93"
    variant = world(params=hidden)
    assert initial.observe("amber") == variant.observe("amber")
    assert initial.decision_schema(initial.observe("amber")).model_json_schema() == (
        variant.decision_schema(variant.observe("amber")).model_json_schema()
    )
    assert "seal-42" not in json.dumps(initial.observe("amber"))
    assert initial.observe("slate")["relay"]["docket"] == "seal-42"
    for actor, operation in [("slate", "lodge"), ("amber", "release"), ("foreign", "wait")]:
        with pytest.raises(ValueError):
            initial.step(actor, proposal(operation))
        assert initial.snapshot() == before
    with pytest.raises(ValueError, match="unavailable"):
        initial.observe("foreign")

    for operation, expected in [("lodge", (1, 2, "slate")), ("release", (2, 0, None))]:
        actor = initial.actor()
        restored = world(initial.snapshot())
        assert restored.observe(actor) == initial.observe(actor)
        assert restored.step(actor, proposal(operation)) == initial.step(actor, proposal(operation))
        assert restored.snapshot() == initial.snapshot()
        assert (initial.state["phase"], initial.state["credits"], initial.actor()) == expected
    assert initial.state["outcome"] == {"success": True, "reason": "released"}
    terminal = initial.snapshot()
    with pytest.raises(ValueError):
        initial.step("amber", proposal("wait"))
    assert initial.snapshot() == terminal
    assert world(before).snapshot() == before

    for memory in ["none", "notes", "history", "episodic"]:
        scoped = parameters.model_copy(update={"memory": memory})
        current = world(params=scoped)
        current.step("amber", proposal("lodge"))
        restored = world(current.snapshot(), params=scoped)
        assert restored.observe("amber") == current.observe("amber")
        assert "seal-42" not in json.dumps(restored.observe("amber"))
        assert "amber-private-note" not in json.dumps(restored.observe("slate"))

    for operations, phase, credits, reason, rounds in [
        (["wait", "wait", "lodge"], 1, 0, "exhausted", 2),
        (["stop"], 3, 2, "stopped", 2),
        (["wait", "wait"], 0, 1, "horizon", 1),
    ]:
        spec = design.model_copy(update={"rounds": rounds})
        current = world(spec=spec)
        for operation in operations:
            current.step(current.actor(), proposal(operation))
        assert current.actor() is None
        assert (current.state["phase"], current.state["credits"]) == (phase, credits)
        assert current.state["outcome"] == {"success": False, "reason": reason}
        assert world(current.snapshot(), spec=spec).snapshot() == current.snapshot()
    assert client.get("/api/settings").json()["usage"]["requests"] == 0


def test_four_grounded_followups_preserve_t11_source_and_complete_input_bounds(
    tmp_path, monkeypatch
):
    from agent_sim.db import ProviderCall
    from sqlalchemy import select

    from backend.tests.test_reliance_integration import protocol
    from backend.tests.test_researcher_designs import finish as finish_design
    from backend.tests.test_researcher_designs import provider, scope

    design = Design.model_validate(protocol(rounds=7)).model_dump()
    app = create_app(f"sqlite:///{tmp_path}/followups.sqlite3")
    with TestClient(app, base_url="http://localhost") as client:
        brief = scope(
            design,
            operationalization=(
                "Voluntary entrusting, deadline commitments and addressed responses."
            ),
            size_rationale="Four active participants, seven phases, one descriptive seed; "
            "independent choices and responses remain possible. Saving authorizes no run.",
            requirements=[
                {
                    "source": "make commitments",
                    "capability": "commitments",
                    "mapping": "direct",
                    "explanation": "Explicit promises, access grants and deadlines.",
                }
            ],
        )
        calls = provider(client, monkeypatch, design, brief=brief)
        chat_id, pinned, final = None, None, None
        questions = [design["question"], *["Retain that source and the four participants."] * 4]
        for question in questions:
            final = finish_design(
                client, client.post("/api/chats", json={"question": question, "chat_id": chat_id})
            )
            assert final["status"] == "complete", final
            proposal = final["output"]["design"]
            assert proposal["question"] == design["question"]
            assert proposal["profiles"] == design["profiles"]
            assert proposal["conditions"] == design["conditions"]
            pinned = pinned or proposal["environment_source"]
            assert proposal["environment_source"] == pinned
            chat_id = final["chat_id"]
        assert len(client.get(f"/api/chats/{chat_id}").json()) == 5
        with app.state.db.session() as session:
            records = session.scalars(select(ProviderCall)).all()
            assert len(records) == len(calls)
            for record in records:
                assert record.model == "openai:gpt-6.1-sol" and record.status == "complete"
                payload = record.request_payload
                assert payload is not None
                request_input = payload["prompt"] + payload["instructions"] + json.dumps(
                    payload["schema"]
                )
                assert len(request_input.encode()) + 4096 <= 180_000
        assert final is not None
        before = client.get("/api/settings").json()["usage"]
        saved = client.post(
            "/api/studies", json={"design": final["output"]["design"], "plan_id": final["id"]}
        )
        assert saved.status_code == 201, saved.text
        assert client.get("/api/settings").json()["usage"] == before
        runs = client.get(f"/api/studies/{saved.json()['id']}").json()["runs"]
        assert len(runs) == 1 and runs[0]["turn"] == 0 and runs[0]["status"] == "ready"
