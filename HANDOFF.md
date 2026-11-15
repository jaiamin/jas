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
  Preserve its data and process. No app redeploy, Railway changes or paid calls.
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

## Next work

Resolve the external launch gates when separately authorized. Remove preview-branch
installation pins after an approved merge/release. Future docs edits still require
explicit Admin MCP publication; local source changes alone do not update the site.
