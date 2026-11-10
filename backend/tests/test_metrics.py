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


def test_condition_uncertainty_does_not_count_repeated_seed_as_independent_randomizations(design):
    from agent_sim.comparisons import ComparisonRun, compare_runs
    from agent_sim.domain import Treatment

    design.conditions = [Treatment(key="a", name="A")]
    design.measures = ["accuracy"]
    design.seeds = [17, 43]
    design.repetitions = 5

    runs = [
        ComparisonRun(
            f"{seed}-{repetition}", "a", seed, repetition, "complete", 1, True, {"accuracy": value}
        )
        for seed, value in [(17, 0.0), (43, 1.0)]
        for repetition in range(1, 6)
    ]
    result = compare_runs(runs, design)["results"][0]
    assert result["interval"] is None
    assert result["seeds"] == 2
    assert result["runs"] == 10


def test_condition_mean_weights_environment_seeds_equally_when_repetitions_are_missing(design):
    from agent_sim.comparisons import ComparisonRun, compare_runs
    from agent_sim.domain import Treatment

    design.conditions = [Treatment(key="a", name="A")]
    design.measures = ["accuracy"]
    design.seeds = [17, 43]
    design.repetitions = 5

    runs = [
        ComparisonRun(str(i), "a", 17, i, "complete", 1, True, {"accuracy": 0.0})
        for i in range(1, 5)
    ]
    runs.append(ComparisonRun("last", "a", 43, 1, "complete", 1, True, {"accuracy": 1.0}))
    assert compare_runs(runs, design)["results"][0]["mean"] == 0.5


def test_bootstrap_uncertainty_is_invariant_to_run_order():
    from benchmarks.report import interval

    values = (0, 1, 3, 7, 10, 20, 22)
    for estimate in (interval,):
        assert estimate(values) == estimate(tuple(reversed(values)))
        assert estimate(values) == estimate(values[3:] + values[:3])
