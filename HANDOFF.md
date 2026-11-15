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
