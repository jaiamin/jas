# Evaluation

```sh
uv sync --group dev
uv run python benchmarks/run.py --live --split development capability --output data/evaluations/dev
uv run python benchmarks/run.py --live --split generalization longitudinal --output data/evaluations/test
uv run inspect view --log-dir data/evaluations/test/inspect
```

The 230-case suite has 140 development protocols, 56 reserved context-combination protocols,
14 longer protocols and 20 capability-limit questions. Seven distinct rule systems span
public goods, reciprocity, task dependencies, institutional authority, bargaining, noisy
information and persistent resources. Development cases specify the intervention;
generalization cases omit adapter and parameter hints. Scoring checks the reserved
operationalization and isolation of unrelated factors. Role-only and goal-only
interventions deliberately change prose while keeping permissions and payoffs fixed.

Every supported case uses the actual planner and API to persist and execute both conditions,
calculate outcomes, export evidence and verify exact replay. Short three-round, single-seed
pilots test mechanics and workflow; they do not estimate intervention effects reliably.
Longitudinal cases use 12 rounds. Both planner and participants use `openai:gpt-6-luna`.
No external web research is requested in this controlled suite; production Sol planning
can research independently. Capability cases must decline unavailable mechanics and human
validity claims honestly. `holdout.json` contains older, separately reserved questions.

Inspect supplies scheduling, per-sample scores and logs. Its mock model makes no provider
calls: the solver invokes our application, whose atomic ledger meters actual requests.
Default ceiling is $18 across the persistent `data/evaluation.sqlite3` database, including
all explicit retests. Do not delete that database to reset accounting or run two benchmark
processes against it. `--database` and `--budget-usd` permit separate authorized evaluations.
`--concurrency` bounds samples, provider requests and independent live runs (1–16).
The normal app defaults to three independent runs; set `ASS_CONCURRENT_RUNS` to change it.
Decisions within a run retain their causal ordering.

Outputs contain a fixed dataset hash, source hash, commit, settings, attempt records and
ledger. Reusing an output directory skips every previously attempted case, including errors.
Use `--ids` and a new output directory for explicit retests. No automatic model retries or
substitution. Failed and unknown requests remain charged/reserved. Raw artifacts stay in
ignored data/; compact published evidence belongs in reports/. Historical results and their
changing rubrics remain in history/ and are not controlled improvement evidence.

Deterministic checks assess capability honesty, schema validity, intervention isolation,
requested counts, completion, export and replay. They do not establish human realism,
psychological motives, optimal strategy, or absence of deception. Inspect's stderr over
heterogeneous cases is descriptive, not a confidence interval for real-world validity.
