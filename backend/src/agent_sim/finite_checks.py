"""Independent admission witnesses driven only by the already reviewed external table.

This is finite contract conformance, never certification of natural-language intent.
Candidate prose, examples and self-tests are not inputs to these checks.
"""

import copy

from .db import digest
from .domain import (
    Decision,
    Design,
    EnvironmentConfiguration,
    EnvironmentMechanics,
    FiniteAction,
    FiniteExtensionPackage,
    FiniteRules,
    MechanicsParameters,
    Parameters,
    Profile,
    SavedEnvironment,
    Treatment,
)
from .finite_profile import validate_package
from .simulation.environments import create_world


def qualify_world(package: FiniteExtensionPackage, runner) -> None:
    contract = validate_package(package).specification
    bindings = {role: f"actor_{i}" for i, role in enumerate(contract.roles)}
    parameters = Parameters(finite=FiniteRules(bindings=bindings))
    definition = EnvironmentMechanics(
        name="Independent finite admission check",
        environment="reviewed_finite",
        rule_version="1.0.0",
        extension=package,
        examples=[
            EnvironmentConfiguration(
                key="external",
                name="External contract",
                roles=list(bindings.values()),
                parameters=MechanicsParameters(finite=parameters.finite),
            )
        ],
    )
    design = Design(
        title="Independent finite admission check",
        question="Does the frozen finite contract hold?",
        environment="reviewed_finite",
        environment_source=SavedEnvironment(
            id="independent",
            revision=1,
            updated="frozen",
            definition=definition,
            sha256=digest(definition.model_dump()),
        ),
        profiles=[
            Profile(key=actor, name=actor, role="Prose grants no authority", goal="Inspect")
            for actor in bindings.values()
        ],
        conditions=[Treatment(key="check", name="Check", parameters=parameters)],
        seeds=[17],
        rounds=2,
    )

    def require(condition, detail):
        if not condition:
            raise ValueError(f"Independent finite World check failed: {detail}")

    def world(checkpoint=None, params=parameters):
        return create_world(design, params, 17, checkpoint, runner=runner)

    original = world().snapshot()
    width, roles, operations = (
        contract.max_credits + 1,
        len(contract.roles),
        len(contract.operations),
    )
    for encoded, output in enumerate(contract.table):
        state_credit, residue = divmod(encoded, roles * operations)
        phase, credits = divmod(state_credit, width)
        slot, op = divmod(residue, operations)
        escrow = contract.states[phase].escrow
        if credits + escrow > contract.total_resource:
            require(output == -1, "invalid resource encodings deny")
            continue
        checkpoint = copy.deepcopy(original)
        checkpoint.update(
            finite_state=phase,
            credits=credits,
            escrow=escrow,
            spent=contract.total_resource - credits - escrow,
            position=slot,
            done=credits == 0 or contract.states[phase].status != "running",
        )
        if checkpoint["done"]:
            status = contract.states[phase].status
            checkpoint["outcome"] = {
                "success": status == "success",
                "reason": (contract.states[phase].key if status != "running" else "exhausted"),
            }
        live, restored = world(checkpoint), world(checkpoint)
        actor = bindings[contract.roles[slot]]
        require(live.observe(actor) == restored.observe(actor), "restored actor projection")
        decision = Decision(
            action=FiniteAction(operation=contract.operations[op].key),
            rationale="Independent finite witness",
            memory="",
            forecast=None,
        )
        if output == -1:
            try:
                live.step(actor, decision)
            except ValueError:
                pass
            else:
                raise ValueError("Independent finite World check failed: denial accepted")
            require(live.snapshot() == checkpoint, "atomic permission/terminal rejection")
            continue
        events, measures = live.step(actor, decision)
        require(
            restored.step(actor, decision) == (events, measures), "exact event/measurement replay"
        )
        require(live.snapshot() == restored.snapshot(), "complete checkpoint replay")
        next_state, next_credit = divmod(output, width)
        next_escrow = contract.states[next_state].escrow
        require(
            (
                live.state["finite_state"],
                live.state["credits"],
                live.state["escrow"],
                live.state["spent"],
            )
            == (
                next_state,
                next_credit,
                next_escrow,
                contract.total_resource - next_credit - next_escrow,
            ),
            "external consequence and conservation",
        )
        require(world(live.snapshot()).snapshot() == live.snapshot(), "post-transition restoration")
        require(world(checkpoint).snapshot() == checkpoint, "copied source isolation")
    for memory in ("none", "notes", "history", "episodic"):
        for actor in bindings.values():
            first = parameters.model_copy(deep=True, update={"memory": memory})
            second = parameters.model_copy(deep=True, update={"memory": memory})
            if first.finite is None or second.finite is None:
                raise ValueError("Independent finite World check requires finite rules")
            first.finite.private = {
                other: {"docket": "independent-37"} for other in bindings.values() if other != actor
            }
            second.finite.private = {
                other: {"docket": "independent-91"} for other in bindings.values() if other != actor
            }
            a, b = world(params=first), world(params=second)
            require(a.observe(actor) == b.observe(actor), "other-actor private projection")
            require(
                a.decision_schema(a.observe(actor)).model_json_schema()
                == b.decision_schema(b.observe(actor)).model_json_schema(),
                "schema privacy",
            )
            require(
                world(a.snapshot(), first).observe(actor) == a.observe(actor),
                "restored private projection",
            )
    require(world().snapshot() == original, "admission does not mutate the source")
