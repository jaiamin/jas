"""Append-only extension attempt events, including failed/unfinished work."""

import json
import re
from pathlib import Path
from threading import RLock

from sqlalchemy.exc import NoResultFound

from .db import digest, now, uid

FORMAT = "jas-extension-generation-v2"
EVENT_FORMAT = "jas-extension-generation-event-v2"


class GenerationStore:
    def __init__(self, root: Path):
        self.root, self.lock = root, RLock()

    def start(self, metadata: dict) -> str:
        with self.lock:
            key = uid()
            directory = self.root / f".pending-{key}"
            directory.mkdir(parents=True, exist_ok=False)
            self._write_event(directory, [], "started", metadata)
            directory.rename(self.root / key)
            return key

    def _events(self, key: str) -> list[dict]:
        if not re.fullmatch(r"[a-f0-9]{16}", key) or not (self.root / key).is_dir():
            raise NoResultFound()
        events, previous = [], None
        for path in sorted((self.root / key).glob("*.json")):
            record = json.loads(path.read_text())
            if record.get("format") != EVENT_FORMAT:
                raise ValueError("Unsupported extension generation event format; expected v2")
            if (
                path.name != f"{len(events):04}.json"
                or record["sequence"] != len(events)
                or record["previous"] != previous
                or record["sha256"] != digest({k: v for k, v in record.items() if k != "sha256"})
            ):
                raise ValueError("Invalid immutable generation event sequence or content hash")
            events.append(record)
            previous = record["sha256"]
        return events

    def append(self, key: str, kind: str, data: dict) -> None:
        with self.lock:
            events = self._events(key)
            if any(event["kind"] == "stopped" for event in events):
                raise ValueError("A closed generation attempt cannot receive more events")
            self._write_event(self.root / key, events, kind, data)

    @staticmethod
    def _write_event(directory: Path, events: list[dict], kind: str, data: dict) -> None:
        payload = {
            "format": EVENT_FORMAT,
            "sequence": len(events),
            "created": now(),
            "kind": kind,
            "data": data,
            "previous": events[-1]["sha256"] if events else None,
        }
        payload["sha256"] = digest(payload)
        path = directory / f"{len(events):04}.json"
        temporary = directory / f".{path.stem}-{uid()}.tmp"
        try:
            with temporary.open("x") as stream:
                json.dump(payload, stream)
            temporary.replace(path)
        finally:
            temporary.unlink(missing_ok=True)

    def get(self, key: str) -> dict:
        with self.lock:
            events = self._events(key)
            if not events or events[0]["kind"] != "started":
                raise ValueError("Missing generation attempt origin")
            result = {
                "format": FORMAT,
                "id": key,
                **events[0]["data"],
                "created": events[0]["created"],
                "events": events,
                "candidate": None,
                "review": None,
                "check": None,
                "admission": None,
                "source": None,
                "requests": [],
                "stop_reason": "in_progress",
            }
            for event in events[1:]:
                if event["kind"] == "stopped":
                    result.update(event["data"])
                elif event["kind"] == "request":
                    result["requests"].append(event["data"])
                elif event["kind"] in {"candidate", "review", "check", "admission", "source"}:
                    result[event["kind"]] = event["data"]
            result["sha256"] = events[-1]["sha256"]
            return result

    def list(self) -> list[dict]:
        with self.lock:
            return sorted(
                (
                    self.get(p.name)
                    for p in self.root.glob("*")
                    if p.is_dir() and not re.fullmatch(r"\.pending-[a-f0-9]{16}", p.name)
                ),
                key=lambda r: r["created"],
                reverse=True,
            )
