# Interface scope and verification

Primary reference: Laminar product screens inspected on 2026-11-07 in its
[trace documentation](https://laminar.sh/docs/platform/viewing-traces) and
[table documentation](https://laminar.sh/docs/platform/table-views). Public screenshots
showed its actual trace tree, adjacent span inspector, compact tables and control bars.
No authenticated Laminar session was available or required. Its marketing page was not
used as the application layout. `DESIGN.md` owns the resulting design system.

## Route and task inventory

| Route | Task | Important states |
| --- | --- | --- |
| `/` → `/studies` | Open saved work | Empty workspace, redirect |
| `/studies` | Search/filter experiments, recover drafts | Loading, error/retry, empty, filtered empty, pagination |
| `/design` | Ask AI for a reviewed protocol; reopen proposals | Empty question, pending, failure/recovery, provider unavailable |
| `/new` | Edit question, agents, conditions, execution, specification | Template, AI proposal, new revision, invalid JSON, recovered draft, save error, disabled limits |
| `/studies/:id` | Read results, run matrix, protocol and revisions | Ready, executing, paused, complete, failed, historical revision, no eligible results |
| `/runs` | Find runs and select 2–4 to compare | Filters, pagination, selection across filters, selection cap |
| `/runs/:id` | Inspect environment, decisions, interactions, record | Initial checkpoint, running/pause, pinned turn, evidence loading/error, no interactions, annotations, replay, request trace |
| `/compare?runs=…` | Compare outcomes and history | Fewer than two, 2–4 selections, incompatible worlds, missing measurements, query failure |
| `/environments` | Choose one of seven supported rule systems | Loading/error, each template and its measurements |
| `/settings` | Check providers, budgets, usage, storage | Key configured/missing, unknown usage; deployment config is read-only |
| Any route + `assistant=1` | Design or investigate scoped evidence | Context loading/error, pending/completed/failed analysis, citations, follow-up, mobile modal |
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

Verified on 2026-11-07. Automated tests use isolated databases and controlled model
responses. The normal application reads its configured database and provider credentials;
it has no demo mode or seeded outcomes. Current screenshots show the normal application.

| View / state | Observed verification |
| --- | --- |
| Experiments and runs | Desktop tables, search, filtered empty/reset, selection, comparison, pagination; empty workspace on mobile |
| Experiment details | Results, run matrix, protocol, revision selection and tuning; historical records preserved |
| Protocol editor | Desktop/mobile layout; question, agents, conditions, execution and JSON; validation, template changes, save and draft recovery |
| Run evidence | Journal and inspector; earlier turn keeps later decisions visible; keyboard slider, mobile focus/return, desktop assistant with stacked evidence |
| Observations and record | Saved notes survive API reload/export; drafts remain attached to their original run/turn during polling and turn changes; 24-turn exact replay verified |
| Environment and interactions | Shared pool/outcome history, initial and completed states, empty interaction network; all seven rule systems exercised by API/browser tests |
| Comparison | Selected two recorded test runs through the run library; aligned outcomes and history at desktop/tablet widths |
| AI design and assistant | Missing-provider/disabled state; mocked pending, completed, failed/retry and cited evidence flows; mobile modal and desktop docked panel |
| Settings and recovery | Missing providers, read-only configuration, budgets/storage; API error/retry, missing records, unknown-route recovery |
| JAS compatibility | New commands, settings, API title and export filename; legacy configuration precedence, database selection, browser drafts/theme/sidebar regression tests |
| Shared accessibility | Keyboard entry, sidebar shortcut/persistence, focus and return; sampled rendered text/placeholder contrast in both themes; no page overflow in inspected layouts |

Manual captures cover 390px mobile, 834px tablet and 1440px desktop. Browser tests also
exercise 1280px desktop navigation. Wide tables and editor tabs scroll within their containers.

Passed: 153 Python tests, Ruff lint/format checks, ty; 7 frontend unit tests, Biome;
26 Playwright tests; TypeScript and Vite production build; Actionlint and Docker Compose configuration validation. The new note-identity and
desktop evidence-navigation regressions failed against the prior build and passed after fixing.
The independent Impeccable reviewer scored both material fixes resolved.

Current application captures (no sample experiment data):

- [Workspace](screenshots/workspace.png)
- [Provider configuration](screenshots/settings.png)

Normal startup on port 8080 passed its health check and reported both OpenAI and Anthropic
configured. Provider presence was checked without exposing credentials or making paid calls.

Limits: Chromium verification only; no live paid-provider calls, full assistive-technology
audit, or production deployment. AI success/failure paths use controlled responses.
