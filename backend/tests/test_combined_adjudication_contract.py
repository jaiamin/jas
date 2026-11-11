"""CC03: explicitly frozen combined T12/T17/T18 contract, no model calls."""

from agent_sim.api import create_app
from fastapi.testclient import TestClient
from pydantic_ai import models
from test_fallible_adjudication import protocol


def test_combined_adjudication_export_is_version18_without_spending(tmp_path, monkeypatch):
    monkeypatch.setattr(models, "ALLOW_MODEL_REQUESTS", False)
    app = create_app(f"sqlite:///{tmp_path}/combined.sqlite3", static_dir=tmp_path / "static")
    with TestClient(app, base_url="http://localhost") as client:
        saved = client.post("/api/studies", json={"design": protocol()})
        assert saved.status_code == 201, saved.text
        exported = client.get(f"/api/studies/{saved.json()['id']}/export")
        assert exported.status_code == 200, exported.text
        assert exported.json()["version"] == 18
        assert exported.json()["requests"] == []
        assert client.get("/api/settings").json()["usage"]["cost_usd"] == 0


def test_review_assignment_override_uses_luna_without_implicitly_assigning_the_sol_judge(
    tmp_path, monkeypatch
):
    monkeypatch.setattr(models, "ALLOW_MODEL_REQUESTS", False)
    value = protocol()
    value["profiles"][0]["model"] = "openai:gpt-6.1-sol"
    value["conditions"][0]["profile_overrides"] = [{**value["profiles"][0], "model": None}]
    app = create_app(f"sqlite:///{tmp_path}/assignment.sqlite3", static_dir=tmp_path / "static")
    with TestClient(app, base_url="http://localhost") as client:
        response = client.post("/api/studies", json={"design": value})
        assert response.status_code == 201, response.text
        study = client.get(f"/api/studies/{response.json()['id']}").json()
        assert study["design"]["profiles"][0]["model"] == "openai:gpt-6.1-sol"
        run = client.get(f"/api/runs/{study['runs'][0]['id']}").json()
        assert run["summary"]["models"] == ["openai:gpt-6-luna"]
        assert study["preflight"]["adjudications"][0]["adjudicator"]["model"] == (
            "openai:gpt-6.1-sol"
        )
        assert run["requests"] == []
        assert client.get("/api/settings").json()["usage"]["cost_usd"] == 0
