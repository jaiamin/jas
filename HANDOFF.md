# JAS handoff

## Current state

Implementation, frozen evaluation and OSS benchmark cleanup are complete on
`feat/rigorous-evaluation`; existing draft PR: https://github.com/jaiamin/ass/pull/6.
Cleanup keeps 22 files under 0.5 MB: reusable harness, frozen dataset/families, protocol,
review, original final declaration and four compact result documents. Generated artifacts
are ignored; every historical file was archived and byte-verified before removal.
Historical evidence remains at commit `a2ce6ba940398ca12b2c8baba25787e0d43f5c10` and
`data/quality/archive-a2ce6ba/benchmarks/`. Recovery/replay commands are in the results report.
No frozen source/test/prompt/case/scorer changed; source/suite hashes still match.

Cleanup checks passed: 302 backend tests; Ruff formatting/lint, ty, diff checks; complete
5,208-check validity gate, 336 privacy assertions and five disclosure witnesses; documented
archive replay of 96 runs / 3,692 decisions and exact regenerated comparison equality;
local documentation links, JSON parsing, artifact ignore rules and secret scanning.
Frontend rebuilt for the requested manual preview. No new paid evaluation requests.

User requested the app left running on port 8080. Uvicorn PID 65794 (exec session 96698),
0.0.0.0:8080, fresh dedicated database `data/quality/manual-preview.sqlite3`, normal `.env`
provider configuration. Health, entry assets and experiment/environment/Agent routes passed
HTTP checks. Leave it running for the user; do not touch other sessions/services.

The existing draft PR is the review target; do not create another PR or merge.
Remote CI for the cleanup has not yet been observed.

## Frozen evaluation record

Freeze commit: `53f42e5`; production fix commit: `8b3e77d`.
Source: `7f2a136a2d71124fc5b962fb0fde3f5b5bd77de35453e7a63f04d22a2a69997a`.
Suite: `c05f3f353bcd6be3aeba94b145517e7b2e935907bbe1914b09d3f1bac4d3a8ff`.
336 synthetic cases, 28 author-reviewed families (18 development / 10 held-out).
Held-out: planner 206/240; participants 96/96; strict analysis 96/96. No post-held-out tuning.
Independent replay: 576/576 runs, 21,720 decisions. All failed iterations remain recoverable.
26,688 Luna calls: $13.608157 charged/reserved of $75; 11 unknown reservations retained.
Canonical ledger: `data/quality/aggregate.sqlite3`. Never reset it. No further model spending.
Original verification: 302 backend, 66 frontend, 65 browser tests; lint/types/build,
archive Docker smoke and archive-aware secret scan passed.

## Constraints and limits

No questions/new agents/paid calls. Never merge, push main or rewrite published history.
System `uv` crashes; use `.tools/uv-0.13.7.data/scripts/uv` or installed `.venv` tools.
Public historical traces omit all thinking parts/signatures; no secret-scan bypasses.
Known limits: author-correlated synthetic specs; three heterogeneous blocks give weak
uncertainty; larger teams trade rounds for agents; missing truth-redraw planner metadata,
ambiguous bundled memory comparisons and occasional narrative errors. Strict numerical
compliance does not certify useful insight, human validity, intent or weight learning.
