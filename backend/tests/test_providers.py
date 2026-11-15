import asyncio
import json
import stat

import pytest
from agent_sim.api import create_app
from agent_sim.db import ProviderCall, Workspace
from agent_sim.domain import Design
from agent_sim.exports import export_study
from agent_sim.llm import LanguageModels, ProviderFailure
from agent_sim.providers import ModelConfiguration, ModelRegistry, ProviderConfiguration
from fastapi.testclient import TestClient
from pydantic import ValidationError
from pydantic_ai.messages import ModelResponse, TextPart
from pydantic_ai.models.anthropic import AnthropicModel
from pydantic_ai.models.function import FunctionModel
from pydantic_ai.models.openai import OpenAIChatModel, OpenAIResponsesModel
from pydantic_ai.usage import RequestUsage
from sqlalchemy import select


def test_assistant_estimates_are_free_and_web_research_requires_opt_in(runtime):
    _, models, _, _ = runtime
    before = models.usage()
    assert not models.web_research_available()
    estimate = models.assistant_estimate("general")
    assert estimate["max_requests"] == 12
    assert estimate["upper_usd"] > 0
    models.registry.configuration.preferences.assistant_model = "local:unknown"
    assert models.assistant_estimate("analysis")["upper_usd"] is None
    assert models.usage() == before


def test_local_registry_preserves_keys_privately_and_prices_can_be_unknown(tmp_path):
    database = str(tmp_path / "workspace.sqlite3")
    registry = ModelRegistry(database)
    key = "key-canary-for-local-storage-only"
    registry.set_provider(
        "local",
        ProviderConfiguration(kind="compatible", base_url="http://localhost:11434/v1", api_key=key),
    )
    registry.set_model(ModelConfiguration(id="local:qwen3:latest"))
    assert registry.price("local:qwen3:latest") is None
    assert key not in json.dumps(registry.public_providers())
    assert registry.path is not None
    assert stat.S_IMODE(registry.path.stat().st_mode) == 0o600
    reloaded = ModelRegistry(database)
    assert reloaded.provider("local").api_key == key
    reloaded.set_provider(
        "local", ProviderConfiguration(kind="compatible", base_url="http://localhost:1234/v1")
    )
    assert reloaded.provider("local").api_key == key
    reloaded.set_model(
        ModelConfiguration(id="local:qwen3:latest", input_per_million=0, output_per_million=0)
    )
    assert reloaded.price("local:qwen3:latest") == (0, 0)
    with pytest.raises(ValidationError):
        ModelConfiguration(id="local:qwen3:latest", input_per_million=1)
    with pytest.raises(ValidationError):
        ProviderConfiguration(kind="compatible", base_url="https://user:secret@example.com")


def test_arbitrary_model_runs_under_explicit_tokens_and_exports_unknown_cost(runtime, design):
    db, models, research, engine = runtime
    design.conditions[0].model = "local:qwen3:latest"
    design.token_budget = 100_000
    sid = research.save_design(Design.model_validate(design.model_dump()))
    rid = research.study(sid)["runs"][0]["id"]
    models.registry.set_provider(
        "local",
        ProviderConfiguration(
            kind="compatible",
            base_url="http://localhost:11434/v1",
            api_key="private-provider-canary",
        ),
    )

    async def run():
        await engine.start(rid)
        await engine.executions[rid].task

    asyncio.run(run())
    assert research.run(rid)["summary"]["status"] == "complete"
    assert models.usage(run_id=rid)["cost_usd"] is None
    assert research.studies()[0]["cost_usd"] is None
    assert research.participant_effort({rid: 99})[rid]["usage"]["cost_usd"] is None
    record = export_study(research, sid)
    serialized = json.dumps(record)
    assert "private-provider-canary" not in serialized
    requests = record["requests"]
    assert isinstance(requests, list)
    assert all(call["cost_usd"] is None for call in requests)
    models.registry.set_model(
        ModelConfiguration(id="local:qwen3:latest", input_per_million=0, output_per_million=0)
    )
    assert models.usage(run_id=rid)["cost_usd"] is None, "Later prices never backfill evidence"
    with db.session() as session:
        assert session.get_one(Workspace, 1).charged == 0
    assert models.token_usage() > 0


def test_unknown_model_rejects_dollar_only_work_before_sending(runtime):
    db, models, _, _ = runtime

    async def run():
        with pytest.raises(ProviderFailure, match="explicit token cap"):
            await models.generate(
                str, model="local:unpriced", prompt="test", instructions="test", purpose="test"
            )

    asyncio.run(run())
    assert models.usage()["requests"] == 0


def test_concurrent_token_reservation_is_atomic_and_cancelled_usage_stays_reserved(
    runtime, monkeypatch
):
    db, models, _, _ = runtime
    configuration = models.registry.configuration.model_copy(deep=True)
    configuration.preferences.token_budget = 6000
    models.registry.save(configuration)
    entered = asyncio.Event()
    release = asyncio.Event()

    async def wait(messages, info):
        entered.set()
        await release.wait()
        return ModelResponse(
            parts=[TextPart("ok")], usage=RequestUsage(input_tokens=10, output_tokens=5)
        )

    monkeypatch.setattr(models, "model", lambda _: FunctionModel(function=wait))

    async def request():
        return await models.generate(
            str,
            model="local:unpriced",
            prompt="test",
            instructions="test",
            purpose="test",
            max_tokens=512,
        )

    async def run():
        first = asyncio.create_task(request())
        await asyncio.wait_for(entered.wait(), timeout=5)
        with pytest.raises(ProviderFailure, match="token ceiling"):
            await request()
        first.cancel()
        with pytest.raises(asyncio.CancelledError):
            await first

    asyncio.run(run())
    with db.session() as session:
        call = session.scalars(select(ProviderCall)).one()
        assert call.status == "unknown"
        assert models.token_usage() == call.request_payload["token_reservation"] > 0
    assert models.usage()["requests"] == 1
    assert models.usage()["cost_usd"] is None


def test_settings_api_never_reflects_keys_and_reload_keeps_configuration(tmp_path):
    url = f"sqlite:///{tmp_path}/settings.sqlite3"
    key = "private-settings-canary"
    with TestClient(create_app(url), base_url="http://localhost") as client:
        response = client.put(
            "/api/settings/providers/local",
            json={"kind": "compatible", "base_url": "http://localhost:11434/v1", "api_key": key},
        )
        assert response.status_code == 200
        assert key not in response.text
        assert (
            client.put("/api/settings/models", json={"id": "local:qwen3:latest"}).status_code == 200
        )
        settings = client.get("/api/settings")
        assert key not in settings.text
        assert settings.json()["providers"]["local"] is True
        invalid = client.put(
            "/api/settings/providers/local",
            json={
                "kind": "compatible",
                "base_url": "http://localhost:11434/v1",
                "api_key": key * 1000,
            },
        )
        assert invalid.status_code == 422 and key not in invalid.text
    with TestClient(create_app(url), base_url="http://localhost") as client:
        settings = client.get("/api/settings").json()
        assert settings["models"][-1]["id"] == "local:qwen3:latest"
        assert settings["models"][-1]["input_per_million"] is None


def test_all_provider_adapters_are_explicit_and_do_not_retry(tmp_path, monkeypatch):
    from agent_sim.db import Database

    db = Database(f"sqlite:///{tmp_path}/adapters.sqlite3")
    models = LanguageModels(db)
    models.registry.set_provider(
        "local", ProviderConfiguration(kind="compatible", base_url="http://localhost:11434/v1")
    )
    models.registry.set_provider(
        "openrouter",
        ProviderConfiguration(
            kind="openrouter", base_url="https://openrouter.ai/api/v1", api_key="router-canary"
        ),
    )
    monkeypatch.setenv("ANTHROPIC_API_KEY", "anthropic-canary")
    try:
        for name in [
            "openai:arbitrary-model",
            "anthropic:arbitrary-model",
            "openrouter:vendor/model",
            "local:qwen3:latest",
        ]:
            adapter = models.model(name)
            assert isinstance(adapter, AnthropicModel | OpenAIChatModel | OpenAIResponsesModel)
            assert adapter.model_name == name.split(":", 1)[1]
            assert adapter.client.max_retries == 0
        assert models.usage()["requests"] == 0
    finally:
        asyncio.run(models.close())
        db.close()


def test_saved_workspace_budget_survives_restart_and_explicit_override(tmp_path):
    url = f"sqlite:///{tmp_path}/budget.sqlite3"
    with TestClient(create_app(url), base_url="http://localhost") as client:
        preferences = client.get("/api/settings").json()["preferences"]
        assert (
            client.put(
                "/api/settings", json={"preferences": preferences, "budget_usd": 3.75}
            ).status_code
            == 200
        )
    with TestClient(create_app(url), base_url="http://localhost") as client:
        assert client.get("/api/settings").json()["budget_usd"] == 3.75
    with TestClient(create_app(url, budget_usd=2), base_url="http://localhost") as client:
        assert client.get("/api/settings").json()["budget_usd"] == 2
    with TestClient(create_app(url), base_url="http://localhost") as client:
        assert client.get("/api/settings").json()["budget_usd"] == 3.75


def test_pending_assistant_work_prevents_configuration_changes(tmp_path):
    from agent_sim.db import Analysis

    app = create_app(f"sqlite:///{tmp_path}/pending.sqlite3")
    with TestClient(app, base_url="http://localhost") as client:
        with app.state.db.session.begin() as session:
            session.add(Analysis(purpose="answer", question="Pending", status="pending"))
        response = client.put("/api/settings/models", json={"id": "local:other"})
        assert response.status_code == 409
        assert app.state.models.registry.configuration.models == {}


def test_web_research_rejects_edited_prices_before_reservation(runtime):
    _, models, _, _ = runtime
    models.registry.set_model(
        ModelConfiguration(id="openai:gpt-6.1-sol", input_per_million=200, output_per_million=1000)
    )
    assert not models.web_research_available()

    async def run():
        with pytest.raises(ValueError, match="bundled prices"):
            await models.generate(
                str,
                model="openai:gpt-6.1-sol",
                prompt="test",
                instructions="test",
                purpose="design",
                web_search=True,
            )

    asyncio.run(run())
    assert models.usage()["requests"] == 0


def test_estimates_are_free_honor_override_models_and_show_unknowns(runtime, design):
    _, models, _, _ = runtime
    design.conditions[0].profile_overrides = [
        design.profiles[0].model_copy(update={"model": "local:unpriced"})
    ]
    estimate = models.estimate(design)
    assert estimate["runs"] == 1
    assert estimate["max_requests"] == design.turn_count
    assert estimate["upper_usd"] is None
    assert estimate["unpriced_models"] == ["local:unpriced"]
    assert models.usage()["requests"] == 0


def test_connection_estimate_sends_nothing_and_execution_requires_a_stated_cap(tmp_path):
    with TestClient(
        create_app(f"sqlite:///{tmp_path}/test.sqlite3"), base_url="http://localhost"
    ) as client:
        estimate = client.post("/api/settings/test-model", json={"model": "openai:gpt-6-luna"})
        assert estimate.status_code == 200
        assert estimate.json()["estimate"]["upper_usd"] > 0
        rejected = client.post(
            "/api/settings/test-model", json={"model": "openai:gpt-6-luna", "execute": True}
        )
        assert rejected.status_code == 422
        assert client.get("/api/settings").json()["usage"]["requests"] == 0


def test_backup_is_consistent_and_excludes_provider_keys(tmp_path, design):
    import io
    import sqlite3
    from zipfile import ZipFile

    from agent_sim.publishing import PublicationReceipts

    url = f"sqlite:///{tmp_path}/backup.sqlite3"
    app = create_app(url)
    key = "private-backup-canary"
    with TestClient(app, base_url="http://localhost") as client:
        assert (
            client.put(
                "/api/settings/providers/local",
                json={
                    "kind": "compatible",
                    "base_url": "http://localhost:11434/v1",
                    "api_key": key,
                },
            ).status_code
            == 200
        )
        saved = client.post("/api/studies", json={"design": design.model_dump()})
        assert saved.status_code == 201
        lineage = {"author": "researcher", "slug": "source", "version": 1, "sha256": "a" * 64}
        PublicationReceipts(str(tmp_path / "backup.sqlite3")).save(
            saved.json()["id"], "lineage", lineage
        )
        response = client.get("/api/data/backup")
        assert response.status_code == 200
        with ZipFile(io.BytesIO(response.content)) as archive:
            for name in archive.namelist():
                assert key.encode() not in archive.read(name)
            restored = tmp_path / "restored.sqlite3"
            restored.write_bytes(archive.read("workspace.sqlite3"))
            restored.with_suffix(".publishing.sqlite3").write_bytes(
                archive.read("workspace.publishing.sqlite3")
            )
            configuration = json.loads(archive.read("workspace.settings.json"))
            assert configuration["providers"]["local"]["api_key"] is None
        with sqlite3.connect(restored) as connection:
            assert connection.execute("SELECT count(*) FROM studies").fetchone()[0] == 1
        assert PublicationReceipts(str(restored)).get(saved.json()["id"], "lineage") == lineage
        assert client.get("/api/settings").json()["usage"]["requests"] == 0


def test_partial_settings_preserve_other_sections_and_budget(tmp_path):
    url = f"sqlite:///{tmp_path}/settings.sqlite3"
    with TestClient(create_app(url), base_url="http://localhost") as client:
        assert (
            client.put(
                "/api/settings",
                json={"preferences": {"developer": True, "token_budget": 5000}, "budget_usd": 7},
            ).status_code
            == 200
        )
        assert (
            client.put(
                "/api/settings",
                json={
                    "preferences": {
                        "gallery_url": "https://gallery.example",
                        "default_visibility": "public",
                    }
                },
            ).status_code
            == 200
        )
        saved = client.get("/api/settings").json()
        assert saved["budget_usd"] == 7
        assert saved["preferences"]["developer"] is True
        assert saved["preferences"]["token_budget"] == 5000
        assert saved["preferences"]["default_visibility"] == "public"
        assert (
            client.put("/api/settings", json={"preferences": {"token_budget": None}}).status_code
            == 200
        )
        saved = client.get("/api/settings").json()
        assert saved["preferences"]["token_budget"] is None
        assert saved["preferences"]["gallery_url"] == "https://gallery.example"
