# JAS handoff

## Completed documentation

Public MVP docs are live at https://jas.mintlify.site, published through the Admin
MCP from artifact-backed main: `3957bfd83d96f806b68729a05104503d052d663b`.
Eight concise guides use the app's branding. README has light/dark cloud banners;
AGENTS links focused contracts. Superseded redesign plans, the old research proposal
and historical diagnostic prose were removed. Current engineering contracts remain.

## Workspace

- Branch: t3/ponytail-full-1. Draft PR: https://github.com/jaiamin/jas/pull/41.
- Local app is on 0.0.0.0:8080 (PID 369955), using data/workspace.
  Restarted only after confirming no active runs/calls/analyses; data preserved.
  No paid calls.
- System /usr/bin/uv fails on the guest page size. Use .tools/bin/uv or .venv/bin tools.
- Public docs currently use Mintlify artifact storage and main. The authenticated
  Admin MCP now works. No Git-source, site or authentication reconfiguration is needed.
- The app MVP remains on this task branch, not main, and registry release is pending.
  Public setup steps name the preview branch. Remove that pin after an approved merge.

## Product authority

Current behavior lives in docs/ARCHITECTURE.md, docs/DESIGN.md, docs/GLOSSARY.md and
ADRs. Superseded work plans/specs should not be treated as current UI requirements.
The workspace runs models; the independent gallery only serves reviewed evidence.
MCP, agent HTTP integration and Inspect export remain outside MVP.
Home has four illustrated ideas; Learn → Examples has three work/five cooperation
protocols with keyless scripted recordings. Assistant is optional on the right,
with shared drafts/context and manual opening; the focused new-chat view is centered.
Accounting preserves cache-aware recorded estimates and unknown reservations.

## Verification already observed

Documentation build/validation, Mintlify broken links, local Markdown file links
and the keyless CLI protocol check passed. All eight public routes, three SVGs
and llms.txt return 200 without starter placeholders. Desktop/light and phone/dark
layouts were inspected; logos load, Geist is applied and phone has no horizontal
overflow. Mobile navigation reaches Quickstart; keyboard search finds the budget
guide. No model prompts were submitted.

MVP baseline: 1,969 backend/201 browser tests, production wheel/container smokes,
Ruff/formatting, ty and workflow checks passed. A separate later full backend run
was interrupted at 32%; it is not a full pass. Latest library/navigation changes:
30 backend tests, 151 frontend tests and 31 browser tests passed, plus lint/build,
Ruff/formatting and ty. All eight recordings replay without model calls; the original
six protocols/recordings are unchanged. Source and screenshots are retained in .tools.

## External gates

Registry publication, live OAuth/S3/keychain integration, cross-machine publish/fork,
provider terms, genuine launch publications and outside-user acceptance remain open.
Hosted CI previously could not start because of account billing limits.

## Active work: Gallery redesign

Scope: PDF MVP pages 10–13, with later approved navigation. Anonymous Browse;
My published owns GitHub identity and publication controls. Publish stays on a
finished experiment's Publish tab; no global publish picker or Settings connection
form. All page-heading/sidebar icons remain outlines.

Acceptance and progress:

- [x] Minimal cards, catalog-derived filters, featured deduplication, pagination,
  honest loading/empty/stale/error states and confirmed inline unpublish.
- [x] Anonymous browsing never touches keychain; scoped device approval stays inline;
  origin isolation, expired-token handling and safe network errors have regressions.
- [x] Hosted account/detail flow and copied fork commands retain source origin.
- [x] Provider-neutral user docs and deployment guide; no project MCP configuration.
- [x] Final lint/types/build, 38 backend, 156 frontend and 48 browser tests; both
  production image smokes passed. No paid calls.
- [x] Official Gallery deployment reports SUCCESS at source revision 27027447.
  Live health, anonymous catalog/filters, public UI/terms, PKCE GitHub redirect and
  device requests passed; workspace APIs return 404. Private bucket references
  remain server-side. Live authenticated object writes are still unverified.
  App/CLI default to its HTTPS origin, with explicit self-host/dev overrides.
- [x] Owner applied the old workspace/volume deletion in the dashboard. Read-back
  confirmed only Gallery, gallery-data and gallery-records remain; no staged changes.
- [x] Real GitHub OAuth client/secret configured only on Gallery.
- [ ] Complete user OAuth login and cross-machine publish/fork/keychain acceptance.

Infrastructure is managed through authenticated MCP using the normal credential
store; never copy tokens into this repository. The ignored `.tools` client can
call platform tools without starting a model turn. No cloud agents are required.
The Gallery service has separate SQLite volume/private bucket and one replica;
provider keys remain exclusively in the local workspace.

Detailed final logs/screenshots are in ignored `.tools/gallery-final-*` and
frontend test outputs. GitHub OAuth credentials were configured directly on the
Gallery service through secure input; never copied into the repository.

Public documentation source changes are not yet published. Preserve the existing
Mintlify deployment until an explicit documentation publication is performed.
Registry release, genuine seed corpus, live identity/keychain checks and outside-user
acceptance remain launch gates; never equate fixture tests with those checks.

Hosted deployment: `7b7962d4-2317-412d-9325-b0649b65806a` (SUCCESS).
Gallery origin is the DEFAULT_GALLERY_ORIGIN constant in publishing.py.
Platform project `f7e199d8-bd8b-4628-8527-d0d99c20519b`, production environment
`b90e8e72-dde9-4b2e-aa50-1243debe2801`. The retired workspace and volume are gone.
Gallery source is pinned to the tested commit; documentation-only pushes do not deploy.
GitHub Checks run 43753545823 failed to start because of account billing/spending
limits; this is an external CI gate, not a test failure. Local checks passed.

## Completed: consistent error UI

User requests one minimal, clear error treatment across every page, including
My published's missing-keychain state. Reuse shared Alert/ErrorState and stock UI
primitives; preserve specific validation/provider messages and never auto-retry
paid actions. Use neutral surfaces, clear text hierarchy, a restrained error icon
and separate recovery actions that wrap on phones. No token-storage fallback.

Acceptance:
- [x] Shared layout reaches page, inline, settings, Gallery, Assistant and dialog errors.
- [x] Keychain setup errors explain the requirement without a pointless Retry.
- [x] Loading/empty/warning states and field validation retain their semantics.
- [x] Meaningful regressions; lint/types/build and light/dark phone/desktop checks.

Verification: 74 affected backend tests, 161 frontend tests, 24 workspace browser
tests and three hosted Gallery browser tests passed. Frontend lint/build,
Ruff/formatting and ty passed. Phone/desktop error screenshots were inspected in
both themes, including long-message wrapping and keyboard recovery. Page crashes
show safe reload guidance; transport/parsing errors retain their cause with readable
copy. Paid actions are never automatically repeated. Failed sign-in uses its existing
control to retry rather than offering an unrelated status refresh.
The local backend was gracefully reloaded after confirming no active work; health
and the typed missing-keychain response were checked on 8080. Data was preserved.
No remote deployment or public documentation publication was performed for this UI.

Infrastructure review confirmed the old hosted workspace and volume were deleted.
Only Gallery, gallery-data and private gallery-records remain; no staged changes.

Design intent: errors help the local experiment author recover without overwhelming
the page. Use existing card/background/border tokens and Geist at 14px; medium
foreground titles, muted descriptions and one outlined destructive icon. Border-only
depth, 16px padding on the existing 4px spacing grid, 8px icon gap and 12px before
recovery actions. Reuse the same layout for compact and page-level errors.

Gallery examples: the user cancelled the six requested publications for now.
Nothing was uploaded and no paid model experiments were run.

## Completed: workspace interface simplification

Scope: experiment/run row actions, Environments built-in/custom lists and details,
and the new experiment editor. Preserve immutable versions, draft recovery,
explicit execution, validation and every supported advanced control. No paid calls,
remote deployment or Gallery uploads.

Direction: quiet icon/text row actions grouped by purpose; compact environment
identities, short descriptions and fewer redundant tags; a single editor column
with General, Advanced and Review, progressively disclosed technical settings.
Blank creation starts with empty name/question; sourced designs keep their content.
Reuse shared semantic tokens and stock components without dependencies.

Acceptance / next steps:
- [x] Review current flows and implement focused menus, preserving confirmations.
- [x] Simplify environment cards, custom library and details with all rules accessible.
- [x] Simplify editor navigation/layout, blank-start behavior and incomplete drafts.
- [x] Add meaningful regression coverage; run lint/unit/build and keyless browser flows.
- [x] Inspect both themes at phone/desktop widths; update design notes and local 8080.

Implemented: ghost row menus with outline icons and short action labels; desktop
two-column environment cards (one column below 42rem of available content), short
summaries and 44px brand artwork. Both groups fill the page width. Custom setups
share that geometry; details disclose rules/controls/metrics with fixed actions.
The editor uses a 768px reading column and General/Advanced/Review. General shows
only core controls; Advanced discloses one complete section at a time. Blank
creation keeps name/question empty, and unfinished drafts recover without weakening
server validation. Internal draft mode names remain compatible with existing drafts.

Navigation hover uses the neutral muted surface for unselected links, including
Settings and collapsed navigation. Selected links retain blue, including on hover.
Stock sidebar primitives stay unchanged; this styling is scoped to workspace links.

Verification: 162 frontend unit tests, lint/types/build and diff checks passed.
The full 244-test browser run passed 238 initially; six outdated selectors/fixtures
were corrected and all six passed with --last-failed. Two new sidebar hover checks
also passed in both themes, covering expanded/collapsed links and Settings.
All 246 current default browser cases therefore passed across that run and focused
reruns; no single clean full run was repeated after these test-only corrections.
A stable example ID replaces one pre-existing array-index fixture assumption.
Incomplete title/question drafts now recover directly in the form, so their old
specification-error expectation was replaced with recovery/save assertions.

Screenshots of the editor, environment grid/details, menus and sidebar hover were
inspected on phone/desktop in both themes. Logs/screenshots remain in ignored
`.tools/workspace-redesign-*`. User's local 8080 returns healthy and serves the latest
production bundle; data is unchanged. Temporary visual preview and disposable test
services were closed. No deployments, documentation publication, Gallery uploads or
paid model calls were performed. Public documentation source was updated locally.
Hosted CI remains subject to the existing account billing gate; backend was unchanged
and its full suite was not rerun for this frontend task.

## Completed: compact Examples

Approved direction: keep three work/five cooperation examples and the current
heading, use two equal desktop columns and one on phones/narrow content, with a
small environment mark, title, question and Watch/Use example actions.
Remove decorative protocol tables and parameter metadata. Preserve loading/error/
empty states, real recording/editor destinations and keyless behavior.

- [x] Simplify cards with existing primitives; update design notes and layout assertions.
- [x] Run affected browser flows in both themes/phone/desktop, including Assistant width.
- [x] Inspect screenshots; finish lint/type/build checks and serve the build on 8080.
No backend changes, paid calls, uploads or deployment are authorized by this UI task.

Verification: lint, TypeScript/Vite build and all 10 affected Learn/recording browser
checks passed using disposable keyless port 18160. Both themes were inspected at
320px/1440px; the grid also switches to one column beside the Assistant at 1280px.
All eight recordings still open without provider setup, and Use example opens its
original editable protocol without saving/running. Loading/retry/empty states pass.
Logs/screenshots are in ignored `.tools/examples-compact-*`. The test server stopped;
local 8080 is healthy and serves the new build. No dependencies/backend/data changes,
paid calls, uploads, deployments or public documentation publication were performed.

Follow-up: removed the Examples cards' demo labels at the user's request, and
simplified their action-row markup. Recording provenance and protocol data remain
unchanged. Lint/types/build and all six Learn browser checks passed in both themes
at phone/desktop widths. Local 8080 serves the updated build; no deployment.

Examples now has a full-width stock Separator beneath its heading, with 24px
spacing above/below, matching the other workspace pages. Lint/types/build and six
Learn browser checks passed (both themes, phone/desktop); screenshot inspected.
The production bundle is served on 8080; no deployment or data changes.

## Completed: consistent link underlines

All underlines now share a 4px offset and 1px thickness in `index.css`, including
Home guidance, prose in alerts/dialogs/accordions and hover-only links. The shared
`text-link` utility now styles existing evidence references, comparison run names
and public Gallery footer links. Navigation and button/card actions keep their
current treatment; Home's trailing arrow stays outside the underline.

Verification: lint, TypeScript/Vite build and 12 focused browser checks passed on
disposable keyless ports 18163/18164. Checks cover both themes, phone/desktop Home,
provider errors, citations, missing starters and public Gallery reading/footer
links. Screenshots were inspected; logs/artifacts are in ignored `.tools/links-*`.
Both test servers stopped. Existing 8080 is healthy and serves the updated build.
No dependencies, backend/data changes, paid calls, uploads or deployment.

## Completed: simpler experiment creation

User requests a visual and workflow redesign of New experiment: consistent tabs,
less repetition, fewer inset controls and concise copy. Keep Home artwork unchanged.

Acceptance criteria:
- [x] General has compact aligned fields and condition rows without nested boxes.
- [x] Tabs use one matching selection color; dropdowns align with inputs and labels.
- [x] Basic identity/question/environment appear once, in General. Advanced retains
      research settings, agents, full condition mechanics and execution controls.
- [x] Remove redundant reassurance/section headings; retain meaningful validation,
      spending estimates, explicit Create/Create and run, and draft recovery.
- [x] Verify affected creation/revision/JSON/draft flows, both themes and phone/desktop;
      inspect screenshots and serve the production build on existing 8080.

General now presents basics, Agents, Comparison and Runs in one reading column.
Agents names the participants and explains their role; Compare by and unit labels
clarify conditions. Advanced retains full scientific controls without repeating
basic fields. Research plan replaces the ambiguous Question section there. Review
links back to the correct editor section. New actions use Create/Create and run;
existing experiments retain version-saving actions. Assistant design is available
in Experiment options. Draft feedback appears once, only when meaningful.

Environment options reuse the library's concise summaries and expose names and
descriptions separately to assistive technology. The closed selector shows only
the name. Shared menus have padded hover surfaces; accordions no longer underline.
Selected tab text/indicator use the same accent, including on hover. Invalid seeds
reveal their disclosure. Invalid JSON stays intact; switching to General validates
and applies valid JSON. Submitted snapshots and draft recovery remain protected.

Verification: all 162 frontend unit tests, lint, TypeScript/Vite build and diff
checks passed. The earlier broad browser run passed 239/246; its seven stale
navigation/status selectors were corrected. Final affected flows cover 96 unique
cases across focused runs: controls/list/focus 36/36, creation flows 56/60 initially,
then editor/environment reuse 17/17 after fixing option naming and measuring menu
insets independently of Popper's fractional positioning. Those reruns include all
four creation failures and a new invalid/valid JSON-to-General regression. No single
clean full browser run was repeated. Screenshots were inspected in both themes,
phone/desktop, including blank 320px creation and described environment options.

Ignored logs/screenshots: `.tools/editor-steering-*`. Disposable test services
stopped; the existing user service on 8080 is healthy and serves the production
build. Home artwork, backend, dependencies and user data are unchanged. Public docs
source was updated locally; no docs publication, deployment, uploads or paid calls.
Hosted CI remains subject to the previously observed account billing gate.

## Completed: experiment and run detail layouts

User requests minimalist, organized experiment/run pages consistent with the
current editor and workspace. Keep the existing design system and capabilities.

Acceptance criteria:
- [x] Compact shared detail headings, clear metadata and consistent section tabs.
- [x] Experiment outcomes, run status, protocol and publishing remain easy to find;
      remove duplicate empty/estimate text and long caveats styled as pills.
- [x] Run playback sits before the turn evidence; replace the three independently
      scrolling columns with compact perspectives and a focused story/world layout.
- [x] Preserve execution controls, cutoff/privacy behavior, immutable versions,
      exact replay, annotations, exports and publication review.
- [x] Inspect both themes at phone/desktop and beside Assistant; verify relevant
      unit/browser flows, lint/types/build and serve on existing 8080. No deployment.

Use only disposable keyless browser data. Do not touch user data or make paid calls.

Shared compact headings and labelled facts replace scattered metadata. Experiment
tabs use accent line indicators; outcomes and run grids use open tables. Design
presents conditions, run settings, research notes and agent goals in one column,
with configuration, version history and immutable JSON disclosed. Blocking checks
remain visible; unknown usage stays explicit. The mobile version selector keeps
its full label.

Run playback comes before evidence. Compact perspectives replace the tall agent
rail; model/memory details are disclosed. Story and world use two columns when
space allows, stacking beside Assistant and on phones, with one page scroll.
Shared example/public playback follows the same reading order. Rules & evidence
retains inspection, receipts, annotations and replay verification. Inspect requests
now opens Record while preserving the selected turn.

Verification: all 163 frontend unit tests, lint, TypeScript/Vite build and diff
checks passed. Focused browser runs cover 41 unique affected cases: execution,
inspection, matched results, workspace, publication, detail layouts, examples and
public Gallery playback/privacy. Final detail checks were repeated after visual
polish. Screenshots inspected in both themes at 390px/1440px and beside Assistant.
The design detector returned no findings. Logs/artifacts: ignored
`.tools/detail-layout-*`. No clean full browser suite or backend suite was rerun;
hosted CI remains subject to the previously observed account billing gate.

Disposable keyless test services stopped. Existing user service on 8080 is healthy
and serves the updated build. No backend, dependency, user-data, paid-call, upload,
deployment or public-docs publication changes.

## Completed: bulk record actions and concise Compare

Selection groups now place outline download/delete/clear icons beside the count.
Experiments support confirmed deletion; active selections disable Delete, backend
ownership/accounting safeguards remain authoritative, and partial failures retain
only unsuccessful items for retry. Runs have no delete action. Compare keeps its
2–4-run limit with the label Compare and a Select 2–4 runs hint.

Downloads use one ZIP of existing private experiment exports, deduplicated by parent
experiment for run selections; no new partial evidence format. The bounded POST
endpoint validates IDs and removes temporary archives after delivery or generation
failure. Binary downloads share standard API error handling and support explicit
retry. Docs describe full-parent scope; public docs source edits are not published.

Verification: 163 frontend unit tests, 60 API tests, Ruff/format, ty, frontend lint,
TypeScript/Vite build and diff checks passed. Browser checks cover 44 unique cases:
39 existing record-list/workspace cases passed in the initial run; four new bulk
cases initially used an inaccessible background locator while a modal was open.
Corrected the locator to inspect the intentionally hidden selection DOM, then all
five final bulk cases passed, including active-selection protection. Screenshots
inspected in both themes at 390px/1440px. Static design detector reported no findings
(regex-only coverage). Ignored logs/screenshots: `.tools/bulk-*`. No full backend or
full browser suite rerun; hosted CI remains subject to the prior account billing gate.

Disposable test services stopped. After checking no active runs/pending chats,
restarted the existing local app to load the new endpoint: PID 431673, 0.0.0.0:8080,
same `data/workspace`, healthy with current frontend. No user data deletion, paid
calls, dependencies, deployment, uploads or public-docs publication.

## Completed: Docker-first setup instructions

README, installation and Mintlify quickstart now lead with downloading/extracting
the current MVP and running `docker compose up --build`. Removed contributor
Python/Node/pnpm setup and the unnecessary `.env` copy from the ordinary user path.
Provider setup stays in Settings; stop/restart and named-volume persistence are
explained briefly. Optional wheels and source development live in separate guides.
No prebuilt image/package publication is claimed.

Verified Compose configuration with no env file, current official Compose build
and volume semantics, Mintlify validation/build, broken links and diff whitespace.
Documentation only: no new container build/runtime tests, service changes or data
changes. Existing 8080 stays running. Mintlify source was updated locally; its live
site was not published.

## Completed: Allo typography preview (new PR)

Started `feat/allo-font-preview` from the latest `origin/main` at b8df1af7;
PR 41 is merged. Re-fetched before committing; main remained unchanged.

Shared `--font-sans` now selects self-hosted Allo 1.0.1, covering interface text,
headings, controls, Assistant and Gallery. The Friendly variable font keeps
roundness 50, weights 100–900 and automatic optical sizing. Regular/bold oblique
faces load on demand; the normal face is preloaded with swap rendering. Unmodified
upstream assets include OFL copyright/license and source attribution. Geist stays
as fallback and makes rollback one token edit. JAS wordmark and monospace evidence
retain their deliberate roles. No font-setting UI or dependency changes.

Mintlify source mirrors Allo with the same local variable WOFF2 and license;
publication instructions now include fonts. The live docs site was not published.
Verified local docs rendering uses Allo for body/headings and variable weight
metrics match the app at 400/500/600/700. Both previews load fonts locally.

Verification: frontend lint and TypeScript/Vite build, Mintlify validation/build
and broken-links, diff checks and 14 existing focused browser cases passed:
experiment/run details (4), Learn/settings/examples (6), record lists (4), both
themes and phone/desktop. Inspected Home and docs in the shared browser, checked
font loading and no overflow at 390px, and inspected dark run/Assistant and 320px
Examples captures. All three app font faces load successfully. The type detector
reported no findings (static scan only). Artifacts are ignored `.tools/allo-*`.
No new tests for this reversible font-only change; full unit/backend/browser suites
and hosted CI were not rerun.

Existing user app remains healthy on 0.0.0.0:8080, serving the updated production
frontend without a backend restart. Disposable browser-test servers shut down;
local docs preview and owned review tabs closed after checks. No paid calls,
user-data changes, deployment, merge or public-docs publication.

## Completed: playful Allo wordmark refinement

The app wordmark now uses a shared JasWordmark component and a 1.3 KB Allo
Playful JAS subset (800 weight, optical size 22, roundness 100, single-story a).
Letters have fixed −3°/+2°/−2° tilts; original tracking, sizes and line heights
remain, with no added gaps or vertical offsets. Sidebar logo and surrounding
layout are untouched. Gallery branding shares the component and keeps its own
original 24px size/32px line height. README/docs SVG artwork remains unchanged.
Font attribution documents the derived, renamed subset under the existing OFL.

Verification: frontend lint and TypeScript/Vite build passed after the final
line-height adjustment. Six focused navigation browser cases passed, including
brand alignment, collapse, phone layouts and both themes. Inspected the final
wordmark in light/dark and confirmed font loading, 22px line height, −0.88px
tracking and no letter translation. No new tests for this static visual change;
full suites and hosted CI were not rerun. The existing user app remains running
on 0.0.0.0:8080; no backend restart, data changes, paid calls or deployment.

## Follow-up: upright wordmark

Removed letter rotations at the user's request. The shared wordmark now renders
normal `jas` text in the same Allo Playful face, with unchanged size, tracking and
line-height settings. Updated design/font notes. Frontend lint and production
build passed; browser checks were not rerun for this static reversal. Preview
continues on 8080 with the rebuilt assets.

## Completed: matching README and docs branding

README theme-aware cloud banners are now 2400×400 instead of 2400×600, with a
smaller centered brand and explicit 1200×200 display dimensions. Both banners
and docs header SVGs use the app's upright Allo Playful JAS face, single-story a,
800 weight, matching icon/text proportions, 8px base gap and −0.04em tracking.
Docs text is outlined to avoid font-loading differences; the favicon remains
byte-identical to the original app pixel icon. No app layout changes.

Inspected both generated banners, checked PNG dimensions/transparency, SVG XML
and source glyph paths, and validated the Mintlify source. The app build/lint
passed after removing rotations. Preview stays on 8080. No live docs publication
or deployment; branding remains in the draft font-preview PR for review.

## PR 42 CI repair (in progress)

Hosted run 44154823973 passed frontend/workflows but failed backend type checking
because the Gallery extra was not installed, and the deployment smoke failed
renaming an image-layer directory on OverlayFS (EXDEV). Backend CI and contributor
setup now install the existing Gallery extra. The disposable smoke recreates its
empty directory instead of renaming it, retaining symlink/ownership rejection,
privilege dropping, auth, runtime and restart-persistence assertions.

Local checks passed: Ruff, touched-script formatting, Actionlint (including shell
checks), Gallery storage regression, full ty check with frozen dependencies and
fresh workspace/gallery image builds and production smokes. Full backend tests
are still running in `.tools/pr42-backend-tests.log`; hosted CI must pass at the
new head before completion. No app/UI change, paid calls, user data or deployment.
