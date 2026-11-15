from agent_sim.simulation.moments import key_moments


def test_key_moments_use_typed_consequences_and_only_first_occurrence():
    events = [
        {"turn": 1, "kind": "message", "text": "Sanction! Broken promise!", "data": {}},
        {"turn": 2, "kind": "sanction", "text": "", "data": {}},
        {"turn": 3, "kind": "sanction", "text": "", "data": {}},
    ]
    assert key_moments("institution", events, []) == [
        {"turn": 2, "title": "First sanction", "kind": "sanction"}
    ]
    assert key_moments("commons", events, []) == []
    assert key_moments(
        "renewable_resource",
        [],
        [
            {"turn": 2, "key": "collapse_rate", "value": 0},
            {"turn": 5, "key": "collapse_rate", "value": 1},
        ],
    ) == [{"turn": 5, "title": "Stock collapsed", "kind": "collapse_rate"}]


def test_ineligible_or_kept_promises_are_not_broken_promise_moments():
    events = [
        {"turn": 1, "kind": "commitment_resolved", "data": {"eligible": False, "fulfilled": False}},
        {"turn": 2, "kind": "commitment_resolved", "data": {"eligible": True, "fulfilled": True}},
        {"turn": 3, "kind": "commitment_resolved", "data": {"eligible": True, "fulfilled": False}},
    ]
    assert key_moments("commons", events, []) == [
        {"turn": 3, "title": "First broken promise", "kind": "commitment_resolved"}
    ]
