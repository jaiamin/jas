# Reliable run exploration

## Acceptance

- Leaving, refreshing or changing pages must not stop live execution. A running run
  can be reopened from another tab with truthful status and shared Pause/Step controls.
- One model request at a time per run, no duplicate writers, no fabricated decisions,
  checkpoint rollback on failure, and no automatic paid restart after a server restart.
- Cancellation and server interruption explain what happened without blaming model
  limits. Pause finishes the current request; replay and inspection send no requests.
- Live updates do not reset filters, pagination, scroll or inspection context. Historical
  inspection can coexist with execution; returning to live is explicit and easy.
- Measure avoidable execution/UI overhead before optimizing. Preserve sequential
  environment semantics and current model thinking behavior.
- Verify regressions, the full suite, desktop/mobile browser flows, cleanup and handoff.
- Add a simple persistent Ask AI workspace using OpenAI GPT-6.1 Sol only, with
  read-only access to the complete selected run and clickable recorded-turn citations.
  Analysis is explicit, separate from simulation usage, and cannot modify the run.

## Scope and assumptions

- Refine the existing dark, table-based evaluation workspace and environment contract.
  Prioritize reliable execution and evidence exploration over another visual redesign.
- Server-owned execution remains local and disposable; stopping the server saves the
  checkpoint and requires explicit continuation. No external workers or new services.
- Provider experiments in this task use offline TestModel responses; preserve real data.
- User describes broad UI/UX bugs without naming more examples; exercise the core flows.

## Progress

- [x] Reproduce client deletion cancellation and document ranked hypotheses.
- [x] Add server-owned execution and regression coverage.
- [x] Refine navigation, status, controls, inspection and live updates.
- [x] Finish final browser checks, documentation, viewer restart and commit.

## Evidence and decisions

- Current real journal: latest run is paused at turn 117, 118 calls, max 250 turns.
  User-reported cancellation at turn 103 was subsequently resumed; preserve history.
- Current implementation awaits model turns inside a per-client UI timer; browser
  page cleanup cancels the timer and calls stop. Navigation also calls stop.
- Red command: `.venv/bin/python .venv/reproduce_page_exit.py` drove actual NiceGUI
  timer/client deletion and failed with tick 0, status failed, error CancelledError.
- Ranked predictions: server-owned execution survives that deletion; removing
  navigation pause prevents browsing from stopping runs; reconciling stale running
  flags on server startup prevents false active status without spending.
- Initial green: four execution regressions pass through actual timer deletion,
  multi-tab duplicate starts, pause-in-flight, graceful shutdown and restart recovery.
- User expanded scope with Ask AI, citing selfishness and strategy questions. Use
  evidence-led interpretation, preserve simulation state, and disclose evidence cutoff.
- Original page-deletion harness now finishes 120 offline turns after the client is
  deleted, status complete and no error. The corresponding regression uses the real
  NiceGUI deletion boundary with three turns and one request per turn.
- Browser QA: background run continued from turn 18 to 50 after navigation; exact
  replay verified all 50. A second run survived a full page reload, kept an Ask draft
  while advancing, and accepted Pause from another tab with exact request counts.
- Fixed a first-refresh click race and initial table pagination triggering inspection
  freeze. A second driver verified the original button stays attached across the
  initial poll; expanding evidence pins the selected turn while the run finishes.
- Analysis QA: submit, refresh during processing, saved answer, citation navigation,
  and citation URL reload. All use offline FunctionModel tools, not live providers.
- Variation QA: edits to name, goals, seed, turn limit, response allowance and timeout
  produced a new paused run with zero requests. Browser Back restored a valid route.
- Timing: six offline decisions with simulated 50 ms latency took 3.022 s using the
  old 0.5 s UI timer and 0.380 s with the service loop. This measures scheduling, not
  real-provider speedup. On the saved journal, 1000 latest-turn polls took 0.0838 s
  with checkpoint decoding versus 0.0016 s with the indexed tick query.
- Existing palette, table formats and typography are retained. Ask uses the existing
  type and spacing roles, with 16 px reading/input text on narrow screens. New
  execution controls and a separate replay scrubber clarify which actions spend calls.
- Final mobile accessibility scan caught the new Ask button inheriting white text from
  Quasar. It now uses the same explicit color handling as existing primary actions.
- Impeccable detector ran once. Its font warning refers to the pinned incumbent Roboto;
  font-size advisories refer to existing icon/checkbox/empty-state sizes. Preserve these
  rather than changing the established design system during a behavior refinement.
- Final validation: 67 tests pass; Ruff, changed-file formatting and diff checks pass.
  Final Ask mobile axe scan reports zero violations. Existing overlap-related contrast
  uncertainty was visually reviewed against the established palette. Desktop Ask, Settings
  and Environment were rendered and inspected; browser error log is empty.
- Before restart, the real run had advanced to turn 175, 177 calls and failed with the
  old page-lifecycle CancelledError. All runs/frames/counters remained identical
  at the SQL-row level across restart. No real simulation or analysis calls were sent.
- Updated viewer responds HTTP 200 on port 8080; its real Ask AI tab renders at turn 175.
  Credentials/account access to GPT-6.1 Sol remains unverified by a live request.
