# Interface scope and verification

Primary reference: Laminar product screens inspected on 2026-11-07 in its
[trace documentation](https://laminar.sh/docs/platform/viewing-traces) and
[table documentation](https://laminar.sh/docs/platform/table-views). Public screenshots
showed its actual trace tree, adjacent span inspector, compact tables and control bars.
No authenticated Laminar session was available or required. Its marketing page was not
used as the application layout. The user's supplied Clay application screenshot now guides the visual treatment: white
sidebar, fine group dividers, pale blue active rows, Inter typography, a neutral canvas
and a softly framed composer. The approved 22px lowercase Bricolage wordmark remains.
`DESIGN.md` owns the resulting design system.

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

## Verification record

Verified on 2026-11-07. The normal application on port 8080 loads its configured database
and available provider credentials. It has no demo mode or seeded results. Visual review
made no model requests and did not modify user experiments or conversations.

| Verified view / state | Coverage |
| --- | --- |
| Experiments and runs | Empty/populated lists, filters/reset, pagination, selection and comparison |
| Experiment details | Results, run matrix, protocol, revision selection and tuning |
| Protocol editor | Question, agents, conditions, execution, JSON; validation, templates, save, draft recovery and proposal handoff |
| Run evidence | Journal remains intact; turn slider, selected inspector, adjacent desktop and stacked mobile layouts; focus and return |
| Observations and record | Notes remain attached to their turn during polling/navigation; saved notes/export and exact 24-turn replay verified during the redesign |
| Environment and interactions | Initial state, history, empty interaction network; seven rule systems covered by API/browser tests |
| Comparison | Two-to-four runs, aligned outcomes, distinct line patterns and matching legends in both themes |
| Agent | Independent histories/reload, context popup, bottom composer, four middle suggestions, scoped questions, citations, original-context retry and reviewed creation |
| Agent streaming | Actual provider-stream integration, pending prose, final validation, SSE/reconnect, interrupted-stream usage, budget rejection; Markdown headings, ordered lists, tables and code |
| Tailored suggestions | Four per context; actual question/treatments/measures, historical run identity, incomplete runs and no submission on selection |
| Settings and recovery | Configured/missing providers, budgets/storage, failed requests, missing records and unknown-route recovery |
| Accessibility | Visible focus, keyboard navigation, mobile drawer focus trap/Escape/return, reduced-motion activity and contained horizontal table scrolling |
| JAS compatibility | Browser titles, CLI/config aliases, database selection, old browser preferences and drafts |

Current normal-app captures cover **42 route/theme/viewport combinations**: Experiments,
Runs, editor, Environments, Settings, empty comparison and Agent at 390px, 834px and
1440px in light/dark themes. No page overflow was measured. The font was confirmed as
Inter. Expanded/collapsed navigation and the context menu were inspected separately.
Rendered evidence, comparison and streaming replies were inspected using controlled test
responses in an isolated database; these are explicitly test captures, not live outcomes.

All 47 sampled text/surface token pairs per theme meet 4.5:1. Focus remains visible around
the rounded composer group, without a rectangular textarea outline. Coarse-pointer
controls expand to at least 44px. Suggestions fill a draft without spending; unstarted
experiments receive setup questions rather than invented results. Activity reflects server
stages, never a fake progress timer. Completed replies replace pending prose after validation.

Checks passed: **165 backend tests**, Ruff lint/format and ty; **11 frontend unit tests**,
Biome, TypeScript and the Vite production build; **37 Playwright tests**, plus focused
capture checks for evidence and streaming/comparison. Earlier Actionlint and Docker Compose
validation remains applicable because this refinement does not change those files.

Normal application captures:

- [Agent · light](screenshots/agent-light.png) · [dark](screenshots/agent-dark.png) · [mobile](screenshots/agent-mobile.png)
- [Context menu](screenshots/agent-context.png) · [collapsed navigation](screenshots/agent-collapsed.png)
- [Workspace · light](screenshots/workspace.png) · [dark](screenshots/workspace-dark.png)
- [Editor · dark](screenshots/editor-dark.png) · [settings](screenshots/settings.png)

Controlled browser-test captures:

- [Streaming reply · light](screenshots/agent-streaming-light.png) · [mobile dark](screenshots/agent-streaming-mobile.png)
- [Decision evidence](screenshots/evidence-light.png) · [mobile evidence](screenshots/evidence-mobile.png)
- [Comparison](screenshots/comparison-light.png)

Limits: Chromium only; no paid-provider calls, full screen-reader audit or production
deployment. Model success/failure paths use controlled responses; this verifies stream
handling and rendering without claiming a live-provider run.
