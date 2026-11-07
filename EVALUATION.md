# Simulation evaluation

## Acceptance

- Research primary sources before changing mechanics; distinguish agent behavior from human validity.
- Run at least 200 distinct live GPT-6 Luna cases across development and frozen generalization splits.
- Exercise natural-language planning, persisted revisions, legal decisions, settlement, measurements,
  export and exact replay. Report every attempt and denominator; never hide errors or retries.
- Test institutional power, information, incentives, bargaining and compositional edge cases with
  implemented rules, not persona prose. Preserve current studies and replay compatibility.
- Use a maintained evaluation framework for scheduling, logs and reports; keep deterministic
  scoring separate from optional model judgment. No universal realism score.
- Stay below the existing $25 total task API allowance (about $1.69 already used/reserved).
- Keep the UI minimal, validate flows in a browser, pass lint/types/tests/build and leave 8080 up.

## Progress

- [x] Inspect current ontology, planner, execution and historical benchmark limits.
- [x] Research and record architecture decisions and scientific limits.
- [x] Freeze scenario taxonomy, splits and mechanically checkable criteria.
- [x] Implement mechanics, planner configuration and maintained harness integration.
- [ ] Record baseline, failure-driven fixes and separate generalization results.
- [ ] Verify UI, Docker, persistence, privacy, replay and spending; clean documentation/artifacts.

## Decisions

- Existing 26 development cases and prior attempts remain historical; the old reserved holdout
  remains evaluation-only. New splits are fixed before live tuning.
- GPT-6 Luna is the explicit planner and participant model in this evaluation. Production defaults
  stay explicit. Provider failures remain evidence; no model substitution or automatic retries.
- Stanford-prison-style cases study permissions, sanctions and oversight. They cannot validate
  contested psychological claims or reproduce human abuse through role instructions.
- Keep deterministic environment adjudication. More detailed narrative is not more capability.

## Next

Complete development-v6, fix demonstrated planning failures, explicitly retest, then run the
reserved generalization and longitudinal cases. Record costs from the atomic ledger.

## Development observations

- Initial pilots exposed independent-planning throttling, too-small response allowances and
  incorrect replay routes in the harness. Those attempts remain in data/evaluations/.
- Bundled communication could not isolate messaging while preserving report/promise
  opportunities. Added independent channels and a regression test.
- Rubric v2 expects each question's actual operational measure; the earlier primary-metric
  requirement mis-scored reporting studies. Original scores are retained separately.
- Development-v6 runs 160 cases at concurrency 16. Observed one-condition unsupported-design
  output despite a two-condition brief; investigate after the fixed-source batch completes.
- 141 backend tests, Ruff, ty, frontend lint/test/build and all 17 Docker browser flows pass.
