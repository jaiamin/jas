import pytest
from agent_sim.config import setting


@pytest.mark.parametrize(
    "name",
    [
        "DATABASE_URL",
        "BUDGET_USD",
        "CONCURRENT_RUNS",
        "PLANNER_MODEL",
        "STATIC_DIR",
        "ALLOWED_HOSTS",
    ],
)
def test_jas_configuration_and_empty_values(monkeypatch, name):
    monkeypatch.delenv(f"JAS_{name}", raising=False)
    assert setting(name, "default") == "default"
    monkeypatch.setenv(f"JAS_{name}", "current")
    assert setting(name, "default") == "current"
    monkeypatch.setenv(f"JAS_{name}", "")
    assert setting(name, "default") == "default"
