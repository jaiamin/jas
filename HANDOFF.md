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
- Updated viewer is running on port 8080 with process-local Anthropic credentials.
  It remains running at the user's request.

## Local viewer setup

- The existing viewer uses process-local Anthropic authentication; credentials are never
  persisted in source, this handoff, or global configuration.
- Ignored `.venv/viewer-scenarios/` contains local copies of the shipped scenarios with
  Anthropic assigned to every settler. Tracked scenario defaults remain unchanged.
- OpenAI's configured credential is still missing Responses API write permission.
- Preserve existing `runs.sqlite3`; diagnostic reproductions use in-memory copies.

## User testing and verification

- Refresh the user's forwarded port-8080 URL. Create a new run and press Play, or select
  a saved run, press Resume latest, then Play. Old checkpoints need no migration.
- Verify locally with `.venv/bin/python -m pytest -q` and
  `.venv/bin/ruff check src tests`.
- Real provider authentication/rate limits, configured budgets, and genuinely malformed
  actions can still stop a run; no substitute actions or hidden retries were introduced.
- Live verification used Anthropic; OpenAI still requires Responses API write access.
