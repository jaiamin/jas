from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.engine import make_url
from sqlalchemy.exc import NoResultFound
from starlette.middleware.trustedhost import TrustedHostMiddleware

from .access import BasicAuthMiddleware, access_credentials
from .assistants import Assistants
from .config import setting
from .db import Database
from .domain import Strict
from .environment_library import EnvironmentConflict
from .execution import Engine
from .http_middleware import SameOriginMiddleware, invalid, invalid_request
from .llm import LanguageModels, ProviderFailure
from .paths import static_directory
from .providers import ModelRegistry
from .publishing import GalleryError
from .publishing_routes import router as publishing_router
from .research import Research
from .routes import router, web_router
from .settings_routes import router as settings_router


class ErrorResponse(Strict):
    detail: str | list[dict[str, Any]]


async def gallery_error(_request: Request, error: Exception) -> JSONResponse:
    if not isinstance(error, GalleryError):
        raise error
    return JSONResponse({"detail": str(error)}, status_code=error.status_code)


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
    credentials = access_credentials()
    database_url = database_url or setting("DATABASE_URL", "sqlite:///data/jas.sqlite3")
    registry = ModelRegistry(make_url(database_url).database)
    ceiling = budget_usd
    if ceiling is None:
        ceiling = registry.configuration.workspace_budget_usd
    if ceiling is None:
        ceiling = float(setting("BUDGET_USD", "25"))
    db = Database(
        database_url,
        round(ceiling * 1_000_000),
    )
    models = LanguageModels(db, registry=registry)
    research = Research(db, models)
    engine = Engine(
        db,
        research,
        models,
        concurrent_runs if concurrent_runs is not None else int(setting("CONCURRENT_RUNS", "3")),
    )
    assistants = Assistants(db, research, models)
    extensions = research.extensions

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        yield
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
    app.add_exception_handler(RequestValidationError, invalid_request)
    app.state.db, app.state.models = db, models
    app.state.research, app.state.engine, app.state.assistants = research, engine, assistants
    app.state.extensions = extensions
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    app.state.frontend = Path(static_dir).resolve() if static_dir else static_directory()
    app.add_middleware(BasicAuthMiddleware, credentials=credentials)
    app.add_middleware(SameOriginMiddleware)
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
    app.add_exception_handler(GalleryError, gallery_error)
    app.add_exception_handler(NoResultFound, missing)
    app.add_exception_handler(ProviderFailure, provider_error)
    app.include_router(router)
    app.include_router(settings_router)
    app.include_router(publishing_router)
    app.include_router(web_router)

    return app
