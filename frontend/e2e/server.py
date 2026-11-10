"""Serve a fresh, keyless browser-test workspace until Playwright shuts it down."""

import os
from pathlib import Path
from tempfile import TemporaryDirectory

import uvicorn
from agent_sim.api import create_app


def deterministic_participants(app):
    """Opt-in external provider stand-in for the dedicated T04 browser workflow."""
    import asyncio
    import json

    from pydantic_ai import models
    from pydantic_ai.messages import ModelResponse, ToolCallPart
    from pydantic_ai.models.function import FunctionModel
    from pydantic_ai.usage import RequestUsage

    models.ALLOW_MODEL_REQUESTS = False

    stale_attempts: set[str] = set()

    def artifact_response(prompt):
        if "operations" in prompt:
            reads = prompt["operations"]
            if not reads:
                return {"operation": "observe", "read": None, "decision": None}
            observation = reads[0]["result"]
        else:
            observation = prompt
        history = observation["artifact_history"]
        index = len(history)
        goal = observation["you"]["goal"]
        if (
            "operations" in prompt
            and index == 1
            and not any(op["kind"] == "read_artifact" for op in reads)
        ):
            return {
                "operation": "read_artifact",
                "read": {"kind": "read_artifact", "artifact": "measurement", "version": 1},
                "decision": None,
            }
        if index == 0:
            action = {"kind": "read_artifact", "artifact": "measurement", "version": 1}
        elif index == 1:
            action = {
                "kind": "write_artifact",
                "artifact": "report",
                "expected_version": 1,
                "content": observation["last_result"]["content"],
                "sources": [{"artifact": "measurement", "version": 1}],
            }
            if "[t09-browser-failure-" in goal:
                action["content"] = {"reading": -4}
            if "[t09-browser-recover-" in goal and goal not in stale_attempts:
                stale_attempts.add(goal)
                action["expected_version"] = 2
        elif index == 2:
            action = {"kind": "check_artifacts"}
        else:
            action = {"kind": "submit_artifacts"}
        final = {
            "action": action,
            "memory": "",
            "rationale": "T09 keyless development fixture.",
            "forecast": None,
        }
        return (
            {"operation": "decide", "read": None, "decision": final}
            if "operations" in prompt
            else final
        )

    async def respond(messages, info):
        prompt = json.loads(messages[-1].parts[0].content)
        if os.getenv("JAS_TEST_COORDINATION") == "1" and "coordination" in prompt:
            actor = prompt["you"]["key"]
            action = {"kind": "wait_coordination"}
            if "[t10-browser-abstain]" in prompt["you"]["goal"]:
                action = {"kind": "stop"}
            elif prompt["round"] == 1 and actor == "iris":
                action = {
                    "kind": "send_message",
                    "recipient": "moss",
                    "text": "browser-private-cedar",
                }
            elif prompt["round"] == 3:
                action = {
                    "kind": "choose_alternative",
                    "alternative": {"iris": "cedar", "moss": "quartz", "vale": "reed"}[actor],
                }
            return ModelResponse(
                parts=[
                    ToolCallPart(
                        info.output_tools[0].name,
                        {
                            "action": action,
                            "memory": "",
                            "rationale": "T10 keyless development fixture.",
                            "forecast": None,
                        },
                    )
                ],
                usage=RequestUsage(input_tokens=100, output_tokens=50),
            )
        if "artifacts" in prompt or "read_artifact" in prompt.get("limits", {}).get("tools", []):
            return ModelResponse(
                parts=[ToolCallPart(info.output_tools[0].name, artifact_response(prompt))],
                usage=RequestUsage(input_tokens=100, output_tokens=50),
                model_name="t09-browser-deterministic-v1",
            )
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
        if os.getenv("JAS_TEST_EXPOSURE") == "1":
            actor = prompt.get("actor", prompt.get("you", {}).get("key"))
            if actor == "alex" and prompt["round"] == 1:
                final["action"].update(target="morgan", message="t07-private-disclosure")
        if "operations" in prompt:
            journal = prompt["operations"]
            if os.getenv("JAS_TEST_CONTEXT") == "1":
                if not journal:
                    # Deterministic provider delay lets the browser pause real in-flight work.
                    await asyncio.sleep(1)
                    output = {
                        "operation": "investigate",
                        "decision": None,
                        "investigation": {"facet": "state"},
                    }
                elif len(journal) == 1:
                    output = {
                        "operation": "plan",
                        "decision": None,
                        "plan": {
                            "text": (
                                "Check the observed budget before choosing an available amount."
                            ),
                            "source_ids": [journal[0]["result"]["source"]["id"]],
                        },
                    }
                elif len(journal) == 2:
                    output = {
                        "operation": "retrieve",
                        "decision": None,
                        "retrieval": {
                            "query": "t07-private-disclosure"
                            if os.getenv("JAS_TEST_EXPOSURE") == "1"
                            else "budget",
                            "limit": 2,
                        },
                    }
                elif len(journal) == 3:
                    output = {
                        "operation": "verify",
                        "decision": None,
                        "verification": {
                            "proposed": final,
                            "checks": [
                                {
                                    "source_id": journal[0]["result"]["source"]["id"],
                                    "quote": "your_private_signal",
                                }
                            ],
                        },
                    }
                else:
                    output = {"operation": "decide", "decision": final}
            else:
                operation = ["observe", "rules", "legal_options", "decide"][len(journal)]
                output = {
                    "operation": operation,
                    "decision": final if operation == "decide" else None,
                }
        else:
            output = final
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, output)],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
            model_name="t04-browser-deterministic-v1",
        )

    app.state.models.models["openai:gpt-6-luna"] = FunctionModel(function=respond)


def deterministic_researcher(app):
    """T19 keyless provider candidates; real analysis, tools and accounting still run."""
    import asyncio
    import json

    from pydantic_ai import models
    from pydantic_ai.messages import ModelResponse, ToolCallPart
    from pydantic_ai.models.function import DeltaToolCall, FunctionModel
    from pydantic_ai.usage import RequestUsage

    models.ALLOW_MODEL_REQUESTS = False

    async def respond(messages, info):
        await asyncio.sleep(0.15)
        prompt = json.loads(messages[-1].parts[0].content)
        rid = prompt["index"]["runs"][0]["run_id"]
        if not prompt["evidence"]:
            payload = {
                "requests": [{"kind": "history", "run_id": rid, "start": 1, "count": 20}],
                "answer": None,
            }
        else:
            communication = prompt["index"]["lens"]["key"] == "communication"
            invented = "invented" in prompt["question"].lower()
            value = 0 if communication else 440 if invented else 44
            metric = "message_exposed_participants" if communication else "total_utility"
            text = (
                "No recorded message input; intent remains unassessed."
                if communication
                else f"Combined recorded utility was {value}; this is one fixed run."
            )
            claims = [
                {
                    "kind": "calculation",
                    "text": text,
                    "calculation_id": f"run:{rid}:{metric}",
                    "value": value,
                    "scope": "captured_run",
                }
            ]
            if not communication and "artifact_outcome" in prompt["index"]["runs"][0]["outcome"]:
                text = "One artifact write was retained. A claimed financial zero needs checking."
                claims = [
                    {
                        "kind": "calculation",
                        "text": label,
                        "calculation_id": f"run:{rid}:{name}",
                        "value": number,
                        "scope": "captured_run",
                    }
                    for label, name, number in (
                        ("One retained write", "artifact_writes", 1),
                        ("Claimed financial zero", "total_utility", 0),
                    )
                ]
            payload = {
                "requests": [],
                "answer": {
                    "answer": text,
                    "citations": [{"run_id": rid, "turn": 1}],
                    "caveats": ["No independent population or intent inference is established."],
                    "claims": claims,
                },
            }
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, payload)],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
            model_name="t19-browser-deterministic-v1",
        )

    async def stream(messages, info):
        response = await respond(messages, info)
        part = response.parts[0]
        assert isinstance(part, ToolCallPart)
        yield {0: DeltaToolCall(name=part.tool_name, json_args=json.dumps(part.args))}

    app.state.models.models["openai:gpt-6.1-sol"] = FunctionModel(
        function=respond,
        stream_function=stream,
    )


if __name__ == "__main__":
    os.environ["OPENAI_API_KEY"] = ""
    os.environ["ANTHROPIC_API_KEY"] = ""
    with TemporaryDirectory(prefix="jas-browser-tests-") as directory:
        workspace = Path(os.getenv("JAS_TEST_DATA_DIR", directory))
        workspace.mkdir(parents=True, exist_ok=True)
        app = create_app(
            database_url=f"sqlite:///{workspace}/workspace.sqlite3",
            budget_usd=10,
            static_dir=Path(__file__).resolve().parents[1] / "dist",
            concurrent_runs=1,
        )
        if os.getenv("JAS_TEST_PARTICIPANTS") == "1":
            deterministic_participants(app)
        if os.getenv("JAS_TEST_CLAIMS") == "1":
            deterministic_researcher(app)
        uvicorn.run(
            app,
            host="127.0.0.1",
            port=int(os.getenv("JAS_TEST_PORT", "8094")),
        )
