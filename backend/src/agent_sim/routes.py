import asyncio
import json
import os
from pathlib import Path
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from pydantic import Field
from sqlalchemy import select, text

from .assistants import Assistants
from .config import setting
from .db import Annotation, Database, ProviderCall, Workspace
from .domain import Design, EnvironmentMechanics, SavedEnvironment, Strict
from .environment_library import builtin_environment, definition_from_design, use_environment
from .execution import Engine
from .exports import export_study
from .extensions import ExtensionCandidate, ExtensionReview, ExtensionRuntime, Extensions
from .llm import LanguageModels
from .research import Research, RunSummary
from .simulation.environments import CATALOG, MEASURE_DESCRIPTIONS
from .templates import templates

router = APIRouter()
web_router = APIRouter()


async def database(request: Request) -> Database:
    return request.app.state.db


DatabaseDep = Annotated[Database, Depends(database)]


async def language_models(request: Request) -> LanguageModels:
    return request.app.state.models


LanguageModelsDep = Annotated[LanguageModels, Depends(language_models)]


async def research_service(request: Request) -> Research:
    return request.app.state.research


ResearchDep = Annotated[Research, Depends(research_service)]


async def execution_engine(request: Request) -> Engine:
    return request.app.state.engine


EngineDep = Annotated[Engine, Depends(execution_engine)]


async def assistant_service(request: Request) -> Assistants:
    return request.app.state.assistants


AssistantsDep = Annotated[Assistants, Depends(assistant_service)]


async def extension_service(request: Request) -> Extensions:
    return request.app.state.extensions


ExtensionsDep = Annotated[Extensions, Depends(extension_service)]


@router.get("/api/extensions/runtime")
async def extension_runtime(*, extensions: ExtensionsDep) -> ExtensionRuntime:
    return extensions.runtime


@router.post("/api/extensions/validate", status_code=201)
async def validate_extension(
    body: ExtensionCandidate, *, extensions: ExtensionsDep
) -> ExtensionReview:
    return await asyncio.to_thread(extensions.validate, body)


@router.post("/api/extensions/qualify")
async def qualify_extensions(*, extensions: ExtensionsDep) -> ExtensionRuntime:
    return await asyncio.to_thread(extensions.qualify)


@router.get("/api/extensions/reviews")
async def extension_reviews(*, extensions: ExtensionsDep) -> list[ExtensionReview]:
    return await asyncio.to_thread(extensions.list)


@router.get("/api/extensions/reviews/{key}")
async def extension_review(key: str, *, extensions: ExtensionsDep) -> ExtensionReview:
    return await asyncio.to_thread(extensions.get, key)


async def static_directory(request: Request) -> Path:
    return request.app.state.frontend


PathDep = Annotated[Path, Depends(static_directory)]


class SaveStudy(Strict):
    design: Design
    plan_id: str | None = None


class SaveEnvironment(Strict):
    definition: EnvironmentMechanics
    revision: int | None = Field(default=None, ge=1)


class UseEnvironment(Strict):
    design: Design | None = None
    source: SavedEnvironment
    example: str
    bindings: dict[str, str] = Field(default_factory=dict)


@router.post("/api/design/use-environment")
async def apply_environment(body: UseEnvironment, *, research: ResearchDep) -> Design:
    design = await asyncio.to_thread(
        use_environment, body.design, body.source, body.example, body.bindings
    )
    research.validate_design(design)
    return design


class ExtractEnvironment(Strict):
    design: Design


@router.post("/api/design/environment")
async def extract_environment(
    body: ExtractEnvironment, *, research: ResearchDep
) -> EnvironmentMechanics:
    research.validate_design(body.design)
    return await asyncio.to_thread(definition_from_design, body.design)


class ChatMessage(Strict):
    question: str = Field(min_length=1, max_length=4000)
    context: str = "general"
    chat_id: str | None = None


class Note(Strict):
    turn: int = Field(ge=0)
    label: str = Field(min_length=1, max_length=80)
    note: str = Field(min_length=1, max_length=4000)


class StudyControl(Strict):
    action: Literal["start", "pause"]


class RunControl(Strict):
    action: Literal["start", "pause", "step"]


@router.get("/api/health")
async def health(*, db: DatabaseDep) -> dict[str, Any]:
    with db.session() as session:
        session.execute(text("SELECT 1"))
    return {"status": "ok", "version": "0.2.0"}


@router.get("/api/catalog")
async def catalog(*, models: LanguageModelsDep) -> dict[str, Any]:
    return {
        "environments": [
            {
                "key": a.key,
                "name": a.name,
                "description": a.description,
                "primary_metric": a.primary_metric,
                "parameters": list(a.parameters),
                "measures": list(a.measures),
                "measure_definitions": {m: MEASURE_DESCRIPTIONS[m] for m in a.measures},
                "rule_version": a.world.version,
                "source": builtin_environment(a.key).model_dump(),
            }
            for a in CATALOG.values()
        ],
        "models": models.catalog(),
        "templates": templates(),
        "design_schema": Design.model_json_schema(),
        "environment_schema": EnvironmentMechanics.model_json_schema(),
    }


@router.get("/api/environments")
async def custom_environments(*, research: ResearchDep) -> list[dict]:
    return [record.model_dump() for record in research.environments.list()]


@router.get("/api/environments/{key}")
async def custom_environment(key: str, *, research: ResearchDep) -> dict:
    return research.environments.get(key).model_dump()


@router.post("/api/environments", status_code=201)
async def create_environment(body: SaveEnvironment, *, research: ResearchDep) -> dict:
    return (await asyncio.to_thread(research.environments.save, body.definition)).model_dump()


@router.put("/api/environments/{key}")
async def update_environment(key: str, body: SaveEnvironment, *, research: ResearchDep) -> dict:
    return (
        await asyncio.to_thread(research.environments.save, body.definition, key, body.revision)
    ).model_dump()


@router.delete("/api/environments/{key}")
async def delete_environment(
    key: str, revision: int = Query(ge=1), *, research: ResearchDep
) -> dict:
    await asyncio.to_thread(research.environments.delete, key, revision)
    return {"ok": True}


@router.get("/api/settings")
async def settings(
    *, db: DatabaseDep, models: LanguageModelsDep, engine: EngineDep
) -> dict[str, Any]:
    with db.session() as session:
        workspace = session.get_one(Workspace, 1)
        return {
            "providers": {
                p: bool(os.environ.get(f"{p.upper()}_API_KEY")) for p in ("openai", "anthropic")
            },
            "planner_model": setting("PLANNER_MODEL", "openai:gpt-6.1-sol"),
            "assistant_model": setting("ASSISTANT_MODEL", "openai:gpt-6.1-sol"),
            "concurrent_requests": models.concurrency,
            "models": models.catalog(),
            "budget_usd": workspace.ceiling / 1000000,
            "charged_usd": workspace.charged / 1000000,
            "usage": models.usage(),
            "storage": "SQLite" if db.engine.dialect.name == "sqlite" else "PostgreSQL",
            "concurrent_runs": engine.concurrency,
            "mode": "local",
        }


@router.get("/api/studies")
async def studies(*, research: ResearchDep) -> list[dict[str, Any]]:
    return research.studies()


@router.post("/api/design/validate")
async def validate_design(body: SaveStudy, *, research: ResearchDep) -> dict[str, Any]:
    research.validate_design(body.design)
    return body.design.model_dump()


@router.post("/api/design/preflight")
async def check_design(body: SaveStudy, *, research: ResearchDep) -> dict[str, Any]:
    research.validate_design(body.design)
    return await asyncio.to_thread(research.preflight, body.design, body.plan_id)


@router.post("/api/studies", status_code=201)
async def create_study(body: SaveStudy, *, research: ResearchDep) -> dict[str, Any]:
    await asyncio.to_thread(research.preflight, body.design, body.plan_id)
    return {"id": research.save_design(body.design, plan_id=body.plan_id)}


@router.get("/api/studies/{study_id}")
async def get_study(
    study_id: str, revision: int | None = Query(default=None, ge=1), *, research: ResearchDep
) -> dict[str, Any]:
    return await asyncio.to_thread(research.study, study_id, revision)


@router.delete("/api/studies/{study_id}")
async def delete_study(
    study_id: str,
    *,
    research: ResearchDep,
    engine: EngineDep,
    assistants: AssistantsDep,
) -> dict[str, bool]:
    # Keep this on the owning event loop: task creation and deletion cannot race.
    research.delete_study(
        study_id,
        active_runs={
            key
            for key, execution in engine.executions.items()
            if execution.task and not execution.task.done()
        },
        active_analyses={key for key, task in assistants.tasks.items() if not task.done()},
    )
    return {"ok": True}


@router.post("/api/studies/{study_id}/revisions", status_code=201)
async def revise_study(study_id: str, body: SaveStudy, *, research: ResearchDep) -> dict[str, Any]:
    await asyncio.to_thread(research.preflight, body.design, body.plan_id)
    return {"id": research.save_design(body.design, study_id=study_id, plan_id=body.plan_id)}


@router.post("/api/studies/{study_id}/control")
async def control_study(study_id: str, body: StudyControl, *, engine: EngineDep) -> dict[str, Any]:
    if body.action == "start":
        engine.start_study(study_id)
    else:
        engine.pause_study(study_id)
    return {"ok": True}


@router.get("/api/studies/{study_id}/exposure")
async def study_exposure(
    study_id: str, revision: int | None = None, *, research: ResearchDep
) -> dict[str, Any]:
    detail = research.study(study_id, revision)
    return {
        "revision": detail["revision"],
        "runs": [research.exposure(run["id"]) for run in detail["runs"]],
    }


@router.get("/api/studies/{study_id}/export")
async def download_study(study_id: str, *, research: ResearchDep) -> JSONResponse:
    return JSONResponse(
        export_study(research, study_id),
        headers={"Content-Disposition": f'attachment; filename="jas-{study_id}.json"'},
    )


@router.get("/api/runs")
async def runs(study_id: str | None = None, *, research: ResearchDep) -> list[RunSummary]:
    return research.runs(study_id)


@router.get("/api/runs/{run_id}")
async def get_run(run_id: str, *, research: ResearchDep) -> dict[str, Any]:
    return research.run(run_id)


@router.get("/api/runs/{run_id}/exposure")
async def get_exposure(
    run_id: str, through_turn: int | None = None, *, research: ResearchDep
) -> dict[str, Any]:
    return research.exposure(run_id, through_turn)


@router.get("/api/requests/{call_id}")
async def request_evidence(call_id: str, *, db: DatabaseDep) -> dict[str, Any]:
    with db.session() as session:
        call = session.get_one(ProviderCall, call_id)
        return {
            "id": call.id,
            "run_id": call.run_id,
            "activation_id": call.activation_id,
            "turn": call.turn,
            "request": call.request_payload,
            "response": call.response_payload,
            "error": call.error,
            "status": call.status,
        }


@router.get("/api/runs/{run_id}/turns/{number}")
async def get_evidence(run_id: str, number: int, *, research: ResearchDep) -> dict[str, Any]:
    return research.evidence(run_id, number)


@router.post("/api/runs/{run_id}/control")
async def control_run(run_id: str, body: RunControl, *, engine: EngineDep) -> dict[str, Any]:
    if body.action == "pause":
        engine.pause(run_id)
    else:
        engine.start(run_id, single=body.action == "step")
    return {"ok": True}


@router.post("/api/runs/{run_id}/verify")
async def verify_run(run_id: str, *, engine: EngineDep) -> dict[str, Any]:
    return engine.replay(run_id)


@router.get("/api/runs/{run_id}/annotations")
async def notes(run_id: str, *, db: DatabaseDep, research: ResearchDep) -> list[dict[str, Any]]:
    research.configuration(run_id)
    with db.session() as session:
        return [
            {"id": n.id, "turn": n.turn, "label": n.label, "note": n.note, "created": n.created}
            for n in session.scalars(
                select(Annotation).where(Annotation.run_id == run_id).order_by(Annotation.created)
            )
        ]


@router.post("/api/runs/{run_id}/annotations", status_code=201)
async def add_note(
    run_id: str, body: Note, *, db: DatabaseDep, research: ResearchDep
) -> dict[str, Any]:
    run, _, _ = research.configuration(run_id)
    if body.turn > run.turn:
        raise ValueError("Cannot annotate an unrecorded turn")
    with db.session.begin() as session:
        note = Annotation(run_id=run_id, **body.model_dump())
        session.add(note)
        session.flush()
        return {"id": note.id}


@router.get("/api/analyses/{analysis_id}")
async def get_analysis(analysis_id: str, *, assistants: AssistantsDep) -> dict[str, Any]:
    return assistants.get(analysis_id)


@router.get("/api/chats")
async def chats(*, assistants: AssistantsDep) -> list[dict]:
    return list(assistants.chats())


@router.get("/api/chats/{chat_id}")
async def chat(chat_id: str, *, assistants: AssistantsDep) -> list[dict]:
    return list(assistants.chat(chat_id))


@router.get("/api/chats/{chat_id}/events")
async def chat_events(chat_id: str, *, assistants: AssistantsDep) -> StreamingResponse:
    key = assistants.chat(chat_id)[-1]["id"]

    async def events():
        previous, heartbeat = None, asyncio.get_running_loop().time()
        while True:
            row = assistants.get(key)
            snapshot = json.dumps(row)
            now = asyncio.get_running_loop().time()
            if snapshot != previous:
                yield f"data: {snapshot}\n\n"
                previous, heartbeat = snapshot, now
            elif now - heartbeat >= 15:
                yield ": keep-alive\n\n"
                heartbeat = now
            if row["status"] != "pending":
                return
            await asyncio.sleep(0.15)

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/api/chats", status_code=202)
async def send_chat(body: ChatMessage, *, assistants: AssistantsDep) -> dict:
    return assistants.send(body.question, body.context, body.chat_id)


@web_router.get("/{path:path}", include_in_schema=False)
async def web(path: str, *, frontend: PathDep):
    if path.startswith("api/"):
        raise HTTPException(404, "Endpoint not found")
    asset = (frontend / path).resolve()
    if not asset.is_relative_to(frontend):
        raise HTTPException(404)
    if asset.is_file():
        return FileResponse(asset)
    index = frontend / "index.html"
    if not index.is_file():
        return JSONResponse(
            {"detail": "Frontend not built. Run pnpm --dir frontend build."}, status_code=503
        )
    return FileResponse(index, headers={"Cache-Control": "no-cache"})
