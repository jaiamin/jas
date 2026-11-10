# Merge-readiness repairs

2026-11-10. Starting head `78877e1f8b566f9f05572db13d14f575bdfc2df3`.
The user authorized fixing the independent review findings and all further
failures exposed by complete verification. No merge or paid evaluation is authorized.

This records the repair published at `885f3846`. The later unused-code and
documentation cleanup is attributed separately in the
[verification record](MERGE_READINESS_VERIFICATION.json).

## Acceptance

- [x] Finite admission revokes containment qualification on worker failure or
  incomplete cleanup; ordinary artifact rejection does not revoke qualification.
  Verify through the public HTTP admission/runtime interfaces, with fault injection
  only at the external process boundary.
- [x] Current-contract regression fixtures/assertions are reconciled without
  compatibility readers or weakened privacy/replay checks. Frozen T01 is unchanged.
- [x] The Agent suggestion selection observation is diagnosed and verified in
  the real rendered flow; no arbitrary waits or automatic test retries.
- [x] The complete backend suite passes, including new regressions, with measured
  execution time and a sufficient CI budget; no tests are silently omitted.
- [x] Frontend units, lint, forced types/build and the complete browser suite pass.
- [ ] Normal hooks/Gitleaks, scoped independent review and hosted CI pass at the
  final source; update PR32 without merging it.
- [x] The local 8080 app remains available with the current source; dispose only
  this task's temporary test data/services and preserve existing application data.

## Approach and boundaries

Use the existing HTTP and World seams and the existing Playwright application
shell. Keep deterministic/scripted correctness separate from live model quality.
Run local heavyweight commands sequentially under `.tools/research-harness/checks.lock`,
with a 134217728-byte shared free-space floor. Use distinct temporary directories
and ports. Reclaim completed passing test temporaries through pytest's normal
retention controls so the complete suite can fit; preserve failure logs and JUnit.
Do not change dependencies, frozen independent oracles, security settings or
other worktrees to make checks pass.

## Progress

- Starting source and branch are clean. Review evidence lives in ignored
  `.tools/merge-review/`; hosted run42908993519 records backend failure/timeout,
  seven browser failures, and passing frontend static/units/build/container/workflows.
- The existing public fault-injection witness confirms failed admission leaves
  runtime enabled. Four previously reported bugs passed 14 targeted cases.
- Admission now revokes qualification for failed/unavailable workers and incomplete
  cleanup. The initial public regression observed three failures before repair;
  the repaired slice passed seven cases including hostile-candidate rejections.
- Independent Spec review found no additional gaps. Independent Standards review
  identified actual scratch allocation/teardown exceptions escaping the result
  boundary. Two additional public cases reproduced both exceptions before the
  sandbox was repaired to return an unclean failure for lifecycle OSErrors.
- The first full backend run was deliberately interrupted after 558 passing
  cases, with no observed test failures, to incorporate that new repair. Its
  exit2/partial result is retained and is not complete qualification.
- Stale current-contract tests/callers have been reconciled. Workflow exposure
  asserts literal readers and the pre-handoff cutoff; the intermediate missing
  Cedar expectation remains a retained failed test correction.
- Repeated real-browser selection probes measured a roughly22px layout shift
  caused by the provider notice arriving after coordinate measurement. The test
  now awaits that visible notice before dragging;30 repeated observations passed.
  This is a test readiness correction, not a claimed product interface repair.
- Frozen T01 and independent contract oracles were preserved throughout the
  repair. Complete local verification is recorded below.
- The complete second backend attempt finished in548.36s:1782 passed/49 failed.
  All failures were the generic validity helper renaming bound workflow actors
  without updating orders/routes/permissions, or choosing an invalid two-person
  population. It now preserves the six-person workflow template, matching the
  helper's existing treatment of bound coordination/commitment tasks. All49
  workflow matrix/inactive-mechanic cases then passed; no cases were removed.
- Frontend169 units,245-file lint, forced TypeScript and a fresh isolated build
  pass. All54 rebuilt assets (2972817bytes) exactly equal the served assets.
- Backend CI retains every test and reports slow cases. Its45-minute ceiling
  allows for the previously observed hosted timeout at10minutes/roughly37%,
  setup time and host variance; local full-suite timing is recorded separately.
- The first local complete-browser attempt was deliberately interrupted after70
  passes: Playwright retained temporary trace recordings across successful cases,
  consuming over200MiB of shared free space. Minimum measured free space remained
  269496320bytes, above the134217728floor. The interrupted case/trace/log remain
  retained; this is not a product failure or full-suite pass. A distinct complete
  run uses the documented `--trace=off` diagnostic option with all182 cases and
  assertions unchanged. CI still uses `retain-on-failure` with its normal disk.
- The uninterrupted second browser run passed all182 cases in429.97s. The four
  affected opt-in configurations separately passed20 cases:11 harness/artifact/
  exposure,2 capability-context,2 reference-policy and5 reliance. Temporary
  servers shut down normally. One middleware `No response returned` traceback
  appeared during the intentional draft reload/navigation case; its assertions
  and the following case passed. The triggering request was not captured, so no
  product defect, exact disconnect cause or repair is claimed for that log.
- The active8080 workspace is no longer empty: a user conversation and recorded
  provider usage exist. Final refresh must preserve that data and usage; never
  reuse the earlier empty-workspace/zero-usage statement as a current claim.

## Final local qualification

The final uninterrupted backend run passes1831/1831 cases in568.25s, with no
skips. The repair's backend/browser/trial inputs share source digest
`6045438b42c1be0fe751b61411218baa4f46a44a9ce3b9e904379c8e23f92d14`.
Frontend lint/169 units/forced types/build used identical frontend inputs;
independent recomputation proves their sole source difference was the corrected
backend validity helper. All54 rebuilt assets equal the served assets.
The [verification record](MERGE_READINESS_VERIFICATION.json) contains commands,
source digests, timings and local receipt/log/JUnit hashes.

The source review's Standards finding and its cleanup-exception follow-up were
reproduced and repaired. The independent Spec review found no additional gaps.
Final Ruff/global types and all complete local suites pass; normal hooks and
hosted CI remain publication gates, not implied by the local results.

Preview refresh changed PID474266→507105 while preserving the existing database
inode and exact public/conversation/usage hashes. Tests and refresh sent no
external model requests. User-recorded usage is preserved, not counted as testing.

This establishes engineering correctness for the covered deterministic workflows.
It does not establish live/held-out intelligence, generation quality or judgment
accuracy. The frozen T01 historical export-v4 failures remain disclosed; no
benchmark source was retuned and no old-contract reader was added. Numerical
runtime benchmarks retain their earlier source attribution and were not rerun
by these containment/test integration repairs. No PR merge is authorized here.

## Cleanup and hosted-CI follow-up

The cleanup removes49 superseded documents after compact reporting, an unused
breadcrumb module and an unused compact-screen hook. No application imports or
test/configuration references use those modules. Current guides, comments and
links are reconciled; accepted requirements, benchmark cases/oracles and current
user data remain intact. The documentation index replaces the retired task index.
The first cleanup build exactly matched the54 served assets.

Hosted run42919797313 passes backend/container/workflows but fails one default
browser case: a late provider notice shrinks the transcript by31px after the
scroll target is calculated, leaving the footer3.25px behind the composer.
Original repeated observations fail1/12; frame samples exclude font changes and
show the stopped scroll target. A controlled late-notice regression reproduces
the same gap. Always following initially changed the question anchor and was
rejected; both immediate/deferred-following failed/interrupted checks remain
recorded. The newest reply now renders eagerly so the native initial anchor uses
its actual height. Native following handles later viewport changes, while manual
upward scrolling keeps its position; older replies retain deferred rendering.

Focused navigation checks also reproduce the earlier middleware traceback.
A disconnected real asset request fails with `No response returned` before the
repair. The same origin/header middleware now forwards ASGI messages directly;
it does not catch/suppress application exceptions. All42 public API cases pass,
including disconnect, host/origin, response-header and zero-spending checks.
Final cleanup source/checks and adverse attempts are attributed separately in
the verification record. Hosted CI must pass the published follow-up source.
