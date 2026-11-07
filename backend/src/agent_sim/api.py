import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal
from urllib.parse import urlparse

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import Field
from sqlalchemy import select, text
from sqlalchemy.exc import NoResultFound

from .assistants import Assistants
from .config import default_database_url, setting
from .db import Annotation, Database, ProviderCall, Workspace
from .domain import Design, Strict
from .environments import CATALOG, MEASURE_DESCRIPTIONS, RULE_VERSION
from .execution import Engine
from .llm import LanguageModels, ProviderFailure
from .research import Research
from .templates import templates


class SaveStudy(Strict):
    design: Design
    plan_id: str | None = None


class Ask(Strict):
    question: str = Field(min_length=1, max_length=4000)
    study_id: str | None = None
    run_id: str | None = None


class ChatMessage(Strict):
    question: str = Field(min_length=1, max_length=4000)
    context: str = "general"
    chat_id: str | None = None


class Note(Strict):
    turn: int = Field(ge=0)
    label: str = Field(min_length=1, max_length=80)
    note: str = Field(min_length=1, max_length=4000)


class Control(Strict):
    action: str = Field(pattern="^(start|pause|step)$")


def create_app(
    database_url: str | None = None,
    *,
    budget_usd: float | None = None,
    static_dir: str | Path | None = None,
    concurrent_runs: int | None = None,
) -> FastAPI:
    db = Database(
        database_url or setting("DATABASE_URL", default_database_url()),
        round(
            (budget_usd if budget_usd is not None else float(setting("BUDGET_USD", "25")))
            * 1_000_000
        ),
    )
    models = LanguageModels(db)
    research = Research(db, models)
    engine = Engine(
        db,
        research,
        models,
        concurrent_runs if concurrent_runs is not None else int(setting("CONCURRENT_RUNS", "3")),
    )
    assistants = Assistants(db, research, models)

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        yield
        await engine.close()
        await assistants.close()
        await models.close()
        db.close()

    app = FastAPI(
        title="JAS",
        version="0.2.0",
        lifespan=lifespan,
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
    )
    app.state.db, app.state.models = db, models
    app.state.research, app.state.engine, app.state.assistants = research, engine, assistants
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    @app.middleware("http")
    async def same_origin(request: Request, call_next):
        origin = request.headers.get("origin")
        if request.method not in ("GET", "HEAD", "OPTIONS") and origin:
            allowed = {request.headers.get("host"), "localhost:5173", "127.0.0.1:5173"}
            if urlparse(origin).netloc not in allowed:
                return JSONResponse(
                    {"detail": "Cross-origin writes are not allowed"}, status_code=403
                )
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "same-origin"
        return response

    @app.exception_handler(ValueError)
    async def invalid(_request: Request, error: ValueError):
        return JSONResponse({"detail": str(error)}, status_code=422)

    @app.exception_handler(NoResultFound)
    async def missing(_request: Request, _error: NoResultFound):
        return JSONResponse({"detail": "Record not found"}, status_code=404)

    @app.exception_handler(ProviderFailure)
    async def provider_error(_request: Request, error: ProviderFailure):
        return JSONResponse({"detail": str(error)}, status_code=409)

    @app.get("/api/health")
    async def health() -> dict:
        with db.session() as session:
            session.execute(text("SELECT 1"))
        return {"status": "ok", "version": "0.2.0"}

    @app.get("/api/catalog")
    async def catalog() -> dict:
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

    @app.get("/api/settings")
    async def settings() -> dict:
        with db.session() as session:
            workspace = session.get_one(Workspace, 1)
            return {
                "providers": {
                    p: bool(os.environ.get(f"{p.upper()}_API_KEY")) for p in ("openai", "anthropic")
                },
                "planner_model": setting("PLANNER_MODEL", "openai:gpt-6.1-sol"),
                "models": models.catalog(),
                "budget_usd": workspace.ceiling / 1_000_000,
                "charged_usd": workspace.charged / 1_000_000,
                "usage": models.usage(),
                "rule_version": RULE_VERSION,
                "storage": "SQLite" if db.engine.dialect.name == "sqlite" else "PostgreSQL",
                "concurrent_runs": engine.concurrency,
                "mode": "local",
            }

    @app.get("/api/studies")
    async def studies() -> list[dict]:
        return research.studies()

    @app.post("/api/design/validate")
    async def validate_design(body: SaveStudy) -> dict:
        research.validate_design(body.design)
        return body.design.model_dump()

    @app.post("/api/studies", status_code=201)
    async def create_study(body: SaveStudy) -> dict:
        return {"id": research.save_design(body.design, plan_id=body.plan_id)}

    @app.get("/api/studies/{study_id}")
    async def get_study(study_id: str, revision: int | None = Query(default=None, ge=1)) -> dict:
        return research.study(study_id, revision)

    @app.post("/api/studies/{study_id}/revisions", status_code=201)
    async def revise_study(study_id: str, body: SaveStudy) -> dict:
        return {"id": research.save_design(body.design, study_id=study_id, plan_id=body.plan_id)}

    @app.post("/api/studies/{study_id}/control")
    async def control_study(study_id: str, body: Control) -> dict:
        if body.action == "step":
            raise ValueError("Step is available on individual runs")
        if body.action == "start":
            engine.start_study(study_id)
        else:
            engine.pause_study(study_id)
        return {"ok": True}

    @app.get("/api/studies/{study_id}/export")
    async def export_study(study_id: str) -> JSONResponse:
        return JSONResponse(
            research.export(study_id),
            headers={"Content-Disposition": f'attachment; filename="jas-{study_id}.json"'},
        )

    @app.get("/api/runs")
    async def runs(study_id: str | None = None) -> list[dict]:
        return research.runs(study_id)

    @app.get("/api/runs/{run_id}")
    async def get_run(run_id: str) -> dict:
        return research.run(run_id)

    @app.get("/api/requests/{call_id}")
    async def request_evidence(call_id: str) -> dict:
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

    @app.get("/api/runs/{run_id}/turns/{number}")
    async def get_evidence(run_id: str, number: int) -> dict:
        return research.evidence(run_id, number)

    @app.post("/api/runs/{run_id}/control")
    async def control_run(run_id: str, body: Control) -> dict:
        if body.action == "pause":
            engine.pause(run_id)
        else:
            engine.start(run_id, single=body.action == "step")
        return {"ok": True}

    @app.post("/api/runs/{run_id}/verify")
    async def verify_run(run_id: str) -> dict:
        return engine.replay(run_id)

    @app.get("/api/runs/{run_id}/annotations")
    async def notes(run_id: str) -> list[dict]:
        research.configuration(run_id)
        with db.session() as session:
            return [
                {"id": n.id, "turn": n.turn, "label": n.label, "note": n.note, "created": n.created}
                for n in session.scalars(
                    select(Annotation)
                    .where(Annotation.run_id == run_id)
                    .order_by(Annotation.created)
                )
            ]

    @app.post("/api/runs/{run_id}/annotations", status_code=201)
    async def add_note(run_id: str, body: Note) -> dict:
        run, _, _ = research.configuration(run_id)
        if body.turn > run.turn:
            raise ValueError("Cannot annotate an unrecorded turn")
        with db.session.begin() as session:
            note = Annotation(run_id=run_id, **body.model_dump())
            session.add(note)
            session.flush()
            return {"id": note.id}

    @app.post("/api/plan", status_code=202)
    async def plan(body: Ask) -> dict:
        if body.study_id or body.run_id:
            raise ValueError("Design requests cannot change an existing run")
        return {"id": assistants.start(body.question, purpose="design")}

    @app.post("/api/analyses", status_code=202)
    async def ask(body: Ask) -> dict:
        if not body.run_id and not body.study_id:
            raise ValueError("Choose a run or study for analysis")
        return {
            "id": assistants.start(
                body.question, purpose="analysis", study_id=body.study_id, run_id=body.run_id
            )
        }

    @app.post("/api/agent", status_code=202)
    async def general_question(body: Ask) -> dict:
        if body.study_id or body.run_id:
            raise ValueError("Use scoped analysis for experiment or run questions")
        return {"id": assistants.start(body.question, purpose="general")}

    @app.get("/api/analyses")
    async def analyses(
        study_id: str | None = None,
        run_id: str | None = None,
        purpose: Literal["design", "general"] = "design",
    ) -> list[dict]:
        return assistants.list(study_id, run_id, purpose=purpose)

    @app.get("/api/analyses/{analysis_id}")
    async def get_analysis(analysis_id: str) -> dict:
        return assistants.get(analysis_id)

    @app.get("/api/chats")
    async def chats() -> list[dict]:
        return list(assistants.chats())

    @app.get("/api/chats/{chat_id}")
    async def chat(chat_id: str) -> list[dict]:
        return list(assistants.chat(chat_id))

    @app.post("/api/chats", status_code=202)
    async def send_chat(body: ChatMessage) -> dict:
        return assistants.send(body.question, body.context, body.chat_id)

    frontend = Path(static_dir or setting("STATIC_DIR", "frontend/dist")).resolve()

    @app.get("/{path:path}", include_in_schema=False)
    async def web(path: str):
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

    return app
