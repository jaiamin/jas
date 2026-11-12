"""Check the built image against a fresh, keyless workspace without model requests."""

import base64
import json
import os
import re
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from agent_sim.config import setting
from agent_sim.db import digest
from agent_sim.domain import Decision, Design
from agent_sim.extensions import Extensions
from agent_sim.simulation.environments import create_world
from sqlalchemy.engine import make_url


def request_headers() -> dict[str, str]:
    username, password = setting("AUTH_USERNAME", ""), setting("AUTH_PASSWORD", "")
    if not username:
        return {}
    token = base64.b64encode(f"{username}:{password}".encode()).decode()
    return {"Authorization": f"Basic {token}"}


def get(path: str) -> str:
    request = Request(f"http://127.0.0.1:8080{path}", headers=request_headers())
    with urlopen(request, timeout=5) as response:
        assert response.status == 200, path
        return response.read().decode()


assert os.getuid() != 0, "Production must run without root privileges"
assert json.loads(get("/api/health"))["status"] == "ok"
settings = json.loads(get("/api/settings"))
assert not any(settings["providers"].values()), "Smoke tests must not use provider credentials"
assert settings["usage"]["requests"] == 0
assert json.loads(get("/api/studies")) == []
assert json.loads(get("/api/runs")) == []

index = get("/")
for path in ("/studies", "/runs", "/agent", "/new", "/settings", "/environments"):
    assert get(path) == index, f"SPA route did not serve the frontend: {path}"
assets = re.findall(r'(?:src|href)="(/assets/[^\"]+)"', index)
assert any(path.endswith(".js") for path in assets), "JavaScript bundle missing from index"
assert any(path.endswith(".css") for path in assets), "Stylesheet missing from index"
for path in assets:
    body = get(path)
    assert body and body != index, f"Asset missing or served as HTML: {path}"
print("Production smoke passed: health, SPA routes, bundles, keyless state and non-root user")


# Qualify the actual deployed, non-root boundary through the workflow API.
# Independent public DEVELOPMENT probes: no provider or host credential access.
def post(path: str, body: dict) -> dict:
    request = Request(
        f"http://127.0.0.1:8080{path}",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", **request_headers()},
    )
    with urlopen(request, timeout=30) as response:
        return json.loads(response.read())


candidate = {
    "format": "jas-extension-candidate-v1",
    "name": "Production independent triple-minus-one fixture",
    "provenance": "T02 keyless production DEVELOPMENT smoke, independently specified",
    "source": '(module (func (export "step") (param i32) (result i32) '
    "local.get 0 i32.const 3 i32.mul i32.const 1 i32.sub))",
    "examples": [{"state": 7, "expected": 20}, {"state": -2, "expected": -7}],
}
assert not json.loads(get("/api/extensions/runtime"))["validation_enabled"]
assert post("/api/extensions/validate", candidate)["admission"] == "blocked"
qualification = post("/api/extensions/qualify", {})
assert qualification["status"] == "qualified", qualification
assert all(check["passed"] and check["cleaned"] for check in qualification["checks"])
assert qualification["execution_enabled"] is True
report = post("/api/extensions/validate", candidate)
assert report["admission"] == "needs_world_review" and not report["runnable"]
assert report["outputs"] == [20, -7]
assert json.loads(get(f"/api/extensions/reviews/{report['id']}")) == report
for source, stop in (
    (
        '(module (import "application" "read_private_database" (func)) '
        '(func (export "step") (param i32) (result i32) i32.const 0))',
        "imports_denied",
    ),
    (
        '(module (func (export "step") (param i32) (result i32) '
        "(loop $endless br $endless) i32.const 0))",
        "fuel_exhausted",
    ),
):
    rejected = post("/api/extensions/validate", candidate | {"source": source})
    assert rejected["admission"] == "rejected" and not rejected["runnable"]
    assert any(stop in event["detail"] for event in rejected["activity"])
assert post("/api/extensions/validate", candidate)["outputs"] == [20, -7]
assert json.loads(get("/api/settings"))["usage"]["requests"] == 0
print(json.dumps({"extension_qualification": qualification, "safe_review": report}, sort_keys=True))
unsupported = post(f"/api/extensions/reviews/{report['id']}/admit", {"profile": "sealed-relay-v1"})
assert not unsupported["runnable"] and unsupported["package"] is None

# The same frozen independent T16 DEVELOPMENT artifact as backend/browser tests.
# Explicit executable only; no generation, live provider or application engine copy.
relay_source = """(module
  (func (export "step") (param $input i32) (result i32)
    (local $phase i32) (local $credits i32) (local $slot i32) (local $op i32)
    (local $cost i32) (local $next i32)
    (if (i32.ge_u (local.get $input) (i32.const 128))
      (then (return (i32.const -1))))
    (local.set $op (i32.and (local.get $input) (i32.const 3)))
    (local.set $slot (i32.and (i32.shr_u (local.get $input) (i32.const 2)) (i32.const 1)))
    (local.set $credits (i32.and (i32.shr_u (local.get $input) (i32.const 3)) (i32.const 3)))
    (local.set $phase (i32.shr_u (local.get $input) (i32.const 5)))
    (if (i32.ge_u (local.get $phase) (i32.const 2))
      (then (return (i32.const -1))))
    (local.set $cost (i32.const 1))
    (local.set $next (local.get $phase))
    (if (i32.eq (local.get $op) (i32.const 0))
      (then
        (if (i32.or (local.get $phase) (local.get $slot))
          (then (return (i32.const -1))))
        (local.set $next (i32.const 1))))
    (if (i32.eq (local.get $op) (i32.const 1))
      (then
        (if (i32.eqz (i32.and (local.get $phase) (local.get $slot)))
          (then (return (i32.const -1))))
        (local.set $cost (i32.const 2))
        (local.set $next (i32.const 2))))
    (if (i32.eq (local.get $op) (i32.const 3))
      (then (local.set $next (i32.const 3))))
    (if (i32.lt_u (local.get $credits) (local.get $cost))
      (then (return (i32.const -1))))
    (i32.add (i32.mul (local.get $next) (i32.const 4))
      (i32.sub (local.get $credits) (local.get $cost)))))
"""
relay_review = post(
    "/api/extensions/validate",
    candidate
    | {
        "name": "Production sealed relay",
        "source": relay_source,
        "examples": [{"state": 24, "expected": 6}, {"state": 53, "expected": 8}],
    },
)
admitted = post(
    f"/api/extensions/reviews/{relay_review['id']}/admit", {"profile": "sealed-relay-v1"}
)
assert admitted["runnable"] and all(c["status"] == "passed" for c in admitted["checks"]), admitted
package = admitted["package"]
source = post(
    "/api/environments",
    {
        "definition": {
            "name": "Production sealed relay",
            "environment": "sealed_relay",
            "rule_version": "1.0.0",
            "extension": package,
            "examples": [
                {
                    "key": "relay",
                    "name": "Relay",
                    "roles": ["submitter", "reviewer"],
                    "parameters": {"relay": {"submitter": "submitter", "reviewer": "reviewer"}},
                }
            ],
        }
    },
)
design = post("/api/design/use-environment", {"source": source, "example": "relay", "bindings": {}})
sid = post("/api/studies", {"design": design})["id"]
exported = json.loads(get(f"/api/studies/{sid}/export"))
assert exported["version"] == 20
assert (
    exported["revisions"][0]["design"]["environment_source"]["definition"]["extension"] == package
)
assert len(exported["runs"]) == 1 and not exported["requests"]

# An internally coherent manifest cannot authorize a new draft. This exercises
# the actual non-root server, independently of the in-process public worker spy.
forged = json.loads(json.dumps(design))
forged_source = forged["environment_source"]
forged_package = forged_source["definition"]["extension"]
forged_package["admission_id"] = "0" * 16
forged_package["sha256"] = digest(
    {key: value for key, value in forged_package.items() if key != "sha256"}
)
forged_source["sha256"] = digest(forged_source["definition"])


def rejected_draft(path: str, draft: dict) -> None:
    try:
        post(path, {"design": draft})
    except HTTPError as error:
        assert error.code == 404, (path, error.code)
    else:
        raise AssertionError(f"Unadmitted draft was accepted: {path}")


for endpoint in ("/api/design/preflight", "/api/studies", f"/api/studies/{sid}/revisions"):
    rejected_draft(endpoint, forged)
# Remove only these two synthetic sidecars; the already pinned revision retains
# its own exact package. New drafts/saves still require the actual admission.
database_path = make_url(setting("DATABASE_URL", "sqlite:///data/jas.sqlite3")).database
assert database_path and database_path != ":memory:"
sidecars = Path(database_path).with_suffix(".extensions")
for relative in (f"{relay_review['id']}.json", f"admissions/{admitted['id']}.json"):
    (sidecars / relative).unlink()
for endpoint in ("/api/design/preflight", "/api/studies", f"/api/studies/{sid}/revisions"):
    rejected_draft(endpoint, design)
assert json.loads(get(f"/api/studies/{sid}/export")) == exported
assert len(json.loads(get(f"/api/studies/{sid}"))["runs"]) == 1
assert json.loads(get("/api/settings"))["usage"]["requests"] == 0
print("Production admission guard passed: forged/lost admission rejected; pinned revision intact")

# Independent literal World/restore/replay witness inside this real non-root image.
# The full Engine/provider workflow is tested separately with explicit stand-ins;
# this production smoke never constructs a provider or executes a paid run.

protocol = Design.model_validate(design)
parameters = protocol.conditions[0].parameters
runner = Extensions(":memory:")
try:
    local_proof = runner.qualify()
    assert local_proof.status == "qualified"
    world = create_world(protocol, parameters, 7, runner=runner.transition)
    checkpoints = [world.snapshot()]
    receipts = []
    for operation, phase, credits in (("lodge", 1, 2), ("release", 2, 0)):
        actor = world.actor()
        observation = world.observe(actor)
        if operation == "lodge":
            assert "counterseal" not in json.dumps(observation)
        else:
            assert observation["relay"]["docket"] == "counterseal-17"
        restored = create_world(protocol, parameters, 7, checkpoints[-1], runner=runner.transition)
        decision = Decision.model_validate(
            {
                "action": {"kind": "relay", "operation": operation},
                "rationale": "Synthetic fixture",
                "memory": "",
                "forecast": None,
            }
        )
        receipt = world.step(actor, decision)
        assert restored.step(actor, decision) == receipt
        assert restored.snapshot() == world.snapshot()
        assert (world.state["phase"], world.state["credits"]) == (phase, credits)
        checkpoints.append(world.snapshot())
        receipts.append([[item.model_dump() for item in group] for group in receipt])
    assert world.actor() is None and world.state["outcome"] == {
        "success": True,
        "reason": "released",
    }
    assert receipts[-1][1] == [
        {"key": "relay_success", "value": 1.0, "denominator": 1.0, "agent": None}
    ]
finally:
    runner.close()
assert json.loads(get("/api/settings"))["usage"]["requests"] == 0
print(
    json.dumps(
        {
            "admission": admitted,
            "production_world_checkpoints": checkpoints,
            "production_world_receipts": receipts,
            "actual_model_requests": 0,
        },
        sort_keys=True,
    )
)
print(
    "Production extension smoke passed: containment, independent admission, "
    "pinned revision, World restoration/replay"
)
