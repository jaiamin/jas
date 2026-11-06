import asyncio

import pytest

from agent_sandbox.presentation import chart_options, comparison_metrics, cost_label, run_row
from agent_sandbox.runner import Runner


def test_library_and_history_do_not_load_full_checkpoints(store, scenario):
    runner = Runner.create(store, scenario)
    asyncio.run(runner.play(2))
    record = store.runs()[0]
    assert record["metrics"] == store.frame(runner.id)["metrics"]
    assert record["metadata"] == {}
    assert record["input_tokens"] > 0
    row = run_row(record)
    assert row["tick"] == 2
    assert row["model"] == "GPT-6 Luna"
    history = store.history(runner.id, 1)
    assert [frame["tick"] for frame in history] == [0, 1]
    assert all("checkpoint" not in frame and "observation" not in frame for frame in history)
    assert history[1]["decision"] == store.frame(runner.id, 1)["decision"]


def test_comparison_keeps_common_metrics_and_rejects_other_environments():
    records = [
        {"scenario": {"sandbox": "one"}, "metrics": {"score": 2, "other": 4}},
        {"scenario": {"sandbox": "one"}, "metrics": {"score": 5}},
    ]
    assert comparison_metrics(records) == ["score"]
    records[1]["scenario"]["sandbox"] = "two"
    with pytest.raises(ValueError, match="same environment"):
        comparison_metrics(records)
    with pytest.raises(ValueError, match="at least two"):
        comparison_metrics(records[:1])


def test_comparison_uses_real_turns_and_preserves_missing_metrics():
    history = [{"tick": 0, "metrics": {"score": 1}}, {"tick": 4, "metrics": {}}]
    options = chart_options([("Run one", history)], "score")
    assert options["series"][0]["data"] == [[0, 1], [4, None]]


def test_unknown_usage_is_marked_partial(store, scenario):
    runner = Runner.create(store, scenario)
    store.reserve(runner.id, 120, None, 12600)
    assert cost_label(store.run(runner.id)) == "$0.0000 (partial)"
