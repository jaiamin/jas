"""T13 DEVELOPMENT: real public workflow, keyless provider boundary, independent rubrics."""

import asyncio
import copy
import inspect
import json
import os
from pathlib import Path
from threading import Event

import pytest
from agent_sim.api import create_app
from fastapi.testclient import TestClient
from pydantic_ai.messages import ModelResponse, ToolCallPart
from pydantic_ai.models.function import DeltaToolCall, FunctionModel
from pydantic_ai.usage import RequestUsage

CASES = {
    case["id"]: case
    for case in json.loads(
        (
            Path(__file__).resolve().parents[2] / "benchmarks/researcher_design_cases.json"
        ).read_text()
    )["cases"]
}


@pytest.fixture
def client(tmp_path):
    app = create_app(f"sqlite:///{tmp_path}/designs.sqlite3", static_dir=tmp_path / "static")
    with TestClient(app, base_url="http://localhost") as client:
        yield client


def finish(client, submitted):
    assert submitted.status_code == 202, submitted.text
    identity = submitted.json()

    async def wait():
        await client.app.state.assistants.tasks[identity["id"]]

    client.portal.call(wait)
    row = client.get(f"/api/analyses/{identity['id']}").json()
    retain(row["id"], row)
    return row


def retain(name, data):
    if directory := os.getenv("JAS_T13_EVIDENCE"):
        path = Path(directory)
        path.mkdir(parents=True, exist_ok=True)
        (path / f"{name}.json").write_text(json.dumps(data, indent=2) + "\n")


def artifact_design(client, case_id="folio_explore"):
    catalog = client.get("/api/catalog").json()
    design = next(t["design"] for t in catalog["templates"] if t["id"] == "artifact_workspace")
    design.update(
        title="Folio investigation",
        question=CASES[case_id]["question"],
        hypothesis="",
        seeds=[23, 71],
        rounds=7,
        measures=[],
    )
    # Novel content/identifiers: a copied template cannot accidentally satisfy this oracle.
    design["profiles"][0]["key"] = "archivist"
    design["profiles"][0]["name"] = "Archivist"
    for condition in design["conditions"]:
        condition["key"] = "folio"
        condition["name"] = "Authorized folios"
        rules = condition["parameters"]["artifacts"]
        rules["write_limit"] = 2
        for obj, key in zip(rules["objects"], ["amber", "folio", "vault"], strict=True):
            obj["key"] = key
            obj["readers"] = ["archivist"] if obj["readers"] else []
            obj["owner"] = "archivist" if obj["owner"] else None
            obj["writers"] = ["archivist"] if obj["writers"] else []
        rules["objects"][0]["content"] = {"reading": 63}
        rules["objects"][1]["content"] = {"reading": -11}
        rules["objects"][2]["content"] = {"reading": 904}
        rules["requirements"][0].update(artifact="folio", source="amber")
        if case_id == "folio_explore":
            rules["objects"].append(
                {
                    "key": "azure",
                    "name": "Contradictory folio",
                    "owner": None,
                    "readers": ["archivist"],
                    "writers": [],
                    "content": {"reading": -28},
                }
            )
    return design


def scope(design, **extra):
    return {
        "supported": True,
        "explanation": "Investigate authorized evidence and source-backed persistent work.",
        "operationalization": "Describe read/write/check/submit/stop trajectories, including "
        "incorrect, unverified and unsuccessful work; no primary scalar endpoint.",
        "size_rationale": "One archivist is the active investigator. Seven opportunities allow "
        "two reads, two writes, a check, submission and one spare response; submit/stop ends "
        "early. Two seeds provide two descriptive trajectories, not independent population "
        "samples or seven independent decisions. One condition preserves exploration.",
        "agents": len(design["profiles"]),
        "conditions": len(design["conditions"]),
        "seeds": len(design["seeds"]),
        "repetitions": design["repetitions"],
        "rounds": design["rounds"],
        "research_query": None,
        "requirements": [
            {
                "source": "persistent report",
                "capability": "versioned_artifacts",
                "mapping": "direct",
                "explanation": "World-enforced artifact versions and authorized sources.",
            }
        ],
        **extra,
    }


def provider(client, monkeypatch, design, *, brief=None, candidate=None, review=None, general=None):
    requests = []

    async def respond(messages, info):
        from backend.tests.conftest import planning_prompt

        prompt = planning_prompt(messages[-1].parts[0].content)
        requests.append({"model": info.model_settings, "prompt": copy.deepcopy(prompt)})
        if "operations_remaining" in prompt:
            payload = (
                general(prompt)
                if general
                else {
                    "answer": "I will prepare a reviewable design.",
                    "citations": [],
                    "caveats": [],
                    "propose_experiment": True,
                    "requests": [],
                }
            )
        elif "candidate" in prompt and "preflight" in prompt:
            payload = (
                review
                or (
                    lambda _: {
                        "issues": [],
                        "summary": "Inspect evidence, revise "
                        "work and retain failures. Saving this design does not run participants.",
                    }
                )
            )(prompt)
        elif "brief" in prompt:
            payload = (
                candidate
                or (
                    lambda _: {
                        "explanation": "A bounded exploratory "
                        "investigation; trajectory evidence, not an invented scalar outcome.",
                        "design": design,
                    }
                )
            )(prompt)
        else:
            payload = brief(prompt) if callable(brief) else brief or scope(design)
        if inspect.isawaitable(payload):
            payload = await payload
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, payload)],
            usage=RequestUsage(input_tokens=100, output_tokens=50),
        )

    async def stream(messages, info):
        result = await respond(messages, info)
        yield {
            0: DeltaToolCall(
                name=info.output_tools[0].name, json_args=json.dumps(result.parts[0].args)
            )
        }

    monkeypatch.setattr(
        client.app.state.models,
        "model",
        lambda _: FunctionModel(function=respond, stream_function=stream),
    )
    return requests


def test_solo_exploration_is_validated_and_saved_without_sampling(client, monkeypatch):
    design = artifact_design(client)
    provider(client, monkeypatch, design)
    row = finish(client, client.post("/api/chats", json={"question": design["question"]}))
    assert row["status"] == "complete", row
    output = row["output"]
    assert output["supported"] and output["design"]["question"] == design["question"]
    assert len(output["design"]["profiles"]) == 1
    assert output["design"]["hypothesis"] == "" and output["design"]["measures"] == []
    assert client.get("/api/studies").json() == []
    requests_before = client.get("/api/settings").json()["usage"]["requests"]
    saved = client.post("/api/studies", json={"design": output["design"], "plan_id": row["id"]})
    assert saved.status_code == 201, saved.text
    study = client.get(f"/api/studies/{saved.json()['id']}").json()
    assert len(study["runs"]) == 2
    assert all(run["status"] == "ready" and run["turn"] == 0 for run in study["runs"])
    assert client.get("/api/settings").json()["usage"]["requests"] == requests_before
    retain("folio_explore-study", study)


def test_confirmatory_harness_comparison_freezes_intent_replication_and_analysis(
    client, monkeypatch
):
    design = artifact_design(client, "archive_confirm")
    design["seeds"], design["repetitions"] = [47, 89], 2
    design["conditions"][0]["parameters"]["artifacts"]["objects"][0]["content"] = {"reading": 101}
    second = copy.deepcopy(design["conditions"][0])
    second.update(
        key="tools",
        name="Tool-using assistant",
        harness={
            "kind": "tool_using",
            "version": "2.0.0",
            "tools": ["observe", "read_artifact"],
            "max_requests": 4,
            "max_tool_operations": 3,
        },
    )
    design["conditions"].append(second)
    design["hypothesis"] = "Before trials: compare the fraction of terminal runs with a "
    design["hypothesis"] += "source-linked correct submission in each harness arm. Keep failed, "
    design["hypothesis"] += "paused and unsuccessful attempts visible; two repetitions per "
    design["hypothesis"] += "fixed seed are not independent population draws."
    design["analysis_plan"] = {
        "version": 1,
        "intent": "confirmatory",
        "outcomes": [
            {"key": "correct_submission", "calculation": "metric", "metric": "artifact_success"}
        ],
    }
    brief = scope(design, intent="confirmatory")
    brief["requirements"][0]["source"] = "authorized evidence"
    provider(client, monkeypatch, design, brief=brief)
    row = finish(client, client.post("/api/chats", json={"question": design["question"]}))
    assert row["status"] == "complete", row
    proposal = row["output"]["design"]
    assert row["output"]["planning"]["brief"]["intent"] == "confirmatory"
    assert proposal["repetitions"] == 2 and proposal["seeds"] == [47, 89]
    assert proposal["hypothesis"] == design["hypothesis"]
    assert [c["harness"]["kind"] for c in proposal["conditions"]] == ["direct_action", "tool_using"]
    assert {c["model"] for c in proposal["conditions"]} == {"openai:gpt-6-luna"}
    assert (
        proposal["conditions"][0]["parameters"]["artifacts"]
        == proposal["conditions"][1]["parameters"]["artifacts"]
    )
    assert client.get("/api/studies").json() == []


def test_candidate_probe_uses_exact_population_rules_and_reusable_source(client, monkeypatch):
    design = artifact_design(client, "private_delta")
    brief = scope(design)
    brief["requirements"][0]["source"] = "public report"
    provider(client, monkeypatch, design, brief=brief)
    row = finish(client, client.post("/api/chats", json={"question": design["question"]}))
    assert row["status"] == "complete", row
    operations = row["output"]["research"]["operations"]
    discovery = next(op for op in operations if op["request"]["kind"] == "capabilities")
    entry = next(e for e in discovery["data"]["environments"] if e["key"] == "artifact_workspace")
    proposal = row["output"]["design"]
    assert proposal["environment_source"] == entry["source"]
    probe = next(
        op for op in operations if op["request"].get("source", {}).get("kind") == "candidate"
    )
    assert probe["request"]["source"]["condition_key"] == "folio"
    assert probe["status"] == "complete"
    data = probe["data"]
    assert data["hypothetical"] and data["participant_calls"] == 0
    assert data["actor"] == "archivist"
    assert data["observation"]["writes_remaining"] == 2
    assert {a["key"] for a in data["observation"]["artifacts"]} == {"amber", "folio"}
    assert "vault" not in json.dumps(data["legal_schema"])
    assert data["observation"]["public_history"] == []
    assert data["source_checkpoint_hash"] == data["final_checkpoint_hash"]
    assert row["output"]["planning"]["preflight"]["status"] != "blocked"
    assert client.get("/api/studies").json() == []
    assert client.get(f"/api/chats/{row['chat_id']}").json()[0] == row


def test_explicit_copied_artifact_witness_retains_exact_content_and_consequences(
    client, monkeypatch
):
    design = artifact_design(client)
    actions = [
        {"kind": "read_artifact", "artifact": "amber", "version": 1},
        {
            "kind": "write_artifact",
            "artifact": "folio",
            "expected_version": 1,
            "content": {"reading": 63},
            "sources": [{"artifact": "amber", "version": 1}],
        },
        {"kind": "check_artifacts"},
        {"kind": "submit_artifacts"},
    ]
    provider(
        client,
        monkeypatch,
        design,
        candidate=lambda _: {
            "explanation": "Check source-linked work on an isolated copy, not a live participant.",
            "design": design,
            "probes": [
                {
                    "condition_key": "folio",
                    "steps": [{"actor": "archivist", "action": action} for action in actions],
                }
            ],
        },
    )
    row = finish(client, client.post("/api/chats", json={"question": design["question"]}))
    assert row["status"] == "complete", row
    probe = next(
        op
        for op in row["output"]["research"]["operations"]
        if op["request"].get("source", {}).get("kind") == "candidate"
    )
    data = probe["data"]
    assert len(data["steps"]) == 4
    assert data["steps"][1]["observation"]["last_result"]["content"] == {"reading": 63}
    assert data["outcome"]["artifact_outcome"]["status"] == "success"
    assert data["outcome"]["artifact_outcome"]["result"]["passed"]
    assert data["source_checkpoint_hash"] != data["final_checkpoint_hash"]
    rules = row["output"]["design"]["conditions"][0]["parameters"]["artifacts"]
    assert rules["objects"][1]["content"] == {"reading": -11}
    assert rules["write_limit"] == 2
    assert client.get("/api/studies").json() == []


def test_unsupported_mechanics_retain_original_question_and_narrower_supported_alternative(
    client, monkeypatch
):
    question = CASES["unsupported_network"]["question"]
    design = artifact_design(client)
    alternative = {
        "question": "How does one assistant inspect preloaded evidence and revise a report?",
        "environment": "artifact_workspace",
        "limitation": "Preloaded structured records only; no live browsing or Python execution.",
    }
    provider(
        client,
        monkeypatch,
        design,
        brief=scope(
            design,
            supported=False,
            explanation="Live internet browsing and downloaded Python execution "
            "are not implemented.",
            requirements=[
                {
                    "source": "executes downloaded Python",
                    "capability": "unavailable",
                    "mapping": "missing",
                    "explanation": "No admitted arbitrary-code execution or live browser tool.",
                }
            ],
            alternatives=[alternative],
        ),
    )
    row = finish(client, client.post("/api/chats", json={"question": question}))
    assert row["status"] == "complete", row
    assert row["question"] == question
    assert row["output"]["design"] is None and not row["output"]["supported"]
    assert row["output"]["alternatives"] == [alternative]
    assert alternative["question"] in row["output"]["explanation"]
    assert any(
        op["request"]["kind"] == "capabilities" and op["status"] == "complete"
        for op in row["output"]["research"]["operations"]
    )
    assert client.get("/api/studies").json() == []


def test_only_material_permission_ambiguity_stops_for_clarification(client, monkeypatch):
    design = artifact_design(client, "private_delta")
    clarification = "May the investigator read the sealed source, or must access be denied?"
    provider(
        client,
        monkeypatch,
        design,
        brief=scope(
            design,
            supported=False,
            clarification=clarification,
            explanation="Source permission changes the available evidence "
            "and the meaning of success.",
        ),
    )
    first = finish(
        client,
        client.post(
            "/api/chats",
            json={
                "question": CASES["material_ambiguity"]["question"],
            },
        ),
    )
    assert first["status"] == "complete", first
    assert first["output"]["clarification"] == clarification
    assert first["output"]["design"] is None
    assert clarification in first["output"]["explanation"]
    assert client.get("/api/studies").json() == []
    brief = scope(design)
    brief["requirements"][0]["source"] = "report"
    provider(client, monkeypatch, design, brief=brief)
    followup = finish(
        client,
        client.post(
            "/api/chats",
            json={
                "question": "Allow the investigator to read the sealed source "
                "and correct the report.",
                "chat_id": first["chat_id"],
            },
        ),
    )
    assert followup["status"] == "complete", followup
    assert followup["output"]["supported"]
    assert first["chat_id"] == followup["chat_id"]
    assert [r["id"] for r in client.get(f"/api/chats/{first['chat_id']}").json()] == [
        first["id"],
        followup["id"],
    ]


def test_fabricated_reusable_source_cannot_become_reviewed_provenance(client, monkeypatch):
    design = artifact_design(client)
    source = next(
        e["source"]
        for e in client.get("/api/catalog").json()["environments"]
        if e["key"] == "artifact_workspace"
    )
    source["id"] = "invented-library-record"
    design["environment_source"] = source
    provider(client, monkeypatch, design)
    row = finish(client, client.post("/api/chats", json={"question": design["question"]}))
    assert row["status"] == "failed", row
    assert "source" in row["error"].casefold()
    assert not row["output"].get("design")
    assert client.get("/api/studies").json() == []


def test_library_pin_survives_deletion_edits_and_immutable_save_without_sampling(
    client, monkeypatch
):
    design = artifact_design(client, "private_delta")
    definition = client.post("/api/design/environment", json={"design": design}).json()
    created = client.post("/api/environments", json={"definition": definition})
    assert created.status_code == 201, created.text
    source = created.json()
    design["environment_source"] = source
    brief = scope(design)
    brief["requirements"][0]["source"] = "public report"
    calls = provider(client, monkeypatch, design, brief=brief)
    proposal = finish(client, client.post("/api/chats", json={"question": design["question"]}))
    assert proposal["status"] == "complete", proposal
    original = copy.deepcopy(proposal["output"]["design"])
    discovery = next(
        op
        for op in proposal["output"]["research"]["operations"]
        if op["request"]["kind"] == "capabilities"
    )
    assert source in discovery["data"]["custom_environments"]
    assert original["environment_source"] == source
    changed_definition = copy.deepcopy(definition)
    changed_definition["name"] = "Later library label"
    updated = client.put(
        f"/api/environments/{source['id']}",
        json={"revision": 1, "definition": changed_definition},
    )
    assert updated.status_code == 200, updated.text
    assert client.delete(f"/api/environments/{source['id']}?revision=2").status_code == 200
    before = len(calls)
    saved = client.post("/api/studies", json={"design": original, "plan_id": proposal["id"]})
    assert saved.status_code == 201, saved.text
    sid = saved.json()["id"]
    edited = copy.deepcopy(original)
    edited["title"] = "Edited solo pilot"
    edited["conditions"][0]["parameters"]["memory"] = "notes"
    edited["conditions"][0]["parameters"]["artifacts"]["write_limit"] = 3
    checked = client.post(
        "/api/design/preflight", json={"design": edited, "plan_id": proposal["id"]}
    )
    assert checked.status_code == 200, checked.text
    check = checked.json()
    assert check["original_question"] == CASES["private_delta"]["question"]
    assert any(i["code"] == "edited_proposal" for i in check["issues"])
    revised = client.post(
        f"/api/studies/{sid}/revisions", json={"design": edited, "plan_id": proposal["id"]}
    )
    assert revised.status_code == 201, revised.text
    first = client.get(f"/api/studies/{sid}?revision=1").json()
    second = client.get(f"/api/studies/{sid}?revision=2").json()
    assert first["design"] == original
    assert second["design"] == edited
    assert first["plan_id"] == second["plan_id"] == proposal["id"]
    assert {r["id"] for r in first["runs"]}.isdisjoint(r["id"] for r in second["runs"])
    exported = client.get(f"/api/studies/{sid}/export").json()
    assert [r["design"]["environment_source"] for r in exported["revisions"]] == [source, source]
    assert exported["analyses"][0]["output"] == proposal["output"]
    assert all(r["record"]["summary"]["turn"] == 0 for r in exported["runs"])
    assert all(r["record"]["summary"]["status"] == "ready" for r in exported["runs"])
    assert all(
        r["run_id"] is None and r["model"] == "openai:gpt-6.1-sol" for r in exported["requests"]
    )
    assert len(calls) == before
    assert client.get(f"/api/chats/{proposal['chat_id']}").json() == [proposal]
    retain("private_delta-revisions-export", exported)
    # A same-chat refinement may reuse the immutable source after its library deletion.
    followup = finish(
        client,
        client.post(
            "/api/chats",
            json={
                "question": "Keep the public report and the same sealed source in the solo pilot.",
                "chat_id": proposal["chat_id"],
            },
        ),
    )
    assert followup["status"] == "complete", followup
    assert followup["output"]["design"]["environment_source"] == source
    assert client.get(f"/api/studies/{sid}?revision=1").json()["design"] == original


@pytest.mark.parametrize("repair", [False, True])
def test_question_fidelity_is_reviewed_from_actual_acl_and_content_not_prompt_wording(
    client, monkeypatch, repair
):
    desired = artifact_design(client, "private_delta")
    wrong = copy.deepcopy(desired)
    wrong["conditions"][0]["parameters"]["artifacts"]["objects"][0]["readers"] = []
    attempts = 0
    inspected = []

    def candidate(_):
        nonlocal attempts
        attempts += 1
        return {
            "explanation": "An investigator with an authorized source and a persistent report.",
            "design": desired if repair and attempts > 1 else wrong,
        }

    def independent_review(prompt):
        proposed = prompt["candidate"]["design"]
        evidence = proposed["conditions"][0]["parameters"]["artifacts"]["objects"][0]
        inspected.append(copy.deepcopy(proposed))
        # Oracle is the frozen private_delta task: the investigator actually needs access.
        issues = (
            []
            if evidence["readers"] == ["archivist"]
            else [
                "The investigator cannot read the sealed source; "
                "the proposed ACL changes the question."
            ]
        )
        return {"issues": issues, "summary": "Inspect authorized source-backed report revisions."}

    brief = scope(desired)
    brief["requirements"][0]["source"] = "public report"
    provider(
        client, monkeypatch, wrong, brief=brief, candidate=candidate, review=independent_review
    )
    row = finish(client, client.post("/api/chats", json={"question": desired["question"]}))
    assert row["question"] == CASES["private_delta"]["question"]
    assert row["output"]["planning"]["reviews"][0]["issues"]
    if repair:
        assert row["status"] == "complete", row
        assert len(inspected) == 2
        assert row["output"]["design"]["conditions"] == desired["conditions"]
    else:
        assert row["status"] == "failed", row
        assert len(inspected) == 3
        assert not row["output"].get("design")
    assert client.get("/api/studies").json() == []


def test_denied_candidate_probe_retains_rejection_and_repairs_on_a_fresh_copy(client, monkeypatch):
    design = artifact_design(client)
    attempts = 0

    def candidate(_):
        nonlocal attempts
        attempts += 1
        return {
            "explanation": "Inspect the authorized evidence on a copy.",
            "design": design,
            "probes": [
                {
                    "condition_key": "folio",
                    "steps": [
                        {
                            "actor": "archivist",
                            "action": {
                                "kind": "read_artifact",
                                "artifact": "vault" if attempts == 1 else "amber",
                                "version": 1,
                            },
                        }
                    ],
                }
            ],
        }

    provider(client, monkeypatch, design, candidate=candidate)
    row = finish(client, client.post("/api/chats", json={"question": design["question"]}))
    assert row["status"] == "complete", row
    probes = [
        op
        for op in row["output"]["research"]["operations"]
        if op["request"].get("source", {}).get("kind") == "candidate"
    ]
    assert [op["status"] for op in probes] == ["rejected", "complete"]
    rejected, accepted = (op["data"] for op in probes)
    assert rejected["steps"] == []
    assert rejected["source_checkpoint_hash"] == rejected["final_checkpoint_hash"]
    assert rejected["source_checkpoint_hash"] == accepted["source_checkpoint_hash"]
    assert accepted["next_observation"]["last_result"]["content"] == {"reading": 63}
    assert accepted["next_observation"]["writes_remaining"] == 2
    assert row["output"]["planning"]["reviews"][0]["kind"] == "validation"
    assert client.get("/api/studies").json() == []


def test_simple_two_person_exchange_remains_reviewable_without_artifact_substitution(
    client, monkeypatch
):
    catalog = client.get("/api/catalog").json()
    design = next(t["design"] for t in catalog["templates"] if t["id"] == "bargaining")
    design.update(question=CASES["simple_exchange"]["question"], seeds=[113], rounds=2)
    design["conditions"] = design["conditions"][:1]
    design["conditions"][0]["parameters"]["endowment"] = 19
    design["conditions"][0]["parameters"]["bargaining"]["discount"] = 1
    brief = scope(design)
    brief["requirements"] = [
        {
            "source": "binding acceptance",
            "capability": "binding_negotiation",
            "mapping": "direct",
            "explanation": "An offer accepted by the other participant settles an enforced split.",
        }
    ]
    brief["size_rationale"] = (
        "Two necessary negotiating roles, one condition/seed, "
        "two opportunities for offer and acceptance; descriptive pilot only."
    )
    provider(client, monkeypatch, design, brief=brief)
    row = finish(client, client.post("/api/chats", json={"question": design["question"]}))
    assert row["status"] == "complete", row
    proposed = row["output"]["design"]
    assert proposed["question"] == CASES["simple_exchange"]["question"]
    assert proposed["environment"] == "bargaining" and len(proposed["profiles"]) == 2
    assert len(proposed["conditions"]) == 1 and proposed["seeds"] == [113]
    assert proposed["conditions"][0]["parameters"]["endowment"] == 19
    assert proposed["conditions"][0]["parameters"]["bargaining"]["discount"] == 1
    assert proposed["environment_source"]["definition"]["environment"] == "bargaining"


def test_general_explanation_uses_discovery_without_forcing_a_proposal(client, monkeypatch):
    design = artifact_design(client)

    def general(prompt):
        operations = prompt["research"]["operations"]
        return {
            "answer": "Saving pins rules and creates ready runs. Replay checks recorded "
            "consequences without inference. A new participant sample requires an explicit run.",
            "citations": [],
            "caveats": [],
            "propose_experiment": False,
            "requests": []
            if operations
            else [{"kind": "capabilities", "environment": "artifact_workspace"}],
        }

    calls = provider(client, monkeypatch, design, general=general)
    row = finish(
        client,
        client.post("/api/chats", json={"question": CASES["general_explanation"]["question"]}),
    )
    assert row["status"] == "complete" and row["purpose"] == "general", row
    assert "Replay checks recorded consequences without inference" in row["output"]["answer"]
    assert len(calls) == 2
    assert len(row["output"]["research"]["operations"]) == 1
    assert not row["output"].get("design")
    assert client.get("/api/studies").json() == []


def test_accepted_coordination_preserves_the_original_phase_and_delivery_question(
    client, monkeypatch
):
    design = next(
        t["design"]
        for t in client.get("/api/catalog").json()["templates"]
        if t["id"] == "distributed_coordination"
    )
    design["question"] = CASES["unsupported_coordination"]["question"]
    provider(
        client,
        monkeypatch,
        design,
        brief=scope(
            design,
            explanation="Installed phased artifact conflicts and addressed logical-time delivery.",
            operationalization="Inspect conflicts, private mail and voluntary final choices.",
            size_rationale="Three independently active peers, eight phase opportunities with "
            "early stopping and two matched information arms. Capture actual observations, "
            "mail, conflicts and outcomes; one seed is not population inference.",
            requirements=[
                {
                    "source": "distributed-information",
                    "capability": "distributed_information",
                    "mapping": "direct",
                    "explanation": "Three actors, declared phase conflicts and delayed mail.",
                }
            ],
        ),
    )
    row = finish(
        client,
        client.post("/api/chats", json={"question": CASES["unsupported_coordination"]["question"]}),
    )
    assert row["status"] == "complete", row
    assert row["output"]["supported"]
    assert row["question"] == CASES["unsupported_coordination"]["question"]
    proposed = row["output"]["design"]
    assert proposed["question"] == design["question"]
    assert proposed["environment"] == "distributed_coordination"
    assert len(proposed["profiles"]) == 3
    for expected, actual in zip(design["conditions"], proposed["conditions"], strict=True):
        assert actual["parameters"]["coordination"] == expected["parameters"]["coordination"]
        assert actual["parameters"]["artifacts"] == expected["parameters"]["artifacts"]
    probes = [
        op
        for op in row["output"]["research"]["operations"]
        if op["request"].get("source", {}).get("kind") == "candidate"
    ]
    assert len(probes) == 2 and all(p["status"] == "complete" for p in probes)
    assert all(p["data"]["stop_reason"] == "inspected" for p in probes)
    assert client.get("/api/studies").json() == []


def test_confirmatory_without_advance_analysis_stays_failed_not_executable(client, monkeypatch):
    design = artifact_design(client, "archive_confirm")
    brief = scope(design, intent="confirmatory")
    brief["requirements"][0]["source"] = "authorized evidence"
    provider(client, monkeypatch, design, brief=brief)
    row = finish(client, client.post("/api/chats", json={"question": design["question"]}))
    assert row["status"] == "failed", row
    assert "analysis plan" in row["error"]
    assert not row["output"].get("design")
    assert len(row["output"]["planning"]["reviews"]) == 3
    assert client.get("/api/studies").json() == []


def test_pending_real_review_survives_reconnect_and_cannot_be_saved_or_resubmitted(
    client, monkeypatch
):
    design = artifact_design(client)
    entered, release = Event(), Event()

    async def review(_):
        entered.set()
        await asyncio.to_thread(release.wait)
        return {
            "issues": [],
            "summary": "A source-backed exploratory pilot, pending explicit trials.",
        }

    calls = provider(client, monkeypatch, design, review=review)
    submitted = client.post("/api/chats", json={"question": design["question"]})
    assert submitted.status_code == 202, submitted.text
    try:
        assert entered.wait(timeout=5)
        identity = submitted.json()
        pending = client.get(f"/api/chats/{identity['chat_id']}").json()[0]
        assert pending["id"] == identity["id"] and pending["status"] == "pending"
        assert pending["output"]["stage"] == "reviewing"
        assert not pending["output"].get("design")
        assert "probing" in pending["output"]["activity"]
        before = len(calls)
        assert (
            client.post(
                "/api/studies",
                json={
                    "design": design,
                    "plan_id": identity["id"],
                },
            ).status_code
            == 422
        )
        duplicate = client.post(
            "/api/chats",
            json={
                "question": "Do not duplicate this proposal",
                "chat_id": identity["chat_id"],
            },
        )
        assert duplicate.status_code == 422, duplicate.text
        assert "Wait for the current request to finish" in duplicate.text
        assert len(calls) == before
        assert client.get("/api/studies").json() == []
        retain("pending-review-reconnect", pending)
    finally:
        release.set()
    complete = finish(client, submitted)
    assert complete["status"] == "complete", complete
    assert complete["id"] == identity["id"]
    assert complete["output"]["design"]["question"] == design["question"]
