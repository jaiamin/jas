# Evaluation

The replacement suite has **336 unique frozen requests across 28 reviewed families**,
with 18 development families and 10 held-out families. It evaluates experiment
identification, deterministic instrument validity, execution and observable behavior.
See [predeclared protocol](protocol.md), [family specifications](families.json), [scenario review](REVIEW.md) and
[results](results/). The initial inconsistent specification and its failures remain
archived; it is not used as the improvement baseline.

```sh
uv sync --frozen
uv run python -m benchmarks.validity --output data/quality/preflight
uv run python -m benchmarks.evaluate --live --checkpoint baseline \
  --variants 0 4 8 --repetitions 2 --output data/quality/planner-baseline
uv run python -m benchmarks.evaluate --live --kind participants --checkpoint participants \
  --families public-goods-incentives reciprocal-surplus task-load independent-oversight \
  shared-evidence shrinking-surplus renewable-growth --variants 0 4 8 --repetitions 2 \
  --concurrency 8 --request-concurrency 8 --output data/quality/participants
uv run python -m benchmarks.evaluate --live --kind analysis --checkpoint analysis \
  --source-runs data/quality/participants/attempts.jsonl.gz \
  --families public-goods-incentives reciprocal-surplus task-load independent-oversight \
  shared-evidence shrinking-surplus renewable-growth --variants 0 4 8 --repetitions 2 \
  --concurrency 8 --request-concurrency 8 --output data/quality/analysis
```

The complete fresh gate must pass before every paid phase. It checks mathematical
payoffs, per-turn JSON replay, action atomicity, detached observations, sealed choices,
privacy and memory, plus communication that helps, hurts or is ignored under explicitly
scripted strategies. Scripted probes are instruments, never participant fallbacks.

All paid calls are `openai:gpt-6-luna`, guarded at the actual provider boundary. One
persistent `data/quality/aggregate.sqlite3` ledger enforces the **$75 aggregate cap**,
including failures and unknown reservations. Development cannot exceed $60; $15 is
reserved for final evaluation. Do not reset this database or run competing evaluators.
`--live` acknowledges paid work. Fresh repeats get new output directories; no hidden retries.

Each participant comparison preserves both conditions in one immutable experiment.
Each arm has the same 48-decision allowance, response-token limit and dollar ceiling.
Bargaining or completed tasks can stop early. More agents trade against rounds; this
is a fixed-resource configuration comparison, not an isolated count effect. Memory
ablations cannot erase a case's intended memory factor; the same applies to communication.

Analysis is tested against independently counted trace facts and captured-cutoff citations.
Its narrative insight quality remains reviewable qualitative evidence, not a flattering
LLM-judge score. Missing opportunities never count as perfect behavior.

Outputs include all attempts, provider calls, source/suite hashes, costs and replay evidence.
Held-out evaluation requires a matching declared `final-checkpoint.json` and writes an
exclusive attempt marker before spending. It is never silently repeated after interruption.

The application remains responsible for providers, persistence, error handling and atomic
budget reservations. The harness uses its real API and engine; no evaluation framework or
compatibility runner remains in production or development dependencies.

Replay and summarize exported participant attempts without paid calls:

```sh
uv run python -m benchmarks.replay benchmarks/results/participant-baseline/attempts.jsonl.gz
uv run python -m benchmarks.report benchmarks/results/participant-baseline/attempts.jsonl.gz \
  --output data/quality/participant-comparisons.json
```

Replay verifies observations, actors, consequences, measurements, checkpoints and final
behavior summaries. Missing traces are counted explicitly. Use the checkpoint's source
archive and frozen dataset when reproducing a historical rule contract. Model requests
cannot be reproduced bit-for-bit; replay uses the saved model decisions.
