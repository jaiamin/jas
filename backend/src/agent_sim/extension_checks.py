"""Independent finite World witnesses, run before publishing an admission.

These literal expectations follow the frozen DEVELOPMENT specification, not a
candidate's examples, explanation, tests or output. They qualify this finite
profile only. No model or application persistence is involved.
"""

import json

from .db import digest
from .domain import (
    Decision,
    Design,
    EnvironmentConfiguration,
    EnvironmentMechanics,
    ExtensionPackage,
    MechanicsParameters,
    Parameters,
    Profile,
    RelayAction,
    RelayRules,
    SavedEnvironment,
    Treatment,
)
from .simulation.environments import create_world
from .simulation.extension import Transition


def qualify_world(package: ExtensionPackage, runner: Transition) -> None:
    def require(condition: bool, detail: str) -> None:
        if not condition:
            raise ValueError(f"Independent World qualification failed: {detail}")

    parameters = Parameters(relay=RelayRules(submitter="iris", reviewer="amber"))
    definition = EnvironmentMechanics(
        name="Independent sealed relay qualification",
        environment="sealed_relay",
        rule_version="1.0.0",
        extension=package,
        examples=[
            EnvironmentConfiguration(
                key="independent",
                name="Independent",
                roles=["iris", "amber"],
                parameters=MechanicsParameters.model_validate(
                    parameters.model_dump(exclude={"memory"})
                ),
            )
        ],
    )
    design = Design(
        title="Independent finite mechanics qualification",
        question="Do the frozen rules hold?",
        environment="sealed_relay",
        environment_source=SavedEnvironment(
            id="independent",
            revision=1,
            updated="frozen",
            sha256=digest(definition.model_dump()),
            definition=definition,
        ),
        profiles=[
            Profile(key="iris", name="Iris", role="Reviewer", goal="No prose authority"),
            Profile(key="amber", name="Amber", role="Submitter", goal="No prose authority"),
        ],
        conditions=[Treatment(key="check", name="Check", parameters=parameters)],
        seeds=[17],
        rounds=2,
    )

    def world(state=None, params=parameters):
        return create_world(design, params, 17, state, runner=runner)

    def decision(operation):
        return Decision(
            action=RelayAction.model_validate({"operation": operation}),
            rationale="Executable facts only",
            memory="",
            forecast=None,
        )

    initial = world()
    require(initial.actor() == "iris", "explicit actor order")
    before = initial.snapshot()
    public = initial.observe("iris")
    private = initial.observe("amber")
    require("counterseal-17" not in json.dumps(public), "observation privacy")
    require(private["relay"]["docket"] == "counterseal-17", "reviewer delivery")
    altered = parameters.model_copy(deep=True)
    altered.relay = RelayRules(submitter="iris", reviewer="amber", docket="counterseal-91")
    hidden_variant = world(params=altered)
    require(hidden_variant.observe("iris") == public, "hidden-change projection invariance")
    require(
        initial.decision_schema(public).model_json_schema()
        == hidden_variant.decision_schema(hidden_variant.observe("iris")).model_json_schema(),
        "schema privacy",
    )
    require(
        "counterseal" not in json.dumps(initial.decision_schema(public).model_json_schema()),
        "schema content privacy",
    )
    for actor, operation in [("amber", "lodge"), ("iris", "release")]:
        try:
            initial.step(actor, decision(operation))
        except ValueError:
            pass
        else:
            raise ValueError("Independent World qualification failed: actor/operation guard")
        require(initial.snapshot() == before, "atomic rejection including note/history/resources")
    trace = []
    for operation, literal in [("lodge", (1, 2, "amber")), ("release", (2, 0, None))]:
        actor = initial.actor()
        require(actor is not None, "nonterminal actor")
        saved = initial.snapshot()
        restored = world(saved)
        require(restored.observe(actor) == initial.observe(actor), "complete restored observation")
        proposal = decision(operation)
        actual = initial.step(actor, proposal)
        require(restored.step(actor, proposal) == actual, "exact event/measurement replay")
        require(restored.snapshot() == initial.snapshot(), "complete checkpoint replay")
        require(
            (initial.state["phase"], initial.state["credits"], initial.actor()) == literal,
            "independent consequence/resource oracle",
        )
        trace.extend(measure.model_dump() for measure in actual[1])
        require(world(saved).snapshot() == saved, "source checkpoint isolation")
    require(
        trace == [{"key": "relay_success", "value": 1.0, "denominator": 1.0, "agent": None}],
        "one successful terminal measurement",
    )
    require(initial.state["outcome"] == {"success": True, "reason": "released"}, "terminal fact")
    require(world(before).snapshot() == before, "initial restoration")
    for operations, phase, reason in [
        (["wait", "wait", "lodge"], 1, "exhausted"),
        (["stop"], 3, "stopped"),
    ]:
        probe = world()
        for operation in operations:
            probe.step(probe.actor(), decision(operation))
        require(
            probe.actor() is None
            and probe.state["phase"] == phase
            and probe.state["outcome"] == {"success": False, "reason": reason},
            "independent unsuccessful stop/resource oracle",
        )
        require(world(probe.snapshot()).snapshot() == probe.snapshot(), "terminal restoration")

    short = design.model_copy(update={"rounds": 1})
    horizon = create_world(short, parameters, 17, runner=runner)
    for _ in range(2):
        actor = horizon.actor()
        if actor is None:
            raise ValueError("Independent World qualification failed: horizon actor")
        horizon.step(actor, decision("wait"))
    require(
        (horizon.state["phase"], horizon.state["credits"], horizon.actor()) == (0, 1, None)
        and horizon.state["outcome"] == {"success": False, "reason": "horizon"},
        "independent horizon termination",
    )
    for memory in ("none", "notes", "history", "episodic"):
        scoped = parameters.model_copy(update={"memory": memory})
        probe = world(params=scoped)
        probe.step("iris", decision("lodge"))
        restored = world(probe.snapshot(), params=scoped)
        require(restored.observe("iris") == probe.observe("iris"), "restored private memory")
        require("counterseal" not in json.dumps(restored.observe("iris")), "history/memory privacy")
