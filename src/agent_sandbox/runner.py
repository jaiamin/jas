"""Shared run controls. Replay reads saved frames; it never invokes a policy."""

import asyncio
import logging

from . import policies
from .config import Scenario, validate_scenario
from .sandbox import Decision
from .sandboxes import get_sandbox
from .store import Store

logger = logging.getLogger(__name__)


class Runner:
    def __init__(self, store: Store, run_id: str):
        self.store, self.id = store, run_id
        data = store.run(run_id)["scenario"]
        if any(a.get("policy") == "demo" for a in data["agents"]):
            raise ValueError(
                "This historical run is replay-only. Create a new model run to continue."
            )
        # Older model runs stored a redundant policy flag; preserve their profiles and limits.
        data = {
            **data,
            "agents": [{k: v for k, v in a.items() if k != "policy"} for a in data["agents"]],
        }
        self.scenario = validate_scenario(data)
        self.spec = get_sandbox(self.scenario.sandbox)
        self.environment = self.spec.create()
        frame = store.frame(run_id)
        if frame["checkpoint"].get("version") != 1:
            raise ValueError("Unsupported runner checkpoint version")
        self.environment.restore(frame["checkpoint"]["environment"])
        self.memory = frame["checkpoint"]["memory"]
        self.tick = frame["tick"]
        self.playing = False
        self._lock = asyncio.Lock()

    @classmethod
    def create(cls, store: Store, scenario: Scenario, *, metadata=None):
        scenario = validate_scenario(scenario.model_dump(mode="json"))
        policies.check_models(scenario)
        environment = get_sandbox(scenario.sandbox).create()
        environment.initialize(scenario.parameters, [a.id for a in scenario.agents], scenario.seed)
        checkpoint = {
            "version": 1,
            "environment": environment.snapshot(),
            "memory": {agent.id: "" for agent in scenario.agents},
        }
        run_id = store.create(scenario, checkpoint, environment.metrics(), metadata or {})
        return cls(store, run_id)

    @property
    def finished(self) -> bool:
        return self.tick >= self.scenario.max_steps or self.environment.next_agent() is None

    def pause(self):
        self.playing = False
        if not self.finished and self.store.run(self.id)["status"] != "failed":
            self.store.status(self.id, "paused")

    async def wait_idle(self):
        """Wait for the current atomic turn, e.g. before closing the journal."""
        async with self._lock:
            pass

    async def step(self) -> bool:
        async with self._lock:
            if self.finished:
                self.store.status(self.id, "complete")
                return False
            # Prevent stale processes from spending on, or overwriting, a moved run.
            if self.store.frame(self.id)["tick"] != self.tick:
                raise ValueError("Run changed in another session; reload its checkpoint")
            policies.check_models(self.scenario)
            actor = self.environment.next_agent()
            profile = next(a for a in self.scenario.agents if a.id == actor)
            observation = {
                "environment": self.environment.observe(actor),
                "profile": profile.model_dump(mode="json"),
                "memory": self.memory[actor],
            }
            before = self.environment.snapshot()
            try:
                decision = await policies.choose(
                    self.scenario,
                    profile,
                    self.environment.action_type,
                    observation,
                    self.store,
                    self.id,
                )
                decision = Decision[self.environment.action_type].model_validate(decision)
                events = self.environment.step(actor, decision.action)
                memory = {**self.memory, actor: decision.memory}
                checkpoint = {
                    "version": 1,
                    "environment": self.environment.snapshot(),
                    "memory": memory,
                }
                complete = (
                    self.tick + 1 >= self.scenario.max_steps
                    or self.environment.next_agent() is None
                )
                self.store.append(
                    self.id,
                    self.tick + 1,
                    actor,
                    observation,
                    decision.model_dump(mode="json"),
                    [event.model_dump(mode="json") for event in events],
                    self.environment.metrics(),
                    checkpoint,
                    "complete" if complete else "running" if self.playing else "paused",
                )
                self.tick += 1
                self.memory = memory
                logger.info("run=%s tick=%d actor=%s", self.id, self.tick, actor)
                return True
            except BaseException as error:
                self.environment.restore(before)
                self.playing = False
                # Provider exceptions can contain request details. Persist only the
                # error class; configuration/budget ValueErrors are safe to explain.
                detail = str(error) if isinstance(error, ValueError) else type(error).__name__
                self.store.status(self.id, "failed", detail)
                logger.error("run=%s tick=%d failed: %s", self.id, self.tick, detail)
                raise

    async def play(self, steps: int | None = None):
        self.playing = True
        count = 0
        try:
            while self.playing and not self.finished and (steps is None or count < steps):
                if not await self.step():
                    break
                count += 1
                await asyncio.sleep(0)  # Let a viewer pause between atomic turns.
        finally:
            self.playing = False
            status = self.store.run(self.id)["status"]
            if status != "failed":
                self.store.status(self.id, "complete" if self.finished else "paused")
