# JAS rigorous evaluation and workspace

## Objective and acceptance

Replace the v5 workflow benchmark with independently validated experiment-quality,
environment-validity and observable-behavior evaluation. Establish a current baseline,
improve on development evidence, and evaluate frozen held-out families once at a
declared final checkpoint. All model evaluation calls use `openai:gpt-6-luna` with
one persistent aggregate ledger capped at **$75**, including failures/unknown usage.
No invented improvement claims, human validity claims or intent labels.

Deliver hundreds of cases across distinct reviewed families; independent expected
outcomes, strategy discrimination, solvability, adversarial/privacy/replay checks;
fair repeated model trials and uncertainty; trace-level reproducibility; retained
correctness tests; obsolete benchmark removal after replacement verification.
Improve the experiment/environment/Agent workflow in a restrained Linear/Vercel
visual direction; verify changed flows in a browser. One current contract, no
fallbacks or compatibility layers. User authorizes routine decisions, paid trials
within $75, coherent commits, branch push and one draft PR. No questions requested.

## Starting point

- Task branch `feat/rigorous-evaluation` starts at `origin/main` 1977f3f.
  The assigned checkout's local main was stale (537c8d4); other worktrees untouched.
- Current platform: seven deterministic environments; immutable protocols; private
  observations; exact replay; PydanticAI structured decisions; SQLite budget ledger.
- Existing v5 benchmark: 230 cases, mostly planner compliance, single-seed one-repeat
  pilots; held-out combinations share development families. Historical artifacts in
  ignored `data/` are not fresh baseline evidence and will not be overwritten.
- Official model docs fetched 2026-11-08: Luna standard token rates $0.10/$0.50 per
  million input/output; no model substitution. Application prices match.
- User explicitly requests no compatibility scaffolding and permits replacing data
  contracts; preserve unrelated workspace data nonetheless.

## Plan

1. [completed] Audit code and sources, predeclare family split, scoring and budgets.
2. [completed] Implement replacement suite and pass zero-cost independent validity gate.
3. [in progress] Record baseline; diagnose development failures; implement and rerun matched
   improvements. Keep all failures and checkpoint provenance.
4. [pending] Improve Agent insights and experiment/environment workspace; browser QA.
5. [pending] Freeze final source checkpoint; run held-out once; report weaknesses without
   tuning; complete checks, remove obsolete runners/cases, commit/push/draft PR.

## Decisions

- Budget is a maximum, not a spending target. Model quantity will follow information
  value; no claim of a global optimum or '100x' improvement without evidence.
- Cases split by scenario family, not random paraphrase. Held-out results cannot
  influence improvements; executable validity checks may run before final scoring.
- Report separate quality dimensions, failures, task utility, violations and cost.
  Transcript drama and presumed deception have no reward.
- No new orchestration service, vector database, compatibility adapters or speculative
  complexity. Existing environments and execution are the platform under test.

## Verification / next

- Frozen protocol/cases committed at c6af75c; safety fixes and baseline at ee28c3f.
- Corrected original-platform zero-cost baseline: 3,528/4,608 checks (76.5625%).
  Observation aliasing and invalid/wrong-actor state mutation fixed; new gate passes
  4,608/4,608. Evidence in benchmarks/results/baseline and data/quality/preflight.
- Paid initial planner baseline runs in session 2252, data/quality/planner-baseline,
  shared ledger data/quality/aggregate.sqlite3. All calls guarded to Luna; $75 total,
  development ceiling $60. 108 attempts, currently finishing. Never reset this DB.
- Development exposed inconsistent benchmark questions (rotating partners with two
  agents; message-only question with master communication toggle; endowment required
  in environments where it is inactive). Correct/version these before a corrected
  baseline; preserve initial attempts and do not count justified refusals as defects.
- UI: neutral tokens, 208px sidebar, conversation toolbar/context, environment mechanics
  workbench, validated browser-local reusable setups and direct configuration links.
- Checks: 278 backend, 66 frontend tests, type checks/lint/build passed. Full browser
  retest session 4425 after fixing content-width breakpoint and first-open condition
  assertions; 56 tests. Detector ran once on changed targets: no findings.
- Next: finish initial baseline, version corrected case specifications, strengthen
  validity/calibration checks, record corrected baseline, then improve planner/analysis
  and run repeated participants. Do not open held-out model results before final freeze.
- uv executable crashes (jemalloc page size); use existing .venv/bin tooling. No global
  install needed. Disposable UI server sessions 35161 (8091) and 31396 (5191); close at end.
- Browser tab tab_5_f9b40002-edd9-471c-a028-00fd38eeaaf8 belongs to this task; tab_4 error
  page also owned. Close when finished. UI source changes do not affect baseline digest.
