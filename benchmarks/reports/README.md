# GPT-6 Luna evaluation · 2026-11-07

**Primary frozen result: 221/230 (96.1%).** The real application planned, persisted and
executed 207 supported protocols; 206 completed both conditions. There were 413 completed
runs and 5,190 committed turns verified by exact replay with zero replay model requests.
Twenty additional questions tested honest capability declines. All 230 attempts are retained.

| Split | Passed / attempted |
| --- | ---: |
| Development | 137 / 140 |
| Reserved context combinations | 51 / 56 |
| Longer trajectories | 13 / 14 |
| Capability limits | 20 / 20 |

The source was frozen at `c5db9137c2a5266fd1a8f51786f47bb5dbe64e5c` before the final run.
The manifest records the exact dataset, source digest, settings and model. Generalization
questions omit adapter and parameter hints, but reuse the seven mechanics and treatment
vocabulary. They are held-out contexts, not unseen mechanics or human-validation data.
Short pilots have one seed, one repetition and three to five rounds; longer cases have
12 rounds. This tests protocol alignment and execution, not powered intervention effects.

## Failures

| Case | Observed result |
| --- | --- |
| trust_exchange-27 | Chose an information game for the reporting question; violated the reserved adapter criterion. |
| coordination-17 | Declined a generated-load intervention because the prompt also required identical task definitions. |
| coordination-26 | One run stopped at turn 3 with provider HTTP 400; the other completed. Committed turns replayed. |
| institution-01 | Review rejected descriptive sanction/appeal evidence despite implemented event records. |
| institution-18 | Invalid authority assignments remained after three draft revisions. |
| institution-27 | Chose appeal measures; rubric incorrectly demanded allocation retention. |
| bargaining-26 | Chose a commons efficiency analogue instead of binding bargaining. |
| bargaining-28 | Proposed exit counts from recorded choices; rubric incorrectly demanded agreement efficiency. |
| institution-long-1 | Chose unjustified-sanction measures; rubric incorrectly demanded allocation retention. |

Failed planning created no experiment. The HTTP 400 was not retried or replaced by another
model. Alternative operationalizations remain strict failures; their scientific suitability
has not been established by the automated assessor.

## Corrections and coverage

Suite v5 corrects three longitudinal metric requirements and lets two raw-action questions
use complete exported decision/observation evidence instead of an unrelated primary metric.
It also clarifies that generated task definitions change when task_count is manipulated.
The new evidence path has a real-API regression test. These are benchmark corrections,
not model improvements. Offline rescoring changes three cases: **224/230**, with zero new
provider requests. This is post-audit evidence, not a second independent evaluation; the
original 221/230 remains primary. Exact corrections are in [audit.json](audit.json).

Behavioral coverage is uneven. All 56 institutional runs completed, but agents chose only
allocation and work: **no live sanctions or appeals**. Bargaining produced offers, rejects
and agreements, but no exits. Deterministic tests cover these unused transitions, including
sanction permissions, oversight, appeals and outside-option settlement; the live suite does
not establish their behavioral efficacy. In particular, worker work pays more than waiting
in the current institution. Costly labor, authority incentives and opportunity-rich reference
protocols deserve separate design and validation before claims about coercion or prison-like
behavior. No desired abuse or deception was scripted into the agents.

The implemented depth comes from permissions, hidden information, binding agreements,
persistent stocks, independent communication channels and separate memory treatments.
A plausible persona or narrative is not evidence of realism. Next scientific validation
needs repeated seeds, partner/order and wording sensitivity, independently coded traces,
and consented human reference data. The ontology is extensible, not perfected.

## Artifacts and cost

- [final-manifest.json](final-manifest.json): frozen cases, provenance and execution settings.
- [final-summary.json](final-summary.json): original score, replay totals and cumulative ledger.
- `final-attempts.jsonl.gz`: every final attempt, proposed protocol, checks, errors and run summaries.
- `development.json.gz`: all 234 recorded pilot/development/retest attempts, manifests,
  original summaries and earlier rubric rescore. Interrupted phases may have unrecorded
  in-flight calls; their reservations remain in the cumulative ledger. Older dirty source
  digests do not supply complete historical source snapshots.
- [audit.json](audit.json): corrected criteria and descriptive action/measurement coverage.

There were **464 recorded attempts** across phases, with repeated IDs retained explicitly.
Rubrics, prompts and code changed during development; those phase scores are not a
controlled improvement comparison. Raw SQLite evidence and Inspect logs remain in ignored
`data/`; compressed reports contain no credentials. For example:

```sh
gzip -dc benchmarks/reports/final-attempts.jsonl.gz | head -n 1
uv run inspect view --log-dir data/evaluations/luna-final-v4/inspect
```

Cumulative evaluation usage: **$3.677626 estimated/reserved**, including development,
explicit retests and unknown requests. The final phase added $2.069020. Earlier task work
was about $1.69, putting the overall task near $5.36 of the authorized $25. These are
application estimates, not a provider invoice; the $18 evaluation ceiling was never reset.

Verification: 147 backend tests, Ruff, ty, five frontend tests, Biome and production build;
17 keyless Docker browser workflows; Docker build/health/restart persistence; CI checks.
Nineteen existing runs also replayed 318 turns under current code without model calls.
No live Anthropic, human calibration, multi-tenant security or large-scale load validation
is claimed. Research and source-specific tradeoffs are in [RESEARCH.md](../../docs/RESEARCH.md).
