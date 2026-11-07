import asyncio
import json
import math
import os
from typing import Literal, TypeVar

from pydantic import BaseModel
from pydantic_ai import Agent, ToolOutput, capture_run_messages
from pydantic_ai.messages import ModelMessagesTypeAdapter, ModelResponse
from pydantic_ai.models import Model
from pydantic_ai.models.openai import OpenAIResponsesModelSettings
from pydantic_ai.usage import UsageLimits
from sqlalchemy import func, select, update

from .db import Database, ProviderCall, Study, Workspace

T = TypeVar("T", bound=BaseModel)
PRICES: dict[str, tuple[float, float]] = {
    "openai:gpt-6-luna": (0.10, 0.50),
    "openai:gpt-6.1-sol": (2.0, 10.0),
    "openai:gpt-6.1-terra": (1.0, 5.0),
    "anthropic:claude-haiku-4-5": (1.0, 5.0),
}


class ProviderFailure(Exception):
    pass


class LanguageModels:
    def __init__(self, db: Database):
        self.db = db
        self.models: dict[str, Model] = {}
        self.capacity = asyncio.Semaphore(4)

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
        max_tokens: int = 4096,
        turn: int | None = None,
        openai_reasoning_effort: Literal["low", "medium", "high"] | None = None,
    ) -> T:
        if model not in PRICES:
            raise ProviderFailure("This model has no reviewed price configuration.")
        model_object = self.model(model)
        input_bound = (
            len((prompt + instructions + json.dumps(output.model_json_schema())).encode()) + 4096
        )
        if input_bound > 180_000:
            raise ProviderFailure("Evidence exceeds this request's input limit; narrow the scope.")
        settings: OpenAIResponsesModelSettings = {"max_tokens": max_tokens, "timeout": 90}
        if model.startswith("openai:") and openai_reasoning_effort is not None:
            settings["openai_reasoning_effort"] = openai_reasoning_effort
        input_rate, output_rate = PRICES[model]
        reserved = math.ceil(input_bound * input_rate * 1.25 + max_tokens * output_rate)
        async with self.capacity:
            with self.db.session.begin() as session:
                if (
                    session.execute(
                        update(Workspace)
                        .where(Workspace.id == 1, Workspace.charged + reserved <= Workspace.ceiling)
                        .values(charged=Workspace.charged + reserved)
                        .returning(Workspace.id)
                    ).scalar_one_or_none()
                    is None
                ):
                    raise ProviderFailure(
                        "Workspace spending ceiling reached. No request was sent."
                    )
                if (
                    study_id
                    and session.execute(
                        update(Study)
                        .where(Study.id == study_id, Study.charged + reserved <= Study.ceiling)
                        .values(charged=Study.charged + reserved)
                        .returning(Study.id)
                    ).scalar_one_or_none()
                    is None
                ):
                    raise ProviderFailure("Study spending ceiling reached. No request was sent.")
                call = ProviderCall(
                    study_id=study_id,
                    run_id=run_id,
                    analysis_id=analysis_id,
                    purpose=purpose,
                    model=model,
                    turn=turn,
                    request_payload={
                        "instructions": instructions,
                        "prompt": prompt,
                        "schema": output.model_json_schema(),
                        "settings": settings,
                        "price_per_million": [input_rate, output_rate],
                    },
                    reserved=reserved,
                    charged=reserved,
                )
                session.add(call)
                session.flush()
                call_id = call.id
            messages, failure = [], None
            try:
                agent = Agent(
                    model_object,
                    output_type=ToolOutput(output, strict=True),
                    instructions=instructions,
                    retries=0,
                    model_settings=settings,
                )
                with capture_run_messages() as messages:
                    async with asyncio.timeout(95):
                        response = await agent.run(
                            prompt, usage_limits=UsageLimits(request_limit=1)
                        )
                return response.output
            except (Exception, asyncio.CancelledError) as error:
                failure = type(error).__name__
                status = getattr(error, "status_code", None)
                if isinstance(status, int):
                    failure += f" HTTP {status}"
                if isinstance(error, asyncio.CancelledError):
                    raise
                raise ProviderFailure(
                    f"{model} request failed ({failure}). No retry or substitute model was used."
                ) from None
            finally:
                responses = [m for m in messages if isinstance(m, ModelResponse)]
                inputs = sum(m.usage.input_tokens for m in responses)
                outputs = sum(m.usage.output_tokens for m in responses)
                reasoning = sum(m.usage.details.get("reasoning_tokens", 0) for m in responses)
                charged = (
                    math.ceil(inputs * input_rate + outputs * output_rate)
                    if responses
                    else reserved
                )
                with self.db.session.begin() as session:
                    record = session.get_one(ProviderCall, call_id)
                    record.status = (
                        "complete" if failure is None else "failed" if responses else "unknown"
                    )
                    record.response_payload = ModelMessagesTypeAdapter.dump_python(
                        [*responses], mode="json"
                    )
                    record.error = failure
                    record.charged = charged
                    record.input_tokens, record.output_tokens = inputs, outputs
                    record.reasoning_tokens = reasoning
                    session.execute(
                        update(Workspace)
                        .where(Workspace.id == 1)
                        .values(charged=Workspace.charged + charged - reserved)
                    )
                    if study_id:
                        session.execute(
                            update(Study)
                            .where(Study.id == study_id)
                            .values(charged=Study.charged + charged - reserved)
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
        self, study_id: str | None = None, run_id: str | None = None, analysis_id: str | None = None
    ) -> dict:
        query = select(*self.usage_columns())
        if study_id:
            query = query.where(ProviderCall.study_id == study_id)
        if run_id:
            query = query.where(ProviderCall.run_id == run_id)
        if analysis_id:
            query = query.where(ProviderCall.analysis_id == analysis_id)
        with self.db.session() as session:
            result = dict(session.execute(query).mappings().one())
        result["cost_usd"], result["partial"] = float(result["cost_usd"]), bool(result["partial"])
        return result

    def usage_by_run(self, run_ids: set[str]) -> dict[str, dict]:
        return self._group_usage(ProviderCall.run_id, run_ids)

    def usage_by_analysis(self, analysis_ids: set[str]) -> dict[str, dict]:
        return self._group_usage(ProviderCall.analysis_id, analysis_ids)

    def _group_usage(self, column, keys: set[str]) -> dict[str, dict]:
        with self.db.session() as session:
            rows = session.execute(
                select(column.label("key"), *self.usage_columns())
                .where(column.in_(keys))
                .group_by(column)
            ).mappings()
            return {
                row["key"]: {
                    key: float(value) if key == "cost_usd" else value
                    for key, value in row.items()
                    if key != "key"
                }
                for row in rows
            }
