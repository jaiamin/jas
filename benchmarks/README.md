# Evaluation

```sh
uv sync --group dev
uv run python benchmarks/run.py --live --output data/evaluations/full
uv run python benchmarks/run.py --live --split development capability --output data/evaluations/dev
uv run python benchmarks/run.py --live --split generalization longitudinal --output data/evaluations/test
uv run inspect view --log-dir data/evaluations/test/inspect
```

The 230-case v5 suite covers seven environments: 140 development cases, 56 reserved
context combinations, 14 longer protocols and 20 capability-limit questions. Cases specify
mechanics, treatment isolation, counts and measurements. Raw-action questions require
complete exported decision/observation evidence. Outcomes are not scored for a desired
behavior, psychological motive or human predictive validity.

Both planner and participants use `openai:gpt-6-luna`, without web research. Inspect's
mock model schedules the real application through its chat/API routes. Every supported
case saves and executes both conditions, exports evidence and checks exact replay.
Short single-seed pilots verify mechanics; they do not establish reliable treatment effects.

`--live` explicitly enables paid calls. The default $18 ceiling includes all usage in
`data/evaluation.sqlite3`, including explicit retests and unknown requests. Do not reset
accounting or run multiple processes against that database. `--database`, `--budget-usd`
and `--concurrency` (1–16) configure an authorized evaluation.

Outputs stay in ignored `data/`: attempts, manifests, summaries and Inspect logs. A fixed
case digest and recursive source fingerprint identify the tested implementation. Reusing
an output directory skips attempted cases and rejects changed source. Use `--ids` with a
new output directory for an explicit retest. Provider failures receive no automatic retry
or substitute model. No benchmark score is claimed for the current code without a fresh run.

For keyless verification, use the [development checks](../docs/DEVELOPMENT.md).
