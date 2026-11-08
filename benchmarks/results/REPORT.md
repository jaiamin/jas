# JAS evaluation record

Development is still running. The final source/configuration checkpoint and one-shot held-out
results will be declared here before publication. See the [protocol](../protocol.md),
[scenario review](../REVIEW.md) and [interpretation limits](LIMITATIONS.md).

| Dimension | Valid baseline | Observed development checkpoint |
| --- | --- | --- |
| Original invariant kernel | 3,528 / 4,608 (76.56%) | 4,608 / 4,608 (100%) |
| Expanded v3 kernel | Not measured originally | 5,208 / 5,208; plus 336 privacy assertions and five disclosure witnesses |
| Planner, identical valid matched requests | 101 / 102 (99.02%) | 102 / 102 (100%) |
| Wide planner development | No wide baseline | 426 / 426 unchanged requests + 6 / 6 corrected requests |
| Participant execution and exported replay | 84 / 84 runs; 2,952 decisions | Broader development 192 / 192; 7,786 decisions; configuration trials pending |
| Strict numerical analysis, citations and caveats | 3 / 84 (3.57%) | 64 / 84 → 84 / 84; final confirmations pending |
| Counterfactual payoff calibration | 4 / 12 | Instruction-only 4 / 12 → calculator-backed 12 / 12 |
| Held-out families | Unopened | Final checkpoint pending |

These are separate instrument/reliability contracts, not a universal quality or morality score.
The invariant improvement fixes observation isolation and invalid/wrong-actor atomicity.
Numerical analysis success does not establish that a narrative interpretation is useful.

## Comparable planner evidence

Version 1's raw 90/108 result is archived but invalid as an improvement baseline: several
requests contradicted their intended estimands. Version 2's fresh baseline was 107/108.
The wide sweep then exposed three two-agent sanction requests with no third-party observer.
All six old attempts for those requests are excluded, including accepted designs. This leaves
101/102 at baseline and 102/102 on identical requests after generic capability framing.
The wider valid result is 426/426. Six fresh corrected three-agent plans all pass.
The composed 432/432 checkpoint is explicitly not credited as improvement from changing requests.
[Machine-readable comparison](planner-comparison.json) retains the denominators.

Version 3 changes only those three development requests. All 120 held-out request lines remain
byte-identical to version 2; [correction proof](dataset-v3-correction.json). The initial raw
wide result, 429/432, and all proposals/reviews remain in [archived evidence](planner-development-v2/).

## Analysis iterations

The initial scoped Agent returned 10 of 84 answers. Its strict score was 3/84, with 33 input-limit
failures, 30 evidence-request exhaustion failures and 11 HTTP 429 responses retaining unknown
cost reservations. Adding computed cutoff counts/utility/matched effects, request deduplication
and an answer-only final stage raised strict success to 64/84; facts/citations passed 83/84.
Nineteen answers omitted structured caveats and one exceeded context bounds. Explicit caveats
and removal of duplicate retained memory from the investigator's checkpoint view yielded 84/84.
Actor observations and full exported checkpoints remain complete.

Phase charges/reservations were $0.620124 → $0.194712 → $0.235927. This is ledger cost,
not an invoice comparison: the baseline includes unknown reservations.

An author review of a fixed seven-world sample still found wrong payoff interpretations and
confusion between the shared experiment ceiling and expected run cost. The [review](analysis-qualitative-review.json)
and [all seven answers](analysis-qualitative-sample.jsonl.gz) are retained. Generic arithmetic
instructions did not improve a new independently computed payoff probe: 4/12 → 4/12.
A bounded, cutoff-scoped commons calculator then achieved 12/12. It checks hypothetical choices
against enforced rules and resource changes, labels them hypothetical, and cannot execute actions.
Budget ceilings and actual decision usage are explicit; conditions now share their original
revision when profile overrides differ. Confidence intervals are invariant to run order.

## Execution and behavior

The original paid baseline completed and exactly replayed all 84 runs across seven worlds.
Scripted communication probes on 20 fixed seeds found truthful pooling +0.10104 accuracy,
copying false reports −0.4375, and ignoring communication zero. These are scripted calibration
witnesses, not model findings. Model utility and behavior comparisons will be reported per
world with opportunities, failures, cost and paired block effects. No score rewards dramatic
prose or presumed deceptive intent.

## Workspace and verification

The modern workspace centers experiment management, environment mechanics, saved reusable
setups and a dedicated Agent conversation surface. Contextual links connect experiments,
runs, inspected decisions and cited findings. Drafts, revisions, error recovery, keyboard
navigation, responsive layouts and dark/light themes are covered by browser checks.
A populated check with 918 chats exposed a grid-width bug that hid the composer; a regression
now passes and the bounded history strip remains usable. [Captures and verification](verification.json).
Obsolete benchmark runners/cases and inspect-ai were removed after replacement validation;
useful correctness tests remain. No compatibility runner, scripted participant fallback or
silent provider replacement remains.

Observed checks: 299 backend tests, 66 frontend tests, 65 browser tests, Ruff, ty, Biome,
production frontend build, Actionlint and a keyless non-root Docker smoke. The exact pytest entry point and an extracted source archive pass all 299 backend tests.
That archive also builds and passes the production container smoke; remote CI remains unobserved.

## Reproduction and limits

Each paid checkpoint retains all attempts, provider requests/responses, phase-only usage,
source archive, suite/source hashes and configuration. Earlier source archives omit some
UI build/verification metadata; use their recorded git checkpoint for UI rebuilds. The current
archive includes those inputs and has been built and tested separately. The persistent aggregate ledger is never
reset. All evaluated calls use openai:gpt-6-luna; the authorized aggregate cap is $75, development
ceiling $60, reserving $15 for held-out. Exact replay uses saved decisions without paid calls;
fresh provider samples are stochastic and have no reproducible sampling seed.

The 336 unique requests span 28 author-reviewed scenario families. They are synthetic cases,
not 336 independent empirical datasets. Held-out families combine existing mechanics; they do
not establish arbitrary-world, human or cross-model validity. Seed blocks also vary some
parameters; intervals describe three fixed heterogeneous blocks, with weak uncertainty.
Read the [full limits](LIMITATIONS.md) before interpreting perfect contract scores.
