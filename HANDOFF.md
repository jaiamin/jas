# Code quality handoff

Task branch: `t3/improve-codebase-quality`. User requested Desloppify's full
fix/resolve/next workflow for the Python backend and TypeScript frontend,
including substantive refactors and stale-documentation cleanup. No paid model
calls, credentials, user databases, or benchmark evidence may be modified.

Strict-score target: 90 for each program, evaluated after integrating main.

## Acceptance and workflow

- [x] Install Desloppify with full extras and its Codex workflow guide.
- [x] Ignore `.desloppify/`; exclude only tools, dependencies and generated output.
- [x] Scan backend and frontend separately and import independent blind reviews.
- [x] Fix all 23 initial backend and 21 initial frontend review findings.
- [x] Finish useful mechanical work and independent re-reviews; fix follow-ups.
- [x] Run final checks and record pre-integration scores/limitations.
- [x] Integrate current main, preserving its newer interface/chat/config behavior.
- [ ] Verify combined behavior, rescan, then publish one draft PR.

The scanner lives in `.tools/desloppify`. Run commands from each program's own
working directory: `backend/` and `frontend/`, with `--lang python/typescript scan
--path .`. Backend PATH includes `../.tools/desloppify/bin` and `../.venv/bin` for
Bandit. Each program owns its `.desloppify/` state and plan. The old repository-root
Python and TypeScript states are obsolete. Python's nested `backend/src/` import
mapping defect disappears when scanning from `backend/`; its objective score is
90.3 before further fixes. Do not transfer or hand-edit subjective scores. A new
blind backend review is running against the correct context.

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
- README.md and docs/INTERFACE.md describe current capabilities/contracts; redundant
  PRODUCT.md was consolidated. DESIGN.md and EVALUATION.md retain concise references.

## Verification and current work

Current main e4092b2 was merged at c5832dd. Its redesigned shell/styles, full-page
Agent, persistent chats, streaming and JAS/ASS configuration compatibility remain.
The quality pass carries over typed world state/decisions, provider accounting,
service boundaries, draft recovery/validation locks and focused UI modules.
Integration fixed complete journal visibility, rendered-layout evidence focus,
turn-bound note drafts and zero-usage interrupted-stream reservation handling.
Superseded editor/panel implementations were removed rather than duplicated.

Observed after integration: 204 backend tests and all 51 browser workflows pass;
Ruff, ty, frontend lint, production build, Actionlint and whitespace checks pass.
All 14 deterministic trajectories still match the baseline exactly. No paid model
calls were made. Playwright closes its keyless backend and temporary database.
No task services or agent-browser sessions remain open.

New asynchronous component tests cover note-save races/failure recovery, late
request responses, chat-history retry and pending-to-validated replies. Latest
run: 32 passed / one accessibility-name expectation corrected; rerun pending.

Fresh independent reviews are running, with three review workers overall:
- Backend: exec session 57300; backend/.desloppify/integrated-review.log (2 workers).
- Frontend: exec session 23145; frontend/.desloppify/integrated-review.log (1 worker).
Do not change reviewed production sources until their run finishes. New test-only
coverage can proceed. Root-context backend review session 63609 was terminated
because the import-mapping issue requires backend-local scanning; its partial
artifacts are retained as historical evidence, with no imported assessments.

Next: complete blind reviews, import/triage their findings, follow next/fix/resolve
until queues clear, rescan each program and pursue strict 90 honestly. Prior
scores 87.0/87.8 predated integration and the corrected Python scan context; do
not present them as current final scores. Mechanical debt remains, including
complexity and test-import heuristics. Seeded RNG warnings represent deterministic
simulation/bootstrap, not security tokens; replacing RNG breaks exact replay.

Upstream coverage-path repro: https://github.com/peteromallet/desloppify/issues/958
filed under the invoked guide. Draft parse exceptions intentionally propagate to
record-isolation/recovery callers. Preserve research reports and frozen provenance.
README absorbed redundant PRODUCT.md; DESIGN/EVALUATION/INTERFACE were shortened
without deleting frozen benchmark artifacts or claiming historical checks are current.

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
