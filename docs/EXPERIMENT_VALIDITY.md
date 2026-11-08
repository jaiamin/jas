# From a question to evidence

JAS should produce a faithful, inspectable experiment or explain which mechanics are
missing. An eloquent transcript, more agents, or a nonzero treatment difference cannot
establish that an experiment answers its question. These changes follow the published
frozen evaluation checkpoint; its historical scores do not measure this implementation.

## Research and decisions

Primary sources reviewed on 2026-11-08:

| Source | What it supports | Decision for JAS |
| --- | --- | --- |
| [Concordia game-engine design](https://arxiv.org/html/2507.08892), [implementation](https://github.com/google-deepmind/concordia) | Composable entities and components; actor decisions and game-master adjudication serve different purposes. Evaluation, simulation and drama have different objectives. | Preserve rule-owned settlement. Describe capabilities explicitly; prose cannot install economic rights or new state transitions. Do not use dramatic behavior as an evaluation target. |
| [OpenSpiel](https://github.com/google-deepmind/open_spiel) | Explicit game rules, information structures and strategy evaluation. | Check enforced affordances, payoff incentives and treatment opportunities before asking models to play. |
| [AgentSociety](https://arxiv.org/html/2502.08691), [OASIS](https://github.com/camel-ai/oasis) | Large simulations depend on domain-specific economic/social systems and action mechanisms. | Additional agents cannot repair an absent mechanism. Keep bounded interpretable studies; implement a new world only with its own state, actions and independent tests. |
| [ODD protocol](https://www.jasss.org/23/2/7.html) | Specify purpose, entities/state, process scheduling, assumptions, rationale and evaluation for fitness for purpose. | Retain the original question and a construct-to-mechanism mapping. Show checks, changes, limits and evidence before execution and interpretation. |
| [SOTOPIA](https://arxiv.org/html/2310.11667) | Social performance has multiple dimensions; model judgments need independent validation and can diverge from humans. | Keep utility, violations and opportunity counts separate. Computed evidence must constrain narrative interpretation; no universal insight or realism score. |
| [TinyTroupe](https://github.com/microsoft/TinyTroupe), [grounded agents, current abstract](https://arxiv.org/abs/2411.10109) | Synthetic insights require validation; empirical grounding and held-out evaluation are substantive work. | Do not promise predictions about humans from uncalibrated synthetic agents, or confuse retained context with model-weight learning. |

JAS keeps its existing simulator instead of adding a generic simulation dependency.
A natural-language game master would add adjudication uncertainty to experiments with
independently computable consequences. Domain-specific extensions remain possible through
the documented environment seam, with privacy, solvability and replay tests.

## Implemented checks

The planner quotes essential constructs and maps each to a capability in a single world.
Required missing/proxy mappings cannot become an executable proposal. Candidate generation
and review receive a computed preflight report. Construct selection and semantic fidelity
still depend on model judgment: a quote and a capability identifier are not proof that the
mapping is complete or correct.

Capabilities are enumerated in the output schema so environment names, metric names and
invented qualified identifiers cannot silently become missing mechanics. The mapper separates
world requirements from counts, pilot/reporting limits and instructions. It normalizes quote
delimiters and whitespace without accepting paraphrases; a missing or unquoted mapping gets
one explicit correction step, recorded with its feedback and cost. Provider failures are not
retried. Exhausted mapping/design reviews retain their final findings for inspection.
One development attempt implemented history versus notes correctly but exhausted all reviews
because the critic demanded a duplicate comparator quotation in the fixed brief. Review now
explicitly judges the executable contrast and requests material protocol corrections; one
capability mapping may cover both implemented levels. The failed attempt remains evidence.

`POST /api/design/preflight` makes no provider calls or persistent mutations. It checks
inactive parameter contrasts, bundled interventions/memory changes, known incentive ceilings,
coordination effort bounds and identical arms. Identical replication/placebo arms and pilots
are warnings, not invalid experiments. Save and execution reject confirmed errors; manual
protocols can be mechanically checked without pretending their question was model-reviewed.

Coordination checks disclose that task state is public, all agents can perform all tasks,
and useful work pays personally. For feasible graphs with spare turns, an independent
effort bound shows that a greedy no-message strategy can finish. Completion timing and
blocked/duplicate work may distinguish strategies when final completion saturates. This
does not force communication to help or reject legitimate null-effect studies. Private
expertise, hidden task state and enforced specialization are absent mechanics.

Three legal scripted instruments per condition exercise low/high choices and additional
sanction/appeal or delayed-negotiation paths. They compare observation and consequence hashes
on the first seed, capped at 96 turns each (at most 1,728 decisions). These are witnesses,
not strategy predictions, exhaustive solvability proofs, power calculations or a guarantee
of a non-null model effect. Hidden/delayed contrasts without a witness require review, not
automatic rejection. Results are cached by complete protocol and copied on return.

The Agent's evidence index includes the original mapping when available, static mechanical
checks, cutoff-scoped action/commitment counts, sanction opportunities and work ceilings.
An announced sanction-visibility rule can influence anticipation even without sanctions;
no realized sanctions means there were no sanction records to disclose. Recorded observations
remain authoritative for historical runs; current static checks do not describe an old engine.
Two-agent visibility contrasts also flag the absence of an additional audience: both parties
already see their sanction record. Different announcements can test framing, but cannot
establish an effect of wider disclosure in that setup.

## Shortage failure and upgrade

The reviewed shortage experiment used an institution with renewable allocation credits,
privately profitable work and a sanction-record visibility contrast. It had no finite stock,
consumption needs or allocation-visibility manipulation. Its 108/108 worker work choices and
zero sanctions could not establish the claimed generic transparency effect.

The institution now announces the actual sanction visibility in rules and a structured
`sanction_visibility` observation. Institution rules are **4.1.0**; other worlds remain
**4.0.0**. Historical evidence remains readable/exportable; incompatible runs cannot resume
or replay under current rules. Save a new immutable revision for new trials. No data reset,
legacy engine or conversion is provided. Export **v4** lists actual recorded `rule_versions`
across runs instead of falsely labeling mixed-version evidence with the current version.
For incompatible engines it marks an unrecorded initial state unavailable and exports the
recorded turns; it never reconstructs old evidence using new rules.

At that checkpoint, a stock-shortage question combining unequal allocation powers and
configurable resource transparency remained unsupported. The subsequent
[custom-environment composition engine](CUSTOM_ENVIRONMENTS.md) now implements those joint
mechanics through finite stocks, controlled allocation, consumption needs and separate
stock/record visibility. The historical institution protocol still cannot answer that question;
create a new experiment using the appropriate mechanics.

## Verification and limits

`backend/tests/test_validity.py` includes 336 cross-environment/channel/memory/horizon cases,
55 independent marginal-payoff expectations, privacy/visibility checks, delayed interventions,
placebos, maximum matrices, provenance, cutoff exposure and save/run spending gates.
Existing environment, replay, budget, export and planner tests remain required.

Browser tests exercise check results, stale findings, invalid protocols and both editing modes.
The separate development planner evaluation records its expectations before calls, every
attempt, exact source snapshots, model/settings and the existing aggregate spending ledger.
It does not modify or reopen the frozen held-out evaluation. Development improvements are
not new generalization scores. See the development results for observed failures and costs.

## Development history

Thirty requests, each repeated twice with `openai:gpt-6-luna`, include 16 supported questions
and 14 missing-capability questions. The pre-change run used the same questions in two batches;
their manifests match the later combined set. Settings, concurrency and acceptance rules stay
the same. Completion, support/decline, environment and required executable factor must all pass;
errors and false rejections remain in the denominator. No desired model behavior is scored.

| Checkpoint | All attempts | Supported requests | Unsupported requests | Calls | Charged/reserved |
| --- | --- | --- | --- | --- | --- |
| Before validity checks | 54/60 | 32/32 | 22/28 | 148 | $0.185460 |
| First strict mapping | 46/60 | 18/32 | 28/28 | 112 | $0.179538 |
| Corrected mapper | 59/60 | 31/32 | 28/28 | 140 | $0.228114 |
| Final review and preflight | 60/60 | 32/32 | 28/28 | 137 | $0.222692 |

The original planner sometimes accepted missing mechanisms as narrower token proxies. The
first strict mapping fixed those decisions but regressed on supported requests through invented
capability IDs, decorative quotes and reporting constraints mistaken for mechanics. The
corrected mapper fixed those failures; its remaining failure was the redundant comparator
quotation requested repeatedly by the critic. Both failed iterations are retained.
The final checkpoint also includes the public-task and missing-disclosure-audience warnings.
An explicit-count/isolation audit passed for all 32 accepted final protocols. Responses remain
stochastic; these small development differences are descriptive, not a significance claim.

Artifacts live outside the OSS benchmark directory in `data/quality/`: `validity-before`,
`validity-before-broad`, `validity-after`, `validity-corrected` and `validity-final`. Each contains a manifest,
exact backend source archive, every attempt and sanitized provider traces. The evaluator
uses the existing aggregate ledger; no ledger or unknown reservation is reset.
The final backend source fingerprint is
`22eefac5b0eb38500e1b9698074d7a7ba2dc4767f03a8d8f62c071a42026616c`
(code checkpoint `4d552c0`); every archived source file matched the current backend.
All five development batches cost **$0.815804** in total. Through the final planner checkpoint,
the aggregate ledger records **$14.423961 charged/reserved of $75**, including earlier unknown
reservations. Historical published costs and held-out scores are unchanged.

Fresh validation passed 735 backend tests, 69 frontend tests, 68 browser tests, lint/types/build
and the keyless non-root production smoke check. The final-source environment gate passed
5,208 invariant checks across 288 executable cases / 576 arms, plus all privacy/memory,
communication and disclosure probes. GitHub's backend, frontend, container, workflows and
aggregate verification jobs passed on the code checkpoint. Secret scanning found no leaks.

An additional six-response analysis diagnostic uses only the existing `independent-oversight`
development study: two 48-turn runs, no sanctions, 48 work choices and no wait choices; oversight
varies 0/1 while sanction visibility stays fixed. Its questions and expected interpretations are
declared before calls in `data/quality/validity-analysis/manifest.json`, with at most $0.50 more
within the same ledger. It checks current analysis of recorded 4.0.0 evidence, not new participant
behavior or a new held-out score.

The initial six analysis responses completed with valid citations/caveats; both numeric audits
returned exactly 0 sanctions, 48 work and 0 wait. They correctly rejected the broad causal
claims, but some follow-ups suggested unavailable mechanics without a clear engineering label,
or missed the need for a third participant in a wider-disclosure study. One also treated a
null inactive stock parameter as evidence that a stock was absent. Those responses remain
in `validity-analysis` ($0.035939, 22 calls).

The subsequent analysis-only change supplies the capability catalog, active controls, measures
and current rule versions. Instructions distinguish executable follow-ups from required
environment extensions, explain the two-party disclosure limit and distinguish inactive
parameters from world mechanics. Only `assistants.py` changed after the final planner source;
the planner and all world/validity code remain identical. A repeat of the same six questions
is recorded separately, without changing the original outcomes or planner scores.
The second six responses completed for $0.013842 (14 calls), again returning exact count
audits and rejecting unsupported causal claims. Advice more clearly separated available
resource worlds from needs/deprivation extensions and required a third party for wider
disclosure. However, one qualitative example reversed the oversight condition labels despite
correct aggregate facts. The index now gives each run its condition key and name directly,
reducing lookup through opaque identifiers. This does not certify prose: citation-range
validation cannot prove that every sentence accurately describes its cited turn.

The final labeled-index retest (`validity-analysis-labeled`) completed all six responses for
$0.027713 (16 calls). Both numeric audits again returned 0 sanctions, 48 work and 0 wait;
all responses retained citations and uncertainty and rejected the unsupported causal claims.
Manual trace review still found an internally contradictory allocation comparison in
`transparency`, repetition 0: it first reversed the oversight conditions, then described
their examples correctly. This is a retained narrative error, not an insight-quality pass.
The observed ground truth is self-allocation **1.0 under oversight 1** and **0.890625 under
oversight 0**, with authority/worker balances **384/48** and **342/90**, respectively.
Generated prose therefore still needs review against computed facts and inspected evidence.

All follow-up diagnostics together cost **$0.893298**. The final aggregate reconciliation is
**27,277 Luna-only calls, $14.501455 charged/reserved of $75**, with 11 earlier unknown calls
retained and no pending calls. Sum of provider charges equals the workspace ledger exactly.
`data/quality/validity-comparison.json` records each phase, artifact hashes, costs and remaining
weaknesses; source snapshots and complete sanitized traces remain beside each phase.

These are public development requests and mechanical acceptance scores. They do not establish
independent insight quality, calibrated human behavior, statistical power or unseen-family
generalization. A further explicit-count/isolation audit is supplemental: it examines accepted
protocols and does not remove failed attempts or change these primary scores.
