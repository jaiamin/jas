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
