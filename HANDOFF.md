# Project handoff

Branch: `t3/improve-codebase-quality`; draft PR: https://github.com/jaiamin/ass/pull/5.
Latest main `e4092b2` is integrated. Do not merge or push to main.

## Completed

- Desloppify strict: backend **91.8**, frontend **90.0** after final scans;
  both execution queues clear. Independent cleanup review found no new defects.
- Removed 34 unused UI helpers, redundant directives, unused run-model grouping,
  historical screenshots and generated design metadata. Installed workflow tools stay local.
- README is 22 lines. Setup, design, vocabulary and research live under `docs/`.
- Preserved the redesigned workspace, draft/data recovery, versioned checkpoints
  and frozen benchmark provenance. No paid application model calls or user-data changes.

## Verification and limits

213 backend tests, 65 frontend unit tests, all 54 browser cases, Ruff, ty,
frontend lint/build, Actionlint, local documentation links and Gitleaks pass.
Production Docker build and smoke pass: health, SPA routes/assets, keyless fresh
workspace and non-root user. Temporary services, container and task image are closed.
The final browser suite covers the final production code; subsequent changes only add tests/docs.

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
