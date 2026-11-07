"""Check the built image against a fresh, keyless workspace without model requests."""

import json
import os
import re
from urllib.request import urlopen


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
