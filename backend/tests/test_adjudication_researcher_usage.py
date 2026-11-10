"""RC01: real provider-bound Researcher costs, with independently literal ledgers."""

import asyncio
import json
from threading import Event

from agent_sim.api import create_app
from fastapi.testclient import TestClient
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.models.function import DeltaToolCall, FunctionModel
from pydantic_ai.usage import RequestUsage

from backend.tests.test_fallible_adjudication import GUIDANCE, RULING, finished, protocol


def test_researcher_provider_index_separates_judge_cost_at_its_frozen_cutoff(tmp_path):
    actions = iter(
        [
            {
                "kind": "write_artifact",
                "artifact": "report",
                "expected_version": 1,
                "content": {"desk": "west", "closes_at": 17, "guidance": GUIDANCE},
                "sources": [{"artifact": "pickup", "version": 1}],
            },
            {"kind": "submit_artifacts"},
        ]
    )
    entered, release = Event(), Event()
    provider_inputs, provider_instructions = [], []

    async def participant(_messages, info):
        return ModelResponse(
            parts=[
                ToolCallPart(
                    info.output_tools[0].name,
                    {
                        "action": next(actions),
                        "rationale": "Controlled cost witness.",
                        "memory": "",
                        "forecast": None,
                    },
                )
            ],
            usage=RequestUsage(input_tokens=101, output_tokens=37),
        )

    async def sol(messages, info):
        prompt = json.loads(messages[-1].parts[0].content)
        if "index" in prompt:
            provider_inputs.append(prompt)
            provider_instructions.append(info.instructions)
            if len(provider_inputs) == 1:
                entered.set()
                assert await asyncio.to_thread(release.wait, 10)
            result = {
                "requests": [],
                "answer": {
                    "answer": "Scoped controlled cost inspection.",
                    "citations": [],
                    "caveats": ["No live judgment accuracy was measured."],
                    "claims": [],
                },
            }
        else:
            result = RULING
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, result)],
            usage=RequestUsage(input_tokens=41, output_tokens=19),
        )

    async def stream(messages, info):
        response = await sol(messages, info)
        part = response.parts[0]
        assert isinstance(part, ToolCallPart)
        yield {0: DeltaToolCall(name=part.tool_name, json_args=json.dumps(part.args))}

    app = create_app(f"sqlite:///{tmp_path}/researcher.sqlite3", static_dir=tmp_path / "static")
    app.state.models.models["openai:gpt-6-luna"] = FunctionModel(function=participant)
    app.state.models.models["openai:gpt-6.1-sol"] = FunctionModel(
        function=sol, stream_function=stream
    )
    try:
        with TestClient(app, base_url="http://localhost") as client:
            saved = client.post("/api/studies", json={"design": protocol()})
            assert saved.status_code == 201, saved.text
            study = client.get(f"/api/studies/{saved.json()['id']}").json()
            rid = study["runs"][0]["id"]
            assert (
                client.post(f"/api/runs/{rid}/control", json={"action": "step"}).status_code == 200
            )
            assert finished(client, rid)["summary"]["turn"] == 1
            first = client.post(
                "/api/chats",
                json={"question": "Inspect costs at this cutoff.", "context": f"run:{rid}"},
            )
            assert first.status_code == 202, first.text
            first_id = first.json()["id"]
            try:
                assert entered.wait(5)
                assert client.get(f"/api/analyses/{first_id}").json()["cutoffs"] == {rid: 1}
                assert (
                    client.post(f"/api/runs/{rid}/control", json={"action": "step"}).status_code
                    == 200
                )
                completed = finished(client, rid)
                assert (completed["summary"]["turn"], completed["state"]["outcome"]["status"]) == (
                    2,
                    "success",
                )
            finally:
                release.set()

            def settled(key):
                async def wait():
                    await app.state.assistants.tasks[key]

                assert client.portal is not None
                client.portal.call(wait)
                row = client.get(f"/api/analyses/{key}").json()
                assert row["status"] == "complete", row
                return row

            old = settled(first_id)
            assert old["usage"]["requests"] == 1 and old["usage"]["cost_usd"] > 0
            second = client.post(
                "/api/chats",
                json={"question": "Inspect task costs after judgment.", "context": f"run:{rid}"},
            )
            assert second.status_code == 202, second.text
            current = settled(second.json()["id"])
            assert current["usage"]["requests"] == 1 and current["usage"]["cost_usd"] > 0
            assert current["cutoffs"] == {rid: 2}
            analysis_rows = [
                row
                for row in client.get(f"/api/runs/{rid}").json()["requests"]
                if row["purpose"] == "analysis"
            ]
            assert len(analysis_rows) == 2
            assert all(row["status"] == "complete" and row["cost_usd"] > 0 for row in analysis_rows)
            assert len(provider_inputs) == 2
            first_run = provider_inputs[0]["index"]["runs"][0]
            current_run = provider_inputs[1]["index"]["runs"][0]
            assert (first_run["through_turn"], current_run["through_turn"]) == (1, 2)
            assert first_run["execution_usage"] == {
                "requests": 1,
                "input_tokens": 101,
                "output_tokens": 37,
                "cost_usd": 0.000029,
                "partial": False,
            }
            assert current_run["execution_usage"] == {
                "requests": 2,
                "input_tokens": 202,
                "output_tokens": 74,
                "cost_usd": 0.000058,
                "partial": False,
            }
            assert current_run.get("adjudication_usage") == {
                "requests": 1,
                "input_tokens": 41,
                "output_tokens": 19,
                "cost_usd": 0.000272,
                "partial": False,
            }, "The actual Researcher provider index must expose the separate judge component"
            assert first_run["adjudication_usage"] == {
                "requests": 0,
                "input_tokens": 0,
                "output_tokens": 0,
                "cost_usd": 0.0,
                "partial": False,
            }
            for row, expected in ((old, first_run), (current, current_run)):
                recorded = row["output"]["evidence_index"]["runs"][0]
                for field in ("through_turn", "execution_usage", "adjudication_usage"):
                    assert recorded[field] == expected[field]
    finally:
        release.set()
        (tmp_path / "provider-inputs.json").write_text(
            json.dumps({"inputs": provider_inputs, "instructions": provider_instructions}, indent=2)
        )
