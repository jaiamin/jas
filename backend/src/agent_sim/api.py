from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from fastapi import FastAPI, Request
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import NoResultFound
from starlette.middleware.base import RequestResponseEndpoint
from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.responses import Response

from .assistants import Assistants
from .config import setting
from .db import Database
from .domain import Strict
from .environment_library import EnvironmentConflict
from .execution import Engine
from .investigations import Investigations
from .llm import LanguageModels, ProviderFailure
from .research import Research
from .routes import router, web_router


class ErrorResponse(Strict):
    detail: str | list[dict[str, Any]]


async def same_origin(request: Request, call_next: RequestResponseEndpoint) -> Response:
    origin = request.headers.get("origin")
    if request.method not in ("GET", "HEAD", "OPTIONS") and origin:
        allowed = {request.headers.get("host"), "localhost:5173", "127.0.0.1:5173"}
        if urlparse(origin).netloc not in allowed:
            return JSONResponse({"detail": "Cross-origin writes are not allowed"}, status_code=403)
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "same-origin"
    return response


async def invalid(_request: Request, error: Exception) -> JSONResponse:
    return JSONResponse({"detail": str(error)}, status_code=422)


async def missing(_request: Request, _error: Exception) -> JSONResponse:
    return JSONResponse({"detail": "Record not found"}, status_code=404)


async def provider_error(_request: Request, error: Exception) -> JSONResponse:
    return JSONResponse({"detail": str(error)}, status_code=409)


def create_app(
    database_url: str | None = None,
    *,
    budget_usd: float | None = None,
    static_dir: str | Path | None = None,
    concurrent_runs: int | None = None,
) -> FastAPI:
    db = Database(
        database_url or setting("DATABASE_URL", "sqlite:///data/jas.sqlite3"),
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
    investigations = Investigations(db, research, models, assistants, engine)
    extensions = research.extensions

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        yield
        await investigations.close()
        await engine.close()
        await assistants.close()
        await models.close()
        research.environments.close()
        extensions.close()
        db.close()

    app = FastAPI(
        title="JAS",
        version="0.2.0",
        lifespan=lifespan,
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
        responses={status: {"model": ErrorResponse} for status in (403, 404, 409, 422)},
    )
    app.state.db, app.state.models = db, models
    app.state.research, app.state.engine, app.state.assistants = research, engine, assistants
    app.state.extensions = extensions
    app.state.investigations = investigations
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    app.state.frontend = Path(static_dir or setting("STATIC_DIR", "frontend/dist")).resolve()
    app.middleware("http")(same_origin)
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=[
            host.strip()
            for host in setting("ALLOWED_HOSTS", "localhost,127.0.0.1,[::1]").split(",")
            if host.strip()
        ],
        www_redirect=False,
    )
    app.add_exception_handler(EnvironmentConflict, provider_error)
    app.add_exception_handler(ValueError, invalid)
    app.add_exception_handler(NoResultFound, missing)
    app.add_exception_handler(ProviderFailure, provider_error)
    app.include_router(router)
    app.include_router(web_router)

    return app
