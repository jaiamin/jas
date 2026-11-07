import random

import pytest
from agent_sim.domain import Action, Design
from agent_sim.environments import create_world
from agent_sim.execution import mechanism_schema, transition
from agent_sim.templates import templates
from pydantic import ValidationError


def world_for(env, **changes):
    design = Design.model_validate(next(t["design"] for t in templates() if t["id"] == env))
    design.rounds = 3
    params = design.conditions[0].parameters
    for key, values in changes.items():
        setattr(params, key, getattr(params, key).model_copy(update=values))
    return create_world(design, params, 17)


def action(kind, amount=0, target="", **kw):
    return Action(
        kind=kind, amount=amount, target=target, message="", report=None, promise=None, **kw
    )


def test_institution_permissions_and_private_sanctions():
    world = world_for("institution", institution={"transparent": False, "oversight": 0})
    worker = next(k for k in world.ids if k not in world.parameters.institution.authorities)
    world.state["position"] = world.order().index(worker)
    before = world.snapshot()
    with pytest.raises(ValueError, match="legal opportunities"):
        world.apply(worker, action("sanction", 1, "alex"))
    assert world.snapshot() == before
    world.state["position"] = world.order().index("alex")
    world.state["balances"][worker] = 5
    events, _ = world.apply("alex", action("sanction", 3, worker))
    assert world.state["balances"][worker] == 2
    outsider = next(k for k in world.ids if k not in ("alex", worker))
    assert world.observe(outsider)["sanctions"] == []
    assert not any(e["kind"] == "sanction" for e in world.state["experiences"][outsider])
    assert any(e.visibility == "researcher" for e in events)
    world.state["position"] = world.order().index(worker)
    world.apply(worker, action("appeal"))
    assert world.state["balances"][worker] == 5
    world.state["position"] = world.order().index(worker)
    assert not any(a["kind"] == "appeal" for a in world.observe(worker)["legal_actions"])


def test_certain_oversight_reverses_unjustified_sanctions_once():
    world = world_for("institution", institution={"oversight": 1})
    worker = world.ids[1]
    world.state["balances"][worker] = 5
    world.state["position"] = world.order().index("alex")
    _, measures = world.apply("alex", action("sanction", 3, worker))
    assert world.state["balances"][worker] == 5
    assert world.state["balances"]["alex"] == -2
    assert next(m.value for m in measures if m.key == "unjustified_sanction_rate") == 1
    assert world.state["sanctions"][0]["resolved"]


def test_bargaining_acceptance_and_exit_are_binding():
    world = world_for("bargaining")
    proposer = world.actor()
    world.apply(proposer, action("offer", 8))
    responder = world.actor()
    world.apply(responder, action("accept"))
    assert world.actor() is None
    assert world.state["balances"][responder] == 8
    assert sum(world.state["balances"].values()) == 20
    world = world_for("bargaining")
    for _ in range(3):
        world.apply(world.actor(), action("offer", 0))
        world.apply(world.actor(), action("reject"))
    assert world.actor() is None
    assert list(world.state["balances"].values()) == [1, 1]


def test_information_truth_never_leaks_before_settlement():
    world = world_for("information", information={"accuracy": 1})
    first = world.actor()
    signal = world.observe(first)["your_private_signal"]
    events, _ = world.apply(first, action("choose", signal))
    assert world.state["balances"][first] == 0
    assert not any(e.kind == "outcome" for e in events)
    second = world.actor()
    observation = world.observe(second)
    assert observation["choices"][first] == signal
    assert observation["public_signals"] == {}
    assert "truth" not in observation


def test_resource_settlement_conserves_stock_and_seals_actions():
    world = world_for("renewable_resource", resource={"capacity": 10, "extraction_limit": 10})
    while world.actor() is not None:
        actor = world.actor()
        prior = world.state["position"]
        world.apply(actor, action("extract", 10))
        if prior < len(world.ids) - 1:
            assert world.state["stock"] == 10
            assert not world.observe(world.actor())["your_experiences"]
    assert world.state["stock"] == 0
    assert sum(world.state["balances"].values()) == pytest.approx(10)


@pytest.mark.parametrize(
    "environment", ["institution", "bargaining", "information", "renewable_resource"]
)
@pytest.mark.parametrize("seed", range(20))
def test_random_legal_trajectories_are_replayable(environment, seed):
    world = world_for(environment)
    world.seed = seed
    initial = world.snapshot()
    rng = random.Random(seed)
    decisions = []
    while (actor := world.actor()) is not None:
        options = world.observe(actor)["legal_actions"]
        selected = rng.choice(options)
        chosen = action(
            selected["kind"],
            rng.randint(selected["amount_min"], selected["amount_max"]),
            rng.choice(selected["targets"]),
        )
        schema = mechanism_schema(
            tuple(
                (a["kind"], a["amount_min"], a["amount_max"], tuple(a["targets"])) for a in options
            ),
            True,
            environment == "information",
        )
        decision = schema(action=chosen.model_dump(), rationale="", memory="", forecast=None)
        transition(world, actor, decision)
        decisions.append((actor, decision, world.snapshot()))
        assert len(decisions) <= world.design.turn_count
    replay = create_world(world.design, world.parameters, seed, initial)
    for actor, decision, snapshot in decisions:
        assert replay.actor() == actor
        transition(replay, actor, decision)
        assert replay.snapshot() == snapshot


def test_new_mechanism_boundaries_reject_unavailable_actions():
    world = world_for("bargaining")
    options = world.observe(world.actor())["legal_actions"]
    schema = mechanism_schema(
        tuple((a["kind"], a["amount_min"], a["amount_max"], tuple(a["targets"])) for a in options),
        False,
        False,
    )
    with pytest.raises(ValidationError):
        schema(action=action("offer", 21).model_dump(), rationale="", memory="", forecast=None)
    with pytest.raises(ValidationError):
        schema(action=action("sanction", 1).model_dump(), rationale="", memory="", forecast=None)


def test_depleted_stock_regenerates_and_restore_preserves_it():
    from agent_sim.domain import ResourceRules

    with pytest.raises(ValidationError, match="cannot exceed"):
        ResourceRules(capacity=10, initial_stock=11)
    world = world_for("renewable_resource", resource={"initial_stock": 6, "regeneration": 0.25})
    assert world.state["stock"] == 6
    for _ in world.ids:
        world.apply(world.actor(), action("extract", 0))
    assert world.state["stock"] == pytest.approx(7.35)
    restored = create_world(world.design, world.parameters, world.seed, world.snapshot())
    assert restored.state["stock"] == world.state["stock"]


def test_hidden_outcome_feedback_also_withholds_rewards_until_run_end():
    world = world_for("information", information={"accuracy": 1, "reveal_outcome": False})
    while world.state["round"] == 1:
        actor = world.actor()
        signal = world.observe(actor)["your_private_signal"]
        world.apply(actor, action("choose", signal))
    assert all(balance == 0 for balance in world.state["balances"].values())
    assert all(reward == 10 for reward in world.state["unsettled_rewards"].values())
    assert not any(e.get("kind") == "outcome" for e in world.state["history"])
    while (actor := world.actor()) is not None:
        signal = world.observe(actor)["your_private_signal"]
        world.apply(actor, action("choose", signal))
    assert all(balance == 30 for balance in world.state["balances"].values())
