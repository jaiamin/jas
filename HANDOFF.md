# JAS handoff

2026-11-10. ROOT owns `integration/research-harness` in this checkout.
The [merge-readiness repair report](docs/research/MERGE_READINESS_FIXES.md) and
[repair verification](docs/research/MERGE_READINESS_VERIFICATION.json) supersede
the earlier partial-suite merge gate. Complete local qualification at `885f3846`
precedes the cleanup and two scoped follow-up repairs below; hosted CI must pass
the published follow-up source before merge readiness.
The compact [final review](docs/research/FINAL_PRODUCT_REVIEW.md) and
[numerical benchmarks](docs/research/FINAL_RUNTIME_RESULTS.json) replace the
closed local research captures. Earlier source and documentary history remain
in Git; retired raw evidence cannot be independently reread.

## Current state

2026-11-11 Home background replacement: use the user's second city GIF as
`frontend/public/illustrations/city.gif`, with `city.webp` as its reduced-motion
still. Superseded GIF/poster, procedural map generator/component/tests and map-only
CSS are removed. Catalogue environment art is unchanged. The latest instruction
supersedes the intermediate fixed-native-width design: fill all available width
with CSS cover, fixed 320px height, centered skyline at 35% vertical focus. There
is no resize JavaScript or bottom divider.

The top and center stay full. The final lower corners round slightly farther
toward the middle, following the last user refinement. Opaque pixel ribbons
with irregular 1–4px pitches become sparse toward the outside.
Stepped ends, detached flecks and correlated thicker clusters follow the user's
second, close-up recording. There is
no continuous alpha veil, full-image blur or opacity animation. Twelve texture
bands per corner flow continuously outward (left goes left, right goes right),
with seamless repeats and varied forward-only speeds instead of a reversing sway.
The source generator is in
`frontend/scripts/generate_home_dissolve.py`. A single SVG's `#still` view freezes
the same strips. Reduced motion, hidden documents and offscreen placement switch
to poster/static mask. The title is restored above the composer; dark neutral text
uses a feathered white 75% tint and 6px backdrop blur, with no dark scrim.
The final halo stretches into a broad oval, 8rem beyond each end and 2rem vertically,
with gradual multi-stop falloff into the city. Heading spacing is 152/156px phone/desktop;
the final 16px title/composer gap moves the composer 8px above the earlier placement.

Final checks are recorded in `.tools/home-gif/verification.json`: 14 Home browser
cases pass at the final render source, including actual outward motion/seamless
repeats, stable top/core, reduced-motion freeze, responsive bounds and composer
workflows. Frontend lint (241 files), TypeScript/build, generator Ruff and exact
regeneration pass. All 162 frontend units in 37 files pass at the final source.
Both themes were inspected at 390/1440px, plus the 1280px user and 2400px wide views.
Fresh full design review passed; the final expanded halo also passed its focused
visual verdict with no remaining findings. Earlier interrupted reviews predate
user steering and are not claimed as final acceptance.
No external provider call, dependency install, user data reset or application
restart occurred; localhost8080 serves the current built assets. Hosted CI on
final publication remains a gate. Earlier failed diagnostics remain retained.

Shared disk fell below the historical margin during iteration. Only closed own
`.tools/merge-review/*/tmp` test SQLite/JSON payloads were losslessly gzipped:
137 files/57,210,154 bytes became3,394,139 bytes, with full independent decompression
hash/size verification before each original was removed. Restoration metadata is
`.tools/home-gif/closed-test-compaction/restoration.json`; old raw tmp paths now
require that map. Logs, JUnit, receipts, live data, dependencies and shared caches
were untouched. Free measured97,468,416→151,011,328 bytes at that boundary.
Later obsolete generated build copies and successful screenshot sets were
retired with inventories in `.tools/home-gif/generated-retirement.json` and
`superseded-success-retirement.json`. These disposable outputs are no longer
retained; failed diagnostics, logs, run statuses and live assets remain intact.
Two decoded reference frames were also retired; the original supplied recording
and middle reference frame remain available. No shared cache was changed.
Later shared free fell below the historical 134,217,728-byte margin; this UI
continuation does not claim that margin held. Only bounded local checks/captures
ran, with no cleanup outside this checkout or other-owner reads.

The cleanup removes two confirmed unused frontend modules and consolidates49
superseded documents into the compact historical report. Current guides and links
are updated. Specifications, executable benchmark oracles and user data are
preserved. Cleanup verification is recorded with the merge-readiness results;
hosted CI must pass on the published cleanup commit before handoff.
Hosted CI exposed late-provider-notice transcript overlap. The newest reply now
renders eagerly and native following preserves spacing through viewport changes,
with initial question anchoring and manual upward reading retained. A reproduced
disconnected-asset server error is fixed by forwarding ASGI messages through the
same origin/header guard. No exception suppression or compatibility path is added.

T12, T17 and T18 are integrated and accepted for bounded deterministic
DEVELOPMENT. The [compact history](docs/research/RESEARCH_HARNESS_COMPACT_REPORT.md)
summarizes their fixes and scope; full retired reports remain in Git history.
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

- The complete backend suite passes1831 cases in568.25s at `885f3846`;
  whole Ruff and global types pass. Earlier partial runs and failed fixture
  corrections remain separately attributed, not added to this count.
- Frontend169 units, lint, forced TypeScript and a fresh isolated build pass.
  The uninterrupted182-case default browser run and20 affected opt-in trial
  cases pass. Local default tracing was disabled to fit shared disk; every
  assertion ran, and hosted CI retains its normal failure tracing.
- The follow-up passes51 API/streaming/lifecycle cases,169 frontend units,
  whole Ruff/global types, frontend lint/forced types and build. The controlled
  last-reply/late-notice/manual-reading browser regression passes8 repetitions.
  All51 affected browser cases and independent Standards/Spec reviews pass.
  The final browser log has no backend traceback. Source and bundle attribution
  are in the verification record; current hosted CI remains the merge gate.
- Admission now revokes containment after worker/cleanup failure. Public
  regressions include launch denial, nonzero exit, incomplete cleanup and real
  allocation/teardown exceptions, with immutable failures and fresh qualification.
- Real browser observations cover desktop/phone, both themes, keyboard,
  generation/adjudication and GET-only recording playback. Settled dark/phone
  accessibility audit:0 violations/0 incomplete. Mechanical TSX scan:0 findings;
  that detector does not establish rendered contrast.
- Earlier image qualification passes non-root production smoke at its recorded source
  and identical native/image assets. Native two-lifetime restart/requalification,
  exact saved run/export, missing-key409 and zero-call replay pass.
- Final unchanged runtime benchmark passes4/24/240 non-model turns, replay/export
  and zero provider calls. Full samples and tradeoffs are in the numerical report.
- Frozen T01 CURRENT still exits1 on exactly four export-v4 checks. Its baseline
  source/cases were not retuned. Fresh current-contract5/22/22 qualification is
  separate; the retired historical BEFORE comparison is not reconstructed.

## Local application

The app runs at **http://localhost:8080**; the current PID is recorded in
`.tools/final/live/server.json` (518143 at the cleanup refresh). The workspace now
contains a user conversation and recorded provider usage. The refresh preserved
the same database inode, exact public state/conversation hashes and usage; it
made no model calls. Keep this data, current assets and dependencies. The local
launcher is `.tools/final/live/serve.py`; it consumes assigned configuration normally
and explicitly selects this checkout's `data/jas.sqlite3` after dotenv
loading. Starting the server performs no paid work.

Preserve original `pbcopy`, credentials/configuration, Git/stash, shared caches,
`.tools/uv-bootstrap` and all other worktrees. Never revive retired restoration
maps as retained proof. Use normal hooks/Gitleaks and task-branch commits only;
no PR merge, default-branch push or history rewrite is authorized.
