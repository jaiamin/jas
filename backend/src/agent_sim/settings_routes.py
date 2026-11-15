"""Local settings and data tools; credentials never appear in responses."""

import asyncio
import json
import math
from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import Field, TypeAdapter
from sqlalchemy import select
from starlette.background import BackgroundTask

from .db import Analysis, Database, ProviderCall, Run, Workspace
from .dependencies import DatabaseDep, EngineDep, LanguageModelsDep
from .domain import ModelId, Strict
from .providers import ModelConfiguration, ProviderConfiguration, WorkspacePreferences
from .workspace_data import backup_workspace

router = APIRouter()


@router.get("/api/settings")
async def settings(
    *, db: DatabaseDep, models: LanguageModelsDep, engine: EngineDep
) -> dict[str, Any]:
    with db.session() as session:
        workspace = session.get_one(Workspace, 1)
        return {
            "providers": models.registry.availability(),
            "provider_configurations": models.registry.public_providers(),
            "preferences": {
                **models.registry.configuration.preferences.model_dump(),
                "planner_model": models.research_model("design"),
                "assistant_model": models.research_model("answer"),
            },
            "planner_model": models.research_model("design"),
            "assistant_model": models.research_model("answer"),
            "assistant_estimates": {
                purpose: models.assistant_estimate(purpose)
                for purpose in ("general", "design", "analysis")
            },
            "concurrent_requests": models.concurrency,
            "models": models.catalog(),
            "budget_usd": workspace.ceiling / 1000000,
            "charged_usd": workspace.charged / 1000000,
            "committed_tokens": models.token_usage(),
            "usage": models.usage(),
            "storage": "SQLite" if db.engine.dialect.name == "sqlite" else "PostgreSQL",
            "data_location": db.engine.url.database or ":memory:",
            "concurrent_runs": engine.concurrency,
            "mode": "local",
        }


def configuration_idle(db: Database) -> None:
    with db.session() as session:
        if (
            session.scalar(select(Run.id).where(Run.status.in_(["queued", "running", "pausing"])))
            or session.scalar(select(ProviderCall.id).where(ProviderCall.status == "pending"))
            or session.scalar(select(Analysis.id).where(Analysis.status == "pending"))
        ):
            raise HTTPException(
                409, "Pause active work before changing provider or budget settings"
            )


@router.put("/api/settings/providers/{name}")
async def save_provider(
    name: str, body: ProviderConfiguration, *, db: DatabaseDep, models: LanguageModelsDep
) -> dict:
    configuration_idle(db)
    models.registry.set_provider(name, body)
    models.retire_adapters()
    return {"providers": models.registry.public_providers()}


@router.put("/api/settings/models")
async def save_model(
    body: ModelConfiguration, *, db: DatabaseDep, models: LanguageModelsDep
) -> dict:
    configuration_idle(db)
    models.registry.set_model(body)
    return {"models": models.catalog()}


class SavePreferences(Strict):
    preferences: WorkspacePreferences
    budget_usd: float | None = Field(default=None, ge=0, le=10000)


@router.put("/api/settings")
async def save_preferences(
    body: SavePreferences, *, db: DatabaseDep, models: LanguageModelsDep
) -> dict:
    configuration_idle(db)
    configuration = models.registry.configuration.model_copy(deep=True)
    preferences = WorkspacePreferences.model_validate(
        {
            **configuration.preferences.model_dump(),
            **body.preferences.model_dump(exclude_unset=True),
        }
    )
    limit = preferences.token_budget
    if limit is not None and limit < models.token_usage():
        raise ValueError("Token budget cannot be below already committed tokens")
    configuration.preferences = preferences
    with db.session.begin() as session:
        workspace = session.get_one(Workspace, 1)
        ceiling = (
            round(body.budget_usd * 1_000_000) if body.budget_usd is not None else workspace.ceiling
        )
        if ceiling < workspace.charged:
            raise ValueError("Dollar budget cannot be below already committed usage")
        workspace.ceiling = ceiling
        configuration.workspace_budget_usd = ceiling / 1_000_000
        models.registry.save(configuration)
    return {"ok": True}


class TestModel(Strict):
    model: ModelId
    execute: bool = False
    max_usd: float | None = Field(default=None, gt=0, le=25)


class TestReply(Strict):
    acknowledged: bool


@router.post("/api/settings/test-model")
async def test_model(body: TestModel, *, models: LanguageModelsDep) -> dict:
    prompt = "This is a connection test. Return acknowledged=true."
    instructions = "Respond using the required schema."
    input_bound = (
        len((prompt + instructions + json.dumps(TypeAdapter(TestReply).json_schema())).encode())
        + 4096
    )
    price = models.registry.price(body.model)
    upper = math.ceil(input_bound * price[0] * 1.25 + 256 * price[1]) / 1_000_000 if price else None
    estimate = {"upper_usd": upper, "max_tokens": input_bound + 256, "requests": 1}
    if not body.execute:
        return {"estimate": estimate}
    if upper is not None and (body.max_usd is None or upper > body.max_usd):
        raise ValueError("State a max_usd covering the displayed estimate before testing")
    response = await models.generate(
        TestReply,
        model=body.model,
        prompt=prompt,
        instructions=instructions,
        purpose="connection_test",
        max_tokens=256,
    )
    return {"estimate": estimate, "acknowledged": response.acknowledged}


@router.get("/api/data/backup")
async def download_backup(*, db: DatabaseDep, models: LanguageModelsDep) -> FileResponse:
    archive = await asyncio.to_thread(backup_workspace, db, models.registry)
    return FileResponse(
        archive,
        media_type="application/zip",
        filename="jas-workspace.zip",
        background=BackgroundTask(archive.unlink, missing_ok=True),
    )
