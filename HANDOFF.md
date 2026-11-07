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
- [x] Finish useful mechanical work and independent re-reviews; fix follow-ups.
- [x] Run final checks and record pre-integration scores/limitations.
- [ ] Integrate current main, preserving its newer interface/chat/config behavior.
- [ ] Verify combined behavior, rescan, then publish one draft PR.

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

Completed quality-pass checks: 186 backend tests, 23 frontend unit tests and all
34 browser workflows pass. Ruff, ty, frontend lint, production build, Actionlint
and diff whitespace checks pass. All 14 saved simulation trajectories match the
baseline exactly, including observations, events, measurements and checkpoints.
Seven template payloads also match their originals. No paid model calls were made.

All initial and follow-up imported blind-review findings are resolved. Latest
strict scores are backend 87.0 and frontend 87.8. Both `next` execution queues
report zero items. Static debt remains in complexity, broad annotations and
coverage heuristics; edited subjective dimensions can still be marked stale.
Do not interpret an empty execution queue as an empty mechanical backlog.

An upstream coverage-path mapping defect was reproduced and reported at
https://github.com/peteromallet/desloppify/issues/958 under the invoked workflow
guide. Seeded RNG warnings concern deterministic simulation/bootstrap, not tokens;
replacing them with SystemRandom would break replay. Draft parsing deliberately
throws to its record-isolation/recovery callers.

The old task-owned backend on 8093 was stopped. Playwright closes its backend,
uses fresh temporary storage on 8094, and accepts an explicit disposable-instance
override. No agent-browser session is open.

### Integration acceptance criteria and next steps

Publication checks found this branch starts at bfdb35c, while origin/main now
contains merged PR #4's later redesign. Do not publish a PR that reverts it.
Merge origin/main (e4092b2), preserving unified Agent/chat streaming, the current
workspace shell/styles, JAS configuration compatibility and all quality fixes.
Resolve overlaps by responsibility, remove superseded duplicate UI components,
and update existing/new browser tests for current navigation. Re-run affected
checks and independent reviews/scans after integration. Never rewrite shared
history or modify another worktree.

Useful verification commands:

```sh
.venv/bin/ruff check backend benchmarks frontend/e2e/server.py
.venv/bin/ty check
.venv/bin/pytest -q
.venv/bin/python .desloppify/check_world_behavior.py
.tools/actionlint/actionlint .github/workflows/checks.yml
pnpm --dir frontend lint
pnpm --dir frontend test
pnpm --dir frontend build
pnpm --dir frontend test:e2e
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
