# JAS evaluation and workspace handoff

## Objective and acceptance

Deliver a rigorous replacement benchmark, measured development improvements, reproducible
trace evidence, sophisticated controlled experiments and a modern experiment/environment/Agent
workspace. Preserve failures and uncertainty. Never equate utility, dramatic prose, compliance
or a perfect numerical contract with scientific insight, deceptive intent or human validity.

- [complete] Audit and primary research; predeclared protocol and reviewed family split.
- [complete] 336 unique explicit cases: 28 families, 18 development / 10 held-out;
  288 supported / 48 unsupported; seven code-enforced worlds, up to twelve agents.
- [complete] Mathematical oracles, contrasting scripts, solvability, privacy, action atomicity,
  disclosure/communication witnesses and deterministic replay before paid trials.
- [complete] Valid baselines, matched improvements, broad development and configuration trials.
- [complete] Modern workspace, environment mechanics/setup management and contextual Agent;
  populated, responsive, keyboard and error flows verified in browser.
- [in progress] Final shared-cause fixes, full checks, extracted archive rebuild and matched
  development confirmations. Source/tests frozen during every paid phase.
- [pending] Declare exact final checkpoint, evaluate held-out once, report without tuning.
- [pending] Final evidence/cost/security audit, coherent commits, task push and one draft PR.

## Non-negotiable constraints

User is away; no questions. Paid evaluations use only openai:gpt-6-luna. Aggregate cap $75;
development ceiling $60, reserving $15. Persistent ledger data/quality/aggregate.sqlite3 is
NEVER reset. Retain unknown reservations and all failures. No silent retries, substitutes,
production scripted participants, compatibility runners or post-held-out tuning.

Branch feat/rigorous-evaluation from origin/main 1977f3f. Latest production commit 8b3e77d;
evidence checkpoint dc634f2. Worktree /home/agent/workspace is an isolated Linux Docker
Sandbox. Other worktrees/services are untouched. Push task branch and create one draft PR;
next tool call after push/creation must link_pull_request with its full URL. Never merge.
Ponytail full active: final concise, last one or two lines identify skipped checks/risks.
No new subagents; completed UI reviewer needs no re-run. Design detector already ran once.

## Current live work (2026-11-08 18:40 UTC)

No paid process remains. Configuration coordinator session42984 completed all eight phases.
Final no-cost gate session28505 runs to data/quality/final-development-gate. Wait for success
before final development retests. Frontend session8179 finished:66unit tests,65browser tests,
Biome and production build pass; test webserver shut down.

Candidate exact source digest:
7f2a136a2d71124fc5b962fb0fde3f5b5bd77de35453e7a63f04d22a2a69997a

Source archive data/quality/final-candidate-source.tar.gz has207files, including backend tests,
frontend build/Playwright inputs and smoke script. Extracted fresh project
 data/quality/final-source-check installs with frozen uv, passes302backend tests and builds
Docker image jas-rigorous-evaluation:final-archive. Keyless non-root smoke session56534
cleans up container jas-evaluation-7f2a136a in finally; check completion. No browser tab remains.
Never touch another session's8081service.

System uv crashes jemalloc. Working binary .tools/uv-0.13.7.data/scripts/uv. Root .venv and
extracted archive .venv are separate. Both pytest and python-m pytest discover imports now.

## Results / valid comparisons

- Original same invariant kernel:3528/4608(76.5625%) to4608/4608 after isolation/atomicity fixes.
  Expanded v3 gate:5208/5208 plus336privacy assertions and5disclosure witnesses.
- Planner v1 raw90/108 is invalid as a baseline. Corrected v2 originally107/108; exclude ALL6
  attempts for three defective two-person disclosure requests, accepted or rejected. Valid
  matched baseline101/102 to102/102. Wide426unchanged passes +6fresh corrected passes gives
  explicitly composed432/432, never credited as a gain from changing requests.
- Suite v3 c05f3f353bcd6be3aeba94b145517e7b2e935907bbe1914b09d3f1bac4d3a8ff.
  Only three DEVELOPMENT disclosure requests changed2to3agents. All120held-out lines are
  byte-identical to v2; proof in results/dataset-v3-correction.json. Held-out-only digest
  67e66b1ee9818adfb19332dbdaa7f9cdb3e1fabe49fa5ff6e6a0f4fb3b7cfb59.
- Participants baseline84/84,2952decisions,$1.051876. Broad192/192,7786decisions,$2.741032.
  Counts96/96,3198decisions,$1.169410; memory48/48,2304decisions,$0.696823;
  effort/communication36/36,1728decisions,$0.583734; serial12/12,$0.007581;
  parallel12/12,$0.007440. Every export independently replayed without paid calls.
- Serial121.055seconds vs parallel39.266seconds; stochastic choices differ (32vs28decisions),
  so this is throughput evidence, not exact-provider-sample parity. Scripted parity test passes.
- Memory notes had higher observed utility in one condition but cost more; episodic did not
  consistently improve it. Medium effort cost more without utility gain in sampled dyadic
  information runs; communication ablation was neutral there. Counts trade rounds for agents.
  Coordination task completion saturated at all tested sizes. No universal best config claim.
- Analysis on same84saved traces:3/84 to64/84 to84/84. Initial33input bounds,30request
  exhaustion,11HTTP429unknown reservations retained. Fresh confirmation80/84:3unsupported
  commons calculator requests outside commons,1missing JSON block.
- Larger-team analysis65/72:5missing JSON blocks,1total-report-count error,1unsupported tool.
  All failures preserved; do not hide the regression behind the earlier84/84.
- Qualitative fixed seven-world review originally caught payoff/budget errors despite84/84.
  Subsequent confirmation sample correctly distinguishes25/30payoffs and shared ceiling/cost.
  All7answers and author review retained, not an independent usefulness rating.
- Incentive calibration4/12 to4/12 instruction-only to12/12 calculator-backed; fresh
  confirmation12/12. Preserve the instruction-only failure and associated costs.
- Scripted communication probes20seeds:truthful pooling+0.10104accuracy, copying false
  reports-0.4375, ignoring0. These are scripted witnesses, not model findings.

## Latest production fixes (before final held-out)

Bounded cutoff-scoped commons payoff calculator, original immutable Revision grouping,
actual decision-only cutoff usage, explicit shared ceiling, enforced rules and deterministic
bootstrap ordering. Populated Agent layout fixed after918chats caused590kpxgrid width;
120chat regression observed RED then PASS. Useful correctness tests retained; obsolete
benchmark runners/cases and inspect-ai removed.

New commit8b3e77d scopes calculator schema to commons; other worlds offer only history/turn
inspection. Generic instructions preserve requested code blocks/fields and distinguish total
reports from inaccurate subset. ThinkingPart is omitted from stored provider responses using
dataclasses.replace; observable outputs, accounting and raw in-memory messages preserved.
Regressions observed RED on old source, then PASS.302backend tests, Ruff format/lint, ty,
Actionlint pass. Do not edit source/tests during the next live batch.

## Publication policy / security

Gitleaks originally stopped publication for two opaque thinking signatures matching github-pat
and github-app-token rules. Metadata inspected only, no matched values printed. Both were
response.parts[].signature with part_kindthinking and empty content, not authentication fields.
No scanner exclusions. data/quality/publish-observable-traces.py removes ALLthinking parts from
public evidence, preserving observable output/usage. Original local ledger remains untouched.
results/trace-publication.json records compressed original/published hashes and counts.
Archive-aware rescan of1.23GBpassed. Newly copied old-source phases MUST be sanitized again.
Production now omits thinking at persistence; no public raw reasoning intended.

## Next sequence

1. Wait gate28505 and smoke56534; inspect results. No paid work until fresh gate passes.
2. Run .venv/bin/python data/quality/run-final-development.py. Explicit commands are declared
   in benchmarks/final-development-runs.json:72larger-team matched analyses,84baseline-trace
   analyses and12incentive probes. New unique outputs; same cases/scorers, source7f2a136a.
   Monitor data/quality/final-development-progress.json; preserve every failure.
3. Publish via data/quality/publish-phase.py, then sanitize; update score history via
   data/quality/update-score-history.py and compare source results. Review meaningful failures;
   fix only shared causes before freeze if justified. Do not optimize toward preferred behavior.
4. Practical stopping: successful informative confirmations with no further justified local
   change, evidence limits or development cap. Never claim a global optimum or100xgain.
5. Declare benchmarks/final-checkpoint.json with source/suite hashes, exact selected case IDs,
   modes, repetitions, run concurrency and request pool. Held-out once: planner240attempts
   (120cases×2), participants96(8families×3variants×2reps×2arms), analysis96on those traces.
   Evaluator validates config and exclusive persistent attempted markers. Never reset/repeat.
6. NO source tuning after held-out. Report all weaknesses, failures, costs and uncertainty.
7. Finish REPORT.md, LIMITATIONS.md, score-history.json, verification.json, final source/gate,
   aggregate ledger metadata, comparisons and reproducibility instructions. Re-run report
   helper PYTHONPATH=. .venv/bin/python benchmarks/results/reproduce-configurations.py.
   Its4calibrations cover known offsets, ordering and missing/failed denominators.
8. Archive-aware Gitleaks including new traces, coherent commits, push/draft PR/link immediately.
9. Final comparison visualization: save standalone scorecard.html; call html_preview then
   html_render using T3tools. Theme variables, transparent outer layout, no server. Final short:
   PR/report links, main gains, cost, checks and limits. No human-study/cross-model/global claims.

## Useful evidence and helpers

- benchmarks/results/REPORT.md is PROVISIONAL and must be rewritten around final results.
- results/LIMITATIONS.md records author correlation, heterogeneous seed blocks, counts/round
  tradeoff, numerical contract versus insight, seven synthetic worlds and absent human validity.
- benchmarks/report.py summarizes within-condition effects; replay.py replays exported evidence.
- results/reproduce-configurations.py produces cross-configuration paired block contrasts.
- Source archives before reproducibility fix omit some UI inputs; disclose that their git
  checkpoint is required to rebuild those UI versions. Keep old evidence unchanged.
- Research/protocol already cite OpenAI evaluation/model guidance, tau-bench, SOTOPIA,
  Melting Pot and Concordia. Anthropic403documented; no bypass or unsupported citation.

## Final freeze 18:49 UTC

Final source7f2a136a is frozen in benchmarks/final-checkpoint.json. Full gate,302backend
checks,66frontend tests,65browser tests, extracted archive build/test and nonroot smoke pass.
Matched larger-team analysis72/72; baseline-trace83/84; incentives12/12. Fresh stability
84/84then83/84, with one participant-versus-group utility error preserved. No new source,
test or scorer changes from this point. Held-out runner not yet started; commit declaration
then execute benchmarks/heldout-runs.json once. Known residuals are explicit in declaration.
