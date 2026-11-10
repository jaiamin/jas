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
| Admission containment | Worker/cleanup failures left qualification enabled. Admission now revokes it, including scratch allocation/teardown exceptions, and retains failed records until explicit fresh qualification. |
| Navigation disconnects | A disconnected asset request became a middleware server error. The same origin/header guard now forwards ASGI messages directly, preserving ordinary response and disconnect lifecycles. |
| Last-reply spacing | A late provider notice shrank the viewport after scrolling ended. Initial question anchoring now precedes following viewport changes; manual upward scrolling remains independent. |
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

## Cleanup and verification

The user-requested cleanup removes49 superseded planning/research/report files,
an unused breadcrumb module and an unused compact-screen hook. Application and
test imports, static dynamic-import targets, configuration references and literal
symbol references were checked before module deletion. No computed dynamic
imports were found. Test setup/helpers remain in use and are retained. A Python
source/reference scan found no unreferenced top-level or private helper candidates;
that scan alone is not a proof that every Python branch is necessary.

Current guides link to one compact historical summary. Stale export numbers,
old readable-rule guidance, obsolete hook instructions and completed-task holds
were removed. The accepted specification, current arithmetic oracle, benchmark
cases/declarations/results and functional regressions remain intact. No provider,
automatic action, browser error state or meaningful defensive check was removed.

The complete repair qualification passes1831 backend tests,169 frontend units,
182 default browser cases and20 affected opt-in trials, with lint/types/build.
Cleanup-specific checks and exact source/bundle attribution are recorded in the
[verification record](MERGE_READINESS_VERIFICATION.json). Hosted CI must qualify
the published cleanup revision before merge readiness.
The final follow-up passes51 API/lifecycle cases,169 units,51 affected browser
cases and eight controlled scrolling repetitions, with static checks/build.
Independent Standards and Spec reviews pass; two remaining stale export labels
found by review were corrected. Current guides have116 valid local links/anchors.

No live/held-out model evaluation or fresh numerical runtime benchmark was run
by cleanup. Frozen T01's four export-v4 failures and prior adverse attempts remain
in the compact history. No scanner health score or exhaustive dead-code claim
is made; Desloppify was not installed for this pass.
