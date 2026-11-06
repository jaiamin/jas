import pytest

from agent_sandbox.config import load_scenario
from agent_sandbox.store import Store


@pytest.fixture
def store(tmp_path):
    journal = Store(tmp_path / "runs.sqlite3")
    yield journal
    journal.close()


@pytest.fixture
def scenario():
    return load_scenario("scenarios/frontier.yaml")


@pytest.fixture(autouse=True)
def model_calls_are_test_only(monkeypatch):
    """Exercise the typed model path without network access in automated tests."""
    from pydantic_ai import models
    from pydantic_ai.models.test import TestModel

    from agent_sandbox import policies

    monkeypatch.setattr(models, "ALLOW_MODEL_REQUESTS", False)
    monkeypatch.setenv("OPENAI_API_KEY", "test-key-never-sent")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key-never-sent")
    monkeypatch.setattr(
        policies,
        "make_model",
        lambda name: TestModel(
            custom_output_args={
                "action": {"kind": "work"},
                "memory": "Track supplies",
                "rationale": "Produce resources",
            }
        ),
    )
