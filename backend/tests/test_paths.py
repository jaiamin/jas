from pathlib import Path

from agent_sim.paths import workspace_directory


def test_existing_workspace_is_opened_without_copying_or_resetting(tmp_path, monkeypatch):
    monkeypatch.delenv("JAS_WORKSPACE", raising=False)
    monkeypatch.chdir(tmp_path)
    existing = tmp_path / "data" / "jas.sqlite3"
    existing.parent.mkdir()
    existing.write_bytes(b"existing user data")
    assert workspace_directory() == existing.parent
    assert existing.read_bytes() == b"existing user data"


def test_installed_launch_uses_stable_app_data_but_explicit_workspace_wins(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    monkeypatch.delenv("JAS_WORKSPACE", raising=False)
    monkeypatch.setattr("agent_sim.paths.sys.platform", "linux")
    monkeypatch.setenv("XDG_DATA_HOME", str(tmp_path / "app-data"))
    expected = tmp_path / "app-data" / "jas"
    assert workspace_directory() == expected
    nested = tmp_path / "elsewhere"
    nested.mkdir()
    monkeypatch.chdir(nested)
    assert workspace_directory() == expected
    monkeypatch.setenv("JAS_WORKSPACE", str(tmp_path / "chosen"))
    assert workspace_directory() == tmp_path / "chosen"
    assert not Path(expected).exists(), "Resolving a path must not create or mutate a workspace"
