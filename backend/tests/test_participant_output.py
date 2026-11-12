"""Provider contracts reject the contradictory payloads observed in live Luna01."""

import json
from typing import Literal

import pytest
from agent_sim.domain import Decision, PerformWork, ReadArtifact, WriteArtifact
from agent_sim.participant_output import (
    decision_output,
    decode_decision,
    decode_operation,
    operation_output,
)
from pydantic import ValidationError, create_model


def choice(action):
    return {"action": action, "rationale": "Grounded choice", "memory": "", "forecast": None}


def test_operation_contract_requires_exactly_its_payload():
    output = operation_output(Decision, ("observe", "read_artifact", "verify", "decide"))
    read = {"kind": "read_artifact", "artifact": "policy", "version": 1}
    for request in [
        {"operation": "decide", "decision": choice(read), "read": read},
        {"operation": "verify", "verification": None, "read": read},
        {"operation": "decide", "decision": {"action": read}, "rationale": "Misplaced"},
    ]:
        with pytest.raises(ValidationError):
            output.model_validate({"request": request})
    value = output.model_validate({"request": {"operation": "decide", "decision": choice(read)}})
    assert decode_operation(value)["decision"] == choice(read)
    assert decode_operation(value)["read"] is None
    final = operation_output(Decision, ("decide",))
    with pytest.raises(ValidationError):
        final.model_validate({"request": {"operation": "observe"}})


@pytest.mark.parametrize("kind", ["write_artifact", "perform_work"])
def test_content_entries_preserve_keys_integers_and_strings(kind):
    action = {
        "kind": kind,
        "content": [{"key": "finding", "value": "Unknown"}, {"key": "count", "value": 3}],
        "sources": [],
    }
    action.update(
        {"artifact": "report", "expected_version": 1}
        if kind == "write_artifact"
        else {"work": "report", "expected_version": 1}
    )
    output = decision_output(Decision)
    result = decode_decision(output.model_validate(choice(action)))
    assert isinstance(result.action, WriteArtifact | PerformWork)
    assert result.action.content == {"finding": "Unknown", "count": 3}
    action["content"].append({"key": "finding", "value": "Overwrite"})
    with pytest.raises(ValueError, match="unique"):
        decode_decision(output.model_validate(choice(action)))


def test_provider_objects_are_closed_and_no_dynamic_maps_remain():
    schema = operation_output(Decision, ("verify", "decide")).model_json_schema()

    def check(value):
        if isinstance(value, dict):
            if value.get("type") == "object":
                assert value.get("additionalProperties") is False
            for child in value.values():
                check(child)
        elif isinstance(value, list):
            for child in value:
                check(child)

    check(schema)
    assert len(json.dumps(schema)) < 25000


def test_read_operation_uses_the_worlds_authorized_targets():
    read = create_model("ScopedRead", __base__=ReadArtifact, artifact=(Literal["policy"], ...))
    decision = create_model("ScopedDecision", __base__=Decision, action=(read, ...))
    output = operation_output(decision, ("read_artifact", "decide"))
    request = {
        "operation": "read_artifact",
        "read": {"kind": "read_artifact", "artifact": "incidents", "version": None},
    }
    with pytest.raises(ValidationError):
        output.model_validate({"request": request})
    request["read"]["artifact"] = "policy"
    assert (
        decode_operation(output.model_validate({"request": request}))["read"]["artifact"]
        == "policy"
    )
