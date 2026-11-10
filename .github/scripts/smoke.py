"""Check the built image against a fresh, keyless workspace without model requests."""

import json
import os
import re
from urllib.request import Request, urlopen


def get(path: str) -> str:
    with urlopen(f"http://127.0.0.1:8080{path}", timeout=5) as response:
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
        headers={"Content-Type": "application/json"},
    )
    with urlopen(request, timeout=30) as response:
        return json.loads(response.read())


candidate = {
    "format": "jas-extension-candidate-v1",
    "name": "Production independent triple-minus-one fixture",
    "provenance": "T02 keyless production DEVELOPMENT smoke, independently specified",
    "source": '(module (func (export "step") (param i32) (result i32) '
    'local.get 0 i32.const 3 i32.mul i32.const 1 i32.sub))',
    "examples": [{"state": 7, "expected": 20}, {"state": -2, "expected": -7}],
}
assert not json.loads(get("/api/extensions/runtime"))["validation_enabled"]
assert post("/api/extensions/validate", candidate)["admission"] == "blocked"
qualification = post("/api/extensions/qualify", {})
assert qualification["status"] == "qualified", qualification
assert all(check["passed"] and check["cleaned"] for check in qualification["checks"])
assert qualification["execution_enabled"] is False
report = post("/api/extensions/validate", candidate)
assert report["admission"] == "needs_world_review" and not report["runnable"]
assert report["outputs"] == [20, -7]
assert json.loads(get(f'/api/extensions/reviews/{report["id"]}')) == report
for source, stop in (
    ('(module (import "application" "read_private_database" (func)) '
     '(func (export "step") (param i32) (result i32) i32.const 0))', "imports_denied"),
    ('(module (func (export "step") (param i32) (result i32) '
     '(loop $endless br $endless) i32.const 0))', "fuel_exhausted"),
):
    rejected = post("/api/extensions/validate", candidate | {"source": source})
    assert rejected["admission"] == "rejected" and not rejected["runnable"]
    assert any(stop in event["detail"] for event in rejected["activity"])
assert post("/api/extensions/validate", candidate)["outputs"] == [20, -7]
assert json.loads(get("/api/settings"))["usage"]["requests"] == 0
print(json.dumps({"extension_qualification": qualification, "safe_review": report}, sort_keys=True))
print("Production extension smoke passed: containment, denial, limits, cleanup, inert admission")
