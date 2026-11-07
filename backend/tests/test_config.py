import pytest
from agent_sim.config import default_database_url, setting


@pytest.mark.parametrize(
    "name", ["DATABASE_URL", "BUDGET_USD", "CONCURRENT_RUNS", "PLANNER_MODEL", "STATIC_DIR"]
)
def test_jas_configuration_takes_precedence_with_legacy_fallback(monkeypatch, name):
    monkeypatch.delenv(f"JAS_{name}", raising=False)
    monkeypatch.delenv(f"ASS_{name}", raising=False)
    assert setting(name, "default") == "default"
    monkeypatch.setenv(f"ASS_{name}", "legacy")
    assert setting(name, "default") == "legacy"
    monkeypatch.setenv(f"JAS_{name}", "current")
    assert setting(name, "default") == "current"
    monkeypatch.setenv(f"JAS_{name}", "")
    assert setting(name, "default") == "legacy"


def test_default_database_preserves_existing_data_without_moving_it(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    assert default_database_url() == "sqlite:///data/jas.sqlite3"
    legacy = tmp_path / "data" / "ass.sqlite3"
    legacy.parent.mkdir()
    legacy.write_bytes(b"existing database")
    assert default_database_url() == "sqlite:///data/ass.sqlite3"
    assert legacy.read_bytes() == b"existing database"
