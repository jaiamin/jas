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
