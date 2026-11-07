"""Server-owned run tasks. Browser pages observe these tasks and never own them."""

import asyncio
from dataclasses import dataclass
from time import monotonic

from .runner import Runner
from .store import Store


@dataclass
class Execution:
    runner: Runner
    task: asyncio.Task | None = None
    started: float = 0

    @property
    def active(self) -> bool:
        return self.task is not None and not self.task.done()


class RunService:
    def __init__(self, store: Store):
        self.store = store
        self.executions: dict[str, Execution] = {}
        self.closing = False
        # A saved running flag is not a live task after a process restart.
        with store.db:
            store.db.execute(
                "UPDATE runs SET status='paused', error=? WHERE status='running'",
                ("Server stopped. The last checkpoint is saved; press Play to continue.",),
            )

    def get(self, run_id: str) -> Execution:
        execution = self.executions.get(run_id)
        if execution is None or (
            not execution.active and execution.runner.tick != self.store.latest_tick(run_id)
        ):
            execution = self.executions[run_id] = Execution(Runner(self.store, run_id))
        return execution

    def active(self, run_id: str) -> bool:
        execution = self.executions.get(run_id)
        return execution is not None and execution.active

    def start(self, run_id: str, *, single_step: bool = False) -> None:
        if self.closing:
            raise ValueError("Server is stopping. Resume after it restarts.")
        execution = self.get(run_id)
        if execution.active:
            return  # Multiple tabs and double clicks share exactly one writer.
        if execution.runner.finished:
            self.store.status(run_id, "complete")
            return
        execution.runner.playing = True
        execution.started = monotonic()
        self.store.status(run_id, "running")
        execution.task = asyncio.create_task(
            self._run(execution, single_step), name=f"run-{run_id}"
        )

    async def _run(self, execution: Execution, single_step: bool) -> None:
        try:
            if not execution.runner.playing:
                return  # Pause or shutdown can arrive before the task first runs.
            await execution.runner.play(1 if single_step else None)
        except asyncio.CancelledError:
            raise
        except Exception as error:
            # Runner handles errors inside a turn; preflight failures also need
            # a visible saved error rather than silently returning to paused.
            if self.store.run(execution.runner.id)["status"] != "failed":
                detail = str(error) if isinstance(error, ValueError) else type(error).__name__
                self.store.status(execution.runner.id, "failed", detail)

    def pause(self, run_id: str) -> None:
        self.get(run_id).runner.pause()

    async def close(self) -> None:
        self.closing = True
        for execution in self.executions.values():
            execution.runner.pause()
        await asyncio.gather(
            *(e.task for e in self.executions.values() if e.active), return_exceptions=True
        )
