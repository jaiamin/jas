# JAS handoff

ROOT owns `feat/research-quality`, based on `5f2523e58c7a851482f6a1ed3c2590eaa01696c4`.
This task implements the ten research-quality recommendations; the durable acceptance
criteria, methods, decisions and progress are in
[the implementation plan](docs/research/RESEARCH_QUALITY_PLAN.md).

## Current boundary

Research contracts/calculations/scientific diagnostics, matched value scenarios,
actor-only local-value control, opt-in event waiting, authoring/findings/completion
UI and bounded schema caches are implemented. Export is now19; DB15/library10 and
World transition versions are unchanged. No migrations, resets or legacy aliases.

Targeted backend/public HTTP/reopen/export-snapshot tests and all165 frontend units
pass at recorded sources. Full backend/browser verification, final independent review and publication remain
pending. The three new browser flows and live repaired requests pass. Static failures
and fixture-authoring failures are retained in `.tools/research-quality/`; do not
claim a clean first attempt. The tracked frozen development cases are in
`benchmarks/research-quality-development.json`.

The user authorized $15–20 additional live spend: use $20 as an aggregate hard ceiling,
including failures and unknown reservations. Stages01/02 retain FAILED interpretations;
stage03 passes their remaining repaired path and a small redraft. One restored ledger
settles94 requests and $1.153843, partial=false. Sixteen actual matched trajectories
completed and replayed. All live resources closed/port18145 reusable. The ledger
has the same $20 total cap and uses Sol for the assistant and Luna participants,
no automatic provider retry or substitution. Run only one paid workspace at a time;
stop on unknown usage. All task artifacts/databases use `.tools/research-quality/`,
port18145 for live and18146 for browser checks. Use shared checks.lock for bounded jobs.

## Preserve the existing app and pilot

The user's app is on8080; read fresh PID/launcher identity from
`.tools/final/live/server.json`. Do not retry or mutate the user's original24-run
study (`0c1f6370d8e841a4`) or reset `data/jas.sqlite3`. Its read-only audit is in
`.tools/run-audit/0c1f6370d8e841a4/FINDINGS.md`: completion was natural rather than
missing turns, seed labels did not vary initial states, and longer delays mostly
added waiting/provider costs. Preserve its original Terra model attribution.

The current frontend build has refreshed frontend/dist, which8080 serves. Its
Python process still has the earlier backend loaded. Do not describe8080 as final
qualified source until an explicitly idle, identity-checked refresh is completed.
Do not interrupt user work to refresh it.

## Tooling and remaining work

Use existing `.venv/bin/python -B`, Ruff and ty directly: uv crashes on this VM.
Frontend deps were installed normally with frozen pnpm12.18/hardlinks; lock/package
bytes are unchanged. No global install or outside-checkout cleanup is authorized
by this task. Earlier uv-cache cleanup belongs to the closed prior evaluation.

Finish broad regression failures, browser flows, real bounded model evaluation and
manual semantic assessment; record actual source/ledger attribution. Update the plan
and focused docs, normal-hook commit, run fresh Standards/Spec review, then publish
one draft PR. No main push, merge or shared-history rewrite. New World waiting-cost
mechanics, independent semantic certification, human validity and model generality
are explicitly outside observed qualification, not silently assumed to work.

Earlier task receipts/reports remain historical evidence. Closed own per-test SQLite
may be losslessly compacted after teardown with the existing verification/map plugin;
never remove user data, original failures or another owner's artifacts.
