import pytest
from agent_sim import cli
from fastapi.testclient import TestClient


@pytest.mark.parametrize(
    "arguments,host,port",
    [([], "127.0.0.1", 8080), (["--host", "0.0.0.0", "--port", "8099"], "0.0.0.0", 8099)],
)
def test_cli_loads_local_configuration_and_binds_only_as_requested(
    monkeypatch, tmp_path, arguments, host, port
):
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr("sys.argv", ["jas", "--no-browser", *arguments])
    database_url = f"sqlite:///{tmp_path}/cli.sqlite3"
    monkeypatch.setenv("JAS_DATABASE_URL", database_url)
    monkeypatch.setenv("JAS_BUDGET_USD", "1")
    monkeypatch.setenv("JAS_STATIC_DIR", "before-env")
    (tmp_path / ".env").write_text(
        f"JAS_DATABASE_URL={database_url}\nJAS_BUDGET_USD=8\nJAS_STATIC_DIR=assets-${{literal}}\n"
    )
    started = []

    def serve(server):
        config = server.config
        app = config.app
        started.append(
            {
                "host": config.host,
                "port": config.port,
                "timeout_graceful_shutdown": config.timeout_graceful_shutdown,
                "access_log": config.access_log,
            }
        )
        with TestClient(app, base_url="http://localhost") as client:
            settings = client.get("/api/settings").json()
            assert settings["budget_usd"] == 8
            assert settings["usage"]["requests"] == 0
            assert app.state.frontend == tmp_path / "assets-${literal}"

    monkeypatch.setattr(cli.uvicorn.Server, "run", serve)
    cli.main()
    assert started == [
        {
            "host": host,
            "port": port,
            "timeout_graceful_shutdown": 110,
            "access_log": False,
        }
    ]
    assert (tmp_path / "cli.sqlite3").is_file()


def test_browser_opens_only_after_this_server_starts(monkeypatch):
    from types import SimpleNamespace

    opened = []
    monkeypatch.setattr(cli.webbrowser, "open", opened.append)
    server = SimpleNamespace(started=False, should_exit=False)
    monkeypatch.setattr(cli.time, "sleep", lambda _: setattr(server, "started", True))
    cli.open_when_ready(server, "http://localhost:8080")
    assert opened == ["http://localhost:8080"]
    opened.clear()
    server.started, server.should_exit = False, True
    cli.open_when_ready(server, "http://localhost:8080")
    assert opened == []


def test_explicit_workspace_overrides_inherited_database(monkeypatch, tmp_path):
    monkeypatch.chdir(tmp_path)
    chosen = tmp_path / "chosen"
    inherited = tmp_path / "inherited.sqlite3"
    monkeypatch.setenv("JAS_DATABASE_URL", f"sqlite:///{inherited}")
    monkeypatch.setattr("sys.argv", ["jas", "--workspace", str(chosen), "--no-browser"])

    def serve(server):
        with TestClient(server.config.app, base_url="http://localhost") as client:
            assert client.get("/api/health").status_code == 200

    monkeypatch.setattr(cli.uvicorn.Server, "run", serve)
    cli.main()
    assert (chosen / "jas.sqlite3").is_file()
    assert not inherited.exists()
