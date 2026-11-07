import pytest
from agent_sim.decisions import ActionOption, DecisionRules, decision_schema
from pydantic import ValidationError


def test_disabled_communication_schema_prevents_illegal_choices(design):
    output = decision_schema(
        DecisionRules(allow_forecast=True, promise_limit="action"),
        False,
        (ActionOption("contribute", 0, 5, ("", "alex")),),
    )
    payload = {
        "action": {
            "kind": "contribute",
            "amount": 2,
            "target": "",
            "message": "",
            "report": None,
            "promise": None,
        },
        "memory": "",
        "rationale": "",
        "forecast": None,
    }
    output.model_validate(payload)
    for changes in [{"message": "hello"}, {"report": 1}, {"promise": 1}, {"amount": 6}]:
        invalid = {**payload, "action": {**payload["action"], **changes}}
        with pytest.raises(ValidationError):
            output.model_validate(invalid)


def test_structured_actions_encode_cross_field_constraints():
    for kind, target, valid in [
        ("work", "task-a", True),
        ("wait", "", True),
        ("work", "", False),
        ("wait", "task-a", False),
    ]:
        output = decision_schema(
            DecisionRules(allow_forecast=True),
            True,
            (ActionOption("work", 0, 0, ("task-a",)), ActionOption("wait", 0, 0, ("",))),
        )
        payload = {
            "action": {
                "kind": kind,
                "target": target,
                "amount": 0,
                "message": "",
                "report": None,
                "promise": None,
            },
            "rationale": "",
            "memory": "",
            "forecast": None,
        }
        if valid:
            output.model_validate(payload)
        else:
            with pytest.raises(ValidationError):
                output.model_validate(payload)
    output = decision_schema(
        DecisionRules(allow_forecast=True, promise_limit="action"),
        True,
        (ActionOption("contribute", 0, 3, ("", "alex")),),
    )
    payload["action"].update(kind="contribute", target="", promise=4)
    with pytest.raises(ValidationError):
        output.model_validate(payload)


def test_trust_receiver_schema_rejects_unused_forecasts(design):
    from agent_sim.environments import TrustExchange

    design.profiles = design.profiles[:2]
    world = TrustExchange(design, design.conditions[0].parameters, 7)
    sender = world.actor()
    assert sender is not None
    sending = world.decision_schema(world.observe(sender))
    payload = {
        "action": {
            "kind": "send",
            "amount": 2,
            "target": "",
            "message": "",
            "report": None,
            "promise": None,
        },
        "rationale": "",
        "memory": "",
        "forecast": 0.5,
    }
    world.step(sender, sending.model_validate(payload))
    receiver = world.actor()
    assert receiver is not None
    receiving = world.decision_schema(world.observe(receiver))
    payload["action"]["kind"] = "return"
    with pytest.raises(ValidationError):
        receiving.model_validate(payload)
    payload["forecast"] = None
    receiving.model_validate(payload)
