# Interface scope and verification

[DESIGN.md](../DESIGN.md) owns tokens and interaction rules. The interface follows
compact records with adjacent evidence, informed by Laminar trace/table views and the
user-supplied Clay reference: neutral surfaces, pale blue selection and a framed composer.

## Route and task inventory

| Route | Task | Important states |
| --- | --- | --- |
| `/` → `/studies` | Open saved work | Empty workspace, redirect |
| `/studies` | Search/filter experiments, recover drafts | Loading, error/retry, empty, filtered empty, pagination |
| `/agent` | General questions, selected evidence analysis, reviewed creation and proposals | Inner chat history, per-message context, pending, failure/retry, proposal review, provider unavailable |
| `/design` | Compatible redirect to Agent creation | Retried question preserved |
| `/new` | Configure a protocol or generate with Agent | Question, agents, conditions, execution, JSON, template, proposal review/return, new revision, recovered draft, save error, disabled limits |
| `/studies/:id` | Read results, run matrix, protocol and revisions | Ready, executing, paused, complete, failed, historical revision, no eligible results |
| `/runs` | Find runs and select 2–4 to compare | Filters, pagination, selection across filters, selection cap |
| `/runs/:id` | Inspect environment, decisions, interactions, record | Initial checkpoint, running/pause, pinned turn, evidence loading/error, no interactions, annotations, replay, request trace |
| `/compare?runs=…` | Compare outcomes and history | Fewer than two, 2–4 selections, incompatible worlds, missing measurements, query failure |
| `/environments` | Choose one of seven supported rule systems | Loading/error, each template and its measurements |
| `/settings` | Check providers, budgets, usage, storage | Key configured/missing, unknown usage; deployment config is read-only |
| Experiment/run + `assistant=1` or `tab=research` | Compatible redirect to full Agent | Selected record preserved; no docked panel |
| Unknown route | Recover navigation | Not-found state and link to experiments |

## Preserved contracts

Saving never starts execution. Old revisions and runs remain immutable. Pause finishes
an in-flight turn. Replay uses recorded actions without model requests. Export includes
all revisions and evidence. Conditions, seeds and repetitions identify each run. Model
self-report remains distinct from recorded observations and enforced consequences.
There are no account, RBAC or upload APIs: the UI does not invent these permissions.
Missing provider configuration and browser storage failure are explicit capability states.

## Shared patterns

Application shell and breadcrumbs; page heading/actions; compact filter/table/footer;
page tabs; structured fields and disclosures; revision/run identity; status with text;
loading/error/empty feedback; linked turn controls and evidence; anchored AI composer.

## Verification

The keyless [Playwright suite](../frontend/e2e) covers these routes in light/dark themes
and desktop/mobile layouts, including Agent streaming, context retry, draft recovery,
nested edits, revision navigation, evidence focus/return and turn-bound observations.
Backend tests exercise real streaming adapters and accounting with controlled providers.
See [development commands](../README.md#development) and [HANDOFF](../HANDOFF.md) for the
latest observed checks. Historical screenshots remain under `screenshots/` and in Git.

These checks use Chromium and controlled model responses. They do not claim paid-provider
validation, a full screen-reader audit, production deployment or human calibration.
