# Simulation evaluation

## Acceptance

- [x] Research primary sources; distinguish model behavior from human validity.
- [x] Run at least 200 distinct live GPT-6 Luna supported cases through both conditions.
- [x] Exercise planning, immutable revisions, legal actions, settlement, measurements,
  export and exact replay. Retain failures and explicit retests.
- [x] Add independently tested institutional, bargaining, information and resource rules;
  preserve existing studies and replay compatibility.
- [x] Use maintained Inspect scheduling/logs, with deterministic application checks.
- [x] Stay within the authorized $25 task allowance without resetting accounting.
- [x] Verify browser flows, Docker persistence, lint/types/tests/build; leave 8080 running.

## Result

The frozen v4 suite at c5db913 passed 221/230. Of 210 supported questions, 207 produced
persisted experiments and 206 completed both conditions: 413 completed runs, 5,190 exactly
replayed turns. All 20 capability-limit cases passed. Development and retests add 234
recorded attempts. Evaluation ledger: $3.677626 estimated/reserved; total task about $5.36.

[Published report](benchmarks/reports/README.md) contains split denominators, all nine
failures, source/dataset provenance, compressed attempts, cost and coverage limits.
147 backend tests and 17 keyless Docker browser workflows pass, alongside frontend
lint/tests/build, Ruff and ty. Existing 19 runs still reproduce 318 turns with no calls.

## Decisions

- Deterministic adapters own adjudication; models choose legal actions. No generated code,
  free-form model game master, provider retries or substitute models.
- Separate permissions/payoffs from role/goal prose. Independently control communication
  channels, public history, private notes, private evidence and resource initial stock.
- Institutional cases test token permissions, procedural sanctions, oversight and appeals.
  They do not reproduce prison psychology or target a predetermined abusive outcome.
- Reserved generalization contexts were evaluated after development changes were frozen.
  They reuse known mechanics; the older history/holdout.json remains unexecuted.
- Final failures were not used to tune the application. Benchmark v5 corrects five outcome
  criteria and a contradictory generated-task prompt; its offline 224/230 rescore is
  separately labeled, not independent validation or a model improvement.

## Limits and next evidence

No live sanctions, appeals or bargaining exits were chosen. Scripted deterministic tests
cover settlement, but do not demonstrate live intervention efficacy. Institutional work
currently dominates waiting in personal payoff; costly effort and authority incentives
need separately validated protocols before stronger institutional-behavior claims.
Single-seed short pilots cannot estimate reliable causal effects. Next evidence should
include repeated seeds, partner/order/wording sensitivity, independent human coding and
consented reference traces. There is no universal realism score or perfected ontology.
