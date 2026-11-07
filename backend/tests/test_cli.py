import pytest
from agent_sim import api, cli


@pytest.mark.parametrize(
    "arguments,host,port",
    [([], "127.0.0.1", 8080), (["--host", "0.0.0.0", "--port", "8099"], "0.0.0.0", 8099)],
)
def test_cli_binds_locally_unless_explicitly_configured(
    monkeypatch, tmp_path, arguments, host, port
):
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr("sys.argv", ["ass", *arguments])
    loaded, started = [], []
    application = object()
    monkeypatch.setattr(api, "create_app", lambda: application)
    monkeypatch.setattr(cli, "load_dotenv", lambda path, **options: loaded.append((path, options)))
    monkeypatch.setattr(cli.uvicorn, "run", lambda app, **options: started.append((app, options)))
    cli.main()
    assert loaded == [(tmp_path / ".env", {"override": True, "interpolate": False})]
    assert started[0][0] is application
    assert started[0][1]["host"] == host
    assert started[0][1]["port"] == port
