# Evaluation results

336 frozen synthetic cases cover 28 author-reviewed families: 18 development and 10 held-out,
288 supported requests and 48 unsupported questions, across seven rule-based worlds.
These are parameterized diagnostic cases, not independent empirical datasets.

## Measured development

| Contract | Valid baseline | Development record |
| --- | --- | --- |
| Identical original invariant checks | 3,528/4,608 | 4,608/4,608 |
| Expanded environment gate | No matched baseline | 5,208/5,208; 336 privacy assertions; five disclosure witnesses |
| Planner, identical valid requests | 101/102 | 102/102 |
| Wider planner development | No wide baseline | Composed 432/432, including six corrected requests |
| Analysis, same 84 saved traces | 3/84 | 64/84 → 84/84 → 80/84 → 83/84 |
| Larger-team analysis | 65/72 | 72/72 |
| Fresh unchanged-source stability | — | 84/84 and 83/84 |
| Commons payoff calibration | 4/12 | Instruction-only 4/12; calculator-backed 12/12; two 12/12 confirmations |

The [score history](score-history.json) retains failed iterations. Original raw planner
90/108 is an invalid comparator because requests contradicted their intended estimands.
Correcting those specifications is not a platform gain. The matched comparison excludes
all attempts for three defective disclosure requests, including previously accepted designs.

## Final held-out checkpoint

Source and suite were [declared](../final-checkpoint.json) before one held-out evaluation.
No source, test, prompt, case or scorer was tuned after seeing those results.

| Contract | Passed / attempted |
| --- | --- |
| Planner | 206/240 (85.83%) |
| Supported planning | 158/192 |
| Unsupported rejection | 48/48 |
| Participant execution | 96/96 |
| Strict analysis | 96/96 |

All 34 planner failures remain: `feedback-free-cascades` scored 1/24 and
`depleted-stock-memory` 13/24; the other eight families scored 24/24 each. The first exposes
missing planner metadata about enforced truth redraw. The second asks about private notes
but prescribes a contrast that also changes public history; some objections are justified.
A post-hoc audit preserves these specification weaknesses without adjusting raw scores.

## Execution, cost and interpretation

Independent export replay verified **576/576 runs and 21,720 decisions**, with zero model calls.
Team sizes 2/4/8/12 were tested where mechanically valid; larger teams trade rounds for agents
under equal 48-decision allowances. Memory and effort comparisons found no universal best
configuration. Serial/parallel comparisons measure throughput, not identical provider samples.
The archived full report retains all per-family utility effects and configuration contrasts.

All **26,688 requests** used `openai:gpt-6-luna`. [Reconciled cost](aggregate-cost.json):
**$13.608157 charged/reserved of $75**, including $0.192974 for 11 unknown requests.
Every request ID, status and charge matched the retained ledger; no pending calls or missing
IDs. Token-price estimates are not invoices. The local aggregate ledger was never reset.

Numerical/citation compliance does not prove useful interpretation. Fresh stability retained
a participant-versus-group utility error. Qualitative review found imprecise budget wording
and insufficient explanation of bundled memory mechanisms. Three heterogeneous seed blocks
provide weak uncertainty; authorship is shared across cases, implementation and tests.
See [all limitations](LIMITATIONS.md), [scenario review](../REVIEW.md) and [protocol](../protocol.md).

Historical verification: 302 backend, 66 frontend and 65 browser tests; lint, types, production
build and Actionlint; independently extracted source tests/build/non-root Docker smoke;
archive-aware secret scanning. Remote CI and independent human validation were not established.

Cleanup verification: 302 backend tests, Ruff formatting/lint and types passed; the full
5,208-check gate, 336 privacy assertions and five disclosure witnesses passed. The documented
archive replay verified 96 held-out runs / 3,692 decisions; regenerated comparisons match
the historical file exactly. Documentation links and artifact ignore rules were checked.

## Historical evidence and reproduction

The complete [evidence snapshot][archive] is preserved at immutable commit
`a2ce6ba940398ca12b2c8baba25787e0d43f5c10`. It contains every attempt, provider log, source bundle,
configuration, failure and the [full original report][full-report]. Public traces omit all
thinking parts and opaque signatures; observable outputs, scoring and usage are unchanged.
Paths inside `score-history.json` and `aggregate-cost.json` are relative to that snapshot's
`benchmarks/results/`, not the cleaned directory.

Recover historical artifacts into ignored local storage from a clone containing that commit:

```sh
mkdir -p data/quality/archive-a2ce6ba
git archive a2ce6ba940398ca12b2c8baba25787e0d43f5c10 benchmarks \
  | tar -x -C data/quality/archive-a2ce6ba
uv run python -m benchmarks.replay \
  data/quality/archive-a2ce6ba/benchmarks/results/final-heldout-participants/attempts.jsonl.gz
```

This cleanup preserves the original evaluated source/suite hashes. Future rule changes need
the matching historical source bundle for replay. Model sampling cannot be replayed bit-for-bit.
New evaluations write to `data/quality/`; only reusable tooling and compact results belong here.
Historical artifacts remain in Git history; this cleanup does not rewrite shared history.

[archive]: https://github.com/jaiamin/ass/tree/a2ce6ba940398ca12b2c8baba25787e0d43f5c10/benchmarks
[full-report]: https://github.com/jaiamin/ass/blob/a2ce6ba940398ca12b2c8baba25787e0d43f5c10/benchmarks/results/REPORT.md
