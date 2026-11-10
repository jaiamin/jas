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
- [ ] Public-API red/green: independent admission and fail-closed review.
- [ ] Pin admitted package/capabilities/proof in normal library/design/run workflow.
- [ ] Independent World/privacy/resource/termination/restore/replay qualification.
- [ ] Existing UI review/use/inspection with mobile/theme/keyboard/browser checks.
- [ ] Static/backend/frontend/build and actual non-root production smoke/containment.
- [ ] Frozen T01 exit1/four export-v4 failures preserved; separate five-run/22-turn
      current-contract parity, with every difference retained/classified.
- [ ] Merge latest **documented accepted** integration, reconcile actual version
      meanings (T10 DB8/export9/library5 remains provisional), qualify final source.
- [ ] Coherent scanned commits, raw member-verified source archives/inventories,
      failures retained, clean branch and closed owned services/browser18125.

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
