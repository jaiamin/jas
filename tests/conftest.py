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
