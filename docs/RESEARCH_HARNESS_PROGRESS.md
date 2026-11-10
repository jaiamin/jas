# Research harness progress

2026-11-10. Current source, results, cleanup and limitations are recorded in the
[final product review](research/FINAL_PRODUCT_REVIEW.md) and
[verification manifest](research/FINAL_VERIFICATION.json). This replaces the
long execution chronology; Git retains its source history.

| Area | Current disposition |
| --- | --- |
| T01–T11, T13–T16, T19 | Previously accepted bounded DEVELOPMENT; historical qualifications are summarized in the compact report. |
| T12 institutional workflow | Independently accepted, including delivered mail/handoff interaction repair. |
| T17 finite generation | Accepted bounded deterministic DEVELOPMENT after independent crash/reconciliation repair and combined UI/runtime checks. |
| T18 fallible adjudication | Accepted bounded deterministic DEVELOPMENT after independent privacy/accounting/snapshot and combined UI/runtime checks. |
| T20 and live/held-out competence | Open; no new paid, live or held-out evaluation. |
| Frozen T01 CURRENT | FAIL, exit1: exactly four export-v4 flags; source/cases unchanged. |
| Fresh current contract | PASS:5 runs/22 turns/22 full requests,770 synthetic microdollars, exact checkpoints/privacy/cutoffs/replay. No historical comparator. |

Current persisted meanings: DB15/export18/library10/definition2,
research-operation2/generation-event-v2. Incompatible data rejects; no migration,
compatibility path or automatic reset.

Final checks include scoped backend regressions,169 frontend units, lint/types,
build, all182 unique default browser cases across source-attributed runs,
combined rendered workflows, a fresh non-root image smoke and native restart.
The full browser run had181 passes and one stale catalogue-count assertion;
16 focused cases passed after correcting that count. Do not call it a single
182-green suite. Runtime samples and mixed-read tradeoffs remain in
[FINAL_RUNTIME_RESULTS.json](research/FINAL_RUNTIME_RESULTS.json).

User-authorized historical evidence retirement follows compact reporting.
Deleted raw outputs cannot be reread. Original protected payloads, shared tools,
other worktrees and current app dependencies/assets remain outside cleanup.
The fresh port8080 application is the user-testing handoff; live scientific
validity and public hosting are separate gates.
