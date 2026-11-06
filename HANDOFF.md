# Model decision reliability

## Acceptance criteria

- Valid actions continue when the model writes overlong rationale, memory, or radio text.
- Free text retains its documented character limits; malformed actions still fail validation.
- Each turn uses at most one model request; request/token caps and checkpoint replay remain intact.
- Regression tests and a complete live 120-turn simulation pass.
- The viewer runs in the Docker Sandbox on port 8080 for user testing.

## Diagnosis and decision

- Reproduced the user's failure in an in-memory copy of their saved run at turn 14.
- `UnexpectedModelBehavior` wrapped a Pydantic `string_too_long` error for rationale
  (400-character limit). The response used 284 output tokens, below its 600-token cap.
- Bound descriptive text before validation/persistence instead of discarding a valid action
  or spending extra requests to shorten it. Keep all action rules and model budgets intact.
- A longer live run exposed a second cause at turn 30: the model returned a top-level
  `message` instead of nesting it inside `action`. The request did not enable strict
  tool schemas. Explicit `ToolOutput(..., strict=True)` constrains the provider response.
- Work branch: `fix/model-decision-recovery`.

## Progress

- All acceptance criteria met. Both failures were captured; regression tests failed before
  their respective fixes.
- All 44 tests, Ruff, diff checks, and Gitleaks pass.
- Browser New run -> Play -> Pause reached turn 7; its checkpoint replay verifies exactly.
  The separate browser session was closed afterward.
- Live run `164ff7c6367c` completed all 120 turns without intervention, using exactly
  120 requests and 254,928 tokens under the original 300,000-token cap. All 120 saved
  turns replay-verified exactly. Its database is ignored `.venv/reliability.sqlite3`.
- Updated viewer is running on port 8080 with the inherited OpenAI credential.
  It remains running at the user's request.

## Local viewer setup

- Both shipped scenarios now use `openai:gpt-6-luna` for every settler. The viewer uses
  the shipped `scenarios/` directory and the inherited OpenAI credential.
- Ignored `.venv/viewer-scenarios/` contains local copies of the shipped scenarios with
  Anthropic assigned to every settler; these copies are retained but are not in use.
- OpenAI authentication now works. A live Luna turn completed with one request and
  replay-verified exactly using an in-memory journal. All 44 tests and Ruff pass.
- Model-default work is on `fix/gpt-6-luna-default`. Saved runs retain their original
  model configuration; create a new run to use Luna.
- Preserve existing `runs.sqlite3`; diagnostic reproductions use in-memory copies.

## User testing and verification

- Refresh the user's forwarded port-8080 URL. Create a new run and press Play, or select
  a saved run, press Resume latest, then Play. Old checkpoints need no migration.
- Verify locally with `.venv/bin/python -m pytest -q` and
  `.venv/bin/ruff check src tests`.
- Real provider authentication/rate limits, configured budgets, and genuinely malformed
  actions can still stop a run; no substitute actions or hidden retries were introduced.
- The complete 120-turn verification used Anthropic. Luna has a one-turn live smoke
  check; a complete Luna run has not been checked.

## Optional total-token budget

- Work branch: `feat/optional-token-budget`, following the Luna default change.
- Total-token budgets now default to `None` (no cap). Both shipped scenarios and the
  provider comparison omit the cap. Explicit positive `max_total_tokens` values are
  still enforced, including those in existing saved runs; no saved journal was changed.
- Token accounting, per-request input/output limits, request caps, timeouts and the
  120-turn scenario endpoint remain. Create a new run to use the uncapped settings.
- All 46 tests and Ruff pass. An offline regression accounts for 333,000 tokens across
  30 turns, pauses/resumes midway, and replay-verifies every turn. Request caps are
  tested with and without a total-token cap; saved explicit token caps remain enforced.
- Browser checks against a disposable journal confirmed a new paused Luna run shows
  `No total token cap`, and a saved capped run displays its numeric limit.
- The browser and temporary viewer were closed; the user's viewer was restarted on
  port 8080 with the existing journal. No live API requests were needed for this change.

## Viewer cost estimate

- Work branch: `feat/viewer-cost-estimate`. The usage row now shows whole-run estimated
  USD cost from stored input/output tokens, so saved runs work without migration.
- Rates cover Luna ($0.10/$0.50 per million input/output tokens), GPT-4.1 Mini
  ($0.40/$1.60), and Haiku 4.5 ($1/$5). OpenAI rates were verified against official
  model pages; Anthropic's pricing pages returned HTTP 403, so Haiku rates use the
  installed genai-prices snapshot. The snapshot's older Luna rate was not used.
- Estimates exclude credits, cache discounts and unknown pending/failed usage.
  Unknown usage adds a partial label; mixed or unpriced models show unavailable.
- All 51 tests and Ruff pass. Disposable browser checks verified a nonzero saved-run
  estimate, the partial marker and a new run's zero estimate. No live API calls were made.
- The temporary viewer and browser were closed. The user's viewer was restarted on
  port 8080; refresh the page to see estimates for existing or new runs.

## Evaluation workspace redesign

- Branch `feat/evaluation-workspace`, based on cost-estimate work. Full UI replacement
  explicitly requested with Impeccable. User chose a mix of browsing/comparing saved runs
  and live monitoring; environment-panel placement delegated to implementation.
- Runs-first library, comparison, separate setup, environment catalog, and a shared
  Overview/Environment/Decisions/Configuration workspace are implemented. Colony-specific
  UI remains in its registered panel. No runner/policy/budget or journal-schema changes.
- Lightweight history/read helpers avoid decoding all saved checkpoints for analysis.
- Plan and acceptance criteria: `UI_REDESIGN.md`. Direction: Research index, code-led
  Operate. Concept service unavailable; degraded local assignment recorded in plan.
- 55 tests, Ruff and diff checks pass. Browser flows use a disposable TestModel journal,
  with no provider requests. Captures span 1440, 1280, 1024 and 390 widths; automated axe
  reports zero violations in library, overview, decisions, setup and mobile Environment.
- Independent Impeccable review scored all five listed material fixes resolved and returned
  `ship` for that list: exact recorded decision input vs post-turn state, separate chart
  legend/axis, responsive drawer completion, replacement design documentation, and map
  accessibility. Review/documenter used the installed fallback role definitions; the remote
  concept service/card was unavailable. Evidence stays in ignored `.impeccable/review/`.
- DESIGN.md and `.impeccable/design.json` capture the source-backed system. PRODUCT.md and
  README describe the confirmed mixed evaluation/live workflow and environment extension.
- All 55 tests, Ruff and diff checks pass. Browser errors were empty. All inspected axe
  states have zero violations; one incomplete contrast check requires manual judgment.
- Viewer restarted on port 8080 using `.venv/bin/sandbox view --host 0.0.0.0 --port 8080`.
  HTTP 200 and read-only inspection of an existing 7-turn saved run passed. It remains running
  at the user's request. Existing journal, model configuration and credentials preserved.
- QA services8081/8082, browser and generated QA journal/scripts are closed/removed. No new
  live-provider run was performed for this UI change. Real provider availability remains
  governed by existing credentials and limits; fresh model runs still default to GPT-6 Luna.

## SaaS interface refinement

- Branch `feat/saas-ui-refinement`, based on `451fbf3`. The user requested a restrained
  all-page refinement using Impeccable, keeping the dark identity and table formats.
- Compact breadcrumb shell, integrated run-table toolbar, denser rows and controls,
  narrower setup, scenario tables, side-by-side comparison and Configuration sections,
  tighter analysis/evidence layouts, and reduced instructional/debug copy.
- Completed live runs now immediately offer recorded Replay. Simulation, provider,
  budget, accounting and persistence behavior remain unchanged.
- Plan/evidence: `UI_REFINEMENT.md`. Independent documentation refresh merged current
  sizing into `DESIGN.md` and all nine sidecar specimens. Independent finish verdict:
  `ship`, no blocking findings. Optional documentation notes are resolved.
- All 55 tests, Ruff and changed-file formatting pass. Repository-wide format check
  finds pre-existing differences in sandbox.py and two test files, outside this task.
- Browser checks cover 390/768/1280/1440 widths and all pages, filters, comparison,
  paused creation, completion, recorded replay, decision evidence and responsive nav.
  Two disposable 3-turn TestModel runs used exactly 3 requests each and replay-verify;
  playback added no requests. No live provider requests were made.
- Inspected axe states have zero WCAG A/AA violations. SVG contrast was checked manually
  (tested text pairs 6.32–10.75:1). Final browser console is clean. One Impeccable scan
  retained pinned Roboto intentionally; updated sizes are documented.
- The user's viewer remains running on port 8080, exec session 9751. HTTP 200 and
  read-only inspection of its existing 8-run journal/7-turn saved run pass. Refresh
  the forwarded port to see changes. QA ports 8081/8082 and the browser are closed.
- Ignored evidence stays in `.impeccable/review/saas/`; generated QA scripts, tools and
  databases are disposable and removed after verification. Existing journals untouched.
