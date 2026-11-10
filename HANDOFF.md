# JAS handoff

2026-11-10. ROOT owns `integration/research-harness` in this checkout.
The [merge-readiness repair report](docs/research/MERGE_READINESS_FIXES.md) and
[repair verification](docs/research/MERGE_READINESS_VERIFICATION.json) supersede
the earlier partial-suite merge gate below. Local complete verification passes;
hosted CI must pass on the published repair commit before merge readiness.
The compact [final review](docs/research/FINAL_PRODUCT_REVIEW.md),
[verification manifest](docs/research/FINAL_VERIFICATION.json) and
[numerical benchmarks](docs/research/FINAL_RUNTIME_RESULTS.json) replace the
closed local research captures. Earlier source and documentary history remain
in Git; retired raw evidence cannot be independently reread.

## Current state

T12, T17 and T18 are integrated and accepted for bounded deterministic
DEVELOPMENT. Their independent integration reports record fixes and scope.
T20 live/held-out competence and live adjudication accuracy remain open.
No external provider or paid request was made during final qualification.

The sole contract is database15/export18/library10/definition2,
research-operation2/generation-event-v2. Incompatible databases, environment
records and rule checkpoints reject explicitly. No compatibility reader,
migration, alias, substitute policy or automatic reset is provided.

The interface uses stock controls, semantic tokens and progressive disclosure.
It covers Agent drafts, custom experiments, finite-contract inspection,
explicit generation allowances, declared adjudication and saved-turn playback.
The four reported exposure/usage/commitment/provenance bugs reproduced and were
fixed. Later review fixed export/inspection snapshot races and generation
restart publication/reconciliation defects.

## Qualification

- The complete backend suite passes1831 cases in568.25s on the repaired source;
  whole Ruff and global types pass. Earlier partial runs and failed fixture
  corrections remain separately attributed, not added to this count.
- Frontend169 units, lint, forced TypeScript and a fresh isolated build pass.
  The uninterrupted182-case default browser run and20 affected opt-in trial
  cases pass. Local default tracing was disabled to fit shared disk; every
  assertion ran, and hosted CI retains its normal failure tracing.
- Admission now revokes containment after worker/cleanup failure. Public
  regressions include launch denial, nonzero exit, incomplete cleanup and real
  allocation/teardown exceptions, with immutable failures and fresh qualification.
- Real browser observations cover desktop/phone, both themes, keyboard,
  generation/adjudication and GET-only recording playback. Settled dark/phone
  accessibility audit:0 violations/0 incomplete. Mechanical TSX scan:0 findings;
  that detector does not establish rendered contrast.
- Fresh image builds and passes non-root production smoke with current source
  and identical native/image assets. Native two-lifetime restart/requalification,
  exact saved run/export, missing-key409 and zero-call replay pass.
- Final unchanged runtime benchmark passes4/24/240 non-model turns, replay/export
  and zero provider calls. Full samples and tradeoffs are in the numerical report.
- Frozen T01 CURRENT still exits1 on exactly four export-v4 checks. Its baseline
  source/cases were not retuned. Fresh current-contract5/22/22 qualification is
  separate; the retired historical BEFORE comparison is not reconstructed.

## Local application

The app runs at **http://localhost:8080**; the current PID is recorded in
`.tools/final/live/server.json` (507105 at the repair refresh). The workspace now
contains a user conversation and recorded provider usage. The refresh preserved
the same database inode, exact public state/conversation hashes and usage; it
made no model calls. Keep this data, current assets and dependencies. The local
launcher is `.tools/final/live/serve.py`; it consumes assigned configuration normally
and explicitly selects this checkout's fresh `data/jas.sqlite3` after dotenv
loading. Starting the server performs no paid work.

Preserve original `pbcopy`, credentials/configuration, Git/stash, shared caches,
`.tools/uv-bootstrap` and all other worktrees. Never revive retired restoration
maps as retained proof. Use normal hooks/Gitleaks and task-branch commits only;
no PR merge, default-branch push or history rewrite is authorized.
