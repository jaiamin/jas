"""T16 DEVELOPMENT: public review/admission, independently frozen finite semantics."""

from pathlib import Path

import pytest
from agent_sim.api import create_app
from fastapi.testclient import TestClient

SOURCE = Path(__file__).with_name("fixtures").joinpath("t16_sealed_relay.wat").read_text()


def candidate(source=SOURCE):
    return {
        "format": "jas-extension-candidate-v1",
        "name": "Independent sealed relay DEVELOPMENT",
        "provenance": "T16 frozen independent specification; no generation or live models",
        "source": source,
        "examples": [{"state": 24, "expected": 6}, {"state": 53, "expected": 8}],
    }


def test_independent_admission_cannot_be_replaced_by_candidate_examples(tmp_path):
    with TestClient(
        create_app(f"sqlite:///{tmp_path}/t16.sqlite3"), base_url="http://localhost"
    ) as client:
        assert client.post("/api/extensions/qualify", json={}).json()["status"] == "qualified"
        review = client.post("/api/extensions/validate", json=candidate()).json()
        assert review["admission"] == "needs_world_review"
        response = client.post(
            f"/api/extensions/reviews/{review['id']}/admit", json={"profile": "sealed-relay-v1"}
        )
        assert response.status_code == 201, response.text
        admitted = response.json()
        assert admitted["runnable"] is True
        assert admitted["package"]["profile"] == "sealed-relay-v1"
        assert all(check["status"] == "passed" for check in admitted["checks"])
        assert client.get(f"/api/extensions/admissions/{admitted['id']}").json() == admitted
        # A candidate may pass its own examples while implementing different rules.
        weak = candidate('(module (func (export "step") (param i32) (result i32) i32.const 6))')
        weak["examples"] = [{"state": 24, "expected": 6}]
        review = client.post("/api/extensions/validate", json=weak).json()
        assert review["admission"] == "needs_world_review"
        rejected = client.post(
            f"/api/extensions/reviews/{review['id']}/admit", json={"profile": "sealed-relay-v1"}
        ).json()
        assert rejected["runnable"] is False and rejected["package"] is None
        assert any(check["status"] == "failed" for check in rejected["checks"])
        assert client.get("/api/studies").json() == []
        assert client.get("/api/settings").json()["usage"]["requests"] == 0


def test_admitted_package_runs_through_normal_revision_evidence_and_replay(tmp_path, monkeypatch):
    import json

    from pydantic_ai.messages import ModelResponse, ToolCallPart
    from pydantic_ai.models.function import FunctionModel
    from pydantic_ai.usage import RequestUsage

    app = create_app(f"sqlite:///{tmp_path}/vertical.sqlite3")
    with TestClient(app, base_url="http://localhost") as client:
        client.post("/api/extensions/qualify", json={})
        review = client.post("/api/extensions/validate", json=candidate()).json()
        admitted = client.post(
            f"/api/extensions/reviews/{review['id']}/admit", json={"profile": "sealed-relay-v1"}
        ).json()
        definition = {
            "name": "Sealed relay",
            "description": "Independent DEVELOPMENT fixture",
            "environment": "sealed_relay",
            "rule_version": "1.0.0",
            "extension": admitted["package"],
            "examples": [
                {
                    "key": "relay",
                    "name": "Three action credits",
                    "roles": ["submitter", "reviewer"],
                    "parameters": {
                        "relay": {
                            "submitter": "submitter",
                            "reviewer": "reviewer",
                            "docket": "counterseal-17",
                        }
                    },
                }
            ],
        }
        saved = client.post("/api/environments", json={"definition": definition})
        assert saved.status_code == 201, saved.text
        source = saved.json()
        applied = client.post(
            "/api/design/use-environment",
            json={"source": source, "example": "relay", "bindings": {}},
        )
        assert applied.status_code == 200, applied.text
        design = applied.json()
        design["rounds"] = 2
        assert client.post("/api/design/validate", json={"design": design}).status_code == 200
        response = client.post("/api/studies", json={"design": design})
        assert response.status_code == 201, response.text
        sid = response.json()["id"]
        rid = client.get(f"/api/studies/{sid}").json()["runs"][0]["id"]
        # Library mutation/deletion never changes this pending revision's executable.
        replacement = {**source["definition"], "name": "Later library wording"}
        updated = client.put(
            f"/api/environments/{source['id']}", json={"definition": replacement, "revision": 1}
        )
        assert updated.status_code == 200, updated.text
        assert client.delete(f"/api/environments/{source['id']}?revision=2").status_code == 200
        # Simulate losing the documented review sidecar after pinning the pending run.
        # Its executable/proof must be self-contained, while a new save still needs
        # the actual admission record. Only this fixture's synthetic files disappear.
        review_files = list((tmp_path / "vertical.extensions").rglob("*.json"))
        assert len(review_files) == 2
        for path in review_files:
            path.unlink()
        assert client.get("/api/extensions/reviews").json() == []
        assert client.get("/api/extensions/admissions").json() == []
        assert client.post("/api/environments", json={"definition": definition}).status_code == 404
        for endpoint in (
            "/api/design/preflight",
            "/api/studies",
            f"/api/studies/{sid}/revisions",
        ):
            assert client.post(endpoint, json={"design": design}).status_code == 404
        pending_export = client.get(f"/api/studies/{sid}/export").json()
        assert (
            pending_export["revisions"][0]["design"]["environment_source"]["definition"][
                "extension"
            ]
            == admitted["package"]
        )
        assert client.get("/api/settings").json()["usage"]["requests"] == 0

        async def respond(messages, info):
            observation = json.loads(messages[-1].parts[0].content)
            operation = "lodge" if observation["relay"]["phase"] == 0 else "release"
            return ModelResponse(
                parts=[
                    ToolCallPart(
                        info.output_tools[0].name,
                        {
                            "action": {"kind": "relay", "operation": operation},
                            "rationale": "Claimed success does not settle the World",
                            "memory": "",
                            "forecast": None,
                        },
                    )
                ],
                usage=RequestUsage(input_tokens=100, output_tokens=50),
            )

        monkeypatch.setattr(app.state.models, "model", lambda _: FunctionModel(function=respond))
        assert client.post(f"/api/runs/{rid}/control", json={"action": "start"}).status_code == 200

        async def finished():
            await app.state.engine.executions[rid].task

        assert client.portal is not None
        client.portal.call(finished)
        run = client.get(f"/api/runs/{rid}").json()
        assert (
            run["summary"]["status"],
            run["summary"]["turn"],
            run["state"]["phase"],
            run["state"]["credits"],
        ) == (
            "complete",
            2,
            2,
            0,
        ), run
        first = client.get(f"/api/runs/{rid}/turns/1").json()
        second = client.get(f"/api/runs/{rid}/turns/2").json()
        assert "counterseal-17" not in json.dumps(first["observation"])
        assert second["observation"]["relay"]["docket"] == "counterseal-17"
        usage = client.get("/api/settings").json()["usage"]
        assert usage["requests"] == 2
        monkeypatch.setattr(
            app.state.models,
            "model",
            lambda _: (_ for _ in ()).throw(AssertionError("Replay must not construct a provider")),
        )
        verify = client.post(f"/api/runs/{rid}/verify", json={})
        assert verify.status_code == 200, verify.text
        assert verify.json()["verified_turns"] == 2 and verify.json()["model_requests"] == 0
        exported = client.get(f"/api/studies/{sid}/export").json()
        assert (
            exported["revisions"][0]["design"]["environment_source"]["definition"]["extension"]
            == admitted["package"]
        )
        assert client.get("/api/settings").json()["usage"] == usage


def test_restart_and_runtime_loss_never_sample_or_change_pinned_evidence(tmp_path, monkeypatch):
    import json

    from pydantic_ai.messages import ModelResponse, ToolCallPart
    from pydantic_ai.models.function import FunctionModel
    from pydantic_ai.usage import RequestUsage

    database = f"sqlite:///{tmp_path}/restart.sqlite3"
    app = create_app(database)

    async def respond(messages, info):
        observed = json.loads(messages[-1].parts[0].content)
        op = "lodge" if observed["relay"]["phase"] == 0 else "release"
        return ModelResponse(
            parts=[
                ToolCallPart(
                    info.output_tools[0].name,
                    {
                        "action": {"kind": "relay", "operation": op},
                        "rationale": "Finite fixture",
                        "memory": "private actor note",
                        "forecast": None,
                    },
                )
            ],
            usage=RequestUsage(input_tokens=10, output_tokens=5),
        )

    def step(client, app, rid):
        response = client.post(f"/api/runs/{rid}/control", json={"action": "step"})
        assert response.status_code == 200, response.text

        async def settled():
            await app.state.engine.executions[rid].task

        assert client.portal is not None
        client.portal.call(settled)

    with TestClient(app, base_url="http://localhost") as client:
        client.post("/api/extensions/qualify", json={})
        review = client.post("/api/extensions/validate", json=candidate()).json()
        admission = client.post(
            f"/api/extensions/reviews/{review['id']}/admit", json={"profile": "sealed-relay-v1"}
        ).json()
        definition = {
            "name": "Restart relay",
            "environment": "sealed_relay",
            "rule_version": "1.0.0",
            "extension": admission["package"],
            "examples": [
                {
                    "key": "relay",
                    "name": "Relay",
                    "roles": ["submitter", "reviewer"],
                    "parameters": {"relay": {"submitter": "submitter", "reviewer": "reviewer"}},
                }
            ],
        }
        source = client.post("/api/environments", json={"definition": definition}).json()
        design = client.post(
            "/api/design/use-environment",
            json={"source": source, "example": "relay", "bindings": {}},
        ).json()
        sid = client.post("/api/studies", json={"design": design}).json()["id"]
        rid = client.get(f"/api/studies/{sid}").json()["runs"][0]["id"]
        monkeypatch.setattr(app.state.models, "model", lambda _: FunctionModel(function=respond))
        step(client, app, rid)
        before = client.get(f"/api/runs/{rid}").json()
        exported = client.get(f"/api/studies/{sid}/export").json()
        assert before["summary"]["turn"] == 1
    restored = create_app(database)
    with TestClient(restored, base_url="http://localhost") as client:

        def forbidden(_):
            raise AssertionError("Unqualified resume or replay must not construct a provider")

        monkeypatch.setattr(restored.state.models, "model", forbidden)
        blocked = client.get(f"/api/runs/{rid}").json()
        assert blocked["state"] == before["state"]
        assert "containment" in blocked["execution_blocked"]
        assert client.post(f"/api/runs/{rid}/control", json={"action": "start"}).status_code == 422
        assert client.post(f"/api/runs/{rid}/verify", json={}).status_code == 422
        restored_export = client.get(f"/api/studies/{sid}/export").json()
        # Local permission/preflight status may change; pinned evidence never does.
        for key in ("revisions", "requests", "activations", "exposure", "analyses"):
            assert restored_export[key] == exported[key], key
        assert restored_export["runs"][0]["evidence"] == exported["runs"][0]["evidence"]
        assert client.post("/api/extensions/qualify", json={}).json()["status"] == "qualified"
        assert client.post(f"/api/runs/{rid}/verify", json={}).json()["verified_turns"] == 1
        monkeypatch.setattr(
            restored.state.models, "model", lambda _: FunctionModel(function=respond)
        )
        step(client, restored, rid)
        final = client.get(f"/api/runs/{rid}").json()
        assert final["summary"]["status"] == "complete" and final["state"]["phase"] == 2
        assert client.get("/api/settings").json()["usage"]["requests"] == 2


def test_unsupported_profiles_and_forged_packages_are_visible_fail_closed(tmp_path, monkeypatch):
    import agent_sim.extensions as isolated
    from agent_sim.db import digest

    with TestClient(
        create_app(f"sqlite:///{tmp_path}/rejected.sqlite3"), base_url="http://localhost"
    ) as client:
        client.post("/api/extensions/qualify", json={})
        review = client.post("/api/extensions/validate", json=candidate()).json()
        unsupported = client.post(
            f"/api/extensions/reviews/{review['id']}/admit",
            json={"profile": "arbitrary-program-correctness"},
        ).json()
        assert unsupported["runnable"] is False and unsupported["package"] is None
        assert "Unsupported" in unsupported["checks"][-1]["detail"]
        assert client.get(f"/api/extensions/admissions/{unsupported['id']}").json() == unsupported
        admission = client.post(
            f"/api/extensions/reviews/{review['id']}/admit", json={"profile": "sealed-relay-v1"}
        ).json()
        forged = admission["package"]
        definition = {
            "name": "Forged proof",
            "environment": "sealed_relay",
            "rule_version": "1.0.0",
            "extension": forged,
            "examples": [
                {
                    "key": "relay",
                    "name": "Relay",
                    "roles": ["submitter", "reviewer"],
                    "parameters": {"relay": {"submitter": "submitter", "reviewer": "reviewer"}},
                }
            ],
        }
        saved = client.post("/api/environments", json={"definition": definition})
        assert saved.status_code == 201, saved.text
        source = saved.json()
        applied = client.post(
            "/api/design/use-environment",
            json={"source": source, "example": "relay", "bindings": {}},
        )
        assert applied.status_code == 200, applied.text
        design = applied.json()
        assert client.delete(f"/api/environments/{source['id']}?revision=1").status_code == 200
        forged["admission_id"] = "0" * 16
        forged["sha256"] = digest({key: value for key, value in forged.items() if key != "sha256"})
        design["environment_source"]["definition"]["extension"] = forged
        design["environment_source"]["sha256"] = digest(
            design["environment_source"]["definition"]
        )
        worker_calls = []
        execute = isolated.execute

        def observed(source, states, **kwargs):
            worker_calls.append(states)
            return execute(source, states, **kwargs)

        monkeypatch.setattr(isolated, "execute", observed)
        assert client.post("/api/environments", json={"definition": definition}).status_code in (
            404,
            422,
        )
        for endpoint in ("/api/design/preflight", "/api/studies"):
            rejected = client.post(endpoint, json={"design": design})
            assert rejected.status_code in (404, 422), (endpoint, rejected.text, worker_calls)
            assert worker_calls == [], "A self-reported package cannot authorize World preflight"
        assert client.get("/api/studies").json() == []
        assert client.get("/api/environments").json() == []
        assert client.get("/api/settings").json()["usage"]["requests"] == 0


def test_copied_researcher_candidate_requires_admission_before_any_probe(tmp_path, monkeypatch):
    import agent_sim.extensions as isolated
    from pydantic_ai import models

    from backend.tests.test_researcher_designs import finish, provider, scope

    monkeypatch.setattr(models, "ALLOW_MODEL_REQUESTS", False)
    with TestClient(
        create_app(f"sqlite:///{tmp_path}/candidate.sqlite3"), base_url="http://localhost"
    ) as client:
        assert client.post("/api/extensions/qualify", json={}).json()["status"] == "qualified"
        review = client.post("/api/extensions/validate", json=candidate()).json()
        admission = client.post(
            f"/api/extensions/reviews/{review['id']}/admit", json={"profile": "sealed-relay-v1"}
        ).json()
        source = client.post(
            "/api/environments",
            json={
                "definition": {
                    "name": "Retained relay source",
                    "environment": "sealed_relay",
                    "rule_version": "1.0.0",
                    "extension": admission["package"],
                    "examples": [
                        {
                            "key": "relay",
                            "name": "Relay",
                            "roles": ["submitter", "reviewer"],
                            "parameters": {
                                "relay": {"submitter": "submitter", "reviewer": "reviewer"}
                            },
                        }
                    ],
                }
            },
        ).json()
        design = client.post(
            "/api/design/use-environment",
            json={"source": source, "example": "relay", "bindings": {}},
        ).json()
        design.update(
            question="Design an exploratory relay study with three action credits.",
            hypothesis="",
            rounds=2,
        )
        brief = scope(
            design,
            requirements=[
                {
                    "source": "three action credits",
                    "capability": "finite_stock",
                    "mapping": "direct",
                    "explanation": "Three enforced operation credits in the existing relay.",
                }
            ],
        )
        calls = provider(
            client,
            monkeypatch,
            design,
            brief=brief,
            candidate=lambda _: {
                "explanation": "Select the retained finite artifact; generate no source.",
                "design": design,
                "probes": [
                    {
                        "condition_key": design["conditions"][0]["key"],
                        "steps": [
                            {
                                "actor": (
                                    design["conditions"][0]["parameters"]["relay"]["submitter"]
                                ),
                                "action": {"kind": "relay", "operation": "lodge"},
                            }
                        ],
                    }
                ],
            },
        )
        sidecars = list((tmp_path / "candidate.extensions").rglob("*.json"))
        assert len(sidecars) == 2
        for path in sidecars:
            path.unlink()
        assert client.get("/api/extensions/admissions").json() == []
        assert client.get("/api/environments").json() == [source]
        worker_calls = []
        execute = isolated.execute

        def observed(source, states, **kwargs):
            worker_calls.append(states)
            return execute(source, states, **kwargs)

        monkeypatch.setattr(isolated, "execute", observed)
        row = finish(client, client.post("/api/chats", json={"question": design["question"]}))
        assert row["status"] == "failed", row
        assert worker_calls == [], "A retained source cannot authorize an unadmitted draft probe"
        assert client.get("/api/studies").json() == []
        assert client.get("/api/runs").json() == []
        assert client.get("/api/settings").json()["usage"]["requests"] == len(calls)


def test_inflight_isolated_transition_allows_pause_with_exactly_one_writer(tmp_path, monkeypatch):
    import threading

    import agent_sim.extensions as isolated
    from pydantic_ai.messages import ModelResponse, ToolCallPart
    from pydantic_ai.models.function import FunctionModel
    from pydantic_ai.usage import RequestUsage

    app = create_app(f"sqlite:///{tmp_path}/pause.sqlite3")
    armed, entered, released, finished = (threading.Event() for _ in range(4))
    execute = isolated.execute

    def delayed(source, states, **kwargs):
        if armed.is_set() and states == [24]:
            entered.set()
            released.wait(2)
            try:
                return execute(source, states, **kwargs)
            finally:
                finished.set()
        return execute(source, states, **kwargs)

    async def respond(messages, info):
        armed.set()
        return ModelResponse(
            parts=[
                ToolCallPart(
                    info.output_tools[0].name,
                    {
                        "action": {"kind": "relay", "operation": "lodge"},
                        "rationale": "The relay has already succeeded",
                        "memory": "private note",
                        "forecast": None,
                    },
                )
            ],
            usage=RequestUsage(input_tokens=10, output_tokens=5),
        )

    with TestClient(app, base_url="http://localhost") as client:
        client.post("/api/extensions/qualify", json={})
        review = client.post("/api/extensions/validate", json=candidate()).json()
        admission = client.post(
            f"/api/extensions/reviews/{review['id']}/admit", json={"profile": "sealed-relay-v1"}
        ).json()
        source = client.post(
            "/api/environments",
            json={
                "definition": {
                    "name": "Pause relay",
                    "environment": "sealed_relay",
                    "rule_version": "1.0.0",
                    "extension": admission["package"],
                    "examples": [
                        {
                            "key": "relay",
                            "name": "Relay",
                            "roles": ["submitter", "reviewer"],
                            "parameters": {
                                "relay": {"submitter": "submitter", "reviewer": "reviewer"}
                            },
                        }
                    ],
                }
            },
        ).json()
        design = client.post(
            "/api/design/use-environment",
            json={
                "source": source,
                "example": "relay",
                "bindings": {},
            },
        ).json()
        sid = client.post("/api/studies", json={"design": design}).json()["id"]
        rid = client.get(f"/api/studies/{sid}").json()["runs"][0]["id"]
        monkeypatch.setattr(app.state.models, "model", lambda _: FunctionModel(function=respond))
        # Delay only the isolated process boundary after a final response exists.
        monkeypatch.setattr(isolated, "execute", delayed)
        try:
            assert (
                client.post(f"/api/runs/{rid}/control", json={"action": "start"}).status_code == 200
            )
            assert entered.wait(1)
            assert not finished.is_set(), "Guest execution blocked the API event loop"
            assert (
                client.post(f"/api/runs/{rid}/control", json={"action": "pause"}).status_code == 200
            )
            assert (
                client.post(f"/api/runs/{rid}/control", json={"action": "start"}).status_code == 200
            )
        finally:
            released.set()

        async def settled():
            await app.state.engine.executions[rid].task

        assert client.portal is not None
        client.portal.call(settled)
        run = client.get(f"/api/runs/{rid}").json()
        assert (run["summary"]["status"], run["summary"]["turn"]) == ("paused", 1)
        assert (run["state"]["phase"], run["state"]["credits"], run["state"]["outcome"]) == (
            1,
            2,
            None,
        )
        assert not any(e["kind"] == "relay_outcome" for e in run["events"])
        assert client.get("/api/settings").json()["usage"]["requests"] == 1
        replay = client.post(f"/api/runs/{rid}/verify", json={}).json()
        assert replay["verified_turns"] == 1 and replay["model_requests"] == 0


@pytest.mark.parametrize("case", ["actor_tools", "denied_tool", "wrong_consequence"])
def test_scoped_tools_and_untrusted_results_preserve_privacy_and_accounting(
    tmp_path, monkeypatch, case
):
    import json

    import agent_sim.extensions as isolated
    from pydantic_ai.messages import ModelResponse, ToolCallPart
    from pydantic_ai.models.function import FunctionModel
    from pydantic_ai.usage import RequestUsage

    app = create_app(f"sqlite:///{tmp_path}/tools.sqlite3")
    prompts = []
    armed = False
    execute = isolated.execute

    def corrupt(source, states, **kwargs):
        result = execute(source, states, **kwargs)
        if armed and states == [24]:
            return {**result, "outputs": [0]}
        return result

    async def respond(messages, info):
        nonlocal armed
        prompt = json.loads(messages[-1].parts[0].content)
        prompts.append(prompt)
        if "operations" in prompt:
            history = prompt["operations"]
            operation = ["observe", "legal_options", "decide"][len(history)]
            observed = history[0]["result"] if history else None
            value = {"operation": operation, "decision": None}
            if operation == "decide":
                assert observed is not None
                value["decision"] = {
                    "action": {
                        "kind": "relay",
                        "operation": "lodge" if observed["relay"]["phase"] == 0 else "release",
                    },
                    "rationale": "Success is only a self-report",
                    "memory": "own private note",
                    "forecast": None,
                }
        else:
            armed = True
            value = {
                "action": {"kind": "relay", "operation": "lodge"},
                "rationale": "Success is only a self-report",
                "memory": "must not commit",
                "forecast": None,
            }
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, value)],
            usage=RequestUsage(input_tokens=10, output_tokens=5),
        )

    with TestClient(app, base_url="http://localhost") as client:
        client.post("/api/extensions/qualify", json={})
        review = client.post("/api/extensions/validate", json=candidate()).json()
        admission = client.post(
            f"/api/extensions/reviews/{review['id']}/admit", json={"profile": "sealed-relay-v1"}
        ).json()
        saved = client.post(
            "/api/environments",
            json={
                "definition": {
                    "name": "Actor-scoped relay",
                    "environment": "sealed_relay",
                    "rule_version": "1.0.0",
                    "extension": admission["package"],
                    "examples": [
                        {
                            "key": "relay",
                            "name": "Relay",
                            "roles": ["submitter", "reviewer"],
                            "parameters": {
                                "relay": {"submitter": "submitter", "reviewer": "reviewer"}
                            },
                        }
                    ],
                }
            },
        ).json()
        design = client.post(
            "/api/design/use-environment",
            json={"source": saved, "example": "relay", "bindings": {}},
        ).json()
        if case != "wrong_consequence":
            design["conditions"][0]["harness"] = {
                "kind": "tool_using",
                "max_requests": 3,
                "max_tool_operations": 2,
                "tools": ["observe", "legal_options"]
                if case == "actor_tools"
                else ["legal_options"],
            }
        design["profiles"][0]["role"], design["profiles"][1]["role"] = "Reviewer", "Submitter"
        response = client.post("/api/studies", json={"design": design})
        assert response.status_code == 201, response.text
        sid = response.json()["id"]
        rid = client.get(f"/api/studies/{sid}").json()["runs"][0]["id"]
        initial = client.get(f"/api/runs/{rid}").json()["state"]
        monkeypatch.setattr(app.state.models, "model", lambda _: FunctionModel(function=respond))
        monkeypatch.setattr(isolated, "execute", corrupt)
        assert client.post(f"/api/runs/{rid}/control", json={"action": "start"}).status_code == 200

        async def settled():
            await app.state.engine.executions[rid].task

        assert client.portal is not None
        client.portal.call(settled)
        run = client.get(f"/api/runs/{rid}").json()
        usage = client.get("/api/settings").json()["usage"]
        if case == "actor_tools":
            assert (run["summary"]["status"], run["summary"]["turn"]) == ("complete", 2)
            assert usage["requests"] == 6
            assert "counterseal" not in json.dumps(prompts[:3])
            assert prompts[4]["operations"][0]["result"]["relay"]["docket"] == "counterseal-17"
            assert run["effort"]["tool_attempts"] == run["effort"]["tool_operations"] == 4
            assert run["state"]["outcome"] == {"success": True, "reason": "released"}
            monkeypatch.setattr(
                app.state.models, "model", lambda _: pytest.fail("Replay constructed provider")
            )
            replay = client.post(f"/api/runs/{rid}/verify", json={})
            assert replay.status_code == 200, replay.text
            assert replay.json()["verified_turns"] == 2
        else:
            assert (run["summary"]["status"], run["summary"]["turn"]) == ("failed", 0)
            assert (
                run["state"] == initial
                and run["turns"] == run["events"] == run["measurements"] == []
            )
            assert usage["requests"] == 1
            assert run["requests"][0]["status"] == "complete"
            assert run["activations"][0]["status"] == "failed"
            assert run["activations"][0]["operations"][-1]["status"] == "rejected"
            if case == "denied_tool":
                assert "not authorized" in run["activations"][0]["operations"][-1]["result"]
            else:
                assert "consequence differs" in run["activations"][0]["operations"][-1]["result"]
        exported = client.get(f"/api/studies/{sid}/export").json()
        assert len(exported["requests"]) == usage["requests"]
        assert client.get("/api/settings").json()["usage"] == usage
