# T16 / #27: bounded extension admission

Assigned branch `t3/t16-extension-admission`, worktree `t3-653eb2ec`.
Starting HEAD exactly `8158fccc01382b61d9efd3589d975119a6e7b8e2` (accepted
T01–T09, T15, T19). Linux aarch64 Docker Sandbox; no descendants or extra
checkout. No publication, provider work, held-out access, credential or host changes.
Raw command/source/case/failure records belong to ignored `data/t16/`.

## Frozen DEVELOPMENT specification and oracles (before implementation)

This is an independently specified finite mechanics fixture, **sealed relay v1**.
It is not generated intelligence, a held-out task, or arbitrary-program verification.
Only this installed independent admission profile is supported. Candidate prose,
examples, provenance and self-tests cannot change its acceptance rules. Other
semantics must remain unsupported. The explicit candidate remains core WAT with
the existing sole `step(i32)->i32` export; no runner extension is needed.

Two explicitly bound participants are submitter (slot0) and reviewer (slot1), in
that fixed logical order, independent of provider speed, profile role prose or seed.
Phase0 is sealed, phase1 lodged, phase2 released (successful terminal), phase3 stopped.
Initial state is phase0 with three action credits. Operations are lodge=0,
release=1, wait=2, stop=3. Lodge costs1, requires phase0 and submitter, and moves
to phase1. Release costs2, requires phase1 and reviewer, and moves to phase2.
Wait costs1 and retains phase. Stop costs1 and moves to phase3. Insufficient
credits, a terminal phase, another actor or operation is rejected atomically.
Zero credits or the experiment horizon ends unsuccessfully unless phase2.
Every accepted operation advances the normal actor/round position once.

The guest receives only `(((phase*4+credits)*2+slot)*4+operation)` in 0..127.
It returns `next_phase*4+remaining_credits`, or -1 for rejection. Trusted mediation
checks actor, exact action schema, permission, expected consequence and resource
conservation **again** before committing. Guest output is a proposal. The guest
receives no names, objects, private docket, notes, history, database or credentials.
For out-of-domain inputs (-1,128,2147483647,-2147483648), require -1.

Independent admission enumerates all128 finite inputs against this specification,
checks guards/projection, fresh-instance repetition and complete World checkpoint
restoration/recorded-action replay, and requires current real containment checks
for access denial, fuel/memory/table/stack/input/output/CPU/wall/cleanup limits.
Admission evidence pins specification, checks, runner, exact WAT bytes and compiled
Wasm hash/version/capabilities. Compilation remains solely in the bounded worker.
The same scoped path executes normal runs and replay; no in-process eval/exec.

Worked acceptance: submitter lodge (0,3 ->1,2), reviewer release (1,2 ->2,0),
one terminal relay_success=1; total two turns. Wait/wait/lodge consumes3 and ends
phase1 unsuccessfully; stop ends unsuccessfully; reviewer lodge and submitter
release are denied without changing state, note, resource or evidence.
Reviewer-only docket `counterseal-17` must be absent from submitter observation,
schema, tools, history, memory, errors and restored projections. Changing it to
`counterseal-91` must leave all submitter views byte-identical. Role-label changes
cannot grant access. Researcher inspection/export explicitly retain full evidence.

Public vertical witness: qualify -> review candidate -> independently admit ->
save reusable mechanics -> bind to design -> review/check -> save immutable
revision -> explicit keyless provider run -> inspect actual observations/events/
accounting -> export -> call-free consequence replay -> restart/restoration.
Delete/edit library and review records after pinning a pending run: its package,
rules, provenance, checkpoint and later replay remain unchanged. Local qualification
is revoked on restart/source/worker failure; blocked execution cannot silently
fall back. Failed/unsupported reviews remain immutable and inspectable.

Supplemental public seams (already authorized): World, isolated process and
provider/accounting. Only the external provider/process boundary may be replaced
for deterministic failure injection. Independent expected values are literals or
this frozen specification, never copied candidate self-tests.

## Acceptance and durable plan

- [x] Verify assigned OS/path/clean branch and accepted ancestry; read skills/spec.
- [x] Freeze independent fixture, acceptance/privacy/replay oracles before code.
- [x] Public-API red/green: independent admission and fail-closed review.
- [x] Pin admitted package/capabilities/proof in normal library/design/run workflow.
- [x] Independent World/privacy/resource/termination/restore/replay qualification.
- [x] Existing UI review/use/inspection with mobile/theme/keyboard/browser checks.
- [x] Static/backend/frontend/build and actual non-root production smoke/containment.
- [x] Frozen T01 exit1/four export-v4 failures preserved; separate five-run/22-turn
      current-contract parity, with every difference retained/classified.
- [x] Merge **documented accepted** integration `f9e87c2`, reconcile T10
      DB8/export9/library5 with T16 DB9/export10/library6; recheck before handoff.
- [ ] Coherent scanned commits, raw member-verified source archives/inventories,
      failures retained, clean branch and closed owned services/browser18125.

Continuation at7383c13 records the public admission-ordering red before repair:
`admission-guard-red` exits1; a nonexistent admission ID returns200 and six actual
isolated worker calls during draft preflight. Draft review now checks the real
admission before any executable witness, including create/revise, planner review
and probes of untrusted proposals. Existing immutable revisions retain their
self-contained package/runtime checks, including after review-sidecar loss.
The writer/saving transaction remains on its existing owning loop. No World,
worker, capability, package, rule or version semantics change in this repair.
The next same-eight-case green exits0 (60.38s), including sidecar-loss execution
and replay. Ruff/ty also pass. Subsequent assertions add genuine sidecar-loss
draft/create/revise rejection, and the production smoke exercises these same
HTTP boundaries in the actual non-root server; these await final qualification.

New captures use ignored `safe_check.py` v2: tracked-only regular source paths,
protected clipboard/environment/credential path rejection and a durable selection
proof **before source content reads**, explicit tracked diffs and member-byte
verification. Older source captures remain unchanged and lack this pre-read
proof; their later archive-member audits are separately attributed. No protected
clipboard file or unrelated untracked artifact is selected or read.

## Decisions and progress

Initial accepted contracts DB7/export8/capture1/comparison1/library4/tool2.0/direct1.0.
Preserve T19 structured-only/prose-unassessed/cutoff/billing716a44b, actual zero-call
T15 controls/effort6e1a7c8, T09 ACL/exposure/replay4ed18af/84867cc and T07/T08 repairs.
Choose only necessary version changes after tracing persisted meanings. No aliases,
adapters, migrations or resets. Immutable extension provenance must be self-contained;
later edits/deletion cannot authorize, change or invalidate pinned content.

Disk started342MiB free. Use private mutable tooling/caches; large jobs serialize
with `/home/agent/.t3/worktrees/workspace/t3-fdf9bdeb/.tools/research-harness/checks.lock`.
Archive only closed own synthetic outputs with per-member byte proofs. Record all
commands/exits and exact keyed source snapshots/diffs. Do not modify historical
T01 runner/cases/scores or inspect the final held-out generation task.


### Implementation checkpoint (before full final qualification)

The first commit `76b11a8` froze the independent fixture and seams. Public API reds
retain missing admission405 and unsupported relay422, then passing vertical checks.
The bounded worker still exposes only import-free `step(i32)->i32`; its successful
response additionally identifies exact compiled Wasm bytes. No new imports, host
interfaces, dependency, provider, authority or universal extension framework was added.

Admission separately enumerates132 independent inputs twice from264 fresh instances,
then runs literal actual World guards, private projection/schema invariance, resource,
unsuccessful stop/horizon and complete restoration/event/measurement replay witnesses.
World mediation rejects unauthorized actor/actions or a false guest consequence before
any state/note/history mutation. The same existing Engine, participant harnesses,
immutable source/revision, evidence/export and replay paths consume the admitted package.
Only new saves require the original admission record; pinned runs use their own exact
package and current local qualification. Library edit/deletion is explicitly tested.

At pre-merge implementation snapshot `375a1dd`, serialized meanings were
**DB8/export9/library5**: admitted package/provenance
in reusable definitions and revisions, new relay action/checkpoint forms and explicit
relay parameters. Capture1/comparison1/tool2.0/direct1.0 retain accepted meanings.
Older workspaces/library files reject explicitly, with no migration, adapter or reset.
T10 was then unaccepted and absent from this snapshot. The accepted T10
reconciliation below supersedes those provisional version numbers. Source identities
keep these historical results separate from final combined qualification.

`scoped-world` passes **8** public workflows: independent admission vs weak self-tests,
normal save/run/evidence/export/call-free replay after library edit/deletion, restart
blocking and exact pinned evidence, unsupported/forged proof, Pause/one-writer, actual
actor-scoped tools, denied tools and false worker consequence. A false result commits
no turn/event/measurement/note; its completed synthetic request remains accounted for.
The pause red found synchronous guest work blocking the API; transitions now run off
the loop, with in-flight final response committed once. The restart red found absent
execution-blocking metadata; run inspection now explains current local permission.
`lifecycle-current` retained **16 pass/one intentional red**; `lifecycle-green` passed5
before the extra scoped witnesses. The four memory-mode admission witness now uses the
actual vocabulary none/notes/history/episodic (an intermediate qualifier misspelled
history; that earlier passing source is not the final four-mode qualification).

`browser-ready` passes **7** flows: new public admission/save/review/create/run/Record
replay in light1280/dark390 plus5 inherited candidate/draft/late-response/error flows.
Rendered screenshots were inspected; no overflow or page errors in the two new flows.
A prior browser red found the editor ignored `?step=review` and fixed that real path;
the second red corrected test navigation through the existing Runs tab. All traces
remain in member-verified `closed/browser-*-results.tar.gz`; these are retained failures.
Static Ruff/ty and frontend lint/build pass at their recorded sources. The changed-UI
detector reports no regex findings and explicitly did not run parsed DOM/contrast rules.
Full backend/frontend/browser regressions, final source and real production qualification
remain pending; no all-green full-suite or production claim is made here yet.

Other retained failures include initial Python annotation shadowing, missing contract/
package checks, an incorrect test response-shape assumption, two lock-wait cancellations,
dependency-install ENOSPC, intermediate type/static errors and an ENOSPC lifecycle batch
(3 failures/14 setup errors). Evidence records every wrapped attempt's actual exit and
source stability; cancelled/unstable sources are never counted as qualification.
No paid/live participant, generation, adjudication or held-out evaluation has run.


### Accepted T10 reconciliation (after initial qualification)

The latest documented accepted integration advanced to `f9e87c2` during T16. Its
HANDOFF explicitly accepts T01–T10/T15/T19 after fresh review of `04e30a5`, merge
`02879c3` and T19 repair `7aec3f5`. Only this documented accepted integration is
merged; no provisional T13/T17/T18 source is included. The first merge returned
exit1 with13 ordinary additive conflicts; raw before/conflicted source is retained.
Both World branches, action unions, population/bindings, replay receipts and UI
views are retained, with no shared engine duplication.

T10's accepted DB8/export9/library5 now has a real persisted meaning. T16's added
package/relay forms therefore advance the combined current contract atomically
to **DB9/export10/library6**. Capture1/comparison1/tool2.0/direct1.0 and existing
World rule versions keep their meanings. Public compatibility reds prove that
DB8 and library5 were previously accepted; the green must reject them without
mutation or migration. Prior DB8/export9/library5 results above identify the
pre-reconciliation snapshot only. All final executable checks are repeated after
this merge. The production smoke's direct Decision fixture now explicitly supplies
its required nullable forecast, found during self-review before running that smoke.


The accepted-source complete browser attempt ran184 flows:182 passed, two inherited
copy/delete controls failed because the new relay trial's four synthetic requests
preceded their workspace-wide zero-call oracle (expected0, observed4). The oracle
is preserved unchanged. The relay is moved to `extension-admission.trial.ts` with
`playwright.extension.config.ts`, following existing dedicated harness/coordination
fixtures. It declares the deterministic provider explicitly and owns a fresh keyless
workspace; normal browser discovery excludes it. Actual production smoke's first
preflight attempt also failed before creating a container: ordinary TCP TIME_WAIT
made a default bind report address-in-use after the browser server closed. A bounded
connect check now rejects an actual active listener; Docker still owns bind safety.
Both failures and original helper versions remain in raw evidence.


### Observed combined qualification; resource coordination in progress

Application/build source `832ff9a` / inventory
`8becb84a8403ae12d39464017d8b807d6c5942ce348bec4f3357fca22f04650b`
passes frontend lint214 files,112 unit tests/30 files, fresh TypeScript/Vite and
normal Docker builds, and actual non-root production smoke/containment. Production
UID/GID10001/Wasmtime50.0.1 verifies95 deployed source/assets against host inputs,
26 real boundary witnesses, independent admission/save/pin/export10 and literal
World/restoration/replay with zero provider creation/requests. Full deterministic
Engine/provider/API/browser witnesses are separately attributed, not represented
as production live-provider work. Complete backend coverage at byte-equivalent
merged application source `e9511286` is1,398 distinct passing/43 files in eight
sequential batches, zero failures/errors/skips; this is segmented coverage.

The accepted-source main browser attempt retains184 executions/182 passes/two
zero-call control failures. The unchanged controls now pass2/2 in their own fresh
workspace. The isolated extension trial passes2/2, coordination5/5, and the resumed
harness11/11. This is composite qualification. Reference/context/claim browser
reruns remain pending during root's temporary disk/I/O hold; reference preflight
retains exit1 at122,380,288 free bytes, before any dependency restore/browser test.
Only our inactive tooling is parked, member/link/mode verified, and removed from
expanded form; all owned services/browser18125 are closed. Bounded job restoration
uses private TMPDIR/caches and parks unchanged tooling between jobs. No package
store/config, other environment, root custody or security setting was changed.

Final-source frozen runner/comparator preserve expected exit1, four export-v4
failures and four terminal failed flags, zero regressions/improvements; all33
benchmark files remain byte-identical. The separately attributed positive check
compares fresh832ff9a with retained accepted T10 `7aec3f5` evidence (not rerun):
five runs/22 turns/22 synthetic requests, exact bounded inputs/consequences/
checkpoints and integer-ledger accounting,98 HTTP operations each,1,949 differences
classified and zero unexplained. Earlier375a1dd→T19 parity remains historical.
`fixture-byte-equivalence.json` proves frozen oracles unchanged since76b11a8 and
identical1,512-byte WAT from the first pre-implementation public red through
backend/browser/actual production. A custody helper initially assumed the WAT was
committed with the prose specification; that failed command is retained. The
specification was frozen first and the artifact captured as untracked source in
the first public red, then committed with375a1dd; no oracle/artifact was retuned.

Self-review additionally strengthens the existing public vertical test to remove
its documented synthetic review/admission sidecars before starting a pinned run,
while rejecting a new save without its original admission record. This test-only
addition has valid syntax but **is not yet executed**; application source is
unchanged. Remaining work: execute that eight-case module/static check and the
three browser batches after resource recovery, recheck documented accepted
integration, then finalize source equivalence, all archive/case/check indexes,
manifest, tracked HANDOFF and normal scanned commit. T16 remains unaccepted and
unintegrated; no paid/live generation/adjudication or held-out trial has run.


A further source review finds that untrusted draft preflight reaches the isolated
World runner before checking its package against an actual immutable admission
record; save itself already rejects the forged package afterward. Containment
and per-step consequences remain bounded/checked, but this admission ordering
needs a public regression and guard before draft preflight. The existing forged-
package test now requires zero worker calls for library save, draft preflight and
study creation with a nonexistent admission ID and otherwise coherent hashes.
This red is written but not executed during the resource hold; no application
implementation has changed yet. Preserve trusted pinned reads/replay when original
review records disappear. After the red/guard/green, requalify final application
source and refresh backend/static, frontend attribution, browser, production and
frozen/positive parity evidence; earlier source results remain separately retained.


The continuation merges only published documented accepted `eb9c29a9490480a241489ec353abea3f64baa15a`. It adds HANDOFF/progress custody documentation only; the initial HANDOFF conflict and resolution are retained. No T11/T13 provisional tip is merged. Accepted DB8/export9/library5 retain their coordination meanings; the combined T16 DB9/export10/library6 remain provisional. This draft guard repair changes no persisted contract or isolated capability.


### Accepted T13 frontier reconciliation (continuation)

Root now documents T13 accepted at `32a1247e286ee2d58ee105d5aeb7640222a619e2`
(DB8/export9/library5). Only that exact documented accepted frontier is merged;
T11 remains absent/unaccepted. Its copied-candidate probes execute before planner
preflight, so the draft admission guard must also cover this newly accepted
CandidateSource. Frozen additional DEVELOPMENT ordering oracle before this
integration repair: a genuine saved relay source whose original synthetic
admission sidecars disappear must not authorize a new copied-candidate probe.
Through public chat/review with a deterministic Sol boundary stand-in selecting
that existing artifact, require no worker execution, no saved study and a visible
failed/rejected proposal. This is package selection, not T17 code generation.
Pinned runs/replay must remain sidecar-independent. Existing finite fixture,
privacy/consequence/resource/termination/restoration oracles remain unchanged.

Before this frontier merge, source079efe / key82f6afdb passed all1,398 backend
cases in eight segments, final static,59 fresh browser cases in seven bounded
workspaces, preserved frozen four failures/exit1 and positive five-run/22-turn
parity (1,953 classified differences/zero unexplained). Initial direct-file frozen
invocation fails import before cases; its normal module invocation repairs only
that harness setup. All commands/failures and closed-output byte proofs remain.
These are pre-T13 results. T13 changes frontend inputs, so the final combined
frontend requires a new build and affected qualification; old assets/results are
retained with their exact older source. No additional persisted meaning is added
by T13, so combined T16 DB9/export10/library6 remain genuine and provisional.

- [ ] Public copied-candidate red/guard/green on the accepted T13 combination.
- [ ] Qualify combined backend/static/frontend/build/browser/production and
      untouched frozen plus independent positive parity; finish custody/closure.
