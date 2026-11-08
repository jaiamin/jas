import json

from benchmarks.incentives import assess_incentives, expected_incentives


def test_counterfactual_payoffs_distinguish_private_return_and_budget_scope():
    expected = expected_incentives(10, 3)
    assert expected["payoffs"] == [
        dict(agents=2, withhold=25, contribute=30),
        dict(agents=3, withhold=30, contribute=30),
        dict(agents=4, withhold=32.5, contribute=30),
        dict(agents=8, withhold=36.25, contribute=30),
        dict(agents=12, withhold=37.5, contribute=30),
    ]
    output = dict(
        answer="```json\n" + json.dumps(expected) + "\n```",
        citations=[dict(run_id="example", turn=1)],
        caveats=["Counterfactual, not a future prediction."],
    )
    assert all(assess_incentives(output, expected).values())
    altered = json.loads(json.dumps(expected))
    altered["payoffs"][0]["contribute"] = 20
    altered["budget_scope"] = "run"
    altered["budget_is_expected_cost"] = True
    output["answer"] = "```json\n" + json.dumps(altered) + "\n```"
    checks = assess_incentives(output, expected)
    assert not checks["private_payoffs"]
    assert not checks["budget_scope"] and not checks["budget_not_expected_cost"]
