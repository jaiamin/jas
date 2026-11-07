# Validation

`questions.json` covers 26 design questions: cooperation, reciprocity, reporting, commitments,
roles, goals, memory, model comparison, task collaboration and unsupported capabilities.
This is a development coverage dataset, not evidence of human predictive validity.

Recorded OpenAI design requests used GPT-6.1 Sol. `baseline.json` preserves the initial
21/26 result. `results.json` reassesses the latest recorded attempts under rubric v2:
**25/26**, including one explicit timeout retest. The rubric was broadened to accept
multiple valid adapters and honestly qualified proxies; scores are not a controlled
before/after comparison. Adaptation still fails the requested outcome-measure check.
All 54 attempt IDs, statuses, errors and costs remain in the report. No failed request
was silently retried. These results predate the final resource-schedule extension.

GPT-6.1 Luna was requested for the next pass. A minimal diagnostic returned HTTP 404
`model_not_found`; the provider listed GPT-6 Luna. That pass was **not run or substituted**.

Execution validation: six live runs per environment, plus a 120-turn run using GPT-6 Luna.
All 19 completed; recorded actions reproduced 318 turns exactly without model requests.
Two fresh GPT-6.1 Sol investigations answered run/study questions with validated citations.
Two earlier failed investigations remain recorded; their ambiguous request schema was fixed.
Anthropic was tested with deterministic SDK fixtures, not live calls.

`holdout.json` reserves compositional scenarios for the next live pass. Do not tune prompts
on these cases and then call them held out. Record model/settings, first-attempt failures,
all retries and costs, capability honesty, operationalization and independently inspected
outcomes. Protocol validity and scientific usefulness are separate evaluations.

`planner-smoke.json` records the newer multi-stage planner smoke tests separately from the
26-case coverage benchmark. It preserves a drafting timeout and an incorrect research
capability decline, followed by successful scarcity and sourced two-agent trust proposals.
A third question correctly declines human election prediction. These are development smoke
tests, not a new coverage score or an independent validation of research quality.
The sourced two-agent protocol also completed one 24-turn GPT-6 Luna run; all 24 turns
replayed exactly with no model requests. Proposal provenance survived export. The new
diagnostic ledger is $0.427889 estimated/reserved, including the timeout reservation.

## Re-run

With the app on 8081 and a configured OpenAI key:

```sh
uv run python benchmarks/validate.py --live --limit-usd 4
```

This sends paid design requests with the app's GPT-6.1 Sol planner. It does not run the
simulation matrix. The app's atomic workspace ceiling also applies; CLI limits are an
additional stop between requests. Outputs overwrite `results.json`; preserve a snapshot
before another pass. Automated unit/browser tests never use provider credentials.
