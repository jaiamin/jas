# JAS handoff

## CI follow-up: planning activity animation

PR #36 at be738b8 passed backend/container/workflows; frontend retained 186/187 browser
passes. Its sole failure was the light planning-stage case reopening draft notes
after reload. The hosted trace shows the nested click 42 ms after the outer opening
click, while its 200 ms height animation was clipping the child; the notes trigger
stayed aria-expanded=false. Polling retained the notes payload throughout.
The original case passed locally in both themes; a slow-animation attempt and
three CPU-throttled light runs also passed, so no local reproduction is claimed.
The test now waits for actual collapsible animations to finish and checks the nested
trigger opens before asserting the unchanged note content. No timeout increase,
product change, paid call or 8080 refresh. All 7 streaming browser cases pass against
the existing qualified build; logs and original hosted artifact remain under
`.tools/export-download/ci-*`. Frontend lint (247 files) and forced types also pass.
Hosted CI on the new checkpoint remains the final gate.

## Active: portable evidence and large analysis contexts

User explicitly rejected archived/compressed downloads. Gzip implementation07b0abc1
was fully reverted at01685360; it is not the delivery. Downloads stay plain JSON,
using lossless shared-values-v1 references plus an overview/reading guide. The Agent
frozen-analysis download uses the same representation without widening its cutoffs. Expanded
export19 remains the API representation; no study importer or persisted version change.
All unique evidence is retained. New code lives in shared_json.py and analysis_context.py.

Diagnosed actual stopped analyses76993ce6 (40runs) and a3782028 (24runs), both failing
before provider dispatch. Read-only frozen snapshots now fit in~87KB/~68KB versus
~193KB/~180KB detailed prompts, without altering frozen output or user data. A genuine
120run regression observed the same input-limit RED, then GREEN with late-run index,
calculation and exact-turn inspection. Input/budget limits are unchanged. Whole frozen
evidence remains accessible; oversized data is explicitly not_in_context, and unread
turns cannot become citations. Additional path selection stays within captured cutoffs.

Qualification complete:170 scoped backend cases PASS, then2 page/path cases PASS
at final504fd141 after completing experiment_checks retrieval and slim calculation
pages. All7 plain-JSON browser cases PASS, whole Ruff/ty/lint, forcedTS/private and
public builds PASS. Old8 affected UI unit passes retain their earlier attribution.
Final read-only frozen-context02 reconfirms both user scopes fit; no provider calls.

App8080 safely refreshed at exact504fd141:2studies/64runs/10chats, same database
inode/all rows/usage. Actual24run download50,030,684→16,438,681 bytes (67.1% smaller),
plain application/json, no archive. Full independent resolution is byte-for-byte
identical to expanded export19 (SHA4de1e98973e43ba3ef24d4c9f22b2dcdcf15ec6f7a28febe6ab5e862b7241a89).
Native total response3.21s: representation reduces saved-file/context duplication;
it does not claim faster generation or that all evidence fits a model context.
Original failed analyses remain FAILED with zero provider requests; never retried.
Final frozen-download extension:80 affected backend cases and11 browser cases PASS
(7 experiment +4 frozen analysis, phone/desktop and light/dark). A run advancing
after analysis does not change downloaded frozen inputs. Shared representation helper
now serves both download kinds; ordinary API responses remain expanded.
Native frozen-record verification exposed dictionary ordering loss (values equal,
bytes unequal); failed measurement and focused RED retained. Hashing now respects
field order. Final136 affected backend cases and11 browser cases PASS on that source;
native frozen-record readback02 now PASS:4,442,846→2,336,286 bytes (47.4% smaller),
byte-exact restoration SHAe46af32d70931849388a3021416f415adb6c2b2d62b0c3218dd510aa1bfee831.
Both downloads stay plain JSON; study byte-exact restoration still PASS.
Final guarded8080 refresh at8644adb2 preserves every row/inode/usage;2studies/64runs/10chats.
Frozen-context03 again fits both stopped snapshots with zero calls. Final served assets
are the qualified final-dist bytes; current136 backend/11 browser qualification is retained.
Evidence `.tools/export-download/` preserves gzip/revert/adverse attempts. No new
paid calls. Remaining: documentary seal and branch publication/hosted CI. App8080
stays running; all owned test browsers/services are closed.

ROOT owns `feat/research-quality`, based on `5f2523e58c7a851482f6a1ed3c2590eaa01696c4`.
The ten recommendations, acceptance criteria, methods and source-specific results
are in [the plan](docs/research/RESEARCH_QUALITY_PLAN.md).

## Implemented

Versioned executable analysis plans, separate scientific diagnostics, provider-free
findings, matched value scenarios, actor-only local-value control, checked planned
calculations, explicit inference/missingness, unavailable-mechanic disclosures,
opt-in event waiting/bounded caches and completion UX. Export19; DB15/library10
and World transition versions unchanged. No migrations, resets or legacy aliases.
Saved revisions invalidate editor/list/run caches. Analysis wire sharing preserves
exact repeated values and literal marker-shaped evidence. Scientific control
values follow the actual actor-only policy, ACL order and horizon.

## Verified boundary

Full backend1883 PASS; after formatting and one test-only type assertion, affected27
PASS. Whole Ruff/ty, frontend168 units, affected9 editor recheck, lint247, forced
TS and private build PASS. Broad browser184/187 followed by all7 affected repaired/
new-flow cases PASS; do not claim a fresh187/187 rerun. Two independent initial
reviews found real wire/diagnostic defects, now fixed. Fresh Standards/Spec recheck PASS at f6ffa4fe; the sole stale control-list doc finding is fixed.

Sixteen actual Sol/Luna matched trajectories completed with export and zero-call
replay. Two new post-implementation cases were frozen before outputs, run once
and manually scored; both passed, as did the old sensitive interpretation retest.
Those cases are not a hidden general-intelligence benchmark. The joint-regret task
exposes conflicting individual incentives; no messages were sent, so delayed-mail
receipt and event-wait savings were not demonstrated. Prose remains unassessed by
the platform even when structured numbers check.

The one restored live ledger settles102 requests/$1.638735, partial=false, against
the user's aggregate$20 authorization. Stages01/02 retain FAILED interpretations;
stage03 repairs them. Live04's three responses completed, but its recorder FAILED
by incorrectly expecting study-wide charged cost to stay fixed after paid analysis.
Separate offline verification proves unchanged16 run rows and all committed
participant evidence,8 new research-only calls and exact ledger deltas. Offline02
passes export19/findings and8 zero-call replays; offline01's strict-host400 setup
failure remains retained. No paid retry, provider substitution or limit increase.
All live resources are closed and port18145 reusable.

Native keyless runtime4/24/240turns/replay/export PASS. The largest run completed
in3.00s, with mixed-read health p95 3.93ms/run285.72ms/experiment143.05ms and peak
RSS318432KiB. This excludes provider time; no reliable before/after speedup claim.
Default concurrency remains3 independent runs/4 provider calls. Runtime18147 closed.
Browser18146/tab closed; all closed-own DB gzip maps verified. Evidence stays in
`.tools/research-quality/`. No outside-checkout cleanup or user data deletion.

## Preserve existing app and pilot

The app8080 uses `data/jas.sqlite3`; read fresh identity from
`.tools/final/live/server.json`. Never retry/mutate original study
`0c1f6370d8e841a4`. Its read-only audit remains in `.tools/run-audit/`.
Guarded refresh completed at f6ffa4fe:64 runs/8 chats/2 studies, every persisted
row, database inode and usage unchanged. App8080 now uses the verified backend and
clean production build. Read-only desktop1280/phone390 original-study checks show
findings without console errors or horizontal overflow; owned tab closed. App8080
stays running as requested. All test ports18145/18146/18147 are reusable. Final-state02
proves served assets equal qualified bytes and production ASTs equal the live freeze;
private build's14 historical unserved chunks explain retained final-state01 failure.
Do not rerun refresh-8080.py: its output directory already exists; future refreshes
require fresh identity/idle guards and a distinct receipt.

## Closing work

Implementation, normal-hook checkpoints, fresh Standards/Spec reviews and safe
idle8080 refresh are complete. Delivery is one draft PR from this task branch;
hosted CI is the remaining merge gate. Accepted main a2609feb was normally merged
at c759fd5f; all seven conflicts were retained and the resulting full tree is
identical to reviewed closure936cd9aa. Receipt: main-integration-conflicts-01. No merge, main push or history rewrite. Use existing
`.venv/bin/python -B`/Ruff/ty: uv crashes here. pnpm12.18 frozen dependencies are
already installed without package/lock changes. Keep one writer and use
`.tools/research-harness/checks.lock` for bounded jobs. No active paid work remains.

Hosted CI follow-up: first container job built/booted and passed containment, then
failed smoke.py's stale export18 expectation. Actual public HTTP red→green proves
current export19; expectation corrected, zero calls, script Ruff PASS. No app code
changed or new8080 refresh needed. Updated hosted CI remains pending.
