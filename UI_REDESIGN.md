# Evaluation workspace redesign

## Objective and acceptance criteria

Replace the entire viewer UI with a minimalist evaluation workspace. Support both
browsing/comparing saved evaluations and watching/inspecting live runs, as confirmed
by the user. Environment visualization belongs inside the shared run workspace.

- A searchable, filterable run library shows status, model, progress, seed and cost.
- New run setup is a focused flow; no permanent setup form competing with analysis.
- A run has Overview, Environment, Decisions and Configuration views, without duplicated
  state, labels or agent names. Live control and replay remain clearly distinct.
- Compare real saved outcomes and metric histories; enforce matching environments.
- Generic metrics, agent observations and registered environment panels remain extensible.
- Saved journals, credentials, request accounting and simulation behavior are preserved.
- Desktop, tablet and mobile flows work with keyboard focus, readable contrast, useful
  empty/error states, and no accidental model calls while browsing.
- Meaningful tests, Ruff, rendered browser verification, Impeccable detector, independent
  finish review, design documentation and a running port-8080 viewer complete the work.

## Design exploration

Operate mode. A local experimenter reviews evidence over long desktop sessions, often
in subdued light; retain dark surfaces, use a neutral ink palette and restrained blue.
The old green map-first interface is an anti-reference, not the new visual authority.

Grounded systems, ordered by resonance:
1. Scientific results appendix: precise columns and evidence-first density.
2. Field research notebook: compact annotations, durable run identity and provenance.
3. Museum collection index: searchable records and restrained object detail.
4. Architectural wayfinding: clear routes, stable hierarchy and functional state colour.
5. Technical standards manual: consistent type/spacing, aligned evidence, clear sections.
6. Cartographic atlas: shared axes and meaningful comparison between recorded journeys.
7. Library reference catalogue: concise indexed records and progressive detail.

Impeccable assigned direction 5; seed:cd922f482dd75720. The remote concept service was
unreachable on both attempts; no challenger boards were available. Code-led build.
Direction: Research index, applying the standards manual's consistency to familiar
product controls. Signature interaction: selecting a recorded decision synchronizes
its evidence with the timeline and environment; run comparisons align at the same turn.

## Decisions

- The user wants a mix of browsing/comparing and live monitoring, and delegated the
  environment visualization's placement. Recommend a general workspace with an
  Environment view and direct live-run access.
- Runs and Environments are the navigation; Compare opens from selected real runs.
- No fabricated scores, leaderboard claims or placeholder evaluations.
- Read-only navigation and comparison never send model requests.
- Replace the existing DESIGN.md as part of the explicitly requested full redesign.
- Keep the existing NiceGUI/Python stack and local fonts; no new dependencies.
- Avoid loading full historical checkpoints for charts and lists.

## Progress

- [x] Product/code review, incumbent screenshot, user workflow answers and direction.
- [x] Shared read models, run library and comparison.
- [x] New run setup, focused live/replay workspace and environment presentation.
- [x] Tests and browser verification.
- [x] Independent design review and verdict.
- [x] Updated design/product documentation and handoff.
- [x] Viewer restart verification and QA cleanup.
- [x] Implementation checkpoint ready for commit after final verification.

## Next steps

The reviewer scored all five listed material fixes resolved and returned `ship` at that
scope. DESIGN.md and the design-system sidecar document the new system. The real viewer
is running on port 8080 with the existing journal; HTTP200 and read-only inspection of
an existing saved run passed. QA services, generated journal/scripts and browser are
closed/removed. No implementation work remains.

## Verification evidence

- 55 tests and Ruff pass. New tests cover lightweight history, comparison compatibility,
  real turn coordinates, absent metric values and partial-cost labels.
- Disposable TestModel journal used for browser Step/Play/Pause/recovery verification;
  no live provider requests or user journal changes during QA.
- Verified search/no results, status filtering and recovery, run selection/comparison,
  setup validation and scenario switching, paused creation, decision/timeline/agent sync,
  facility occupants, agent filtering, observation expansion, replay verification and export.
- Fixed vanished status-filter handling after a failed run recovers; browser reproduced
  the failure and then passed the same recovery-to-library path after the fix.
- Axe found zero violations on library, overview, decisions, setup and mobile Environment.
  Incomplete checks remain manual-review items; screenshots and reports live in ignored
  `.impeccable/review/`. The detector ran once; stale DESIGN.md advisories go to documentation,
  and the deliberate local Roboto choice goes to independent review.

## Finish review corrections

- Exact recorded pre-decision input is exposed separately from post-turn environment
  observation and private memory, with explicit turn labels. Browser evidence verified
  turn35 input energy6/materials62 against post-action energy4/materials65.
- Comparison legends have separate space from the Turn axis title and scroll when needed.
- Choosing a mobile navigation destination closes the drawer; desktop navigation stays.
- Corrected the environment panel's heading hierarchy and the framework sizing image's
  decorative alt text. Final mobile Environment axe report has zero violations.
- Replaced the old DESIGN.md with source-backed tokens and component rules; generated
  `.impeccable/design.json` contains the matching local component specimens and extensions.
- Independent verdict: all five material fixes resolved, disposition `ship` for the fix
  list. Review and documenter used the installed skill's fallback definitions in fresh
  agents; concept-service/card evidence was unavailable and disclosed to the reviewer.
