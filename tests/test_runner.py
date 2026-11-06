import asyncio
import copy
import json
from typing import Literal

import pytest
from pydantic import Field

from agent_sandbox import policies
from agent_sandbox.config import AgentProfile, ConfigModel, Scenario
from agent_sandbox.replay import verify
from agent_sandbox.runner import Runner
from agent_sandbox.sandbox import Event, SandboxSpec
from agent_sandbox.sandboxes import SANDBOXES


class CounterParameters(ConfigModel):
    target: int = Field(default=3, gt=0)


class CounterAction(ConfigModel):
    kind: Literal["increment"]


class Counter:
    """A non-colony environment proves the runner has no colony assumptions."""

    action_type = CounterAction

    def initialize(self, parameters, agent_ids, seed):
        self.state = {"value": 0, "target": parameters["target"], "agents": agent_ids}

    def observe(self, agent_id):
        return {"value": self.state["value"]}

    def next_agent(self):
        if self.state["value"] < self.state["target"]:
            return self.state["agents"][0]
        return None

    def step(self, agent_id, action):
        assert agent_id == self.next_agent()
        assert isinstance(action, CounterAction)
        self.state["value"] += 1
        return [Event(kind="increment", text="Counter increased", agent=agent_id)]

    def metrics(self):
        return {"count": float(self.state["value"])}

    def snapshot(self):
        return copy.deepcopy(self.state)

    def restore(self, snapshot):
        self.state = copy.deepcopy(snapshot)


def test_non_colony_contract_checkpoint_resume_and_replay(store, monkeypatch):
    monkeypatch.setitem(
        SANDBOXES,
        "counter",
        SandboxSpec(
            parameters=CounterParameters,
            create=Counter,
            demo=lambda observation, index: CounterAction(kind="increment"),
        ),
    )
    scenario = Scenario(
        sandbox="counter",
        name="Tiny counter",
        parameters={"target": 3},
        agents=[AgentProfile(id="one", name="One", goal="Reach the target")],
    )
    runner = Runner.create(store, scenario)
    asyncio.run(runner.play(1))
    assert runner.tick == 1
    assert store.run(runner.id)["status"] == "paused"
    resumed = Runner(store, runner.id)
    asyncio.run(resumed.play())
    assert resumed.tick == 3
    assert store.run(runner.id)["status"] == "complete"
    assert resumed.environment.metrics() == {"count": 3.0}
    assert verify(store, runner.id) == 3
    assert store.run(runner.id)["calls"] == 0


def test_seeded_runs_and_resumed_runs_are_identical(store, scenario):
    first = Runner.create(store, scenario)
    asyncio.run(first.play())
    second = Runner.create(store, scenario)
    asyncio.run(second.play(37))
    resumed = Runner(store, second.id)
    asyncio.run(resumed.play())
    for a, b in zip(store.frames(first.id), store.frames(second.id), strict=True):
        assert {k: v for k, v in a.items() if k != "run_id"} == {
            k: v for k, v in b.items() if k != "run_id"
        }
    assert verify(store, first.id) == scenario.max_steps


def test_different_seeds_change_outcomes(store, scenario):
    first = Runner.create(store, scenario)
    scenario.seed += 1
    second = Runner.create(store, scenario)
    asyncio.run(first.play(24))
    asyncio.run(second.play(24))
    assert first.environment.metrics() != second.environment.metrics()


def test_replay_never_calls_a_policy(store, scenario, monkeypatch):
    runner = Runner.create(store, scenario)
    asyncio.run(runner.play(12))

    def forbidden(*args, **kwargs):
        raise AssertionError("Replay attempted a policy call")

    monkeypatch.setattr(policies, "choose", forbidden)
    assert verify(store, runner.id) == 12
    assert store.frame(runner.id, 4)["tick"] == 4


def test_failed_step_rolls_back_and_can_resume(store, scenario, monkeypatch):
    runner = Runner.create(store, scenario)
    before = runner.environment.snapshot()
    choose = policies.choose

    async def fail(*args, **kwargs):
        raise ValueError("Deliberate failure")

    monkeypatch.setattr(policies, "choose", fail)
    with pytest.raises(ValueError, match="Deliberate"):
        asyncio.run(runner.step())
    assert runner.environment.snapshot() == before
    assert store.frame(runner.id)["tick"] == 0
    runner.pause()
    assert store.run(runner.id)["status"] == "failed"
    monkeypatch.setattr(policies, "choose", choose)
    asyncio.run(Runner(store, runner.id).step())
    assert store.run(runner.id)["error"] is None


def test_stale_runner_cannot_overwrite_checkpoint(store, scenario):
    first = Runner.create(store, scenario)
    stale = Runner(store, first.id)
    asyncio.run(first.step())
    with pytest.raises(ValueError, match="another session"):
        asyncio.run(stale.step())


def test_replay_detects_changed_outcomes(store, scenario):
    runner = Runner.create(store, scenario)
    asyncio.run(runner.play(2))
    frame = store.frame(runner.id, 1)
    frame["checkpoint"]["environment"]["resources"]["food"] += 1
    with store.db:
        store.db.execute(
            "UPDATE frames SET checkpoint=? WHERE run_id=? AND tick=1",
            (
                json.dumps(frame["checkpoint"]),
                runner.id,
            ),
        )
    with pytest.raises(ValueError, match="Replay differs"):
        verify(store, runner.id)
