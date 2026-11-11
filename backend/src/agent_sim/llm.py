import asyncio
import json
import math
import os
from collections.abc import Callable, Iterator, Mapping
from dataclasses import replace
from typing import Any, Literal, TypedDict, TypeVar
from urllib.parse import urlparse

from pydantic import TypeAdapter
from pydantic_ai import Agent, ToolOutput, WebSearchTool, capture_run_messages
from pydantic_ai.capabilities import NativeTool
from pydantic_ai.messages import (
    ModelMessage,
    ModelMessagesTypeAdapter,
    ModelResponse,
    TextPart,
    ThinkingPart,
    ToolCallPart,
)
from pydantic_ai.models import Model
from pydantic_ai.models.openai import OpenAIResponsesModelSettings
from pydantic_ai.usage import UsageLimits
from pydantic_core import from_json
from sqlalchemy import func, select, update

from .config import setting
from .db import Analysis, Database, InvestigationRecord, ProviderCall, Run, Study, Workspace
from .diagnostics import log_failure
from .finite_contract import GenerationAuthorization
from .investigation_limits import InvestigationStopped, wait_ready

T = TypeVar("T")
PRICES: dict[str, tuple[float, float]] = {
    "openai:gpt-6-luna": (0.10, 0.50),
    "openai:gpt-6.1-sol": (2.0, 10.0),
    "openai:gpt-6.1-terra": (1.0, 5.0),
    "anthropic:claude-haiku-4-5": (1.0, 5.0),
}


class Usage(TypedDict):
    requests: int
    input_tokens: int
    output_tokens: int
    cost_usd: float
    partial: bool


def empty_usage() -> Usage:
    return {
        "requests": 0,
        "input_tokens": 0,
        "output_tokens": 0,
        "cost_usd": 0.0,
        "partial": False,
    }


def usage_record(row: Mapping[str, Any]) -> Usage:
    return {
        "requests": int(row["requests"]),
        "input_tokens": int(row["input_tokens"]),
        "output_tokens": int(row["output_tokens"]),
        "cost_usd": float(row["cost_usd"]),
        "partial": bool(row["partial"]),
    }


def partial_outputs(response: ModelResponse, *, web_search: bool) -> Iterator[dict]:
    """Decode provisional payloads; final validation remains the provider run's job."""
    for part in response.parts:
        if not isinstance(part, ToolCallPart):
            continue
        try:
            partial = (
                from_json(part.args, allow_partial="trailing-strings")
                if isinstance(part.args, str)
                else part.args
            )
        except ValueError:
            continue
        if isinstance(partial, dict):
            yield partial
    if web_search:
        yield {"text": "".join(p.content for p in response.parts if isinstance(p, TextPart))}


class ProviderFailure(Exception):
    pass


class LanguageModels:
    def __init__(self, db: Database):
        self.db = db
        self.models: dict[str, Model] = {}
        self.concurrency = int(setting("CONCURRENT_REQUESTS", "4"))
        if not 1 <= self.concurrency <= 32:
            raise ValueError("Concurrent provider requests must be between 1 and 32")
        self.capacity = asyncio.Semaphore(self.concurrency)

    def research_model(self, purpose: str, investigation_id: str | None = None) -> str:
        if investigation_id:
            with self.db.session() as session:
                return session.get_one(InvestigationRecord, investigation_id).authorization[
                    "researcher_model"
                ]
        return setting(
            "PLANNER_MODEL" if purpose == "design" else "ASSISTANT_MODEL", "openai:gpt-6.1-sol"
        )

    def model(self, name: str) -> Model:
        if name in self.models:
            return self.models[name]
        provider, model = name.split(":", 1)
        if not os.environ.get(f"{provider.upper()}_API_KEY"):
            raise ProviderFailure(f"{provider.upper()}_API_KEY is not configured.")
        if provider == "openai":
            from openai import AsyncOpenAI
            from pydantic_ai.models.openai import OpenAIResponsesModel
            from pydantic_ai.providers.openai import OpenAIProvider

            result = OpenAIResponsesModel(
                model, provider=OpenAIProvider(openai_client=AsyncOpenAI(max_retries=0))
            )
        elif provider == "anthropic":
            from anthropic import AsyncAnthropic
            from pydantic_ai.models.anthropic import AnthropicModel
            from pydantic_ai.providers.anthropic import AnthropicProvider

            result = AnthropicModel(
                model, provider=AnthropicProvider(anthropic_client=AsyncAnthropic(max_retries=0))
            )
        else:
            raise ProviderFailure("Unsupported provider")
        self.models[name] = result
        return result

    async def generate(
        self,
        output: type[T],
        *,
        model: str,
        prompt: str,
        instructions: str,
        purpose: str,
        study_id: str | None = None,
        run_id: str | None = None,
        analysis_id: str | None = None,
        activation_id: str | None = None,
        max_tokens: int = 4096,
        turn: int | None = None,
        openai_reasoning_effort: Literal["low", "medium", "high"] | None = None,
        web_search: bool = False,
        strict_output: bool | None = None,
        on_partial: Callable[[dict], None] | None = None,
        input_evidence: dict | None = None,
        on_reserved: Callable[[str], None] | None = None,
        before_reserve: Callable[[], None] | None = None,
    ) -> T:
        if model not in PRICES:
            raise ProviderFailure("This model has no reviewed price configuration.")
        if web_search and (model != "openai:gpt-6.1-sol" or output is not str):
            raise ValueError("Web research requires GPT-6.1 Sol text output")
        allowance = None
        if analysis_id:
            with self.db.session() as session:
                analysis = session.get_one(Analysis, analysis_id)
                if analysis.generation is not None:
                    allowance = GenerationAuthorization.model_validate(
                        analysis.generation["authorization"]
                    )
                    if model != "openai:gpt-6.1-sol":
                        raise ProviderFailure("Extension allowance authorizes only GPT-6.1 Sol.")
                    max_tokens = min(max_tokens, allowance.max_output_tokens)
        schema = TypeAdapter(output).json_schema()
        model_object = self.model(model)
        input_bound = len((prompt + instructions + json.dumps(schema)).encode()) + 4096
        if input_bound > (allowance.max_input_bytes if allowance else 180_000):
            raise ProviderFailure("Evidence exceeds this request's input limit; narrow the scope.")
        timeout = 180 if purpose == "design" else 90
        settings: OpenAIResponsesModelSettings = {"max_tokens": max_tokens, "timeout": timeout}
        if model.startswith("openai:") and openai_reasoning_effort is not None:
            settings["openai_reasoning_effort"] = openai_reasoning_effort
        input_rate, output_rate = PRICES[model]
        reserved = math.ceil(input_bound * input_rate * 1.25 + max_tokens * output_rate)
        if web_search:
            settings["openai_include_web_search_sources"] = True
            settings["extra_body"] = {"max_tool_calls": 2}
            # Search inputs are unknown until completion; reserve the model's full context.
            reserved = (
                math.ceil(1_050_000 * input_rate * 2 + max_tokens * output_rate * 1.5) + 20_000
            )
        investigation_id = None
        with self.db.session() as session:
            owner = (
                session.get(Analysis, analysis_id)
                if analysis_id
                else (session.get(Run, run_id) if run_id else None)
            )
            if owner and owner.investigation_id:
                investigation_id = owner.investigation_id
                if study_id is not None and study_id != owner.study_id:
                    raise ValueError("Request study does not match its investigation owner")
                study_id = owner.study_id
        await wait_ready(self.db, investigation_id)
        async with self.capacity:
            if before_reserve is not None:
                before_reserve()
            await wait_ready(self.db, investigation_id)
            if before_reserve is not None:
                before_reserve()
            call = ProviderCall(
                investigation_id=investigation_id,
                study_id=study_id,
                run_id=run_id,
                analysis_id=analysis_id,
                activation_id=activation_id,
                purpose=purpose,
                model=model,
                turn=turn,
                request_payload={
                    "instructions": instructions,
                    "prompt": prompt,
                    "schema": schema,
                    "strict_output": strict_output,
                    "web_search": web_search,
                    "settings": settings,
                    "price_per_million": [input_rate, output_rate],
                    "provider_adapter": {
                        "class": (
                            f"{type(model_object).__module__}.{type(model_object).__qualname__}"
                        ),
                        "model_name": model_object.model_name,
                        "system": model_object.system,
                    },
                    **({"input_evidence": input_evidence} if input_evidence is not None else {}),
                },
                reserved=reserved,
                charged=reserved,
            )
            self._reserve(call)
            messages, failure = [], None
            try:
                if on_reserved is not None:
                    on_reserved(call.id)
                agent = Agent(
                    model_object,
                    # Dynamic maps need the adapter's schema selection. Only closed
                    # records opt into strict mode; typed output always validates locally.
                    output_type=str if web_search else ToolOutput(output, strict=strict_output),
                    capabilities=[NativeTool(WebSearchTool(search_context_size="low"))]
                    if web_search
                    else [],
                    instructions=instructions,
                    retries=0,
                    model_settings=settings,
                )
                with capture_run_messages() as messages:
                    async with asyncio.timeout(timeout + 5):
                        if on_partial is None:
                            response = await agent.run(
                                prompt, usage_limits=UsageLimits(request_limit=1)
                            )
                            return response.output
                        async with agent.run_stream(
                            prompt, usage_limits=UsageLimits(request_limit=1)
                        ) as stream:
                            async for response in stream.stream_response(debounce_by=0.08):
                                for partial in partial_outputs(response, web_search=web_search):
                                    on_partial(partial)
                            return await stream.get_output()
            except (Exception, asyncio.CancelledError) as error:
                log_failure(f"Provider call {call.id} failed", error)
                failure = type(error).__name__
                status = getattr(error, "status_code", None)
                if isinstance(status, int):
                    failure += f" HTTP {status}"
                if isinstance(error, asyncio.CancelledError):
                    raise
                truncated = any(
                    isinstance(m, ModelResponse) and m.finish_reason == "length" for m in messages
                )
                detail = (
                    f"Output reached the {max_tokens}-token limit; increase response tokens. "
                    if truncated
                    else ""
                )
                raise ProviderFailure(
                    f"{model} request failed ({failure}). {detail}"
                    "No retry or substitute model was used."
                ) from error
            finally:
                try:
                    self._settle(call, messages, failure)
                except Exception as settlement_error:
                    if failure is None:
                        raise
                    log_failure(f"Provider call {call.id} settlement failed", settlement_error)

    def _reserve(self, call: ProviderCall) -> None:
        with self.db.session.begin() as session:
            if call.investigation_id:
                parent = session.get_one(InvestigationRecord, call.investigation_id)
                if call.purpose == "adjudication":
                    raise InvestigationStopped("adjudicator_outside_scope")
                expected = parent.authorization[
                    "researcher_model" if call.analysis_id else "participant_model"
                ]
                if call.model != expected:
                    raise InvestigationStopped("model_outside_scope")
                if (
                    session.execute(
                        update(InvestigationRecord)
                        .where(
                            InvestigationRecord.id == parent.id,
                            InvestigationRecord.status == "running",
                            InvestigationRecord.charged + call.reserved
                            <= InvestigationRecord.ceiling,
                            InvestigationRecord.requests < parent.authorization["max_requests"],
                        )
                        .values(
                            charged=InvestigationRecord.charged + call.reserved,
                            requests=InvestigationRecord.requests + 1,
                        )
                        .returning(InvestigationRecord.id)
                    ).scalar_one_or_none()
                    is None
                ):
                    raise InvestigationStopped(
                        parent.status
                        if parent.status != "running"
                        else "requests_allowance_exhausted"
                        if parent.requests >= parent.authorization["max_requests"]
                        else "spending_allowance_exhausted"
                    )
            if (
                session.execute(
                    update(Workspace)
                    .where(
                        Workspace.id == 1, Workspace.charged + call.reserved <= Workspace.ceiling
                    )
                    .values(charged=Workspace.charged + call.reserved)
                    .returning(Workspace.id)
                ).scalar_one_or_none()
                is None
            ):
                raise ProviderFailure("Workspace spending ceiling reached. No request was sent.")
            if (
                call.study_id
                and session.execute(
                    update(Study)
                    .where(
                        Study.id == call.study_id, Study.charged + call.reserved <= Study.ceiling
                    )
                    .values(charged=Study.charged + call.reserved)
                    .returning(Study.id)
                ).scalar_one_or_none()
                is None
            ):
                raise ProviderFailure("Study spending ceiling reached. No request was sent.")
            if call.analysis_id:
                analysis = session.get_one(Analysis, call.analysis_id)
                if analysis.generation is not None:
                    allowance = GenerationAuthorization.model_validate(
                        analysis.generation["authorization"]
                    )
                    if (
                        session.execute(
                            update(Analysis)
                            .where(
                                Analysis.id == call.analysis_id,
                                Analysis.generation_requests < allowance.max_requests,
                                Analysis.generation_charged + call.reserved
                                <= math.floor(allowance.budget_usd * 1_000_000),
                            )
                            .values(
                                generation_requests=Analysis.generation_requests + 1,
                                generation_charged=Analysis.generation_charged + call.reserved,
                            )
                            .returning(Analysis.id)
                        ).scalar_one_or_none()
                        is None
                    ):
                        raise ProviderFailure(
                            "Extension question request/spending allowance reached. "
                            "No request was sent."
                        )
            session.add(call)
            session.flush()

    def _settle(
        self, call: ProviderCall, messages: list[ModelMessage], failure: str | None
    ) -> None:
        payload = call.request_payload
        if payload is None:
            raise ValueError("Provider request is missing its accounting metadata")
        input_rate, output_rate = payload["price_per_million"]
        web_search = payload["web_search"]
        responses = [m for m in messages if isinstance(m, ModelResponse)]
        inputs = sum(m.usage.input_tokens for m in responses)
        outputs = sum(m.usage.output_tokens for m in responses)
        reasoning = sum(m.usage.details.get("reasoning_tokens", 0) for m in responses)
        search_calls = sum(m.usage.details.get("web_search_requests", 0) for m in responses)
        usage_known = bool(responses) and (failure is None or inputs + outputs + search_calls > 0)
        long_context = web_search and inputs > 272_000
        charged = (
            math.ceil(
                inputs * input_rate * (2 if long_context else 1)
                + outputs * output_rate * (1.5 if long_context else 1)
            )
            + search_calls * 10_000
            if usage_known
            else call.reserved
        )
        with self.db.session.begin() as session:
            record = session.get_one(ProviderCall, call.id)
            if record.status != "pending":
                return
            record.status = (
                "complete" if failure is None else "failed" if usage_known else "unknown"
            )
            record.response_payload = ModelMessagesTypeAdapter.dump_python(
                [
                    replace(
                        response,
                        parts=[
                            part for part in response.parts if not isinstance(part, ThinkingPart)
                        ],
                    )
                    for response in responses
                ],
                mode="json",
            )
            record.error = failure
            record.charged = charged
            record.input_tokens, record.output_tokens = inputs, outputs
            record.reasoning_tokens = reasoning
            if call.investigation_id:
                session.execute(
                    update(InvestigationRecord)
                    .where(InvestigationRecord.id == call.investigation_id)
                    .values(charged=InvestigationRecord.charged + charged - call.reserved)
                )
            session.execute(
                update(Workspace)
                .where(Workspace.id == 1)
                .values(charged=Workspace.charged + charged - call.reserved)
            )
            if call.study_id:
                session.execute(
                    update(Study)
                    .where(Study.id == call.study_id)
                    .values(charged=Study.charged + charged - call.reserved)
                )
            if call.analysis_id:
                analysis = session.get_one(Analysis, call.analysis_id)
                if analysis.generation is not None:
                    session.execute(
                        update(Analysis)
                        .where(
                            Analysis.id == call.analysis_id,
                        )
                        .values(
                            generation_charged=Analysis.generation_charged + charged - call.reserved
                        )
                    )

    async def close(self) -> None:
        for model in self.models.values():
            client = getattr(model, "client", None)
            if client is not None:
                await client.close()

    def recover(self) -> None:
        with self.db.session.begin() as session:
            session.execute(
                update(ProviderCall)
                .where(ProviderCall.status == "pending")
                .values(status="unknown", error="Server stopped; reserved cost retained.")
            )

    @staticmethod
    def catalog() -> list[dict]:
        return [
            {"id": model, "input_per_million": price[0], "output_per_million": price[1]}
            for model, price in PRICES.items()
        ]

    @staticmethod
    def usage_columns():
        return (
            func.count(ProviderCall.id).label("requests"),
            func.coalesce(func.sum(ProviderCall.input_tokens), 0).label("input_tokens"),
            func.coalesce(func.sum(ProviderCall.output_tokens), 0).label("output_tokens"),
            (func.coalesce(func.sum(ProviderCall.charged), 0) / 1_000_000).label("cost_usd"),
            func.max(ProviderCall.status.in_(["pending", "unknown"])).label("partial"),
        )

    def usage(
        self,
        study_id: str | None = None,
        run_id: str | None = None,
        analysis_id: str | None = None,
        investigation_id: str | None = None,
    ) -> Usage:
        query = select(*self.usage_columns())
        if study_id:
            query = query.where(ProviderCall.study_id == study_id)
        if run_id:
            query = query.where(ProviderCall.run_id == run_id)
        if analysis_id:
            query = query.where(ProviderCall.analysis_id == analysis_id)
        if investigation_id:
            query = query.where(ProviderCall.investigation_id == investigation_id)
        with self.db.session() as session:
            return usage_record(session.execute(query).mappings().one())

    def usage_by_run(self, run_ids: set[str]) -> dict[str, Usage]:
        return self._group_usage(ProviderCall.run_id, run_ids)

    def usage_by_analysis(self, analysis_ids: set[str]) -> dict[str, Usage]:
        return self._group_usage(ProviderCall.analysis_id, analysis_ids)

    def _group_usage(self, column, keys: set[str]) -> dict[str, Usage]:
        with self.db.session() as session:
            rows = session.execute(
                select(column.label("key"), *self.usage_columns())
                .where(column.in_(keys))
                .group_by(column)
            ).mappings()
            return {row["key"]: usage_record(row) for row in rows}

    def sources(self, analysis_id: str) -> list[dict[str, str]]:
        found = {}
        with self.db.session() as session:
            calls = session.scalars(
                select(ProviderCall).where(ProviderCall.analysis_id == analysis_id)
            )
            for call in calls:
                found.update(
                    (source["url"], source) for source in web_sources(call.response_payload)
                )
        return list(found.values())


def web_sources(messages: list[dict] | None) -> list[dict[str, str]]:
    parts = (
        part
        for message in messages or []
        for part in message.get("parts", [])
        if part.get("tool_name") == "web_search"
    )
    found = {}
    for part in parts:
        content = part.get("content")
        if not isinstance(content, dict):
            continue
        for source in content.get("sources", []):
            normalized = research_source(source)
            if normalized is not None:
                found[normalized["url"]] = normalized
    return list(found.values())


def research_source(source: object) -> dict[str, str] | None:
    if not isinstance(source, dict) or not isinstance(source.get("url"), str):
        return None
    url = source["url"]
    try:
        parsed = urlparse(url)
        if parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.username:
            return None
    except ValueError:
        return None
    title = source.get("title")
    return {"url": url, "title": title if isinstance(title, str) and title else parsed.hostname}
