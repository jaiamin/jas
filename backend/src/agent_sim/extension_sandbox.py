"""Bounded process lifecycle surrounding a capability-free WebAssembly engine."""

import json
import os
import signal
import subprocess
import sys
from pathlib import Path
from tempfile import TemporaryDirectory

WORKER = Path(__file__).with_name("extension_worker.py")
MAX_SOURCE = 65536
MAX_OUTPUT = 4096
WALL_SECONDS = 4


def execute(source: str, states: list[int], *, qualification: str | None = None) -> dict:
    if len(source.encode()) > MAX_SOURCE:
        return {"code": "input_limit", "cleaned": True}
    payload = json.dumps({"source": source, "states": states, "qualification": qualification})
    result: dict = {"code": "worker_unavailable"}
    with TemporaryDirectory(prefix="jas-extension-worker-") as scratch:
        process = None
        try:
            process = subprocess.Popen(
                [sys.executable, "-I", "-B", str(WORKER)],
                cwd=scratch,
                env={"LANG": "C.UTF-8", "HOME": scratch, "TMPDIR": scratch},
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
                start_new_session=True,
            )
            try:
                output, _ = process.communicate(
                    payload.encode(), timeout=0.25 if qualification == "deadline" else WALL_SECONDS
                )
                if len(output) > MAX_OUTPUT:
                    result = {"code": "output_limit"}
                elif process.returncode != 0:
                    result = {"code": "worker_failed"}
                else:
                    result = json.loads(output)
            except subprocess.TimeoutExpired:
                result = {"code": "timeout"}
        except (OSError, ValueError):
            result = {"code": "worker_unavailable"}
        finally:
            if process is not None:
                if process.poll() is None:
                    os.killpg(process.pid, signal.SIGKILL)
                process.communicate()
                result["reaped"] = process.returncode is not None
    result["cleaned"] = not Path(scratch).exists() and result.get("reaped", True)
    return result
