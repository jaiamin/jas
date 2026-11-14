# JAS MVP redesign

## Authority and current status

The user's **JAS redesign: end-to-end product spec**, dated November 13, 2026,
is the implementation specification. The user explicitly requires every MVP
requirement, preservation of the visual elements named in the spec, and exclusion
of v0.2. This is not permission to substitute a smaller product.

Current stage: implementation. All 19 PDF pages and focused repository audits have
been reviewed. On November 14, 2026, the user accepted both six-question rounds,
confirmed shared understanding, and authorized proceeding while keeping the
implementation minimal. The user also explicitly permits major refactors where
they improve organization and maintainability. Implementation and the authorized
Step 0 evaluation are underway. No infrastructure resources have been provisioned.

## Implementation evidence

- Installation: `jaslab` wheel bundles the built UI. Both `jas` and `jaslab` start
  the app with a stable app-data workspace, explicit `--workspace`, and browser
  launch after server readiness. Existing checkout `data/jas.sqlite3` is preserved.
  A clean installed wheel served health, SPA and JS/CSS assets from an unrelated
  working directory with zero provider requests. CLI/path tests: 6 passed;
  affected API/access tests: 78 passed.
- Production image built successfully. Fresh keyless deployment smoke passed:
  root-owned volume initialization, non-root execution, hosted authentication,
  containment, existing-file preservation and restart persistence. This is local
  container evidence, not a fresh Railway deployment.
- Step 0 discovery: six complete runs, 54 requests, $0.011623; enabling messages
  increased mean contribution rate from 0.1222 to 0.5407 on three discovery seeds.
  This is exploratory, not yet a confirmed launch result. First confirmation was
  interrupted by development changing package metadata; retain its four completed
  runs, one failed run and seven unattempted runs. A new six-seed confirmation uses
  the preserved original source/runtime and the same aggregate $10 ledger. Its
  frozen direction/threshold are unchanged; no failed trajectory is replaced.
- Arbitrary models, local provider settings and token caps are in progress. The
  remaining matrix entries are open; installation alone does not satisfy the MVP.

## Accepted direction

- Controlled, replayable experiments on AI agents: run, replay, publish and fork.
- Local/private execution and a separate public gallery; the gallery makes no
  model calls and never receives provider credentials.
- Preserve stock shadcn, Geist, blue actions, light/graphite themes, sidebar,
  supplied logo/wordmark, Home composer and pixel sky, and the existing tables.
- Preserve deterministic settlement, immutable experiment versions, append-only
  evidence, privacy between agents, atomic spending reservations and explicit
  paid actions. Playback, consequence replay and new model sampling remain distinct.
- Public interface vocabulary: experiment, version, condition, seed, run, turn,
  agent, assistant and metric. Internal names need not change gratuitously.
- A durable public record format is separate from internal workspace contracts.
  Future public links must remain viewable; retaining old viewers alone does not
  preserve the ability to verify old settlement rules.
- Keep frontend/backend code clean and minimal: reuse current patterns and
  dependencies, preserve complete behavior, and restructure only where a required
  boundary or demonstrated duplication justifies it. Avoid parallel domain models,
  speculative abstractions and dependencies for a few lines. Test real boundary,
  accounting, replay and user-flow behavior, rather than implementation details.

## Accepted interview decisions

| Decision | Accepted outcome |
| --- | --- |
| Installation identity | `jaslab` is the distribution/one-command installation name; JAS remains the product and `jas` the CLI. Registry availability was checked, not reserved. |
| Unknown model prices | Unpriced models require an explicit token cap and display USD cost as unknown. Reject dollar-only execution until prices are supplied; never represent token limits as a dollar guarantee. |
| Step 0 budget | Fresh aggregate maximum $10 in model calls for finding a result and confirming it on new seeds. Prepare concrete protocols and estimates first, retain attempts, stop at the ceiling, and do not inherit an earlier task's authorization. Launch-content generation needs a separate budget. |
| Gallery hosting | Plan a separate Railway gallery API/database and object storage with an initial $10/month target and an assigned domain. Preserve the private workspace/volume. Review concrete costs before provisioning paid resources; the target is not an observed or guaranteed bill. |
| Publication scope | A selected frozen experiment version and its runs, including reviewed agent-private observations. Exclude assistant conversations, discarded versions and raw researcher-provider traces. Do not upload the broad internal export as a public payload. |
| Public-tree cleanup | Replace the tracked-HANDOFF workflow for this redesign: preserve HANDOFF and internal research reports in a local archive, remove them from the current public tree, repair documentation links and preserve Git history. Temporary tracked planning continues only until the accepted archive/cleanup is implemented. |

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

## Initial evidence and reuse

- Baseline: `5dd65475`, including the merged private Railway deployment repair.
- Run playback, turn URLs, exact replay verification and an experiment backlink
  already exist. Reorganize them into the required shared viewer.
- Experiment-level matched/failure-aware comparison already exists. The Results
  presentation, seed dots and synchronized matched viewer remain new work.
- Existing templates and scripted policies support building starters and keyless
  examples, but no bundled recorded-run gallery path was found.
- Four-model allowlists exist at domain/service/request boundaries. Unknown-price
  token accounting, editable provider configuration and generic adapters are new.
- Current wheel excludes the frontend. Current exports include every experiment
  version plus research conversations/provider traces and are not workspace imports.
  Do not directly upload these as the public publication payload.
- Hidden provider thinking is already stripped before persistence. Extend existing
  secret-canary checks to all new export/publication paths.
- Latest observed GitHub Checks run `43313112223` did not start because of account
  billing/spending limits. No test failure or current success can be inferred.
- Railway CLI/MCP is unavailable here; the old deployment's live state has not been
  freshly verified. Do not claim historical HANDOFF checks as current observations.

## Decision tree / interview

First-round root decisions are settled in the accepted table above. The user's
clean/minimal-code instruction applies equally to frontend and backend.

The user accepted the following final policies and closed the interview:

| Question | Accepted policy |
| --- | --- |
| Q7: verification | Gallery independently verifies uploaded records with retained trusted JAS rules and zero model calls. Preserve versioned public viewers/verifiers; never run code from an upload. Failed or unsupported verification still permits publication without the badge and with reasons, as required by the PDF. |
| Q8: scanner resolution | Allow reasoned review of demonstrable false positives, such as synthetic example emails; never waive genuine credentials, forbidden local paths or hidden provider reasoning. Correct mutable metadata and rescan. A real leak in immutable evidence blocks that record; preserve it locally and require a clean new version/run rather than silent redaction. |
| Q9: visibility/removal | Default to unlisted (anyone with the link, absent from discovery, noindex). Unpublish/takedown stops serving page, record/run files and social card, removes listings and purges controlled CDN caches. Keep a minimal identity/lineage tombstone. Do not promise recall of already downloaded copies or external caches. |
| Q10: moderation | Start with seven-day GitHub account minimum plus the PDF's 25 MB/10 daily publication limits. Reports go to a private operator queue; the project owner initially curates and handles takedowns. No teams, social feed or general role system. |
| Q11: editor visibility | Keep one complete protocol; Quick changes representable fields and preserves the rest, with complex settings editable in Advanced. Raw Specification lives inside Advanced and is exposed by Developer, reconciling pages 8/10/16. Invalid raw drafts survive mode/toggle changes and have an explicit recovery path. |
| Q12: first divergence | Pair one version by seed and repetition; shared scrubber uses committed turn number and shows each side's actual actor/round/logical time. Mark first actor/schedule, accepted action/message or enforced-consequence difference; report initial state differences separately. Exclude rationale, memory prose and latency; show ended/failed/missing sides honestly. |

Routine implementation defaults from the code/contract investigation:

- Agent perspective uses saved authorized observations at/before the selected tick,
  marks their source turn and separates availability from confirmed model input.
  Filter privileged state/messages consistently; do not reconstruct future knowledge.
- The overview uses the first declared executable outcome as a display choice,
  otherwise the environment's primary metric/first selected metric, labelled
  descriptive. Do not silently substitute a more favorable outcome when data is
  missing, manual or undefined. Keep denominators/limits accessible.
- Before empirical estimates exist, label mechanics/harness-derived calls/costs
  as upper bounds with assumptions; keep those bounds separate from spending caps.
- Reuse Assistant chats and pending-work restoration. Pin experiment questions to
  the selected version and run questions to the displayed cutoff on Send. Preserve
  chat identity across panel/full page; do not feed future-cutoff answers backward.

The interview is complete. Accepted spending/provisioning constraints remain in
force; no additional approval is needed for routine implementation or the agreed
Step 0 spending. Paid gallery provisioning still requires the concrete cost review.

## Concrete Step 0 plan

Use a disposable database and a single fresh $10 aggregate ledger, with no paid
planner/analyst and no user-data mutation. Resolve the observed 16 KB-page jemalloc
failure of the supplied uv through project-local, lockfile-preserving setup first;
system Python currently has no project dependencies. Run affected keyless accounting,
validity, research and independent environment-oracle checks before live execution.

First candidate: commons, messages available versus unavailable, with reports and
promises unchanged in both conditions. Fix three agents, three rounds, goals,
endowment, multiplier, memory, order, direct-action harness and normal 4096-token
response limit. Use Luna throughout; a treatment difference qualifies as the spec's
result, without requiring a model-versus-model contrast.

- Proposed discovery seeds: 1009, 1013, 1019 (not yet run).
- Proposed untouched confirmation seeds: 2027, 2029, 2039, 2053, 2063, 2069.
- Primary outcome: contribution rate; retain group payoff, actual communication,
  confirmed exposure, completion/failure, request and spending evidence as well.
- At most 54 discovery requests and 108 confirmation requests. At current configured
  Luna rates and the enforced input/output ceilings, maximum reservations total
  $3.976776. This is a code-price bound, not a provider invoice guarantee.
- Historical communication contrasts are a lead, not new evidence or confirmation.
  After discovery, freeze the exact contrast/direction/minimum worthwhile difference
  before viewing confirmation. Retain failed/null attempts; never tune on confirmation.
- Backup if needed: information, reports available versus unavailable, same three
  agents/fixed setup and four rounds. Both discoveries plus six-seed confirmation of
  the larger design allow at most 270 calls/$6.627960 in current reservation bounds.
  Keep all attempts in the same aggregate ledger; allocate at most $4 discovery and
  reserve $6 for confirmation, without silently moving the total ceiling.
- Free preflight must verify exactly the intended factor and real opportunity for
  treatment; replay every run and confirm findings/export/replay add zero calls.
- Failure to find a reproducible/interesting effect remains a reported launch gate,
  not a reason to manufacture a claim or consume unapproved launch-content spending.

## Delivery sequence

Follow PDF page 17: establish a real result; models/install; recorded starters;
shared viewer/matched diff; Quick/Results/vocabulary/colors; CLI/public contract/
gallery/auth/fork; launch content and external acceptance. Resolve the interview
before application implementation. Keep acceptance evidence with each coherent
checkpoint and keep this matrix current.

Appropriate checks include affected backend/frontend regressions, lint/types/build,
real browser flows, clean wheel installation and zero-key demo/CLI flows. Container
or auth changes require production smoke; workflow changes require Actionlint and
ShellCheck. No claim of launch readiness without the specified live/human checks.

## Explicitly excluded

v0.2: bring-your-own HTTP agents, saved Agents destination, Python environment SDK,
MCP server and Inspect-format export. Later: human seats, hosted execution, teams,
comments, feeds, likes and leaderboards. No scale beyond the spec's small populations
and no claims about human behavior.
