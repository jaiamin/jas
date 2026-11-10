# T05 bounded Researcher operations

Ticket: [#16](https://github.com/jaiamin/ass/issues/16). Prepared branch:
`t3/researcher-probes`, based on clean integration
`7d16d8a4f1aa041a840681468cc7b645918b5fc3` (Linux/aarch64 Docker sandbox).
Only T05 is in scope. No paid calls, participant sampling, generated execution,
historical/held-out suite edits, pushes or tracker changes are authorized.

## Acceptance and implementation plan

- [x] Preserve a clean source/case-stamped inherited keyless baseline before
  changing behavior. `data/t05/before/` contains its archive, manifest, attempts,
  operations, exports and disposable database; all six cases passed. The
  inherited focused chat/stream/planning/research/accounting suite passed 36
  tests (`data/t05/checks/inherited-before.{log,xml}`).
- [x] Dispatch capability discovery and relevant prior context/artifact retrieval
  through the existing Pydantic AI/Sol chat workflow, without creating a study.
- [x] Probe installed trusted worlds using isolated template/proposal/run state;
  report legal schemas, actor observations and explicit hypothetical steps.
  Preserve source hashes, cutoffs and records; never contact participants.
- [x] Persist bounded operations, public results, rejections and stop reasons
  across streaming, reconnect, failures and planner handoff. Preserve question
  intent, drafts and one pending chat turn. Recorded prose stays inert.
- [x] Account every auxiliary request independently and enforce a finite loop.
- [ ] Verify fresh API behavior and inherited regressions, retain actual red/green
  attempts, compare the identical inherited harness/cases, and check browser UI.
- [ ] Merge the latest integration tip, recheck warranted conflicts, commit and
  stop owned services before handing off.

Approved seams: public workflow HTTP API (primary); World and provider/accounting
interfaces supplement independent privacy, immutable-state and usage checks.
No repeated seam approval is needed. Development oracles include ordinary chat
without a proposal; implemented versus absent mechanics; a fourteen-credit
bargaining probe offering five then accepting (balances 5/9); cutoff-scoped run
probing without changing source evidence; prior-artifact retrieval restricted to
the same conversation/scope; request exhaustion, failure and reconnect retention.
Scripted providers establish mechanics only, never Researcher intelligence.

## Decisions and next steps

Extend existing chat and investigator dispatch rather than add a second engine.
Keep durable versioned operation artifacts in the owning Analysis JSON, with
explicit source identifiers/hashes and scope. This additive output does not
reinterpret existing saved evidence or require a database reset. The planner
receives operation results as untrusted context alongside the original question.
Use installed World validation/settlement and fresh copied checkpoints only.

Implemented: three operation batches (up to four operations each), then an
answer-only fourth model request; each uses the existing reservation/settlement
ledger. A probe applies up to eight supplied actions to trusted copied worlds.
Context indexes 12 records and searches up to 50 eligible prior terminal turns,
with eight search matches and explicit proposal/artifact retrieval. The planner
receives retained results as `research_operations`, separately from web research.

Observed development checks: 14 new real-API cases pass, including an advancing
source run whose probe still uses its earlier recorded cutoff. The earlier full
backend run passed 945 tests before the last four development variants were
added; the next checkpoint will rerun the final set. Frontend unit tests pass
108/108; all four new light/dark phone/desktop browser flows passed. An initial
broader API run had 84 passes and two activity failures: removed a spurious
post-writing stage and updated the one exact-output assertion for the additive
artifact envelope; 94 tests then passed. No assertion/check was weakened.

Actual red/green logs are in `data/t05/checks/`: discovery, context, probe,
scoped-probe, handoff, limits/failure and UI activity. Intermediate failures
remain: a context-edit indentation error; a corrected capability identifier in
the new discovery oracle; a reserved pytest parameter name; an accessible-name
locator; duplicate browser text matching summary and JSON. Four first browser
traces remain in `data/t05/browser-first-failure/`. A later screenshot-only
animation wait included unrelated ongoing animations and was interrupted after
two timeouts; its artifacts remain in `data/t05/browser-animation-wait-failure/`.
The screenshot wait now considers only the relevant collapsible animation.
These are development/harness repairs, not live model results.

Next: archive the final source/cases, repeat development red/green with exact
source stamps, run the inherited paired comparison and final checks, then merge
the integration tip and hand off. The earlier incremental logs identify their
development failures but do not contain complete per-edit source archives; the
final paired development recheck will supply those exact archives explicitly.
System uv is avoided; `.tools/uv/bin/uv` 0.13.7 and project-local dependencies
are installed under this checkout. The preserved stash is untouched.
