# Project handoff

Branch: `t3/improve-codebase-quality`; draft PR: https://github.com/jaiamin/ass/pull/5.
Latest main `e4092b2` is integrated. Do not merge or push to main.

## Completed

- Last Desloppify scans: backend **91.8**, frontend **90.0**; both queues clear.
  These scores precede the follow-up review fixes below.
- Removed 34 unused UI helpers, redundant directives, unused run-model grouping,
  historical screenshots and generated design metadata. Installed workflow tools stay local.
- README is 22 lines. Setup, design, vocabulary and research live under `docs/`.
- Preserved the redesigned workspace, draft/data recovery, versioned checkpoints
  and frozen benchmark provenance. No paid application model calls or user-data changes.
- Follow-up review fixed observation drafts lost on tab/filter changes and overlapping
  legacy analysis requests, including unthreaded records. Regression tests failed before fixes.
- CI runs parallel backend, frontend/browser, production-image and workflow checks;
  `verify` gates all four. Actions are pinned and updated weekly by Dependabot.
  Caches, timeouts, obsolete-run cancellation and failure artifacts are configured.

## Verification and limits

217 backend tests, 65 frontend unit tests, all 55 browser cases, Ruff, ty,
frontend lint/build, Actionlint/ShellCheck and local documentation links pass.
Production Docker build and smoke pass: health, SPA routes/assets, keyless fresh
workspace and non-root user. The disposable container, volume and task image are removed.
The user-requested app remains on port 8080; review/test backends are closed.
The new hosted CI workflow still needs its first run after publication.

Broader coverage and structural backlog remains. The score change from 90.1 reflects
removed source changing mechanical denominators and an independent logic review at 94.
Only direct behavior-test fixes are confirmed; indirect/import-only gaps remain open.
Application license is MIT, selected by the user; root LICENSE names Jai Amin (2026).
The README links the license. Third-party license notices remain intact.

## Continuing work

Use installed `.venv/bin` tools: this sandbox's `uv` crashes during allocation.
Run Desloppify separately from `backend/` and `frontend/`, scanning `.` with
`--lang python/typescript`; PATH needs `../.tools/desloppify/bin` and `../.venv/bin`.
Never edit scores. After any PR push, immediately link its full URL through T3.
