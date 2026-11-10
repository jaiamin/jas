# Whole-product code and interface review

Review complete for bounded local deterministic DEVELOPMENT. This report covers
actual frontend/backend seams, expected single-user1–12-participant workloads,
privacy/accounting/replay and the final app interface. It does not establish
live model competence, judgment accuracy, public-service capacity or human validity.
The final verdict and source-attributed checks are in
[FINAL_PRODUCT_REVIEW.md](FINAL_PRODUCT_REVIEW.md).

## Findings and repairs

| Finding | Observable failure and final behavior |
| --- | --- |
| Shared artifact exposure | Authorized teammates' observed content was filtered before delivery checks. Actual observations now count, with private/cutoff negatives retained. |
| Tool participant usage | Researcher execution totals counted only decision calls. Participant-operation requests now count; adjudication remains a separate component and analysis calls stay excluded. |
| Impossible commitment classification | A promise window between scheduled actor turns was treated as feasible. Feasibility now uses future scheduled slots and the exclusive deadline; rule1.0.1 rejects earlier checkpoints. |
| Assignment provenance | Pure artifact reads replaced the assignment revision citation. The immutable revision and operation receipt now keep distinct links. |
| Analysis acceptance cutoff | A later turn leaked into accepted exposure membership. Readers now carry the accepted cutoff, including the separately checked in-flight membership. |
| Export snapshot | A real turn committed between export readers, producing inconsistent evidence/state. Export assembly uses one explicit connection-bound read snapshot. |
| Inspection responsiveness/consistency | Run reads blocked the request loop and could mix two commits. A sync worker constructs JSON within one read snapshot; queries defer only unused large payloads. |
| Generation restart | Interrupted directory publication, temporary events and journal/operation reconciliation stranded startup or operations. Atomic publication, unique temporary names and idempotent terminal reconciliation repair the observed crash boundaries. |
| Untrusted Markdown images | Model-authored image URLs could trigger unsolicited fetches. Image rendering is rejected while ordinary safe Markdown remains usable. |
| Dark link contrast | Small blue text measured3.38:1. Shared links now use the existing accent foreground token in both themes. |
| Slider naming | An unsupported root label was used. The accessible label now belongs to the actual slider Thumb. |
| Image build input | Frontend full typechecking lacked its imported frozen backend fixture. The exact fixture is now an explicit frontend build-stage input, absent from the final runtime image. |

Meaningful public HTTP/World/concurrency/crash cases observed the intended
failures before their production repairs. The minimal query optimization was
measured, rather than inferred from code size. No cache, retry or alternative
contract was added. Existing loading/error/empty/reconnect/cancel and privacy
boundaries remain covered by scoped checks and actual-shell/browser flows.

## Interface and architecture

Experiment Overview leads with progress/results and one primary action; complete
comparison/evidence remains in a closed disclosure. Agent preserves drafts and
late-response identity through the real workspace shell. Custom protocols remain
editable before saving. Finite inspection uses stock disclosure/table controls;
generation requires an explicit reviewed contract/allowance. Adjudication declares
identity/configuration/scope/prices before Run/Step, with raw and enforced results
separate. Saved recording playback performs GET-only checkpoint selection and
stops on manual selection, errors, hiding and navigation.

One current contract replaces the old readable-rule/partial-export branches:
DB15/export18/library10/definition2/research-operation2/generation-event-v2.
Inspection, evidence, exposure, study, export, execution and replay reject
incompatible rule versions even for completed runs; saved evidence/accounting
remain unchanged. Superseded literal oracle files and the T12-only smoke helper
were deleted. The current generator exactly reproduces the independently frozen
matrix's unchanged literal runs under the current envelope.

World settlement remains separate from HTTP, providers and persistence. Remote
UI state remains in TanStack Query; stock controls/tokens own presentation.
Immutable revisions, append-only evidence and atomically reserved provider costs
remain the core boundaries. Native/production checks enforce non-root execution,
keyless qualification and process-local executable containment authority.

## Corrections and verification limits

The initial navigation diagnosis used isolated page fixtures and overstated a
product bug. The actual keyed WorkspaceShell already isolated pending controls;
redundant mutation keys were removed and real-shell/browser checks verify that
existing protection. The composer geometry test initially sampled before its
async provider notice; it now waits for the actual notice before the same exact
geometry assertions. Repeated320/1440px observations pass without a product repair.

All169 frontend units, lint, forced TypeScript and build pass. All182 unique
default browser cases have passing observations across the full181-pass/1-fail
run and16 focused passes after a stale11-versus12 catalogue assertion correction.
Dedicated rendered phone/desktop and light/dark checks cover the combined flows;
settled phone/dark axe reports0 violations/0 incomplete. The final six-file
Impeccable scan reports0 findings but cannot establish rendered TSX contrast.
Desloppify is not installed; no scanner health score is claimed.

Selected final backend100 cases pass, plus a separate13-case generation
group with overlap and source attribution. Full Ruff and global ty pass. Fresh non-root image and native
restart/requalification pass. Numerical measurements include every v2 attempt;
concurrent run-read p95 remains slightly slower than the original, while health
responsiveness and memory improve. This is a shared-VM finite sample.

Frozen T01 is unchanged and remains FAIL/exit1 for exactly four export-v4 checks.
Fresh5/22/22 current-contract qualification is separate. Recorder/helper/test
failures and output overruns remain in the compact manifest; retired raw records
are not claimed available. No uninterrupted full backend suite or live/held-out
model evaluation is claimed.
