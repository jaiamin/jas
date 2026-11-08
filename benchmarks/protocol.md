# Evaluation protocol 1 — frozen before platform changes

## Questions and units

This evaluates JAS as an instrument for experiments on **observable model behavior**.
It does not measure entertainment, personality, deceptive intent or human realism.
Keep three scorecards separate: experiment identification, environment validity and
execution/evidence reliability. Utility is environment-specific, not a morality score.

The replacement contains 336 concrete cases: 24 supported mechanism families and four
unsupported-question families, 12 parameter/size/seed variants each. Family definitions
are the reviewable specification; generated cases are frozen JSONL. Eight supported
families and two unsupported families are held out, including new combinations of
mechanics, not random paraphrases. Development never selects cases by their result.
These synthetic task families are a limited generalization test, not an independent
external benchmark. The same author writes implementation and tests; analytical oracles
and metamorphic checks reduce, but cannot eliminate, correlated errors.

## Zero-cost gate

Before any paid batch, run every supported case through independent numerical payoff,
resource-conservation and terminal-outcome oracles, contrasting scripted strategies,
schema-valid adversarial traces, observation isolation, sealed choices, channel and
memory ablation, opportunity-denominator checks, solvability and JSON checkpoint replay.
Expected values come from the mathematical contracts in `oracles.py`, not application
measurements. Include honest/false reports, fulfilled/broken/infeasible promises,
blocked/duplicate work, unfair sanctions, zero transfers and collapse. Mutate evidence
to verify replay detects drift. A failed safety/replay gate blocks paid trials.
All failures remain evidence even when fixed. Scripted strategies are test instruments;
there is no scripted production participant or model fallback.

## Model evaluation and resource allocation

Every model request uses exactly `openai:gpt-6-luna`, low reasoning unless an explicit
medium-effort arm is being tested. No provider substitution, hidden retries or browsing
inside trials. One dedicated SQLite workspace ledger, never reset between checkpoints,
has a $75 aggregate ceiling. Each request reserves conservative input/output cost before
sending. Unknown requests retain reservations. Published costs are estimates at reviewed
standard token rates, not an invoice guarantee. Avoid long contexts or paid tools.

Planner evaluation uses real multi-stage JAS planning and validates resulting designs
against independently recorded factors, requested counts, outcome measures and controls.
Score rejection accuracy separately from support accuracy. Failed providers/parsers remain
failures in the denominator; retain raw proposals, critique and requests. Repeated plans
are fresh samples, not cached responses. Baseline: stratified development cases at first
parameter variant per family, then matched retests and wider development validation.

Participant trials execute saved predeclared protocols through the production engine.
Use matched seeds 17, 43, 89 and two repetitions, randomize/balance scheduling by seed.
Compare communication, memory (none/history/notes/episodic), low/medium effort and 2/4/8/12
agents where mechanically justified (bargaining exactly 2; trust even). Cap total
decisions per arm equally; increased agents trade against rounds and are explicitly a
fixed-resource configuration comparison, not a pure count effect. Run concurrency is
an execution setting, not extra participant information. Compare concurrency 1 and 4
with equal protocols/budgets; scripted parity first, fresh-model results are stochastic.
Reserve at least $15 for the final checkpoint; development may use at most $60.

## Scoring and uncertainty

- **Experiment quality:** supported/rejected correctly; essential mechanics represented;
  requested size respected; intended factor changes; no unrelated factor changes;
  measurable outcome; eligible opportunities; causal horizon feasible; limitations.
- **Environment validity:** per-invariant pass counts with trace references, independent
  numerical errors, strategy discrimination and solvability. Report categories, not just
  a headline pass fraction that could hide a broken privacy invariant.
- **Execution and behavior:** completed/attempted runs and turns, invalid decisions,
  task utility (actual balances/completions/accuracy/remaining stock), observed false
  reports, due feasible commitments, forecast coverage/error, early termination and cost.
  Absence of reports/promises is missing opportunity, never perfect honesty/fulfillment.
- **Analysis:** citations within inspected cutoffs, distinction between data and self-report,
  alternative explanations, uncertainty and a concrete next experiment. Model judgment
  is supplementary; it never overwrites numerical truth.

Use run-level summaries; repetitions averaged within seed before paired confidence
intervals. Three seeds give very weak uncertainty: report seed values, paired effects
and intervals with explicit warnings. No turn-level pseudoreplication, cherry-picked
transcripts or significance hunting. Show failed and partial runs separately, plus an
intention-to-evaluate denominator including all attempts.

## Iteration, checkpoint and stopping

Record every checkpoint's git/source hash, suite digest, configuration, attempts and
aggregate ledger in `benchmarks/results/`. Baseline precedes production fixes. Diagnose
development failures; change shared causes, not case IDs or expected answers. Keep the
suite fixed; any genuine oracle correction versions the suite and invalidates comparisons.
Stop development after two informative retests without material gains, remaining issues
require unavailable evidence or architectural expansion, or the $60 development limit.
This is a practical stopping rule, never a claim that no optimization exists.

Declare final source hash before opening held-out model results. Run held-out once and
report all weaknesses. No post-holdout tuning; bugs discovered there are follow-up work.
UI verification after final freeze can only report, not silently modify the checkpoint.
Delete v5 cases/runners after replacement self-checks pass; preserve correctness tests.

## Sources retrieved 2026-11-08

- [OpenAI evaluation guidance](https://developers.openai.com/api/docs/guides/evaluation-best-practices):
  task-specific tests, adversarial cases, typical failures, continuous evaluation.
- [Luna model documentation](https://developers.openai.com/api/docs/models/gpt-6-luna):
  standard $0.10 input / $0.50 output per million tokens; explicit reasoning settings.
- [tau-bench](https://arxiv.org/abs/2406.12045): annotated terminal state and repeated-trial
  reliability; fluent dialogue alone is insufficient.
- [SOTOPIA](https://arxiv.org/abs/2310.11667): multidimensional social evaluation; no single
  transcript-quality score establishes valid social behavior.
- [Melting Pot](https://arxiv.org/abs/2107.06857): generalization across social scenarios
  and partners; reserve families rather than only familiar combinations.
- [Concordia](https://arxiv.org/abs/2312.03664): separate cognition from adjudication.

An attempted Anthropic evaluation article fetch was blocked (HTTP 403); no claim depends
on its contents. No network-policy bypass was attempted.
