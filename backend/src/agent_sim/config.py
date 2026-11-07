import os
from pathlib import Path


def setting(name: str, default: str) -> str:
    """Prefer JAS configuration while accepting existing installations' names."""
    return os.getenv(f"JAS_{name}") or os.getenv(f"ASS_{name}") or default


def default_database_url() -> str:
    legacy = Path("data/ass.sqlite3")
    path = legacy if legacy.is_file() else Path("data/jas.sqlite3")
    return f"sqlite:///{path}"
