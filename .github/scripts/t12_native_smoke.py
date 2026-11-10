"""One keyless native T12 smoke; container and live competence are separate gates."""

import argparse
import hashlib
import json
import os
import re
import signal
import socket
import subprocess
import sys
import time
from pathlib import Path
from typing import TypedDict
from urllib.error import HTTPError
from urllib.request import Request, urlopen

import uvicorn
from agent_sim.domain import Decision, Design
from agent_sim.simulation.environments import create_world


class Asset(TypedDict):
    path: str
    size: int
    sha256: str


SERVER = """
import sys
from pathlib import Path
import uvicorn
from pydantic_ai import models
from agent_sim.api import create_app
models.ALLOW_MODEL_REQUESTS = False
app = create_app(database_url='sqlite:///' + sys.argv[1], budget_usd=0,
                 static_dir=Path(sys.argv[2]), concurrent_runs=1)
uvicorn.run(app, host='127.0.0.1', port=18130, access_log=False)
"""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    out = parser.parse_args().output.resolve()
    root = Path.cwd()
    assert uvicorn.__version__ == "0.54.0"
    assert out.is_relative_to(root / ".tools/t12/evidence")
    out.mkdir()  # Preserve every attempt; no overwriting or deleting evidence.
    build = root / "frontend/dist"

    def asset_manifest() -> list[Asset]:
        assets = sorted(build.rglob("*"))
        assert not build.is_symlink() and all(not p.is_symlink() for p in assets)
        return [
            {
                "path": str(p.relative_to(build)),
                "size": p.stat().st_size,
                "sha256": hashlib.sha256(p.read_bytes()).hexdigest(),
            }
            for p in assets
            if p.is_file()
        ]

    manifest = asset_manifest()
    (out / "assets.json").write_text(json.dumps(manifest, indent=2) + "\n")
    result = {
        "qualification": "native-runtime",
        "status": "failed",
        "uvicorn_version": uvicorn.__version__,
        "lifetimes": [],
        "paid_calls": 0,
        "assets_sha256": hashlib.sha256(json.dumps(manifest, sort_keys=True).encode()).hexdigest(),
        "assets_bytes": sum(row["size"] for row in manifest),
    }
    exchanges = []

    def http(path, body=None, status=200, text=False):
        request = Request(
            "http://127.0.0.1:18130" + path,
            data=None if body is None else json.dumps(body).encode(),
            headers={"Content-Type": "application/json"},
        )
        try:
            response = urlopen(request, timeout=10)
        except HTTPError as error:
            response = error
        with response:
            content = response.read().decode()
            exchanges.append({"path": path, "status": response.status, "response": content})
            assert response.status == status, (path, response.status, content)
            return content if text else json.loads(content)

    def ready(process):
        deadline = time.monotonic() + 15
        while time.monotonic() < deadline:
            assert process.poll() is None, "Owned server exited before readiness"
            try:
                assert http("/api/health")["status"] == "ok"
                return
            except OSError:
                time.sleep(0.1)
        raise TimeoutError("Owned native server readiness timed out")

    def released():
        with socket.socket() as listener:
            assert listener.connect_ex(("127.0.0.1", 18130)) != 0, "Port still has a listener"
        with socket.socket() as probe:
            probe.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            probe.bind(("127.0.0.1", 18130))

    def world_witness(payload):
        design = Design.model_validate(payload)
        parameters = design.conditions[0].parameters
        world = create_world(design, parameters, design.seeds[0])
        actions = {
            (0, "member_1"): {"kind": "claim_work", "work": "prepare"},
            (1, "member_1"): {
                "kind": "perform_work",
                "work": "prepare",
                "expected_version": 1,
                "content": {"batch": 17},
                "sources": [],
            },
            (3, "member_1"): {
                "kind": "handoff_work",
                "work": "prepare",
                "recipient": "member_3",
                "version": 2,
            },
            (4, "member_3"): {"kind": "accept_handoff", "work": "prepare", "version": 2},
        }
        trajectory = []
        restored = None
        for tick in range(5):
            for actor in ["member_1", "member_2", "member_3", "member_4", "member_5", "member_6"]:
                decision = Decision.model_validate(
                    {
                        "action": actions.get((tick, actor), {"kind": "wait_workflow"}),
                        "memory": "",
                        "rationale": "Native DEVELOPMENT witness.",
                        "forecast": None,
                    }
                )
                world.step(actor, decision)
                if restored:
                    restored.step(actor, decision)
                    assert restored.snapshot() == world.snapshot()
                trajectory.append(world.snapshot())
            if tick == 1:
                state = world.snapshot()
                assert (
                    state["logical_time"],
                    state["resource_stock"],
                    state["resource_spent"],
                    state["writes_remaining"],
                ) == (2, 4, 3, 5)
                assert state["work"]["prepare"]["status"] == "in_progress"
                assert state["work"]["prepare"]["due_at"] == 3
                restored = create_world(
                    design, parameters, design.seeds[0], json.loads(json.dumps(state))
                )
        terminal = world.snapshot()
        assert terminal["outcome"] == {
            "status": "horizon",
            "accepted": ["prepare"],
            "unfinished": ["release", "audit"],
        }
        replay = create_world(design, parameters, design.seeds[0])
        for index in range(30):
            tick, position = divmod(index, 6)
            actor = f"member_{position + 1}"
            replay.step(
                actor,
                Decision.model_validate(
                    {
                        "action": actions.get((tick, actor), {"kind": "wait_workflow"}),
                        "memory": "",
                        "rationale": "Native DEVELOPMENT witness.",
                        "forecast": None,
                    }
                ),
            )
            assert replay.snapshot() == trajectory[index]
        (out / "world-checkpoints.json").write_text(json.dumps(trajectory) + "\n")
        result["world_replayed_turns"] = 30

    process = None
    try:
        with socket.socket() as probe:
            probe.bind(("127.0.0.1", 18130))
        for attempt in range(2):
            with (out / f"server-{attempt}.log").open("xb") as log:
                process = subprocess.Popen(
                    [
                        sys.executable,
                        "-B",
                        "-c",
                        SERVER,
                        str(out / "workspace.sqlite3"),
                        str(build),
                    ],
                    env=os.environ
                    | {
                        "OPENAI_API_KEY": "",
                        "ANTHROPIC_API_KEY": "",
                        "PYTHONDONTWRITEBYTECODE": "1",
                    },
                    stdin=subprocess.DEVNULL,
                    stdout=log,
                    stderr=subprocess.STDOUT,
                )
                ready(process)
                assert not any(http("/api/settings")["providers"].values())
                assert http("/api/settings")["usage"]["requests"] == 0
                if attempt == 0:
                    assert http("/api/studies") == [] and http("/api/runs") == []
                    index = http("/", text=True)
                    for route in ("/studies", "/runs", "/environments", "/new", "/agent"):
                        assert http(route, text=True) == index
                    for asset in re.findall(r'(?:src|href)="(/assets/[^\"]+)"', index):
                        content = http(asset, text=True)
                        assert content and content != index
                    source = next(
                        e
                        for e in http("/api/catalog")["environments"]
                        if e["key"] == "institutional_workflow"
                    )["source"]
                    assert source["format"] == "jas-environment-v9" and source["revision"] == 1
                    design = http(
                        "/api/design/use-environment",
                        {"source": source, "example": source["definition"]["examples"][0]["key"]},
                    )
                    design["rounds"] = 5
                    design = http("/api/design/validate", {"design": design})
                    world_witness(design)
                    sid = http("/api/studies", {"design": design}, status=201)["id"]
                    study = http(f"/api/studies/{sid}")
                    rid = study["runs"][0]["id"]
                    before_run = http(f"/api/runs/{rid}")
                    before = before_run["state"]
                    assert http(f"/api/runs/{rid}/verify", {})["verified_turns"] == 0
                    rejected = http(f"/api/runs/{rid}/control", {"action": "step"}, status=409)
                    assert rejected == {"detail": "OPENAI_API_KEY is not configured."}
                    run = http(f"/api/runs/{rid}")
                    assert run["summary"] == before_run["summary"]
                    assert run["state"] == before and run["summary"]["usage"]["requests"] == 0
                    assert http("/api/settings")["usage"]["requests"] == 0
                    exported = http(f"/api/studies/{sid}/export")
                    assert exported["version"] == 16 and exported["requests"] == []
                    assert exported["revisions"][0]["design"]["environment_source"] == source
                    result.update(
                        study_id=sid,
                        run_id=rid,
                        public_replayed_turns=0,
                        control_rejection=rejected,
                    )
                else:
                    reopened = http(f"/api/runs/{rid}")
                    assert reopened["state"] == before and reopened["summary"] == run["summary"]
                    assert http(f"/api/runs/{rid}/verify", {})["verified_turns"] == 0
                    assert http(f"/api/studies/{sid}")["usage"]["requests"] == 0
                    assert http(f"/api/studies/{sid}/export") == exported
                children = Path(f"/proc/{process.pid}/task/{process.pid}/children").read_text()
                lifetime = {
                    "lifetime": attempt + 1,
                    "pid": process.pid,
                    "children_before_shutdown": [int(pid) for pid in children.split()],
                }
                result["lifetimes"].append(lifetime)
                assert lifetime["children_before_shutdown"] == [], "Unexpected owned worker"
                process.send_signal(signal.SIGTERM)
                code = process.wait(timeout=15)
                lifetime["exit_code"] = code
                assert code == -signal.SIGTERM, f"Unexpected shutdown exit {code}"
                shutdown = (out / f"server-{attempt}.log").read_text()
                assert "Application shutdown complete." in shutdown
                assert f"Finished server process [{process.pid}]" in shutdown
                assert not Path(f"/proc/{process.pid}").exists(), "Owned server was not reaped"
                lifetime["lifespan_shutdown_complete"] = True
                lifetime["server_reaped"] = True
                process = None
                released()
                lifetime["port_released"] = True
        assert asset_manifest() == manifest
        result["assets_unchanged"] = True
        result["status"] = "passed"
    except BaseException as error:
        result.update(error_type=type(error).__name__, error=str(error))
        raise
    finally:
        if process is not None and process.poll() is None:
            process.send_signal(signal.SIGTERM)
            try:
                process.wait(timeout=15)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=5)
        released()
        result["port_released"] = True
        (out / "http-exchanges.json").write_text(json.dumps(exchanges, indent=2) + "\n")
        (out / "result.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, sort_keys=True))


if __name__ == "__main__":
    main()
