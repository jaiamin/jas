# Research harness implementation progress

Status: **active**. The user invoked `implement-spec` after reviewing the
20-ticket breakdown. This authorizes implementation of that graph; previously
accepted product and testing-seam decisions are not reopened.

- Parent: [spec #11](https://github.com/jaiamin/ass/issues/11).
- Integration branch: `integration/research-harness`, created from `7cb3279`.
- Integration draft PR: [#32](https://github.com/jaiamin/ass/pull/32).
- Contracts and acceptance: [spec](RESEARCH_HARNESS_SPEC.md),
  [ticket bodies](RESEARCH_HARNESS_TICKETS.md), [design plan](RESEARCH_HARNESS_PLAN.md).
- GitHub publication verified all 20 bodies, labels, parent relationships and
  33 native blocking edges. Parent content, labels and state were preserved.

## Delivery and evaluation rules

Implement the ready frontier in isolated per-ticket branches/worktrees using
fresh-context agents and TDD at the already approved public workflow API seam;
World and provider/accounting seams supplement independent invariants. Merge
one accepted slice at a time with a fresh merger agent. Keep the existing UI
and public workflows usable. Checks must not be weakened to make a slice pass.

Each slice records its exact source/case identities, relevant inherited
regressions, independent new behavior checks and a before/after development
comparison. Retain all attempts, errors and null results. A failing prerequisite
blocks adoption even if an aggregate score improves. Deterministic checks do
not establish live intelligence. Freeze independent held-out cases after
development; do not tune on failures and silently rescore them as fresh evidence.

The app Researcher remains Pydantic AI with `openai:gpt-6.1-sol`; model
participants remain `openai:gpt-6-luna`. Keep provider/model, participant harness,
world mechanics and study factors separate. Initial range: 1–12 active agents.

## Acceptance gates

- [x] Existing workflow baseline is reproducible, with retained failures (T01
  integrated at `bf3b76e`; deterministic correctness evidence only).
- [ ] Authoritative worlds, privacy, copied probes, exact replay and generated
  execution isolation independently pass the required checks.
- [ ] Both participant harnesses and discretionary planning, retrieval,
  investigation and verification are usable and accounted for.
- [ ] Research competence and failure-aware, exposure-aware, baseline-supported
  claim validity are assessed separately.
- [ ] Four study families pass their relevant deterministic and separately
  authorized live evaluations, with operating limits and uncertainty reported.
- [ ] At least one fresh held-out genuinely new mechanic passes independent
  acceptance, privacy and replay checks through admitted execution.
- [ ] Integration review and required project checks pass; PR is reviewable and
  disposable worktrees/services are cleaned up.

## Task graph and checkpoints

Statuses reflect accepted integration work, not automatic GitHub closure. Issues
remain open until the tracker resolves them through draft PR #32. No
default-branch merge, auto-merge or history rewrite is authorized.

| Ticket | Issue and behavior | Blocked by | Status | Integrated commit |
| --- | --- | --- | --- | --- |
| T01 | [#12](https://github.com/jaiamin/ass/issues/12) Reproduce the current experiment workflow and freeze a regression baseline | None | Integrated | `bf3b76e` |
| T02 | [#13](https://github.com/jaiamin/ass/issues/13) Inspect and qualify an isolated environment-extension candidate | T01 | Integrated and accepted | `77f6014`, `c546c85` |
| T03 | [#14](https://github.com/jaiamin/ass/issues/14) Reuse environment mechanics without importing an experiment | T01 | In progress in isolated worktree | — |
| T04 | [#15](https://github.com/jaiamin/ass/issues/15) Select and run a bounded participant harness on an existing world | T01 | Integrated and accepted | `48600d2` |
| T05 | [#16](https://github.com/jaiamin/ass/issues/16) Let the Researcher answer with real capabilities and isolated probes | T01 | Integrated and accepted | `a4ab9ee` |
| T06 | [#17](https://github.com/jaiamin/ass/issues/17) Show failure-aware estimates and honest small-sample uncertainty | T01 | Complete; awaiting fresh merger | — |
| T07 | [#18](https://github.com/jaiamin/ass/issues/18) Trace treatment opportunity, delivery and observation | T01 | Ready | — |
| T08 | [#19](https://github.com/jaiamin/ass/issues/19) Give participants source-linked memory, plans and accessible verification | T04 | Ready | — |
| T09 | [#20](https://github.com/jaiamin/ass/issues/20) Run a solo evidence-seeking task in a persistent artifact world | T03, T04 | Waiting on T03 | — |
| T10 | [#21](https://github.com/jaiamin/ass/issues/21) Observe three-agent coordination with explicit phase and delivery semantics | T07, T09 | Waiting | — |
| T11 | [#22](https://github.com/jaiamin/ass/issues/22) Study four-agent reliance and feasible commitment breaches | T10 | Waiting | — |
| T12 | [#23](https://github.com/jaiamin/ass/issues/23) Run a small institutional workflow with atomic work/resource effects | T10 | Waiting | — |
| T13 | [#24](https://github.com/jaiamin/ass/issues/24) Have the Researcher produce a reviewable artifact-world experiment | T05, T09 | Waiting | — |
| T14 | [#25](https://github.com/jaiamin/ass/issues/25) Run one explicitly budgeted end-to-end investigation | T06, T13 | Waiting | — |
| T15 | [#26](https://github.com/jaiamin/ass/issues/26) Compare actual reference policies and participant-harness ablations | T06, T08 | Waiting | — |
| T16 | [#27](https://github.com/jaiamin/ass/issues/27) Admit a verified extension as a runnable versioned environment | T02, T09 | Waiting | — |
| T17 | [#28](https://github.com/jaiamin/ass/issues/28) Have the Researcher generate and validate a genuinely new mechanic | T13, T16 | Waiting | — |
| T18 | [#29](https://github.com/jaiamin/ass/issues/29) Inspect a declared fallible adjudication and replay its consequences | T09 | Waiting | — |
| T19 | [#30](https://github.com/jaiamin/ass/issues/30) Assess evidence-supported claims and reanalyze through read-only lenses | T06, T07 | Waiting | — |
| T20 | [#31](https://github.com/jaiamin/ass/issues/31) Demonstrate the small-population generalization milestone | T11, T12, T14, T15, T17, T18, T19 | Waiting | — |

## Preserved drafts and spending

T05 ticket handoff: `t3/researcher-probes`, implementation `504d756`, tested
combined source `5b70116` including latest integration `8f83a36`. Real bounded
catalog/context/copied-world operations reach answers, planner handoff and
durable streamed activity. The controlled development replay is 14 red → 14
green; merged checks pass 961 backend, 108 frontend and 14 affected browser
tests plus lint/types/build. The pre-merge full browser suite passed 169 tests.
The identical inherited six-case comparison has no regressions/failures and
unchanged 22 scripted requests. Read [T05 evidence](research/T05_RESEARCHER.md);
preserve ignored `data/t05/` before cleanup. No paid calls, live competence claim,
publication or tracker changes. These ticket-branch observations are inherited;
the fresh T05 integration acceptance is recorded below.

T01 evidence: [baseline report and inherited comparison procedure](research/T01_BASELINE.md).
Source `d5527c0b4cb57cb63f8d39cb74d335396042e711` on
`t3/t01-research-baseline` was integrated with no-ff merge
`bf3b76eb626db625b4476a8d436e67e2cfc95df9`. It adds only development fixtures,
keyless evaluation/test tooling and documentation; production source and
historical suites remain byte-unchanged from `b02536c`.

The ticket-branch evidence records 935 backend tests, 106 frontend tests,
frontend lint/build and all 165 keyless browser tests passing. Runtime setup
and initial new-runner failures are retained and classified in the report.
At the clean integration merge, the merger observed **76 focused backend tests**
passing across baseline, API, exports, execution, lifecycle and streaming,
plus Ruff and ty checks. Its fresh real API baseline passed all six cases with
22 scripted responses and 98 HTTP operations; comparison with the preserved
qualified-after report had no regressions, improvements or before/after
failures. Source stability passed. The unchanged UI suite was inherited without
a redundant merger rerun. No paid trial or live competence claim is made.

All raw ticket artifacts were copied without overwrites from the T01 worktree's
`data/research-baseline/` into the integration checkout's ignored
`.tools/research-harness/evidence/T01/`: **159 files, 13,343,424 bytes**.
Every copied SHA-256 matches the source, which stayed stable during copying.
The per-file verification record is
`.tools/research-harness/evidence/T01-copy-verification.json`; its canonical
file-manifest SHA-256 is
`dde18508e88dfa92571455a789f72589b2f3bde5dabd5d5059a0a35126b28388`.
Fresh integration logs, source archive, attempts and comparison are separately
preserved in `.tools/research-harness/evidence/T01-integration/`.
The source worktree remains intact. Keep these ignored evidence directories
when cleaning up ticket worktrees.

The incomplete pre-spec changes to the assistant and research tools are preserved
in local Git stash `f771128ba1c9295262a4073df40cc25647b1370f` (including the
untracked research-tools file). They are excluded from the baseline and have
not been represented as implemented capabilities. Do not drop the stash or
apply it wholesale over newer work; inspect it only when the relevant ticket
needs prior art.

Fresh Sol development charges so far: **$0.537462**, 47 known-usage requests.
The session-wide Sol cap is **$10**. The frozen eight-case comparison exposed
real discovery/probe-configuration failures; both are retained and repaired with
API red/green evidence. At most $0.75 is allocated to repeat only the two affected
probes on the committed second repair. See [live development](research/SOL_DEVELOPMENT.md).
Implementer agents must remain keyless unless given a specific coordinated trial
allocation. Luna participant trials need an explicit separate allowance; prepare
the concrete manifest and estimate after deterministic qualification. Until
those trials run, the live milestone remains unverified.

## Next actions

1. T04/#15 is accepted on the T05 tip; its complete source and fresh evidence are
   preserved and verified. T08/#19 is now Ready, alongside T07/#18. T09/#20 still
   waits on T03/#14; T03/#14 is in progress and T06/#17 awaits fresh integration.
2. Review and merge each accepted slice sequentially, then refresh/link draft
   PR #32; qualification failure gates generated execution, not trusted worlds.
3. Preserve source-stamped inherited and new-behavior evidence for each slice;
   keep live and held-out gates unverified until their required trials run.

## T02 integration — accepted after review fixes

The assigned ticket branch `t3/candidate-containment-review` implements immutable
candidate reviews and the environment review UI. Import-free Wasm containment
passed all 26 independent development checks in both development and the actual
non-root production image, including the actual four-second worker deadline.
Experiment execution remains disabled pending T16 world admission. See the
[T02 evidence report](research/T02_CONTAINMENT.md) for source identities, retained
failures/repairs, paired keyless baseline, observed checks and ignored artifacts.
Implementation source is `74daeeb`; the browser response-wait repair is `b28f5b3`.
Ticket HEAD `07d6d9fa681bd5ce79777c480e0798b5d6fa6137` is integrated with no-ff
merge `77f6014981754adefc954af51e06f9326ab95893`, preserving T01's checkpoint.

The independent merger observed 128 focused backend tests passing (12 new
extension tests and 116 existing API, lifecycle, accounting, World/privacy,
export and execution checks), Ruff/ty, frontend lint and TypeScript/production
build. A fresh tracked-source production build and the real non-root smoke
passed all 26 qualification checks plus independent safe/denied/exhausted
candidate reviews. The unique disposable container was removed. The child's
final 3 affected browser flows and full 168-flow suite are retained; no redundant
merger browser suite or baseline was run. No paid calls or tracker/PR changes.

All 531 ignored `data/t02/` artifacts (21,393,475 bytes) are preserved without
overwrites under `.tools/research-harness/evidence/T02/`. Every copied SHA-256
matches the stable source. The sibling `T02-copy-verification.json` records
canonical manifest SHA-256
`85b20d19b4e4c133e3eba3c0cf9add8973c8c6f55a65a0effe0457f559437ab7`.
Fresh merger source, raw logs, command records and container proof are under
`.tools/research-harness/evidence/T02-integration/`; the child worktree remains
intact. The unrelated untracked `pbcopy` was not read, copied or archived.

Parent follow-up `c546c85` fixes history submission selection, late-response
navigation isolation and the worker-exit/termination race, with sequential
red/green evidence in `.tools/research-harness/evidence/T02-review/`. After repair,
13 affected backend tests, 5 affected browser tests, 106 frontend tests,
lint/build, Ruff and ty passed. A fresh tracked-source non-root production
build passed all 26 checks. T02 review is accepted; this does not admit worlds
or clear the remaining global acceptance gates. The report records full source,
runtime and artifact identities. All task-owned services were closed.

## T05 integration — accepted

Ticket HEAD `14101d005d4a46ac13362350d086817cca8ec064` was integrated onto
`b7e5b1540ff9ccf63761a482a4288eed1ad8be4a` with no-ff merge
`a4ab9ee07f32ff7c5bb9014d4cfd0a495226dc3e`. The progress-document conflict
preserved latest T02/T04 state and recorded T03/T06 in progress. The newer T02
history-selection/worker-exit code and tests remain byte-unchanged. No blocking
review finding or product-code repair remained. See the
[T05 report](research/T05_RESEARCHER.md) for its privacy, cutoff, copied-probe,
public activity, planner handoff and request-accounting review.

Fresh merger evidence on stable `a4ab9ee`: 196 affected backend tests (including
14 T05 API cases and 13 extension tests), 108 frontend tests, 16 keyless browser
flows, Ruff/ty, frontend lint and TypeScript/production build passed. Browser
coverage includes both newer T02 history-selection fixes, Researcher results,
reload/draft recovery and streaming; two theme/viewport screenshots were visually
inspected. The unchanged T01 runner executed from a clean tracked-source Git
clone and passed six cases with 22 scripted participant requests and 99 HTTP
operations. Comparison to the retained pre-T05 baseline has no regressions,
improvements or before/after failures. The child's full backend/browser suites
and T02's production smoke are inherited, not fresh merger runs. Deterministic
checks do not establish live competence or held-out acceptance.

All 262 actual ignored source artifacts (37,716,120 bytes), including the child's
261 indexed files and `artifact-manifest.json`, are preserved without overwrites
under `.tools/research-harness/evidence/T05/`. Every child indexed hash and every
source/destination SHA-256 matched with stable source bytes.
`T05-copy-verification.json` records canonical manifest SHA-256
`41a3fd1f0c6cc4138deff04285f8b8509a35e69bd4416700adb3bb286bf9866d`.
Fresh tracked-source archive, logs, XML/raw analyses, browser screenshots,
baseline database/exports, comparison and acceptance records are in sibling
`T05-integration/`. The source worktree remains intact. The unrelated root
`pbcopy` was never read/copied/archived; the stash is unchanged. Playwright's
owned keyless server shut down and port 18216 is closed. No paid calls,
publication, tracker changes or security/credential changes occurred. At that
checkpoint T04 remained unmerged; its later acceptance is recorded below.

## T04 integration — accepted

Fresh merger scope: source `6a6c000ac87a44212f3da681dbd31497f9640982` onto
integration `39491def73da7334164ca6d98896eaa03a2e5bf5`, with no-ff merge
`48600d2982516210e6a4e28528d2e1c6f1fd155e`. No product-code conflict or repair
was required. The progress conflict preserves accepted T02 fixes, T05 acceptance
and T03/T06 in progress. The source worktree remains intact. Read the
[T04 report](research/T04_PARTICIPANT_HARNESSES.md) for independent review and
exact source/archive/case identities.

- [x] Read exact T04 acceptance, applicable ADRs and actual implementation.
- [x] Preserve all 2,329 ignored source artifacts (71,129,333 bytes), including
  all `data/t04/` and `.tools/t04-*`, without overwrites. Every source/destination
  SHA-256 matches; source HEAD/status/bytes remained stable.
- [x] Run the unchanged T01 baseline from a clean tracked-source clone of the
  accepted tip: six cases pass. The unrelated root `pbcopy` was excluded unread.
- [x] Check combined policy/accounting/lifecycle/World/privacy/replay/export and
  T05 Researcher regressions: all 995 backend and 108 frontend tests pass, as do
  Ruff/ty/lint/build, 27 shared browser flows and two actual policy flows.
- [x] Verify the actual v5 contract and all direct-action parity fields while
  retaining the frozen oracle's four v4 failures and terminal failed flags.
- [x] Record immutable fresh evidence, acceptance, limits and final handoff.

The complete independent comparison verifies all 22 direct-action turns and
retains every export/report difference with zero unexplained differences. Frozen
T01 after/comparison exits remain 1 with four `export-v4` failures; positive v5
checks and schema-4/setup-v1 rejection checks pass. All five T04 DEVELOPMENT
cases match the child's checks and usage (30 scripted requests). No historical
terminal flags or scores were relabeled.

Retained browser attempt: 25 passed and two planning-stage timing failures under
concurrent checks. Both original cases passed twice in isolation without edits;
the sequential 27-flow shared run then passed. Traces and hypothesis/timing
records remain available. The two policy flows passed separately in desktop/light
and phone/dark; their rendered records were inspected. No test or timeout was
weakened. The merger's final 29 distinct flows are affected coverage, not a fresh
full-browser-suite claim. Production smoke is explicitly inherited from qualified
child source `3f3cf5c`; unchanged runtime/containment/config/locks/smoke identities
are verified in fresh evidence.

Preserved source: `.tools/research-harness/evidence/T04/`; per-file verification
is `T04-copy-verification.json`, canonical manifest SHA-256
`df26099a7e31ee5efff8bd79027b9e22cdf67da2009a85216f2749c84e19d558`.
Every copied source/destination hash, all 2,328 child-indexed hashes and source
HEAD/status/stability were reverified. Fresh evidence stays separate in
`T04-integration/`; its immutable verification manifest indexes 853 files,
23,326,665 bytes, canonical SHA-256
`906110e27fe08f4813b7369ef0e2b74d2793400748e0caf102a7e86f53d0a9ce`.
Final commit/archive records have a separate checkpoint manifest. Keep both
ignored directories. Browser port 18215 and the owned preview are closed.
No paid calls, source-worktree disposal, stash operations, push, tracker/PR or
host/security/credential changes occurred. Live competence and held-out acceptance
remain unverified; spend remains $0. T08 is Ready; T09 still waits on T03.
