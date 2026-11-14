"""Verify the separate gallery image serves public UI without runner/model services."""

import subprocess
import sys
import time
import uuid


def docker(*args: str, input: str | None = None) -> str:
    result = subprocess.run(
        ["docker", *args], input=input, text=True, capture_output=True, timeout=60
    )
    if result.returncode:
        raise RuntimeError(result.stdout + result.stderr)
    return result.stdout.strip()


def main() -> None:
    name = f"jas-gallery-smoke-{uuid.uuid4().hex[:12]}"
    docker(
        "run",
        "--detach",
        "--name",
        name,
        "--env",
        "JAS_GALLERY_ORIGIN=http://localhost:8080",
        sys.argv[1],
    )
    try:
        for _ in range(60):
            if docker("inspect", "--format", "{{.State.Health.Status}}", name) == "healthy":
                break
            time.sleep(1)
        else:
            raise RuntimeError("Gallery health check did not become healthy")
        docker(
            "exec",
            "-i",
            name,
            "python",
            "-",
            input="""
import json
import os
from urllib.error import HTTPError
from urllib.request import urlopen

def get(path):
    with urlopen("http://localhost:8080" + path, timeout=5) as response:
        return response.read().decode()

assert os.getuid() == 10001
assert json.loads(get("/api/health")) == {"status": "ok", "surface": "gallery"}
assert json.loads(get("/api/gallery")) == []
assert 'name="jas-surface" content="gallery"' in get("/gallery")
assert "jas-theme" in get("/theme.js")
try:
    get("/api/settings")
except HTTPError as error:
    assert error.code == 404
else:
    raise AssertionError("Gallery must not expose workspace services")
""",
        )
        print("Gallery smoke passed: public UI, non-root runtime and no workspace API")
    finally:
        docker("rm", "--force", name)


if __name__ == "__main__":
    main()
