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
- [ ] Dispatch capability discovery and relevant prior context/artifact retrieval
  through the existing Pydantic AI/Sol chat workflow, without creating a study.
- [ ] Probe installed trusted worlds using isolated template/proposal/run state;
  report legal schemas, actor observations and explicit hypothetical steps.
  Preserve source hashes, cutoffs and records; never contact participants.
- [ ] Persist bounded operations, public results, rejections and stop reasons
  across streaming, reconnect, failures and planner handoff. Preserve question
  intent, drafts and one pending chat turn. Recorded prose stays inert.
- [ ] Account every auxiliary request independently and enforce a finite loop.
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

Next: implement one API red/green slice at a time, then Activity/reconnect,
failure/accounting coverage, paired evidence and final integration merge.
System uv is avoided; `.tools/uv/bin/uv` 0.13.7 and project-local dependencies
are installed under this checkout. The preserved stash is untouched.
