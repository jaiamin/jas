# Final product completion and review

User direction, 2026-11-10: finish the approved research-harness work, simplify
the entire interface within JAS's design patterns, audit frontend and backend,
remove obsolete data/contracts/workarounds, benchmark and iterate, then leave a
fresh workspace running on port 8080 for manual testing.

## Acceptance criteria

- Complete and independently review T12, T17, T18 and T20 against the accepted
  specification; report any actual live/paid/held-out gates still requiring input.
- Reproduce and fix the hosted mobile-composer geometry failure without weakening
  the intended stable-composer behavior.
- Keep one current persisted/export/environment contract, reject incompatible
  data, and remove obsolete compatibility paths instead of adding fallbacks.
- Make Agent, custom experiment creation, experiment browsing and agent
  interaction viewing clear on desktop/mobile and light/dark themes. Use stock
  components, progressive disclosure and one obvious next action per state.
- Review loading/error/empty/reconnect/cancel, draft retention, keyboard access,
  budgets/privacy/replay and service boundaries end to end.
- Run a meaningful whole-repo quality review and an available static audit
  (Desloppify if practical); fix demonstrated issues, not tool-score cosmetics.
- Record source-stamped checks, measurements, failures and limits in a compact
  final report. Remove historical research evidence as explicitly authorized
  after its compact report exists; retire obsolete restore references.
- Reset old application records and leave only the newest compatible workspace.
  Start the final verified app on port 8080 with a documented launch command.

## Progress and next steps

- [x] Confirm accepted published frontier `e76ef124`; ROOT owns tracked writing.
- [x] Record historical outcomes and cleanup authorization in
  [the compact report](RESEARCH_HARNESS_COMPACT_REPORT.md).
- [x] Recover storage from ROOT's closed historical output; release bounded child work.
- [x] Reproduce/fix mobile composer CI failure; 10 repeated cases, all three
  suggestions cases, lint and forced TypeScript passed. Publication is next.
- [ ] Complete remaining ticket graph with staged, measured resource allowances.
- [ ] Review and refine the full UI/UX using `docs/DESIGN.md` and browser evidence.
- [ ] Complete end-to-end code review, relevant checks and meaningful benchmarks.
- [ ] Summarize final evidence, remove obsolete records and start port 8080.

Operational constraints: preserve protected original clipboard/configuration
payloads, shared-cache owner permissions, distinct child environments, shared
check lock and unchanged test/setup/production floors. No new paid/provider
calls, PR merge, default-branch push or history rewrite is implied.
