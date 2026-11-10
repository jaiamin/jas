# T03 reusable environments

Ticket: #14. Branch: `t3/add-reusable-environments`. Starting integration:
`b7e5b1540ff9ccf63761a482a4288eed1ad8be4a`. Implementer only: no delegation,
publication, issue edits, paid requests, data resets or changes to other worktrees.

## Acceptance and plan

- [ ] Store reusable mechanics and named configuration examples independently
  of questions, populations/models/harnesses, conditions, replication and analysis.
- [ ] Preserve optimistic revisions, atomic saves, validation and immutable
  experiment snapshots across library edits/deletion.
- [ ] Update discovery, planner context, editor/review, drafts and export together;
  reject unsupported versions explicitly without conversion or reset code.
- [ ] Public API witness: two different questions/populations share the same
  versioned mechanics, retain their own study commitments, run/replay independently.
- [ ] Independent permission/privacy checks and keyless desktop/light and
  phone/dark reuse lifecycles pass alongside relevant inherited regressions.
- [ ] Merge the latest accepted integration tip, resolve current-contract callers,
  commit coherent checkpoints, preserve evidence and stop owned services.

Approved seams: the public workflow HTTP API; the existing World interface for
independent rules/privacy/replay invariants; existing provider/accounting tests
for inherited settlement/lifecycle coverage. These were approved in the spec and
the task; no additional testing seam is introduced.

## Decisions

- An environment definition names an installed world/rule version and provides
  mechanical configuration examples. Examples declare unbound mechanic roles;
  each experiment supplies the actual participant bindings. Examples exclude
  memory/harness/model choices and researcher prose/commitments.
- Complete source definitions, revisions and content hashes are embedded in
  experiment designs as provenance. The experiment's concrete parameters remain
  authoritative and independently editable; source examples are not live links.
- Explicit experiment templates remain distinct from reusable environment
  definitions. Library reuse starts a neutral experiment with one baseline arm,
  rather than copying the source experiment's question or lineup.
- The new library format will be v3 (T04's pending experiment-shaped format is
  v2). Schema/export v6 reserves a distinct current contract after T04's v5;
  accepted integration will be merged before handoff. Existing world behavior
  and rule versions do not change. No existing data is converted or deleted.
- T09 owns solo/artifact worlds. Existing 2–12 participant constraints remain.
  Researcher: Pydantic AI `openai:gpt-6.1-sol`; model participants:
  `openai:gpt-6-luna`. All evaluation here is keyless, actual spend **$0**.

## Progress and evidence

Initial clean source verified on Linux in the assigned worktree; integration
and HEAD both equal the starting commit. Local uv 0.13.7 installed under ignored
`.tools/uv` using the documented page-size workaround; frozen Python and frontend
dependency installs passed without lockfile changes.

Before behavior changes: `data/t03/before/` retains the complete source archive,
case/harness/runtime manifests, all API operations, designs and exports for the
unchanged T01 DEVELOPMENT v1 suite. Six cases passed; 22 scripted requests,
98 HTTP operations, source stable, actual spend $0. Separate source-stamped
before-check archives/logs are in `before-backend/`, `before-frontend/`,
`before-build/` and `before-browser/`. Setup/doc lookup logs are in `setup/`.

Next: vertical API red/green slices, UI reuse/draft behavior, independent
invariants, current-integration reconciliation, final paired evidence and checks.
All failed attempts will remain in ignored `data/t03/`; a final manifest will
index commands, exits, source/case hashes and artifact digests.

Checkpoint progress: API red/green slices 01 (definition storage), 02 (two
independent experiments and immutable sources), 03 (extraction/catalog/neutral
selection) passed. `backend-focused-03/` passes 63 current API/library/export/DB/
baseline checks; `environment-invariants-01/` passes eight new cases, including
two populations executing 16 scripted turns with exact replay after library
deletion, hidden-stock/schema parity, role permissions, failed storage and racing
optimistic edits. No model requests are sent to paid providers.

`ui-01-red/` fails specifically on the obsolete full-design save payload;
`ui-01-green/` passes both desktop/light and phone/dark lifecycles. The expanded
`browser-affected-01/` records 18 passes, four intentional template-to-mechanics
link expectation failures, and one mobile test-level timeout. Trace inspection
shows navigation/fill delays consumed its cumulative 30 seconds before the stale
update click; that long lifecycle now has a 60-second budget. Assertions remain
unchanged. The URL expectations now require the explicit environment selection.
All failed reports/traces remain. An incomplete independent-action fixture was
also repaired to reach actual World permission checks; no production rules changed.

The unchanged T01 runner's `export-v4` oracle intentionally fails under v6.
Current API/export tests positively assert v6; baseline tests explicitly retain
the v4 failures and require every other check to pass. No frozen case/harness
bytes were edited. Final paired reports will retain the failures rather than
silently changing their oracle.

Implementation checkpoint: `121a9595a7334872a6aae9a9772401814e3a9902`.
The accepted integration merge includes `48600d2982516210e6a4e28528d2e1c6f1fd155e`
(T04) and `39491def73da7334164ca6d98896eaa03a2e5bf5` (T05 acceptance).
Resolution preserves both harness implementations, activation accounting/evidence,
researcher operations and both tickets' documentation/handoffs, while keeping
T03's v3 library and v6 schema/export contract. Current API/policy/browser export
assertions require v6; old v1/v2 library files and schema 4/5 remain explicit
rejections. No aliases, conversion or data-reset code was introduced.

Merge checkpoint: `15eebc25724bd7ba4b5fe2c3ad33d39183528f04`.
All **110** integrated API/library/export/database/baseline/participant/Researcher
checks pass (`integrated-focused-01/`). One final integration seam was exercised
with a fourth red/green slice: the Researcher's real capabilities operation lacked
reusable definitions. It now returns the same built-in/custom mechanics snapshots
and source hashes, capped at 12 custom records, with independent study commitments
explicit. The activity view links custom sources to the existing reuse workflow.
`tdd-04-red/` retains the absent-discovery failure; `tdd-04-green/` passes all 24
Researcher/reuse checks. A supplemental API case proves applying mechanics
preserves each arm's direct/tool harness, model assignment and memory, and that
extraction collapses harness-only differences into one mechanics example.

Remaining: final clean-source before/after comparison, full backend/frontend/browser
checks, the inherited two-policy browser trial, rendered-capture review, manifest,
latest integration ancestry check and service shutdown verification.
