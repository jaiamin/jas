"""SQLite journal: one transaction per turn, one complete checkpoint per frame."""

import json
import sqlite3
import uuid
from datetime import UTC, datetime
from pathlib import Path

from .config import Scenario


def encode(value) -> str:
    return json.dumps(value, ensure_ascii=False, allow_nan=False, separators=(",", ":"))


class Store:
    def __init__(self, path: str | Path = "runs.sqlite3"):
        self.db = sqlite3.connect(path)
        self.db.row_factory = sqlite3.Row
        self.db.execute("PRAGMA foreign_keys=ON")
        self.db.execute("PRAGMA journal_mode=WAL")
        version = self.db.execute("PRAGMA user_version").fetchone()[0]
        if version not in (0, 1):
            raise ValueError(f"Unsupported database version {version}")
        self.db.executescript("""
            CREATE TABLE IF NOT EXISTS runs (
                id TEXT PRIMARY KEY, created TEXT NOT NULL, scenario TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'paused', error TEXT,
                calls INTEGER NOT NULL DEFAULT 0, charged_tokens INTEGER NOT NULL DEFAULT 0,
                input_tokens INTEGER NOT NULL DEFAULT 0, output_tokens INTEGER NOT NULL DEFAULT 0,
                metadata TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS frames (
                run_id TEXT NOT NULL REFERENCES runs(id), tick INTEGER NOT NULL,
                actor TEXT, observation TEXT, decision TEXT, events TEXT NOT NULL,
                metrics TEXT NOT NULL, checkpoint TEXT NOT NULL,
                PRIMARY KEY(run_id, tick)
            );
            PRAGMA user_version=1;
        """)

    def close(self) -> None:
        self.db.close()

    def create(self, scenario: Scenario, checkpoint: dict, metrics: dict, metadata: dict) -> str:
        run_id = uuid.uuid4().hex[:12]
        with self.db:
            self.db.execute(
                "INSERT INTO runs(id, created, scenario, metadata) VALUES(?,?,?,?)",
                (
                    run_id,
                    datetime.now(UTC).isoformat(),
                    scenario.model_dump_json(),
                    encode(metadata),
                ),
            )
            self._frame(run_id, 0, None, None, None, [], metrics, checkpoint)
        return run_id

    def _frame(self, run_id, tick, actor, observation, decision, events, metrics, checkpoint):
        self.db.execute(
            "INSERT INTO frames VALUES(?,?,?,?,?,?,?,?)",
            (
                run_id,
                tick,
                actor,
                encode(observation),
                encode(decision),
                encode(events),
                encode(metrics),
                encode(checkpoint),
            ),
        )

    def append(
        self, run_id, tick, actor, observation, decision, events, metrics, checkpoint, status
    ):
        with self.db:
            self._frame(run_id, tick, actor, observation, decision, events, metrics, checkpoint)
            self.db.execute("UPDATE runs SET status=?, error=NULL WHERE id=?", (status, run_id))

    def status(self, run_id: str, status: str, error: str | None = None):
        with self.db:
            self.db.execute("UPDATE runs SET status=?, error=? WHERE id=?", (status, error, run_id))

    def reserve(self, run_id: str, call_cap: int, token_cap: int, token_ceiling: int) -> None:
        # Atomic even when two CLI processes race. Failed/unknown requests stay charged.
        with self.db:
            result = self.db.execute(
                """
                UPDATE runs SET calls=calls+1, charged_tokens=charged_tokens+?
                WHERE id=? AND calls < ? AND charged_tokens+? <= ?
            """,
                (token_ceiling, run_id, call_cap, token_ceiling, token_cap),
            )
            if result.rowcount != 1:
                raise ValueError("Model call or token budget exhausted; run remains checkpointed")

    def settle(self, run_id: str, ceiling: int, input_tokens: int, output_tokens: int):
        with self.db:
            self.db.execute(
                """
                UPDATE runs SET charged_tokens=charged_tokens-?+?,
                    input_tokens=input_tokens+?, output_tokens=output_tokens+? WHERE id=?
            """,
                (ceiling, input_tokens + output_tokens, input_tokens, output_tokens, run_id),
            )

    def run(self, run_id: str) -> dict:
        row = self.db.execute("SELECT * FROM runs WHERE id=?", (run_id,)).fetchone()
        if row is None:
            raise ValueError(f"Saved run {run_id!r} does not exist")
        data = dict(row)
        for key in ("scenario", "metadata"):
            data[key] = json.loads(data[key])
        return data

    def runs(self) -> list[dict]:
        rows = self.db.execute("""
            SELECT r.id, r.created, r.status, r.calls, r.error, r.scenario,
                (SELECT MAX(tick) FROM frames WHERE run_id=r.id) AS tick
            FROM runs r ORDER BY r.created DESC
        """)
        return [{**dict(row), "scenario": json.loads(row["scenario"])} for row in rows]

    def frame(self, run_id: str, tick: int | None = None) -> dict:
        query = "SELECT * FROM frames WHERE run_id=?"
        args = [run_id]
        if tick is not None:
            query += " AND tick=?"
            args.append(tick)
        row = self.db.execute(query + " ORDER BY tick DESC LIMIT 1", args).fetchone()
        if row is None:
            raise ValueError(f"No frame {tick} in run {run_id!r}")
        return self._decode_frame(row)

    @staticmethod
    def _decode_frame(row) -> dict:
        data = dict(row)
        for key in ("observation", "decision", "events", "metrics", "checkpoint"):
            data[key] = json.loads(data[key])
        return data

    def frames(self, run_id: str, through: int | None = None) -> list[dict]:
        # The caller controls how much history it needs for charts and replay.
        if through is None:
            through = self.frame(run_id)["tick"]
        return [
            self._decode_frame(row)
            for row in self.db.execute(
                "SELECT * FROM frames WHERE run_id=? AND tick<=? ORDER BY tick",
                (run_id, through),
            )
        ]
