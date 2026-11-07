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
    monkeypatch.setattr("sys.argv", ["jas", *arguments])
    database_url = f"sqlite:///{tmp_path}/cli.sqlite3"
    monkeypatch.setenv("JAS_DATABASE_URL", database_url)
    monkeypatch.setenv("JAS_BUDGET_USD", "1")
    monkeypatch.setenv("JAS_STATIC_DIR", "before-env")
    (tmp_path / ".env").write_text(
        f"JAS_DATABASE_URL={database_url}\nJAS_BUDGET_USD=8\nJAS_STATIC_DIR=assets-${{literal}}\n"
    )
    started = []

    def serve(app, **options):
        started.append(options)
        with TestClient(app) as client:
            settings = client.get("/api/settings").json()
            assert settings["budget_usd"] == 8
            assert settings["usage"]["requests"] == 0
            assert app.state.frontend == tmp_path / "assets-${literal}"

    monkeypatch.setattr(cli.uvicorn, "run", serve)
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
