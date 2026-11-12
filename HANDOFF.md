# JAS handoff

## Current: Railway deployment repair

PR #39 is merged into main (`3b918ff9`). Branch `fix/railway-deployment` starts
there. User authorized Railway log inspection, configuration and deployment repair.
Confirmed: initial image built successfully; deployment `d59c1950` crashed opening
SQLite on the root-owned `/app/data` volume. Existing volume and databases must
remain intact. No paid model calls are needed or authorized by this deployment task.

Acceptance: initialize only the mount directory, run the app as 10001, password
protect hosted reads/actions, retain host/origin checks, and verify restart
persistence and actual production containment. Preserve native/Compose local setup.
Keep one replica, no sleep and graceful shutdown in Railway's service settings;
focused hosting instructions are in `docs/DEPLOYMENT.md`. No deprecated Railway
config format or new platform dependency. Credentials stay outside Git/logs.

Progress: access/API regressions pass (76 cases), Ruff/ty/workflow lint pass, and
both default Compose and root-owned-volume authenticated production smoke pass,
including containment, guard refusals and restart persistence. Full backend suite
is running. Railway auth/host/bootstrap variables configured with secrets via stdin,
without triggering an old-image deployment. Tested deployment, final health and
source delivery remain pending. Do not claim hosted success until the exact
deployment reports SUCCESS and public/protected HTTP checks pass.

## Previous delivery and evaluation

GitHub repository renamed to `jaiamin/jas`; origin, app link, docs and test
expectations use the new name. Existing PR #38 and issue numbers are preserved.

Delivery correction: PRs #37/#38 merged into `feat/research-quality`, not `main`.
`fix/integrate-research-updates` starts at main `c0f9a941` and carries exactly those
two squash commits, with original commit references. Its complete tree matched
qualified `ef2194a1` before these documentary status corrections. Deliver through
one follow-up PR targeting `main`; do not reuse the obsolete feature-branch base.

## Completed: live Agent and participant evaluation

User-authorized aggregate ceiling $15. Final isolated ledger retained $4.115505
charged/reserved: $4.111282 known settled + $0.004223 unknown timeout reservation.
2,105 provider records, zero pending; no further paid evaluation is active.
Assistant GPT-6.1 Sol, participants GPT-6 Luna. No retries/substitutions or user-data
reset. Database16/export20/library10 unchanged.

Report and criteria: `docs/research/LIVE_AGENT_EVALUATION.md`. Final live batch 52/52
runs, all 12 environment families, 539 turns, 675 participant requests, all exact replay
and JSON exports. Separate real browser draft/save/run/results flow 2/2 complete.
Artifact source-delivery/privacy audit passed; semantic quality reviewed with explicit
limits. No independent blinded scoring, population or general-intelligence claim.

Repairs: closed operation-specific provider records and canonical action decoding;
last-request decision reservation; current artifact write preconditions; canonical
paused-tool restoration; visible bounded malformed-draft correction; progressive
compaction of requested observations retaining legal actions/current versions.
All failed attempts remain in ignored local evidence. No old runs relabeled or rerun.

Final local checks: backend 1,894; browser 191; frontend 141; lint,
formatting, global types and frontend build pass. Hosted CI remains an account-billing
blocker until fresh checks actually run. PR #38 is merged; the follow-up targets main.

Keep user app 8080 running. Read `.tools/run-8080/server.json` for current identity;
`activate-8080-03/receipt.json` proves preserved database inode/all 14 tables/78 provider records.
Evaluation tab and 18149/18150 services are closed. Same private evaluation DB:
`.tools/checkout-tool-limit/live-luna-01/workspace.sqlite3`. Never spend from a fresh
ledger that bypasses this aggregate ceiling. Evidence: `.tools/agent-e2e-15/`.
