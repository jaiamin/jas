import asyncio
import json
import math
from collections.abc import Callable, Iterator, Mapping
from contextlib import AsyncExitStack
from dataclasses import replace
from decimal import Decimal
from typing import Any, Literal, TypedDict, TypeVar
from urllib.parse import urlparse

from pydantic import TypeAdapter, ValidationError
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
from sqlalchemy import case, func, select, update

from .config import setting
from .db import Condition, Database, ProviderCall, Revision, Run, Study, Workspace
from .diagnostics import log_failure
from .domain import Design
from .providers import PRICES, ModelRegistry

T = TypeVar("T")
MAX_INPUT_BYTES = 180_000


def prompt_byte_limit(output: type, instructions: str) -> int:
    schema = TypeAdapter(output).json_schema()
    return MAX_INPUT_BYTES - len((instructions + json.dumps(schema)).encode()) - 4096


def web_research_reservation(model: str, max_tokens: int) -> int:
    input_rate, output_rate = PRICES[model]
    # Search inputs are unknown until completion; reserve the model's full context.
    return math.ceil(1_050_000 * input_rate * 2 + max_tokens * output_rate * 1.5) + 20_000


class Usage(TypedDict):
    requests: int
    input_tokens: int
    output_tokens: int
    cost_usd: float | None
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
        "cost_usd": None if row["unpriced"] else float(row["cost_usd"]),
        "partial": bool(row["partial"]),
    }


def recorded_cost(
    model: str, price: list[float] | None, responses: list[ModelResponse], *, web_search: bool
) -> int:
    costs = [response.usage.cost for response in responses if response.usage.cost is not None]
    # The SDK includes cache pricing and native tools; custom prices remain authoritative.
    if responses and price and tuple(price) == PRICES.get(model) and len(costs) == len(responses):
        if any(not cost.is_finite() or cost < 0 for cost in costs):
            raise ValueError("Provider returned an invalid usage cost")
        return math.ceil(sum(costs, Decimal(0)) * 1_000_000)
    input_rate, output_rate = (Decimal(str(rate)) for rate in (price or (0, 0)))
    inputs = sum(response.usage.input_tokens for response in responses)
    outputs = sum(response.usage.output_tokens for response in responses)
    searches = sum(response.usage.details.get("web_search_requests", 0) for response in responses)
    long_context = web_search and inputs > 272_000
    return (
        math.ceil(
            inputs * input_rate * (2 if long_context else 1)
            + outputs * output_rate * (Decimal("1.5") if long_context else 1)
        )
        + searches * 10_000
    )


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


class OutputValidationFailure(ProviderFailure):
    """A settled structured response rejected locally; never a transport retry signal."""

    def __init__(self, message: str, call_id: str, proposal: dict, issues: list[dict]):
        super().__init__(message)
        self.call_id, self.proposal, self.issues = call_id, proposal, issues


def _invalid_output(
    error: BaseException, messages: list[ModelMessage]
) -> tuple[dict, list[dict]] | None:
    cause: BaseException | None = error
    for _ in range(8):
        if cause is None:
            return None
        if isinstance(cause, ValidationError):
            calls = [
                part
                for message in messages
                if isinstance(message, ModelResponse)
                for part in message.parts
                if isinstance(part, ToolCallPart)
            ]
            if len(calls) != 1:
                return None
            args = calls[0].args
            try:
                value = json.loads(args) if isinstance(args, str) else args
            except ValueError:
                return None
            if isinstance(value, dict):
                return value, [
                    dict(issue)
                    for issue in cause.errors(
                        include_input=False, include_url=False, include_context=False
                    )
                ]
            return None
        cause = cause.__cause__ or cause.__context__
    return None


def _validation_detail(error: BaseException | None) -> str:
    for _ in range(8):
        if error is None:
            break
        if isinstance(error, ValidationError):
            for issue in error.errors(include_input=False):
                if issue["type"] == "string_too_long" and issue["loc"] in {
                    ("design", "title"),
                    ("design", "hypothesis"),
                    ("design", "context"),
                    ("explanation",),
                    ("summary",),
                }:
                    field = ".".join(str(part) for part in issue["loc"])
                    limit = issue["ctx"]["max_length"]
                    return f"Generated field {field} exceeds its {limit}-character limit. "
            return "The generated response did not match its required schema. "
        error = error.__cause__ or error.__context__
    return ""


class LanguageModels:
    @staticmethod
    def request_concurrency(value: int | None = None) -> int:
        limit = int(setting("CONCURRENT_REQUESTS", "4")) if value is None else value
        if not 1 <= limit <= 32:
            raise ValueError("Concurrent provider requests must be between 1 and 32")
        return limit

    def __init__(
        self,
        db: Database,
        *,
        registry: ModelRegistry | None = None,
        concurrent_requests: int | None = None,
    ):
        self.concurrency = self.request_concurrency(concurrent_requests)
        self.db = db
        self.registry = registry if registry is not None else ModelRegistry(db.engine.url.database)
        self.models: dict[str, Model] = {}
        self.retired_models: list[Model] = []
        self.capacity = asyncio.Semaphore(self.concurrency)

    def research_model(self, purpose: str) -> str:
        preferences = self.registry.configuration.preferences
        selected = preferences.planner_model if purpose == "design" else preferences.assistant_model
        if selected is not None:
            return selected
        return setting(
            "PLANNER_MODEL" if purpose == "design" else "ASSISTANT_MODEL",
            "openai:gpt-6.1-sol",
        )

    def web_research_available(self, max_tokens: int = 4096) -> bool:
        if not self.registry.configuration.preferences.planner_web_research:
            return False
        model = self.research_model("design")
        if model != "openai:gpt-6.1-sol" or self.registry.price(model) != PRICES[model]:
            return False
        reserved = web_research_reservation(model, max_tokens)
        with self.db.session() as session:
            workspace = session.get_one(Workspace, 1)
            return workspace.charged + reserved <= workspace.ceiling

    def model(self, name: str) -> Model:
        if name in self.models:
            return self.models[name]
        provider, model = name.split(":", 1)
        try:
            configuration = self.registry.provider(provider)
        except ValueError as error:
            raise ProviderFailure(str(error)) from error
        if not configuration.api_key and configuration.kind != "compatible":
            raise ProviderFailure(
                f"{provider.upper()}_API_KEY is not configured. Add it in Settings."
            )
        if configuration.kind == "openai":
            from openai import AsyncOpenAI
            from pydantic_ai.models.openai import OpenAIResponsesModel
            from pydantic_ai.providers.openai import OpenAIProvider

            result = OpenAIResponsesModel(
                model,
                provider=OpenAIProvider(
                    openai_client=AsyncOpenAI(
                        api_key=configuration.api_key,
                        base_url=configuration.base_url,
                        max_retries=0,
                    )
                ),
            )
        elif configuration.kind == "anthropic":
            from anthropic import AsyncAnthropic
            from pydantic_ai.models.anthropic import AnthropicModel
            from pydantic_ai.providers.anthropic import AnthropicProvider

            result = AnthropicModel(
                model,
                provider=AnthropicProvider(
                    anthropic_client=AsyncAnthropic(
                        api_key=configuration.api_key,
                        base_url=configuration.base_url,
                        max_retries=0,
                    )
                ),
            )
        else:
            from openai import AsyncOpenAI
            from pydantic_ai.models.openai import OpenAIChatModel
            from pydantic_ai.models.openrouter import OpenRouterModel
            from pydantic_ai.providers.openai_compatible import OpenAICompatibleProvider
            from pydantic_ai.providers.openrouter import OpenRouterProvider

            client = AsyncOpenAI(
                api_key=configuration.api_key or "jas-local",
                base_url=configuration.base_url,
                max_retries=0,
            )
            result = (
                OpenRouterModel(model, provider=OpenRouterProvider(openai_client=client))
                if configuration.kind == "openrouter"
                else OpenAIChatModel(
                    model, provider=OpenAICompatibleProvider(provider, openai_client=client)
                )
            )
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
        price = self.registry.price(model)
        if web_search and (
            model != "openai:gpt-6.1-sol" or output is not str or price != PRICES[model]
        ):
            raise ValueError("Web research requires GPT-6.1 Sol text output and bundled prices")
        schema = TypeAdapter(output).json_schema()
        model_object = self.model(model)
        input_bound = len((prompt + instructions + json.dumps(schema)).encode()) + 4096
        if input_bound > MAX_INPUT_BYTES:
            raise ProviderFailure("Evidence exceeds this request's input limit; narrow the scope.")
        timeout = 180 if purpose == "design" else 90
        settings: OpenAIResponsesModelSettings = {"max_tokens": max_tokens, "timeout": timeout}
        if model.startswith("openai:") and openai_reasoning_effort is not None:
            settings["openai_reasoning_effort"] = openai_reasoning_effort
        reserved = math.ceil(input_bound * price[0] * 1.25 + max_tokens * price[1]) if price else 0
        if web_search:
            settings["openai_include_web_search_sources"] = True
            settings["extra_body"] = {"max_tool_calls": 2}
            reserved = web_research_reservation(model, max_tokens)
        async with self.capacity:
            if before_reserve is not None:
                before_reserve()
            call = ProviderCall(
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
                    "price_per_million": list(price) if price else None,
                    **({"unpriced": True} if price is None else {}),
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
            self._reserve(call, token_reservation=input_bound + max_tokens)
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
                    else _validation_detail(error)
                )
                message = (
                    f"{model} request failed ({failure}). {detail}"
                    "No retry or substitute model was used."
                )
                if not truncated and (invalid := _invalid_output(error, messages)) is not None:
                    proposal, issues = invalid
                    raise OutputValidationFailure(message, call.id, proposal, issues) from error
                raise ProviderFailure(message) from error
            finally:
                try:
                    self._settle(call, messages, failure)
                except Exception as settlement_error:
                    if failure is None:
                        raise
                    log_failure(f"Provider call {call.id} settlement failed", settlement_error)

    def _reserve(self, call: ProviderCall, *, token_reservation: int | None = None) -> None:
        with self.db.session.begin() as session:
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
            self._reserve_tokens(session, call, token_reservation)
            session.add(call)
            session.flush()

    @staticmethod
    def token_charge():
        return case(
            (
                ProviderCall.status.in_(["pending", "unknown"]),
                func.coalesce(
                    ProviderCall.request_payload["token_reservation"].as_integer(),
                    MAX_INPUT_BYTES + 8192,
                ),
            ),
            else_=ProviderCall.input_tokens + ProviderCall.output_tokens,
        )

    def token_usage(self) -> int:
        with self.db.session() as session:
            return session.scalar(select(func.coalesce(func.sum(self.token_charge()), 0)))

    def _reserve_tokens(self, session, call: ProviderCall, allowance: int | None) -> None:
        payload = call.request_payload or {}
        allowance = allowance or payload.get("token_reservation", MAX_INPUT_BYTES + 8192)
        workspace_limit = self.registry.configuration.preferences.token_budget
        experiment_limit = None
        if call.study_id:
            query = select(Revision.design)
            if call.run_id:
                query = query.join(Condition).join(Run).where(Run.id == call.run_id)
            else:
                query = query.join(Study).where(
                    Study.id == call.study_id, Revision.number == Study.revision
                )
            protocol = session.scalar(query)
            experiment_limit = protocol.get("token_budget") if protocol else None
        if payload.get("unpriced") and experiment_limit is None and workspace_limit is None:
            raise ProviderFailure(
                "This model has no price. Set an explicit token cap in the experiment or Settings; "
                "a dollar cap cannot bound an unpriced model. No request was sent."
            )
        if workspace_limit is None and experiment_limit is None:
            return
        call.request_payload = {**payload, "token_reservation": allowance}
        for label, limit, study_id in (
            ("Workspace", workspace_limit, None),
            ("Experiment", experiment_limit, call.study_id),
        ):
            if limit is None:
                continue
            query = select(func.coalesce(func.sum(self.token_charge()), 0))
            if study_id:
                query = query.where(ProviderCall.study_id == study_id)
            if session.scalar(query) + allowance > limit:
                raise ProviderFailure(f"{label} token ceiling reached. No request was sent.")

    def _settle(
        self, call: ProviderCall, messages: list[ModelMessage], failure: str | None
    ) -> None:
        payload = call.request_payload
        if payload is None:
            raise ValueError("Provider request is missing its accounting metadata")
        responses = [m for m in messages if isinstance(m, ModelResponse)]
        inputs = sum(m.usage.input_tokens for m in responses)
        outputs = sum(m.usage.output_tokens for m in responses)
        reasoning = sum(m.usage.details.get("reasoning_tokens", 0) for m in responses)
        search_calls = sum(m.usage.details.get("web_search_requests", 0) for m in responses)
        usage_known = (
            bool(responses)
            and not any(response.usage.unmeasured_requests for response in responses)
            and (failure is None or inputs + outputs + search_calls > 0)
        )
        charged = (
            recorded_cost(
                call.model,
                payload["price_per_million"],
                responses,
                web_search=payload["web_search"],
            )
            if usage_known
            else call.reserved
        )
        with self.db.session.begin() as session:
            record = session.get_one(ProviderCall, call.id)
            if record.status != "pending":
                return
            record.status = (
                "unknown" if not usage_known else "complete" if failure is None else "failed"
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

    def retire_adapters(self) -> None:
        self.retired_models.extend(self.models.values())
        self.models.clear()

    async def close(self) -> None:
        async with AsyncExitStack() as cleanup:
            for model in reversed([*self.models.values(), *self.retired_models]):
                client = getattr(model, "client", None)
                if client is not None:
                    cleanup.push_async_callback(client.close)

    def recover(self) -> None:
        with self.db.session.begin() as session:
            session.execute(
                update(ProviderCall)
                .where(ProviderCall.status == "pending")
                .values(status="unknown", error="Server stopped; reserved cost retained.")
            )

    def catalog(self) -> list[dict]:
        return self.registry.catalog()

    def assistant_estimate(self, purpose: str) -> dict:
        planner = self.research_model("design")
        assistant = self.research_model("general")
        # Includes every bounded scoping, drafting and review attempt, including a handoff.
        calls = [(assistant, 8192)] * 4 if purpose == "analysis" else []
        if purpose == "general":
            calls += [(assistant, 4096)] * 4
        if purpose != "analysis":
            calls += [(planner, 4096)] * 2 + [(planner, 16384)] * 3 + [(planner, 8192)] * 3
        total = 0
        priced = True
        for name, response_tokens in calls:
            price = self.registry.price(name)
            if price is None:
                priced = False
            else:
                total += math.ceil(MAX_INPUT_BYTES * price[0] * 1.25 + response_tokens * price[1])
        if purpose != "analysis" and self.web_research_available():
            calls.append((planner, 4096))
            total += web_research_reservation(planner, 4096)
        return {"max_requests": len(calls), "upper_usd": total / 1_000_000 if priced else None}

    def estimate(self, design: Design) -> dict:
        requests, known_cost, tokens = 0, 0, 0
        unpriced: set[str] = set()
        multiplier = len(design.seeds) * design.repetitions
        for condition in design.conditions:
            profiles = design.resolve(condition).profiles
            names = {profile.model or condition.model for profile in profiles}
            if condition.harness.kind != "scripted":
                count = design.turn_count * condition.harness.max_requests * multiplier
                prices = [self.registry.price(name) for name in names]
                unpriced.update(name for name in names if self.registry.price(name) is None)
                known_cost += count * max(
                    (
                        math.ceil(MAX_INPUT_BYTES * p[0] * 1.25 + design.response_tokens * p[1])
                        for p in prices
                        if p is not None
                    ),
                    default=0,
                )
                requests += count
                tokens += count * (MAX_INPUT_BYTES + design.response_tokens)
            if condition.adjudicator:
                count = design.turn_count * multiplier
                price = self.registry.price(condition.adjudicator.model)
                if price is None:
                    unpriced.add(condition.adjudicator.model)
                else:
                    known_cost += count * math.ceil(
                        MAX_INPUT_BYTES * price[0] * 1.25
                        + condition.adjudicator.response_tokens * price[1]
                    )
                requests += count
                tokens += count * (MAX_INPUT_BYTES + condition.adjudicator.response_tokens)
        return {
            "runs": len(design.conditions) * multiplier,
            "max_requests": requests,
            "max_tokens": tokens,
            "upper_usd": None if unpriced else known_cost / 1_000_000,
            "unpriced_models": sorted(unpriced),
            "dollar_cap_usd": design.budget_usd,
            "token_cap": design.token_budget,
            "assumptions": "Conservative bound using every turn and harness request allowance, "
            "maximum input size and response limit; runs may end earlier. Token caps do not "
            "guarantee a dollar cost for unpriced models. No provider request was sent.",
        }

    @staticmethod
    def usage_columns():
        return (
            func.count(ProviderCall.id).label("requests"),
            func.coalesce(func.sum(ProviderCall.input_tokens), 0).label("input_tokens"),
            func.coalesce(func.sum(ProviderCall.output_tokens), 0).label("output_tokens"),
            (func.coalesce(func.sum(ProviderCall.charged), 0) / 1_000_000).label("cost_usd"),
            func.max(ProviderCall.status.in_(["pending", "unknown"])).label("partial"),
            func.max(ProviderCall.request_payload["unpriced"].as_boolean()).label("unpriced"),
        )

    def usage(
        self,
        study_id: str | None = None,
        run_id: str | None = None,
        analysis_id: str | None = None,
    ) -> Usage:
        query = select(*self.usage_columns())
        if study_id:
            query = query.where(ProviderCall.study_id == study_id)
        if run_id:
            query = query.where(ProviderCall.run_id == run_id)
        if analysis_id:
            query = query.where(ProviderCall.analysis_id == analysis_id)
        with self.db.session() as session:
            return usage_record(session.execute(query).mappings().one())

    def usage_by_run(self, run_ids: set[str]) -> dict[str, Usage]:
        return self._group_usage(ProviderCall.run_id, run_ids)

    def usage_by_analysis(self, analysis_ids: set[str]) -> dict[str, Usage]:
        return self._group_usage(ProviderCall.analysis_id, analysis_ids)

    def models_by_analysis(self, analysis_ids: set[str]) -> dict[str, list[str]]:
        result: dict[str, list[str]] = {}
        with self.db.session() as session:
            rows = session.execute(
                select(ProviderCall.analysis_id, ProviderCall.model)
                .where(ProviderCall.analysis_id.in_(analysis_ids))
                .distinct()
                .order_by(ProviderCall.model)
            )
            for key, model in rows:
                if key is not None:
                    result.setdefault(key, []).append(model)
        return result

    def usage_by_study(self, study_ids: set[str]) -> dict[str, Usage]:
        return self._group_usage(ProviderCall.study_id, study_ids)

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
