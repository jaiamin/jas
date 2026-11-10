"""Bounded native-HTTP platform timings with declared non-model participants.

This measures local execution and inspection overhead, excluding model latency.
It provides no evidence about participant or researcher competence.
"""

import argparse
import json
import math
import os
import platform
import signal
import socket
import subprocess
import sys
import time
from pathlib import Path
from urllib.request import Request, urlopen


def request(base: str, path: str, body: dict | None = None) -> tuple[dict, float, int]:
    started = time.perf_counter()
    data = json.dumps(body).encode() if body is not None else None
    with urlopen(
        Request(base + path, data=data, headers={"Content-Type": "application/json"}),
        timeout=15,
    ) as response:
        payload = response.read()
        value = json.loads(payload)
    return value, (time.perf_counter() - started) * 1000, len(payload)


def reads(base: str, path: str) -> dict:
    request(base, path)
    samples = [request(base, path)[1:] for _ in range(20)]
    times = sorted(elapsed for elapsed, _ in samples)
    return {
        "samples_ms": [elapsed for elapsed, _ in samples],
        "response_bytes": [size for _, size in samples],
        "p50_ms": (times[9] + times[10]) / 2,
        "p95_ms": times[math.ceil(len(times) * 0.95) - 1],
        "max_ms": times[-1],
    }


def workload(base: str, population: int) -> dict:
    catalog, _, _ = request(base, "/api/catalog")
    design = next(t["design"] for t in catalog["templates"] if t["id"] == "commons")
    design.update(
        title=f"Runtime benchmark: {population} non-model participants",
        rounds=2,
        seeds=[7],
        repetitions=1,
        profiles=[
            dict(design["profiles"][0], key=f"member_{index}", name=f"Member {index}")
            for index in range(population)
        ],
        conditions=[
            dict(
                design["conditions"][0],
                harness={"kind": "scripted", "policy": "commons_half_v1"},
            )
        ],
    )
    saved, save_ms, _ = request(base, "/api/studies", {"design": design})
    sid = saved["id"]
    study, _, _ = request(base, f"/api/studies/{sid}")
    rid = study["runs"][0]["id"]
    started = time.perf_counter()
    request(base, f"/api/runs/{rid}/control", {"action": "start"})
    deadline = time.monotonic() + 30
    while True:
        run, _, _ = request(base, f"/api/runs/{rid}")
        if run["summary"]["status"] not in {"queued", "running", "pausing"}:
            break
        if time.monotonic() >= deadline:
            raise TimeoutError("Non-model run exceeded the declared 30-second bound")
        time.sleep(0.01)
    wall_ms = (time.perf_counter() - started) * 1000
    turns = population * 2
    assert run["summary"]["status"] == "complete", run["summary"]
    assert run["summary"]["turn"] == turns
    assert run["summary"]["usage"]["requests"] == 0
    assert run["summary"]["usage"]["cost_usd"] == 0
    assert len(run["activations"]) == turns
    verified, replay_ms, _ = request(base, f"/api/runs/{rid}/verify", {})
    assert verified["verified_turns"] == turns
    exported, export_ms, export_bytes = request(base, f"/api/studies/{sid}/export")
    assert exported["requests"] == []
    assert len(exported["runs"][0]["evidence"]) == turns + 1
    return {
        "population": population,
        "rounds": 2,
        "turns": turns,
        "policy": "commons_half_v1",
        "provider_requests": 0,
        "save_ms": save_ms,
        "wall_to_observed_completion_ms": wall_ms,
        "replay_ms": replay_ms,
        "export_ms": export_ms,
        "export_bytes": export_bytes,
        "reads": {
            key: reads(base, path)
            for key, path in {
                "health": "/api/health",
                "run": f"/api/runs/{rid}",
                "experiment": f"/api/studies/{sid}",
            }.items()
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--port", type=int, default=18228)
    args = parser.parse_args()
    out = args.output.resolve()
    out.mkdir(parents=True, exist_ok=False)
    with socket.socket() as probe:
        probe.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        probe.bind(("127.0.0.1", args.port))
    code = """import sys
from pathlib import Path
import uvicorn
from pydantic_ai import models
from agent_sim.api import create_app
models.ALLOW_MODEL_REQUESTS = False
app = create_app('sqlite:///' + sys.argv[1], budget_usd=0, static_dir=Path('frontend/dist'))
uvicorn.run(app, host='127.0.0.1', port=int(sys.argv[2]), access_log=False)
"""
    record = {
        "platform": platform.platform(),
        "python": sys.version,
        "cpu_count": os.cpu_count(),
        "cases": [],
    }
    with (out / "server.log").open("wb") as log:
        process = subprocess.Popen(
            [sys.executable, "-c", code, str(out / "workspace.sqlite3"), str(args.port)],
            env={**os.environ, "OPENAI_API_KEY": "", "ANTHROPIC_API_KEY": ""},
            stdout=log,
            stderr=subprocess.STDOUT,
        )
        try:
            base = f"http://127.0.0.1:{args.port}"
            deadline = time.monotonic() + 15
            while True:
                try:
                    request(base, "/api/health")
                    break
                except OSError:
                    if process.poll() is not None or time.monotonic() >= deadline:
                        raise RuntimeError("Benchmark server did not become ready") from None
                    time.sleep(0.05)
            for population in (2, 12):
                record["cases"].append(workload(base, population))
            record["server_memory"] = [
                line
                for line in Path(f"/proc/{process.pid}/status").read_text().splitlines()
                if line.startswith(("VmRSS:", "VmHWM:"))
            ]
            assert request(base, "/api/settings")[0]["usage"]["requests"] == 0
        except BaseException as error:
            record["error"] = {"type": type(error).__name__, "message": str(error)}
            raise
        finally:
            if process.poll() is None:
                process.send_signal(signal.SIGTERM)
            try:
                record["server_exit"] = process.wait(timeout=15)
            except subprocess.TimeoutExpired:
                process.kill()
                record["server_exit"] = process.wait()
                record["shutdown_timeout"] = True
            database = out / "workspace.sqlite3"
            record["database_bytes"] = database.stat().st_size if database.exists() else None
            with socket.socket() as probe:
                probe.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                try:
                    probe.bind(("127.0.0.1", args.port))
                    record["port_released"] = True
                except OSError:
                    record["port_released"] = False
            (out / "result.json").write_text(json.dumps(record, indent=2) + "\n")
    assert record["server_exit"] == -signal.SIGTERM, record
    assert record["port_released"], record
    print(json.dumps(record, indent=2))


if __name__ == "__main__":
    main()
