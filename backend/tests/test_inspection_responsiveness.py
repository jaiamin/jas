"""Public inspection must leave the service responsive to independent requests."""

import threading
from concurrent.futures import ThreadPoolExecutor

from agent_sim.api import create_app
from fastapi.testclient import TestClient


def test_run_inspection_does_not_hold_the_request_loop(tmp_path, monkeypatch):
    app = create_app(f"sqlite:///{tmp_path}/inspection.sqlite3", static_dir=tmp_path / "static")
    with TestClient(app, base_url="http://localhost") as client:
        design = next(
            item["design"]
            for item in client.get("/api/catalog").json()["templates"]
            if item["id"] == "commons"
        )
        design.update(rounds=1, seeds=[7], repetitions=1)
        design["conditions"] = design["conditions"][:1]
        saved = client.post("/api/studies", json={"design": design})
        assert saved.status_code == 201, saved.text
        study = client.get(f"/api/studies/{saved.json()['id']}").json()
        run_id = study["runs"][0]["id"]
        expected = client.get(f"/api/runs/{run_id}").json()
        entered, release = threading.Event(), threading.Event()
        read_run = app.state.research.run

        def held_read(key):
            entered.set()
            assert release.wait(5), "Run inspection was never released"
            return read_run(key)

        monkeypatch.setattr(app.state.research, "run", held_read)
        with ThreadPoolExecutor(max_workers=2) as pool:
            inspection = pool.submit(client.get, f"/api/runs/{run_id}")
            try:
                assert entered.wait(2), "The run request did not enter its real read"
                health = pool.submit(client.get, "/api/health")
                response = health.result(timeout=2)
                assert response.status_code == 200
                assert response.json() == {"status": "ok", "version": "0.2.0"}
                assert not inspection.done(), "The held inspection must still be pending"
            finally:
                release.set()
            response = inspection.result(timeout=5)
        assert response.status_code == 200
        assert response.json() == expected
        assert client.get("/api/settings").json()["usage"]["requests"] == 0


def test_run_inspection_keeps_one_snapshot_while_a_turn_commits(tmp_path, monkeypatch):
    app = create_app(f"sqlite:///{tmp_path}/snapshot.sqlite3", static_dir=tmp_path / "static")
    with TestClient(app, base_url="http://localhost") as client:
        design = next(
            item["design"]
            for item in client.get("/api/catalog").json()["templates"]
            if item["id"] == "commons"
        )
        design.update(rounds=1, seeds=[7], repetitions=1)
        design["conditions"] = design["conditions"][:1]
        design["conditions"][0]["harness"] = {"kind": "scripted", "policy": "commons_half_v1"}
        saved = client.post("/api/studies", json={"design": design})
        assert saved.status_code == 201, saved.text
        run_id = client.get(f"/api/studies/{saved.json()['id']}").json()["runs"][0]["id"]
        expected = client.get(f"/api/runs/{run_id}").json()
        entered, release = threading.Event(), threading.Event()
        configuration = app.state.research.configuration

        def held_configuration(key):
            value = configuration(key)
            if not entered.is_set():
                entered.set()
                assert release.wait(5), "Inspection snapshot was never released"
            return value

        monkeypatch.setattr(app.state.research, "configuration", held_configuration)
        with ThreadPoolExecutor(max_workers=1) as pool:
            inspection = pool.submit(client.get, f"/api/runs/{run_id}")
            try:
                assert entered.wait(2)
                stepped = client.post(f"/api/runs/{run_id}/control", json={"action": "step"})
                assert stepped.status_code == 200, stepped.text

                async def finished():
                    await app.state.engine.executions[run_id].task

                assert client.portal is not None
                client.portal.call(finished)
                assert client.get(f"/api/runs/{run_id}").json()["summary"]["turn"] == 1
                assert not inspection.done()
            finally:
                release.set()
            response = inspection.result(timeout=5)
        assert response.status_code == 200
        assert response.json() == expected
        assert client.get(f"/api/runs/{run_id}").json()["summary"]["turn"] == 1
        assert client.get("/api/settings").json()["usage"]["requests"] == 0
