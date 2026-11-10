"""CC03: explicitly frozen combined T12/T18 contract, no model calls."""

from agent_sim.api import create_app
from fastapi.testclient import TestClient
from pydantic_ai import models
from test_fallible_adjudication import protocol


def test_combined_adjudication_export_is_version14_without_spending(tmp_path, monkeypatch):
    monkeypatch.setattr(models, "ALLOW_MODEL_REQUESTS", False)
    app = create_app(f"sqlite:///{tmp_path}/combined.sqlite3", static_dir=tmp_path / "static")
    with TestClient(app, base_url="http://localhost") as client:
        saved = client.post("/api/studies", json={"design": protocol()})
        assert saved.status_code == 201, saved.text
        exported = client.get(f"/api/studies/{saved.json()['id']}/export")
        assert exported.status_code == 200, exported.text
        assert exported.json()["version"] == 14
        assert exported.json()["requests"] == []
        assert client.get("/api/settings").json()["usage"]["cost_usd"] == 0
