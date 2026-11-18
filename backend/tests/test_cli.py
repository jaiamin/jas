import subprocess
import sys

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
    opened = []
    monkeypatch.setattr(cli.webbrowser, "open", opened.append)
    server = cli.uvicorn.Server(cli.uvicorn.Config("unused"))
    monkeypatch.setattr(cli.time, "sleep", lambda _: setattr(server, "started", True))
    cli.open_when_ready(server, "http://localhost:8080")
    assert opened == ["http://localhost:8080"]
    opened.clear()
    server.started, server.should_exit = False, True
    cli.open_when_ready(server, "http://localhost:8080")
    assert opened == []


def test_gallery_cli_starts_without_importing_workspace_services(tmp_path, monkeypatch):
    monkeypatch.delenv("JAS_GALLERY_S3_BUCKET", raising=False)
    subprocess.run(
        [
            sys.executable,
            "-c",
            """
import sys

from agent_sim import cli
from fastapi.testclient import TestClient

def inspect_app(app, **kwargs):
    client = TestClient(app, base_url="http://localhost")
    assert client.get("/api/health").json()["surface"] == "gallery"
    assert client.get("/api/settings").status_code == 404
    workspace_modules = {"api", "assistants", "commands", "execution", "llm", "research"}
    imported = {name for name in workspace_modules if f"agent_sim.{name}" in sys.modules}
    assert not imported, imported

cli.uvicorn.run = inspect_app
sys.argv = ["jas", "gallery", "--data", sys.argv[1]]
cli.main()
""",
            str(tmp_path / "gallery"),
        ],
        cwd=tmp_path,
        check=True,
    )


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


def test_headless_check_run_export_and_cross_workspace_replay(
    monkeypatch, tmp_path, design, capsys
):
    import json

    from agent_sim.domain import ScriptedHarness

    monkeypatch.chdir(tmp_path)
    design.conditions[0].harness = ScriptedHarness(policy="commons_half_v1")
    protocol = tmp_path / "protocol.json"
    protocol.write_text(design.model_dump_json())
    workspace = tmp_path / "first-machine"
    record = tmp_path / "record.json"
    monkeypatch.setattr("sys.argv", ["jas", "--workspace", str(workspace), "check", str(protocol)])
    cli.main()
    check = json.loads(capsys.readouterr().out)
    assert check["estimate"]["max_requests"] == 0
    monkeypatch.setattr(
        "sys.argv",
        [
            "jas",
            "--workspace",
            str(workspace),
            "run",
            str(protocol),
            "--max-usd",
            "0",
            "--output",
            str(record),
        ],
    )
    cli.main()
    output = [json.loads(line) for line in capsys.readouterr().out.splitlines()]
    assert output[-1]["usage"]["requests"] == 0
    assert record.is_file()
    monkeypatch.setattr(
        "sys.argv", ["jas", "--workspace", str(tmp_path / "second-machine"), "replay", str(record)]
    )
    cli.main()
    replay = json.loads(capsys.readouterr().out)
    assert replay["model_requests"] == 0
    assert all(row["verified"] for row in replay["verification"])
    assert not (tmp_path / "second-machine").exists()


def test_cli_requires_explicit_budget_and_lock_prevents_a_second_engine(
    monkeypatch, tmp_path, design
):
    from agent_sim.workspace_lock import workspace_lock

    protocol = tmp_path / "protocol.json"
    protocol.write_text(design.model_dump_json())
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr("sys.argv", ["jas", "run", str(protocol)])
    with pytest.raises(SystemExit) as missing:
        cli.main()
    assert missing.value.code == 2
    path = tmp_path / "workspace" / "jas.sqlite3"
    with workspace_lock(str(path)):
        with pytest.raises(ValueError, match="already open"):
            with workspace_lock(str(path)):
                pytest.fail("A second process cannot own the same workspace")
