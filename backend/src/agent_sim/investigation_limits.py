"""Durable limits shared by the existing request ledger and World run writer."""

import asyncio

from sqlalchemy import update

from .db import Database, InvestigationRecord, Run


class InvestigationStopped(ValueError):
    def __init__(self, reason: str):
        self.reason = reason
        super().__init__(f"Investigation stopped: {reason}. No additional work was authorized.")


def claim_work(db: Database, key: str | None, kind: str) -> None:
    if key is None:
        return
    with db.session.begin() as session:
        row = session.get_one(InvestigationRecord, key)
        column = getattr(InvestigationRecord, kind)
        if (
            session.execute(
                update(InvestigationRecord)
                .where(
                    InvestigationRecord.id == key,
                    InvestigationRecord.status.in_(["running", "pausing"])
                    if kind == "operations"
                    else InvestigationRecord.status == "running",
                    column < row.authorization[f"max_{kind}"],
                )
                .values({kind: column + 1})
                .returning(InvestigationRecord.id)
            ).scalar_one_or_none()
            is None
        ):
            raise InvestigationStopped(
                row.status if row.status != "running" else f"{kind}_allowance_exhausted"
            )


async def wait_ready(db: Database, key: str | None) -> None:
    """Pause at a request/commit boundary, keeping the server-owned continuation alive."""
    if key is None:
        return
    while True:
        with db.session.begin() as session:
            row = session.get_one(InvestigationRecord, key)
            if row.status == "running":
                return
            if row.status == "pausing":
                row.status, row.stop_reason = "paused", "user_pause"
            elif row.status != "paused":
                raise InvestigationStopped(row.status)
        await asyncio.sleep(0.05)


def claim_turn(db: Database, run_id: str) -> None:
    with db.session.begin() as session:
        run = session.get_one(Run, run_id)
        if run.investigation_id is None or run.investigation_turn == run.turn + 1:
            return
        parent = session.get_one(InvestigationRecord, run.investigation_id)
        if (
            session.execute(
                update(InvestigationRecord)
                .where(
                    InvestigationRecord.id == parent.id,
                    InvestigationRecord.status == "running",
                    InvestigationRecord.turns < parent.authorization["max_turns"],
                )
                .values(turns=InvestigationRecord.turns + 1)
                .returning(InvestigationRecord.id)
            ).scalar_one_or_none()
            is None
        ):
            raise InvestigationStopped(
                parent.status if parent.status != "running" else "turns_allowance_exhausted"
            )
        run.investigation_turn = run.turn + 1
