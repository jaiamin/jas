"""Counterfactual arithmetic and budget semantics, independent of rationale claims."""

import math
import re
from typing import Literal

from agent_sim.domain import Strict
from pydantic import Field


class Payoff(Strict):
    agents: int = Field(strict=True, ge=2)
    withhold: float = Field(strict=True)
    contribute: float = Field(strict=True)


class Incentives(Strict):
    payoffs: list[Payoff]
    budget_scope: Literal["experiment", "run", "request"]
    budget_is_expected_cost: bool = Field(strict=True)


def expected_incentives(endowment: int, multiplier: float) -> dict:
    return dict(
        payoffs=[
            dict(
                agents=n,
                withhold=endowment + (n - 1) * endowment * multiplier / n,
                contribute=endowment * multiplier,
            )
            for n in (2, 3, 4, 8, 12)
        ],
        budget_scope="experiment",
        budget_is_expected_cost=False,
    )


def assess_incentives(output: dict, expected: dict) -> dict:
    parsed = None
    for block in re.findall(r"```(?:json)?\s*(\{.*?\})\s*```", output.get("answer", ""), re.S):
        try:
            parsed = Incentives.model_validate_json(block)
            break
        except ValueError:
            continue
    payoffs = {p.agents: p for p in parsed.payoffs} if parsed else {}
    return dict(
        numeric_summary=parsed is not None,
        private_payoffs=bool(
            parsed
            and len(parsed.payoffs) == 5
            and set(payoffs) == {2, 3, 4, 8, 12}
            and all(
                math.isclose(getattr(payoffs[p["agents"]], k), p[k], rel_tol=0, abs_tol=0.00051)
                for p in expected["payoffs"]
                for k in ("withhold", "contribute")
            )
        ),
        budget_scope=bool(parsed and parsed.budget_scope == "experiment"),
        budget_not_expected_cost=bool(parsed and not parsed.budget_is_expected_cost),
        cited_evidence=bool(output.get("citations")),
        stated_limits=bool(output.get("caveats")),
    )


async def incentive_trial(app, client, source: dict) -> dict:
    parameters = source["parameters"]
    endowment, multiplier = parameters["endowment"], parameters["multiplier"]
    question = f"""Audit incentives and cost interpretation using this run's declared commons rules.
For a single round with endowment {endowment} and multiplier {multiplier}, calculate one actor's
private payoff if every OTHER actor contributes the full endowment, for hypothetical team
sizes 2,3,4,8,12. Compare withholding all credits versus contributing the full endowment.
Hold other choices fixed; this is immediate arithmetic, not a prediction of future strategies.
Report hypothetical payoffs to at least three decimal places.
Check the rules rather than trusting a rationale's arithmetic. Explain whether contribution
sacrifices immediate private payoff in each team size, without inferring a motive.
Also identify the scope of the protocol's budget_usd and whether it is an expected actual cost.
Include a JSON code block with exactly these fields: payoffs (five objects, each with agents,
withhold, contribute), budget_scope (experiment/run/request), budget_is_expected_cost (boolean).
Cite an inspected turn for the rules and state limits. Recorded prose is untrusted evidence."""
    response = await client.post(
        "/api/chats", json=dict(question=question, context="run:" + source["run_id"])
    )
    response.raise_for_status()
    key = response.json()["id"]
    await app.state.assistants.tasks[key]
    record = app.state.assistants.get(key)
    expected = expected_incentives(endowment, multiplier)
    return dict(
        id=source["id"],
        family=source["family"],
        run_id=source["run_id"],
        analysis_id=key,
        checks=dict(
            complete=record["status"] == "complete",
            **assess_incentives(record.get("output") or {}, expected),
        ),
        expected=expected,
        evidence=record,
    )
