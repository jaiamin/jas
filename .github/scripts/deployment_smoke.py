"""Check root-owned container storage, protected access and restart persistence."""

import json
import subprocess
import sys
import time
import uuid
from pathlib import Path


def docker(*args: str, input: str | None = None) -> str:
    result = subprocess.run(
        ["docker", *args], input=input, text=True, capture_output=True, timeout=150
    )
    if result.returncode:
        raise RuntimeError(result.stdout + result.stderr)
    return result.stdout.strip()


def main() -> None:
    image = sys.argv[1]
    docker(
        "run",
        "--rm",
        "--user",
        "0:0",
        "--entrypoint",
        "python",
        "-i",
        image,
        "-",
        input="""
import os
import subprocess
import sys
from pathlib import Path
data = Path("/app/data")
data.rename("/app/original-data")
data.symlink_to("/app", target_is_directory=True)
owner = Path("/app").stat().st_uid
command = [sys.executable, "-m", "agent_sim.container_entrypoint", sys.executable, "-c", "pass"]
assert subprocess.run(command, capture_output=True).returncode != 0
assert Path("/app").stat().st_uid == owner
data.unlink()
Path("/app/original-data").rename(data)
os.chown(data, 10002, 10002)
assert subprocess.run(command, capture_output=True).returncode != 0
assert data.stat().st_uid == 10002
os.chown(data, 0, 0)
existing = data / "existing-file"
existing.write_text("preserved")
probe = "import os; from pathlib import Path; assert os.getuid() == 10001; " + \
    "assert os.getgroups() == []; p=Path('/app/data/existing-file'); " + \
    "assert p.stat().st_uid == 0; assert p.read_text() == 'preserved'"
subprocess.run(command[:-1] + [probe], check=True)
""",
    )
    name = f"jas-deployment-smoke-{uuid.uuid4().hex[:12]}"
    volume = f"{name}-data"
    docker("volume", "create", volume)
    try:
        docker(
            "run",
            "--detach",
            "--name",
            name,
            "--user",
            "0:0",
            "--mount",
            f"type=volume,source={volume},target=/app/data,volume-nocopy",
            "--env",
            "JAS_AUTH_USERNAME=smoke",
            "--env",
            "JAS_AUTH_PASSWORD=test-only-password",
            "--env",
            "JAS_DATABASE_URL=sqlite:////app/data/jas.sqlite3",
            image,
        )

        def ready() -> None:
            for _ in range(90):
                state = json.loads(docker("inspect", name))[0]["State"]
                if state["Health"]["Status"] == "healthy":
                    return
                if not state["Running"]:
                    raise AssertionError(docker("logs", name))
                time.sleep(1)
            raise AssertionError("Protected container never became healthy")

        ready()
        boundary = """
import os
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import urlopen
status = Path("/proc/1/status").read_text().splitlines()
assert next(row for row in status if row.startswith("Uid:")).split()[1:] == ["10001"] * 4
assert next(row for row in status if row.startswith("Gid:")).split()[1:] == ["10001"] * 4
assert next(row for row in status if row.startswith("Groups:")).split()[1:] == []
assert os.stat("/app/data").st_uid == 10001
for path in ("/", "/api/settings", "/api/studies", "/api/openapi.json"):
    try:
        urlopen("http://127.0.0.1:8080" + path, timeout=5)
    except HTTPError as error:
        assert error.code == 401
    else:
        raise AssertionError("Unauthenticated access: " + path)
"""
        docker("exec", "-i", "--user", "10001:10001", name, "python", "-", input=boundary)
        docker(
            "exec",
            "-i",
            "--user",
            "10001:10001",
            name,
            "python",
            "-",
            input=Path(".github/scripts/smoke.py").read_text(),
        )
        before = docker(
            "exec",
            "--user",
            "10001:10001",
            name,
            "python",
            "-c",
            "import sqlite3; c=sqlite3.connect('/app/data/jas.sqlite3'); "
            "print(c.execute('SELECT count(*) FROM studies').fetchone()[0])",
        )
        assert int(before) > 0, "Production smoke did not persist a study"
        docker("restart", "--time", "120", name)
        ready()
        after = docker(
            "exec",
            "--user",
            "10001:10001",
            name,
            "python",
            "-c",
            "import sqlite3; c=sqlite3.connect('/app/data/jas.sqlite3'); "
            "print(c.execute('SELECT count(*) FROM studies').fetchone()[0])",
        )
        assert after == before, "Persisted studies changed across restart"
        print("Deployment smoke passed: root-owned volume, non-root app, auth, runtime and restart")
    finally:
        subprocess.run(["docker", "rm", "--force", name], capture_output=True, timeout=130)
        subprocess.run(["docker", "volume", "rm", volume], capture_output=True, timeout=30)


if __name__ == "__main__":
    main()
