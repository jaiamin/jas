"""Provider-independent World and protocol-boundary oracles for the declared scope."""

import copy

import pytest
from agent_sim.api import create_app
from agent_sim.domain import Decision, Design, ReadArtifact
from agent_sim.simulation.environments import create_world
from fastapi.testclient import TestClient
from test_adjudication_boundaries import decision, write_action
from test_fallible_adjudication import ADJUDICATOR, INPUTS, RULING, protocol


def test_world_requires_the_recorded_ruling_and_rejects_denied_or_wrong_inputs_atomically():
    design = Design.model_validate(protocol())
    world = create_world(design, design.conditions[0].parameters, 18131)
    world.step("author", Decision.model_validate(decision(write_action())))
    submission = Decision.model_validate(decision({"kind": "submit_artifacts"}))
    before = world.snapshot()
    assert world.adjudication_inputs("author", submission) == INPUTS
    with pytest.raises(ValueError, match="Declared adjudication is required"):
        world.step("author", submission)
    assert world.snapshot() == before
    errors = []
    for artifact in ("sealed", "missing"):
        with pytest.raises(ValueError) as denied:
            world.read("author", ReadArtifact(kind="read_artifact", artifact=artifact, version=1))
        errors.append(str(denied.value))
        assert world.snapshot() == before
    assert errors == ["Artifact operation is unavailable"] * 2
    receipt = {
        "mechanism": "pickup_note_actionability",
        "version": "1.0.0",
        "adjudicator": ADJUDICATOR,
        "inputs": copy.deepcopy(INPUTS),
        "ruling": RULING,
        "request_id": "0123456789abcdef",
    }
    receipt["inputs"]["artifact_version"] = 1
    with pytest.raises(ValueError, match="inputs do not match"):
        world.settle_adjudication("author", submission, receipt)
    assert world.snapshot() == before
    with pytest.raises(ValueError, match="current actor"):
        world.adjudication_inputs("stranger", submission)
    assert world.snapshot() == before


@pytest.mark.parametrize(
    "change",
    ["absent-model", "participant-as-judge", "mechanism-version", "config-version", "source-pin"],
)
def test_undeclared_or_incompatible_adjudication_is_rejected_before_execution(tmp_path, change):
    value = protocol()
    condition = value["conditions"][0]
    scope = condition["parameters"]["artifacts"]["judgment"]
    if change == "absent-model":
        del condition["adjudicator"]
    elif change == "participant-as-judge":
        condition["adjudicator"]["model"] = "openai:gpt-6-luna"
    elif change == "mechanism-version":
        scope["version"] = "2.0.0"
    elif change == "config-version":
        condition["adjudicator"]["version"] = "2.0.0"
    else:
        scope["evidence"][0]["version"] = 2
    app = create_app(f"sqlite:///{tmp_path}/invalid.sqlite3", static_dir=tmp_path / "static")
    with TestClient(app, base_url="http://localhost") as client:
        for endpoint in ("/api/design/validate", "/api/design/preflight", "/api/studies"):
            result = client.post(endpoint, json={"design": value})
            assert result.status_code == 422, result.text
        assert client.get("/api/settings").json()["usage"]["requests"] == 0
        assert client.get("/api/studies").json() == []


def test_world_scope_cannot_read_evidence_by_role_or_prose():
    value = protocol()
    value["profiles"][0]["role"] = "All-access catalog administrator"
    parameters = value["conditions"][0]["parameters"]["artifacts"]
    parameters["objects"][0]["readers"] = []
    design = Design.model_validate(value)
    world = create_world(design, design.conditions[0].parameters, 18131)
    before = world.snapshot()
    submit = Decision.model_validate(decision({"kind": "submit_artifacts"}))
    with pytest.raises(ValueError, match="Artifact operation is unavailable"):
        world.adjudication_inputs("author", submit)
    assert world.snapshot() == before
    assert all(item["key"] != "pickup" for item in world.observe("author")["artifacts"])


def test_review_distinguishes_judge_configuration_from_participant_assignment(tmp_path):
    value = protocol()
    alternative = copy.deepcopy(value["conditions"][0])
    alternative.update(key="high_effort", name="Higher judge effort")
    alternative["adjudicator"]["openai_reasoning_effort"] = "high"
    value["conditions"].append(alternative)
    app = create_app(f"sqlite:///{tmp_path}/review.sqlite3", static_dir=tmp_path / "static")
    with TestClient(app, base_url="http://localhost") as client:
        result = client.post("/api/design/preflight", json={"design": value})
        assert result.status_code == 200, result.text
        report = result.json()
        assert report["condition_grid"]["duplicate_conditions"] == []
        assert report["condition_grid"]["factors"] == [
            {"fields": ["adjudicator.openai_reasoning_effort"], "levels": 2}
        ]
        assert report["comparisons"][0]["agent_assignment_changed"] is False
        assert report["comparisons"][0]["changed_adjudicator"] == ["openai_reasoning_effort"]
        assert len(report["adjudications"]) == 2
        assert client.get("/api/settings").json()["usage"]["requests"] == 0
