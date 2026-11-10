# Whole-product quality review

This review is in progress. It accompanies the user's request to finish JAS,
simplify its interface, review frontend and backend, benchmark actual behavior,
and leave a fresh workspace running on port 8080. The accepted application base
is `40c32ff6`, including independently accepted bounded T12. T17 and T18 remain
separate, unaccepted implementations; their live and final-product gates stay open.

## Method and scope

Use the installed Ponytail audit and Impeccable workflows alongside the existing
JAS design system. Desloppify is not installed; no Desloppify score is claimed.
Expected load is one local user, 1–12 active experiment participants, bounded
provider concurrency and independent concurrent runs. This is not a public,
authenticated multi-user service.

Review the actual public workflows, persistence, provider accounting and worker
boundaries. Prefer concrete failing cases and small fixes over scanner-score
changes or new abstractions. Existing immutable revisions, exact replay,
private observations, explicit spending and one current contract remain binding.
The historical raw evidence was retired with user authorization; use the fresh
current-contract qualification gate in the compact report.

## Navigation audit correction

**The first diagnosis overstated a product defect.** Isolated Run and Experiment
tests reproduced pending controls carrying into a second record, but omitted the
actual workspace shell. `WorkspaceShell` already keys its content and error
boundary by `location.pathname`, remounting each record page. That existing
behavior isolates controls and late errors in the application.

Commit `dd48bf31` added two redundant mutation keys on the strength of those
incomplete fixtures. They are removed. The two new tests now render through the
actual `WorkspaceProvider` and `WorkspaceShell` route, retain delayed requests
and late-error assertions, and check the existing protection without a product
repair. The isolated failures remain recorded as test results; they are not
whole-app red→green evidence.

The initial run fixture also lacked ResizeObserver. A later TypeScript check
rejected an unsupported test-query option, and lint caught its whitespace.
Those failures remain recorded with the corrected diagnosis.

Current records: `.tools/research-harness/current/control-*`,
`record-control-navigation-*` and `experiment-control-navigation-*`. These are
fresh source-stamped checks, not historical before/after evidence.

Before this correction, all 118 frontend units across 33 files, lint over 228
files, forced TypeScript and an empty-output-directory Vite build passed. These
results apply to the redundant-key source. The keyless browser check used
fresh API-created records, delayed control responses and client-side history
navigation. Both the 390px run and 1440px experiment views retained enabled
controls on the second record and excluded the first record's late error. Both
used the app's explicit dark setting; changing the browser's preferred theme
did not replace that saved setting. No console errors or document-width overflow
were observed. This browser result did not establish a pre-existing defect:
the original shell already supplied the tested isolation. The owned tab/service
are closed and the lock released.

Corrected-source qualification passes 13 focused Run/Experiment/shell tests,
lint over 228 files, forced TypeScript and a fresh empty-output-directory Vite
build. Each check recorded unchanged source
`2eff28ca345239dedc5f09b9c4ca6a43acc5d73560546df19a573faa2d39a6a7`.
Rendered checks pass at 390px/light for Run and 1440px/dark for Experiment:
the first control is held pending, client-side navigation opens the second
record with enabled controls, and the old late error stays absent. No console
errors or document overflow were observed. These verify existing shell behavior.
Records are `current/control-shell-*`. The owned tab and server are closed.
The supervisor's plain post-shutdown bind check failed on the recently closed
TCP port; a separate listener check and reuse-address bind passed. That helper
failure is retained and does not change the browser result.

## Experiment overview hierarchy

The default Overview now leads with results, an active-run state or the honest
"No results yet" state. Full comparison, uncertainty, effort and exposure remain
available in a stock, initially closed **Comparison & evidence** disclosure.
The main Run/Pause action stays in the heading. This is an intentional usability
refinement, not a red→green bug claim.

At unchanged source
`43d7dac4b94a890bf7d838001e6596dea5f7e2b84969717734b479fbe6999582`,
all 118 frontend units/33 files, lint228, forced TypeScript and clean Vite build
pass. Four uncertainty browser cases cover390/1440px and both themes, including
keyboard access, missingness, effects, export and immutable revisions. Two
reference-policy and three exposure browser cases pass with their original
behavior assertions retained. Manual default-view inspection passes at1440px
light and390px dark: the primary action and empty state are visible, disclosures
start closed, no console errors or mobile document overflow are observed.
These use a fresh keyless workspace; no provider calls occurred. The owned
tab/server18228 are closed, port reuse is verified and flock is released.
Records are `current/study-overview-*`.

## Analysis acceptance cutoff race

The backend witness uses the already approved public HTTP seam with real
Engine/storage and keyless scripted providers. It schedules exposure capture
after an analysis accepts turn1 but after the next separately requested step
commits turn2. Predeclared outcome: the analysis cutoff, exposure through-turn,
evidence index and lens stay at1; the later activation/request stays outside
that frozen membership. The run itself reaches2 with exactly two participant
requests (200input/100output tokens,70 synthetic microdollars). Export retains
the same analysis snapshot. A scheduling barrier calls the real public exposure
reader unchanged; it supplies no synthetic database or exposure results. This
first execution failed: the accepted cutoff was1 but exposure through-turn was2.
The retained red is `current/analysis-capture-red-01`, source98146146.

The repair always carries the accepted cutoff into the exposure reader. Current
capture still includes in-flight input when that cutoff is current; historical
capture excludes later activations. The same concurrency witness then passes.
A second public HTTP case passes on first observation: a participant request
already in flight is retained as unknown delivery, and later settlement leaves
the accepted analysis/export snapshot unchanged. It is a preservation check,
not a second repaired defect. Persisted/export contracts are unchanged.

After formatting,31 claim-support cases and68 exposure/context/assistant cases
pass in two segmented jobs, together with affected Ruff and global ty. These99
cases include both new HTTP witnesses. Each recorded unchanged source
`31ee798ac87a91a342925d75e7a9a391cc66c5963c6303d7eb6f1f5ef563680a`.
Records are `current/analysis-capture-*`; actual spending is zero. No global
atomic-snapshot or complete-repository verdict follows from this narrow fix.

## Pre-integration runtime measurements

The first native HTTP benchmark passed at source
`1c44e1f9fe8acb82b70a1de8cafafde73799864984080708cfc4bcb640908d22`
(accepted application0527e737 plus the staged benchmark/plan). Its independently
declared workloads completed4/24 turns with2/12 participants, zero provider
requests/charges, matching activation counts, exact replay and complete export.
The keyless server exited on the requested SIGTERM(-15); port reuse passed.
Affected Ruff and explicit benchmark ty pass. This is a local platform baseline, before remaining
ticket integration, with no model latency or competence claim.

On Linux/aarch64, Python3.13.5 and4 reported CPUs, observed completion wall times
were26.60/133.03ms. The20 warm Run reads had p95=2.36/6.19ms and response sizes
25,086/191,488bytes; the larger case's maximum was34.22ms. Experiment-read p95
was2.23/2.99ms. Replay took1.33/7.58ms; export10.39/19.08ms. Peak server RSS was
136,496KiB, and the final SQLite file851,968bytes. These are small sequential
samples in a shared VM; no latency target or concurrency capacity is inferred.
Raw samples and cleanup/source receipts are in
`current/runtime-baseline-01/`. Repeat the same workload on final combined source.

## Active-run export consistency — oracle frozen before first output

The public HTTP seam will request export after one committed Commons turn. A
scheduling barrier delays the real initial-evidence reader after export has read
its turn rows; a separately authorized public Step commits turn2 before that
reader continues. No Engine, database or returned evidence is substituted.
The export may choose either observed turn boundary, but its study/run summaries,
state, evidence, activations, exposure and per-request ledger must agree with
that one boundary. The real run must still reach2 with exactly2 requests,
200/100 tokens and70 synthetic microdollars, and replay must add0 calls.
First execution failed at the intended invariant: the run record reported2,
while evidence contained only0/1. A connection-bound read transaction now scopes
export assembly, with its session factory held in a context local to that call;
ordinary concurrent writers retain their own sessions. The same HTTP case passes.
SQLite's explicit BEGIN and SQLAlchemy's rollback-only session join behavior
follow the [SQLite dialect](https://docs.sqlalchemy.org/en/20/dialects/sqlite.html)
and [Session API](https://docs.sqlalchemy.org/en/20/orm/session_api.html)
documentation (both official GET200). No schema/export meaning changes.

Before its first output, a separate preservation case is frozen: export begins
while the second participant request is pending, then the actual response settles
before assembly finishes. The captured summary/state/requests, pending status and
reserved cost must remain exactly those observed before capture; the real run
reaches2/70 synthetic microdollars and a later export sees the new boundary.
Its first execution preserved all captured state/requests but failed a test's
binary floating-point sum equality (0.0030009999999999998 versus0.003001).
The same cost oracle is now expressed in integer microdollars, matching the
ledger contract; no production change followed that test-authoring failure.
This is not another claimed repair. Broader snapshot behavior remains unqualified
until the affected checks pass.

The user also reported four separate suspected issues: shared artifact exposure,
tool-harness execution usage, infeasible commitment classification and assignment
provenance after an artifact read. All four independently reproduced at the actual
public/World seams and were repaired after their intended failures, as recorded
below. They do not establish a complete-product verdict.

The first new oracle strengthens the existing public artifact-tool delivery case:
before starting its real Engine activation, freeze the literal immutable
revision1 source and assignment. After a successful pure read and actual bounded
provider input, the complete assignment must remain equal, and its source must
still resolve to that revision's design hash. The artifact-read opportunity must
keep its separate operation/result citation. This test precedes any provenance
repair; compacted and unknown-delivery variants use the same invariant.
The intended public red was observed at `current/artifact-provenance-red-03`:
the assignment source became `/activations/.../operations/number=1/result`
while the design hash stayed unchanged. Naming the revision citation separately
from per-read citations repairs the report assembly without changing stored data.
All three real delivery/compaction/unknown variants pass at source
`a654eda08d7c3e79e38a48bf6cf22c0c74346ec3087809a9184dcf58a05e04bf`.
The distinct read opportunity still links to its actual operation. The earlier
two preflights exited125 before pytest while reserving T18's setup headroom;
neither is counted as a product red.

Next independent public oracle, frozen before output: one real tool-harness
activation performs observe/rules/legal-options/decide with four separately
settled Luna requests,400/200 tokens and140 synthetic microdollars. A Researcher
question must receive those exact execution totals in its provider-bound index.
A second question must still see four participant requests, excluding both
Researcher analyses. Its own analysis ledger remains separately accounted.
This reproduced zero execution requests/tokens/cost despite the real four-request
ledger. The participant-purpose filter now includes both `decision` and
`participant_operation`. The same public case passes at
`f23d82ce304c1fceb0f8a12b8c1e727f0aed16fa9ff9365aa4bdbb985dfecbc2`:
two separate Researcher questions each see4/400/200/140µ while workspace accounting
records all six actual requests and replay adds none.

The next independent World oracle uses four declared sequential actors, all
waiting after an initial promise at0 and recipient reliance at1. The promisor's
only subsequent slots are4 and8. Window[5,6) must resolve infeasible, with no
fulfillment opportunity and no eligible breach. Literal controls freeze
[4,5)→opportunity4, [5,8)→infeasible, [8,9)→opportunity8, and the exclusive
boundary[0,4)→infeasible. Classification must survive JSON checkpoint restoration
and exact action replay. Existing withdrawal and early-horizon cases remain
separate controls. This precedes any reliance-rule edit.
The [5,6) witness reproduced `absent_opportunity` with actual slots0/4. Checking
the bounded declared cadence repairs it; the five literal slot cases and five
inherited null/withdrawal controls pass at676bd667. Rule1.0.1 explicitly rejects
1.0.0 checkpoints for replay/resume.

A preservation oracle is frozen before its output: for window[7,8), reliance at1
followed by withdrawals at2/3/5 changes actual promisor slots to0/4/6/7. Although
the promise-time schedule forecast was infeasible, the real opportunity at7 must
govern settlement: a share fulfills, a wait breaches, and either is eligible after
reliance. Both remain distinct from the original fixed-schedule impossible case.
Both preservation variants failed on the first repair: actual opportunity7 was
recorded but a wait stayed infeasible and fulfillment stayed ineligible. Settlement
now treats actual slots as stronger evidence than the initial schedule forecast.
The original five literal cases, both changed-cadence variants, five existing
null/withdrawal cases and early-horizon control pass13 cases at1c37d094. The
initial repair failures remain retained, rather than described as another
pre-existing product defect. Rule1.0.1 contains the complete correction.

The next public HTTP oracle freezes a three-actor phased coordination run. One
actor writes the shared artifact in phase1; all three actual phase2 prompts
contain its literal content in their authorized artifact history. Exposure must
report three eligible and three confirmed recipients, while the phase1 cutoff
has zero delivered recipients. ACL-restricted and memory-none variants retain
respectively two and one delivered recipients, and private local-value artifacts
must stay outside teammates' input. Exact replay must add no requests.
All three cases reproduced the undercount (including the separate no-memory
eligibility denominator). Capture now asks each World to locate content in the
already authorized actor projection. Report eligibility includes explicit shared
artifact ACLs and exact cutoff-scoped read grants, while actual input bindings and
provider response receipts still establish delivery. All three cases pass at
63af529c, including frozen cutoffs, export equality and zero-call replay.

Before its first output, an additional public preservation case freezes a private
artifact write at tick1, a promise at4 and recipient reliance/read grant at5. The
newly authorized promisor's actual tick8 prompt must receive the old write, while
the two outsiders do not. Historical cutoff5 retains only the original owner as
eligible; cutoff6 adds the grantee but only the owner's actual input; cutoff9
confirms both. This qualifies grants and their cutoff query, not a second defect.
That grant case passes atc861f705. End-to-end producer review found the analogous
shared workflow-metadata path, so a further public oracle is frozen: a claims
draft work in phase1; a/b/c/d are its declared workers/handoff recipients and all
four phase2 prompts contain owner=a. e/f have no draft-work projection. Claim
exposure must have four eligible/confirmed recipients after12 turns, with no
delivered inputs at cutoff6, unchanged resource8/spent0 and zero-call replay.
This checks the same visibility defect outside shared artifact contents.

The workflow case reproduced one recipient instead of four at48a9a696. Eligibility
now includes declared work participants for claim/delegation/readiness/handoff
metadata; the actual authorized projection and bounded input still determine
delivery. That workflow case, the cutoff-grant preservation case and the three
shared-artifact variants pass5 cases at5a7f4642. Ruff then formatted only the new
event-kind set; whole backend/benchmarks/scripts Ruff and globalty pass at60c85fa5.

## Affected correctness qualification

The following jobs ran without provider-network access or paid requests. Their
source hashes and full commands are in their separate `current/<job>/result.json`.
No unchanged suite is counted twice in the figures below.

| Job | Observed result | Attribution |
| --- | --- | --- |
| `quality-reliance-01` | 58 pass | Full reliance suite at60c85fa5; rule1.0.1, exact restoration/replay, schedule and withdrawal controls. |
| `quality-ledger-harness-01` | 54 pass,1 fail,8 deselected | Test fixture omitted required nullable artifact-read field for workflow; no product repair. |
| `quality-ledger-harness-02` | 55 pass,8 deselected | Scripted responses follow the actual declared schema. Participant/Researcher cutoff accounting, unknown usage, cancellation, restart and privacy controls pass at2b004c8e. |
| `quality-persistence-01` | 39 pass,1 fail | DB, export and Engine controls pass; stale workflow expected12 turns despite the explicit six-participant stop policy. |
| `quality-workflow-and-export-01` | 45 pass | Full claim-support and independent workflow suites plus corrected literal six-turn adapter case at1456579e. Includes both concurrent-export witnesses and pending-reservation preservation. |
| `quality-artifact-exposure-01` | 13 pass | Earlier56a0190e source before the workflow-metadata extension; provenance, ACLs, grants, delivery and replay. |
| `quality-exposure-privacy-01` | 21 pass | Earlier56a0190e privacy/message/sanction/memory/cutoff/unknown/cancellation/export controls. Its resource forecast overrun is separately disclosed in the compact report. |
| `workflow-shared-owner-green-01` | 5 pass,9 deselected | Latest targeted shared-artifact/grant/workflow coverage, unchanged5a7f4642. |

The two generic test corrections change neither production behavior nor their
accounting/identity/replay assertions. The missing-read response is generated from
the public provider-tool schema rather than an environment-name allowlist. The
six-turn expectation is the independent literal population/stop-policy result.
Earlier failures, including initial resource preflights and the first schedule
repair's preservation failures, remain failures. Final normal hooks and source
closure follow these checks. Frontend/complete-product, remaining ticket and final
runtime/benchmark gates are still open.

## Untrusted Markdown image navigation — frozen oracle before output

The installed react-markdown10.1.0 official README documents the `components`
mapping, `img` src/alt props and default URL filtering. JAS currently overrides
links but uses the default image renderer. Before any image-renderer repair, two
literal public component cases require that a generated remote tracking URL and
a same-origin API URL create no image/iframe/object/embed. Each must instead be
an explicitly named, keyboard-operable image link that opens separately with
noopener/noreferrer. Raw HTML and executable-URL filtering must remain intact.
This is a source concern until its first actual failing observation; a DOM test
does not itself establish browser-network behavior. Browser verification follows
the focused component result using an intercepted remote URL with zero real
external requests.

Both intended cases failed at27ccad9b because ordinary Markdown produced an img
with the literal URL. The minimal component override makes images explicit links
while retaining the library's URL filtering. All5 component cases pass at0229a115,
including javascript/data URL negatives. Affected Biome, forced TypeScript and
an isolated empty-output Vite build pass at the same source; the broader Agent
component selection passes16 cases/5 files atc6d734d6. Impeccable's mechanical
detector returns no findings for the two changed files.

The first browser entry stopped125 before execution at398,831,616<402,653,184.
After documented scratch retirement, the distinct second entry admitted at
402,731,008 bytes and passed with source unchangedc6d734d6. It served a clearly
labeled, seeded Analysis row through the real keyless HTTP app and WorkspaceShell;
it is not generated model output or a competence witness. Desktop/light inspection
at1280 and1440 and phone/dark at390 show the expected links with no document
overflow or console errors. Native keyboard Tab moves between the links with a
visible focus outline. Full browser resource entries and the server log contain
zero requests for either the remote image URL or same-origin audit-image path;
the conversation has no img/iframe/object/embed. The SQLite provider ledger has
zero rows. Both links preserve the frozen target/rel attributes and ordinary
references remain usable. No external image was clicked or requested.

The owned Uvicorn process exited-15 with completed lifespan and reusable18231;
the shared lock is released. The preview host ignored window.close and exposes
no close tool, so its owned tab was navigated to about:blank to detach polling.
The report claims server closure, not physical closure of that host tab. Current
records are `current/markdown-*` and browser-proof.json; screenshots are referenced
by their original browser-tool paths. These checks qualify this small renderer
change; the combined T17/T18 and final UI/runtime/benchmark gates remain open.

## Final platform benchmark v2 — manifest frozen, unrun

The original two cases are repeated with their original2/12 participants,2
rounds,seed7 and declared commons_half_v1 non-model policy. A third independently
declared case uses12 participants,20 rounds,240 turns. Each must finish complete,
retain exactly one activation per turn, export241 evidence boundaries for the
larger case, replay all turns exactly and make0 provider requests/charges. The
original20 warm sequential health/run/experiment reads remain; the larger case
then makes20 more requests per endpoint through4 concurrent workers, measuring
the interference between those ordinary inspection requests. It adds no arbitrary
latency pass threshold or model-competence score.

This manifest and benchmark source precede any larger-case output. Final execution
waits for the combined accepted application; forecast64MiB incremental disk and
16MiB retained output under the ordinary floor/flock. Source-stamped results will
report p50/p95/max, actual samples/response sizes, completion/replay/export times,
server RSS/high-water memory and database size. A single local VM sample cannot
establish capacity, provider latency or live scientific usefulness. No fresh
benchmark outcome is claimed here.

## Remaining review

- Browser verification of the remaining ticket workflows and both app themes.
- Independent integration reviews for T12, T17 and T18.
- Full Agent, manual experiment, browsing and interaction-viewing usability pass
  on desktop/mobile and both themes.
- Final provider/accounting/privacy/replay and containment review on combined
  source, followed by meaningful current-source measurements.
- Compact final verdict, obsolete-data cleanup and verified port-8080 launch.

No complete-repository, live-competence or final-production verdict is claimed
at this intermediate boundary.
