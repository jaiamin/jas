# From questions to evidence

JAS creates inspectable experiments about model behavior under declared rules.
A plausible transcript, more participants or a nonzero treatment difference does
not establish that an experiment answers its question. Application improvements
change the harness and available evidence; they do not train model weights.

## Designing a supported experiment

The Researcher preserves the original question and maps required constructs to
installed world capabilities. Missing mechanics or an unsupported proxy must be
reported before an executable proposal is accepted. Quotes and capability names
make this mapping inspectable; semantic fidelity still needs judgment.

Reusable mechanics, participant profiles/harnesses and experiment conditions are
separate. Inspect resources, permissions, private information, legal actions,
timing, stopping and actual consequences. Scenario prose cannot grant a right,
create a hidden state transition or install a new measurement. Use the
[custom-environment guide](CUSTOM_ENVIRONMENTS.md) for composition and the
[extension contract](EXTENSIONS.md) for independently admitted new mechanics.

Before execution, review population, horizon, seeds, matched conditions, effort
limits and analysis choices. Population resolution is different from independent
replication. Exploratory work need not invent a hypothesis or scalar endpoint;
confirmatory decisions must be frozen before validation outcomes are opened.
Saving or discussing a protocol does not authorize paid participant execution.

## Mechanical checks

`POST /api/design/preflight` sends no model requests and mutates no saved run.
It checks inactive or bundled interventions, known payoff/effort bounds and
identical conditions. Replications, placebos and unwitnessed delayed contrasts
can require review without being invalid. Confirmed errors block save/execution.

Three legal scripted probes per condition compare observations and consequences
on the first seed, capped at96 turns each. These are bounded mechanism witnesses,
not strategy predictions, exhaustive solvability proofs or power calculations.
A missing nonzero witness cannot establish that a valid treatment has no effect.
The report is keyed by the full protocol and copied before being returned.

Checks also disclose interpretation limits. Generic coordination work is public,
can be performed by every actor and can pay personally; successful completion
therefore need not establish communication or specialization. Sanction visibility
may change announced framing even without a realized sanction. With only two
parties there may be no additional audience to receive a wider disclosure.

The [architecture](ARCHITECTURE.md) defines the sole current persistence and rule
contracts. Incompatible saved rules reject explicitly for inspection, export,
execution and replay, including completed runs. JAS does not reconstruct old
records under new rules or silently migrate/reset a workspace. Preserve an
incompatible database separately when explicitly starting fresh work.

## Reading outcomes

Analysis is read-only and pinned to accepted evidence cutoffs. Its index supplies
installed capabilities, active controls, recorded actions, feasible opportunities,
actual-input exposure and independent checkable totals. A read receipt is evidence
of delivered content; a citation, delivery or context inclusion does not establish
attention, belief or intent. Model rationale remains self-report.

Keep participant execution, adjudication and analysis costs separate. Counts and
integer ledgers include each settled request, including tool operations. Unknown
usage, failures, interruptions and missing arms remain visible. Completed-run-only
summaries cannot silently stand in for all assigned attempts.

Report observable utility, work, permissions, communication and commitments
separately. A false statement is not sufficient evidence of deception; a breach
needs a feasible scheduled opportunity before its exclusive deadline. Raw judge
rulings and world-enforced consequences are distinct. A valid citation does not
prove that a qualitative claim follows from it.

JAS does not infer population confidence intervals from a count of seeds alone.
Matching, randomization, repeated model sampling, clustered participants and
failure selection need a declared design and an appropriate uncertainty method.
No single realism, morality or general-intelligence score is produced.

## Verification and open evaluation

The backend validity matrix covers the installed worlds, channel/memory/horizon
combinations, independent payoff arithmetic, privacy, delayed interventions,
placebos, provenance, exposure cutoffs and spending gates. Browser checks exercise
preflight, edits, rejected protocols and saved review flows. Current observed
results are in the [product review](research/FINAL_PRODUCT_REVIEW.md).

Frozen benchmark declarations and historical failures remain separate from later
development diagnostics. [Benchmark instructions](../benchmarks/README.md) describe
case selection, attempt accounting and paid-run gates. The
[compact historical report](research/RESEARCH_HARNESS_COMPACT_REPORT.md) preserves
superseded development results without presenting them as current measurements.

Live researcher/participant competence, held-out mechanic generation and judge
accuracy remain open under the [accepted specification](RESEARCH_HARNESS_SPEC.md)
and [T20](https://github.com/jaiamin/ass/issues/31). Freeze fresh cases and rubrics
before evaluation, retain every attempt and cost, and obtain the appropriate
explicit spending authorization. Human predictive claims additionally require
consented reference data, held-out participants and independent validation.

## Primary methodological references

- [Concordia](https://arxiv.org/html/2507.08892) separates actor decisions from
  environment adjudication; [OpenSpiel](https://github.com/google-deepmind/open_spiel)
  makes rules, information structure and strategy evaluation explicit.
- [ODD](https://www.jasss.org/23/2/7.html) requires purpose, entities, scheduling,
  assumptions and evaluation appropriate to the intended use.
- [SOTOPIA](https://arxiv.org/abs/2310.11667) motivates separate social dimensions
  and independent assessment of model judgments.
- [AgentSociety](https://arxiv.org/abs/2502.08691) and
  [OASIS](https://github.com/camel-ai/oasis) rely on concrete domain mechanisms;
  increasing population cannot supply a missing mechanism.
- [Grounded agents](https://arxiv.org/abs/2411.10109) and
  [TinyTroupe](https://github.com/microsoft/TinyTroupe) distinguish empirical
  grounding and held-out validation from convincing synthetic responses.

Further primary sources and interpretation rules are in [Research](RESEARCH.md).
