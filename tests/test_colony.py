import json

import pytest

from agent_sandbox.sandboxes.colony import Action, Colony


@pytest.fixture
def colony(scenario):
    environment = Colony()
    environment.initialize(scenario.parameters, [a.id for a in scenario.agents], scenario.seed)
    return environment


def test_invalid_move_spends_turn_without_changing_resources(colony):
    resources = colony.resources.copy()
    events = colony.step("mara", Action(kind="move", target="quarry"))
    assert events[0].kind == "rejected"
    assert colony.settlers["mara"]["location"] == "habitat"
    assert colony.resources == resources
    assert colony.turn == 1


def test_only_selected_settler_can_act(colony):
    with pytest.raises(ValueError, match="selected settler"):
        colony.step("eli", Action(kind="rest"))
    assert colony.turn == 0


@pytest.mark.parametrize("kind", ["move", "work", "rest", "repair", "build"])
def test_actions_have_python_enforced_effects(colony, kind):
    me = colony.settlers["mara"]
    me["location"] = "greenhouse"
    me["stamina"] = 50
    colony.resources["materials"] = 30
    before = colony.resources.copy()
    events = colony.step("mara", Action(kind=kind, target="habitat" if kind == "move" else None))
    assert events[0].kind == kind
    if kind == "move":
        assert me["location"] == "habitat"
    elif kind == "work":
        assert colony.resources["food"] > before["food"]
        assert colony.resources["energy"] == before["energy"] - 1
    elif kind == "rest":
        assert me["stamina"] == 75
    elif kind == "repair":
        assert colony.facilities["greenhouse"]["integrity"] == 100
        assert colony.resources["materials"] == 27
    elif kind == "build":
        assert colony.facilities["greenhouse"]["level"] == 1
        assert colony.resources["materials"] == 22


def test_insufficient_resources_are_atomic(colony):
    colony.resources["materials"] = 0
    before = colony.resources.copy()
    stamina = colony.settlers["mara"]["stamina"]
    assert colony.step("mara", Action(kind="build"))[0].kind == "rejected"
    assert colony.resources == before
    assert colony.settlers["mara"]["stamina"] == stamina


def test_private_radio_and_local_visibility(colony):
    colony.step("mara", Action(kind="rest", message="Private plan", recipient="eli"))
    assert colony.observe("eli")["self"]["inbox"][0]["text"] == "Private plan"
    assert colony.observe("noa")["self"]["inbox"] == []
    assert "eli" not in colony.observe("mara")["local_settlers"]
    assert "inbox" not in colony.observe("mara")["local_settlers"]["sol"]


def test_json_snapshot_restores_rng_exactly(colony):
    for _ in range(5):
        colony.step(colony.next_agent(), Action(kind="rest"))
    restored = Colony()
    restored.restore(json.loads(json.dumps(colony.snapshot())))
    assert restored.step(restored.next_agent(), Action(kind="rest")) == colony.step(
        colony.next_agent(), Action(kind="rest")
    )
    assert restored.snapshot() == colony.snapshot()


def test_shortages_harm_settlers_and_resources_stay_nonnegative(colony):
    colony.resources.update(food=0, energy=0)
    for _ in range(6):
        colony.step(colony.next_agent(), Action(kind="rest"))
    assert colony.metrics()["mean_health"] == 92
    assert min(colony.resources.values()) >= 0
