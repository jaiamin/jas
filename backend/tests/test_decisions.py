import pytest
from agent_sim.decisions import ActionOption, decision_schema
from pydantic import ValidationError


def test_disabled_communication_schema_prevents_illegal_choices(design):
    output = decision_schema("commons", False, (ActionOption("contribute", 0, 5, ("", "alex")),))
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
            "coordination",
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
    output = decision_schema("commons", True, (ActionOption("contribute", 0, 3, ("", "alex")),))
    payload["action"].update(kind="contribute", target="", promise=4)
    with pytest.raises(ValidationError):
        output.model_validate(payload)
