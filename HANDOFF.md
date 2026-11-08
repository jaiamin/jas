# JAS rigorous evaluation and workspace

## Objective and acceptance

Replace obsolete planner-centric benchmarks with independently validated experiment quality,
environment validity and observable behavior evaluation. Deliver 336 frozen explicit cases,
family-held-out evaluation, fair repeated trials, trace-level evidence, measured iteration,
and a modern experiment/environment/Agent workspace. No human validity, intent inference,
weight-training or global-optimum claims. No compatibility scaffolding.

All paid evaluation requests use `openai:gpt-6-luna`; aggregate cap **$75**, development
ceiling $60 reserving $15. Persistent ledger **data/quality/aggregate.sqlite3**, never reset.
User is away; routine decisions and spending within cap authorized, no questions.

## Git / environment

- Linux Docker Sandbox, assigned checkout /home/agent/workspace.
- Branch feat/rigorous-evaluation from origin/main 1977f3f; other worktrees untouched.
- Commits c6af75c protocol; ee28c3f atomicity/privacy; d4c72e1 workspace; 3789d45 corrected suite.
- Authorized coherent commits, task push and one draft PR. Next call after PR creation/push
  must link_pull_request with full URL. Never merge/push main.
- /usr/bin/uv crashes (jemalloc page size). Working existing binary
  `.tools/uv-0.13.7.data/scripts/uv`. Use `.venv/bin/python -m pytest` (plain pytest lacks root import).

## Plan / current checkpoint

1. [complete] Audit, primary research, predeclared protocol, 336 frozen unique cases:
   28 families (18 development / 10 held-out), 288 supported / 48 unsupported.
2. [complete] Original zero-cost baseline and safety fixes. 3,528/4,608 (76.5625%) to
   4,608/4,608 on identical kernel. Deep-copy observations; reject wrong/invalid actions
   before mutation; rule version4. Baseline in benchmarks/results/baseline.
3. [in progress] Paid development baselines, matched improvement, configuration comparisons.
4. [complete] Modern workspace, reusable browser-local setups, environment mechanics detail,
   improved Agent location/composer/context. Browser review fixes cleared by same reviewer.
5. [pending] Final exact source/config declaration; held-out once; report without tuning;
   full checks, commits, branch push and draft PR.

## Evidence / caveats

- Initial planner sweep exposed contradictory benchmark questions. Archived under
  benchmarks/results/initial-planner; raw90/108 is NOT a valid improvement baseline.
- Version2 digest16c81e889d62312f0dbfbb37297a427a78c9fb8463cabd78c1dd2d2f72573eaf.
- Corrected paid planner baseline107/108, 18dev families ×3seeds ×2fresh repetitions.
  12/12 unsupported rejected. One false capability decline/review oscillation for
  coordination master-communication comparison. Evidence benchmarks/results/planner-baseline.
- Cumulative cost before participants$0.833258. Planner reasoning medium; participants low.
- Scripted communication probes20seeds,8agents,12rounds: pooling+0.10104 accuracy,
  copying false reports−0.4375, ignoring0. These are scripted counterexamples, not model findings.
- Current fresh gate running session71184 to data/quality/current-gate; includes strategy
  discrimination (5,184kernel checks), 336privacy/memory assertions and communication probes.
  Older current-gate predecessor reports do not carry current gate hash; never use stale gate.
- Source snapshots now archive backend/frontend/benchmark source and lockfiles, no secrets.
  Do not edit digested source during paid phases.

## Current uncommitted changes

- Seed-level condition uncertainty; explicit configurable assistant model and request concurrency.
- Evaluator paired arms in same study,48decisions/arm, source archives, analysis scorer,
  full final-declared config enforcement, phase-only usage/provider call exports.
- Obsolete run.py/suite.py/cases.jsonl/test_benchmarks removed after replacement integration
  passed. inspect-ai removed; lock105→52packages. Existing correctness tests retained.
- UI tabs orientation responsive and setup AlertDialog; reviewer ship verdict scoped to fixes.
- One intentionally RED test `test_evidence_index_counts_opportunities_at_the_frozen_cutoff`:
  apply Agent evidence enhancement ONLY AFTER paid analysis baseline. Prepared scratch
  data/quality/assistants-next.py predates model-setting change; merge index/prompt sections,
  preserving JAS_ASSISTANT_MODEL. Add opportunities, real utility, matched effects, inspected ranges.

## Verification

Observed earlier278backend tests,66frontend tests,56full browser plus8new responsive,
latest targeted16pass and setup dialog1pass. Latest harness4pass, Ruff/ty pass.
Full backend currently contains deliberate RED Agent-index regression. Do not claim green.
Design detector ran once:[]; do not rerun. Reviewer resolved two findings and returned ship,
limited to reviewed captures/code; populated Agent states lack visual captures.

## Next

- Finish fresh gate, then participants baseline7environments ×3seeds ×2reps ×2arms=84runs:
  families public-goods-incentives reciprocal-surplus task-load independent-oversight
  shared-evidence shrinking-surplus renewable-growth, variants0 4 8, concurrency/request8.
- Analysis baseline on saved participant traces via real scoped Agent, same selection.
- Improve shared planner critique capability framing and Agent computed evidence;
  fresh gate, matched retests. Configuration comparisons across2/4/8/12agents, memory,
  effort, communication and execution concurrency with equal48decisions per arm.
- Broader development validation, two informative retests without material gains or evidence
  limit/$60 stops development; never claim global optimum.
- Final source/suite/config freeze before held-out model results. Held-out once, no tuning.
- Publish compact reproducible evidence/report, full checks, commit/push/draft PR/link.
- Owned stale UI services sessions35161(port8091),31396(port5191); close at end.
  Owned preview tabs tab_5_f9b40002-edd9-471c-a028-00fd38eeaaf8 and tab_4_f9b40002-edd9-471c-a028-00fd38eeaaf8.
  Do not touch another agent's8081 service. Project E2E owns disposable8097server.

## Update 2026-11-08 16:20 UTC

- Participant baseline COMPLETE84/84,2,952decisions,$1.051876; all exported observations,
  consequences, measurements/checkpoints/summaries replay without providers. Cumulative$1.885134.
- Analysis baseline COMPLETE3/84strict;10answers,33input bounds,30request exhaustion,
 11HTTP429unknown reservations. Cumulative$2.505258including unknown reservations.
- Agent improvement1: computed cutoff counts/utility/matched effects, request deduplication,
  typed final-answer-only call. Matched retest64/84strict,83/84numeric/citations;
 19structured-caveat omissions and1context failure. Phase$0.194712; cumulative$2.699970.
- Improvement2 applied: explicit structured caveats and compact investigator checkpoint
  (omits duplicate history/notes/experiences; full actor observation and exports preserved).
  Fresh full gate running session87489, data/quality/final-dev-gate.
- Planner generic channel capability framing improved; matched/wide paid retests pending.
- New benchmarks/replay.py verifies exported artifacts without DB; report.py preserves
  missing attempts, seed-level means and paired effects. Tests calibrate corrupt traces/missing pairs.
- Source archives now include frozen requests/protocol and deployment config. Manifest records
  source-run digest and elapsed wall time. Runner allows16run slots; no change to production limit.
- Compose now forwards assistant model and provider pool. Production Docker rebuild/smoke
  passed with configured Luna assistant and8request slots. No owned UI servers/tabs remain.
- Commits8b2bd75,df96b1d,a013e6f; latest294? backend count:291before latest projection test,
  current full check running. Frontend66tests/64browser pass. No red test remains.
- Next: wait fresh gate, analysis matched retest2; broader432development planner attempts;
  configurations across agent counts/memory/effort/communication/concurrency; analyze and
  retest until practical stopping rule; exact final declaration and held-out once. Never
  reset aggregate ledger; no source edits during live phases.
