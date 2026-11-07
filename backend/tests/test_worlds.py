import pytest
from agent_sim.domain import Action, Design, Parameters
from agent_sim.environments import Commons, Coordination, TrustExchange, World, create_world
from agent_sim.templates import templates


def actor(world: World) -> str:
    key = world.actor()
    assert key is not None
    return key


def action(kind="contribute", amount=0, **changes):
    return Action(
        kind=kind, amount=amount, target="", message="", report=None, promise=None, **changes
    )


def test_sealed_choices_and_private_facts_do_not_leak(design):
    world = Commons(design, Parameters(), 7)
    agent = actor(world)
    before = world.observe(world.order()[1])
    choice = action(amount=7)
    choice.message, choice.report = "I will cooperate", 42
    world.apply(agent, choice)
    after = world.observe(actor(world))
    assert after == before
    assert "pending" not in after
    assert len(after["public_signals"]) == 0
    assert after["your_private_signal"] == world.state["signals"][actor(world)]


def test_common_payoffs_claims_and_commitments_are_rule_verified(design):
    world = Commons(design, Parameters(endowment=10, multiplier=2), 9)
    for round_number in (1, 2):
        for _ in design.profiles:
            agent = actor(world)
            choice = action(amount=5)
            choice.report = world.state["signals"][agent]
            choice.promise = 8 if round_number == 1 else None
            events, measures = world.apply(agent, choice)
    assert world.actor() is None
    assert all(v == 30 for v in world.state["balances"].values())
    assert len([e for e in events if e.kind == "claim" and e.data["accurate"]]) == 6
    assert (
        len([e for e in events if e.kind == "commitment_resolved" and not e.data["fulfilled"]]) == 6
    )
    assert next(m.value for m in measures if m.key == "contribution_rate") == 0.5


def test_trust_exchange_conserves_declared_payoffs_and_opportunity(design):
    design.environment, design.rounds = "trust_exchange", 1
    world = TrustExchange(design, Parameters(endowment=10, multiplier=3), 7)
    sender, receiver = world.partners()
    world.apply(sender, action("send", 4))
    assert world.observe(receiver)["available"] == 12
    world.apply(receiver, action("return", 5))
    assert world.state["balances"][sender] == 11
    assert world.state["balances"][receiver] == 7
    assert world.state["relations"][f"{receiver}:{sender}"]["amount"] == 5


def test_coordination_requires_dependencies_and_records_duplicate_work(design):
    design.environment = "coordination"
    world = Coordination(design, Parameters(), 7)
    choice = action("work")
    choice.target = "task-2"
    events, _ = world.apply(actor(world), choice)
    assert events[-1].kind == "blocked_work"
    choice.target = "task-1"
    for _ in range(2):
        events, _ = world.apply(actor(world), choice)
    assert events[-1].kind == "task_completed"
    events, _ = world.apply(actor(world), choice)
    assert events[-1].kind == "duplicate_work"


def test_disabled_communication_rejected_and_snapshot_is_detached(design):
    world = Commons(design, Parameters(communication=False), 7)
    choice = action()
    choice.message = "not allowed"
    before = world.snapshot()
    with pytest.raises(ValueError, match="disabled"):
        world.apply(actor(world), choice)
    assert world.snapshot() == before
    detached = world.snapshot()
    detached["balances"][actor(world)] = 999
    assert world.snapshot() == before


@pytest.mark.parametrize("template", templates(), ids=lambda x: x["id"])
def test_seed_restore_and_memory_ablation(template):
    design = Design.model_validate(template["design"])
    params = design.conditions[0].parameters.model_copy(update={"memory": "none"})
    first = create_world(design, params, 7)
    first.state["notes"][actor(first)] = "private"
    first.state["history"] = [{"secret": "older experience"}]
    restored = create_world(design, params, 7, first.snapshot())
    assert restored.snapshot() == first.snapshot()
    observation = restored.observe(actor(restored))
    assert not observation["your_note"]
    assert not observation["public_history"]
    assert not observation["your_experiences"]


def test_resource_shock_changes_legal_budget_without_announcing_future(design):
    from agent_sim.domain import Decision, ResourceChange
    from agent_sim.execution import transition

    design.rounds = 3
    parameters = Parameters(endowment=10, resource_schedule=[ResourceChange(round=2, endowment=3)])
    world = Commons(design, parameters, 7)
    assert "resource_change" not in str(world.observe(actor(world)))
    for _ in design.profiles:
        choice = action(amount=5)
        choice.promise = 8
        transition(
            world, actor(world), Decision(action=choice, rationale="", memory="", forecast=None)
        )
    assert world.parameters.endowment == 3
    restored = Commons(design, parameters, 7, world.snapshot())
    assert restored.observe(actor(restored)) == world.observe(actor(world))
    assert world.observe(actor(world))["legal_actions"][0]["amount_max"] == 3
    for index, _ in enumerate(design.profiles):
        events, measures = transition(
            world,
            actor(world),
            Decision(action=action(amount=3), rationale="", memory="", forecast=None),
        )
        if index == 0:
            assert any(e.kind == "resource_change" for e in events)
    assert all(not e.data["eligible"] for e in events if e.kind == "commitment_resolved")
    assert not any(m.key == "promise_fulfillment_rate" for m in measures)
    assert world.parameters.endowment == 3


def test_resource_schedule_validation(design):
    payload = design.model_dump()
    payload["conditions"][0]["parameters"]["resource_schedule"] = [{"round": 3, "endowment": 2}]
    with pytest.raises(ValueError, match="within the run"):
        Design.model_validate(payload)


def test_forecast_is_scored_against_settled_resources_before_next_shock(design):
    from agent_sim.domain import Decision, ResourceChange
    from agent_sim.execution import transition

    params = Parameters(endowment=10, resource_schedule=[ResourceChange(round=2, endowment=2)])
    world = Commons(design, params, 7)
    for _ in design.profiles:
        _, measures = transition(
            world,
            actor(world),
            Decision(action=action(amount=5), memory="", rationale="", forecast=0.5),
        )
    errors = [m.value for m in measures if m.key == "forecast_error"]
    assert errors == [0] * len(design.profiles)
