"""Independent fresh integration oracles at the public HTTP/World boundaries."""

import copy
import itertools

import pytest
from agent_sim.domain import Decision, Design
from agent_sim.simulation.environments import create_world

from backend.tests.test_artifact_workspace import decision, save
from backend.tests.test_claim_support import claim_client as claim_client
from backend.tests.test_claim_support import finish, run, source

ACTORS = ["zeta-4", "alpha-8", "nu-2"]


def protocol():
    return {
        "title": "Permuted local evidence",
        "question": "What changes when local evidence is shared?",
        "environment": "distributed_coordination",
        "profiles": [
            {"key": actor, "name": actor, "role": "Administrator", "goal": "Choose freely."}
            for actor in ACTORS
        ],
        "seeds": [17],
        "rounds": 4,
        "response_tokens": 512,
        "openai_reasoning_effort": "low",
        "measures": ["coordination_match", "coordination_value"],
        "conditions": [
            {
                "key": "local",
                "name": "Local evidence",
                "model": "openai:gpt-6-luna",
                "parameters": {
                    "artifacts": {
                        "write_limit": 1,
                        "objects": [
                            *[
                                {
                                    "key": f"evidence-{i}",
                                    "name": f"Private values {i}",
                                    "readers": [actor],
                                    "content": dict(
                                        zip(["ink", "salt", "clay"], values, strict=True)
                                    ),
                                }
                                for i, (actor, values) in enumerate(
                                    zip(ACTORS, [[4, -8, 2], [-7, 5, 0], [3, 1, -6]], strict=True)
                                )
                            ],
                            {
                                "key": "work",
                                "name": "Shared work",
                                "readers": ACTORS,
                                "writers": ACTORS,
                                "content": {"proposal": "none"},
                            },
                        ],
                    },
                    "coordination": {
                        "timing": "phased_simultaneous",
                        "turn_order": ACTORS,
                        "conflict_order": ["nu-2", "zeta-4", "alpha-8"],
                        "routes": [
                            {"sender": "nu-2", "recipient": "zeta-4"},
                            {"sender": "zeta-4", "recipient": "alpha-8"},
                            {"sender": "alpha-8", "recipient": "nu-2"},
                        ],
                        "delivery_delay": 2,
                        "alternatives": ["ink", "salt", "clay"],
                        "information": {actor: f"evidence-{i}" for i, actor in enumerate(ACTORS)},
                        "match_bonus": 2,
                    },
                },
            }
        ],
    }


def test_coordination_analysis_captures_nonfinancial_choices_without_solo_success(claim_client):
    client, controls, _ = claim_client
    controls["artifact_actions"] = iter([{"kind": "choose_alternative", "alternative": "ink"}] * 3)
    controls["claims"] = lambda _prompt, rid: [
        {
            "kind": "calculation",
            "text": "The declared terminal value is 6; motive remains unassessed.",
            "calculation_id": f"run:{rid}:coordination_value",
            "value": 6,
            "scope": "captured_run",
        }
    ]
    study, rid = save(client, protocol())
    assert run(client, rid)["status"] == "complete"
    before = source(client.get(f"/api/studies/{study['id']}/export").json())
    final = finish(
        client,
        client.post(
            "/api/chats", json={"question": "Inspect the choices.", "context": f"run:{rid}"}
        ),
    )
    assert final["status"] == "complete", final
    lens = final["output"]["lens"]
    fact = lens["facts"][0]
    assert fact["balances"] is None
    assert fact["coordination_state"]["outcome"]["payoffs"] == {
        "zeta-4": 6,
        "alpha-8": -5,
        "nu-2": 5,
    }
    values = {row["id"]: row["value"] for row in lens["calculations"]}
    assert values[f"run:{rid}:total_utility"] is None
    assert values[f"run:{rid}:coordination_value"] == 6
    assert values[f"run:{rid}:coordination_match"] == 1
    assert f"run:{rid}:artifact_success" not in values
    assert "declared choice value 6" in lens["account"][0]["text"]
    assert final["output"]["support"]["claims"][0]["status"] == "checked"
    assert final["output"]["support"]["prose_status"] == "unassessed"
    exported = client.get(f"/api/studies/{study['id']}/export").json()
    assert source(exported) == before
    calls = [call for call in exported["requests"] if call["analysis_id"] == final["id"]]
    assert len(calls) == final["usage"]["requests"] == 2
    inspected = [
        call
        for call in client.get(f"/api/runs/{rid}").json()["requests"]
        if call["analysis_id"] == final["id"]
    ]
    assert {call["purpose"] for call in inspected} == {"analysis"}
    assert {call["model"] for call in calls} == {"openai:gpt-6.1-sol"}
    assert client.post(f"/api/runs/{rid}/verify").json()["model_requests"] == 0


@pytest.mark.parametrize("cutoff", [1, 3, 6, 7, 9])
def test_analysis_distinguishes_pending_proposals_queued_mail_and_received_input(
    claim_client, cutoff
):
    client, controls, _ = claim_client
    controls["artifact_actions"] = iter(
        [
            {"kind": "send_message", "recipient": "alpha-8", "text": "private-mail-17"},
            *[{"kind": "wait_coordination"}] * 5,
            *[{"kind": "choose_alternative", "alternative": "salt"}] * 3,
        ]
    )
    study, rid = save(client, protocol())
    for number in range(1, cutoff + 1):
        assert run(client, rid, "step")["turn"] == number
    before = source(client.get(f"/api/studies/{study['id']}/export").json())
    final = finish(
        client,
        client.post(
            "/api/chats",
            json={
                "question": "What was delivered?",
                "context": f"run:{rid}",
                "lens": "communication",
            },
        ),
    )
    assert final["status"] == "complete", final
    lens = final["output"]["lens"]
    fact = lens["facts"][0]
    counters = lens["coverage"]["runs"][0]["opportunities"]
    assert counters["messages_queued"] == (1 if cutoff >= 3 else 0)
    assert counters["messages_delivered"] == (1 if cutoff >= 6 else 0)
    assert counters["messages"] == (1 if cutoff >= 3 else 0)
    assert fact["coordination_state"]["choices"] == (
        dict.fromkeys(ACTORS, "salt") if cutoff == 9 else {}
    )
    values = {row["id"]: row["value"] for row in lens["calculations"]}
    assert values[f"run:{rid}:coordination_value"] == (4 if cutoff == 9 else None)
    assert values[f"run:{rid}:total_utility"] is None
    opportunities = final["output"]["exposure"][rid]["opportunities"]
    delivered = [row for row in opportunities if row["kind"] == "message_delivered"]
    assert len(delivered) == (2 if cutoff >= 6 else 0)
    assert not any(row["participant"] == "nu-2" for row in delivered)
    if delivered:
        recipient = next(row for row in delivered if row["participant"] == "alpha-8")
        assert recipient["included"] is (cutoff == 9)
        if cutoff < 9:
            assert recipient["inputs"] == []
    assert source(client.get(f"/api/studies/{study['id']}/export").json()) == before


def test_reanalysis_freezes_partial_phase_without_future_delivery_or_new_participant_work(
    claim_client,
):
    client, controls, seen = claim_client
    controls["artifact_actions"] = iter(
        [
            {"kind": "send_message", "recipient": "alpha-8", "text": "frozen-private-17"},
            *[{"kind": "wait_coordination"}] * 5,
            *[{"kind": "choose_alternative", "alternative": "salt"}] * 3,
        ]
    )
    study, rid = save(client, protocol())
    assert run(client, rid, "step")["turn"] == 1
    first = finish(
        client,
        client.post(
            "/api/chats", json={"question": "Inspect this phase.", "context": f"run:{rid}"}
        ),
    )
    assert first["status"] == "complete", first
    frozen = copy.deepcopy(first["output"])
    assert frozen["lens"]["facts"][0]["coordination_state"] == {
        "logical_time": 0,
        "phase_actors": ACTORS,
        "choices": {},
        "outcome": None,
        "pending_proposals": 1,
        "pending_deliveries": 0,
    }
    assert run(client, rid)["turn"] == 9
    later = finish(
        client,
        client.post(
            "/api/chats",
            json={
                "question": "Future phase evidence sentinel.",
                "context": f"run:{rid}",
                "chat_id": first["chat_id"],
            },
        ),
    )
    assert later["status"] == "complete", later
    before = source(client.get(f"/api/studies/{study['id']}/export").json())
    second = finish(
        client,
        client.post(
            "/api/chats",
            json={
                "question": "Reinspect only the frozen phase.",
                "context": f"run:{rid}",
                "chat_id": first["chat_id"],
                "source_analysis_id": first["id"],
                "lens": "communication",
            },
        ),
    )
    assert second["status"] == "complete", second
    assert second["cutoffs"] == {rid: 1}
    assert second["output"]["lens"]["facts"] == frozen["lens"]["facts"]
    assert second["output"]["lens"]["inputs_sha256"] == frozen["lens"]["inputs_sha256"]
    assert second["output"]["exposure"] == frozen["exposure"]
    assert second["output"]["comparisons"] == frozen["comparisons"]
    assert seen[-1]["index"]["runs"][0]["through_turn"] == 1
    assert all(item["question"] != later["question"] for item in seen[-1]["conversation"])
    assert client.get(f"/api/analyses/{first['id']}").json() == first
    after = client.get(f"/api/studies/{study['id']}/export").json()
    assert source(after) == before
    for analysis in (first, later, second):
        calls = [call for call in after["requests"] if call["analysis_id"] == analysis["id"]]
        assert len(calls) == analysis["usage"]["requests"] == 2
    assert client.post(f"/api/runs/{rid}/verify").json()["verified_turns"] == 9


@pytest.mark.parametrize("timing", ["sequential", "phased_simultaneous"])
@pytest.mark.parametrize(
    ("choices", "payoffs", "matched"),
    [
        (["ink"] * 3, [6, -5, 5], 1),
        (["salt"] * 3, [-6, 7, 3], 1),
        (["ink", "salt", "clay"], [4, 5, -6], 0),
        ([None] * 3, [0, 0, 0], 0),
        (["ink", None, "wait"], [4, 0, 0], 0),
        (["wait"] * 3, [0, 0, 0], 0),
    ],
)
def test_permuted_values_preserve_negative_alternative_abstention_and_horizon_outcomes(
    claim_client, timing, choices, payoffs, matched
):
    client, controls, _ = claim_client
    controls["artifact_actions"] = iter(
        {"kind": "stop"}
        if choice is None
        else {"kind": "wait_coordination"}
        if choice == "wait"
        else {"kind": "choose_alternative", "alternative": choice}
        for choice in choices
    )
    raw = protocol()
    raw["rounds"] = 1
    raw["conditions"][0]["parameters"]["coordination"]["timing"] = timing
    study, rid = save(client, raw)
    assert run(client, rid)["status"] == "complete"
    result = client.get(f"/api/runs/{rid}").json()
    assert result["state"]["outcome"]["payoffs"] == dict(zip(ACTORS, payoffs, strict=True))
    assert result["metrics"]["coordination_match"] == matched
    assert result["metrics"]["coordination_value"] == sum(payoffs)
    assert result["state"]["pending_actions"] == {}
    assert result["state"]["logical_time"] == (3 if timing == "sequential" else 1)
    assert result["effort"]["usage"]["requests"] == 3
    before = source(client.get(f"/api/studies/{study['id']}/export").json())
    assert client.post(f"/api/runs/{rid}/verify").json()["model_requests"] == 0
    assert source(client.get(f"/api/studies/{study['id']}/export").json()) == before


@pytest.mark.parametrize("completion", list(itertools.permutations(ACTORS)))
@pytest.mark.parametrize("priority", list(itertools.permutations(ACTORS)))
def test_each_declared_priority_wins_frozen_work_across_all_completion_orders(completion, priority):
    raw = protocol()
    raw["conditions"][0]["parameters"]["coordination"]["turn_order"] = ACTORS[::-1]
    raw["conditions"][0]["parameters"]["coordination"]["conflict_order"] = list(priority)
    design = Design.model_validate(raw)
    world = create_world(design, design.conditions[0].parameters, 17)
    transcript, proposed = [], []
    for index, actor in enumerate(completion):
        observation = world.observe(actor)
        assert observation["choices"] == {}
        assert observation["writes_remaining"] == 1
        assert observation["your_note"] == ""
        assert [a["version"] for a in observation["artifacts"]] == [1, 1]
        for other in set(ACTORS) - {actor}:
            assert not any(
                a["key"] == f"evidence-{ACTORS.index(other)}" for a in observation["artifacts"]
            )
        proposal = Decision.model_validate(
            decision(
                {
                    "kind": "write_artifact",
                    "artifact": "work",
                    "expected_version": 1,
                    "content": {"proposal": actor},
                    "sources": [],
                }
            )
        )
        events, measures = world.step(actor, proposal)
        proposed.append((actor, proposal))
        transcript.append([event.model_dump() for event in events])
        if index < 2:
            assert world.snapshot()["logical_time"] == 0
            assert measures == []
            assert [event.kind for event in events] == ["proposal_sealed"]
            restored = create_world(design, design.conditions[0].parameters, 17, world.snapshot())
            assert restored.snapshot() == world.snapshot()
            assert restored.observe(actor) == world.observe(actor)
    checkpoint = world.snapshot()
    versions = checkpoint["artifacts"]["work"]["versions"]
    assert len(versions) == 2 and versions[-1]["content"] == {"proposal": priority[0]}
    assert checkpoint["writes_remaining"] == 0 and checkpoint["logical_time"] == 1
    assert sum(event["kind"] == "write_artifact" for event in transcript[-1]) == 1
    assert sum(event["kind"] == "artifact_conflict" for event in transcript[-1]) == 2
    assert [event["kind"] for batch in transcript[:2] for event in batch] == [
        "proposal_sealed",
        "proposal_sealed",
    ]
    replay = create_world(design, design.conditions[0].parameters, 17)
    for actor, proposal in proposed:
        replay.step(actor, proposal)
    assert replay.snapshot() == checkpoint
