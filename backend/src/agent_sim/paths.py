"""Installed assets and local workspace locations, independent of the launch directory."""

import os
import sys
from pathlib import Path


def workspace_directory() -> Path:
    if directory := os.getenv("JAS_WORKSPACE"):
        return Path(directory).expanduser().resolve()
    existing = Path.cwd() / "data" / "jas.sqlite3"
    if existing.is_file():
        return existing.parent
    if sys.platform == "win32":
        root = Path(os.getenv("LOCALAPPDATA") or Path.home() / "AppData" / "Local")
    elif sys.platform == "darwin":
        root = Path.home() / "Library" / "Application Support"
    else:
        root = Path(os.getenv("XDG_DATA_HOME") or Path.home() / ".local" / "share")
    return root / "jas"


def static_directory() -> Path:
    if directory := os.getenv("JAS_STATIC_DIR"):
        return Path(directory).expanduser().resolve()
    bundled = Path(__file__).with_name("static")
    return (
        bundled if bundled.is_dir() else Path(__file__).resolve().parents[3] / "frontend" / "dist"
    )
