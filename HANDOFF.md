# Project handoff

Branch: `t3/improve-codebase-quality`; PR: https://github.com/jaiamin/ass/pull/5.
Main `e4092b2` is integrated. Do not merge or push to main.

## Current task

Fix the three audit findings and ship a current-only JAS app. The user explicitly
allows removal of old formats, compatibility code, archived artifacts and dummy data.

Acceptance criteria:
- [x] Reject untrusted hosts; document explicit hosts for LAN/proxy access.
- [x] Deliver public communication in public-history modes without leaking private facts.
- [x] Fingerprint simulation sources and reject benchmark resumes after source changes.
- [x] Remove ASS aliases, old migrations, routes, storage fallbacks and stale archives/docs.
- [x] Verify backend, frontend, browser flows and container.
- [x] Prepare the verified checkpoint and updated PR #5 description for publication.

Use project-local `.venv/bin` tools; sandbox `uv` crashes during allocation.
No paid provider calls. Keep work in this checkout. The user app uses port 8080;
test services need distinct ports and disposable data. Link the PR immediately after a push.

## Current implementation and verification

JAS-only configuration, CLI, browser storage and exports. All assistant submissions use
`POST /api/chats`; the editor still reads individual `/api/analyses/{id}` proposals.
Fresh workspaces use schema 4, environment rules 3.0.0 and `jas-study` export v3.
Old migrations and snapshot padding are removed; incompatible workspaces fail explicitly.
Deleted obsolete benchmark archives; no current benchmark score is claimed.

Verified: 242 backend tests, 64 frontend tests, Ruff, ty, Biome and production build.
All 55 browser cases pass after correcting test setup that reset preferences on reload.
The final production Docker image built and passed health, SPA/assets, fresh keyless
workspace and non-root smoke checks. Actionlint/ShellCheck, documentation links,
whitespace and staged Gitleaks checks pass.
The disposable container, volume and image tags were removed.

Port 8080 runs the current app (PID 208053, exec session 17015). Its authorized dummy
database was reset; health/catalog/studies return 200, schema 4 and all seven rules 3.0.0.
Leave this user-requested test service running. README remains 22 lines.

Next: the user can review PR #5, wait for its new hosted checks and test on port 8080.
Do not merge automatically. No live paid-provider calls or new benchmark runs were made.

## Prior verification

At `55d9336`, all six hosted checks passed. Local checks passed: 217 backend tests,
65 frontend tests, 55 browser cases, lint/types/build, workflow/shell lint and Docker smoke.
Last Desloppify strict scores were backend 91.8 and frontend 90.0 before follow-up fixes.
The app is MIT licensed. README remains 22 lines.
