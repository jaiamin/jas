def test_metric_aggregation_preserves_terminal_and_peak_semantics():
    from agent_sim.metrics import aggregate_metrics

    values = [
        ("stock_fraction", 0.8),
        ("stock_fraction", 0.2),
        ("completion_rate", 0.2),
        ("completion_rate", 0.6),
        ("collapse_rate", 1.0),
        ("collapse_rate", 0.0),
        ("payoff", 2.0),
        ("payoff", 4.0),
        ("payoff", None),
        ("no_evidence", None),
    ]
    assert aggregate_metrics(values) == {
        "stock_fraction": 0.2,
        "completion_rate": 0.6,
        "collapse_rate": 1.0,
        "payoff": 3.0,
    }
    assert aggregate_metrics([]) == {}


def test_condition_uncertainty_does_not_count_repeated_seed_as_independent_randomizations():
    from agent_sim.metrics import RunMetrics, condition_results

    runs = [
        RunMetrics("a", "A", seed, repetition, {"accuracy": value})
        for seed, value in [(17, 0.0), (43, 1.0)]
        for repetition in range(5)
    ]
    result = condition_results(runs)[0]
    assert result["interval"] is None
    assert result["seeds"] == 2
    assert result["runs"] == 10


def test_condition_mean_weights_environment_seeds_equally_when_repetitions_are_missing():
    from agent_sim.metrics import RunMetrics, condition_results

    runs = [RunMetrics("a", "A", 17, i, {"accuracy": 0.0}) for i in range(4)]
    runs.append(RunMetrics("a", "A", 43, 0, {"accuracy": 1.0}))
    assert condition_results(runs)[0]["mean"] == 0.5


def test_bootstrap_uncertainty_is_invariant_to_run_order():
    from agent_sim.metrics import bootstrap_mean_interval

    from benchmarks.report import interval

    values = (0, 1, 3, 7, 10, 20, 22)
    for estimate in (bootstrap_mean_interval, interval):
        assert estimate(values) == estimate(tuple(reversed(values)))
        assert estimate(values) == estimate(values[3:] + values[:3])
