"""T17 DEVELOPMENT oracles, independently fixed before executable candidate output."""

import copy
import subprocess
import sys
from contextlib import contextmanager
from pathlib import Path
from tempfile import TemporaryDirectory

import pytest
from agent_sim.api import create_app
from fastapi.testclient import TestClient


def refundable_permit():
    """External complete oracle; production must not contain a permit implementation."""
    return {
        "format": "jas-finite-contract-v1",
        "name": "Refundable single-use permit DEVELOPMENT",
        "provenance": "Independent T17 DEVELOPMENT contract, frozen before candidate output",
        "requirements": "Grantor can issue or revoke; holder can redeem a live permit once. "
        "Revocation refunds its escrow, disables redemption and permits reissue. "
        "Issue/revoke cycles cannot mint resources. This is a finite synthesis oracle, "
        "not independently verified natural-language intent or a held-out case.",
        "roles": ["grantor", "holder"],
        "states": [
            {"key": "idle", "escrow": 0, "status": "running"},
            {"key": "live", "escrow": 1, "status": "running"},
            {"key": "redeemed", "escrow": 0, "status": "success"},
            {"key": "stopped", "escrow": 0, "status": "failure"},
        ],
        "operations": [
            {"key": "issue", "roles": ["grantor"]},
            {"key": "redeem", "roles": ["holder"]},
            {"key": "revoke", "roles": ["grantor"]},
            {"key": "wait", "roles": ["grantor", "holder"]},
            {"key": "stop", "roles": ["grantor", "holder"]},
        ],
        "initial_state": 0,
        "initial_credits": 2,
        "total_resource": 2,
        "max_credits": 2,
        # Each line is one state/available/role row, in independently frozen order.
        "table": [
            -1,
            -1,
            -1,
            -1,
            -1,  # idle/0/grantor
            -1,
            -1,
            -1,
            -1,
            -1,  # idle/0/holder
            3,
            -1,
            -1,
            1,
            10,  # idle/1/grantor
            -1,
            -1,
            -1,
            1,
            10,  # idle/1/holder
            4,
            -1,
            -1,
            2,
            11,  # idle/2/grantor
            -1,
            -1,
            -1,
            2,
            11,  # idle/2/holder
            -1,
            -1,
            -1,
            -1,
            -1,  # live/0/grantor
            -1,
            -1,
            -1,
            -1,
            -1,  # live/0/holder
            -1,
            -1,
            2,
            4,
            10,  # live/1/grantor
            -1,
            6,
            -1,
            4,
            10,  # live/1/holder
            -1,
            -1,
            -1,
            -1,
            -1,  # live/2/grantor: invalid resource state
            -1,
            -1,
            -1,
            -1,
            -1,  # live/2/holder: invalid resource state
            -1,
            -1,
            -1,
            -1,
            -1,  # redeemed/0/grantor
            -1,
            -1,
            -1,
            -1,
            -1,  # redeemed/0/holder
            -1,
            -1,
            -1,
            -1,
            -1,  # redeemed/1/grantor
            -1,
            -1,
            -1,
            -1,
            -1,  # redeemed/1/holder
            -1,
            -1,
            -1,
            -1,
            -1,  # redeemed/2/grantor
            -1,
            -1,
            -1,
            -1,
            -1,  # redeemed/2/holder
            -1,
            -1,
            -1,
            -1,
            -1,  # stopped/0/grantor
            -1,
            -1,
            -1,
            -1,
            -1,  # stopped/0/holder
            -1,
            -1,
            -1,
            -1,
            -1,  # stopped/1/grantor
            -1,
            -1,
            -1,
            -1,
            -1,  # stopped/1/holder
            -1,
            -1,
            -1,
            -1,
            -1,  # stopped/2/grantor
            -1,
            -1,
            -1,
            -1,
            -1,  # stopped/2/holder
        ],
    }


def test_user_freezes_independent_contract_before_any_generated_candidate(tmp_path):
    """Contract review itself is inert: no worker qualification or model work."""
    with TestClient(
        create_app(f"sqlite:///{tmp_path}/t17-contract.sqlite3"),
        base_url="http://localhost",
    ) as client:
        specification = refundable_permit()
        response = client.post("/api/extensions/contracts", json=specification)
        assert response.status_code == 201, response.text
        frozen = response.json()
        assert frozen["specification"] == specification
        assert frozen["format"] == "jas-reviewed-finite-contract-v1"
        assert len(frozen["sha256"]) == 64
        assert client.get(f"/api/extensions/contracts/{frozen['id']}").json() == frozen
        assert client.get("/api/extensions/contracts").json() == [frozen]
        assert client.get("/api/extensions/reviews").json() == []
        assert client.get("/api/extensions/admissions").json() == []
        assert client.get("/api/studies").json() == []
        assert client.get("/api/settings").json()["usage"]["requests"] == 0
        assert client.get("/api/extensions/runtime").json()["status"] == "unqualified"


def test_generated_artifact_is_checked_against_external_full_domain_not_its_examples(tmp_path):
    source = Path(__file__).with_name("fixtures").joinpath("t17_refundable_permit.wat").read_text()
    with TestClient(
        create_app(f"sqlite:///{tmp_path}/artifact.sqlite3"), base_url="http://localhost"
    ) as client:
        contract = client.post("/api/extensions/contracts", json=refundable_permit()).json()
        assert client.post("/api/extensions/qualify").json()["status"] == "qualified"
        checks = []
        for code, examples, passed in [
            (
                '(module (func (export "step") (param i32) (result i32) i32.const 4))',
                [{"state": 20, "expected": 4}],
                False,
            ),
            (source, [{"state": 20, "expected": 4}, {"state": 46, "expected": 6}], True),
        ]:
            review = client.post(
                "/api/extensions/validate",
                json={
                    "format": "jas-extension-candidate-v1",
                    "name": "Scripted Sol DEVELOPMENT",
                    "provenance": "Immutable external permit oracle; "
                    "scripted artifact, no paid model",
                    "source": code,
                    "examples": examples,
                },
            ).json()
            assert review["admission"] == "needs_world_review", review
            response = client.post(
                f"/api/extensions/contracts/{contract['id']}/checks",
                json={"review_id": review["id"]},
            )
            assert response.status_code == 201, response.text
            check = response.json()
            assert check["passed"] is passed
            assert check["runnable"] is False  # artifact checks alone do not admit a World
            assert check["contract"] == contract
            assert check["review_id"] == review["id"]
            assert check["candidate_sha256"] == review["candidate_sha256"]
            assert check["inputs"] == [*range(120), -1, 120, 2147483647, -2147483648] * 2
            assert check["expected"] == [*refundable_permit()["table"], -1, -1, -1, -1] * 2
            assert (
                check["observed"] == check["expected"]
                if passed
                else (check["observed"] != check["expected"])
            )
            assert client.get(f"/api/extensions/finite-checks/{check['id']}").json() == check
            checks.append(check)
        assert client.get("/api/extensions/finite-checks").json() == checks[::-1]
        assert client.get("/api/extensions/admissions").json() == []
        assert client.get("/api/studies").json() == []
        assert client.get("/api/settings").json()["usage"]["requests"] == 0


def test_contract_review_rejects_incomplete_unauthorized_and_resource_minting_tables(tmp_path):
    """Literal invalid cases independently derive from the frozen resource/ACL rules."""
    invalid = []
    short = refundable_permit()
    short["table"].pop()
    invalid.append(short)
    for offset, output in [
        (25, 4),  # holder may not issue
        (20, 5),  # live/available2 invents an escrow unit
        (42, 5),  # revoke must not create live/available2
        (13, 2),  # wait from idle/available1 cannot restore a spent unit
        (60, 2),  # terminal state cannot resume
        (30, 2),  # available0 cannot operate
        (50, 2),  # invalid live/available2 cannot refund
        (20, 12),  # unknown next state
        (20, -2),  # only -1 is denial
        (20, True),  # boolean is not an encoded integer
    ]:
        bad = refundable_permit()
        bad["table"][offset] = output
        invalid.append(bad)
    unknown_role = refundable_permit()
    unknown_role["operations"][0]["roles"] = ["narrative_admin"]
    invalid.append(unknown_role)
    duplicate = refundable_permit()
    duplicate["roles"] = ["grantor", "grantor"]
    invalid.append(duplicate)
    with TestClient(
        create_app(f"sqlite:///{tmp_path}/invalid.sqlite3"), base_url="http://localhost"
    ) as client:
        for specification in invalid:
            original = copy.deepcopy(specification)
            response = client.post("/api/extensions/contracts", json=specification)
            assert response.status_code == 422, (original, response.text)
        assert client.get("/api/extensions/contracts").json() == []
        assert client.get("/api/settings").json()["usage"]["requests"] == 0


def checked_permit(client):
    contract = client.post("/api/extensions/contracts", json=refundable_permit()).json()
    assert client.post("/api/extensions/qualify").json()["status"] == "qualified"
    source = Path(__file__).with_name("fixtures").joinpath("t17_refundable_permit.wat").read_text()
    review = client.post(
        "/api/extensions/validate",
        json={
            "format": "jas-extension-candidate-v1",
            "name": "Scripted permit DEVELOPMENT",
            "provenance": "Independently frozen finite contract; scripted WAT, no paid model",
            "source": source,
            "examples": [{"state": 20, "expected": 4}],
        },
    ).json()
    check = client.post(
        f"/api/extensions/contracts/{contract['id']}/checks", json={"review_id": review["id"]}
    ).json()
    assert check["passed"] is True, check
    return check


@pytest.mark.parametrize(
    "failure", ["unavailable", "exited", "cleanup", "scratch-allocation", "scratch-teardown"]
)
def test_finite_admission_worker_failure_requires_fresh_containment(
    tmp_path, monkeypatch, failure
):
    app = create_app(f"sqlite:///{tmp_path}/admission-failure.sqlite3")
    with TestClient(app, base_url="http://localhost") as client:
        check = checked_permit(client)
        original_popen = subprocess.Popen

        def failed_worker(*args, **kwargs):
            if failure == "unavailable":
                raise PermissionError("Independent admission process-launch denial")
            return original_popen(
                [sys.executable, "-I", "-B", "-c", "raise SystemExit(1)"], **kwargs
            )

        @contextmanager
        def unclean_scratch(**kwargs):
            scratch = tmp_path / "unclean-worker"
            scratch.mkdir()
            yield str(scratch)

        @contextmanager
        def failed_scratch(**kwargs):
            if failure == "scratch-allocation":
                raise OSError("Independent scratch allocation failure")
            with TemporaryDirectory(**kwargs) as scratch:
                yield scratch
            raise OSError("Independent scratch teardown failure")

        with monkeypatch.context() as boundary:
            if failure == "cleanup":
                boundary.setattr(
                    "agent_sim.extension_sandbox.TemporaryDirectory", unclean_scratch
                )
            elif failure.startswith("scratch-"):
                boundary.setattr(
                    "agent_sim.extension_sandbox.TemporaryDirectory", failed_scratch
                )
            else:
                boundary.setattr(subprocess, "Popen", failed_worker)
            response = client.post(f"/api/extensions/finite-checks/{check['id']}/admit")

        assert response.status_code == 201, response.text
        admission = response.json()
        assert admission["runnable"] is False
        runtime = client.get("/api/extensions/runtime").json()
        assert runtime["status"] == "failed"
        assert runtime["validation_enabled"] is False
        assert runtime["execution_enabled"] is False
        blocked = client.post(f"/api/extensions/finite-checks/{check['id']}/admit").json()
        assert blocked["runnable"] is False
        assert blocked["checks"][0]["status"] == "blocked"
        saved = client.get(f"/api/extensions/finite-admissions/{admission['id']}").json()
        assert saved == admission
        assert client.post("/api/extensions/qualify").json()["status"] == "qualified"
        assert client.post(f"/api/extensions/finite-checks/{check['id']}/admit").json()[
            "runnable"
        ] is True
        assert client.get("/api/settings").json()["usage"]["requests"] == 0


def admitted_permit_design(client):
    check = checked_permit(client)
    admission = client.post(f"/api/extensions/finite-checks/{check['id']}/admit").json()
    assert admission["runnable"], admission
    saved = client.post(
        "/api/environments",
        json={
            "definition": {
                "name": "Refundable permit",
                "environment": "reviewed_finite",
                "rule_version": "1.0.0",
                "extension": admission["package"],
                "examples": [
                    {
                        "key": "permit",
                        "name": "Permit",
                        "roles": ["grantor", "holder"],
                        "parameters": {
                            "finite": {
                                "bindings": {"grantor": "grantor", "holder": "holder"},
                                "private": {"grantor": {"docket": "permit-37"}},
                            }
                        },
                    }
                ],
            }
        },
    )
    assert saved.status_code == 201, saved.text
    assert client.get(f"/api/environments/{saved.json()['id']}").json() == saved.json()
    applied = client.post(
        "/api/design/use-environment",
        json={
            "source": saved.json(),
            "example": "permit",
            "bindings": {},
        },
    )
    assert applied.status_code == 200, applied.text
    return applied.json()


def test_permit_refund_acl_horizon_and_complete_restore_have_independent_literal_witnesses(
    tmp_path,
):
    import json

    import pytest
    from agent_sim.domain import Decision, Design, FiniteAction
    from agent_sim.simulation.environments import create_world

    app = create_app(f"sqlite:///{tmp_path}/refund.sqlite3")
    with TestClient(app, base_url="http://localhost") as client:
        payload = admitted_permit_design(client)
        payload["rounds"] = 3
        design = Design.model_validate(payload)
        parameters = design.conditions[0].parameters
        runner = app.state.extensions.transition

        def world(state=None, params=parameters, protocol=design):
            return create_world(protocol, params, 17, state, runner=runner)

        def decision(operation):
            return Decision(
                action=FiniteAction(operation=operation),
                rationale="Inert",
                memory="",
                forecast=None,
            )

        w = world()
        initial = w.snapshot()
        grantor, holder = w.order()
        for actor, operation in [(holder, "issue"), (grantor, "redeem")]:
            with pytest.raises(ValueError):
                w.step(actor, decision(operation))
            assert w.snapshot() == initial
        for operation, literal in [
            ("issue", (1, 1, 1, 0)),
            ("wait", (1, 1, 1, 0)),
            ("revoke", (0, 2, 0, 0)),
            ("wait", (0, 2, 0, 0)),
            ("issue", (1, 1, 1, 0)),
            ("redeem", (2, 0, 0, 2)),
        ]:
            prior = w.snapshot()
            if operation == "wait" and prior["finite_state"] == 0:
                with pytest.raises(ValueError):
                    w.step(holder, decision("redeem"))
                assert w.snapshot() == prior  # revoked permission denies atomically
            restored = world(prior)
            actor = w.actor()
            result = w.step(actor, decision(operation))
            assert restored.step(actor, decision(operation)) == result
            assert restored.snapshot() == w.snapshot()
            assert (
                tuple(w.state[k] for k in ("finite_state", "credits", "escrow", "spent")) == literal
            )
        assert w.state["outcome"] == {"success": True, "reason": "redeemed"}
        short = design.model_copy(update={"rounds": 2})
        horizon = world(protocol=short)
        for operation in ("issue", "wait", "revoke", "wait"):
            horizon.step(horizon.actor(), decision(operation))
        assert horizon.actor() is None
        assert tuple(horizon.state[k] for k in ("finite_state", "credits", "escrow", "spent")) == (
            0,
            2,
            0,
            0,
        )
        assert horizon.state["outcome"] == {"success": False, "reason": "horizon"}
        stopped = world()
        stopped.step(grantor, decision("stop"))
        assert stopped.state["outcome"] == {"success": False, "reason": "stopped"}
        assert (stopped.state["credits"], stopped.state["spent"]) == (2, 0)
        scarce = copy.deepcopy(initial)
        scarce.update(credits=1, spent=1)
        exhausted = world(scarce)
        exhausted.step(grantor, decision("issue"))
        assert tuple(
            exhausted.state[k] for k in ("finite_state", "credits", "escrow", "spent")
        ) == (1, 0, 1, 1)
        assert exhausted.state["outcome"] == {"success": False, "reason": "exhausted"}
        for memory in ("none", "notes", "history", "episodic"):
            a, b = parameters.model_copy(deep=True), parameters.model_copy(deep=True)
            a.memory = b.memory = memory
            assert b.finite is not None
            b.finite.private[grantor]["docket"] = "permit-91"
            first, second = world(params=a), world(params=b)
            assert first.observe(holder) == second.observe(holder)
            assert first.decision_schema(first.observe(holder)).model_json_schema() == (
                second.decision_schema(second.observe(holder)).model_json_schema()
            )
            assert world(first.snapshot(), a).observe(holder) == first.observe(holder)
            assert "permit-37" not in json.dumps(first.observe(holder))
        # A complete checkpoint must not coerce resource types, time or terminal facts.
        for changes in [
            {"escrow": False},
            {"spent": False},
            {"position": 2},
            {"round": 0},
            {"done": True},
            {"outcome": {"success": True, "reason": "redeemed"}},
        ]:
            bad = copy.deepcopy(initial)
            bad.update(changes)
            with pytest.raises(ValueError):
                world(bad)
        assert world(horizon.snapshot(), protocol=short).snapshot() == horizon.snapshot()
        assert client.get("/api/settings").json()["usage"]["requests"] == 0


def test_finite_admission_runs_pinned_permit_through_engine_and_exact_zero_call_replay(
    tmp_path, monkeypatch
):
    import json

    from pydantic_ai.messages import ModelResponse, ToolCallPart
    from pydantic_ai.models.function import FunctionModel
    from pydantic_ai.usage import RequestUsage

    app = create_app(f"sqlite:///{tmp_path}/finite-engine.sqlite3")
    with TestClient(app, base_url="http://localhost") as client:
        check = checked_permit(client)
        response = client.post(f"/api/extensions/finite-checks/{check['id']}/admit")
        assert response.status_code == 201, response.text
        admission = response.json()
        assert admission["runnable"] is True, admission
        package = admission["package"]
        assert package["contract"] == check["contract"]
        assert package["profile"] == "reviewed-finite-v1"
        assert (
            client.get(f"/api/extensions/finite-admissions/{admission['id']}").json() == admission
        )
        definition = {
            "name": "Refundable permit DEVELOPMENT",
            "environment": "reviewed_finite",
            "rule_version": "1.0.0",
            "extension": package,
            "examples": [
                {
                    "key": "permit",
                    "name": "Refundable permit",
                    "roles": ["grantor", "holder"],
                    "parameters": {
                        "finite": {
                            "bindings": {"grantor": "grantor", "holder": "holder"},
                            "private": {"grantor": {"docket": "permit-37"}},
                        }
                    },
                }
            ],
        }
        saved = client.post("/api/environments", json={"definition": definition})
        assert saved.status_code == 201, saved.text
        applied = client.post(
            "/api/design/use-environment",
            json={
                "source": saved.json(),
                "example": "permit",
                "bindings": {},
            },
        )
        assert applied.status_code == 200, applied.text
        design = applied.json()
        design["rounds"] = 3
        # Claims and role prose cannot confer permission or settle consequences.
        design["profiles"][0]["role"] = "Holder"
        design["profiles"][1]["role"] = "Grantor"
        assert client.get("/api/settings").json()["usage"]["requests"] == 0
        saved = client.post("/api/studies", json={"design": design})
        assert saved.status_code == 201, saved.text
        sid = saved.json()["id"]
        rid = client.get(f"/api/studies/{sid}").json()["runs"][0]["id"]
        assert client.get("/api/settings").json()["usage"]["requests"] == 0
        before = client.get(f"/api/runs/{rid}").json()
        assert (
            before["state"]["finite_state"],
            before["state"]["credits"],
            before["state"]["escrow"],
            before["state"]["spent"],
        ) == (0, 2, 0, 0)

        async def respond(messages, info):
            observation = json.loads(messages[-1].parts[0].content)
            operation = "issue" if observation["finite"]["state"] == "idle" else "redeem"
            return ModelResponse(
                parts=[
                    ToolCallPart(
                        info.output_tools[0].name,
                        {
                            "action": {"kind": "finite", "operation": operation},
                            "rationale": "Prose is inert",
                            "memory": "actor-private note",
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
            run["state"]["finite_state"],
            run["state"]["credits"],
            run["state"]["escrow"],
            run["state"]["spent"],
        ) == ("complete", 2, 2, 0, 0, 2), run
        assert run["state"]["outcome"] == {"success": True, "reason": "redeemed"}
        first = client.get(f"/api/runs/{rid}/turns/1").json()
        second = client.get(f"/api/runs/{rid}/turns/2").json()
        assert first["observation"]["private_information"] == {"docket": "permit-37"}
        assert "permit-37" not in json.dumps(second["observation"])
        usage = client.get("/api/settings").json()["usage"]
        assert usage["requests"] == 2
        monkeypatch.setattr(
            app.state.models,
            "model",
            lambda _: (_ for _ in ()).throw(AssertionError("Replay must not construct a provider")),
        )
        replay = client.post(f"/api/runs/{rid}/verify")
        assert replay.status_code == 200, replay.text
        assert (replay.json()["verified_turns"], replay.json()["model_requests"]) == (2, 0)
        assert client.get("/api/settings").json()["usage"] == usage
        exported = client.get(f"/api/studies/{sid}/export").json()
        assert (
            exported["revisions"][0]["design"]["environment_source"]["definition"]["extension"]
            == package
        )
