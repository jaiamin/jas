# Code quality handoff

Task branch: `t3/improve-codebase-quality`. User requested Desloppify's full
fix/resolve/next workflow for the Python backend and TypeScript frontend,
including substantive refactors and stale-documentation cleanup. No paid model
calls, credentials, user databases, or benchmark evidence may be modified.

## Acceptance and workflow

- [x] Install Desloppify with full extras and its Codex workflow guide.
- [x] Ignore `.desloppify/`; exclude only tools, dependencies and generated output.
- [x] Scan backend and frontend separately and import independent blind reviews.
- [x] Fix all 23 initial backend and 21 initial frontend review findings.
- [ ] Finish useful mechanical work and independent re-reviews; fix follow-ups.
- [ ] Run final checks, record scores/limitations, publish one draft PR.

The scanner lives in `.tools/desloppify`. Run backend commands from the repository
root with `PATH="$PWD/.tools/desloppify/bin:$PWD/.venv/bin:$PATH"` and
`desloppify --lang python scan --path ./backend`. Run frontend commands from
`frontend/` using `../.tools/desloppify/bin/desloppify --lang typescript` and
`scan --path .`. Each has separate local state/plan. The initial root TypeScript
state is obsolete. Do not exclude source or mark real debt fixed for a score.

Follow `.agents/skills/desloppify/SKILL.md`: `next`, implement/verify, `plan resolve`,
then `next` again. Use `plan promote` when the execution queue is empty but useful
mechanical findings remain. Re-review edited dimensions through the first-class
blind Codex batch runner, at most three concurrent review processes overall.

## Changes so far

- Worlds own decision schemas and common decision bookkeeping; engine/replay no
  longer reconstruct legal action rules or inspect environment internals.
- Provider accounting has explicit reservation/settlement boundaries, typed usage
  normalization, chained failures, cancellation/restart coverage, and diagnostics
  that omit exception messages/locals. Research sources are normalized at the
  provider boundary.
- Missing records share a 404 contract; documented errors support both string
  and validation-array details. Background starts require an active loop before
  mutations. Assistant metrics use frozen cutoffs and terminal/peak semantics.
- Research aggregation is pure and shares one metrics read; export packaging is
  separate. API routes declare per-request service dependencies outside the app
  factory. Seven templates have named constructors with identical payloads.
- Editor route/recovery, editable draft lifecycle, agents, conditions, resource
  schedules, profile overrides, tasks, and execution settings have concrete owners.
  Named immutable transformations maintain dependent profiles/authorities/tasks.
- Run annotations and request inspection own their workflows. Retry and control
  cache refreshes target affected resources. Select retains domain union types.
- Draft listing isolates corruption; editor discard errors stay recoverable;
  research targets are exclusive; progress respects max; pausing links stay valid.
- PRODUCT.md and docs/INTERFACE.md describe current capabilities/contracts.

## Verification and current work

Latest observed: 184 backend tests pass, including corrupt replay rejection, concurrency
and shared-budget contention, provider settlement failure/cancellation, API request scope,
and trust receiver forecast constraints. Ruff and ty pass. All 14 saved simulation
trajectories remain exactly equal after typed state and environment ownership refactors.

Frontend: 23 unit tests, lint and production build pass. All 30 browser workflows
passed after the first follow-up batch; a larger suite is now running for nested
design persistence, transient draft-validation recovery and revision navigation.
Playwright owns its keyless backend on 8094 with fresh temporary storage and graceful
shutdown. No manually prepared backend is needed; ASS_TEST_URL remains an explicit
optional disposable-instance override.

Initial 23 backend / 21 frontend findings were fixed. First re-review follow-ups:
14 backend and 12 frontend findings fixed. Backend checkpoint d1214f9 introduces typed
common/environment checkpoints, world-owned schema capabilities and measures, focused
operational run queries, concrete investigation helpers and regression tests. Existing
versioned snapshot fields are preserved at serialization boundaries to retain hashes.
Frontend checkpoint 2b0d116 preserves editor identity/validation transitions, separates
route and decision-browser ownership and makes browser-test isolation automatic.

Another six frontend review findings are in progress: distinguish transient validation
errors from bad draft content, simplify shell breadcrumbs, preserve assistant state on
revision changes, cover nested edits, narrow history values and remove obsolete required
field defaults. Task prerequisites now remount their text field after dependency changes
so removing a prerequisite cannot leave a stale displayed value.

Backend focused blind re-review is running under
`.desloppify/subagents/runs/20261107_180619/` (seven dimensions, three workers).
Do not mutate backend source until it finishes. Frontend reviews and evidence are
retained under `frontend/.desloppify/`. Latest measured strict scores before these final
follow-ups: backend 85.1, frontend 87.8; final scans/review status still pending.

Old task-owned keyless backend on port 8093 (PID 93415) still needs shutdown.
The test suite closes its own service after each run. No agent-browser session is open.

Useful final commands:

```sh
.venv/bin/ruff check backend benchmarks
.venv/bin/ty check
.venv/bin/pytest -q
.venv/bin/python .desloppify/check_world_behavior.py
pnpm --dir frontend lint
pnpm --dir frontend test
pnpm --dir frontend build
ASS_TEST_URL=http://127.0.0.1:8093 pnpm --dir frontend test:e2e
```

## Evidence and deployment boundaries

Read README.md, GLOSSARY.md, docs/ARCHITECTURE.md and DESIGN.md for maintained
project contracts. Historical live evaluation belongs to its frozen application
revision; see EVALUATION.md and benchmarks/reports/README.md. Keep those reports
and ignored persistent data intact. This quality task has not run live model or
Anthropic validation and makes no new empirical-validity claims.

Assigned work authorizes coherent commits, a task-branch push and one draft PR.
Never merge or push to the default branch. Immediately after creating/pushing a
PR, the next tool call must link its full URL through T3 `link_pull_request`.
