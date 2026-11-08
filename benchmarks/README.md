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
