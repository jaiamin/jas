"""Fresh T13 DEVELOPMENT checks at the approved public workflow boundary."""

import copy

import pytest

from backend.tests.test_researcher_designs import artifact_design, finish, provider, retain, scope
from backend.tests.test_researcher_designs import client as client


def coordination_design(client):
    template = next(
        t["design"]
        for t in client.get("/api/catalog").json()["templates"]
        if t["id"] == "distributed_coordination"
    )
    actors = ["reed", "opal", "cobalt"]
    template.update(
        question="Design three-agent distributed-information work with simultaneous claims "
        "on one report, delayed private messages, and enforced conflict resolution independent "
        "of API response order.",
        profiles=[
            {"key": a, "name": a.title(), "goal": "Inspect evidence and choose as you prefer."}
            for a in actors
        ],
        hypothesis="",
        seeds=[223],
        rounds=6,
    )
    for condition, shared in zip(template["conditions"], [False, True], strict=True):
        condition["parameters"]["artifacts"].update(
            write_limit=3,
            objects=[
                *[
                    {
                        "key": f"signal_{actor}",
                        "name": f"Evidence for {actor.title()}",
                        "owner": None,
                        "readers": actors if shared else [actor],
                        "writers": [],
                        "content": values,
                    }
                    for actor, values in zip(
                        actors,
                        [{"east": 17, "west": 3}, {"east": 5, "west": 19}, {"east": 11, "west": 7}],
                        strict=True,
                    )
                ],
                {
                    "key": "report",
                    "name": "Shared report",
                    "owner": None,
                    "readers": actors,
                    "writers": actors,
                    "content": {"reading": -8},
                },
            ],
        )
        condition["parameters"]["coordination"].update(
            turn_order=actors,
            conflict_order=["cobalt", "reed", "opal"],
            delivery_delay=1,
            alternatives=["east", "west"],
            information={a: f"signal_{a}" for a in actors},
            routes=[{"sender": a, "recipient": b} for a in actors for b in actors if a != b],
            match_bonus=0,
        )
    return template


def test_available_mechanics_cannot_be_declined_without_identifying_a_real_gap(client, monkeypatch):
    design = coordination_design(client)
    brief = scope(design)
    brief.update(
        operationalization="Describe private information, addressed mail, conflicting report "
        "writes and independent final choices against shared-information access.",
        size_rationale="Three independent choice makers, six phase opportunities with early "
        "stop, two matched information conditions and one seed. One trajectory per arm is "
        "descriptive, not three independent replicates. Capture phases, mail and inputs.",
        requirements=[
            {
                "source": "distributed-information",
                "capability": "distributed_information",
                "mapping": "direct",
                "explanation": "Installed phased choices, conflict priorities and addressed mail.",
            }
        ],
    )
    declined = copy.deepcopy(brief)
    declined.update(supported=False, explanation="These coordination mechanics are unavailable.")
    calls = provider(
        client,
        monkeypatch,
        design,
        brief=lambda prompt: brief if prompt.get("scope_feedback") else declined,
    )
    row = finish(client, client.post("/api/chats", json={"question": design["question"]}))
    assert row["status"] == "complete", row
    assert row["output"]["supported"], row
    actual = row["output"]["design"]
    assert actual["question"] == design["question"]
    assert actual["environment"] == "distributed_coordination"
    assert [p["key"] for p in actual["profiles"]] == ["reed", "opal", "cobalt"]
    for expected, condition in zip(design["conditions"], actual["conditions"], strict=True):
        assert condition["parameters"]["artifacts"] == expected["parameters"]["artifacts"]
        assert condition["parameters"]["coordination"] == expected["parameters"]["coordination"]
    for op in row["output"]["research"]["operations"]:
        if op["request"].get("source", {}).get("kind") != "candidate":
            continue
        data = op["data"]
        assert data["participant_calls"] == 0 and data["stop_reason"] == "inspected"
        observed = data["observation"]
        assert observed["logical_time"] == 0 and observed["inbox"] == observed["outbox"] == []
        assert observed["coordination"]["timing"] == "phased_simultaneous"
        assert observed["coordination"]["delivery_delay"] == 1
        assert observed["coordination"]["conflict_order"] == ["cobalt", "reed", "opal"]
        visible = {a["key"] for a in observed["artifacts"]}
        assert visible == (
            {"signal_reed", "report"}
            if op["request"]["source"]["condition_key"] == "distributed"
            else {"signal_reed", "signal_opal", "signal_cobalt", "report"}
        )
    assert len([p for p in calls if "scope_feedback" in p["prompt"]]) >= 1
    assert client.get("/api/studies").json() == []


def quartz_design(client):
    design = artifact_design(client)
    design.update(
        question="Design an exploratory study: can one investigator revise a folio after "
        "conflicting readings73/-8, with a sealed unrelated memo901?",
        seeds=[193, 211],
    )
    design["profiles"][0].update(
        key="quartz",
        name="Quartz",
        role="Authority",
        goal="Inspect accessible records and decide when to submit or stop.",
    )
    direct = design["conditions"][0]
    direct.update(key="direct", name="Direct investigator")
    rules = direct["parameters"]["artifacts"]
    for obj, key, value in zip(
        rules["objects"], ["saffron", "folio", "vault", "counter"], [73, -8, 901, -8], strict=True
    ):
        obj.update(key=key, content={"reading": value})
        obj["owner"] = "quartz" if obj["owner"] else None
        obj["readers"] = ["quartz"] if obj["readers"] else []
        obj["writers"] = ["quartz"] if obj["writers"] else []
    rules["requirements"][0].update(source="saffron", artifact="folio")
    capable = copy.deepcopy(direct)
    capable.update(
        key="tools",
        name="Tool-using investigator",
        harness={
            "kind": "tool_using",
            "version": "2.0.0",
            "tools": ["observe", "read_artifact"],
            "max_requests": 5,
            "max_tool_operations": 5,
        },
    )
    design["conditions"].append(capable)
    return design


def test_quartz_exploration_preserves_exact_copies_and_saving_adds_no_calls(client, monkeypatch):
    design = quartz_design(client)
    brief = scope(design)
    brief["requirements"][0]["source"] = "revise a folio"
    brief["size_rationale"] = (
        "One active investigator with enforced object permissions. Seven opportunities allow "
        "evidence acquisition, revision, checking and submission; submit/stop ends early. "
        "Direct reads consume turns; tool reads consume independent request/operation limits. "
        "Two harness arms and two fixed seeds retain four trajectories, not independent turns. "
        "Capture exact inputs/receipts, versions, rejections and incomplete work."
    )
    steps = [
        {"kind": "read_artifact", "artifact": "saffron", "version": 1},
        {
            "kind": "write_artifact",
            "artifact": "folio",
            "expected_version": 1,
            "content": {"reading": 73},
            "sources": [{"artifact": "saffron", "version": 1}],
        },
        {"kind": "check_artifacts"},
        {"kind": "submit_artifacts"},
    ]
    calls = provider(
        client,
        monkeypatch,
        design,
        brief=brief,
        candidate=lambda _: {
            "explanation": "Explore authorized work and retain unsuccessful alternatives.",
            "design": design,
            "probes": [
                {
                    "condition_key": "direct",
                    "steps": [{"actor": "quartz", "action": action} for action in steps],
                }
            ],
        },
    )
    row = finish(client, client.post("/api/chats", json={"question": design["question"]}))
    assert row["status"] == "complete", row
    proposal = row["output"]["design"]
    assert proposal["question"] == design["question"]
    assert proposal["hypothesis"] == "" and proposal["measures"] == []
    assert [p["key"] for p in proposal["profiles"]] == ["quartz"]
    assert proposal["environment_source"]["format"] == "jas-environment-v6"
    probes = {
        op["request"]["source"]["condition_key"]: op["data"]
        for op in row["output"]["research"]["operations"]
        if op["request"].get("source", {}).get("kind") == "candidate"
    }
    assert probes.keys() == {"direct", "tools"}
    for key, data in probes.items():
        assert data["hypothetical"] and data["participant_calls"] == 0
        assert data["actor"] == "quartz" and data["observation"]["writes_remaining"] == 2
        assert data["observation"]["public_history"] == []
        assert "vault" not in str(data["legal_schema"])
        expected = next(c for c in design["conditions"] if c["key"] == key)
        actual = next(c for c in proposal["conditions"] if c["key"] == key)
        assert actual["parameters"]["artifacts"] == expected["parameters"]["artifacts"]
    assert probes["direct"]["steps"][1]["observation"]["last_result"]["content"] == {"reading": 73}
    assert probes["direct"]["outcome"]["artifact_outcome"]["status"] == "success"
    assert probes["tools"]["steps"] == [] and probes["tools"]["stop_reason"] == "inspected"
    assert probes["tools"]["source_checkpoint_hash"] == probes["tools"]["final_checkpoint_hash"]
    usage = client.get("/api/settings").json()["usage"]
    count = len(calls)
    saved = client.post("/api/studies", json={"design": proposal, "plan_id": row["id"]})
    assert saved.status_code == 201, saved.text
    exported = client.get(f"/api/studies/{saved.json()['id']}/export").json()
    assert exported["version"] == 10
    assert len(exported["runs"]) == 4
    assert all(r["record"]["summary"]["status"] == "ready" for r in exported["runs"])
    assert all(r["record"]["summary"]["turn"] == 0 for r in exported["runs"])
    assert all(
        q["run_id"] is None and q["model"] == "openai:gpt-6.1-sol" for q in exported["requests"]
    )
    assert len(calls) == count and client.get("/api/settings").json()["usage"] == usage
    retain("quartz-export", exported)
    retain("quartz-requests", calls)


def test_real_missing_mechanics_clarification_and_general_answer_preserve_the_chat(
    client, monkeypatch
):
    design = quartz_design(client)
    question = "Can one investigator run arbitrary Python against live camera frames?"
    alternative = {
        "question": "How does one investigator revise work from preloaded structured readings?",
        "environment": "artifact_workspace",
        "limitation": "No live camera input or arbitrary Python execution.",
    }
    provider(
        client,
        monkeypatch,
        design,
        brief=scope(
            design,
            supported=False,
            explanation="Live video and Python are absent.",
            requirements=[
                {
                    "source": "run arbitrary Python",
                    "capability": "unavailable",
                    "mapping": "missing",
                    "explanation": "No external execution mechanic.",
                }
            ],
            alternatives=[alternative],
        ),
    )
    missing = finish(client, client.post("/api/chats", json={"question": question}))
    assert missing["status"] == "complete" and missing["question"] == question
    assert not missing["output"]["supported"] and missing["output"]["design"] is None
    assert missing["output"]["alternatives"] == [alternative]
    discovery = missing["output"]["research"]["operations"]
    assert len(discovery) == 1 and discovery[0]["request"]["kind"] == "capabilities"
    assert "distributed_coordination" in {e["key"] for e in discovery[0]["data"]["environments"]}
    clarification = "May Quartz read the sealed original? Permission changes the evidence."
    provider(
        client,
        monkeypatch,
        design,
        brief=scope(design, supported=False, clarification=clarification),
    )
    clarified = finish(
        client,
        client.post(
            "/api/chats",
            json={
                "chat_id": missing["chat_id"],
                "question": "I have not decided whether Quartz may read the sealed original.",
            },
        ),
    )
    assert clarified["status"] == "complete" and clarified["output"]["design"] is None
    assert clarified["output"]["clarification"] == clarification
    answer = "Replay rechecks recorded consequences without inference; a fresh sample "
    answer += "requires an explicit run and can differ. Saving alone does not sample anyone."
    calls = provider(
        client,
        monkeypatch,
        design,
        general=lambda _: {
            "answer": answer,
            "citations": [],
            "caveats": [],
            "propose_experiment": False,
            "requests": [],
        },
    )
    explained = finish(
        client,
        client.post(
            "/api/chats",
            json={
                "chat_id": missing["chat_id"],
                "question": "Explain replay versus a fresh sample.",
            },
        ),
    )
    assert explained["status"] == "complete" and explained["purpose"] == "general"
    assert explained["output"]["answer"] == answer and not explained["output"].get("design")
    history = client.get(f"/api/chats/{missing['chat_id']}").json()
    assert [r["id"] for r in history] == [missing["id"], clarified["id"], explained["id"]]
    assert len(calls) == 1 and client.get("/api/studies").json() == []
    retain("fresh-unsupported-clarification-general", history)


def test_quartz_source_reuse_is_exact_and_scoped_to_the_captured_conversation(client, monkeypatch):
    design = quartz_design(client)
    definition = client.post("/api/design/environment", json={"design": design}).json()
    saved = client.post("/api/environments", json={"definition": definition})
    assert saved.status_code == 201, saved.text
    source = saved.json()
    assert source["format"] == "jas-environment-v6"
    design["environment_source"] = source
    brief = scope(design)
    brief["requirements"][0]["source"] = "revise a folio"
    provider(client, monkeypatch, design, brief=brief)
    first = finish(client, client.post("/api/chats", json={"question": design["question"]}))
    assert first["status"] == "complete", first
    assert client.delete(f"/api/environments/{source['id']}?revision=1").status_code == 200
    same_chat = finish(
        client,
        client.post(
            "/api/chats",
            json={
                "chat_id": first["chat_id"],
                "question": "Keep that source and revise a folio.",
            },
        ),
    )
    assert same_chat["status"] == "complete", same_chat
    assert same_chat["output"]["design"]["environment_source"] == source
    invented = copy.deepcopy(design)
    invented["environment_source"]["revision"] += 1
    provider(client, monkeypatch, invented, brief=brief)
    false_revision = finish(
        client,
        client.post(
            "/api/chats",
            json={
                "chat_id": first["chat_id"],
                "question": "Again revise a folio using the same source.",
            },
        ),
    )
    assert false_revision["status"] == "failed" and "source" in false_revision["error"]
    assert not false_revision["output"].get("design")
    provider(client, monkeypatch, design, brief=brief)
    other_chat = finish(client, client.post("/api/chats", json={"question": design["question"]}))
    assert other_chat["chat_id"] != first["chat_id"]
    assert other_chat["status"] == "failed" and "source" in other_chat["error"]
    assert not other_chat["output"].get("design")
    assert client.get(f"/api/analyses/{first['id']}").json() == first
    assert client.get("/api/studies").json() == []
    retain("source-scope-witness", [first, same_chat, false_revision, other_chat])


def test_quartz_confirmation_requires_advance_commitments_and_retains_replication(
    client, monkeypatch
):
    design = quartz_design(client)
    design.update(
        question="Propose a confirmatory direct1/tool2 comparison using authorized records, "
        "readings73/-8, seeds193/211 and two fresh samples per seed.",
        repetitions=2,
    )
    brief = scope(design, intent="confirmatory")
    brief["requirements"][0]["source"] = "authorized records"
    brief["size_rationale"] = (
        "One investigator, two harness conditions, two fixed seeds and two fresh samples "
        "per seed: eight planned runs. Seven opportunities include acquisition, revision, "
        "checking and submission with early stop. Capture exact input/receipts, versions and "
        "all unsuccessful/missing work; neither turns nor actors are independent replicates."
    )
    provider(client, monkeypatch, design, brief=brief)
    absent = finish(client, client.post("/api/chats", json={"question": design["question"]}))
    assert absent["status"] == "failed" and "analysis plan" in absent["error"]
    assert not absent["output"].get("design")
    denied = client.post("/api/studies", json={"design": design, "plan_id": absent["id"]})
    assert denied.status_code == 422
    plan = "Before trials: compare source-linked correct terminal submissions per assigned "
    plan += "run across harness arms. Retain failed/interrupted/unsuccessful work in planned "
    plan += "denominators and show missing outcomes. Fixed seeds and fresh repetitions do not "
    plan += "establish independent population draws."
    design["hypothesis"] = plan
    provider(client, monkeypatch, design, brief=brief)
    ready = finish(
        client,
        client.post(
            "/api/chats",
            json={
                "chat_id": absent["chat_id"],
                "question": design["question"],
            },
        ),
    )
    assert ready["status"] == "complete", ready
    proposed = ready["output"]["design"]
    assert ready["output"]["planning"]["brief"]["intent"] == "confirmatory"
    assert proposed["hypothesis"] == plan and proposed["seeds"] == [193, 211]
    assert proposed["repetitions"] == 2
    assert [c["harness"]["version"] for c in proposed["conditions"]] == ["1.0.0", "2.0.0"]
    assert {c["model"] for c in proposed["conditions"]} == {"openai:gpt-6-luna"}
    assert (
        proposed["conditions"][0]["parameters"]["artifacts"]
        == proposed["conditions"][1]["parameters"]["artifacts"]
    )
    assert plan not in proposed["context"]
    usage = client.get("/api/settings").json()["usage"]
    saved = client.post("/api/studies", json={"design": proposed, "plan_id": ready["id"]})
    assert saved.status_code == 201, saved.text
    study = client.get(f"/api/studies/{saved.json()['id']}").json()
    assert len(study["runs"]) == 8 and all(r["turn"] == 0 for r in study["runs"])
    assert client.get("/api/settings").json()["usage"] == usage
    retain("quartz-confirmation", {"absent": absent, "ready": ready, "study": study})


@pytest.mark.parametrize("population", [1, 3])
def test_genuine_population_incompatibility_remains_honestly_unsupported(
    client, monkeypatch, population
):
    design = next(
        t["design"]
        for t in client.get("/api/catalog").json()["templates"]
        if t["id"] == "bargaining"
    )
    question = f"Design binding negotiation with exactly {population} participants over31 credits."
    brief = scope(
        design,
        supported=False,
        agents=population,
        explanation="Installed binding bargaining requires exactly two participants.",
        requirements=[
            {
                "source": "binding negotiation",
                "capability": "binding_negotiation",
                "mapping": "direct",
                "explanation": "A dyadic mechanic with a fixed cast.",
            }
        ],
        alternatives=[
            {
                "question": "How do two participants negotiate a binding split over31 credits?",
                "environment": "bargaining",
                "limitation": "Two participants rather than the requested population.",
            }
        ],
    )
    provider(client, monkeypatch, design, brief=brief)
    row = finish(client, client.post("/api/chats", json={"question": question}))
    assert row["status"] == "complete", row
    assert row["question"] == question and not row["output"]["supported"]
    assert row["output"]["design"] is None
    assert row["output"]["alternatives"][0]["environment"] == "bargaining"
    invalid = copy.deepcopy(design)
    invalid["profiles"] = invalid["profiles"][:population]
    if population == 3:
        invalid["profiles"].append({"key": "third", "name": "Third", "goal": "Negotiate."})
    rejected = client.post("/api/design/validate", json={"design": invalid})
    assert rejected.status_code == 422, rejected.text
    assert client.get("/api/studies").json() == []
    retain(f"incompatible-population-{population}", {"answer": row, "validation": rejected.json()})


def test_two_person_binding_bargain_keeps_its_simple_question_and_spends_nothing_on_save(
    client, monkeypatch
):
    design = next(
        t["design"]
        for t in client.get("/api/catalog").json()["templates"]
        if t["id"] == "bargaining"
    )
    question = "Design a two-person binding bargain over31 credits."
    design.update(question=question, seeds=[227], rounds=2, hypothesis="", measures=[])
    design["conditions"] = design["conditions"][:1]
    design["conditions"][0].update(key="binding_split", name="Binding split")
    design["conditions"][0]["parameters"]["endowment"] = 31
    design["conditions"][0]["parameters"]["bargaining"]["discount"] = 1
    brief = scope(
        design,
        explanation="Two counterparties can negotiate a binding discounted split.",
        operationalization="Retain offers, accept/reject/exit, settled shares and early stops "
        "without claiming preferences or forcing agreement.",
        requirements=[
            {
                "source": "binding bargain",
                "capability": "binding_negotiation",
                "mapping": "direct",
                "explanation": "A binding discounted dyadic offer and response.",
            }
        ],
        size_rationale="Two necessary counterparties; two rounds permit an offer and response "
        "with one reversal after rejection, or earlier acceptance/exit. One condition and "
        "seed describe a trajectory, not independent population evidence. Retain every "
        "offer, rejection, choice, input and terminal outcome.",
    )
    calls = provider(
        client,
        monkeypatch,
        design,
        brief=brief,
        review=lambda _: {
            "issues": [],
            "summary": "Inspect offers and settled shares in a binding split. One fixed "
            "trajectory does not establish population preferences.",
        },
    )
    row = finish(client, client.post("/api/chats", json={"question": question}))
    assert row["status"] == "complete", row
    proposed = row["output"]["design"]
    assert proposed["question"] == question and len(proposed["profiles"]) == 2
    assert proposed["environment"] == "bargaining" and proposed["seeds"] == [227]
    assert proposed["hypothesis"] == "" and proposed["measures"] == []
    assert len(proposed["conditions"]) == 1
    assert proposed["conditions"][0]["parameters"]["endowment"] == 31
    assert proposed["conditions"][0]["parameters"]["bargaining"]["discount"] == 1
    probe = next(
        op["data"]
        for op in row["output"]["research"]["operations"]
        if op["request"].get("source", {}).get("kind") == "candidate"
    )
    assert probe["stop_reason"] == "inspected" and probe["participant_calls"] == 0
    offer = next(a for a in probe["observation"]["legal_actions"] if a["kind"] == "offer")
    assert offer["amount_max"] == 31
    usage = client.get("/api/settings").json()["usage"]
    count = len(calls)
    saved = client.post("/api/studies", json={"design": proposed, "plan_id": row["id"]})
    assert saved.status_code == 201, saved.text
    assert len(calls) == count and client.get("/api/settings").json()["usage"] == usage
    study = client.get(f"/api/studies/{saved.json()['id']}").json()
    assert len(study["runs"]) == 1 and study["runs"][0]["turn"] == 0
    retain("simple-binding-31", {"proposal": row, "study": study, "requests": calls})
