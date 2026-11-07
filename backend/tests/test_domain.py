import pytest
from agent_sim.domain import Design
from pydantic import ValidationError


def test_custom_graph_rejects_cycles_and_missing_dependencies(design):
    payload = design.model_dump()
    payload["environment"] = "coordination"
    payload["tasks"] = [
        dict(key="a", name="A", effort=1, dependencies=["b"]),
        dict(key="b", name="B", effort=1, dependencies=["a"]),
    ]
    with pytest.raises(ValidationError, match="acyclic"):
        Design.model_validate(payload)
    payload["tasks"][1]["dependencies"] = ["missing"]
    with pytest.raises(ValidationError, match="dependencies"):
        Design.model_validate(payload)
