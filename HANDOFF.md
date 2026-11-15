# JAS handoff

## Completed documentation

Public MVP docs are live at https://jas.mintlify.site, published through the Admin
MCP from artifact-backed main: `3957bfd83d96f806b68729a05104503d052d663b`.
Eight concise guides use the app's branding. README has light/dark cloud banners;
AGENTS links focused contracts. Superseded redesign plans, the old research proposal
and historical diagnostic prose were removed. Current engineering contracts remain.

## Workspace

- Branch: t3/ponytail-full-1. Draft PR: https://github.com/jaiamin/jas/pull/41.
- Keep the existing local app on 0.0.0.0:8080 (PID 271687), using data/workspace.
  Preserve its data and process. No local restart or paid calls.
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
- [ ] Verify official Gallery deployment and private bucket; app/CLI use its real
  HTTPS origin by default, retaining explicit self-host/development overrides.
- [ ] Retire the old private hosted workspace, preserving its detached data volume.
  Only Gallery should run remotely. Never reuse workspace credentials/storage.
- [ ] Configure real GitHub OAuth and verify cross-machine publish/fork/keychain.

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
