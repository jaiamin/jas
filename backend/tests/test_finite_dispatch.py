"""Existing-property DEVELOPMENT witness at the real HTTP/contained-worker seam."""

import json
import threading
from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal

import pytest
from agent_sim.api import create_app
from fastapi.testclient import TestClient
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.models.function import FunctionModel
from pydantic_ai.usage import RequestUsage

from backend.tests.test_cosigned_world import cosigned_design
from benchmarks.provider_fixtures import output_args


def test_finite_engine_start_keeps_http_responsive_and_real_worker_off_the_api_loop(
    tmp_path, monkeypatch
):
    import agent_sim.extensions as isolated

    app = create_app(f"sqlite:///{tmp_path}/dispatch.sqlite3")
    delivered = []

    async def respond(messages, info):
        observation = json.loads(messages[-1].parts[0].content)
        delivered.append(observation)
        operation = {"open": "offer", "offered": "sign", "signed": "release"}[
            observation["finite"]["state"]
        ]
        return ModelResponse(
            parts=[
                ToolCallPart(
                    info.output_tools[0].name,
                    output_args(
                        info,
                        {
                            "action": {"kind": "finite", "operation": operation},
                            "rationale": "Self-reported success grants no authority",
                            "memory": "actor-private note",
                            "forecast": None,
                        },
                    ),
                )
            ],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    def provider(name):
        assert name == "openai:gpt-6-luna"
        return FunctionModel(function=respond)

    monkeypatch.setattr(app.state.models, "model", provider)
    with TestClient(app, base_url="http://localhost") as client:
        design = cosigned_design(client)
        saved = client.post("/api/studies", json={"design": design})
        assert saved.status_code == 201, saved.text
        sid = saved.json()["id"]
        study = client.get(f"/api/studies/{sid}").json()
        rid = study["runs"][0]["id"]
        usage = client.get("/api/settings").json()["usage"]
        assert usage["requests"] == 0 and delivered == []
        assert client.portal is not None
        api_thread = client.portal.call(threading.get_ident)
        entered, released, returned = (threading.Event() for _ in range(3))
        worker_threads, calls = [], []
        execute = isolated.execute

        def observed(source, inputs, **kwargs):
            worker_threads.append(threading.get_ident())
            calls.append(list(inputs))
            if not entered.is_set():
                entered.set()
                assert released.wait(8), "Contained-worker scheduling barrier was not released"
            try:
                return execute(source, inputs, **kwargs)
            finally:
                returned.set()

        monkeypatch.setattr(isolated, "execute", observed)
        with ThreadPoolExecutor(max_workers=2) as pool:
            start = pool.submit(client.post, f"/api/runs/{rid}/control", json={"action": "start"})
            try:
                assert entered.wait(3), "Engine start did not reach the actual worker boundary"
                assert not start.done() and not returned.is_set()
                reading = pool.submit(client.get, "/api/settings")
                settings = reading.result(timeout=2)
                assert settings.status_code == 200, settings.text
                assert settings.json()["usage"] == usage
                assert delivered == []
                assert not start.done() and not returned.is_set()
            finally:
                released.set()
            response = start.result(timeout=10)
            assert response.status_code == 200, response.text

        async def settled():
            await app.state.engine.executions[rid].task

        client.portal.call(settled)
        assert returned.is_set() and worker_threads and api_thread not in worker_threads
        # Admission's180+4 exhaustive check precedes this barrier in cosigned_design.
        # Startup's copied probes choose indices0/1/2 among legal operations:
        # offer/sign/release; wait/stop; stop. The last three calls are the
        # separately sampled participants' actual offer/sign/release trajectory.
        assert calls == [[24], [55], [86], [28], [35], [29], [24], [55], [86]]
        run = client.get(f"/api/runs/{rid}").json()
        assert (run["summary"]["status"], run["summary"]["turn"]) == ("complete", 3)
        state_values = tuple(
            run["state"][key] for key in ("finite_state", "credits", "escrow", "spent")
        )
        assert state_values == (
            3,
            1,
            0,
            1,
        )
        assert run["state"]["outcome"] == {"success": True, "reason": "released"}
        assert len(delivered) == len(run["requests"]) == len(run["activations"]) == 3
        for request in run["requests"]:
            assert (request["model"], request["status"]) == ("openai:gpt-6-luna", "complete")
            assert (request["input_tokens"], request["output_tokens"]) == (100, 50)
            assert Decimal(str(request["cost_usd"])) * 1_000_000 == 35
        assert "consent-37" not in json.dumps(delivered[1])
        assert client.get(f"/api/studies/{sid}").json()["revisions"] == study["revisions"]
        exported = client.get(f"/api/studies/{sid}/export").json()
        usage = client.get("/api/settings").json()["usage"]
        assert (usage["requests"], usage["input_tokens"], usage["output_tokens"]) == (3, 300, 150)
        assert Decimal(str(usage["cost_usd"])) * 1_000_000 == 105
        monkeypatch.setattr(app.state.models, "model", lambda _: pytest.fail("Replay sampled"))
        verified = client.post(f"/api/runs/{rid}/verify")
        assert verified.status_code == 200, verified.text
        assert (verified.json()["verified_turns"], verified.json()["model_requests"]) == (3, 0)
        assert api_thread not in worker_threads
        assert client.get(f"/api/studies/{sid}/export").json() == exported
        assert client.get("/api/settings").json()["usage"] == usage
