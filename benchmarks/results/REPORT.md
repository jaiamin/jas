# JAS evaluation record

JAS now has 336 frozen explicit scenario cases, a validated environment gate, auditable
model trials and a redesigned experiment/environment/Agent workspace. Development improvements
were followed by a single frozen held-out evaluation. The held-out planner scored
**206/240 (85.83%)**, participant execution **96/96**, and strict analysis
**96/96**. These are separate contracts, not a universal platform-quality score.

Every paid evaluation used **openai:gpt-6-luna**. Total charged or conservatively reserved was
**$13.608157 of the $75 cap**, including **$0.192974** for
11 unknown requests. All 26,688 published request IDs reconcile exactly with the
persistent aggregate ledger. Prices are estimates, not invoices. [Cost audit](aggregate-cost.json). [Interactive scorecard](scorecard.html).

## Measured development record

| Dimension | Valid baseline | Development observations |
| --- | --- | --- |
| Identical original invariant kernel | 3,528/4,608 (76.56%) | 4,608/4,608 after isolation/atomicity fixes |
| Expanded v3 gate | No original comparator | 5,208/5,208; 336 privacy assertions; five disclosure witnesses |
| Planner, identical valid matched requests | 101/102 | 102/102 |
| Wider planner development | No wide baseline | 426 unchanged passes + 6 fresh corrected passes; composed 432/432 |
| Strict analysis on the same 84 saved traces | 3/84 | 64/84 → 84/84 → 80/84 → 83/84 |
| Larger-team analysis | 65/72 | 72/72 after scoped tools and generic format/count clarification |
| Fresh unchanged-source stability | Not a new implementation | 84/84 and 83/84; failures retained |
| Commons payoff calibration | 4/12 | Instruction-only 4/12; calculator-backed 12/12; confirmations 12/12, 12/12 |

The original raw planner 90/108 result is invalid as an improvement baseline: requests
contradicted their intended estimands. The corrected baseline was 107/108. Three development
disclosure requests later proved defective because two actors leave no third-party audience.
All six old attempts are excluded, including accepted designs, leaving 101/102 versus 102/102
on identical valid requests. Changing those requests to three actors is a benchmark correction,
not a platform gain. The composed 432/432 result includes six fresh corrected plans.
[Exact denominators](planner-comparison.json); [correction proof](dataset-v3-correction.json).

All 120 held-out request lines remain byte-identical to v2. The suite has 28 author-reviewed
families: 18 development and 10 held-out, with 288 supported and 48 unsupported cases. The 336 cases
are synthetic parameterized requests, not 336 independent empirical datasets. All failures,
including the failed instruction-only arithmetic iteration, remain in the [score history](score-history.json).

## What changed and what still fails

Environment fixes detach observations and reject invalid/wrong-actor actions before mutation.
Independent equations check payoffs, resource conservation and terminal outcomes. Contrasting
legal scripts, adversarial actions, solvability ceilings, memory/channel privacy, sealed choices,
per-turn restore and exported replay gate paid work. Strategy discrimination here distinguishes
scripted action traces; it is not a statistical strategy-classifier score. The gate cannot prove
that a natural-language question identifies its claimed variable.

The initial scoped Agent returned only 10 of 84 answers: 33 input-limit failures, 30 request-exhaustion
failures and 11 HTTP 429 unknown reservations. Computed cutoff totals, actual utility, matched
comparisons, request deduplication and an answer-only final stage improved reliability. Compact
investigator checkpoints omit duplicate retained memory while complete actor observations and
exports remain intact. Explicit structured caveats addressed another observed failure class.

A fixed seven-world author review still caught incorrect payoff reasoning and treatment of a
shared ceiling as expected run cost despite an 84/84 contract score. The [original review](analysis-qualitative-review.json)
and [subsequent same-sample review](analysis-confirmation-qualitative-review.json) retain all answers.
Generic arithmetic instructions alone did not improve 4/12. A bounded read-only calculator now
uses enforced commons rules, hypothetical contributions and observed round capacity; it rejects
infeasible/future requests and other worlds. Revision grouping, cutoff-only decision usage,
shared budget semantics and bootstrap run-order invariance were corrected.

Exposing that calculator globally caused new failures: three unsupported requests in an 80/84
confirmation and one in the 65/72 larger-team test. Investigation schemas now expose it only in
commons. Generic instructions preserve requested response format and distinguish report totals
from their inaccurate subset. Matched larger-team accuracy reached 72/72. Baseline-trace
confirmation remained 83/84 because one answer omitted requested JSON despite correct prose totals.
Fresh stability scores 84/84 and 83/84 exposed a participant-versus-group utility substitution.
**Verified inputs do not guarantee correct freeform narration.** [Strict/parse/completion breakdown](analysis-reliability.json).

Development stopped after these unchanged-source confirmations: no further justified local
change was identified, while independent narrative-usefulness evidence remains unavailable.
This is a practical stopping point, not a claim that no optimization exists. No source, test,
prompt, case or scorer changed after the final checkpoint or in response to held-out results.

## Frozen held-out results

[Declared checkpoint](../final-checkpoint.json), committed in `53f42e5` before held-out requests:

- Source `7f2a136a2d71124fc5b962fb0fde3f5b5bd77de35453e7a63f04d22a2a69997a`.
- Suite `c05f3f353bcd6be3aeba94b145517e7b2e935907bbe1914b09d3f1bac4d3a8ff`.
- Two fresh planner repetitions for all 120 cases; 96 participant runs across eight supported
  families, three blocks, two repetitions and two conditions; 96 analysis audits on those runs.
- Run concurrency 8, provider concurrency 8, equal 48-decision allowances per participant arm.
- Exclusive persistent attempt markers prevent silently repeating a held-out phase.

| Held-out family | Planner | Participants | Analysis |
| --- | --- | --- | --- |
| appeals-without-audits | 24/24 | 12/12 | 12/12 |
| commitments-after-shock | 24/24 | 12/12 | 12/12 |
| credible-exit | 24/24 | 12/12 | 12/12 |
| depleted-stock-memory | 13/24 | 12/12 | 12/12 |
| external-verification | 24/24 | — | — |
| feedback-free-cascades | 1/24 | 12/12 | 12/12 |
| handoff-retention | 24/24 | 12/12 | 12/12 |
| public-evidence-without-feedback | 24/24 | 12/12 | 12/12 |
| reciprocity-after-shock | 24/24 | 12/12 | 12/12 |
| subjective-experience | 24/24 | — | — |

Supported planning scored 158/192; all 48 unsupported questions were correctly rejected. The 34
strict planner failures occurred in two families: feedback-free-cascades (1/24) and depleted-stock-memory (13/24).
The information world redraws truth by round, but planner capability descriptions omit that
fact, causing false unsupported rejections. The memory question singles out private notes
while prescribing none-versus-notes, which also changes public-history retention; some planner
identification objections are justified. None-versus-episodic is also a bundled retention contrast.

The [post-checkpoint audit of all ten families](heldout-specification-audit.json) keeps these
specification and capability issues separate. **Raw scores and denominators are unchanged.**
No corrected headline score, case exclusion, rerun or post-held-out tuning is presented.
Full phase summaries and every attempt are retained under final-heldout-* directories.
A [post-hoc eight-family qualitative sample](heldout-qualitative-review.json) still found
insufficient explanation of bundled memory mechanisms and imprecise ceiling/reservation
wording. All eight answers are retained; this is author inspection, not independent certification.

## Execution, configurations and behavior

Across all participant phases, **576/576 runs** completed the strict execution/replay contract.
Independent export replay verified **21,720 decisions**, without model requests. Reproduced
observations, actors, consequences, measurements, checkpoints and behavior summaries match.
Failures, partial traces and eligible opportunities remain separate from conditional rates.

| Configuration phase | Passed/attempted | Elapsed seconds | Charged/reserved |
| --- | --- | --- | --- |
| agent-counts | 96/96 | 1000.505 | $1.169410 |
| memory | 48/48 | 981.907 | $0.696823 |
| effort-communication | 36/36 | 602.417 | $0.583734 |
| serial | 12/12 | 121.055 | $0.007581 |
| parallel | 12/12 | 39.266 | $0.007440 |

Team sizes 2/4/8/12 were tested where mechanically justified; bargaining stays dyadic and
third-party disclosure requires at least three actors. Larger teams trade rounds for agents,
so these are fixed-resource configurations, not pure count effects. Coordination completion
saturated at every tested team size. Notes had higher observed utility than no memory in one
trust condition but cost more; episodic retention did not consistently improve utility.
Medium effort cost more without utility gain in the sampled dyadic information task.
Communication ablation was neutral in those blocks. No universal best configuration is selected.

Serial bargaining took 121.055 seconds versus 39.266 with four concurrent runs, with the same
provider pool 4 and protocol matrix. Fresh choices differed (32 versus 28 decisions), so this is
throughput evidence, not identical-provider-sample parity; deterministic scripted parity passes.
[Paired cross-configuration contrasts](configuration-comparisons.json) include every block,
missing/failed denominator and uncertainty interval. Reproduce with
`PYTHONPATH=. uv run python benchmarks/results/reproduce-configurations.py`.

Scripted communication calibration across 20 fixed seeds found truthful pooling (+0.10104 accuracy),
copying false reports (−0.4375), and ignoring messages (0). These are scripted witnesses, not model
findings. Model comparisons below cover all broad-development and held-out participant families.
Utility has environment-specific meaning; differences are not moral or platform-quality scores.
Three heterogeneous seed blocks give weak uncertainty; repetitions are averaged within block.

| Split | Family | Agents | Arm 0 mean utility | Arm 1 mean utility | Paired difference | 95% block interval |
| --- | --- | --- | --- | --- | --- | --- |
| Development | authoritative-handoffs | 2 | 20.000 | 20.000 | 0.000 | [0.000, 0.000] |
| Development | extraction-pressure | 2 | 47.167 | 101.394 | 54.227 | [37.026, 64.351] |
| Development | factual-reporting | 2 | 353.333 | 353.333 | 0.000 | [0.000, 0.000] |
| Development | feasible-commitments | 2 | 1414.667 | 1346.333 | -68.333 | [-408.000, 195.000] |
| Development | independent-oversight | 2 | 448.000 | 448.000 | 0.000 | [0.000, 0.000] |
| Development | noisy-evidence | 2 | 233.333 | 480.000 | 246.667 | [210.000, 270.000] |
| Development | private-sanctions | 3 | 330.667 | 330.667 | 0.000 | [0.000, 0.000] |
| Development | public-goods-incentives | 2 | 800.000 | 2397.333 | 1597.333 | [960.000, 2304.000] |
| Development | reciprocal-surplus | 2 | 400.000 | 905.667 | 505.667 | [365.000, 768.000] |
| Development | renewable-growth | 2 | 60.000 | 184.833 | 124.833 | [57.000, 165.500] |
| Development | repeated-partner-memory | 2 | 577.833 | 683.333 | 105.500 | [-2.000, 206.000] |
| Development | sealed-cheap-talk | 2 | 1588.000 | 1596.000 | 8.000 | [0.000, 24.000] |
| Development | shared-evidence | 2 | 353.333 | 355.000 | 1.667 | [0.000, 5.000] |
| Development | shrinking-surplus | 2 | 14.833 | 16.667 | 1.833 | [0.000, 5.500] |
| Development | task-load | 2 | 7.000 | 30.000 | 23.000 | [23.000, 23.000] |
| Development | unannounced-shortage | 2 | 1516.000 | 474.667 | -1041.333 | [-1772.000, -288.000] |
| Held-out | appeals-without-audits | 2 | 448.000 | 448.000 | 0.000 | [0.000, 0.000] |
| Held-out | commitments-after-shock | 2 | 477.667 | 479.667 | 2.000 | [-12.000, 18.000] |
| Held-out | credible-exit | 2 | 14.833 | 13.333 | -1.500 | [-10.000, 3.500] |
| Held-out | depleted-stock-memory | 2 | 34.122 | 114.000 | 79.878 | [45.734, 119.698] |
| Held-out | feedback-free-cascades | 2 | 351.667 | 353.333 | 1.667 | [0.000, 5.000] |
| Held-out | handoff-retention | 2 | 30.000 | 30.000 | 0.000 | [0.000, 0.000] |
| Held-out | public-evidence-without-feedback | 2 | 271.667 | 273.333 | 1.667 | [0.000, 5.000] |
| Held-out | reciprocity-after-shock | 2 | 679.333 | 228.000 | -451.333 | [-688.000, -226.000] |

Per-phase comparisons retain completion, remaining stock, reports, observed inaccuracies,
feasible/infeasible commitments, forecast error and cost. Missing report/promise opportunities
never count as perfect behavior. Narratives and rationales are self-reports, not intent evidence.

## Workspace, verification and reproduction

The redesigned workspace centers experiments, immutable revisions, configurable environment
mechanics, reusable validated local setups, comparisons and a contextual Agent. Review a
proposal before saving; saving does not execute it. Citations link inspected decisions and
scope. A populated check with 918 chats found and fixed an intrinsic grid-width bug hiding the composer;
its 120-chat regression and [populated captures](verification.json) are retained. Both themes,
mobile, keyboard navigation, drafts, recovery and the environment-to-editor flow were tested.

Observed final checks: 302 backend tests, 66 frontend tests, 65 browser tests, Ruff formatting/lint,
ty, Biome, production build and Actionlint. The final archive-aware secret scan found zero
findings across 2.42 GB of decompressed evidence. An extracted archive with 207 files independently installs,
passes 302 tests, builds its production image and passes a keyless non-root smoke. Remote CI
status is reported separately; no human usability study is claimed. [Tested runtime](runtime.json). [Verified source archive](verification/source.tar.gz).
Obsolete benchmark runners/cases and inspect-ai were removed after replacement validation;
useful correctness tests remain. There is no model substitute, hidden provider retry,
scripted participant fallback or compatibility runner.

Each phase retains source/suite/configuration hashes, attempts, observable provider traces,
phase-only usage and source archives. Historical published traces omit all thinking parts and
opaque signatures, with original/published hashes in the [publication audit](trace-publication.json).
The original local ledger remains intact. Accounting and scored outputs are unchanged. Earlier
archives omit some UI build inputs; their recorded git checkpoints are required for those UI
rebuilds. The verified final archive includes backend tests and frontend build/browser inputs.

Use the frozen lockfiles and commands in the [benchmark guide](../README.md). Export replay
requires no provider credentials or spending; fresh model calls are stochastic and cannot be
reproduced bit-for-bit. The persistent ledger was never reset. Seven rule-based worlds and up
to twelve agents do not establish arbitrary-world, cross-model, human or weight-learning validity.
Read [all interpretation limits](LIMITATIONS.md), the [scenario review](../REVIEW.md) and
[protocol/research sources](../protocol.md) before interpreting the scores.
