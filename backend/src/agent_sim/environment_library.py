"""Mutable reusable setups; experiment revisions embed their own complete rules."""

import os
import re
from pathlib import Path
from tempfile import NamedTemporaryFile, TemporaryDirectory
from threading import RLock

from pydantic import Field
from sqlalchemy.exc import NoResultFound

from .db import digest, now, uid
from .domain import Design, Strict
from .simulation.environments import CATALOG
from .validity import preflight, require_valid


class SavedEnvironment(Strict):
    format: str = "jas-environment-v1"
    id: str
    revision: int = Field(ge=1)
    updated: str
    rules: str
    sha256: str
    design: Design


class EnvironmentConflict(ValueError):
    pass


class EnvironmentLibrary:
    def __init__(self, database_path: str | None):
        self.temporary = (
            TemporaryDirectory(prefix="jas-environments-")
            if database_path in (None, "", ":memory:")
            else None
        )
        self.root = (
            Path(self.temporary.name)
            if self.temporary
            else Path(str(database_path)).with_suffix(".environments")
        )
        self.lock = RLock()

    def _path(self, key: str) -> Path:
        if not re.fullmatch(r"[a-f0-9]{16}", key):
            raise NoResultFound()
        return self.root / f"{key}.json"

    def get(self, key: str) -> SavedEnvironment:
        try:
            record = SavedEnvironment.model_validate_json(self._path(key).read_text())
        except FileNotFoundError:
            raise NoResultFound() from None
        if (
            record.id != key
            or record.format != "jas-environment-v1"
            or record.sha256 != digest(record.design.model_dump())
        ):
            raise ValueError("Custom environment has an unsupported format or invalid content hash")
        return record

    def list(self) -> list[SavedEnvironment]:
        with self.lock:
            return sorted(
                (self.get(path.stem) for path in self.root.glob("*.json")),
                key=lambda record: record.updated,
                reverse=True,
            )

    def save(
        self, design: Design, key: str | None = None, revision: int | None = None
    ) -> SavedEnvironment:
        design = Design.model_validate_json(design.model_dump_json())
        require_valid(preflight(design))
        with self.lock:
            previous = self.get(key) if key else None
            if previous and revision != previous.revision:
                raise EnvironmentConflict(
                    "Environment changed since opening; reload before updating"
                )
            if previous and previous.rules != CATALOG[previous.design.environment].world.version:
                raise ValueError(
                    "This environment uses incompatible rules; save as a new environment"
                )
            record = SavedEnvironment(
                id=key or uid(),
                revision=previous.revision + 1 if previous else 1,
                updated=now(),
                rules=CATALOG[design.environment].world.version,
                sha256=digest(design.model_dump()),
                design=design,
            )
            self.root.mkdir(parents=True, exist_ok=True)
            temporary = None
            try:
                with NamedTemporaryFile(
                    mode="w", dir=self.root, suffix=".tmp", delete=False
                ) as stream:
                    temporary = Path(stream.name)
                    stream.write(record.model_dump_json(indent=2))
                    stream.flush()
                    os.fsync(stream.fileno())
                temporary.replace(self._path(record.id))
            finally:
                if temporary is not None:
                    temporary.unlink(missing_ok=True)
            return record

    def delete(self, key: str, revision: int) -> None:
        with self.lock:
            if self.get(key).revision != revision:
                raise EnvironmentConflict(
                    "Environment changed since opening; reload before deleting"
                )
            self._path(key).unlink()

    def close(self) -> None:
        if self.temporary:
            self.temporary.cleanup()
