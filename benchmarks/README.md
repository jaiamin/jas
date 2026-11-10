# JAS evaluation

336 frozen synthetic cases across 28 author-reviewed families test experiment design,
environment validity, participant execution and observable behavior. There are 18 development
and 10 held-out families across seven rule-based worlds. This is a diagnostic benchmark;
passing it does not establish human realism, intent or useful scientific insight.

| Read or reuse | Entry point |
| --- | --- |
| Scenario definitions and frozen requests | [families.json](families.json), [quality-cases.jsonl](quality-cases.jsonl) |
| Measurement contracts and research sources | [protocol](protocol.md), [scenario review](REVIEW.md) |
| Independent equations, scripts and adversarial checks | `oracles.py`, `probes.py`, `validity.py` |
| Real API trials and scoring | `evaluate.py`, `quality.py`, `analysis.py`, `incentives.py` |
| Export replay and paired summaries | `replay.py`, `report.py` |
| Published results and caveats | [report](results/REPORT.md), [limitations](results/LIMITATIONS.md) |

## Run without spending

From the repository root, using the [normal development setup](../docs/DEVELOPMENT.md):

```sh
uv sync --frozen
uv run pytest
uv run python -m benchmarks.validity --output data/quality/preflight
```

The complete gate checks independent payoffs, solvability, invalid-action atomicity,
observation isolation, sealed choices, privacy, memory and deterministic per-turn replay.
Scripted witnesses cover communication that helps, hurts or makes no difference. They
validate the instrument; they are not production participants or preferred model outcomes.

For bounded local platform timings without any model requests:

```sh
uv run python -m benchmarks.runtime --output data/runtime/current
```

This starts and closes its own keyless HTTP server on port18228. It repeats the
2/12-participant two-round Commons workloads, then measures12 participants across
20 rounds (240 turns), with exact replay/export and20 warm reads per endpoint.
The larger case also mixes health/run/experiment reads through four concurrent
workers,20 requests to each endpoint. Results include raw timings, response sizes and server memory;
they measure platform overhead, not model latency or competence. Use a fresh output
directory and `--port` when another local task owns the default port.

## Run model trials

Set `OPENAI_API_KEY` in the root `.env`. These commands spend real credits and require the
fresh gate above. Every request uses `openai:gpt-6-luna`. The persistent
`data/quality/aggregate.sqlite3` ledger caps aggregate spending at $75, including unknown
reservations; development stops at $60, reserving $15 for held-out work. Never reset the
ledger or run competing evaluators. Use a new output directory for each checkpoint.

```sh
uv run python -m benchmarks.evaluate --live --checkpoint planner \
  --variants 0 4 8 --repetitions 2 --output data/quality/planner
uv run python -m benchmarks.evaluate --live --kind participants --checkpoint participants \
  --families public-goods-incentives reciprocal-surplus task-load independent-oversight \
  shared-evidence shrinking-surplus renewable-growth --variants 0 4 8 --repetitions 2 \
  --output data/quality/participants
uv run python -m benchmarks.evaluate --live --kind analysis --checkpoint analysis \
  --source-runs data/quality/participants/attempts.jsonl.gz \
  --families public-goods-incentives reciprocal-surplus task-load independent-oversight \
  shared-evidence shrinking-surplus renewable-growth --variants 0 4 8 --repetitions 2 \
  --output data/quality/analysis
```

`--help` lists configuration controls. Each participant arm gets 48 decisions; more agents
trade rounds for team size. Memory/communication ablations cannot erase the case's intended
intervention. Analysis checks independently counted facts and cutoff-scoped citations;
qualitative usefulness still needs independent review. Failures stay in the denominator.

Outputs contain attempts, observable provider calls, source snapshots, hashes, costs and
summaries. All generated files belong in ignored `data/quality/`, outside this directory.
Replay and summarize participant exports without credentials or model calls:

```sh
uv run python -m benchmarks.replay data/quality/participants/attempts.jsonl.gz
uv run python -m benchmarks.report data/quality/participants/attempts.jsonl.gz \
  --output data/quality/participant-comparisons.json
```

## Frozen results and reuse

[final-checkpoint.json](final-checkpoint.json) is the original held-out declaration, retained
verbatim. `--split heldout` checks source/suite hashes and exact configuration, then creates
an exclusive attempt marker beside the ledger before spending. Do not remove markers to
repeat a published score. These families are now public; a future claim about unseen
families needs a new reviewed split and a new declaration before opening its results.

Only the compact [report](results/REPORT.md), [score history](results/score-history.json),
[cost audit](results/aggregate-cost.json) and [limitations](results/LIMITATIONS.md) are kept
here. Full historical traces, source bundles and one-off commands are recoverable at the
immutable evidence commit; see the report's archive/replay instructions. Saved decisions
replay exactly with their matching rules; fresh model responses are stochastic.

## Later planner development checks

The post-checkpoint [development diagnostic](development.py) contains 30 independently
specified supported/unsupported requests. It does not reopen or modify frozen cases.
Run only after correctness checks; it uses the existing ledger, Luna, a separate phase
allowance and two repetitions by default:

```sh
uv run python -m benchmarks.development --label current \
  --output data/quality/validity-current --max-usd 2
```

Its acceptance checks cover completion, supported capability combinations, environment
selection and required executable interventions. These are development diagnostics, not
held-out generalization or semantic insight scores. Every attempt and sanitized provider
trace stays with an exact backend source snapshot in the ignored output directory.
