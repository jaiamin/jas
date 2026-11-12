"""Exercise protocol drafting through the real provider schema adapter, without network."""

import asyncio
import json
import re

import httpx2 as httpx
import pytest
from agent_sim.api import create_app
from agent_sim.assistants import GeneralResponse
from agent_sim.domain import DesignSpec
from agent_sim.planning import Candidate, DesignReview, StudyBrief
from agent_sim.templates import templates
from fastapi.testclient import TestClient
from openai import AsyncOpenAI
from pydantic_ai import models
from pydantic_ai.models.openai import OpenAIResponsesModel
from pydantic_ai.providers.openai import OpenAIProvider


def tool_response(body, output, index):
    response = {
        "id": f"resp_{index}",
        "object": "response",
        "created_at": 0,
        "model": "gpt-6.1-sol",
        "status": "completed",
        "output": [
            {
                "type": "function_call",
                "id": f"fc_{index}",
                "call_id": f"call_{index}",
                "name": body["tools"][0]["name"],
                "arguments": json.dumps(output),
                "status": "completed",
            }
        ],
        "usage": {"input_tokens": 120, "output_tokens": 30, "total_tokens": 150},
    }
    if not body.get("stream"):
        return httpx.Response(200, json=response)
    item = response["output"][0]
    events = [
        ("response.created", {"response": {**response, "status": "in_progress", "output": []}}),
        ("response.output_item.added", {"output_index": 0, "item": {**item, "arguments": ""}}),
        (
            "response.function_call_arguments.delta",
            {
                "output_index": 0,
                "item_id": item["id"],
                "delta": item["arguments"],
            },
        ),
        ("response.output_item.done", {"output_index": 0, "item": item}),
        ("response.completed", {"response": response}),
    ]
    return httpx.Response(
        200,
        headers={"Content-Type": "text/event-stream"},
        content="".join(
            f"event: {kind}\ndata: "
            + json.dumps({"type": kind, "sequence_number": n, **data})
            + "\n\n"
            for n, (kind, data) in enumerate(events)
        ),
    )


def test_provider_can_express_participant_information_and_artifact_contents(runtime, monkeypatch):
    _, llm, _, _ = runtime
    design = next(t["design"] for t in templates() if t["id"] == "distributed_coordination")
    candidate = Candidate(
        explanation="Compare access to local evidence.", design=DesignSpec.model_validate(design)
    )
    requests = []

    async def respond(request):
        body = json.loads(request.content)
        requests.append(body)
        return tool_response(body, candidate.model_dump(mode="json"), len(requests))

    async def exercise():
        monkeypatch.setattr(models, "ALLOW_MODEL_REQUESTS", True)
        async with AsyncOpenAI(
            api_key="test-not-a-real-key",
            max_retries=0,
            http_client=httpx.AsyncClient(transport=httpx.MockTransport(respond)),
        ) as client:
            model = OpenAIResponsesModel(
                "gpt-6.1-sol", provider=OpenAIProvider(openai_client=client)
            )
            monkeypatch.setattr(llm, "model", lambda _: model)
            return await llm.generate(
                Candidate,
                model="openai:gpt-6.1-sol",
                prompt="Draft a three-participant evidence-sharing experiment.",
                instructions="Return a complete valid protocol.",
                purpose="design",
            )

    assert asyncio.run(exercise()) == candidate
    assert len(requests) == 1
    definitions = requests[0]["tools"][0]["parameters"]["$defs"]
    content = definitions["ArtifactObject"]["properties"]["content"]
    # These are populated maps in the installed environment, not empty record types.
    assert content["patternProperties"], "The provider must be able to emit artifact field keys"
    information = definitions["DistributedRules"]["properties"]["information"]
    assert any(
        re.fullmatch(pattern, "iris") and value["type"] == "string"
        for pattern, value in information["patternProperties"].items()
    )
    assert content["minProperties"] == 1 and information["minProperties"] == 3
    assert requests[0]["tools"][0]["strict"] is False
    assert llm.usage() == {
        "requests": 1,
        "input_tokens": 120,
        "output_tokens": 30,
        "cost_usd": 0.00054,
        "partial": False,
    }


@pytest.mark.parametrize("invalid_draft", [False, "missing_map", "long_hypothesis"])
@pytest.mark.parametrize("context", ["new", "general"])
@pytest.mark.parametrize("omit_rationale", [False, True])
def test_chat_drafts_reviewable_protocol_and_keeps_invalid_output_blocked(
    tmp_path, monkeypatch, invalid_draft, context, omit_rationale
):
    question = "Compare distributed information in a three-agent team."
    design = next(t["design"] for t in templates() if t["id"] == "distributed_coordination")
    brief = StudyBrief(
        supported=True,
        explanation="Compare private and shared evidence.",
        operationalization="Individual choice value and joint agreement.",
        size_rationale="A small descriptive pilot, not an independent competence estimate.",
        agents=3,
        conditions=2,
        seeds=1,
        repetitions=1,
        rounds=8,
        research_query=None,
        requirements=[
            {
                "source": "distributed information",
                "capability": "distributed_information",
                "mapping": "direct",
                "explanation": "Each participant's artifact has a configured read ACL.",
            }
        ],
    )
    candidate = Candidate(
        explanation="Contrast who can read the evidence.", design=DesignSpec.model_validate(design)
    )
    draft = candidate.model_dump(mode="json")
    if omit_rationale:
        draft.pop("explanation")
    if invalid_draft == "missing_map":
        # This is the same missing required map observed in both reported failures.
        draft["design"]["conditions"][0]["parameters"]["coordination"]["information"] = {}
    elif invalid_draft == "long_hypothesis":
        draft["design"]["hypothesis"] = "Private analysis plan. " * 100
    outputs = [
        brief.model_dump(mode="json"),
        draft,
    ]
    review = DesignReview(issues=[], summary="Compare shared and private evidence.").model_dump()
    if omit_rationale:
        # A valid live review exceeded the old display-text bound by only 34 characters.
        review["summary"] = (
            "This exploratory study compares two-agent commons contributions across four rounds "
            "when private messaging is disabled versus enabled, using matched environment seed "
            "and one repetition to observe how communication availability affects sealed "
            "contribution choices and payoff trajectories. All observable behavior—including "
            "uncooperative zero contributions, round-to-round adjustments, and message content—"
            "is retained without filtering for cooperative outcomes. A primary limitation is "
            "that one seed and one pair provide a single descriptive trajectory, not generalized "
            "inference; long-run learning beyond four rounds cannot be assessed."
        )
    if invalid_draft:
        outputs.extend([draft, draft])  # Three visible candidate revisions, still invalid.
    else:
        outputs.append(review)
    if context == "general":
        outputs.insert(
            0,
            GeneralResponse(
                answer="I will draft a comparison of private and shared evidence.",
                citations=[],
                caveats=[],
                propose_experiment=True,
            ).model_dump(mode="json"),
        )
    requests = []

    async def respond(request):
        body = json.loads(request.content)
        requests.append(body)
        return tool_response(body, outputs[len(requests) - 1], len(requests))

    monkeypatch.setattr(models, "ALLOW_MODEL_REQUESTS", True)
    app = create_app(f"sqlite:///{tmp_path}/chat.sqlite3", static_dir=tmp_path / "static")
    provider = AsyncOpenAI(
        api_key="test-not-a-real-key",
        max_retries=0,
        http_client=httpx.AsyncClient(transport=httpx.MockTransport(respond)),
    )
    model = OpenAIResponsesModel("gpt-6.1-sol", provider=OpenAIProvider(openai_client=provider))
    monkeypatch.setattr(app.state.models, "model", lambda _: model)
    with TestClient(app, base_url="http://localhost") as client:
        assert client.portal is not None
        try:
            pending = client.post("/api/chats", json={"question": question, "context": context})
            assert pending.status_code == 202
            key, chat = pending.json()["id"], pending.json()["chat_id"]

            async def finished():
                await app.state.assistants.tasks[key]

            client.portal.call(finished)
            result = client.get(f"/api/analyses/{key}").json()
            calls = client.get(f"/api/analyses/{key}/requests").json()
            count = (4 if invalid_draft else 3) + (context == "general")
            assert len(requests) == len(calls) == count
            assert result["usage"]["requests"] == len(calls)
            assert result["usage"]["cost_usd"] == count * 540 / 1_000_000
            assert all(call["charged"] == 540 and call["reserved"] > 540 for call in calls)
            assert client.get("/api/studies").json() == []  # Drafts need explicit approval.
            assert client.get(f"/api/chats/{chat}").json() == [result]
            assert "drafting" in result["output"]["activity"]
            if context == "general":
                assert "propose_experiment" in requests[0]["tools"][0]["parameters"]["required"]
            brief_request = requests[1 if context == "general" else 0]
            assert brief_request["tools"][0]["strict"] is True
            if invalid_draft:
                assert result["status"] == "failed"
                assert "Design review still has unresolved issues" in result["error"]
                assert len(result["output"]["planning"]["reviews"]) == 3
                assert all(
                    review["kind"] == "validation" and review["provider_call_id"]
                    for review in result["output"]["planning"]["reviews"]
                )
                if invalid_draft == "long_hypothesis":
                    assert '"hypothesis"' in result["error"]
                    assert "2000" in result["error"]
                    assert "Private analysis plan" not in result["error"]
                assert result["output"]["planning"]["brief"]["operationalization"]
                assert calls[-1]["status"] == "failed"
                assert "design" not in result["output"]
                # Recovery is a new explicit user action in the same persisted chat.
                if context == "general":
                    outputs.append(
                        GeneralResponse(
                            answer="I will draft the requested comparison.",
                            citations=[],
                            caveats=[],
                            propose_experiment=True,
                        ).model_dump(mode="json")
                    )
                outputs.extend(
                    [
                        brief.model_dump(mode="json"),
                        candidate.model_dump(mode="json"),
                        review,
                    ]
                )
                followup = client.post(
                    "/api/chats",
                    json={
                        "question": question,
                        "context": context,
                        "chat_id": chat,
                    },
                )
                assert followup.status_code == 202
                next_key = followup.json()["id"]

                async def recovered():
                    await app.state.assistants.tasks[next_key]

                client.portal.call(recovered)
                rows = client.get(f"/api/chats/{chat}").json()
                assert rows[0] == result  # The failed attempt and its costs remain immutable.
                assert rows[1]["status"] == "complete", rows[1]["error"]
                assert len(requests) == count + 3 + (context == "general")
            else:
                assert result["status"] == "complete", result["error"]
                assert all(call["status"] == "complete" for call in calls)
                protocol = result["output"]["design"]
                assert protocol["conditions"][0]["parameters"]["coordination"]["information"] == {
                    "iris": "values_iris",
                    "moss": "values_moss",
                    "vale": "values_vale",
                }
                assert protocol["conditions"][0]["parameters"]["artifacts"]["objects"][0][
                    "content"
                ] == {"cedar": 9, "quartz": 2, "reed": -2}
                assert result["output"]["summary"] == review["summary"]
                saved = client.post("/api/studies", json={"design": protocol})
                assert saved.status_code == 201
                assert len(client.get("/api/studies").json()) == 1
        finally:
            client.portal.call(provider.close)
