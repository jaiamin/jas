"""Invocation-local privacy guard for the unchanged T01 snapshot producer.

Select tracked source before T01 can read/hash/archive it. Its separate backend
digest uses this same safe selection instead of an unrestricted recursive walk.
This deliberately produces a current-source subset, never historical parity.
"""

import hashlib
import os
import stat
import subprocess
from contextlib import contextmanager
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).absolute().parents[1]
SELECT = (
    "backend/src",
    "benchmarks/research_baseline.py",
    "benchmarks/research-cases.json",
    "benchmarks/provenance.py",
    "benchmarks/t18_snapshot_guard.py",
    "benchmarks/t18_current_reference.py",
    "backend/tests/test_research_baseline.py",
    "backend/tests/test_t18_current_contract.py",
    "backend/tests/test_t18_snapshot_guard.py",
    "backend/tests/fixtures/t18-current-contract.json",
    "backend/tests/fixtures/t18-current-contract-v2.json",
    "backend/tests/fixtures/t18-current-contract-v3.json",
    "backend/tests/fixtures/t18-current-contract-v4.json",
    "pyproject.toml",
    "uv.lock",
)
CHECK_OUTPUT = subprocess.check_output


def safe_file(root: Path, name: str) -> bool:
    relative = Path(name)
    if relative.is_absolute() or ".." in relative.parts or not relative.parts:
        return False
    # Names are screened before *any* payload access, including symlink targets.
    if any(p == "pbcopy" or p.startswith(".env") for p in relative.parts):
        return False
    target = root
    try:
        for part in relative.parts:
            target /= part
            metadata = target.lstat()
            if stat.S_ISLNK(metadata.st_mode):
                return False
        return stat.S_ISREG(metadata.st_mode)
    except FileNotFoundError:
        return False


def safe_names(root: Path) -> list[str]:
    names = (
        CHECK_OUTPUT(["git", "ls-files", "-z", "--cached", "--", *SELECT], cwd=root)
        .decode()
        .split("\0")
    )
    return sorted({name for name in names if name and safe_file(root, name)})


def backend_digest() -> str:
    return hashlib.sha256(
        b"".join(
            name.encode() + (ROOT / name).read_bytes()
            for name in safe_names(ROOT)
            if name.startswith("backend/src/") and name.endswith(".py")
        )
    ).hexdigest()


@contextmanager
def protected_git_selection():
    from benchmarks import research_baseline

    def selected(command, *args, **kwargs):
        if list(command) == ["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard"]:
            root = Path(kwargs.get("cwd", os.getcwd())).absolute()
            return b"".join(name.encode() + b"\0" for name in safe_names(root))
        return CHECK_OUTPUT(command, *args, **kwargs)

    with (
        patch.object(subprocess, "check_output", selected),
        patch.object(research_baseline, "backend_digest", backend_digest),
    ):
        yield


def main():
    import argparse

    from benchmarks.research_baseline import run_baseline, write_json

    parser = argparse.ArgumentParser()
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    with protected_git_selection():
        report = run_baseline(args.output)
    write_json(
        args.output / "privacy-selection.json",
        {
            "policy": "t18-tracked-source-subset-v1",
            "guard_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
            "selection": list(SELECT),
            "historical_comparison": False,
        },
    )
    raise SystemExit(0 if all(row["passed"] for row in report["attempts"]) else 1)


if __name__ == "__main__":
    main()
