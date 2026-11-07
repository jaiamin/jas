import json

import pytest
from agent_sim.db import Database
from agent_sim.domain import Design
from agent_sim.execution import Engine
from agent_sim.llm import LanguageModels
from agent_sim.research import Research
from agent_sim.templates import templates
from pydantic_ai import models
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.models.function import FunctionModel
from pydantic_ai.usage import RequestUsage


@pytest.fixture(autouse=True)
def no_network(monkeypatch):
    monkeypatch.setattr(models, "ALLOW_MODEL_REQUESTS", False)
    monkeypatch.setenv("OPENAI_API_KEY", "test-not-a-real-key")


@pytest.fixture
def design():
    value = Design.model_validate(templates()[0]["design"])
    value.rounds, value.seeds = 2, [7]
    value.conditions = value.conditions[:1]
    return value


def decision_for(observation: dict) -> dict:
    legal = observation["legal_actions"][0]
    target = legal.get("targets", [""])[0]
    if legal["kind"] == "work" and "tasks" in observation:
        completed = {t["key"] for t in observation["tasks"] if t["completed_by"]}
        task = next(
            (
                t
                for t in observation["tasks"]
                if not t["completed_by"] and set(t["dependencies"]) <= completed
            ),
            None,
        )
        target = task["key"] if task else ""
    return {
        "action": {
            "kind": legal["kind"],
            "amount": legal.get("amount_max", 0) // 2,
            "target": target,
            "message": "",
            "report": observation["your_private_signal"] if observation["communication"] else None,
            "promise": None,
        },
        "memory": "Remember the observed outcome.",
        "rationale": "Choose a legal action.",
        "forecast": None if "targets" in legal else 0.5,
    }


@pytest.fixture
def fake_model():
    async def respond(messages, info):
        prompt = messages[-1].parts[0].content
        observation = json.loads(prompt)
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, decision_for(observation))],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    return FunctionModel(function=respond)


@pytest.fixture
def runtime(tmp_path, monkeypatch, fake_model):
    db = Database(f"sqlite:///{tmp_path}/test.sqlite3")
    llm = LanguageModels(db)
    monkeypatch.setattr(llm, "model", lambda _name: fake_model)
    research = Research(db, llm)
    engine = Engine(db, research, llm)
    yield db, llm, research, engine
    db.close()
