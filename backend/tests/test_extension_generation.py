"""T17 DEVELOPMENT oracles, independently fixed before executable candidate output."""

import copy
from pathlib import Path

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
            -1, -1, -1, -1, -1,  # idle/0/grantor
            -1, -1, -1, -1, -1,  # idle/0/holder
            3, -1, -1, 1, 10,  # idle/1/grantor
            -1, -1, -1, 1, 10,  # idle/1/holder
            4, -1, -1, 2, 11,  # idle/2/grantor
            -1, -1, -1, 2, 11,  # idle/2/holder
            -1, -1, -1, -1, -1,  # live/0/grantor
            -1, -1, -1, -1, -1,  # live/0/holder
            -1, -1, 2, 4, 10,  # live/1/grantor
            -1, 6, -1, 4, 10,  # live/1/holder
            -1, -1, -1, -1, -1,  # live/2/grantor: invalid resource state
            -1, -1, -1, -1, -1,  # live/2/holder: invalid resource state
            -1, -1, -1, -1, -1,  # redeemed/0/grantor
            -1, -1, -1, -1, -1,  # redeemed/0/holder
            -1, -1, -1, -1, -1,  # redeemed/1/grantor
            -1, -1, -1, -1, -1,  # redeemed/1/holder
            -1, -1, -1, -1, -1,  # redeemed/2/grantor
            -1, -1, -1, -1, -1,  # redeemed/2/holder
            -1, -1, -1, -1, -1,  # stopped/0/grantor
            -1, -1, -1, -1, -1,  # stopped/0/holder
            -1, -1, -1, -1, -1,  # stopped/1/grantor
            -1, -1, -1, -1, -1,  # stopped/1/holder
            -1, -1, -1, -1, -1,  # stopped/2/grantor
            -1, -1, -1, -1, -1,  # stopped/2/holder
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
            ('(module (func (export "step") (param i32) (result i32) i32.const 4))',
             [{"state": 20, "expected": 4}], False),
            (source, [{"state": 20, "expected": 4}, {"state": 46, "expected": 6}], True),
        ]:
            review = client.post("/api/extensions/validate", json={
                "format": "jas-extension-candidate-v1", "name": "Scripted Sol DEVELOPMENT",
                "provenance": "Immutable external permit oracle; scripted artifact, no paid model",
                "source": code, "examples": examples,
            }).json()
            assert review["admission"] == "needs_world_review", review
            response = client.post(f"/api/extensions/contracts/{contract['id']}/checks",
                                   json={"review_id": review["id"]})
            assert response.status_code == 201, response.text
            check = response.json()
            assert check["passed"] is passed
            assert check["runnable"] is False  # artifact checks alone do not admit a World
            assert check["contract"] == contract
            assert check["review_id"] == review["id"]
            assert check["candidate_sha256"] == review["candidate_sha256"]
            assert check["inputs"] == [*range(120), -1, 120, 2147483647, -2147483648] * 2
            assert check["expected"] == [*refundable_permit()["table"], -1, -1, -1, -1] * 2
            assert check["observed"] == check["expected"] if passed else (
                check["observed"] != check["expected"]
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
