# MVP redesign acceptance

The November 13, 2026 product specification defines this MVP. v0.2 features are
excluded. This checklist retains the requirements and separates local implementation
from public-launch acceptance. Installation, execution and provider credentials stay
local; the optional public gallery receives reviewed finished evidence only.

## Product decisions

- Keep the sidebar, Geist, blue primary actions, light/graphite themes and Home sky.
- Show exactly three Home starters; retain all six protocols and free recordings.
- Use a compact usage meter and direct Settings link in the sidebar footer. Theme
  switching lives in the top-right header. Local use needs no account or chooser.
- Assistant replies show a quiet actual-cost receipt; call/token details open on demand.
- Quick and Advanced edit one protocol. Preserve invalid/raw drafts; Developer
  exposes Specification within Advanced. Saving never starts model work.
- Unknown prices remain unknown; require a token ceiling. Never treat a token cap
  as a dollar guarantee or recalculate historical charges after a price change.
- Publish one frozen version and all its planned runs, including reviewed agent-private
  evidence. Exclude provider keys, Assistant conversations and discarded versions.
- Replay is independent and free. Failed/unsupported replay permits publication with
  explicit reasons and no verified badge. Never execute uploaded environment code.
- Default publications to unlisted. Scan before upload; genuine leaks in immutable
  evidence block publication. Only documented synthetic email false positives may
  be reviewed. Preserve the local evidence and create a clean version/run if needed.
- GitHub identity is only for publishing. Store scoped, revocable tokens in the OS
  keychain. Require seven-day account age, at most ten publications per day and
  25 MiB per record. Reports stay in the operator's private queue.
- Pair matched runs by version, seed and repetition. Compare actor/schedule, accepted
  action/message and enforced consequence; report initial-state differences separately.
- Preserve the existing Railway runner and volume. Do not deploy or provision during
  this local review. A separate gallery target is ready for operator configuration;
  its initial $10/month target needs a concrete service/storage/egress/domain review.

## Implementation and acceptance evidence

| Requirements | Local evidence | Remaining acceptance |
| --- | --- | --- |
| M01 | Fresh six-seed live confirmation completed and replayed: allowing messages increased mean contribution from 0.170370 to 0.411111, positive on 5/6 seeds, meeting the frozen threshold. All attempts retained in the private local archive. | This finite setup does not establish broad model behavior or a public launch corpus. |
| M02–M04, M21, M30 | Bundled wheel/CLI, provider and unknown-price accounting tests; installed-wheel smoke; key-canary checks for exports and final publication serialization; consistent backup without provider keys. | Registry release and fresh stranger/install timing; live integration with every external provider is not established by fixture tests. |
| M05–M11, M20 | Six scripted recordings, three Home cards, onboarding, Quick/Advanced drafts/checks, Assistant scope/restoration and catalogue visibility tested in the browser. | External first-run usability checks. |
| M12–M19, M33–M34 | Results/seed dots/grid, frozen design diff, shared viewer/privacy, playback/moment links, replay and matched alignment have backend/unit/browser checks. | Five cold viewers must independently explain a run. |
| M22–M29, M31–M32 | Public record/scanner, independent replay, immutable publication, split files, metadata/social PNG, anonymous mobile viewer, gallery filters, device approval/revocation and fresh-workspace fork/replay tested locally. Separate non-root gallery container smoke passed. | Live GitHub OAuth, OS keychains on supported platforms, private S3 storage, actual cross-machine publish/fork and hosted cache/removal checks. |
| M35 | Actual 20-second replay GIF in README; internal research work logs archived outside the tracked public tree; focused setup/architecture/publishing/operations guides. A short tracked HANDOFF is retained by the latest repository instructions. | Hosted CI was previously refused before jobs started by account billing limits; account-owner action is required. |
| M36 | Terms, report/takedown path, limits and operator launch checklist implemented. | Review provider terms; create 10–15 genuine publications under a separately approved budget; five cold viewers; ten outsider runs and three publishes. Never substitute scripted demos for these checks. |

## Requirement and acceptance checklist


Each requirement needs implementation evidence and an observed check before it
can be marked complete. Existing code is a starting point, not proof of acceptance.

| ID | PDF | Required outcome / acceptance |
| --- | --- | --- |
| M01 | 1, 17 | Find a clear live-model difference, state it in one sentence, and check it on new seeds before treating it as launch evidence. Never manufacture surprise or equate scripted behavior with model findings. |
| M02 | 5, 14 | One-command wheel install includes the built frontend, uses installed assets and a durable workspace location, opens a browser, and retains Docker as an option. Verify on a clean environment. |
| M03 | 5, 10 | OpenAI, Anthropic, OpenRouter and configurable OpenAI-compatible/local endpoints; arbitrary model IDs, searchable selection, known/editable prices, and explicit token limits when prices are unknown. Preserve accounting and no silent substitution/retries. |
| M04 | 10, 12 | Enter/test provider configuration in Settings, retain keys locally, isolate them from public records/exports, and test the final serialized payload with key canaries. Testing a paid provider requires an explicit action and an estimate. |
| M05 | 5–6, 8 | Six reusable starter experiments, including at least two realistic work settings; titles, time/cost information and watchable recorded runs without keys. Distinguish scripted demos from model evidence. |
| M06 | 8 | Home retains composer/sky, shows starter cards and watch actions, and adds a dismissible/completable watch → configure → run → publish onboarding strip. |
| M07 | 6–8 | Rename the helper Assistant; use `/experiments` routes; retain Runs/Environments and ad-hoc `/compare`; add Community → Gallery/My published and a sidebar budget meter. Agents destination waits for v0.2. |
| M08 | 8 | Quick builder is default, on one screen: question, world, agent/setup chips, one varying factor and levels, seeds/repeats, live runs/calls/cost estimate and free checks. Save never runs; Save and run is an explicit paid action. |
| M09 | 8, 10, 16 | Retain the complete editor behind Advanced, preserve all fields and invalid/raw drafts across navigation and mode changes, and resolve the spec's Advanced/Developer placement of raw JSON. |
| M10 | 8 | Preflight shows blockers/warnings/notes, including identical conditions, single seed, bundled changes, hypothesis leakage and invariant outcomes where mechanically detectable. Do not claim scientific validity. |
| M11 | 8 | Assistant keeps its page/history popup; proposals include run count and cost before opening in Quick. Add an in-place Ask about this panel to experiment/run pages with correct version/evidence scope and reconnect behavior. |
| M12 | 8–9 | Experiment has Overview, Results, Runs, Design and Publish tabs. Overview has question, one numerical headline, one chart and at most three limit chips with full detail reachable. |
| M13 | 9 | Results has conditions as columns, metrics as rows, every seed as a dot, failed/missing runs visible and cells opening their runs. Retain planned denominators, undefined metrics, repetitions and appropriate uncertainty. |
| M14 | 9 | Runs has a condition × seed status grid and table fallback for large designs. Design has frozen protocol, version picker and version diff. |
| M15 | 9 | Shared local/gallery run viewer: agent identities/model/setup/holdings left; observation → action → messages → consequence center; current world/metrics/history right. Agent-perspective mode must distinguish available observations from delivered model inputs. |
| M16 | 9, 15–16 | Recorded-turn scrubber with ticks, Space/arrow shortcuts, 1×/2×/4× speeds, reduced-motion behavior, `?turn=` and copy-moment link. Read-only playback makes no model calls. |
| M17 | 9 | Rule-declared key moments derive from typed events, never model narration. Move rules/environment versions into a drawer; retain full raw evidence inspection. |
| M18 | 7, 9 | Full experiment/condition/seed breadcrumb; live viewing, pause/resume and actual spend; explicit zero-call replay verification with truthful badge and failure reasons. |
| M19 | 9 | Same-seed/two-condition matched diff shares a scrubber and marks first divergence. Define pairing including repetition, alignment, unequal lengths, initial-state differences and what counts as divergence. |
| M20 | 10, 16 | Environment cards explain question/agent count/typical cost/game-or-work tag; work settings first. Hide candidate review, reviewed_finite, sealed_relay and narrow pickup-note judging as specified without destroying existing evidence. |
| M21 | 10 | Settings covers provider/model editing, workspace/experiment budgets, publishing sign-in/default visibility, data location/backup/export-all and Developer controls. Planner web research is off by default. |
| M22 | 10–11 | Publish selected finished evidence after review/scan; title, finding, ≤3 tags, featured run, public/unlisted choice and per-run replay outcomes. Every publication version is immutable; author can unpublish. |
| M23 | 10, 12–13 | Secret/email scanner blocks publication until resolved; keys, local paths and hidden reasoning never leave. Preserve original local evidence and explicitly resolve scanner hits without silently rewriting immutable checkpoints. |
| M24 | 11, 14 | Phone-first public page: title/finding/author/date, explanatory verification badge, condition/seed chart, featured shared viewer, design/cost/rule versions, full limits, fork/download/cite and lineage. Load run records on demand. |
| M25 | 11, 15–16 | Generate PNG social card with title/finding/small chart and Home-sky identity; correct social metadata and preview. |
| M26 | 11 | Gallery cards, world/model/tag filters, newest/most-forked sorts, hand-curated feature row and report action. No likes/comments/follows/feed/universal leaderboard. |
| M27 | 11–12 | GitHub-only publishing identity, public reading, browser sign-in and CLI device login; revocable publish/unpublish-only token stored in OS keychain. Local use never requires an account. |
| M28 | 11–14 | Fork exact protocol through `jas fork author/name`, retaining immutable source/lineage, without running models, copying keys or auto-installing executable environments. Cross-machine replay/fork acceptance check. |
| M29 | 12–13 | 25 MB publish limit, 10 publishes/account/day, chosen minimum account age, short terms, report and takedown path; define moderation responsibility and unpublish/cache behavior. |
| M30 | 13 | CLI `jas check`, bounded headless `jas run --max-usd`, zero-call file `jas replay`, `jas login`, `jas publish` and `jas fork`; estimates precede spending and workspace limits still apply. Preserve `jas` server startup. |
| M31 | 14 | Separate versioned public record/index plus compressed per-run files, immutable storage/CDN, small identity/publish/listing/fork API/database and persistent compatibility strategy. No runner/model keys in gallery. |
| M32 | 12, 14, 16 | Keep local SQLite/concurrency and protected private hosting; remove Railway-specific checks from core auth without weakening generic hosted-auth/host/origin protection. Review existing Railway service before mutation and preserve its volume/data. |
| M33 | 15 | About six colorblind-safe condition hues with stable identities across screens/publication; labels/shapes alongside color. Separate stable glyph/color/name identities for agents; consistent lock/tint privacy marker and five icon/text run states. |
| M34 | 15–16 | Estimates before all paid actions, actuals after; limits shortened to ≤3 chips with detail accessible; actionable empty/loading/error states; keyboard/mobile accessibility; motion restricted to playback/Home sky. |
| M35 | 14–16 | Fix or explicitly report hosted CI billing block; clean public documentation, preserve/remove internal logs outside public tree, update links, minimal README with an actual 20-second replay GIF. Do not rewrite published Git history. |
| M36 | 11, 17–18 | Before public launch: seed 10–15 genuine experiments, five cold-viewer checks, clean-install/new-user tests, publish/fork across machines, and ten outsider runs/three publishes. External human checks cannot be claimed from automated tests. Review provider terms. |

## Verification and next steps

The final local regression results are recorded in HANDOFF.md. Public launch remains
blocked on the external checks above; a local automated pass cannot satisfy human
usability checks, provider terms or live hosted integration. See
[gallery operations](GALLERY_OPERATIONS.md) and [development](DEVELOPMENT.md).
