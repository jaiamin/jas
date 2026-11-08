import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def backend_digest() -> str:
    return hashlib.sha256(
        b"".join(
            str(p.relative_to(ROOT)).encode() + p.read_bytes()
            for p in sorted((ROOT / "backend/src").rglob("*.py"))
        )
    ).hexdigest()


def gate_digest() -> str:
    paths = sorted((ROOT / "backend/src").rglob("*.py")) + [
        ROOT / "benchmarks" / name
        for name in (
            "cases.py",
            "oracles.py",
            "probes.py",
            "validity.py",
            "quality.py",
            "analysis.py",
            "incentives.py",
            "provenance.py",
        )
    ]
    return hashlib.sha256(
        b"".join(str(p.relative_to(ROOT)).encode() + p.read_bytes() for p in paths)
    ).hexdigest()
