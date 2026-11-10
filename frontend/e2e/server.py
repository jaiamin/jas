"""Serve a fresh, keyless browser-test workspace until Playwright shuts it down."""

import os
from pathlib import Path
from tempfile import TemporaryDirectory

import uvicorn
from agent_sim.api import create_app


def deterministic_participants(app):
    """Opt-in external provider stand-in for the dedicated T04 browser workflow."""
    import json

    from pydantic_ai import models
    from pydantic_ai.messages import ModelResponse, ToolCallPart
    from pydantic_ai.models.function import FunctionModel
    from pydantic_ai.usage import RequestUsage

    models.ALLOW_MODEL_REQUESTS = False

    async def respond(messages, info):
        prompt = json.loads(messages[-1].parts[0].content)
        final = {
            "action": {
                "kind": "contribute",
                "amount": 2,
                "target": "",
                "message": "",
                "report": None,
                "promise": None,
            },
            "memory": "",
            "rationale": "Deterministic legal contribution.",
            "forecast": None,
        }
        if "operations" in prompt:
            operation = ["observe", "rules", "legal_options", "decide"][len(prompt["operations"])]
            output = {"operation": operation, "decision": final if operation == "decide" else None}
        else:
            output = final
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, output)],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
            model_name="t04-browser-deterministic-v1",
        )

    app.state.models.models["openai:gpt-6-luna"] = FunctionModel(function=respond)


if __name__ == "__main__":
    os.environ["OPENAI_API_KEY"] = ""
    os.environ["ANTHROPIC_API_KEY"] = ""
    with TemporaryDirectory(prefix="jas-browser-tests-") as directory:
        app = create_app(
            database_url=f"sqlite:///{directory}/workspace.sqlite3",
            budget_usd=10,
            static_dir=Path(__file__).resolve().parents[1] / "dist",
            concurrent_runs=1,
        )
        if os.getenv("JAS_TEST_PARTICIPANTS") == "1":
            deterministic_participants(app)
        uvicorn.run(
            app,
            host="127.0.0.1",
            port=int(os.getenv("JAS_TEST_PORT", "8094")),
        )
