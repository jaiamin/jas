"""T05 DEVELOPMENT cases at the real workflow API; scripted providers, no live competence."""

import asyncio
import json
import os
from pathlib import Path
from threading import Event

import pytest
from agent_sim.api import create_app
from agent_sim.templates import templates
from fastapi.testclient import TestClient
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.models.function import DeltaToolCall, FunctionModel
from pydantic_ai.usage import RequestUsage


@pytest.fixture
def client(tmp_path):
    app = create_app(f"sqlite:///{tmp_path}/researcher.sqlite3", static_dir=tmp_path / "static")
    with TestClient(app, base_url="http://localhost") as client:
        yield client


def scripted(client, monkeypatch, respond):
    async def function(messages, info):
        payload = respond(json.loads(messages[-1].parts[0].content))
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, payload)],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    async def stream(messages, info):
        prompt = json.loads(messages[-1].parts[0].content)
        payload = respond(prompt)
        yield {0: DeltaToolCall(name=info.output_tools[0].name, json_args=json.dumps(payload))}

    monkeypatch.setattr(
        client.app.state.models,
        "model",
        lambda _: FunctionModel(function=function, stream_function=stream),
    )


def finish(client, submitted):
    async def done():
        await client.app.state.assistants.tasks[submitted["id"]]

    client.portal.call(done)
    final = client.get(f"/api/analyses/{submitted['id']}").json()
    if evidence_dir := os.getenv("JAS_T05_EVIDENCE"):
        # Optional raw development evidence; never reads credentials or user databases.
        source_runs = [
            {
                "run": client.get(f"/api/runs/{run_id}").json(),
                "cutoff_evidence": client.get(f"/api/runs/{run_id}/turns/{turn}").json(),
            }
            for run_id, turn in final["cutoffs"].items()
        ]
        with (Path(evidence_dir) / "analyses.jsonl").open("a") as evidence:
            evidence.write(json.dumps({"analysis": final, "source_runs": source_runs}) + "\n")
    return final


def answer(text, **extra):
    return {"answer": text, "citations": [], "caveats": [], **extra}


def test_general_question_discovers_implemented_mechanics_without_creating_a_study(
    client, monkeypatch
):
    def respond(prompt):
        operations = prompt.get("research", {}).get("operations", [])
        if not operations:
            return answer(
                "Inspect bargaining mechanics.",
                requests=[{"kind": "capabilities", "environment": "bargaining"}],
            )
        capability = operations[0]["data"]["environments"][0]
        assert capability["key"] == "bargaining"
        assert "binding_negotiation" in capability["capabilities"]
        assert capability["rule_version"] == "4.0.0"
        return answer("Bargaining implements binding acceptance; it does not implement loans.")

    scripted(client, monkeypatch, respond)
    submitted = client.post(
        "/api/chats", json={"question": "Can bargaining bind an agreement or create a loan?"}
    ).json()
    final = finish(client, submitted)
    assert final["status"] == "complete", final
    assert final["purpose"] == "general"
    research = final["output"]["research"]
    assert research["version"] == 1 and research["stop_reason"] == "answered"
    operation = research["operations"][0]
    assert operation["status"] == "complete"
    assert operation["sources"][0]["kind"] == "builtin"
    assert len(operation["sources"][0]["hash"]) == 64
    assert final["usage"]["requests"] == 2 and not final["usage"]["partial"]
    assert client.get("/api/studies").json() == []
    assert client.get(f"/api/chats/{submitted['chat_id']}").json()[0] == final


def test_capability_discovery_retains_reusable_definitions_without_importing_studies(
    client, monkeypatch
):
    catalog = client.get("/api/catalog").json()
    definition = next(
        item["source"]["definition"]
        for item in catalog["environments"]
        if item["key"] == "composed"
    )
    definition["name"] = "Reusable allocated stock"
    saved = client.post("/api/environments", json={"definition": definition}).json()

    def respond(prompt):
        if not prompt.get("research", {}).get("operations"):
            return answer(
                "Inspect reusable mechanics.",
                requests=[{"kind": "capabilities", "environment": "composed"}],
            )
        return answer("These mechanics can support a separate question and population.")

    scripted(client, monkeypatch, respond)
    final = finish(
        client,
        client.post(
            "/api/chats", json={"question": "Which saved allocation mechanics can I reuse?"}
        ).json(),
    )
    assert final["status"] == "complete", final
    operation = final["output"]["research"]["operations"][0]
    assert operation["data"]["custom_environments"] == [saved]
    assert operation["data"]["environments"][0]["source"]["definition"]["environment"] == "composed"
    assert {"kind": "environment", "id": saved["id"], "hash": saved["sha256"]} in operation[
        "sources"
    ]
    assert "profiles" not in operation["data"]["custom_environments"][0]["definition"]
    assert client.delete(f"/api/environments/{saved['id']}?revision=1").status_code == 200
    assert (
        client.get(f"/api/analyses/{final['id']}").json()["output"]["research"]
        == final["output"]["research"]
    )
    assert client.get("/api/studies").json() == []


def test_prior_artifacts_are_retrieved_by_source_only_in_the_same_conversation(client, monkeypatch):
    scripted(
        client,
        monkeypatch,
        lambda _: (
            answer(
                "Inspect the catalog.",
                requests=[{"kind": "capabilities", "environment": "information"}],
            )
            if not _.get("research", {}).get("operations")
            else answer("Binary evidence is implemented.")
        ),
    )
    original = client.post(
        "/api/chats", json={"question": "Inspect binary evidence mechanics"}
    ).json()
    first = finish(client, original)
    artifact_id = first["output"]["research"]["operations"][0]["id"]

    def retrieve(prompt):
        operations = prompt.get("research", {}).get("operations", [])
        if not operations:
            return answer(
                "Retrieve the previous source.",
                requests=[
                    {"kind": "context", "analysis_id": original["id"], "artifact_id": artifact_id}
                ],
            )
        operation = operations[0]
        if prompt["question"] == "Continue that inspection":
            assert operation["data"]["artifact"]["id"] == artifact_id
            assert operation["data"]["artifact"]["data"]["environments"][0]["key"] == "information"
            assert operation["sources"][0]["id"] == original["id"]
            return answer(
                "The retained catalog artifact describes binary evidence, not trial results."
            )
        assert operation["status"] == "rejected" and operation["data"] is None
        return answer("Select the original conversation to retrieve that context.")

    scripted(client, monkeypatch, retrieve)
    submitted = client.post(
        "/api/chats", json={"question": "Continue that inspection", "chat_id": original["chat_id"]}
    ).json()
    assert finish(client, submitted)["status"] == "complete"
    unrelated = client.post(
        "/api/chats", json={"question": "Retrieve another chat's record"}
    ).json()
    final = finish(client, unrelated)
    assert final["status"] == "complete", final
    assert "Binary evidence is implemented." not in json.dumps(final)
    assert first == client.get(f"/api/analyses/{original['id']}").json()
    assert client.get("/api/studies").json() == []


def test_template_probe_settles_binding_agreement_on_a_copy_without_participants(
    client, monkeypatch
):
    probe = {
        "kind": "probe",
        "source": {
            "kind": "template",
            "environment": "bargaining",
            "seed": 11,
            "parameters": {"endowment": 14, "bargaining": {"discount": 1}},
        },
        "steps": [],
    }

    def respond(prompt):
        operations = prompt.get("research", {}).get("operations", [])
        if not operations:
            return answer("Inspect legal bargaining choices.", requests=[probe])
        initial = operations[0]["data"]
        if len(operations) == 1:
            assert initial["observation"]["legal_actions"][0]["kind"] == "offer"
            assert "action" in initial["legal_schema"]["properties"]
            actors = [p["key"] for p in initial["observation"]["participants"]]
            proposer = initial["actor"]
            receiver = next(actor for actor in actors if actor != proposer)
            action = {
                "kind": "offer",
                "amount": 5,
                "target": "",
                "message": "",
                "report": None,
                "promise": None,
            }
            return answer(
                "Test the binding agreement.",
                requests=[
                    {
                        **probe,
                        "steps": [
                            {"actor": proposer, "action": action},
                            {
                                "actor": receiver,
                                "action": {**action, "kind": "accept", "amount": 0},
                            },
                        ],
                    }
                ],
            )
        settled = operations[1]["data"]
        assert settled["hypothetical"] and settled["participant_calls"] == 0
        assert settled["steps"][0]["events"][0]["kind"] == "offer"
        assert sorted(settled["outcome"]["balances"].values()) == [5.0, 9.0]
        assert settled["source_checkpoint_hash"] == initial["source_checkpoint_hash"]
        assert settled["final_checkpoint_hash"] != settled["source_checkpoint_hash"]
        return answer("The hypothetical offer of five binds on acceptance: five and nine credits.")

    scripted(client, monkeypatch, respond)
    final = finish(
        client,
        client.post(
            "/api/chats", json={"question": "Probe binding acceptance of a five-credit offer."}
        ).json(),
    )
    assert final["status"] == "complete", final
    assert final["usage"]["requests"] == 3
    assert client.get("/api/studies").json() == []


def test_scoped_run_probes_enforce_cutoff_and_leave_source_evidence_unchanged(client, monkeypatch):
    design = next(t["design"] for t in templates() if t["id"] == "bargaining")
    assert isinstance(design, dict)
    design["conditions"] = design["conditions"][:1]
    design["conditions"][0]["parameters"]["endowment"] = 14
    design["seeds"] = [12]
    study_id = client.post("/api/studies", json={"design": design}).json()["id"]
    run_id = client.get(f"/api/studies/{study_id}").json()["runs"][0]["id"]
    before = client.get(f"/api/runs/{run_id}").json()
    evidence = client.get(f"/api/runs/{run_id}/turns/0").json()
    actor = before["next_actor"]
    receiver = next(p["key"] for p in design["profiles"] if p["key"] != actor)
    offer = {
        "kind": "offer",
        "amount": 5,
        "target": "",
        "message": "",
        "report": None,
        "promise": None,
    }

    def respond(prompt):
        operations = prompt.get("research", {}).get("operations", [])
        if not operations:
            return {
                "answer": None,
                "requests": [
                    {
                        "kind": "probe",
                        "source": {"kind": "run", "run_id": run_id, "turn": 1},
                        "steps": [],
                    }
                ],
            }
        assert operations[0]["status"] == "rejected"
        if len(operations) == 1:
            return {
                "answer": None,
                "requests": [
                    {
                        "kind": "probe",
                        "source": {"kind": "run", "run_id": run_id, "turn": 0},
                        "steps": [
                            {"actor": actor, "action": offer},
                            {"actor": receiver, "action": {**offer, "amount": 15}},
                        ],
                    }
                ],
            }
        result = operations[1]["data"]
        assert result["stop_reason"] == "rejected"
        assert len(result["steps"]) == 1
        assert result["outcome"]["balances"] == {p["key"]: 0 for p in design["profiles"]}
        return {"requests": [], "answer": answer("The copied world rejects an illegal response.")}

    scripted(client, monkeypatch, respond)
    submitted = client.post(
        "/api/chats",
        json={
            "question": "Probe the current negotiation without changing it",
            "context": f"run:{run_id}",
        },
    ).json()
    final = finish(client, submitted)
    assert final["status"] == "complete", final
    assert final["cutoffs"] == {run_id: 0}
    assert final["usage"]["requests"] == 3
    after = client.get(f"/api/runs/{run_id}").json()
    for field in ("state", "design", "turns", "events", "measurements", "next_actor"):
        assert after[field] == before[field]
    assert client.get(f"/api/runs/{run_id}/turns/0").json() == evidence
    assert all(c["turn"] is None for c in after["requests"])
    assert client.post(f"/api/runs/{run_id}/verify", json={}).json()["verified_turns"] == 0


def test_operation_results_reach_planner_without_replacing_the_original_question(
    client, monkeypatch
):
    question = "Design an experiment about collateralized loans; keep the actual loan mechanic."

    def respond(prompt):
        if "design_schema" in prompt:
            assert prompt["question"] == question
            assert prompt["research_operations"]["operations"][0]["data"]["environments"]
            return {
                "supported": False,
                "factorial": False,
                "explanation": "Collateralized loans need an absent loan and collateral mechanism.",
                "operationalization": "No executable substitute was chosen.",
                "size_rationale": "A count cannot install the absent mechanism.",
                "agents": 2,
                "conditions": 1,
                "seeds": 1,
                "repetitions": 1,
                "rounds": 1,
                "research_query": None,
                "requirements": [],
            }
        if not prompt.get("research", {}).get("operations"):
            return answer("Check the implemented catalog.", requests=[{"kind": "capabilities"}])
        return answer(
            "I will check whether the requested loan study can be designed.",
            propose_experiment=True,
        )

    scripted(client, monkeypatch, respond)
    final = finish(client, client.post("/api/chats", json={"question": question}).json())
    assert final["status"] == "complete", final
    assert final["purpose"] == "design" and final["question"] == question
    assert final["output"]["supported"] is False and final["output"]["design"] is None
    assert final["output"]["research"]["stop_reason"] == "planner_handoff"
    assert final["usage"]["requests"] == 3
    assert client.get("/api/studies").json() == []


def test_auxiliary_provider_failure_keeps_prior_operation_and_unknown_charge(client, monkeypatch):
    calls = 0

    async def stream(messages, info):
        nonlocal calls
        calls += 1
        if calls == 2:
            raise TimeoutError("Synthetic request interrupted")
        yield {
            0: DeltaToolCall(
                name=info.output_tools[0].name,
                json_args=json.dumps(
                    answer(
                        "Inspect mechanics.",
                        requests=[{"kind": "capabilities", "environment": "commons"}],
                    )
                ),
            )
        }

    monkeypatch.setattr(
        client.app.state.models, "model", lambda _: FunctionModel(stream_function=stream)
    )
    submitted = client.post(
        "/api/chats", json={"question": "Inspect common-pool contributions"}
    ).json()
    final = finish(client, submitted)
    assert final["status"] == "failed" and "TimeoutError" in final["error"]
    research = final["output"]["research"]
    assert research["stop_reason"] == "provider_failure"
    assert research["operations"][0]["status"] == "complete"
    assert final["usage"]["requests"] == 2 and final["usage"]["partial"]
    assert final["usage"]["cost_usd"] > 0
    assert "partial" not in final["output"]
    assert len(client.get(f"/api/chats/{submitted['chat_id']}").json()) == 1
    events = client.get(f"/api/chats/{submitted['chat_id']}/events").text
    assert '"stop_reason": "provider_failure"' in events and calls == 2


def test_repeated_operations_are_deduplicated_and_stop_at_the_request_limit(client, monkeypatch):
    calls = 0

    def respond(prompt):
        nonlocal calls
        calls += 1
        if prompt["operations_remaining"] == 0:
            return answer("The operation allowance is exhausted; these are mechanic checks only.")
        return answer(
            "Inspect capabilities.", requests=[{"kind": "capabilities", "environment": "commons"}]
        )

    scripted(client, monkeypatch, respond)
    final = finish(
        client, client.post("/api/chats", json={"question": "Inspect repeatedly"}).json()
    )
    assert final["status"] == "complete", final
    assert final["output"]["research"]["stop_reason"] == "request_limit"
    assert len(final["output"]["research"]["operations"]) == 1
    assert final["usage"]["requests"] == calls == 4
    assert client.get("/api/studies").json() == []


def test_retrieve_and_probe_an_older_reviewed_proposal_without_saving_it(client, monkeypatch):
    design = next(t["design"] for t in templates() if t["id"] == "bargaining")
    assert isinstance(design, dict)
    design["conditions"] = design["conditions"][:1]
    design["conditions"][0]["parameters"]["endowment"] = 14
    design.update(
        seeds=[7],
        rounds=2,
        repetitions=1,
        response_tokens=4096,
        question="Design a binding offer experiment",
    )

    def proposal(prompt):
        if "brief" not in prompt:
            return {
                "supported": True,
                "factorial": False,
                "explanation": "Binding negotiation.",
                "operationalization": "Observe offers and acceptance.",
                "size_rationale": "A dyadic mechanic check.",
                "agents": 2,
                "conditions": 1,
                "seeds": 1,
                "repetitions": 1,
                "rounds": 2,
                "research_query": None,
                "requirements": [
                    {
                        "source": "binding offer",
                        "capability": "binding_negotiation",
                        "mapping": "direct",
                        "explanation": "Offers bind on acceptance.",
                    }
                ],
            }
        if "preflight" in prompt:
            return {"issues": [], "summary": "Inspect binding offers and acceptance."}
        return {"explanation": "A reviewable proposal, not a run.", "design": design}

    scripted(client, monkeypatch, proposal)
    original = client.post(
        "/api/chats", json={"question": design["question"], "context": "new"}
    ).json()
    reviewed = finish(client, original)
    assert reviewed["status"] == "complete" and reviewed["output"]["supported"], reviewed
    scripted(client, monkeypatch, lambda _: answer("An unrelated methods explanation."))
    for i in range(13):
        final = finish(
            client,
            client.post(
                "/api/chats",
                json={"question": f"Explain method {i}", "chat_id": original["chat_id"]},
            ).json(),
        )
        assert final["status"] == "complete"

    def inspect(prompt):
        operations = prompt["research"]["operations"]
        if not operations:
            assert all(item["analysis_id"] != original["id"] for item in prompt["context_index"])
            return answer(
                "Find the relevant earlier proposal.",
                requests=[{"kind": "context", "query": "binding offer"}],
            )
        if len(operations) == 1:
            assert operations[0]["data"]["matches"][0]["analysis_id"] == original["id"]
            return answer(
                "Retrieve the protocol and inspect its copied world.",
                requests=[
                    {"kind": "context", "analysis_id": original["id"]},
                    {
                        "kind": "probe",
                        "source": {
                            "kind": "proposal",
                            "analysis_id": original["id"],
                            "condition_key": design["conditions"][0]["key"],
                        },
                        "steps": [],
                    },
                ],
            )
        assert operations[1]["data"]["output"]["design"] == reviewed["output"]["design"]
        assert operations[2]["data"]["observation"]["pie"] == 14
        assert operations[2]["sources"][0]["id"] == original["id"]
        return answer(
            "The retained proposal offers a fourteen-credit binding split; no trial was run."
        )

    scripted(client, monkeypatch, inspect)
    final = finish(
        client,
        client.post(
            "/api/chats",
            json={
                "question": "Inspect the earlier binding proposal",
                "chat_id": original["chat_id"],
            },
        ).json(),
    )
    assert final["status"] == "complete", final
    assert final["purpose"] == "general" and final["usage"]["requests"] == 3
    assert client.get("/api/studies").json() == []
    assert reviewed == client.get(f"/api/analyses/{original['id']}").json()


def test_pending_operation_results_survive_reconnect_without_duplicate_work(client, monkeypatch):
    entered, release = Event(), Event()
    calls = 0

    async def stream(messages, info):
        nonlocal calls
        calls += 1
        if calls == 1:
            payload = answer(
                "Inspect trusted mechanics.",
                requests=[{"kind": "capabilities", "environment": "commons"}],
            )
        else:
            entered.set()
            assert await asyncio.to_thread(release.wait, 5)
            payload = answer("The copied catalog supports sealed contributions.")
        yield {0: DeltaToolCall(name=info.output_tools[0].name, json_args=json.dumps(payload))}

    monkeypatch.setattr(
        client.app.state.models, "model", lambda _: FunctionModel(stream_function=stream)
    )
    submitted = client.post("/api/chats", json={"question": "Inspect the installed commons"}).json()
    assert entered.wait(5)
    pending = client.get(f"/api/chats/{submitted['chat_id']}").json()[0]
    assert pending["status"] == "pending"
    artifact = pending["output"]["research"]["operations"][0]
    assert artifact["status"] == "complete"
    assert (
        client.post(
            "/api/chats", json={"question": "Duplicate", "chat_id": submitted["chat_id"]}
        ).status_code
        == 422
    )
    assert calls == 2
    release.set()
    final = finish(client, submitted)
    assert final["status"] == "complete" and final["usage"]["requests"] == 2
    for _ in range(2):
        stream_text = client.get(f"/api/chats/{submitted['chat_id']}/events").text
        restored = json.loads(
            next(line[6:] for line in stream_text.splitlines() if line.startswith("data: "))
        )
        assert restored["output"]["research"]["operations"][0] == artifact
        assert restored == final and calls == 2


def test_restart_keeps_interrupted_auxiliary_request_and_artifact_without_resubmitting(
    tmp_path, monkeypatch
):
    database = f"sqlite:///{tmp_path}/restart.sqlite3"
    entered = Event()
    calls = 0

    async def stream(messages, info):
        nonlocal calls
        calls += 1
        if calls == 2:
            entered.set()
            await asyncio.Event().wait()
        yield {
            0: DeltaToolCall(
                name=info.output_tools[0].name,
                json_args=json.dumps(
                    answer(
                        "Inspect trusted mechanics.",
                        requests=[{"kind": "capabilities", "environment": "information"}],
                    )
                ),
            )
        }

    app = create_app(database, static_dir=tmp_path / "static")
    monkeypatch.setattr(app.state.models, "model", lambda _: FunctionModel(stream_function=stream))
    with TestClient(app, base_url="http://localhost") as first:
        submitted = first.post(
            "/api/chats", json={"question": "Inspect information mechanics"}
        ).json()
        assert entered.wait(5)
        artifact = first.get(f"/api/analyses/{submitted['id']}").json()["output"]["research"][
            "operations"
        ][0]
    with TestClient(
        create_app(database, static_dir=tmp_path / "static"), base_url="http://localhost"
    ) as restarted:
        final = restarted.get(f"/api/analyses/{submitted['id']}").json()
        assert final["status"] == "failed" and final["error"] == "Request interrupted."
        assert final["output"]["research"]["stop_reason"] == "interrupted"
        assert final["output"]["research"]["operations"][0] == artifact
        assert final["usage"]["requests"] == 2 and final["usage"]["partial"]
        assert restarted.get(f"/api/chats/{submitted['chat_id']}").json() == [final]
        assert calls == 2


def test_run_probe_uses_recorded_cutoff_while_source_advances(client, monkeypatch):
    design = next(t["design"] for t in templates() if t["id"] == "bargaining")
    assert isinstance(design, dict)
    design["conditions"] = design["conditions"][:1]
    design["conditions"][0]["parameters"]["endowment"] = 14
    design["seeds"] = [12]
    study_id = client.post("/api/studies", json={"design": design}).json()["id"]
    run_id = client.get(f"/api/studies/{study_id}").json()["runs"][0]["id"]
    entered, release = Event(), Event()
    participant_calls = 0

    async def participant(messages, info):
        nonlocal participant_calls
        participant_calls += 1
        observation = json.loads(messages[-1].parts[0].content)
        kind = observation["legal_actions"][0]["kind"]
        decision = {
            "action": {
                "kind": kind,
                "amount": 5 if kind == "offer" else 0,
                "target": "",
                "message": "",
                "report": None,
                "promise": None,
            },
            "rationale": "Deterministic development action.",
            "memory": "",
            "forecast": None,
        }
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, decision)],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    def step():
        assert (
            client.post(f"/api/runs/{run_id}/control", json={"action": "step"}).status_code == 200
        )

        async def done():
            await client.app.state.engine.executions[run_id].task

        client.portal.call(done)

    async def researcher(messages, info):
        prompt = json.loads(messages[-1].parts[0].content)
        operations = prompt["research"]["operations"]
        if not operations:
            entered.set()
            assert await asyncio.to_thread(release.wait, 5)
            payload = {
                "answer": None,
                "requests": [
                    {
                        "kind": "probe",
                        "source": {"kind": "run", "run_id": run_id, "turn": 1},
                        "steps": [],
                    }
                ],
            }
        else:
            data = operations[0]["data"]
            assert data["observation"]["offer"]["amount"] == 5
            assert data["outcome"]["done"] is False
            assert data["source_checkpoint_hash"] == checkpoint_hash
            payload = {
                "requests": [],
                "answer": answer("At the frozen cutoff the offer was awaiting response."),
            }
        yield {0: DeltaToolCall(name=info.output_tools[0].name, json_args=json.dumps(payload))}

    model = FunctionModel(function=participant, stream_function=researcher)
    monkeypatch.setattr(client.app.state.models, "model", lambda _: model)
    step()
    evidence = client.get(f"/api/runs/{run_id}/turns/1").json()
    checkpoint_hash = evidence["state_hash"]
    submitted = client.post(
        "/api/chats",
        json={"question": "Inspect the current offered split", "context": f"run:{run_id}"},
    ).json()
    assert entered.wait(5)
    step()
    settled = client.get(f"/api/runs/{run_id}").json()
    assert settled["state"]["done"] is True and participant_calls == 2
    release.set()
    final = finish(client, submitted)
    assert final["status"] == "complete", final
    assert final["cutoffs"] == {run_id: 1} and final["usage"]["requests"] == 2
    after = client.get(f"/api/runs/{run_id}").json()
    assert after["state"] == settled["state"] and after["turns"] == settled["turns"]
    assert client.get(f"/api/runs/{run_id}/turns/1").json() == evidence
    assert client.post(f"/api/runs/{run_id}/verify", json={}).json()["verified_turns"] == 2
    assert participant_calls == 2


@pytest.mark.parametrize(
    "operation_request",
    [
        {"kind": "capabilities", "environment": "artifact_workflow"},
        {"kind": "probe", "source": {"kind": "template", "environment": "artifact_workflow"}},
        {"kind": "probe", "source": {"kind": "run", "run_id": "unselected", "turn": 0}},
    ],
)
def test_unsupported_or_unselected_sources_are_visible_rejections_not_substitute_designs(
    client, monkeypatch, operation_request
):
    def respond(prompt):
        operations = prompt["research"]["operations"]
        if not operations:
            return answer("Check the requested mechanic.", requests=[operation_request])
        assert operations[0]["status"] == "rejected" and operations[0]["data"] is None
        return answer(
            "That source is unavailable in the captured scope; no substitute was created."
        )

    scripted(client, monkeypatch, respond)
    final = finish(
        client, client.post("/api/chats", json={"question": "Check the requested mechanics"}).json()
    )
    assert final["status"] == "complete", final
    assert final["purpose"] == "general" and final["usage"]["requests"] == 2
    assert client.get("/api/studies").json() == []
