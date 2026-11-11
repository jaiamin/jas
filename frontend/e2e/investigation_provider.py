"""T14 deterministic external-provider boundary; the workflow and ledger stay real."""

import asyncio
import json

from agent_sim.templates import templates
from pydantic_ai import models
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.models.function import DeltaToolCall, FunctionModel
from pydantic_ai.usage import RequestUsage


def deterministic_investigations(app):
    models.ALLOW_MODEL_REQUESTS = False
    failed: set[str] = set()

    async def respond(messages, info):
        prompt = json.loads(messages[-1].parts[0].content)
        fields = info.output_tools[0].parameters_json_schema.get("properties", {})
        question = prompt.get("question", "")
        if "you" in prompt:
            goal = prompt["you"]["goal"]
            await asyncio.sleep(3)
            if "[repair]" in goal and goal not in failed:
                failed.add(goal)
                raise RuntimeError("T14 deterministic failed attempt; no provider retry")
            final = {
                "action": {"kind": "stop"},
                "memory": "",
                "rationale": "One explicit stop.",
                "forecast": None,
            }
            payload = (
                {"operation": "decide", "decision": final, "read": None}
                if "operation" in fields
                else final
            )
        elif "operationalization" in fields:
            intent = prompt.get("authorization", {}).get("intent", "exploratory")
            payload = {
                "supported": "[ambiguous]" not in question,
                "intent": intent,
                "explanation": "A single recorded stop opportunity.",
                "clarification": "Which accessible outcome should be described?"
                if "[ambiguous]" in question
                else None,
                "operationalization": "Describe whether the actor explicitly stops.",
                "size_rationale": "One actor and one opportunity; descriptive only.",
                "agents": 1,
                "conditions": 1,
                "seeds": 1,
                "repetitions": 1,
                "rounds": 1,
                "research_query": None,
                "requirements": [
                    {
                        "source": "artifact workspace",
                        "capability": "versioned_artifacts",
                        "mapping": "direct",
                        "explanation": "Installed artifact mechanics.",
                    }
                ],
            }
        elif "design" in fields:
            design = next(t["design"] for t in templates() if t["id"] == "artifact_workspace")
            design.update(
                title="One recorded stop",
                question=question,
                seeds=[227],
                rounds=1,
                hypothesis="Record whether the actor explicitly stops."
                if prompt.get("authorization", {}).get("intent") == "confirmatory"
                else "",
                measures=[],
                budget_usd=1,
            )
            design["profiles"][0]["goal"] = question
            design["conditions"][0]["harness"] = {"kind": "direct_action", "version": "1.0.0"}
            payload = {"design": design, "explanation": "One explicit stop opportunity."}
        elif "issues" in fields:
            await asyncio.sleep(0.2)
            payload = {"issues": [], "summary": "Retain the one fixed stop trajectory."}
        else:
            finding = {
                "answer": "One recorded trajectory; no population inference.",
                "citations": [],
                "caveats": ["One fixed seed; descriptive only."],
                "claims": [],
            }
            if "propose_experiment" in fields:
                payload = {**finding, "propose_experiment": False, "requests": []}
            else:
                payload = {"requests": [], "answer": finding} if "requests" in fields else finding
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, payload)],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
            model_name="t14-keyless-development",
        )

    async def stream(messages, info):
        response = await respond(messages, info)
        yield {
            0: DeltaToolCall(
                name=info.output_tools[0].name, json_args=json.dumps(response.parts[0].args)
            )
        }

    model = FunctionModel(function=respond, stream_function=stream)
    app.state.models.models.update({"openai:gpt-6.1-sol": model, "openai:gpt-6-luna": model})
