"""Development correctness matrix; independent of the frozen model benchmark."""

import asyncio
from itertools import product

import pytest
from agent_sim.assistants import Assistants
from agent_sim.db import Analysis, ProviderCall, Revision, Run
from agent_sim.domain import (
    Design,
    Parameters,
    Profile,
    ResourceChange,
    TaskDefinition,
    Treatment,
)
from agent_sim.simulation.environments import CATALOG, create_world
from agent_sim.templates import templates
from agent_sim.validity import Requirement, exposure, preflight, requirement_issues
from sqlalchemy import func, select

MEMORIES = ("none", "history", "notes", "episodic")
CHANNELS = ([], ["messages"], ["reports"], ["messages", "reports", "promises"])
MATRIX = list(product(CATALOG, MEMORIES, range(4), (1, 4, 17)))


def protocol(environment, agents=6, rounds=4):
    design = Design.model_validate(next(t["design"] for t in templates() if t["id"] == environment))
    design.profiles = [
        Profile(key=f"p{i}", name=f"Agent {i}", goal="Earn credits.")
        for i in range(2 if environment == "bargaining" else agents)
    ]
    design.rounds, design.seeds = rounds, [0, 7, 19]
    for condition in design.conditions:
        condition.parameters.institution.authorities = ["p0"]
    return Design.model_validate(design.model_dump())


@pytest.mark.parametrize("environment,memory,channel_index,rounds", MATRIX)
def test_336_simple_and_complex_protocols(environment, memory, channel_index, rounds):
    """Legal probes must handle every world/channel/memory/horizon combination."""
    agents = (2, 6, 12)[(rounds + channel_index) % 3]
    design = protocol(environment, agents, rounds)
    params = design.conditions[0].parameters.model_dump()
    params.update(
        memory=memory, communication=False, communication_channels=CHANNELS[channel_index]
    )
    if environment in {"commons", "trust_exchange"} and rounds > 1:
        params["resource_schedule"] = [{"round": rounds, "endowment": 2}]
    if environment == "coordination" and rounds > 1:
        design.tasks = [
            TaskDefinition(key="first", name="First", effort=2),
            TaskDefinition(key="later", name="Dependent", dependencies=["first"], effort=3),
        ]
    if environment == "renewable_resource":
        params["resource"].update(initial_stock=5, regeneration=0.1)
    baseline = Parameters.model_validate(params)
    treatment = baseline.model_copy(update={"communication": True})
    design.conditions = [
        Treatment(key="off", name="Communication off", parameters=baseline),
        Treatment(key="on", name="Communication on", parameters=treatment),
    ]
    design = Design.model_validate(design.model_dump())
    original = design.model_dump()
    report = preflight(design)
    assert report["status"] != "blocked", report
    assert report["probe_turns"] <= 2 * 3 * min(96, design.turn_count)
    assert len(report["comparisons"][0]["witnesses"]) == 3
    # The communication flag is explicitly delivered even when channels are empty.
    assert all(w["observation_difference"] for w in report["comparisons"][0]["witnesses"])
    assert design.model_dump() == original
    assert preflight(design.model_copy(update={"title": "Independent repeated check"})) == report
    report["issues"].append({"severity": "error"})
    assert preflight(design)["status"] != "blocked"  # callers cannot poison cache


@pytest.mark.parametrize("agents,multiplier", list(product(range(2, 13), (1, 2, 3, 4, 5))))
def test_55_independent_marginal_payoff_oracles(agents, multiplier):
    design = protocol("commons", agents, 1)
    design.conditions = design.conditions[:1]
    design.conditions[0].parameters.multiplier = multiplier
    world = create_world(design, design.conditions[0].parameters, 7)
    # Two explicit counterfactual payoffs, not an assertion of the checker formula.
    keep = 10
    contribute_one = 9 + multiplier / agents
    flagged = any(i["code"] == "aligned_contribution_payoff" for i in preflight(design)["issues"])
    assert flagged == (contribute_one >= keep)
    actor = world.actor()
    assert actor is not None
    assert world.observe(actor)["legal_actions"][0]["kind"] == "contribute"


@pytest.mark.parametrize("environment", CATALOG)
def test_inactive_mechanics_cannot_be_passed_off_as_treatments(environment):
    design = protocol(environment)
    baseline = design.conditions[0].model_copy(update={"key": "base"}, deep=True)
    changed = baseline.model_copy(update={"key": "changed"}, deep=True)
    if environment == "institution":
        changed.parameters.resource.regeneration = 0
    else:
        changed.parameters.institution.oversight = 0.73
    design.conditions = [baseline, changed]
    assert any(
        i["code"] == "inactive_intervention" and i["severity"] == "error"
        for i in preflight(design)["issues"]
    )


def test_shortage_construct_combination_is_not_implemented_by_any_world():
    needs = [
        Requirement(
            source="resource shortage",
            capability="finite_stock",
            mapping="direct",
            explanation="Persistent stock.",
        ),
        Requirement(
            source="powerful agents",
            capability="allocation_power",
            mapping="direct",
            explanation="Enforced allocation rights.",
        ),
    ]
    assert all(requirement_issues(world, needs) for world in CATALOG)
    assert requirement_issues("institution", [needs[0]])
    proxy = needs[0].model_copy(update={"capability": "allocation_budget", "mapping": "proxy"})
    assert requirement_issues("institution", [proxy])


@pytest.mark.parametrize("transparent,memory", list(product((False, True), MEMORIES)))
def test_actual_visibility_is_announced_and_private_sanctions_stay_private(transparent, memory):
    design = protocol("institution", 3, 3)
    params = design.conditions[0].parameters
    params.institution.transparent, params.memory = transparent, memory
    world = create_world(design, params, 7)
    # Explicit sanctioned-party and unrelated-party observations from the same authoritative state.
    world.state["sanctions"] = [
        {
            "actor": "p0",
            "target": "p1",
            "amount": 1,
            "justified": False,
            "resolved": False,
            "round": 1,
        }
    ]
    for actor in ("p0", "p1", "p2"):
        observation = world.observe(actor)
        assert observation["sanction_visibility"] == ("public" if transparent else "parties")
        assert (
            "public to all participants" if transparent else "private to parties"
        ) in observation["rules"]
        assert bool(observation["sanctions"]) == (transparent or actor in {"p0", "p1"})
        assert observation["public_history"] == []
    snapshot = world.snapshot()
    assert create_world(design, params, 7, snapshot).snapshot() == snapshot
    snapshot["rule_version"] = "4.0.0"
    with pytest.raises(ValueError, match="different environment rule version"):
        create_world(design, params, 7, snapshot)


def test_hidden_delayed_model_and_placebo_interventions_are_not_blanket_rejected():
    design = protocol("commons", 12, 100)
    baseline = design.conditions[0]
    later = baseline.model_copy(update={"key": "later"}, deep=True)
    later.parameters.resource_schedule = [ResourceChange(round=99, endowment=2)]
    placebo = baseline.model_copy(
        update={"key": "placebo", "description": "Different label"}, deep=True
    )
    model = baseline.model_copy(update={"key": "model", "model": "openai:gpt-6.1-sol"}, deep=True)
    design.conditions = [baseline, later, placebo, model]
    report = preflight(design)
    assert report["status"] == "review"
    assert {"bounded_horizon", "unwitnessed_treatment", "identical_conditions"} <= {
        i["code"] for i in report["issues"]
    }
    assert report["comparisons"][-1]["agent_assignment_changed"]
    assert report["probe_turns"] <= 4 * 3 * 96


def test_maximum_matrix_checks_do_not_expand_seeds_or_repetitions():
    design = protocol("commons", 12, 100)
    design.seeds = list(range(20))
    design.conditions = [
        design.conditions[0].model_copy(update={"key": f"c{i}"}, deep=True) for i in range(6)
    ]
    design = Design.model_validate(design.model_dump())
    assert design.run_count == 120
    assert preflight(design)["probe_turns"] == 6 * 3 * 96


def test_custom_tasks_replace_task_count_and_feasibility_is_condition_specific():
    design = protocol("coordination", 2, 3)
    design.conditions[0].parameters.task_count = 3
    design.conditions[1].parameters.task_count = 30
    assert "completion_ceiling" in {i["code"] for i in preflight(design)["issues"]}
    design.tasks = [TaskDefinition(key="task", name="Only task", effort=1)]
    report = preflight(design)
    assert report["status"] == "blocked"
    assert "completion_ceiling" not in {i["code"] for i in report["issues"]}


@pytest.mark.parametrize("custom_tasks", [True, False])
def test_public_task_completion_does_not_require_messages_or_private_sacrifice(custom_tasks):
    from agent_sim.domain import Action, Decision

    design = protocol("coordination", 4, 8)
    design.conditions = design.conditions[:1]
    if custom_tasks:
        design.tasks = [
            TaskDefinition(key="first", name="First", effort=2),
            TaskDefinition(key="last", name="Last", dependencies=["first"], effort=3),
        ]
    condition = design.conditions[0]
    condition.parameters.communication = False
    world = create_world(design, condition.parameters, 7)
    effort = sum(t["effort"] for t in world.state["tasks"])
    turns = 0
    while (actor := world.actor()) is not None:
        observation = world.observe(actor)
        completed = {t["key"] for t in observation["tasks"] if t["completed_by"]}
        ready = next(
            t
            for t in observation["tasks"]
            if not t["completed_by"] and set(t["dependencies"]) <= completed
        )
        balance = world.state["balances"][actor]
        world.step(
            actor,
            Decision(
                action=Action(
                    kind="work",
                    target=ready["key"],
                    amount=0,
                    message="",
                    report=None,
                    promise=None,
                ),
                rationale="Greedy no-message witness.",
                memory="",
                forecast=None,
            ),
        )
        assert world.state["balances"][actor] == balance + 1
        turns += 1
    assert turns == effort < design.turn_count
    assert all(t["completed_by"] for t in world.state["tasks"])
    report = preflight(design)
    assert report["status"] == "review"  # A valid pilot or null-effect study can still run.
    assert {"public_task_coordination", "completion_slack"} <= {i["code"] for i in report["issues"]}


def test_checks_gate_saving_and_execution_before_providers_or_mutations(
    runtime, design, monkeypatch
):
    db, llm, research, engine = runtime
    invalid = design.model_copy(deep=True)
    invalid.conditions.append(
        invalid.conditions[0].model_copy(update={"key": "invalid"}, deep=True)
    )
    invalid.conditions[1].parameters.institution.oversight = 0.123
    with pytest.raises(ValueError, match="inactive"):
        research.save_design(invalid)
    assert research.studies() == []
    sid = research.save_design(design)
    rid = research.study(sid)["runs"][0]["id"]
    with db.session.begin() as session:
        revision = session.scalars(select(Revision)).one()
        revision.design = invalid.model_dump()  # simulate a pre-check historical protocol

    def no_provider(_):
        pytest.fail("Provider resolution must follow validity checks")

    monkeypatch.setattr(llm, "model", no_provider)

    async def start():
        with pytest.raises(ValueError, match="inactive"):
            engine.start_study(sid)
        assert not engine.executions

    asyncio.run(start())
    with db.session() as session:
        assert session.get_one(Run, rid).status == "ready"
        assert session.scalar(select(func.count()).select_from(ProviderCall)) == 0


def test_planner_provenance_survives_edits_and_missing_constructs_block(runtime, design):
    db, _, research, _ = runtime
    with db.session.begin() as session:
        plan = Analysis(
            purpose="design",
            question="Finite stock?",
            status="complete",
            cutoffs={},
            output={
                "supported": True,
                "planning": {
                    "brief": {
                        "requirements": [
                            Requirement(
                                source="Finite stock",
                                capability="finite_stock",
                                mapping="direct",
                                explanation="Persistent stock required.",
                            ).model_dump()
                        ]
                    }
                },
            },
        )
        session.add(plan)
        session.flush()
        key = plan.id
    report = research.preflight(design, key)
    assert report["status"] == "blocked"
    assert report["original_question"] == "Finite stock?"
    with pytest.raises(ValueError, match="finite_stock"):
        research.save_design(design, plan_id=key)


def test_cutoff_exposure_cannot_see_later_actions_or_invent_opportunities(runtime):
    db, llm, research, engine = runtime
    design = protocol("institution", 3, 2)
    sid = research.save_design(design)
    rid = research.study(sid)["runs"][0]["id"]

    async def run():
        engine.start(rid)
        await engine.executions[rid].task

    asyncio.run(run())
    assistant = Assistants(db, research, llm)
    first = assistant._evidence_index({rid: 1})["runs"][0]
    full = assistant._evidence_index({rid: 6})["runs"][0]
    assert sum(first["treatment_exposure"]["action_counts"].values()) == 1
    assert sum(full["treatment_exposure"]["action_counts"].values()) == 6
    assert full["treatment_exposure"]["warnings"]
    assert full["recorded_rule_version"] == "4.1.0"
    assert exposure("institution", [{"kind": "sanction"}, {"kind": "wait"}], [])["warnings"] == []


@pytest.mark.parametrize(
    "source",
    [
        '"private goals"',
        "'private goals'",
        "“private goals”",
        "‘private goals’",
        "`private goals`",
        "  private\n goals  ",
    ],
)
def test_question_quotes_accept_formatting_without_accepting_new_words(source):
    requirement = Requirement(
        source=source,
        capability="participant_profiles",
        mapping="direct",
        explanation="Private instructions.",
    )
    assert requirement.source == "private goals"


def test_capability_schema_cannot_invent_ids_or_accept_empty_constructs():
    from typing import get_args

    from agent_sim.validity import CAPABILITIES, COMMON
    from pydantic import ValidationError

    expected = (
        set(COMMON) | {key for values in CAPABILITIES.values() for key in values} | {"unavailable"}
    )
    assert set(get_args(Requirement.model_fields["capability"].annotation)) == expected
    with pytest.raises(ValidationError):
        Requirement.model_validate(
            {
                "source": "token institution",
                "capability": "institution",
                "mapping": "direct",
                "explanation": "World name is not a capability.",
            }
        )
    with pytest.raises(ValidationError, match="must contain words"):
        Requirement(
            source='" "',
            capability="participant_profiles",
            mapping="direct",
            explanation="Empty citation.",
        )
