"""Approximate USD cost from the usage already stored in a run."""

# Standard USD per million input/output tokens, reviewed 2026-11-06.
# https://developers.openai.com/api/docs/models/gpt-6-luna
# https://developers.openai.com/api/docs/models/gpt-4.1-mini
# Haiku rates match the installed genai-prices snapshot.
TOKEN_PRICES = {
    "openai:gpt-6-luna": (0.10, 0.50),
    "openai:gpt-4.1-mini": (0.40, 1.60),
    "anthropic:claude-haiku-4-5": (1.00, 5.00),
}


def estimate_cost(run: dict) -> float | None:
    scenario = run["scenario"]
    models = {scenario["models"].get(agent.get("model")) for agent in scenario["agents"]}
    # shortcut: totals lack model/cache breakdowns; use per-request usage for mixed models.
    if len(models) != 1:
        return None
    rates = TOKEN_PRICES.get(next(iter(models)))
    if rates is None:
        return None
    return (run["input_tokens"] * rates[0] + run["output_tokens"] * rates[1]) / 1_000_000
