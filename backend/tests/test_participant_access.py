"""Independent World/access invariants; no researcher truth enters capabilities."""

import json

import pytest
from agent_sim.domain import Event
from agent_sim.participant_context import ActorContext, ActorInspection, ActorSources, LegalEvidence
from agent_sim.simulation.environments import create_world
from test_participant_harnesses import decision


@pytest.mark.parametrize("memory", ["episodic", "notes", "history", "none"])
def test_hidden_content_counts_and_restore_cannot_change_actor_capability_results(design, memory):
    parameters = design.conditions[0].parameters.model_copy(update={"memory": memory})
    world = create_world(design, parameters, 7)
    actor = world.actor()
    assert actor is not None
    others = [p.key for p in design.profiles if p.key != actor]
    assert len(others) >= 2
    altered = create_world(design, parameters, 7, world.snapshot())
    # A real private delivery plus independent changes to hidden note/signal/counts.
    altered.remember(
        [
            Event(
                kind="message",
                actor=others[0],
                target=others[1],
                visibility="private",
                text="hidden-only-canary",
                data={"known_truth": "researcher-only-canary"},
            )
        ]
        * 31
    )
    hidden = altered.snapshot()
    hidden["notes"][others[0]] = "foreign-note-canary"
    hidden["signals"][others[0]] = 97
    restored = create_world(design, parameters, 7, hidden)
    observed = world.observe(actor)
    assert restored.observe(actor) == observed
    before = restored.snapshot()
    contexts = [
        ActorContext(
            "same-visible-source",
            0,
            1,
            candidate.observe(actor),
            decision_type=candidate.decision_schema(candidate.observe(actor)),
        )
        for candidate in [world, restored]
    ]
    for policy, request in [
        (ActorSources, {"retrieval": {"query": "", "limit": 16}}),
        (ActorSources, {"retrieval": {"query": "canary", "limit": 16}}),
        (ActorInspection, {"investigation": {"facet": "state"}}),
        (ActorInspection, {"investigation": {"facet": "rules"}}),
        (ActorInspection, {"investigation": {"facet": "legal_options"}}),
        (LegalEvidence, {"verification": {"proposed": decision(), "checks": []}}),
    ]:
        values = [policy.execute(context, request, 1) for context in contexts]
        assert values[0] == values[1]
        assert "canary" not in json.dumps(values)
    assert restored.snapshot() == before
    for context in contexts:
        for source_id in ["missing", "observation:foreign:your_note"]:
            with pytest.raises(ValueError, match="^Source is unavailable in this actor context$"):
                ActorSources.execute(context, {"retrieval": {"source_ids": [source_id]}}, 1)
