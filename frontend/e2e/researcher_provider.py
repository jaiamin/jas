"""T13 keyless provider boundary; real planner, World, persistence and HTTP remain active."""

import asyncio
import json

from agent_sim.templates import templates
from pydantic_ai import models
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.models.function import DeltaToolCall, FunctionModel
from pydantic_ai.usage import RequestUsage


def deterministic_researcher(app):
    models.ALLOW_MODEL_REQUESTS = False

    async def respond(messages, info):
        prompt = json.loads(messages[-1].parts[0].content)
        if "operations_remaining" in prompt:
            payload = {
                "answer": "I will prepare a reviewable exploratory protocol.",
                "citations": [],
                "caveats": [],
                "requests": [],
                "propose_experiment": True,
            }
        elif "candidate" in prompt and "preflight" in prompt:
            # A real in-flight review gives reload/reconnect a deterministic observation window.
            await asyncio.sleep(2)
            payload = {
                "issues": [],
                "summary": "Inspect conflicting authorized records "
                "and source-linked report revisions. "
                "Keep unsuccessful work visible; participant trials have not run.",
            }
        elif "brief" in prompt:
            design = next(t["design"] for t in templates() if t["id"] == "artifact_workspace")
            design.update(
                title="Records exploration",
                question=prompt["question"],
                hypothesis="",
                measures=[],
                seeds=[151],
                rounds=7,
            )
            design["profiles"][0].update(key="investigator", name="Investigator")
            condition = design["conditions"][0]
            condition.update(key="archive_pilot", name="Conflicting authorized records")
            rules = condition["parameters"]["artifacts"]
            rules["write_limit"] = 2
            for obj, value in zip(rules["objects"], [37, -2, 503], strict=True):
                obj["content"] = {"reading": value}
                obj["readers"] = ["investigator"] if obj["readers"] else []
                obj["writers"] = ["investigator"] if obj["writers"] else []
                obj["owner"] = "investigator" if obj["owner"] else None
            rules["objects"].append(
                {
                    "key": "counterrecord",
                    "name": "Contradictory record",
                    "owner": None,
                    "readers": ["investigator"],
                    "writers": [],
                    "content": {"reading": -13},
                }
            )
            payload = {
                "explanation": "One investigator can inspect conflicting evidence, "
                "revise and check "
                "persistent work. The declared source-v1 check is not semantic truth arbitration.",
                "design": design,
                "probes": [
                    {
                        "condition_key": "archive_pilot",
                        "steps": [
                            {
                                "actor": "investigator",
                                "action": {
                                    "kind": "read_artifact",
                                    "artifact": "measurement",
                                    "version": 1,
                                },
                            }
                        ],
                    }
                ],
            }
        else:
            payload = {
                "supported": True,
                "intent": "exploratory",
                "explanation": "Solo investigation with fixed permissions "
                "and structured artifacts.",
                "operationalization": "Retain reads, revisions, checks, submission/stop and failed "
                "or unverified trajectories without a primary scalar endpoint.",
                "size_rationale": "One investigator; seven opportunities "
                "cover evidence acquisition, "
                "two revisions, checking and submission, with submit/stop ending early. One "
                "condition and seed is a descriptive pilot, not independent population inference. "
                "Capture authorized operations, delivered inputs, versions and unsuccessful work.",
                "agents": 1,
                "conditions": 1,
                "seeds": 1,
                "repetitions": 1,
                "rounds": 7,
                "research_query": None,
                "requirements": [
                    {
                        "source": "persistent report",
                        "capability": "versioned_artifacts",
                        "mapping": "direct",
                        "explanation": "Persistent World-enforced versions.",
                    }
                ],
            }
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, payload)],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
            model_name="t13-keyless-researcher",
        )

    async def stream(messages, info):
        response = await respond(messages, info)
        yield {
            0: DeltaToolCall(
                name=info.output_tools[0].name, json_args=json.dumps(response.parts[0].args)
            )
        }

    async def forbidden_participant(_messages, _info):
        raise AssertionError("T13 proposal/save fixture forbids participant sampling")

    app.state.models.models["openai:gpt-6.1-sol"] = FunctionModel(
        function=respond,
        stream_function=stream,
    )
    app.state.models.models["openai:gpt-6-luna"] = FunctionModel(function=forbidden_participant)
