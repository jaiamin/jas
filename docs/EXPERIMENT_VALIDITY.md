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

`POST /api/design/preflight` makes no provider calls or persistent mutations. It checks
inactive parameter contrasts, bundled interventions/memory changes, known incentive ceilings,
coordination effort bounds and identical arms. Identical replication/placebo arms and pilots
are warnings, not invalid experiments. Save and execution reject confirmed errors; manual
protocols can be mechanically checked without pretending their question was model-reviewed.

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

A stock-shortage question combining unequal allocation powers and configurable resource
transparency remains unsupported. Rejecting that substitution is the correct result;
implementing and validating those joint mechanics is future environment work.

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
