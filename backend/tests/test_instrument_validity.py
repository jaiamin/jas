"""Regressions discovered by the replacement instrument-quality benchmark."""

import copy
import json

import pytest
from agent_sim.domain import Decision, Design
from agent_sim.simulation.environments import create_world
from agent_sim.templates import templates

from benchmarks.cases import cases, families
from benchmarks.oracles import score_trace, scripted
from benchmarks.quality import assess
from benchmarks.validity import adversarial, trajectory


def test_family_split_and_frozen_dataset_contract():
    data = cases()
    assert len(data) == len({c.id for c in data}) == len({c.prompt for c in data}) == 336
    dev = {c.family.key for c in cases("development")}
    heldout = {c.family.key for c in cases("heldout")}
    assert not dev & heldout and len(dev) == 18 and len(heldout) == 10
    assert len(families()) == 28
    assert len({c.family.environment for c in data if c.family.environment}) == 7
    for case in data:
        if case.family.environment:
            case.design()


@pytest.mark.parametrize("family", [f for f in families() if f.environment], ids=lambda f: f.key)
def test_independent_oracle_and_adversarial_gate(family):
    case = next(c for c in cases() if c.family.key == family.key)
    for condition in case.design().conditions:
        assert all(adversarial(case, condition).values())
        initial, rows = trajectory(case, condition, True)
        assert score_trace(rows, initial)["finite"]


@pytest.mark.parametrize("template", templates(), ids=lambda t: t["id"])
def test_observation_deep_isolation_and_terminal_guard(template):
    design = Design.model_validate(template["design"])
    params = design.conditions[0].parameters.model_copy(deep=True)
    params.private_signal = False
    world = create_world(design, params, 17)
    actor = world.actor()
    assert actor is not None
    world.state["history"] = [{"nested": {"value": "public"}}]
    world.state["experiences"][actor] = [{"text": "private-experience"}]
    before, parameters = world.snapshot(), params.model_dump()
    obs = world.observe(actor)
    obs["public_history"][0]["nested"]["value"] = "corrupt"
    obs["your_experiences"][0]["text"] = "corrupt"
    obs["communication_channels"].clear()
    obs["public_signals"].clear()
    assert world.snapshot() == before and params.model_dump() == parameters
    world.state["done"] = True
    before = world.snapshot()
    with pytest.raises(ValueError):
        world.step(
            actor,
            Decision(
                action=dict(
                    kind="wait", amount=0, target="", message="", report=None, promise=None
                ),
                rationale="",
                memory="",
                forecast=None,
            ),
        )
    assert world.snapshot() == before


def test_experiment_identification_rejects_confounds_and_inert_channels():
    case = next(c for c in cases() if c.family.key == "sealed-cheap-talk")
    result: dict = dict(supported=True, explanation="Diagnostic", design=case.design().model_dump())
    assert all(assess(case, result).values())
    result["design"]["conditions"][1]["parameters"]["memory"] = "none"
    assert not assess(case, result)["isolation"]
    result["design"]["conditions"] = []
    assert not all(assess(case, result).values())


def test_missing_opportunities_are_not_perfect_behavior():
    case = next(c for c in cases() if c.family.environment == "commons")
    initial = create_world(case.design(), case.design().conditions[0].parameters, 17).snapshot()
    score = score_trace([], initial)
    assert score["false_report_rate"] is None and score["fulfillment_rate"] is None


def test_false_reports_commitments_and_shocks_have_independent_denominators():
    case = next(c for c in cases() if c.family.key == "unannounced-shortage")
    design = case.design()
    world = create_world(design, design.conditions[1].parameters, case.seed)
    rows = []
    while (actor := world.actor()) is not None:
        obs = world.observe(actor)
        obs["you"] = next(p.model_dump() for p in design.profiles if p.key == actor)
        decision = scripted(dict(obs), True)
        decision.action.report = 1 if obs["your_private_signal"] == 0 else 0
        decision.action.promise = 8 if obs["round"] == 2 else None
        events, measures = world.step(actor, decision)
        rows.append(
            dict(
                decision=decision.model_dump(),
                events=[e.model_dump() for e in events],
                checkpoint=world.snapshot(),
                measures=[m.model_dump() for m in measures],
            )
        )
    score = score_trace(rows, {})
    assert score["false_report_rate"] == 1
    assert score["infeasible_commitments"] == case.agents
    assert score["eligible_commitments"] == 0 and score["fulfillment_rate"] is None


def test_score_does_not_read_rationale():
    case = next(c for c in cases() if c.family.environment == "commons")
    initial, rows = trajectory(case, case.design().conditions[0], True)
    score = score_trace(rows, initial)
    altered = copy.deepcopy(rows)
    for row in altered:
        row["decision"]["rationale"] = "I am dramatic and perfectly honest!"
    assert score_trace(altered, initial) == score
    assert json.loads(json.dumps(initial)) == initial


def test_analysis_numbers_are_checked_against_facts_and_reject_fabricated_counts():
    from benchmarks.analysis import assess_analysis

    initial = {"balances": {"a": 12.0, "b": 18.0}}
    numbers = dict(
        reports=0,
        false_reports=0,
        eligible_commitments=0,
        infeasible_commitments=0,
        fulfilled_commitments=0,
        utility=30,
    )
    output = dict(
        answer="```json\n" + json.dumps(numbers) + "\n```",
        citations=[],
        caveats=["No reporting opportunity."],
    )
    assert all(assess_analysis(output, [], initial).values())
    numbers["reports"] = 8
    output["answer"] = "```json\n" + json.dumps(numbers) + "\n```"
    assert not assess_analysis(output, [], initial)["reports"]
    output["answer"] = "A dramatic story with perfect honesty."
    assert not assess_analysis(output, [], initial)["numeric_summary"]
