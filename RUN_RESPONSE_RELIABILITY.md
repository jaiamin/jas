# Reasoning response truncation

## Acceptance

- Reproduce the reported failure from the saved turn-5 checkpoint without advancing
  the user's run or printing credentials.
- Provide sufficient default response space for thinking and the structured decision.
- Persist a specific, safe explanation for truncated outputs, with actual usage when
  reported. Preserve explicit caps, one request per turn and checkpoint rollback.
- Recover the stopped run's response allowance with an auditable, reversible setting
  change; preserve every frame and all existing usage/call counters.
- Verify offline regression tests, a live continuation in isolation, and the viewer.

## Evidence and decisions

- Latest run stopped at turn 5, uses GPT-6 Luna, has a 600-token response cap and no
  total-token cap. Stored errors contained only the exception class.
- One live replay passed. Repeated isolated trials reproduced truncation on the fourth
  subsequent attempt: HTTP 200, status incomplete, reason max_output_tokens, output
  600 tokens including 503 reasoning tokens. Decision JSON ended inside a string.
- Official OpenAI structured-output documentation confirms incomplete outputs can
  occur at max_output_tokens. Pydantic AI documentation distinguishes thinking-only
  truncation (UnexpectedModelBehavior) from truncated calls (IncompleteToolCall).
- Tests replay both through the real OpenAI SDK using an in-process HTTP transport;
  all three tests failed before the fix. No network in automated tests.
- Raise new-run defaults to 4096; preserve thinking, explicit scenario limits, strict
  schemas, request limits and retry behavior. Translate only length-finished model
  errors to a safe explanation. Settle provider-reported usage even for invalid output.
- The stopped run's old 600-token allowance will be recorded in experiment metadata
  before the explicit recovery update. Do not silently migrate other saved runs.

## Progress

- [x] Capture failure and deterministic SDK/runner regression tests.
- [x] Implement and verify the fix and accounting regressions.
- [x] Continue isolated live checkpoint, recover saved setting, restart viewer.
- [x] Clean diagnostic artifacts, scan and commit.

## Verification and recovery

- All 58 tests pass, including real SDK transport regressions for partial decision JSON,
  thinking-only truncation, exact failed-response accounting and unknown-usage reservation.
  Ruff and changed source/test formatting checks pass.
- An in-memory copy of the stopped journal continued from turn 5 through turn 15 using
  GPT-6 Luna with the 4096-token allowance: 10 real decisions, exactly 10 requests,
  10041 input tokens and 3239 output tokens. Recorded replay verified through turn 15.
  This bounded check does not guarantee every future provider response will succeed.
- Run `2dd9c2a6c284` was still failed at turn 5 with 6 calls before recovery. In an
  atomic transaction, only its response allowance and metadata were updated. Metadata
  records the previous 600-token value, new 4096-token value, time, turn and reason.
  All frames, status/error, model selection and usage/call counters remain unchanged;
  historical unknown usage was not inferred from the diagnostic replay.
- Loading Resume's Runner restores turn 5 with 4096 and verifies all five recorded
  turns. The original run was not advanced by diagnostics or recovery.
- Viewer restarted on port 8080; HTTP 200. No UI code changed; verification covers
  the resume loader and HTTP service, without a browser interaction check.
- Temporary diagnostic scripts and captured provider payloads removed. Staged
  Gitleaks scan reports no secrets; changes checkpointed on the task branch.
