# T14 — bounded investigations

Status: implementation complete; ready for independent root integration review.
This is an implementer handoff, not root acceptance.
Ticket #25; spec `docs/RESEARCH_HARNESS_SPEC.md` and exact T14 ticket body.
Assigned branch `t3/t14-investigation-workflow`, Linux aarch64 Docker Sandbox,
starting clean HEAD `8df6c592c453e0595406711b9fe3387f8c385d26` (accepted
T01–T11/T13/T15/T19, DB9/export10/library6). No descendants or extra checkouts.

## Plan and acceptance

1. Freeze independent DEVELOPMENT oracles, capture tracked source safely, run
   the inherited frozen baseline and retain its expected failures.
2. Vertical HTTP red→green: explicit authorization → grounded design/check →
   immutable pilot/frozen confirmation → existing run writer → read-only
   descriptive evidence. Persist scope, allowances, identities and stop decisions.
3. Enforce each nested request at the existing ledger transaction across
   investigation/study/workspace, including cancellation/unknown usage and races.
4. Preserve attempts and explicit exploratory adaptations. Stop on material
   ambiguity, out-of-scope design or exhausted work/spend; no silent resubmission.
5. Add necessary Agent authorization/progress/pause/cancel/resume controls using
   existing appearance, drafts, remote state, pending-turn and reconnect patterns.
6. Run affected backend/static/types, frontend lint/units/forced clean build,
   browser flows on 18127, inherited regression and positive current-contract
   parity. Record exact inputs, failures and before/after comparison. Integrate
   only a documented accepted frontier; commit and close owned resources.

Acceptance requires all six T14 criteria, supported descriptive outcomes only,
ordinary chat/save with zero participant execution, no weakened checks, complete
attempt retention and clean handoff. Production smoke is required only if runtime
or container inputs change. No paid calls, held-out access or live allocation.

## Frozen DEVELOPMENT questions and independently worked oracles

Frozen before implementation and outputs. Primary seam: real public workflow
HTTP API; approved supplemental World/provider/accounting seams. Providers are
deterministic FunctionModel stand-ins; all real model requests disabled.

* Narrow completion: ask whether a solo actor stops in an artifact workspace.
  One condition, one seed, one round, direct-action Luna, no private source
  disclosure. A literal `stop` decision yields one committed turn and one
  participant request. Design/check calls and read-only analysis each have their
  own reservations. Output links the exact run/cutoff, reports one observed
  trajectory, and withholds population/causal/intelligence certification.
* Ambiguity: a request requiring a consequential missing decision returns a
  clarification. No participant request or turn; retained design attempt and
  visible stop reason. A requested unsupported world remains unsupported.
* Exhaustion: a one-request allowance permits exactly one sent request, then
  refuses the next before send. A parent limit below reservation refuses all
  work without charging any ceiling. Study/workspace contention likewise cannot
  overdraw or send the disallowed request. Concurrent contenders share one cap.
* Failure/unknown/cancellation: block a request at the provider boundary, cancel
  it without a response and retain one unknown charge equal to its reservation,
  zero duplicate sends and the original stop/error. Completed in-flight work
  commits on pause; subsequent work waits. Restart pauses and does not spend;
  an interrupted paid attempt is never silently retried.
* Confirmation: exact immutable protocol, outcomes/comparisons, seeds,
  repetitions, model/harness and stopping decisions are frozen before first
  confirmation request. Later adaptation cannot mutate that revision or freeze.
  Exploratory pilots and failed attempts remain separate evidence.
* Authorization boundary: ordinary general chat, design chat, proposal saving,
  progress reads, reconnect and repeat reads cause zero participant requests.
  A duplicate Investigate submission cannot create a second pending turn/run.
* Scope/privacy: a planner selecting an unapproved model/harness/world or larger
  population/run/turn envelope stops before rollout. Copied probes leave source
  checkpoints/evidence unchanged; actor tools still enforce World permissions.

These are development correctness witnesses, not fresh held-out cases. Frozen
T01 runner/cases/scores stay unchanged: four export-v4 failures/failed flags and
exit1 remain failures. A separate positive current-contract audit must compare
five runs/22 turns/22 identical bounded requests and integer accounting.

## Decisions and constraints

Reuse Planner, Research, Engine, Assistants and LanguageModels. Pydantic AI Sol
Researcher/planner/assistant; model-controlled participants Luna. No provider,
fallback, silent provider retry or replacement. Persist public operations only.
Prefer a narrow complete workflow over speculative autonomous infrastructure.

Every snapshot preflights tracked-only Git selection with invocation-local
exclusions for all `pbcopy` and `.env*` paths. Never inspect/hash/copy protected
clipboard/configuration or execute inherited ignored helpers. Preserve stash,
immutable custody and all old maps. New evidence lives only in ignored
`data/t14/`; retain command/source/case/failure records. Content-key source
archives are deduplicated. Compress only closed owned output losslessly.

Use root's existing uv executable read-only; private venv/node_modules/mutable
caches/build/test data. pnpm immutable store use requires `--frozen-store
--frozen-lockfile` under shared flock. Heavy checks retain the 134217728-byte
floor. Initial measured free space: 278089728 bytes. Request coordination if a
phase cannot fit; never modify others' work, processes, evidence or environment.

## Observations

Initial source/document/tool discovery is recorded in the conversation, before
the evidence wrapper. One broad document read truncated output; subsequent
bounded reads recover relevant contracts. Initial missing private dependency
directories were expected, not product failures. No product check yet claimed.

### Coordination and observed development checks

Initial offline uv sync failed on an uncached ty wheel. Online frozen sync
succeeded with private cache/venv but left less than the floor. First red was
blocked by preflight (exit125). Before the subsequent explicit root slot gate
arrived, own disposable Ruff/ty/uvloop installations and their private cache
entries were removed with uv, recovering sufficient headroom. Red-02 executed
at140554240 free and failed on the absent endpoint (405). Frozen T01 before
executed at139751424 free, exit1 with its four export-v4 failures/failed flags.
These pre-grant executions were disclosed to root with exact timing; they are
not relabeled as post-grant work. The remaining installed venv is preserved.

Root then explicitly granted bounded backend work under flock/floor. Successive
vertical HTTP witnesses are green through slice05: narrow completion/export,
separate request ledger and three-ceiling rollback, in-flight pause/resume,
paused process restoration without resubmission, and exploratory pilot followed
by an immutable pre-trial confirmation freeze (7 cases). Failed green-01 used a
fixture harness version1.0 instead of current1.0.0; corrected fixture, retained
failure. A patch-context attempt failed before mutation. No whole-suite claim.
Root subsequently gave the next heavy slot to T16; no new backend check started.

Each source/case tree has one content-keyed tracked-only inventory/archive,
referenced from attempts. Before/after inventories, commands and raw logs remain.
Starting slice04, tests retain public HTTP JSONL and per-attempt temporary data;
older pytest temporary data used automatic retention and is not claimed complete.
Closed runtime packing initially retained byte hashes and tar metadata; those
early maps do not claim original nanosecond precision. A later early-temp packing
attempt detected an8ns float timestamp difference and deleted nothing. The second
attempt pins integer-ns PAX metadata and verifies hashes/sizes/modes/ns; its map
retains all14 files /9216000 raw bytes in961452 compressed bytes. Both archives
and failure are retained. Future closed-output maps preserve integer ns exactly.

Read-only frontend footprint: lock6097048683788686d8dde275af047a6acc7b10a5e0e37a8f1408fb681f085f58,
555 compatible packages present in immutable pnpm12 store,26940 files/372009564
logical bytes, same filesystem. Metadata lower bound4546560 bytes; requested
48MiB incremental headroom plus the unchanged128MiB floor. Root granted one
install at>=184549376 free. Its actual preflight196431872 passed, but offline
pnpm exited1 on missing private supply-chain metadata for `@exodus/bytes`.
No files imported, policy bypass, store write or payload copy. Store index and
lock hash/size/mtime unchanged;196202496 free afterward. Lock released; all
frontend checks and further backend jobs remain held pending root coordination.

### UI direction and install recovery

Operate mode, narrow incumbent refinement: a researcher authorizes a bounded
question, then inspects immutable revisions, cutoffs, requests, attempts and stop
decisions in Agent. Keep Geist, blue actions, neutral light/graphite dark,
muted foreground/border tokens, compact gaps and existing composer/Message/
Trace/disclosure patterns. The signature remains evidence-linked work with
explicit limits, rather than decorative progress charts or new navigation.
Existing stock Dialog protects focus for the spending authorization; Field/Input,
Checkbox, OptionSelect and Button own behavior. No generated primitive changes.
Use current official Field/Dialog docs; CLI dependency installation was held.
Impeccable context loader had no bundled binary; project DESIGN and craft-floor
were read directly rather than downloading into shared skill state.

The explicitly authorized online install retry retained all policies and used
private XDG metadata cache plus immutable hardlink import. It exited1 with
ENOSPC during final symlink creation, after188727296-byte preflight. Store index
and lock hash/size/mtime remained unchanged;0 bytes free was reported. Both
receipts/logs remain separate. All heavy jobs were stopped/released and root
notified. The original48MiB estimate understated private registry-metadata peak.
Normal `pnpm cache delete '*'` and then `'@*/*'`, with cache path verified under
this checkout, reclaimed only reproducible own metadata. Before inventories,
hashes/modes/ns, HEAD/status, command/results and after receipts are preserved.
Recovery reached167211008 free; source/HEAD/status unchanged. No partial installed
dependencies, venv, source or evidence was deleted. Root cleared SOURCE edits
afterward, while holding all new heavy work/captures/installs/checks.

Measured partial node_modules:26940 regular entries,23403 distinct regular
inodes,358907267 logical/425472000 allocated bytes on those inodes,3354
directories/1472 symlinks;26937 entries have multiple links. These are linked
inode allocations, **not** an isolated incremental overlay-copy cost. No
pre-import store-file inode baseline exists; st_nlink alone never proves a
negligible physical import cost. Next install needs a root-approved peak plan.

### Read-only shared CLI assessment

Root authorized read-only assessment of existing compiler/test entrypoints,
without another install or check. Root HEAD40ef0e59 and child HEAD8df6c592 have
identical committed and working pnpm lock SHA256
`6097048683788686d8dde275af047a6acc7b10a5e0e37a8f1408fb681f085f58` and scripts.
Read-only package/entrypoint comparison found matching imported private payload
versions and CLI bytes: Biome2.6.5, TypeScript7.0.2, Vite8.3.6, Vitest5.1.0 and
Playwright1.65.0. React plugin6.2.1 and Tailwind4.3.4 also match. This compares
toolchain provenance only; it does not qualify the failed installation.
The narrow assessment receipt with entrypoint hashes and exact missing package
names is `data/t14/frontend-shared-cli-assessment.json`; it is not a source snapshot.

Only `react` and `shiki` have direct private dependency links. The other15
runtime dependencies, all14 development dependencies and `.bin` are missing.
Payloads inside the normally imported private `.pnpm` tree do not make those
imports resolvable. No links were made, errors suppressed, root application
imports borrowed or manager policies changed.

After a separate check-slot grant, standalone lint may run from this checkout's
`frontend/` using its unchanged `biome.json`:

```sh
node /home/agent/.t3/worktrees/workspace/t3-fdf9bdeb/frontend/node_modules/@biomejs/biome/bin/biome check
```

The wrapper only locates/spawns the installed platform binary and preserves cwd;
no daemon or cache-changing flags are needed. Any temporary/cache outputs must
remain in this checkout. The corresponding read-only entrypoints below are
version/byte verified, but their checks remain blocked by absent private imports:

```sh
node /home/agent/.t3/worktrees/workspace/t3-fdf9bdeb/frontend/node_modules/typescript/bin/tsc -b
node /home/agent/.t3/worktrees/workspace/t3-fdf9bdeb/frontend/node_modules/vite/bin/vite.js build
node /home/agent/.t3/worktrees/workspace/t3-fdf9bdeb/frontend/node_modules/vitest/vitest.mjs run
node /home/agent/.t3/worktrees/workspace/t3-fdf9bdeb/frontend/node_modules/@playwright/test/cli.js test
```

No check, browser or new full capture was run during this assessment. The next
single lifecycle witness has been written, but remains unexecuted under T16's
heavy-check gate: an interrupted participant request must retain its unknown
reservation across all ceilings; restart pauses, and Resume must stop visibly
without sampling that turn again. Its implementation waits for an observed red.

### Pending source-review decisions

The versioned boundary change requires current-contract assertions to move to
DB10/export11 in backend/frontend fixtures and current architecture/development
docs. These edits preserve the frozen T01 runner/cases/scores and all historical
acceptance reports. Tests still need to execute after their phase is granted.

Exploratory repairs need a separate explicit continuation of a stopped attempt,
bounded by the original immutable scope and remaining spending/work allowances.
Proposed next slice after interrupted-turn recovery: retain the failed run and
revision, accept a public adaptation instruction, design/check a new revision
through the existing planner, and record its origin before rollout. A frozen
confirmation cannot adapt; changed scope requires a new investigation. A user
repair is a new retained attempt, never a provider retry or an overwritten run.
No repair endpoint or implementation is added before its public-flow red.

Other review risks awaiting their individual public witnesses: cancellation
before task entry and while a nested request is blocked; duplicate controls;
independent workspace/study contention and rollback; actual primary provider
failure/unknown usage; ambiguity/out-of-scope and work exhaustion; zero-rollout
ordinary chat/proposal saving; retained failed-attempt statuses and links. UI
qualification remains pending, including control drafts across record changes,
late mutation responses, reconnect, mobile/keyboard and error/loading states.

Root reclaimed only the unused full Chromium guest-tool cache and granted one
normal pnpm import with a356515840-byte floor, retaining headless shell/ffmpeg.
The preparation helper stopped before import because it used the unsupported
`pnpm cache dir` subcommand. This is an own helper error, not an install result;
zero imports ran and flock released. Its exact driver, narrow tracked-only source
inventory (no new full capture), pre-import node/store inventories and failure
receipt/log remain in `checks/frontend-install-recovery`. The helper did not
persist its initial exact free figure before failing; only the passed floor and
543064064-byte after observation are retained. No exact-before value is inferred.
Installed CLI help and a read-only `pnpm cache path` resolve the correct private
cache. The corrected driver records its preflight immediately and uses a new
attempt directory. No automatic retry: root continuation grant is pending.

Root then explicitly granted the guard-only continuation. The single normal
import in `checks/frontend-install-recovery-02` succeeded (exit0): pnpm reported
all555 packages reused, zero downloads, and existing lockfile supply-chain
verification retained with every policy enabled. Under-lock initial free was
540782592 and immediately-before-command537944064, above356515840; observed
minimum/import-after535392256. All31 direct dependencies and seven expected
`.bin` entries exist. Regular entries26940→27053; distinct regular inodes
23403→23516; unique inode allocated bytes425472000→426446848. Existing26937
multi-link entries remain. This does not isolate the first import's overlay cost.

The exact private cache resolved through `pnpm cache path` before import and
before cleanup. This continuation reused the prior lock-policy verification and
had only one750-byte/4096-allocated cache file, rather than the earlier176MB
metadata expansion. Both normal scoped `pnpm cache delete '*'` and `'@*/*'`
returned0; that one file remains. No manual deletion or store/policy change.
Final free after retained receipts/inventories and cleanup532533248. Store index
and lock bytes/size/mode/ns and every store path/mode/size/mtime remained equal;
inode/link metadata is retained separately. Before/after tracked-only source
inventories and inode inventories are compressed generated JSON, with raw
hash/size references; no new full source archive was made. The shared flock
released and root was notified. Backend/frontend/build/browser checks remain
held pending separate staged slots; install completion is not qualification.

Before broader checks, the owned evidence driver was tightened without running
it: it checks the unchanged floor before source archiving and again before the
command; symlink hashes cover link text without following targets. Runtime
packing now detects protected filenames/symlinks before reading bytes and leaves
that entire runtime directory in place if any exist. Synthetic `.env` contents
and hashes remain opaque. Prior driver versions/attempts remain immutable; no
new capture or product result is claimed by this source-only tooling change.

### Continued vertical development

Root released necessary implementation/qualification under the shared flock and
unchanged128MiB floor, including private frozen restoration of declared tools.
Ruff0.17.4, ty0.0.99 and uvloop0.23.0 wheels total28803628 bytes in `uv.lock`;
the restoration forecast96MiB incremental peak required224MiB free. Normal
private-cache `uv sync --frozen` succeeded,476438528→407093248 free, with no new
dependency or shared tool copy. Separate source/case archives remain deduplicated.

Slice06 red showed Resume resampling an interrupted participant request; green
refuses an interrupted/failed uncommitted investigation activation before send,
retaining the unknown charge. Slice07 red showed the cancelled attempt still
labeled checked; green retains its terminal status and verifies all three
ceilings, passive reads, duplicate cancellation and no run resubmission. The
test's initially written `/start` route was corrected to the real `/control`
before green; the failed source remains retained. Slice08's independent primary
provider-failure witness passed on its first execution; it is not labeled red.
Slice09 red405→green adds explicit exploratory adaptation through the existing
planner, within original remaining limits, retaining the failed run/revision and
unknown usage. Slice10 red missing clarification→green exposes the question and
the exact design conversation; no rollout occurs. These are development results,
not root acceptance or live research evidence.

Freeze before the new contention witness: two independent HTTP investigations
compete for a literal$0.60 workspace ceiling while their first scoping provider
requests remain blocked. Each observed reservation must be in($0.30,$0.60],
so one may send and the other must refuse before send. The loser retains zero
parent/study charge and zero requests; the winner's cancellation retains exactly
its one unknown reservation across all three ceilings. The test never reproduces
the reservation formula or enlarges the ceiling on failure. This is a neutral
development enforcement case; its expected conservation rule was frozen above.

Slices11–15 added passing independent scope/contention/ordinary-chat witnesses.
The operation-limit red exposed Planner treating exhaustion as validation feedback;
green propagates the stop. Repair-pause red exposed an old failed run being relabeled
paused; green preserves its failure. Slice16's strengthened cancellation witness
passed on first execution; it did not reproduce a persistent cancelling window.
Slice17's intended red timed out at flock before running. Implementation exposing
the retained cutoff-scoped analysis was applied before that timeout was noticed;
its first executed check passed. This is a recorded TDD chronology error, not an
observed red→green cycle. All lock receipts and failed attempts remain retained.

Next independent nested-request oracle: three100-input/50-output Sol requests
cost2100 microdollars; one Luna request costs35. A four-request parent allowance
therefore retains2135 microdollars across all ceilings, one completed actor read,
zero committed turns and no second actor request. Horizon/population expansion
must stop before participant execution; a one-turn allowance on a multi-turn
protocol commits just its first turn, then stops visibly before the second send.


### Current DEVELOPMENT checkpoint before accepted T16 integration

All24 T14 HTTP cases pass together in `checks/t14-http-aggregate-02` at source
key `dbc68af588a52526ed224cfd48390ca711e3403148050d1eb71e5f80a3174d10`.
This includes independent parent/study/workspace contention, nested participant
requests, cancellation/unknown settlement, restart without resampling, immutable
confirmation, actual pilot feedback and explicit repairs, ambiguity/scope and
work exhaustion, zero-rollout ordinary conversation/saving, fixed authorized Sol
identity and ordinary same-chat followups with retained descriptive caveats.
Three scripted Sol requests plus one Luna read total2135 microdollars across all
ceilings; this is synthetic accounting, not paid spending. Slice19's initial
fixture brief declared one round while its protocol declared two: persisted
evidence showed Planner's existing rejection. Correcting only that fixture left
the frozen scope oracle and product unchanged. Slice17 remains passing
verification with an unobserved-red/TDD sequencing gap; no retroactive red.

Observed additional checks:113 core backend cases,54 design/privacy cases,
8 changed export-contract cases and7 focused ordinary-assistant scope/history
cases in separate bounded jobs. Final full Ruff and ty pass at the24-case source.
Frontend lint and116 units/33 files pass; all their frontend inputs equal the
then-current source. Forced TypeScript and clean Vite build pass after the
fixed-provider availability change. Five new actual-HTTP browser flows pass
together in `browser-aggregate-01`; four existing ordinary-composer lifecycle
flows pass in `browser-composer-regressions-01`. These are DEVELOPMENT checks,
not an uninterrupted backend suite or live research-validity qualification.

The five browser flows cover explicit visible scope and allowances, one accepted
submission/reload, desktop keyboard/Escape focus,390px dark pause/in-flight
commit/resume/reconnect, cancellation/unknown usage, retained failed repair and
draft, confirmation frozen before trial,503 authorization, loading, and late
response isolation from a different chat/draft. Initial mobile fixture grounding
and late-test navigation failures remain. Review of the mobile screenshot exposed
a paused parent still labeled “Thinking.” `browser-paused-label-red` reproduces
it; a neutral Investigation heading and non-animated parent target fix it. The
first green ran the prior built assets and failed; after a clean build,
`browser-paused-label-green-02` passes. Both failures and exact served-build
limitation remain explicit. Final frontend checks after this small change remain.

Own closed-output maps02/03/04 verified decompression, byte hash/size, mode and
integer-ns restoration before removing only closed raw logs/HTTP JSONL. Sources,
unique evidence, failures, original archives and every mapping remain. Preserve
normal private `.tools/t14/uv-cache` (archive payload181217625 logical bytes at
the metadata report time) and `.tools/t14/pnpm-cache/pnpm` with its750-byte
verification entry as coordinated future package-cache resources. No new
consumer or manual dependency-tree reuse is authorized. The installed venv and
node_modules remain private.

Root documented accepted T16 frontier
`b0446d9ea54b2e49fe93fc6d7a2bcdea6341af7b` (code/docs `fde4bce1`) is now
authorized for normal merge. Read its independent integration report and
`55d1a8c` complete-save worker-boundary repair. Next: preserve this coherent
checkpoint, merge only that accepted frontier, resolve current contracts beyond
both independently changed schemas, independently exercise reachable T14 worker
paths, finish frozen T01 after/separate positive parity and final qualification.
No paid/live/held-out work, publication or root acceptance has occurred.

Before new integration outputs, freeze the reachable admitted-world oracle:
public catalog discovery followed by explicit zero-spend authorization must
accept installed `sealed_relay`, retain that scope, and stop at the allowance
without provider sends. A separately authorized one-round/two-actor investigation
must preserve the actual admitted package, lodge for1 credit and release for2,
ending phase2/credits0 after exactly two Luna decisions. The submitter's bounded
request must lack the private reviewer docket. Every real contained worker call
on its design/probe/save/start/step/analysis path must run outside the API loop;
observe the real worker boundary without faking it or asserting private call order.
Cancellation during a worker-backed save must retain the completed immutable
revision/attempt and never begin a participant request. No retry or lost accounting.
Combined contract is DB11/export12/library7; reject historical DB10 explicitly.


### Accepted T16 merge and actual-worker qualification

The normal merge of documented accepted `b0446d9` is resolved in source; the
latest root-documented documentary frontier is now `d276b70` (including published
`375877c`). The combined current contract is **DB11/export12/library7**. DB10 is
explicitly rejected alongside earlier versions; no migration, alias or reset.
Root's later preservation/coordination headers add no application qualification.

The independent admitted-world HTTP oracle first rejected a catalog-listed
`sealed_relay`. Authorization now accepts only typed installed worlds, including
actual saved admissions. Its zero-allowance witness stops with zero requests.
The full relay initially hit the stand-in's response limit; only that fixture's
response allowance was corrected, retaining its failure. It then exposed a real
analysis failure: formatting unavailable financial utility as a number. Utility
now remains null and its descriptive account says unavailable, without inventing
financial outcomes.

Once that failure was repaired, the same complete public workflow exposed real
contained-worker execution on the API loop. Diagnostic traces localize the
remaining start preflight. Existing Assistants/Engine submission methods now
await their read-only preparation through `asyncio.to_thread`; immutable analysis
inputs are still captured before acceptance. A serialized startup boundary and
pending execution stop flag preserve one writer and Pause during validation.
All service callers, including the non-frozen live evaluation caller, now await
submission. Frozen T01 runner/cases/scores are unchanged and were not executed
against live or held-out tasks.

The investigation's entire immutable save/attempt operation runs on the same
thread boundary and is shielded until its commit finishes; cancellation then
stops before participant execution. Its shield was added with the offload before
the cancellation-specific check, so there is no claimed cancellation red for that
code. The subsequent public cancellation witness exposed synchronous export
preflight; complete export and study-exposure operations now use the existing
thread boundary too. Both parameter cases pass: one complete lodge/release relay
ends phase2/credits0 after exactly two Luna decisions, preserves exact admitted
source and reviewer privacy, and replays both turns; cancellation during actual
save retains revision1/its ready run, three completed Sol requests and2100
scripted microdollars across all ceilings, zero Luna sends, repeated cancellation
and a rejected external run start. Every actual observed worker on the tested
save/probe/start/step/analysis/export path remains outside the API loop. No private
call order is asserted and the contained worker is never faked.

Latest source-stamped DEVELOPMENT checks before documentary closure:
`merged-http-lifecycle`63, `merged-analysis-regressions`61 and
`merged-contract-regressions`715 cases all pass in three separate jobs. The last
job includes parametrized World validity checks; these counts are not a whole
backend suite. All27 investigation HTTP cases are in the first job. Full Ruff
and ty pass; their initial import/line-length and synchronous-fixture await errors
remain retained. Frontend lint,116 units/33 files, forced TypeScript and empty-
output Vite build pass. Five post-merge real-HTTP browser flows pass together;
a separate strengthened completion check exposes the small-sample and no-validity-
certification caveats through the existing disclosure and passes without product
changes. Desktop completion/mobile paused captures were visually reviewed.
The five-flow source key is
`f2bad858b59e7b2082325e3cbe47f07cb8f1030d78ad94e7630a93a85036013f`;
the later case-only caveat addition has its own exact source archive. Earlier
four ordinary-composer flows retain their prior-source attribution until the
remaining focused check. All failures and successful attempts remain indexed.

Own closed-output maps05/06 retain actual restoration/hash/size/mode/integer-ns
proof. Root's independent object-packing maintenance preserved every object/ref/
index/HEAD/stash and released staging/commits; it is root evidence, not a T14
product check. Production still requires its unchanged268435456-byte under-lock
preflight. The owned production driver streams the canonical tracked-only source
archive as build context, never a duplicate host tree; it records exact deployed
backend/assets, non-root keyless smoke, and owned resource closure. Frozen T01
after/separate positive parity, that production phase and final closure remain.
No paid calls, held-out access, publication or root acceptance has occurred.

### Final-source production boundary

`production/final-01` passed at clean HEAD `74eaa3c`, including accepted
documentary checkpoint `d276b70`. The canonical tracked-only source key is
`3533412bae284706b72fb67a6339dae227c27bfab0f5b95d8af6b487bf95cb98`;
archive SHA256 `57388146278f9a4ff664fa1adb251f94f1be5555c70c9e14ad753563eadf3a68`.
The source was streamed directly to Docker, with protected-name/header preflight
and no second host context. Under-lock free bytes were279998464 initially and
279994368 before build, both above the unchanged268435456 production floor.
Image `sha256:74e8000c64eae485d43c99c18687b135dd88a8e45174f8023386596fbeb83468`
contains all44 exact backend source files and all53 assets from the private clean
frontend build. The non-root, keyless smoke passed health/SPA/assets, actual worker
containment, independent admission, source pinning, privacy and World restoration/
replay. Engine lifecycle/replay and three-ceiling accounting remain separately
qualified by the matching-source public HTTP witnesses; they are not relabeled
as Engine execution in the production smoke.

Owned container/volume/image teardown each returned0, port18128 was released and
flock released. Final observed free278990848 bytes. Receipt and all build/smoke/
deployed-source/assets/cleanup logs are retained under `data/t14/production/final-01`.
Root received the boundary and can coordinate the next environment; no production
resource is left running. Frozen AFTER, separate current-contract parity, four
focused ordinary-composer regressions and documentary/evidence closure remain.

### Completion evidence and remaining acceptance boundary

All six T14 implementation criteria have DEVELOPMENT witnesses:

| Criterion | Public evidence |
| --- | --- |
| Visible prior authorization and identities | Narrow completion and fixed-Sol HTTP cases retain exact scope, allowances, models/harnesses and decisions; browser authorization shows them before submit. |
| Complete workflow and nested limits | The27 HTTP cases include narrow completion, per-participant-request parent limits, turn exhaustion, three-ceiling rollback and independent workspace contention. Every request retains separate reserve/settle evidence. |
| Retained pilots, failures, repairs and frozen confirmation | HTTP pilot/adaptation and confirmatory-freeze cases, plus browser repair/freeze cases, preserve revisions, failed runs, feedback and the pre-trial decision record. Ambiguity/scope/operation exhaustion stop before unauthorized rollout. |
| Server lifecycle and ordinary composition | HTTP pause/restart/cancel/unknown-usage witnesses and mobile browser lifecycle; ordinary chat/design/save add zero participant work. Four focused post-merge composer browser cases pass in `merged-composer-regressions`. |
| Supported descriptive output | Source-linked cutoff analysis, retained missing/failed-run status, null unavailable utility and explicit small-sample/no-validity-certification disclosures. The separately strengthened browser disclosure case passes. |
| Keyless API/UI and inherited comparison | Segmented63/61/715 backend cases,116 frontend units/33 files, static/types/clean build, five investigation browser flows plus the separate disclosure/composer jobs, source-matched production and separate before/after audits. |

These are separate bounded jobs with exact commands, cases and sources in ignored
`data/t14/`; their counts are never presented as one uninterrupted backend suite.
The latest Ruff job is `final-backend-static`; final frontend lint is
`final-frontend-lint-02`. The preceding lint attempt failed only on formatting the
strengthened caveat assertions; the failure remains and only whitespace changed.
Forced TypeScript is repeated for that added browser assertion; units/build are
reused only where their complete source/configuration inputs remain equal.

Frozen T01 AFTER at source tree
`f549376ca3e33bb32d06fa6ab284cf6b3db62394c40d17c4a4c8970fb2171445`
retains the original four `export-v4` failures, terminal failed flags and exit1.
The unchanged comparator also exits1, with zero regressions and zero improvements.
The after runner's original archive is the canonical archive for content key
`7532d447071276b998b084dff2e32bd61f95344fc4ddf9a4b67498458569c752`;
its SHA256 is `dd9e9d8868f406f3b76734bc83389f47dbcba8f247844b3b522dfd0dfb8cfa15`.
No frozen runner/case/score was edited, and no failed case became passed.

The separate positive current-contract audit `parity/final-02` passes66 checks:
five complete runs,22 turns and22 literally identical complete bounded requests;
2200 input/1100 output tokens,770 scripted microdollars charged and28231 reserved
in each integer ledger. Workspace/study sums agree, with inactive investigation
ownership in these ordinary workflows. Actual paid spending is0.

The first classifier `parity/final-01` remains failed: its54 behavioral/accounting
checks passed but894 differences were unclassified. The retained diagnosis proves
that every full design differs solely by accepted T16's `parameters.relay=null`
default and independently recomputes both recorded design hashes. The explicitly
amended classifier recognizes only that null default, its proven hash pairs and
exact evidence-reference syntax with previously paired application identities;
turn/revision/evidence-kind text must remain equal. It accounts for1724 total
metadata/default differences with zero unexplained differences. This amendment
was made after outputs and is documented as such; it does not change the frozen
behavioral oracle or score, and the initial failure is not retroactively rescored.

Final source qualification is in `data/t14/closure/final-01/qualification.json`;
all-attempt inventory, canonical source/archive references and closed-output
restoration maps are indexed by that directory's manifest. Protected names and
synthetic configuration contents/hashes remain excluded/opaque. Earliest pytest
automatic temporary-data retention and early packing's missing nanosecond proof
remain limitations, rather than invented recovery claims. Slice17's unobserved
red/TDD sequencing gap remains; save shielding has no claimed cancellation red.

Current contracts are DB11/export12/library7, with explicit historical rejection,
no migrations/aliases and no reset performed. The included latest documented
accepted integration is `29af3413c12c8b14f24bc0faae39933fe56e344d` (including
`d276b70a80656094862c304385baedd3752c3ec7`); its application
frontier remains accepted T16. All later T14 repairs require the root's independent
integration review. No paid/live/held-out evaluation, research-validity or
intelligence pass, publication or acceptance is claimed. Preserve private venv/
node_modules and both normal package caches for coordinated manager reuse.
