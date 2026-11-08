"""Independent resource-accounting oracles and information-flow regressions."""

import copy
import itertools

import pytest
from agent_sim.db import digest
from agent_sim.domain import Action, Decision, Design
from agent_sim.simulation.environments import create_world
from agent_sim.templates import composed_template
from agent_sim.validity import preflight
from pydantic import ValidationError


def design_for(**changes):
    raw = composed_template().model_dump()
    raw["rounds"] = 3
    raw["conditions"] = raw["conditions"][:1]
    r = raw["conditions"][0]["parameters"]["composition"]["resources"][0]
    r.update(initial_stock=12, action_limit=12, capacity=500)
    r.update(changes)
    return Design.model_validate(raw)


def decision(kind, amount=0, target=""):
    return Decision(
        action=Action(
            kind=kind, amount=amount, target=target, message="", report=None, promise=None
        ),
        rationale="Scripted strategy",
        memory="",
        forecast=None,
    )


def play(design, strategy):
    world = create_world(design, design.conditions[0].parameters, design.seeds[0])
    trace = []
    while (actor := world.actor()) is not None:
        action = strategy(world, actor)
        before = world.snapshot()
        replay = create_world(design, design.conditions[0].parameters, design.seeds[0], before)
        observed = world.observe(actor)
        result = world.step(actor, action)
        assert replay.observe(actor) == observed
        assert replay.step(actor, action) == result
        assert digest(replay.snapshot()) == digest(world.snapshot())
        trace.append((actor, observed, result, world.snapshot()))
    return world, trace


def strategy(mode):
    def choose(world, actor):
        for option in world.observe(actor)["legal_actions"]:
            if option["kind"] == "allocate":
                return decision(
                    "allocate",
                    4 if mode == "equal" else option["amount_max"],
                    f"food:{'*' if mode == 'equal' else actor}",
                )
            if option["kind"] == "extract":
                return decision("extract", min(1, option["amount_max"]), "food")
        return decision("wait")

    return choose


def test_equal_sharing_and_retention_have_distinct_expected_outcomes():
    design = design_for()
    fair, _ = play(design, strategy("equal"))
    hoard, _ = play(design, strategy("retain"))
    assert fair.state["balances"] == dict.fromkeys(fair.ids, 6)
    assert fair.state["consumed"]["food"] == dict.fromkeys(fair.ids, 3)
    assert fair.state["unmet"]["food"] == dict.fromkeys(fair.ids, 0)
    assert hoard.state["balances"] == {"alex": 15, "morgan": -9, "sam": -9, "jordan": -9}
    assert hoard.state["inventories"]["food"] == {"alex": 9, "morgan": 0, "sam": 0, "jordan": 0}
    assert sum(fair.state["balances"].values()) == 24
    assert sum(hoard.state["balances"].values()) == -12


def test_replenishment_discards_capacity_overflow_and_stops_at_terminal_round():
    design = design_for(initial_stock=5, capacity=5, replenishment=4, need=0)
    world, trace = play(
        design,
        lambda _world, actor: (
            decision("allocate", 2, "food:alex") if actor == "alex" else decision("wait")
        ),
    )
    assert [trace[i][3]["stocks"]["food"] for i in (3, 7, 11)] == [5, 5, 3]
    assert world.state["inventories"]["food"]["alex"] == 6
    assert world.state["balances"]["alex"] == 6


@pytest.mark.parametrize("controllers,stocks", [(["alex"], [2, 0, 0]), ([], [0, 0, 0])])
def test_preflight_exhaustion_warning_has_a_legal_witness_without_blocking_one_shot(
    controllers, stocks
):
    design = design_for(initial_stock=5, action_limit=3, controllers=controllers)

    def maximum_request(world, actor):
        option = world.observe(actor)["legal_actions"][0]
        return decision(option["kind"], option["amount_max"], option["targets"][0])

    _, trace = play(design, maximum_request)
    assert [trace[i][3]["stocks"]["food"] for i in (3, 7, 11)] == stocks
    report = preflight(design)
    assert report["status"] != "blocked"
    assert any(i["code"] == "early_resource_exhaustion" for i in report["issues"])


def test_preflight_does_not_presume_persistent_exhaustion_with_inflows_or_slower_access():
    for design in (design_for(replenishment=2), design_for(initial_stock=12, action_limit=2)):
        assert not any(
            i["code"] == "early_resource_exhaustion" for i in preflight(design)["issues"]
        )


@pytest.mark.parametrize(
    "controlled,stock,allocations,need,replenishment,seed",
    list(
        itertools.product(
            (False, True),
            ("public", "controllers"),
            ("public", "parties"),
            (0, 1, 3),
            (0, 2),
            (7, 19),
        )
    ),
)
def test_resource_conservation_and_exact_replay(
    controlled, stock, allocations, need, replenishment, seed
):
    design = design_for(
        controllers=["alex"] if controlled else [],
        need=need,
        replenishment=replenishment,
        stock_visibility=stock,
        allocation_visibility=allocations,
    )
    design.seeds = [seed]
    world, trace = play(design, strategy("equal"))
    assert len(trace) == 12
    # Capacity is 500, so none of the known inflows is discarded at the cap.
    initial_and_inflows = 12 + 2 * replenishment
    remaining = world.state["stocks"]["food"] + sum(world.state["inventories"]["food"].values())
    consumed = sum(world.state["consumed"]["food"].values())
    assert remaining + consumed == pytest.approx(initial_and_inflows)
    assert sum(world.state["unmet"]["food"].values()) + consumed == pytest.approx(need * 4 * 3)
    assert all(v >= 0 for v in world.state["inventories"]["food"].values())
    assert world.state["stocks"]["food"] >= 0


def test_hidden_stock_does_not_leak_via_observation_or_schema():
    a = design_for(stock_visibility="controllers", allocation_visibility="parties")
    b = design_for(initial_stock=9, stock_visibility="controllers", allocation_visibility="parties")
    worlds = [create_world(d, d.conditions[0].parameters, 7) for d in (a, b)]
    for actor in ("morgan", "sam", "jordan"):
        observations = [w.observe(actor) for w in worlds]
        assert observations[0] == observations[1]
        assert observations[0]["resources"][0]["stock"] is None
        assert (
            worlds[0].decision_schema(observations[0]).model_json_schema()
            == worlds[1].decision_schema(observations[1]).model_json_schema()
        )
    assert worlds[0].observe("alex")["resources"][0]["stock"] == 12
    assert worlds[1].observe("alex")["resources"][0]["stock"] == 9


def test_private_receipts_do_not_reach_uninvolved_agents_or_public_history():
    design = design_for(allocation_visibility="parties")
    world = create_world(design, design.conditions[0].parameters, 7)
    world.step("alex", decision("allocate", 7, "food:morgan"))
    for key in ("sam", "jordan"):
        o = world.observe(key)
        assert not o["public_history"] and not o["your_experiences"]
        assert o["resources"][0]["inventories"] == {key: 0}
    for key in ("alex", "morgan"):
        assert any("7 units" in e["text"] for e in world.observe(key)["your_experiences"])


def test_visibility_changes_information_but_not_fixed_strategy_outcomes():
    a = design_for(allocation_visibility="public")
    b = design_for(allocation_visibility="parties")
    left, lt = play(a, strategy("equal"))
    right, rt = play(b, strategy("equal"))
    assert left.state["balances"] == right.state["balances"]
    assert any(left_turn[1] != right_turn[1] for left_turn, right_turn in zip(lt, rt, strict=True))
    report = preflight(composed_template())
    assert report["status"] != "blocked"
    assert report["comparisons"][0]["changed_parameters"] == [
        "composition.resources.food.allocation_visibility"
    ]


def test_invalid_actions_are_atomic_and_controller_labels_do_not_grant_permissions():
    design = design_for()
    world = create_world(design, design.conditions[0].parameters, 7)
    before = world.snapshot()
    for invalid in (
        decision("allocate", 13, "food:*"),
        decision("extract", 1, "food"),
        decision("allocate", 1, "other:alex"),
        decision("send", 1, "food:morgan"),
    ):
        with pytest.raises((ValueError, ValidationError)):
            world.step("alex", invalid)
        assert world.snapshot() == before
    world.step("alex", decision("wait"))
    actor = world.actor()
    assert actor is not None and actor != "alex"
    with pytest.raises(ValueError):
        world.step(actor, decision("allocate", 1, "food:*"))


def test_multiple_resources_and_transfer_are_conserved():
    raw = design_for().model_dump()
    resources = raw["conditions"][0]["parameters"]["composition"]["resources"]
    resources.append({**resources[0], "key": "water", "name": "Water", "need": 0})
    design = Design.model_validate(raw)
    world = create_world(design, design.conditions[0].parameters, 7)
    world.step("alex", decision("allocate", 8, "water:*"))
    actor = world.actor()
    assert actor is not None
    world.step(actor, decision("send", 2, "water:alex"))
    assert sum(world.state["inventories"]["water"].values()) == 8
    assert world.state["stocks"]["water"] == 4
    assert world.state["inventories"]["water"]["alex"] == 4
    assert world.state["stocks"]["food"] == 12


@pytest.mark.parametrize(
    "patch",
    [
        {"initial_stock": 501},
        {"initial_stock": -1},
        {"need": -1},
        {"controllers": ["unknown"]},
        {"controllers": ["alex", "alex"]},
        {"shortfall_penalty": float("nan")},
        {"execute": "anything"},
    ],
)
def test_invalid_compositions_are_rejected(patch):
    with pytest.raises(ValidationError):
        design_for(**patch)


def test_capability_mapping_checks_actual_permissions_and_needs():
    from agent_sim.validity import Requirement, requirement_issues

    requirements = [
        Requirement(
            source="unequal power",
            capability="allocation_power",
            mapping="direct",
            explanation="Enforced allocation rights.",
        ),
        Requirement(
            source="consumption needs",
            capability="consumption_needs",
            mapping="direct",
            explanation="Round consumption is enforced.",
        ),
    ]
    assert requirement_issues("composed", requirements, design_for()) == []
    assert requirement_issues("composed", requirements, design_for(controllers=[], need=0))
    assert requirement_issues(
        "composed", requirements, design_for(controllers=["alex", "morgan", "sam", "jordan"])
    )


def test_a_disabled_control_arm_does_not_make_a_supported_mechanic_unavailable():
    from agent_sim.validity import Requirement, requirement_issues

    raw = design_for().model_dump()
    control = copy.deepcopy(raw["conditions"][0])
    control["key"], control["name"] = "disabled", "Transfers disabled"
    control["parameters"]["composition"]["resources"][0]["transfers"] = False
    raw["conditions"].append(control)
    design = Design.model_validate(raw)
    requirement = Requirement(
        source="personal transfers",
        capability="inventory_transfers",
        mapping="direct",
        explanation="Compare transfers with a disabled control.",
    )
    assert requirement_issues("composed", [requirement], design) == []


def test_maximum_population_resources_and_horizon_conserve_and_restore():
    from agent_sim.domain import Profile

    raw = design_for().model_dump()
    raw["rounds"] = 100
    raw["profiles"] += [
        Profile(key=f"p{i}", name=f"Agent {i}", goal="Meet needs.").model_dump() for i in range(8)
    ]
    resource = raw["conditions"][0]["parameters"]["composition"]["resources"][0]
    resource["replenishment"] = 2
    raw["conditions"][0]["parameters"]["composition"]["resources"] = [
        {**resource, "key": key, "name": key.title()}
        for key in ("food", "water", "energy", "medicine")
    ]
    design = Design.model_validate(raw)
    world = create_world(design, design.conditions[0].parameters, 7)
    restored = None
    turns = 0
    while (actor := world.actor()) is not None:
        chosen = strategy("equal")(world, actor)
        result = world.step(actor, chosen)
        if restored is not None:
            assert restored.step(actor, chosen) == result
        turns += 1
        if turns == 600:
            restored = create_world(design, design.conditions[0].parameters, 7, world.snapshot())
    assert turns == 1200 and restored is not None
    assert digest(world.snapshot()) == digest(restored.snapshot())
    for key in ("food", "water", "energy", "medicine"):
        total = world.state["stocks"][key] + sum(world.state["inventories"][key].values())
        consumed = sum(world.state["consumed"][key].values())
        assert total + consumed == pytest.approx(12 + 99 * 2)
        assert consumed + sum(world.state["unmet"][key].values()) == pytest.approx(1200)
