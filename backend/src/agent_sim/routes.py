import os
from pathlib import Path
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse, JSONResponse
from pydantic import Field
from sqlalchemy import select, text

from .assistants import Assistants
from .db import Annotation, Database, ProviderCall, Workspace
from .domain import Design, Strict
from .environments import CATALOG, MEASURE_DESCRIPTIONS
from .execution import Engine
from .exports import export_study
from .llm import LanguageModels
from .research import Research
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


async def static_directory(request: Request) -> Path:
    return request.app.state.frontend


PathDep = Annotated[Path, Depends(static_directory)]


class SaveStudy(Strict):
    design: Design
    plan_id: str | None = None


class Ask(Strict):
    question: str = Field(min_length=1, max_length=4000)
    study_id: str | None = None
    run_id: str | None = None


class Note(Strict):
    turn: int = Field(ge=0)
    label: str = Field(min_length=1, max_length=80)
    note: str = Field(min_length=1, max_length=4000)


class Control(Strict):
    action: str = Field(pattern="^(start|pause|step)$")


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
            }
            for a in CATALOG.values()
        ],
        "models": models.catalog(),
        "templates": templates(),
        "design_schema": Design.model_json_schema(),
    }


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


@router.post("/api/studies", status_code=201)
async def create_study(body: SaveStudy, *, research: ResearchDep) -> dict[str, Any]:
    return {"id": research.save_design(body.design, plan_id=body.plan_id)}


@router.get("/api/studies/{study_id}")
async def get_study(
    study_id: str, revision: int | None = Query(default=None, ge=1), *, research: ResearchDep
) -> dict[str, Any]:
    return research.study(study_id, revision)


@router.post("/api/studies/{study_id}/revisions", status_code=201)
async def revise_study(study_id: str, body: SaveStudy, *, research: ResearchDep) -> dict[str, Any]:
    return {"id": research.save_design(body.design, study_id=study_id, plan_id=body.plan_id)}


@router.post("/api/studies/{study_id}/control")
async def control_study(study_id: str, body: Control, *, engine: EngineDep) -> dict[str, Any]:
    if body.action == "step":
        raise ValueError("Step is available on individual runs")
    if body.action == "start":
        engine.start_study(study_id)
    else:
        engine.pause_study(study_id)
    return {"ok": True}


@router.get("/api/studies/{study_id}/export")
async def download_study(study_id: str, *, research: ResearchDep) -> JSONResponse:
    return JSONResponse(
        export_study(research, study_id),
        headers={"Content-Disposition": f'attachment; filename="ass-{study_id}.json"'},
    )


@router.get("/api/runs")
async def runs(study_id: str | None = None, *, research: ResearchDep) -> list[dict[str, Any]]:
    return research.runs(study_id)


@router.get("/api/runs/{run_id}")
async def get_run(run_id: str, *, research: ResearchDep) -> dict[str, Any]:
    return research.run(run_id)


@router.get("/api/requests/{call_id}")
async def request_evidence(call_id: str, *, db: DatabaseDep) -> dict[str, Any]:
    with db.session() as session:
        call = session.get_one(ProviderCall, call_id)
        return {
            "id": call.id,
            "run_id": call.run_id,
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
async def control_run(run_id: str, body: Control, *, engine: EngineDep) -> dict[str, Any]:
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


@router.post("/api/plan", status_code=202)
async def plan(body: Ask, *, assistants: AssistantsDep) -> dict[str, Any]:
    if body.study_id or body.run_id:
        raise ValueError("Design requests cannot change an existing run")
    return {"id": assistants.start(body.question, purpose="design")}


@router.post("/api/analyses", status_code=202)
async def ask(body: Ask, *, assistants: AssistantsDep) -> dict[str, Any]:
    if not body.run_id and (not body.study_id):
        raise ValueError("Choose a run or study for analysis")
    return {
        "id": assistants.start(
            body.question, purpose="analysis", study_id=body.study_id, run_id=body.run_id
        )
    }


@router.get("/api/analyses")
async def analyses(
    study_id: str | None = None, run_id: str | None = None, *, assistants: AssistantsDep
) -> list[dict[str, Any]]:
    return assistants.list(study_id, run_id)


@router.get("/api/analyses/{analysis_id}")
async def get_analysis(analysis_id: str, *, assistants: AssistantsDep) -> dict[str, Any]:
    return assistants.get(analysis_id)


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
