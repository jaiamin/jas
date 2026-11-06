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
