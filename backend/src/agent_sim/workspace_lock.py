"""One CLI/server process owns a workspace; kernel locks release on crashes."""

import os
from contextlib import contextmanager
from pathlib import Path


@contextmanager
def workspace_lock(database: str):
    path = Path(database).with_suffix(".process.lock")
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a+b") as file:
        try:
            if os.name == "nt":
                import msvcrt

                file.seek(0)
                if not file.read(1):
                    file.write(b"\0")
                    file.flush()
                file.seek(0)
                msvcrt.locking(file.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl

                fcntl.flock(file.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError as error:
            raise ValueError(
                "This workspace is already open. Use its app, stop its server, or "
                "choose a separate --workspace."
            ) from error
        yield
