# Code quality handoff

Branch: `t3/improve-codebase-quality`. Main `e4092b2` was integrated at `c5832dd`.
Preserve the redesigned shell and persistent, full-page streaming Agent.

## Acceptance and progress

Reach strict Desloppify 90 for each program where achievable, finish its execution
queue, consolidate obsolete documentation, and publish one draft PR against main.

- [x] Install full Desloppify and Codex guide; ignore local state.
- [x] Scan frontend/backend separately; exclude only dependencies/generated output.
- [x] Integrate current main; complete substantial refactors and regression fixes.
- [x] Consolidate PRODUCT into README; remove redundant EVALUATION pointer;
  shorten DESIGN/INTERFACE and consolidate architecture guidance.
- [x] Backend strict **91.8**, objective **91.8**; execution/review queues clear.
- [x] Frontend final scan: strict **90.1**; execution/review queues clear.
- [x] Record source commits and final browser results; both score targets met.

Publication: task-branch push and one draft PR against main are authorized.
Never merge or push to main. Find the PR by branch `t3/improve-codebase-quality`.

## Changes retained

Backend `simulation/` owns world rules, typed state, schemas and checkpoints.
Provider reservation/settlement preserves cancellation and primary errors.
Routes, research aggregation and exports have focused owners. Bulk execution
preflights every runnable member; usage and analysis filters agree across APIs.
Fourteen complete deterministic trajectories match baseline evidence exactly.

Frontend editor, Agent and run-inspection workflows have focused components.
Recovery preserves legacy/corrupt drafts. Saving and validation lock the submitted
snapshot; failed saves restore editing. Notes, request traces and replay results
retain their original record identity through late responses and navigation.
Malformed streams close and recover persisted results without resubmission.
Shell breadcrumbs and experiment-status precedence use explicit local derivations.

## Observed verification

- 213 backend tests; Ruff and ty pass.
- 64 frontend unit tests; lint and production build pass.
- Full latest 54-case browser suite passes, including navigation, draft recovery,
  delayed saves, streaming recovery, experiment controls and mobile layouts.
- Actionlint, whitespace and commit Gitleaks checks pass.
- No paid application model requests or persistent user-data changes.

Browser evidence: `.desloppify/final-browser.log`. Playwright closed its temporary
keyless backend/database on 8094. No task services are running.
The sandbox's uv executable crashes on allocation; direct `.venv/bin/ruff`,
`.venv/bin/ty` and `.venv/bin/python -m pytest` passed in the installed environment.

## Scanner and next steps

Guide: `.agents/skills/desloppify/SKILL.md`; CLI: `.tools/desloppify/bin/desloppify`.
Run in `backend/` or `frontend/`, with `--lang python` or `--lang typescript`,
scanning `.`. Backend PATH must include `../.venv/bin` for Bandit. Root scanner
states are obsolete. Never copy or edit scores. Blind reviews use the first-class
Codex runner with at most three workers; focused imports use `--allow-partial`.

Use `next`, fix/verify, `plan resolve`, then `next`; rescan after the queue clears.
This scanner counts `auto_resolved` against strict. Sixteen automatically cleared
coverage findings were explicitly confirmed against real direct behavior tests;
remaining indirect/import-only gaps stay open. Evidence is in ignored frontend
`.desloppify/verified-coverage-evidence.json` and its resolution log.
Seeded RNG is required for reproducibility. Nested Python path-detection issue:
https://github.com/peteromallet/desloppify/issues/958.

The final frontend scan and both `next` calls confirm the completed execution
cycle. Broader mechanical coverage/structural debt remains; 90+ is not a claim
that the backlog is empty. Source fixes are recorded through `fdadb73`.
Main remained `e4092b2` at the final fetch. Immediately after PR creation or a PR
push, link its full URL with T3 `link_pull_request`.

Do not inspect credentials, run paid application model calls, change persistent
user data or delete frozen benchmark evidence. Historical evaluations validate
the recorded revision; they do not validate subsequent changes or human claims.
