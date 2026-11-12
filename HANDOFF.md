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

Complete: all 1,919 backend cases pass (528.11s), including 76 access/API cases.
Ruff/ty/format checks and Actionlint pass. Production image build, default non-root
Compose smoke and root-owned-volume authenticated smoke pass, including actual
containment, symlink/ownership refusals, existing-file preservation and restart
persistence. Initial local Compose smoke correctly stopped on inherited provider
availability; recreated with explicitly empty keys, then passed. No paid calls.

Railway project `jas`, production service `jas`: deployment `105efe70` from code
checkpoint `64ca7faa` reports SUCCESS. Public domain ACTIVE on 8080; live health200,
protected UI/API/assets200, unauthenticated reads/writes401, cross-origin writes403,
provider requests0. Existing volume retained. Auth secrets set through stdin; login
name `jas`. Draining allowance120s saved via the typed service update (CLI dot-path
edit was a no-op); one replica/no sleep retained. No deprecated platform config.
Direct SSH inspection was unavailable without SSH keys; no keys/access added.
Non-root UID/group/ownership and restart evidence is from the actual local image.

Draft PR #40 targets main. Merge it before the next GitHub-source deployment so
main includes the fix; no PR was merged or default-branch push performed here.
Fresh GitHub Actions checks were refused before starting by account payment/spending
limits (observed annotation on run43311755857), not test failures. Clear that billing
block and rerun hosted CI. No service, database or model credentials in tracked files.
All disposable test containers/volumes are removed. User's local8080 remains healthy.

## Previous delivery and evaluation

GitHub repository renamed to `jaiamin/jas`; origin, app link, docs and test
expectations use the new name. Existing PR #38 and issue numbers are preserved.

PRs #37/#38 initially merged into `feat/research-quality`, not `main`.
PR #39 corrected delivery by carrying exactly those two squash commits from main
`c0f9a941`, with original commit references. Its complete tree matched qualified
`ef2194a1` before documentary status corrections. It is now merged into main.

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
