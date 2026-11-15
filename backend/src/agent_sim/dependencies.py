"""HTTP access to the services owned by one app instance."""

from typing import Annotated

from fastapi import Depends, Request

from .assistants import Assistants
from .db import Database
from .execution import Engine
from .extensions import Extensions
from .llm import LanguageModels
from .research import Research


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
