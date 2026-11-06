"""Optional verification executes recorded actions, never agent policies."""

from .sandbox import Decision
from .sandboxes import get_sandbox
from .store import Store, encode


def verify(store: Store, run_id: str) -> int:
    # Historical config is a record, not a new scenario: retired policies remain viewable.
    scenario = store.run(run_id)["scenario"]
    environment = get_sandbox(scenario["sandbox"]).create()
    frames = store.frames(run_id)
    memory = frames[0]["checkpoint"]["memory"].copy()
    environment.restore(frames[0]["checkpoint"]["environment"])
    for frame in frames[1:]:
        decision = Decision[environment.action_type].model_validate(frame["decision"])
        if environment.next_agent() != frame["actor"]:
            raise ValueError(f"Replay turn selection differs at tick {frame['tick']}")
        events = environment.step(frame["actor"], decision.action)
        memory[frame["actor"]] = decision.memory
        actual = {
            "version": 1,
            "environment": environment.snapshot(),
            "memory": memory,
        }
        expected = frame["checkpoint"]
        if (
            encode(actual) != encode(expected)
            or [e.model_dump() for e in events] != frame["events"]
            or environment.metrics() != frame["metrics"]
        ):
            raise ValueError(
                f"Replay differs at tick {frame['tick']}; environment code may have changed"
            )
    return len(frames) - 1
