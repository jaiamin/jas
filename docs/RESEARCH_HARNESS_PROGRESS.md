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
- [x] Both participant harnesses and discretionary planning, retrieval,
  investigation and verification are usable and accounted for (T04/T08 mechanical
  qualification; live competence remains unverified).
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

### Root coordination — T13 implementation and fresh T19 review assigned (2026-11-10)

T01–T09 and T15 are accepted at `d55f270` (qualified code `6e1a7c8`). Root
rehashed all 1,032 T15 fresh-manifest files, then prepares publication and two
fresh assignments: isolated T13/#24 implementation on 18124, followed by
sole-writer T19/#30 integration review on 18222. T10 remains running/unpolled
on 18123. T16/T18 are Ready; dependent tickets remain blocked as listed below.

Complete T19 evidence is preserved under `.tools/research-harness/evidence/T19/`
with sibling `T19-copy-verification.json`: **3,244 complete files / 672 links**,
all 3,242 child-indexed hashes plus manifest/checksum and **2,447 gzip raw hashes**
verify against stable clean source `1d8d977`. Child manifest SHA-256 is
`eb64fef96962f010929f21358d4ba78ce713e6c6b4b43408f7578a14ddd3f04a`.
Preservation uses hardlinks for immutable closed evidence only; it is not an
independent physical copy. Never modify either data tree. All bytes/modes/mtimes/
literal link targets remain equal; no external links were followed. Generated
prose and earlier outside-cache effects remain unassessed pending fresh review.

Additional reversible storage maintenance packed 349 closed synthetic DB copies
(138,805,248 → 6,267,825 bytes), excluding T01/live work, with raw-hash proofs.
It also shared 6,109 identical immutable completed evidence files with source
copies, preserving all 10,753 affected logical entries and metadata except
inode link counts/ctimes. Proofs: `maintenance/closed-databases-20261110T073015Z/`
and `maintenance/immutable-evidence-20261110T073248Z/` under the ignored harness
directory. No active dependency/build cache or source code was shared. Keep
all existing mappings and evidence immutable. Free disk after T19 preservation
was 909,156,352 bytes. No new paid calls or root product tests ran.

### T15 acceptance checkpoint (2026-11-10)

**T01–T09 and T15 are accepted.** Fresh sole-writer T15 review merges exact clean
`0d026992b4740675dac3afce54b17a785e3f73e9` into assigned `5ef3abf` through no-ff
`fa1c825fb336f8c9292a66404576162e41807fab`. Qualified executable source is
`6e1a7c86b06ebd5e39a3445cea6ca6c7786252c3`; final exact HEAD and normal hooks are
under `T15-integration/acceptance-checkpoint/`. Root resumes sole checkout
ownership and publication decisions. T10 remains separately assigned (18123).
T13/T16/T18 remain Ready; no live trials are allocated.

Independent Standards/Spec review repaired T09 pure artifact reads missing from
T15 tool effort, including denied attempts. Both public-API reds, the green
run/comparison/export/replay regression and stale export7 assertion failures
remain. DB7/export8/capture1/comparison1/library4/tool2.0/direct1.0 stay current;
accepted T07/T08/T09 delivery/privacy/replay, T03/T05 reuse/probes and T06 frozen
analysis are preserved. Models remain Sol Researcher/planner/assistant and Luna
participants. See the [fresh acceptance report](research/T15_BASELINES.md#fresh-integration-acceptance-2026-11-10).

Fresh checks: **1,209 backend tests / 39 files**, Ruff/ty/lint, **111 frontend
tests**, forced TypeScript/new empty-directory build, **298 independent controls**,
**160 independent artifact checks**, six independent T06 scenarios and **58
passing browser executions / 57 distinct configured flows** at 18221. The fresh
build is byte-identical to the normal build; manual public API/browser checks
show four runs/eight scripted decisions/zero calls. All owned services and tab
are closed; 18221 is closed. No uninterrupted full-browser run is claimed.
Production-container smoke remains inherited from accepted T09 `84867cc`;
no fresh image/container smoke, live or held-out result is claimed.

Frozen T01 stays **exit 1/four export-v4 failures/four failed flags**, unchanged
runner/cases/scores, zero regressions/improvements. Positive current-contract
**five-run/22-turn/22-request** behavior/accounting parity passes against retained
accepted T09 evidence (before not rerun): HTTP 98→98; all **1,807 differences**
classified, zero unexplained. Four neutral DEVELOPMENT cases pass freshly:
32 runs (29 complete/one failed/one paused/one ready), 59 turns, 28 scripts,
46 stand-in requests, 15 tools, 4,600/2,300 tokens, **1,610 integer microdollars**
synthetic; actual spend zero. Null and incomplete results remain visible.

Fresh `T15-integration/verification-manifest.json` freezes **1,032 files /
55,245,827 bytes / 53 checks / 13 nonzero attempts**, all rehashed; canonical
SHA-256 `2976bdb912a9b550190ca05bb8d052291af45ae157d3df08861f9726e80800e6`,
file SHA-256 `1cfb66c0020f1c11705fec75b0cfeafce3dc1c1b23e5c2f886ace187b9812efd`.
All 39 fresh archives/4,682 members verify bytes/modes/link targets; later exact
HEAD/hooks/docs-source records are separate. All 1,745 Sol artifacts remain
verified unchanged. Some early read-only exploratory errors have retrospective
summaries; substantive check attempts retain commands/exits/raw evidence/source.

**T19 is complete awaiting a separate fresh review**, per root's operational
update only: clean `1d8d9774a9dccb2e32f8171da7264185040c44c1`,
`t3/research-claim-support`, `/home/agent/.t3/worktrees/workspace/t3-95af26a2`,
including accepted `12b35c9`. Report: `docs/research/T19_CLAIM_SUPPORT.md`.
Complete `data/t19` is approximately 184 MiB; manifest
`eb64fef96962f010929f21358d4ba78ce713e6c6b4b43408f7578a14ddd3f04a`
indexes 3,242 files, 672 links, 30 nonzero attempts. Root read the report/manifest
but has not copied or accepted it. This T15 review did not inspect, copy, review
or merge T19. Disclosed setup limit: T19 initially hardlinked mutable TypeScript/
Vite caches; 42 generated source-checkout files were later detached and forced
checks passed, but earlier outside-cache effects remain **unassessed**. No
source/evidence corruption is claimed. T15's own 59 generated files have private
inodes; TypeScript/build were forced freshly after this disclosure.

Complete T15 evidence is preserved as an inert archive under
`.tools/research-harness/evidence/T15/`: **10,198 files / 435,622,928 original
bytes / 263,221,522 packed bytes**. All child-indexed hashes plus its manifest,
all archive member bytes/modes and unchanged source were verified. Archive
SHA-256 `4eb54be4f58725e36d1f53e9edec120ba3ded5dfaeafa048d1a50c34b2d2d6cc`;
child manifest SHA-256
`985c0dc22f92a598ee4c73a42da815defa30623392ff8b396cc67d7132148582`.
Fresh T15 review reverified all complete source members, 94 checks and 131 inner
compression proofs twice by streaming, without extraction, against unchanged
clean source. Behavioral acceptance is separate from this custody result.

Root-owned storage maintenance preserved evidence logically without modifying
source worktrees. Identical immutable objects in three completed test clones
were hardlinked; all 9,956 object contents and recorded metadata remain equal.
1,754 closed synthetic database copies under evidence T03/T07/T08 were packed
from 624,697,344 bytes to 26,275,012 bytes; per-file gzip mappings preserve every
original hash/mode/mtime and were verified again after archival. Earlier
inventories address original logical paths, now resolved through these maps.
Records are in `.tools/research-harness/maintenance/closed-git-objects-20261110T065337Z/`
and `closed-databases-20261110T065504Z/`. T01 and all Sol evidence, stash and
unread `pbcopy` remain untouched. Free space was 772,595,712 bytes after packing;
continue bounded checks and verified closed-output archival.

### T09 fresh integration review — accepted (2026-11-10)

No-ff merge `c357a3bb5d18ec0bea0a75cd4121dfc82383d0b9` joins assigned `4186d33`
and exact clean source `4e6b2ea`. Fresh sole-writer Standards/Spec review repaired
missing artifact content exposure and denied-read replay validation at `4ed18af`,
then demonstrated and repaired read-operation identity corruption at `84867cc`.
The harness browser config also now supplies its disclosure fixture flag. Public
API red/green evidence and all failed attempts remain; no expectation was weakened.
See the [acceptance report](research/T09_ARTIFACT_WORLD.md#fresh-integration-acceptance-2026-11-10).

Current contracts: **DB7 / export8 / capture1 / comparison1 / libraryv4 /
tool-using 2.0.0 / direct-action 1.0.0**; controlled World rules are unchanged.
T07/T08 delivery/privacy/cutoff repairs, T03 mechanics-only immutable source reuse,
T05 isolated probes/live-discovery regressions and T06 honest outcomes are retained.
No migration/alias/reset, generated admission, phase scheduler or model judge.

Final unchanged `84867cc` passes **1,185 backend tests**, Ruff/ty, **160 independent
World/API checks** across six workflows/four memory modes, and fresh non-root
production build/smoke/26 containment/artifact/corruption/replay/restoration checks.
Frontend lint, **111 units**, TypeScript/build and **59 distinct browser flows +
one passing repeat** pass at `4ed18af`; final frontend inputs are identical.
All owned services/containers/image tags and the preview tab are closed; **18220
is closed**. Final production image was
`sha256:5c472c5dc0ac3f7fd0286c59796499cf7a0c3f8aca89722ed1eceb02dbfaacb3`.
No fresh full uninterrupted browser suite or live competence is claimed.

Frozen T01 remains **exit 1/four export-v4 failures/four failed terminal flags**,
without score/case/runner edits. Positive DB7/export8/library4/capture checks and
exact **22-turn/five-run** behavior/request/accounting parity pass. All **2,233 raw
differences + 47 keyed catalog differences** are classified, zero unexplained;
HTTP operations are 98→98. Raw exports differ. Scripted accounting is 22 requests,
2,200/1,100 tokens and $0.000770; actual spend $0.

Complete pre-merge `T09/` custody rechecks **1,147 files / 149,021,583 bytes**,
all 1,145 indexed entries and 3,948 members in four archives. Fresh
`T09-integration/verification-manifest.json` freezes **848 files / 70,856,059 bytes /
59 check records / 19 nonzero attempts**, canonical SHA-256
`7d65082e552662b28b7a442b1fb82c85c8e0bc82c651e821450d741790136a8e`,
file SHA-256 `b4de2712f74a7ff7157101801298b78a88b9974c1a05f10218dae680d8568332`.
Later exact-HEAD/hook/postcommit records are separate. Only closed fresh outputs
were losslessly compressed, with all 2,822 member bytes/targets verified. Source,
all prior evidence, 1,745 Sol artifacts and stash remain unchanged; no root pbcopy
or real config was accessed. Child early slices 1–6 lack complete per-attempt dirty
source archives; child 181 browser passes/ENOSPC/four focused successes remain
inherited, not an uninterrupted full-suite success.

**T10/T13/T16/T18 are Ready; root chooses launches. T15 is complete awaiting a
separate fresh integration review**, per root coordination, source `0d026992` on
`t3/t15-reference-policies`; no T15 files/evidence were inspected. **T19 remains
running/unpolled.** Root resumes sole shared-checkout ownership and draft PR #32
publication. Review spend $0; global Sol **$0.611632/55 known requests**,
**$9.388368 remaining**, no paid Luna. No push/PR/issue edit/watch/closure or
worktree disposal. Hosted checks/reviews were not queried.

The earlier review checkpoints below retain their historical statuses and checks.

### T07 fresh integration review — accepted (2026-11-10)

No-ff merge `a92105f` joins assigned accepted `e2d42c9` and exact clean T07 source
`e7800d3`, preserving accepted T08 `9750caf` and cutoff repair `de5556b`. Fresh
sole-writer Standards/Spec review found and repaired two request-delivery defects
at `d5568c1`: T08 capability content was missed, while compacted-away observation
content was falsely counted. Bindings now inspect exact authorized content in
the final bounded request and use that request's own confirmed/unknown receipt.
Supported browser fixture checkpoints are `0d1bb29` and `777a609`.

- [x] Preserve complete source evidence before merge; verify indexed files,
  symlinks/opaque fixtures, all compression mappings and stable source state.
- [x] Merge actual T07/T08 contracts without losing discretionary capabilities,
  privacy, cutoff metadata, accounting, source-pinned reuse or frozen comparisons.
- [x] Independently exercise private actor/target/observer, public/absent controls,
  utilities, all memory modes, capability delivery/compaction, failures, disabled
  operations, source pointers, restore and frozen pending analysis membership.
- [x] Run fresh combined backend/static/frontend/browser checks and current-
  contract/22-turn parity while retaining the unchanged frozen oracle failures.
- [x] Record evidence, findings/repairs/limits, accepted frontier and closed services.

Current contracts: **DB6/export7/capture1/comparison1/libraryv3**, tool-using
**2.0.0** and direct-action **1.0.0**. Fresh results: **1,094 full combined backend**,
108 affected tests, **377 independent API/World checks**, **111 frontend tests**,
Ruff/ty/lint/TypeScript/build, **61 distinct browser flows + one passing repeat**,
five T08 neutral cases/47 scripted requests and five inherited T04 cases pass.
Browser coverage includes actual T08+exposure capabilities and source pointers,
pause/restore, both themes/desktop+phone, loading/retry and 52 shared workflows.
Backend/full source is clean tracked-only `d5568c1`; later changes are browser
fixtures and prose. Child 1,038-backend/182-browser results and accepted T03
production smoke are inherited, not fresh combined-source/full-browser evidence.

Frozen T01 keeps **exit 1/four export-v4 failures/four failed terminal flags**,
zero new regressions/improvements. Positive current contracts and exact **22
turns/five runs** pass; all **885 differences** are classified, zero unexplained.
No attention/belief/intent, independent-unit, automatic causal, live or held-out
competence claim follows. All benchmark files, Sol fixes/tests, copied probes,
T02 isolation, T03 pinned mechanics and T06 frozen membership remain protected.

Complete source copy: **2,164 files / 251,316,466 bytes / 176 symlinks**, canonical
`94c1edfd1d132b8d93bcf287a24e95b80f40b60e4b358e2a7dbdb28fced627f8`;
2,161 child-indexed files and 499 compression mappings verify. Fresh immutable
manifest: **1,659 files / 93,761,566 bytes / 263 symlinks / 51 main checks**,
11 nonzero attempts; file SHA-256
`b0d3a0b83a67b17037f0c539d086eb600febdd9e4557fbe41387e476195667f3`.
Later acceptance/manifest-helper records are separate. All prior evidence and
1,745 Sol artifacts remain unchanged; source checkout/stash stay intact. Fresh
closed outputs alone were losslessly compressed: 822 mappings/294,764,108 bytes
saved. No valuable/frozen evidence or other-agent environment was altered.
Retained failures include oracle/fixture corrections, valid compaction red,
static/build/Ruff and timing failures, plus review-helper failures with corrected
successes. See the [full fresh report](research/T07_EXPOSURE.md#fresh-integration-acceptance-2026-11-10)
for exact attribution, manifests/digests and limitations.

Owned 18218 services/browser are closed. Review spend **$0**, no paid Luna;
global Sol remains **$0.611632/55 requests**, **$9.388368 remaining**. No descendants,
publication, tracker/PR edits/watches/closure or worktree cleanup. **T19 is Ready**;
**T10 waits for accepted T09**. T09/T15 remain running and unpolled. Root resumes
shared-checkout ownership and owns draft PR #32 publication/new frontier.

### T08 fresh integration review — accepted (2026-11-10)

Assigned sole-writer review starts at `6b7ad09`, source clean `b2ac25c`.
No-ff merge `9750caf` resolves only progress/handoff text; cutoff receipt repair
`de5556b` follows. T07 is now complete awaiting a separate fresh integration
review, per parent coordination; T09 remains running and unpolled. No publication,
paid allocation or manual evidence cleanup.

- [x] Preserve the complete ignored source evidence before merging: 1,521
  files / 300,819,177 bytes and 332 symlinks, all source/destination hashes
  equal with stable source HEAD/index/status. All 574 child-indexed files verify.
- [x] Read the approved ticket/spec/seams, glossary/ADRs and architecture/design;
  merge source with `--no-ff` and retain both documentary handoffs.
- [x] Independently review public capabilities, memory modes/cutoffs/privacy,
  World authority, disabled/unused operations and restore/accounting/replay.
- [x] Fresh shared-source backend/static/frontend/build and affected browser
  checks on 18219, plus unchanged frozen oracle and positive current-contract/
  22-turn/five-run request/export parity and neutral DEVELOPMENT comparisons.
- [x] Record concrete findings/repairs, observed versus inherited evidence,
  immutable manifests and closed services; accept T08 only when checks support it.

Evidence: `.tools/research-harness/evidence/T08/` (complete preserved source),
`T08-integration/` (fresh commands/identities/results). Canonical complete copy
inventory SHA-256 `82ac8198e042bad28c9c5980840567a226c77ed3953e28c2f9491a1d750c141c`.
The four known test-generated configuration fixtures were copied opaquely only
after verifying their tracked generator; no contents were printed/committed.
Root `pbcopy`, real configuration/credentials and preserved stash remain untouched.

Independent acceptance, precise source attribution and limits are in the
[T08 report](research/T08_PARTICIPANT_CONTEXT.md#fresh-integration-acceptance-2026-11-10).
Fresh backend initially exited 1 with **915 passed / 2 failed / 133 errors** due
to `ENOSPC`; the exact 135 affected cases passed after parent storage maintenance.
The cutoff fix then passed **65 affected tests**, including one new API regression.
Across checkpoints 1,051 unique cases passed; no single final full-suite success
is claimed. Ruff/ty, frontend lint/109 units/build, 56 distinct browser flows plus
two post-repair repeats, 377 independent API/World checks, five neutral cases/
47 scripted requests/11 comparison checks and five inherited T04 cases pass.
Production smoke remains inherited from accepted T03; runtime inputs are unchanged.
The frozen oracle retains exit 1/four v4 failures/failed terminal flags; positive
current-contract and 22-turn/five-run parity pass with all 509 differences
classified, zero unexplained. All historical benchmark identities/scores remain.

The maintenance verification records **1,174,781,952 bytes** free (preceding
measurement **1,215,180,800**) and a passing 1 MiB write+fsync probe; shared space
continues changing. Raw ENOSPC, child worker-timeout/exit-137 and verifier failures
remain retained. Standard pytest rotated fresh scratch roots `pytest-0/1`; all
logs/source/JUnit/exports/screenshots and complete child evidence remain.
Fresh immutable manifest: **1,411 files / 128,559,266 bytes / 32 symlinks / 37 checks**,
canonical SHA-256 `ab33f4829f0830213e3a3c4759cab57cf5f34ee8da8bc72ed95e41dadca93122`,
file SHA-256 `7748adb2dd28c7d7960bae1530a011a815678032a7722a35855cdd0da86b3aad`.
Prior evidence and all 1,745 Sol artifacts remain unchanged. Final exact HEAD and
manifest recheck extend a separate `T08-integration/acceptance-checkpoint/` record.
Owned browser/services are closed and 18219 is closed. Review spend $0; no Luna,
publication, reset, other-agent changes or live/held-out acceptance.

| Ticket | Issue and behavior | Blocked by | Status | Integrated commit |
| --- | --- | --- | --- | --- |
| T01 | [#12](https://github.com/jaiamin/ass/issues/12) Reproduce the current experiment workflow and freeze a regression baseline | None | Integrated | `bf3b76e` |
| T02 | [#13](https://github.com/jaiamin/ass/issues/13) Inspect and qualify an isolated environment-extension candidate | T01 | Integrated and accepted | `77f6014`, `c546c85` |
| T03 | [#14](https://github.com/jaiamin/ass/issues/14) Reuse environment mechanics without importing an experiment | T01 | Integrated and accepted | `6c290df`; [evidence](research/T03_ENVIRONMENTS.md) |
| T04 | [#15](https://github.com/jaiamin/ass/issues/15) Select and run a bounded participant harness on an existing world | T01 | Integrated and accepted | `48600d2` |
| T05 | [#16](https://github.com/jaiamin/ass/issues/16) Let the Researcher answer with real capabilities and isolated probes | T01 | Integrated and accepted | `a4ab9ee` |
| T06 | [#17](https://github.com/jaiamin/ass/issues/17) Show failure-aware estimates and honest small-sample uncertainty | T01 | Integrated and accepted | `aaf3a15`; [evidence](research/T06_UNCERTAINTY.md) |
| T07 | [#18](https://github.com/jaiamin/ass/issues/18) Trace treatment opportunity, delivery and observation | T01 | Accepted after combined-contract review repairs | `a92105f`, `d5568c1` |
| T08 | [#19](https://github.com/jaiamin/ass/issues/19) Give participants source-linked memory, plans and accessible verification | T04 | Integrated and accepted after cutoff receipt repair | `9750caf`, `de5556b`; [evidence](research/T08_PARTICIPANT_CONTEXT.md) |
| T09 | [#20](https://github.com/jaiamin/ass/issues/20) Run a solo evidence-seeking task in a persistent artifact world | T03, T04 | Integrated and accepted after fresh review repairs | `c357a3b`, `4ed18af`, `84867cc`; [report](research/T09_ARTIFACT_WORLD.md) |
| T10 | [#21](https://github.com/jaiamin/ass/issues/21) Observe three-agent coordination with explicit phase and delivery semantics | T07, T09 | Assigned to fresh isolated implementation (18123) | — |
| T11 | [#22](https://github.com/jaiamin/ass/issues/22) Study four-agent reliance and feasible commitment breaches | T10 | Waiting | — |
| T12 | [#23](https://github.com/jaiamin/ass/issues/23) Run a small institutional workflow with atomic work/resource effects | T10 | Waiting | — |
| T13 | [#24](https://github.com/jaiamin/ass/issues/24) Have the Researcher produce a reviewable artifact-world experiment | T05, T09 | Assigned to fresh isolated implementation (18124) | — |
| T14 | [#25](https://github.com/jaiamin/ass/issues/25) Run one explicitly budgeted end-to-end investigation | T06, T13 | Waiting on T13 | — |
| T15 | [#26](https://github.com/jaiamin/ass/issues/26) Compare actual reference policies and participant-harness ablations | T06, T08 | Integrated and accepted after fresh review repair | `fa1c825`, `6e1a7c8`; [report](research/T15_BASELINES.md) |
| T16 | [#27](https://github.com/jaiamin/ass/issues/27) Admit a verified extension as a runnable versioned environment | T02, T09 | Ready; root chooses launch | — |
| T17 | [#28](https://github.com/jaiamin/ass/issues/28) Have the Researcher generate and validate a genuinely new mechanic | T13, T16 | Waiting | — |
| T18 | [#29](https://github.com/jaiamin/ass/issues/29) Inspect a declared fallible adjudication and replay its consequences | T09 | Ready; root chooses launch | — |
| T19 | [#30](https://github.com/jaiamin/ass/issues/30) Assess evidence-supported claims and reanalyze through read-only lenses | T06, T07 | Complete; evidence preserved; assigned to fresh integration review (18222) | Not integrated; source `1d8d977` |
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

Fresh Sol development charges so far: **$0.611632**, 55 known-usage requests.
The session-wide Sol cap is **$10**. The frozen eight-case comparison exposed
real discovery/probe-configuration failures; both are retained and repaired with
API red/green evidence. Both affected live probes passed their finite outcome
checks on the second repair. All paid phases are closed; **$9.388368 remains**.
See [live development](research/SOL_DEVELOPMENT.md) for sources, all retained
failures, narrow successes and limits. No other paid work is allocated.
Implementer agents must remain keyless unless given a specific coordinated trial
allocation. Luna participant trials need an explicit separate allowance; prepare
the concrete manifest and estimate after deterministic qualification. Until
those trials run, the live milestone remains unverified.

## Next actions

1. Publish accepted T15 and this coordination checkpoint to draft PR #32; link
   immediately. Launch fresh T13 implementation in the assigned isolated
   checkout (18124) before handing shared writing ownership to fresh T19 review
   (18222). T10 continues independently on 18123; do not poll running tasks.
2. Fresh T19 review must reconcile exact source `1d8d977` with accepted T15
   controls/effort and T09 artifact exposure/replay. Reverify complete preserved
   evidence, independent claim calculations, unsupported prose/intent status,
   frozen cutoffs and read-only reanalysis. Keep generated caches private and
   force recomputation; earlier outside-cache effects stay unassessed. Only
   root publishes, and no issue closes before the tracker resolves the work.
3. T16/T18 remain Ready; T11/T12 wait on accepted T10, T14 on T13, T17 on
   T13/T16. Retain source worktrees, immutable hardlinked evidence, gzip mappings,
   actual frozen failures and exact source/case attribution. Keep checks bounded
   and archive closed outputs with member verification. Live/held-out gates stay
   unverified; Sol is $0.611632/55 requests with $9.388368 remaining and no active
   allocation; Luna remains unallocated.

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

## T06 fresh integration — accepted

No-ff merge `aaf3a1522b371e68af845243854d581d48d1fc39` accepts clean source
`20c7b020b88f64e153f8138adf59be7691b34f12` onto `ff156745`. Only the progress
row conflicted. T01/T02/T04/T05, both live-discovery repairs/tests and the
authoritative Sol-development/benchmark history remain. No product repair or
substantive blocker; no current-contract aliases, conversion or reset.

Fresh merger observations: **1,007 backend**, **109 frontend**, **42 shared
browser** and **two actual harness** tests pass, plus Ruff/ty/lint/TypeScript/build.
Six independent HTTP cases verify selected versus planned support, missing
arms/repetitions, disjoint/no-eligible support, multiple contrasts, exact complete
finite payoff and unsent-failure/Pause accounting. Captured failed/ready analysis
membership, reasons, metrics and cutoffs survive late retry/Pause/revision and
repeated exports. Fixed seed clusters never certify i.i.d. support; finite bounds
do not identify population intervals. Read the [report](research/T06_UNCERTAINTY.md)
for exact sources, commands, observations and limitations.

Positive schema **5**, activation and export **6**/comparison **1** checks pass.
The frozen T01 after and comparison retain exit **1**, four intentional `export-v4`
failures and terminal flags. All **22 turns / five runs** match exactly in actions,
prompts, schemas, settings, effects, output content and accounting. All **475**
raw export/report differences are retained/classified, zero unexplained. The
fresh after uses a clean tracked-source clone; the before remains attributed
inherited evidence. Production smoke remains inherited from qualified `3f3cf5c`,
with 12 relevant input hashes unchanged; the frontend build is fresh.

All **685 source artifacts / 89,936,683 bytes**, including the 684-file final
manifest itself, are copied without overwrites under ignored
`.tools/research-harness/evidence/T06/`. Source/destination and both child-indexed
hash sets match with stable source HEAD/status/tracked/evidence bytes, reverified
at closure. Copy canonical SHA-256:
`43db2a6e4ae3bc610e4d10d9eec3de2c0d0aced7017c3d5442f5479967702187`.
The child final index canonical SHA-256 is
`ec485f469e554e13b998a0c51de3a53ec2494a2da4ce73b1b8be3f033529a24c`.
Fresh sibling `T06-integration/` retains all 13 check wrappers, logs/source
archives/raw outcomes/oracles and setup failures. Its immutable verification
manifest covers **501 files / 26,133,953 bytes**, canonical SHA-256
`6142ad78f81bc8a7cf5259a9bbc2c7d8cf80b5e8e8924495b4924fbe49b55f59`.
A separate final checkpoint adds the final documentation/source/commit identity.
Source worktree intact; preserve all evidence directories.

The **1,745 indexed live Sol files** and their final manifest remain intact.
Global actual spending stays **$0.611632 / 55 known-usage requests**, with
**$9.388368 remaining** and no active allocation. No paid merger calls; tuned
narrow successes leave live participant, held-out and generalization gates open.
The owned preview and all owned servers on **18217** are closed. `pbcopy` remains
unread/unadded/uncopied/unarchived; stash unchanged. No push, PR/issue operation,
host/security/credential change, other-worktree/process change or source disposal.
Parent retains the single draft PR #32 and publication. T03 is complete and
queued for fresh integration review; T07/T08 are in progress. T15 waits on T08,
T19 on T07, T14 on T13.


## T03 implementation (inherited; acceptance follows)

Ticket branch `t3/add-reusable-environments`, executable checkpoint `a0a0d08`,
includes latest accepted integration `ff1567453cc119824bb4b3c03ceee1d73acdb9fe`.
Library v3 separates mechanics/examples and unbound roles from study commitments;
schema/export v6 pins complete sources. Public API witnesses use two questions
and populations, retain independent rules after library deletion, and replay.
Draft editing identity survives World changes/reload without changing provenance.
No later worlds/harnesses, adapters, resets, paid calls or publication.

Fresh latest-source checks: 1,008 backend, 8 affected browser, 2 actual policy
flows, Ruff/ty and production smoke/containment pass. Full 178-browser suite,
108 frontend tests, lint/types/build passed at `4c5a745`; all frontend inputs
are hash-identical at the later merge. Frozen T01 retains only four intentional
v4-export oracle failures and terminal flags under v6; all 22 recorded turns
and usage match exactly. Failures remain explicit. Read
[T03 report](research/T03_ENVIRONMENTS.md) and preserve all ignored `data/t03/`;
`manifest.json` indexes source/case-stamped evidence and raw failures. Port 18114
is closed and owned containers/image tags are removed. T03 spend $0. Parent owns
fresh acceptance and preservation; this does not mark T03 integrated or T09 ready.

## T03 fresh integration — accepted

No-ff merge `6c290df700547ddf71334ee6472f4c8ed0321328` joins clean ticket HEAD
`c2b8ac15b259302786e6107a0074d93a96e82671` to `ce7e801`. Only a test comment
and three documentation files conflicted. The review found no substantive product
regression requiring a repair. Schema **6**, export **6**, comparison **1** and
library **v3** coexist. T06's frozen membership/calculations/exports, T04 policies/
accounting, T05 copied probes and both live-discovery repairs/tests remain.
Read the [acceptance report](research/T03_ENVIRONMENTS.md) for exact identities,
commands, failures and fresh/inherited attribution.

Fresh on stable merged source: **1,018 backend**, **109 frontend**, **25 affected
browser** and **two actual-harness browser** tests pass; Ruff/ty/lint/TypeScript/
build pass. Four independent HTTP/World witness groups verify different study
commitments, in-flight/pending source retention through library edits/deletion,
privacy/World-enforced roles, exact replay and T06 comparison snapshots through
Pause/new revision/repeated exports. Fresh actual non-root production build,
26-case containment qualification and two-population reuse/export smoke pass.
Manual desktop/light and phone/dark reuse, role rebinding, draft reload and save/
export were verified with zero provider calls. Child full-browser results stay
inherited; the full browser suite was not rerun at integration.

The frozen unchanged T01 after and comparisons retain **exit 1**, four intentional
`export-v4` failures and terminal failed flags. Positive schema-6/export-6/
activation/comparison/hash checks pass. All **22 turns / five runs** match the
preserved clean before in behavior, prompts/schemas/settings and accounting.
All **505 report/export differences** are classified, zero unexplained. The after
executes from a clean tracked-only clone; no `pbcopy` or project `.env` is copied.
No live, held-out, reliability or generalization claim follows.

All **2,251 T03 files / 470,287,451 bytes**, including its 2,250-file manifest,
and **602 symlinks** are preserved without overwrites in ignored
`.tools/research-harness/evidence/T03/`. Every child/source/destination hash and
symlink target matches, reverified at closure. Canonical file-inventory SHA-256:
`e38a459675aacb0d1579f740ea43fb6d7a39edb2ccf9a01b39e46febcf03ecc8`.
The user explicitly authorized opaque handling of only six indexed synthetic
pytest `.env` fixtures; real configuration/credentials remain excluded.
Fresh sibling `T03-integration/verification-manifest.json` covers **936 files /
148,509,827 bytes**, canonical SHA-256
`c200385445805484cce1996424971d77c0ae00a5f90af3533befc453aa89c18a`.
Two freshly generated test configurations remain opaque metadata-only exclusions.
Final checkpoint evidence extends a separate manifest. Keep all artifacts and the
unchanged source worktree. Raw review-utility failures, expected merge conflicts,
early preview failure and all frozen/child failures are retained and explained.

All prior-ticket evidence and **1,745 indexed Sol files** plus their final manifest
are unchanged. Global spend remains **$0.611632 / 55 requests**, **$9.388368
remaining**, no active paid allocation; review spend **$0**. Stash unchanged;
`pbcopy` never read/copied/archived. Port **18214**, owned preview/browser servers
and production container/image tag are closed/removed. No push, PR/issue or other
agent/process/worktree/security changes. Root owns publication and draft PR #32.
T03 is accepted; **T09 is Ready**. **T07/T08 remain running**, unpolled; T15
waits on T08, T19 on T07 and T14 on T13.
