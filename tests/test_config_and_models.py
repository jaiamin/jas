import asyncio
from pathlib import Path

import pytest
import yaml
from pydantic import ValidationError
from pydantic_ai.exceptions import UnexpectedModelBehavior
from pydantic_ai.models.test import TestModel

from agent_sandbox import policies
from agent_sandbox.config import Scenario, validate_scenario
from agent_sandbox.experiments import expand, run_experiment
from agent_sandbox.runner import Runner


def paid_scenario(scenario):
    scenario.agents[0].policy = "model"
    scenario.agents[0].model = "openai"
    scenario.limits.max_model_calls = 1
    scenario.limits.max_total_tokens = 60000
    return scenario


def test_unknown_parameters_and_providers_are_rejected(scenario):
    data = scenario.model_dump()
    data["parameters"]["typo"] = 1
    with pytest.raises(ValidationError):
        validate_scenario(data)
    data = scenario.model_dump()
    data["models"]["other"] = "google:some-model"
    with pytest.raises(ValidationError):
        Scenario.model_validate(data)


def test_duplicate_agents_and_missing_models_are_rejected(scenario):
    data = scenario.model_dump()
    data["agents"][1]["id"] = data["agents"][0]["id"]
    with pytest.raises(ValidationError):
        Scenario.model_validate(data)
    data = scenario.model_dump()
    data["agents"][0].update(policy="model", model="missing")
    with pytest.raises(ValidationError):
        Scenario.model_validate(data)


def test_paid_requires_opt_in_and_key(store, scenario, monkeypatch):
    paid_scenario(scenario)
    with pytest.raises(ValueError, match="--paid"):
        Runner.create(store, scenario)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    with pytest.raises(ValueError, match="OPENAI_API_KEY"):
        Runner.create(store, scenario, paid=True)
    assert store.runs() == []


def test_typed_model_call_and_persisted_budget_survive_resume(store, scenario, monkeypatch):
    paid_scenario(scenario)
    monkeypatch.setenv("OPENAI_API_KEY", "test-key-never-sent")
    model = TestModel(
        custom_output_args={
            "action": {"kind": "rest"},
            "memory": "Remember supplies",
            "rationale": "Recover stamina",
        }
    )
    monkeypatch.setattr(policies, "make_model", lambda name: model)
    runner = Runner.create(store, scenario, paid=True)
    asyncio.run(runner.play(6))
    record = store.run(runner.id)
    assert record["calls"] == 1
    assert record["input_tokens"] > 0
    assert runner.memory["mara"] == "Remember supplies"
    resumed = Runner(store, runner.id, paid=True)
    with pytest.raises(ValueError, match="budget exhausted"):
        asyncio.run(resumed.step())
    assert store.run(runner.id)["calls"] == 1
    assert store.frame(runner.id)["tick"] == 6


def test_invalid_model_output_does_not_retry_or_advance(store, scenario, monkeypatch):
    paid_scenario(scenario)
    monkeypatch.setenv("OPENAI_API_KEY", "test-key-never-sent")
    monkeypatch.setattr(
        policies,
        "make_model",
        lambda name: TestModel(
            custom_output_args={
                "action": {"kind": "teleport"},
                "memory": "",
                "rationale": "",
            }
        ),
    )
    runner = Runner.create(store, scenario, paid=True)
    with pytest.raises(UnexpectedModelBehavior):
        asyncio.run(runner.step())
    record = store.run(runner.id)
    assert record["calls"] == 1
    assert record["charged_tokens"] == 12600  # Unknown usage stays conservatively charged.
    assert store.frame(runner.id)["tick"] == 0


def test_token_budget_blocks_before_model_request(store, scenario, monkeypatch):
    paid_scenario(scenario)
    scenario.limits.max_total_tokens = 1
    monkeypatch.setenv("OPENAI_API_KEY", "test-key-never-sent")
    monkeypatch.setattr(policies, "make_model", lambda name: TestModel())
    runner = Runner.create(store, scenario, paid=True)
    with pytest.raises(ValueError, match="budget exhausted"):
        asyncio.run(runner.step())
    assert store.run(runner.id)["calls"] == 0


def test_input_cap_blocks_before_client_is_created(store, scenario, monkeypatch):
    paid_scenario(scenario)
    scenario.limits.max_input_tokens = 256
    monkeypatch.setenv("OPENAI_API_KEY", "test-key-never-sent")

    def forbidden(name):
        raise AssertionError("Input cap must be checked before creating the client")

    monkeypatch.setattr(policies, "make_model", forbidden)
    runner = Runner.create(store, scenario, paid=True)
    with pytest.raises(ValueError, match="input cap"):
        asyncio.run(runner.step())
    assert store.run(runner.id)["calls"] == 0


def test_late_invalid_experiment_condition_is_preflighted(store, tmp_path):
    path = tmp_path / "invalid.yaml"
    path.write_text(
        yaml.safe_dump(
            {
                "name": "Invalid matrix",
                "scenario": str(Path("scenarios/frontier.yaml").resolve()),
                "seeds": [7],
                "metrics": ["alive"],
                "conditions": [
                    {"name": "Valid first"},
                    {"name": "Invalid later", "parameters": {"storm_chance": 2}},
                ],
            }
        )
    )
    with pytest.raises(ValidationError):
        asyncio.run(run_experiment(path, store))
    assert store.runs() == []


def test_experiment_call_cap_applies_across_conditions(store, monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key-never-sent")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key-never-sent")
    monkeypatch.setattr(
        policies,
        "make_model",
        lambda name: TestModel(
            custom_output_args={
                "action": {"kind": "rest"},
                "memory": "",
                "rationale": "Recover stamina",
            }
        ),
    )
    result = asyncio.run(run_experiment("experiments/providers.yaml", store, paid=True))
    assert result["model_calls"] == 4
    assert sum(run["calls"] for run in store.runs()) == 4
    assert len(result["runs"]) == 3


def test_experiment_validation_and_execution(store):
    experiment, matrix = expand("experiments/resilience.yaml")
    assert len(matrix) == 6
    result = asyncio.run(run_experiment("experiments/resilience.yaml", store))
    assert len(result["runs"]) == 6
    assert result["model_calls"] == 0
    assert set(result["means"]) == {c.name for c in experiment.conditions}
    assert all(store.run(row["run"])["status"] == "complete" for row in result["runs"])


def test_paid_experiment_preflights_without_spending(store):
    with pytest.raises(ValueError, match="--paid"):
        asyncio.run(run_experiment("experiments/providers.yaml", store))
    assert store.runs() == []
