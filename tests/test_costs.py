import pytest

from agent_sandbox.costs import estimate_cost


@pytest.mark.parametrize(
    "model,expected",
    [
        ("openai:gpt-6-luna", 0.60),
        ("openai:gpt-4.1-mini", 2.00),
        ("anthropic:claude-haiku-4-5", 6.00),
        ("openai:unknown", None),
    ],
)
def test_cost_uses_reported_usage_not_reservations(scenario, model, expected):
    scenario.models["openai"] = model
    record = {
        "scenario": scenario.model_dump(),
        "input_tokens": 1_000_000,
        "output_tokens": 1_000_000,
        "charged_tokens": 2_012_600,
    }
    estimate = estimate_cost(record)
    if expected is None:
        assert estimate is None
    else:
        assert estimate == pytest.approx(expected)


def test_mixed_model_cost_is_unavailable(scenario):
    scenario.agents[0].model = "anthropic"
    assert estimate_cost({
        "scenario": scenario.model_dump(), "input_tokens": 1000, "output_tokens": 200
    }) is None
