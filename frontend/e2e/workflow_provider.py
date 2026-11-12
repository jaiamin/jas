"""Opt-in T12 DEVELOPMENT proposals; never an installed participant policy."""

import asyncio
import json

from pydantic_ai import models
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.models.function import FunctionModel
from pydantic_ai.usage import RequestUsage

from benchmarks.provider_fixtures import output_args


def deterministic_workflow(app):
    models.ALLOW_MODEL_REQUESTS = False
    rejected_once = set()

    async def respond(messages, info):
        prompt = json.loads(messages[-1].parts[0].content)
        tool = "operations" in prompt
        if tool and not prompt["operations"]:
            output = {"operation": "observe", "read": None, "decision": None}
        else:
            observation = prompt["operations"][0]["result"] if tool else prompt
            actor, now = observation["you"]["key"], observation["logical_time"]
            selected = {
                (0, "alex"): {"kind": "claim_work", "work": "prepare"},
                (0, "morgan"): {"kind": "claim_work", "work": "prepare"},
                (0, "casey"): {
                    "kind": "send_message",
                    "recipient": "taylor",
                    "text": "t12-browser-private-mail",
                },
                (1, "morgan"): {
                    "kind": "perform_work",
                    "work": "prepare",
                    "expected_version": 1,
                    "content": {"batch": 17},
                    "sources": [],
                },
                (3, "morgan"): {
                    "kind": "handoff_work",
                    "work": "prepare",
                    "recipient": "sam",
                    "version": 2,
                },
                (4, "sam"): {"kind": "accept_handoff", "work": "prepare", "version": 2},
            }
            action = selected.get((now, actor), {"kind": "wait_workflow"})
            goal = observation["you"]["goal"]
            if now == 1 and actor == "morgan" and "[t12-browser-stale]" in goal:
                if goal not in rejected_once:
                    rejected_once.add(goal)
                    action["expected_version"] = 2
            if now == 1 and actor == "taylor" and not tool:
                await asyncio.sleep(2)
            final = {
                "action": action,
                "memory": "",
                "rationale": "T12 deterministic DEVELOPMENT browser fixture.",
                "forecast": None,
            }
            output = {"operation": "decide", "read": None, "decision": final} if tool else final
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, output_args(info, output))],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
            model_name="t12-browser-development-v1",
        )

    app.state.models.models["openai:gpt-6-luna"] = FunctionModel(function=respond)
