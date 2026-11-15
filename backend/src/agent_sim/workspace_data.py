"""Consistent local backups, excluding provider credentials."""

import sqlite3
from pathlib import Path
from tempfile import NamedTemporaryFile, TemporaryDirectory
from zipfile import ZIP_DEFLATED, ZipFile

from .db import Database
from .providers import ModelRegistry


def backup_workspace(db: Database, registry: ModelRegistry) -> Path:
    database = db.engine.url.database
    if db.engine.dialect.name != "sqlite" or not database or database == ":memory:":
        raise ValueError("File backups require a persistent SQLite workspace")
    source = Path(database).resolve()
    with NamedTemporaryFile(suffix=".zip", delete=False) as file:
        archive = Path(file.name)
    try:
        with TemporaryDirectory(prefix="jas-backup-") as directory:
            databases = [(source, "workspace.sqlite3")]
            publishing = source.with_suffix(".publishing.sqlite3")
            if publishing.is_file() and not publishing.is_symlink():
                databases.append((publishing, "workspace.publishing.sqlite3"))
            for database, name in databases:
                with sqlite3.connect(database.as_uri() + "?mode=ro", uri=True) as reader:
                    with sqlite3.connect(Path(directory) / name) as writer:
                        reader.backup(writer)
            configuration = registry.configuration.model_copy(deep=True)
            for provider in configuration.providers.values():
                provider.api_key = None
            with ZipFile(archive, "w", compression=ZIP_DEFLATED) as output:
                for _, name in databases:
                    output.write(Path(directory) / name, name)
                output.writestr("workspace.settings.json", configuration.model_dump_json(indent=2))
                for suffix in (".environments", ".extensions"):
                    sidecar = source.with_suffix(suffix)
                    if not sidecar.is_dir() or sidecar.is_symlink():
                        continue
                    for path in sorted(sidecar.rglob("*")):
                        if (
                            path.is_file()
                            and not path.is_symlink()
                            and all(
                                not parent.is_symlink()
                                for parent in path.parents
                                if parent != sidecar
                            )
                        ):
                            output.write(path, f"workspace{suffix}/{path.relative_to(sidecar)}")
                output.writestr(
                    "README.txt",
                    "JAS workspace backup. Provider keys are excluded. "
                    "Stop JAS before restoring the database and matching sidecars "
                    "to a separate workspace; never overwrite existing data without "
                    "preserving it. Re-enter provider keys in Settings.\n",
                )
        return archive
    except BaseException:
        archive.unlink(missing_ok=True)
        raise
