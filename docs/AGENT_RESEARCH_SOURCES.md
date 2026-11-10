# Preliminary landscape survey: JAS agent and simulation research

Research date: 2026-11-10. This is a primary-source engineering review, not a
systematic literature review or an independent reproduction of published results.
The linked pages below were fetched during this task. Paper abstracts establish
their stated scope; full text was additionally examined for AgentSociety 2 and
the agent-scaling study. Olam's methodology, Diplomacy report, YC Labs report,
Aaru's full evaluation and Simile's confidence report were examined directly.
Commercial results remain company-reported. No external benchmark score below is
a score for JAS.

> This was an initial landscape survey, not a sufficient basis for selecting the
> architecture. Implementation is paused. The deeper methods and implementation
> review under `docs/research/` revisits its recommendations, including the limits
> of a universal declarative interpreter and outcome-first evaluation.
> Use [the revised direction](research/RESEARCH_DIRECTION.md) and
> [current plan](RESEARCH_HARNESS_PLAN.md) for the present proposal. The hypotheses
> below are retained as preliminary research history, not implementation criteria.

## Initial architectural hypotheses

An initial hypothesis is an executable research workflow over composable,
auditable worlds. A larger cast, a dramatic story, an agent debate or a persuasive
report does not itself create a stronger experiment. The essential chain is:

1. A question about model behavior becomes an operational hypothesis with a
   comparator, measured outcome, unit of analysis and limits on interpretation.
2. A typed world declares observable state, private information, legal actions,
   incentives, communication, timing and termination. World rules settle actions.
3. A design compiler and deterministic probes establish that the requested
   contrast is implemented and can actually affect available decisions.
4. Recorded executions produce state transitions and behavioral measurements.
   Separate analysis describes those records and quantifies uncertainty.

This keeps the research agent distinct from the participants and from the world
adjudicator. The same model may fill more than one role, but its permissions,
instructions, evidence and accounting must remain separate.

## Primary sources and implications

### 1. Olam Labs: Multi-Agent Arena methodology (2026-07-12)

[Methodology](https://olamlabs.ai/research/multi-agent-arena) and
[current evaluations](https://olamlabs.ai/evaluations).

The user's named company is **Olam Labs**, at `olamlabs.ai`. Its arena uses
deterministic game states, steps and actions; accepted actions, messages and
states are append-only records. Participants receive randomized names. Competitive
evaluation uses pairwise finishes with a Bradley–Terry fit and whole-table
bootstrap intervals; environment-specific outcome margins remain separate.
Behavioral evaluation uses anonymized transcripts, a curated rubric, multiple
graders and checks of grader variance. The company distinguishes subjective
profile cards from its more formal benchmarks.

Useful for JAS: preserve replayable transitions; randomize seat assignment;
separate task success from behavior; keep matchup records rather than collapsing
everything to one rating. Olam explicitly lists incomplete parity, imperfect
forkability and judge bias as limitations. Its deception classifier sometimes
uses provider reasoning traces. **JAS must not copy that practice**: hidden
reasoning is neither an available cross-provider measurement nor reliable ground
truth for intent. Use checkable statements, known observations, actions and
outcomes; label intent as unestablished.

### 2. Olam Labs: Diplomacy (2026-09-25)

[Report](https://olamlabs.ai/research/diplomacy).

The report balances seats, separates game performance from broken promises,
gullibility and skepticism, and compares conversations with actual orders.
Promises are extracted and checked by two independent grader instances. These
are behavioral observations in a specified game, not validated personality
traits or real-world lying rates. The report does not establish universal
cross-environment model rankings.

Useful for JAS: commitments need explicit actors, recipients, deadlines and
feasibility; promise breach and adverse consequence are different measures.
Record the opportunity denominator and whether the recipient could respond.

### 3. Y Combinator Labs and Olam: game swarms (2026-10-29)

[Assessing multi-agent dynamics in games](https://labs.ycombinator.com/projects/games/).

Minecraft agents use a continuous tool-using harness, world observations, memory,
messages and scripts; the implementation builds on Pi and Mineflayer. The report
also describes a seven-game Mindustry series, with GPT-6.1 Sol in Codex and
Claude Opus 5.5 in Claude Code. This is an informative engineering demonstration,
but seven games with different model/harness combinations do not isolate a model
effect. The report supplies synchronized replay and concrete artifacts such as
communication and work products.

Useful for JAS: visualize actual event sequences and communication against world
state. Record the model **and harness** as experimental factors. Do not import
script execution into the trusted app merely to reproduce a spectacle.

### 4. AgentSociety 2 (2026)

[Paper](https://arxiv.org/abs/2607.11895),
[full text examined](https://arxiv.org/html/2607.11895v2).

The closest recent research to the requested product couples AI scientist
workflows with configurable simulated participants and environments. Its seven
illustrative studies span micro, meso and macro scenarios. The harness maintains
explicit workflow stages, persisted artifacts, structural gates and assistant
attestations. It separates a research description (hypotheses, constructs,
interventions and measurement) from executable configuration (initialization
and step schedule). Agents discover modular skills and use budget-aware context
management while complete logs remain available outside the prompt.

Its general environment router can generate sandboxed Python that calls
registered module methods. That approach provides flexibility but introduces a
substantial execution-security and reproducibility burden. Its own discussion
separates formal auditability, simulation realism and experimental-mechanism
validity, warning that none proves the next. Some large-population examples use
rule-based participant decisions, so population count is not an LLM-call count.

Useful for JAS: adopt typed research artifacts, progressive disclosure and gated
design; use safe declarative composition first. A model attestation supplements
deterministic validation and cannot replace it. Do not claim that the seven
illustrative studies establish arbitrary-scenario generalization.

### 5. AgentSociety (2025; revised 2026-04-10)

[Paper](https://arxiv.org/abs/2502.08691).

The paper reports more than 10,000 agents and five million interactions, with
mobility, social and economic environments and intervention case studies.
This demonstrates an important engineering direction: model participants,
environmental machinery and execution throughput are separate design concerns.
Matching selected social patterns is not proof that every local mechanism or
counterfactual prediction is valid.

Useful for JAS: declare active model participants separately from background
entities; count decisions, interactions, latency and tokens separately; do not
raise a population limit while retaining full-population prompts and quadratic
communication/state duplication.

### 6. Altera: Project Sid (2024)

[Paper](https://arxiv.org/abs/2411.00114).

Project Sid reports 10–1,000+ Minecraft agents and the PIANO architecture, which
coordinates concurrent information and output streams. The experiments include
role specialization, collective rules and cultural transmission. The authors
describe the results as preliminary. Open-ended emergence in a familiar world
does not by itself provide causal isolation or evidence about human societies.

Useful for JAS: domain-specific environments can be rich without requiring an
omniscient narrator; distinguish persistent goals and memory from immediate
actions, and measure specialization through actual work and resource flows.

### 7. Concordia (2023; current repository examined)

[Paper](https://arxiv.org/abs/2312.03664),
[repository](https://github.com/google-deepmind/concordia).

Concordia separates participant entities, composable memory/behavior components,
an engine and a game master. The game master grounds intended actions in a
physical, social or digital environment. Current engine interfaces encompass
turn-taking, simultaneous and asynchronous execution.

Useful for JAS: separate observations, intentions and adjudicated consequences;
make scheduling explicit. An LLM game master is useful for exploratory fiction,
but unconstrained narrative adjudication cannot supply exact replay, conservation
or a stable causal intervention. JAS should retain deterministic rule settlement.

### 8. Stanford Generative Agents (2023)

[Paper](https://arxiv.org/abs/2304.03442).

The 25-agent town architecture combines recorded experience, retrieval,
reflection and planning, with ablations of architectural components and
believability evaluations. The result supports memory and planning as
experimental factors; it does not validate a town as a predictive social model.

Useful for JAS: compare memory policies and access to evidence with matched
conditions; preserve the raw record rather than treating a generated summary as
authoritative state. Reflection creates another model-mediated intervention.

### 9. Grounded individual simulation (2024; revised 2026-06-28)

[LLM Agents Grounded in Self-Reports Enable General-Purpose Simulation of Individuals](https://arxiv.org/abs/2411.10109).

The revised study uses 1,052 Americans and compares agents grounded in interviews,
surveys, both, or demographics against held-out responses and participants' own
test–retest consistency. This is a substantially more specific empirical
validation target than generic believable role-play.

Useful for JAS: distinguish the validation target from the simulation mechanism.
JAS studies **model behavior**; it has no human calibration dataset and must not
inherit human-validity claims from this work. Record precisely what evidence
participant profiles contain and what the outcome can establish.

### 10. OASIS (2024)

[Paper](https://arxiv.org/abs/2411.11581).

OASIS models dynamic social graphs, platform actions and recommendation systems,
with support reported for up to one million simulated users. Its scenarios cover
information spreading, polarization and herd effects. A large supported user
count is not evidence of a million independent frontier-model sessions, nor of
prediction outside its social-platform domain.

Useful for JAS: communication topology and recommendation/exposure policy must be
world rules, not prose suggestions. Preserve who could see each item, the timing
of delivery, and the population exposed when computing diffusion measures.

### 11. SOTOPIA (2023)

[Paper](https://arxiv.org/abs/2310.11667).

SOTOPIA provides goal-directed open-ended interactions with relationship/context
variation and a multidimensional evaluation framework. It identifies hard
scenarios rather than assuming that natural conversation implies social skill.

Useful for JAS: explicitly represent conflicting private goals and participant
knowledge. Separate measurable task achievement from rubric-based interpretation;
keep judge agreement and uncertainty visible for qualitative constructs.

### 12. AgentBench (2023; revised 2025)

[Paper](https://arxiv.org/abs/2308.03688).

Eight distinct interactive environments test reasoning and decision making.
Its failure analysis emphasizes long-horizon reasoning and instruction following.
The evidence motivates environment diversity, not a claim that one aggregate
number measures general agentic intelligence.

Useful for JAS: benchmark by task family and failure type; record invalid actions,
incomplete execution and decision recovery separately from goal score.

### 13. τ-bench and τ²-bench (2024–2025)

[τ-bench](https://arxiv.org/abs/2406.12045),
[τ²-bench](https://arxiv.org/abs/2506.07982).

τ-bench evaluates final database state against annotated goals and uses pass^k to
measure consistent success across repeated trials. τ²-bench adds dual control:
both interacting parties use tools to change shared state. Its compositional
generator creates verifiable tasks, and ablations separate reasoning from
communication/coordination difficulty.

Useful for JAS: use executable outcome checks, repeated reliability and explicit
shared-state affordances. A convincing report cannot turn an incorrect world
state into a pass. Communication-only and action-enabled comparisons help isolate
what collaboration contributes.

### 14. AgentLab / BrowserGym ecosystem (2025; current repository examined)

[Repository and research references](https://github.com/ServiceNow/AgentLab).

AgentLab organizes studies over agents, benchmark tasks and seeds; captures
versions and commits; supports parallel experiments and detailed trace inspection.
Its documentation explicitly warns about cross-task state contamination and
dynamic websites/provider changes affecting reproducibility. This is ServiceNow's
AgentLab, distinct from similarly named later security benchmarks.

Useful for JAS: keep protocol version, harness version, provider/model identity,
seed, task state and execution settings in the manifest. Parallelize independent
runs; maintain one writer for each shared world.

### 15. AI Economist (2020–2021)

[Extended paper](https://arxiv.org/abs/2108.02755).

The two-level reinforcement-learning framework studies agents and a policy
planner that co-adapt. It tests simpler settings against known economic results
before examining dynamic settings and emergent gaming. Its learned agents and
training procedure differ materially from frozen API language-model participants.

Useful for JAS: independent payoff oracles and scripted policies establish that
incentives and interventions work before paying for language-model decisions.
Do not mix training, prompt adaptation and evaluation without declaring them.

### 16. Towards a Science of Scaling Agent Systems (2025; revised full text)

[Paper](https://arxiv.org/abs/2512.08296),
[full text examined](https://arxiv.org/html/2512.08296v3).

Across 260 configurations, six benchmarks, five coordination architectures and
three model families, effects depend strongly on task structure. The reported
relative change spans +80.8% on decomposable financial reasoning to −70.0% on
sequential planning. The authors report capability saturation, coordination
overhead and error propagation; the revised full text qualifies frontier-model
transfer as preliminary within a particular benchmark. Team sizes are modest,
some benchmark cells have only 20 instances, and their intervals are wide.

Useful for JAS: treat centralized, decentralized, independent and hybrid
communication as experimental conditions; include a single-agent baseline with
matched compute. Do not assume more participants or more debate improves quality.
Do not turn the reported baseline threshold into a universal law.

### 17. Multi-agent failure studies (2025–2026)

[MAST: Why Do Multi-Agent LLM Systems Fail?](https://arxiv.org/abs/2503.13657),
[Understanding Communication Failures in Multi-Agent LLM Systems](https://arxiv.org/abs/2610.32060).

MAST analyzes over 1,600 traces across seven frameworks and organizes 14 failure
modes around system design, inter-agent misalignment and task verification.
The October 2026 communication preprint analyzes 3,211 failed trajectories and
emphasizes correction/recovery failures, premature consensus and suppression of
correct minority evidence. Its corpus of failures does not estimate failure
prevalence across all possible systems.

Useful for JAS: measure failed handoffs, repeated errors, contradictory evidence,
minority-evidence retention and termination quality. A critic must inspect
executable evidence rather than simply agree with the designer's prose.

### 18. Aaru: population simulation evaluation (2026-09-24)

[Full methodology](https://www.aaru.com/publications/population-simulation-at-the-replication-floor-research).

The company reports 2,993 survey questions from 186 studies, observed mean total
variation distance of 7.62 percentage points, source retrieval cutoffs, and a
separate purchase-ranking evaluation. Crucially, it states that its core
row-level trajectory model and population generator **are not language models**.
The report evaluates univariate distribution accuracy; it explicitly leaves
higher-order accuracy and row-level logical coherence for future work. Its
confidence comparisons with Simile use separate evaluation sets.

Useful for JAS: report the actual measured target, sampling assumptions and
coverage; aggregate agreement cannot certify interaction mechanisms. Do not
describe Aaru as evidence that a thousand prompted LLM personas predict people.

### 19. Simile: confidence estimation (2026-08-25)

[Building confidence in Simile](https://www.simile.ai/blog/confidence).

The company evaluates error predictors on about 8,600 questions using five-fold
cross-validation with complete experimental samples kept together. It compares
basic features, embeddings, hidden-state probes and fine-tuned confidence models;
its best reported AUROC for a TVD threshold is 0.736. High average accuracy is
explicitly distinguished from accuracy on an individual case. The definition of
decision quality includes an internal rating exercise and remains provisional.

Useful for JAS: split benchmark families and complete experiments together;
report coverage versus error; do not present a model's self-reported confidence
as a calibrated quality score. Hidden-state methods are unavailable through
ordinary black-box provider interfaces and are not a plug-in JAS solution.

### 20. Artificial Societies: corrected current research (retrieved 2026-11-10)

[Current publications](https://societies.ai/publications),
[benchmark v2](https://arxiv.org/html/2609.30030v2), and
[detailed methods review](research/COMPANY_VALIDATION.md).

The initial survey followed stale links and understated the available research.
Current papers and public code are accessible. The empirical benchmark covers
twenty human sources, nine models and eleven separate tests, retaining coverage
failures rather than collapsing them into a universal score. Its synthetic
respondents do not interact. The conceptual fairness paper presents no new data;
the proprietary October comparison uses seven public sources and must be kept
separate from the broader benchmark. The deeper review examines these methods,
specialized decision-model claims and intervention assumptions directly.

Useful for JAS: validate specific claims, response relationships, intervention
effects and missingness separately. Survey fidelity does not establish interacting
agent validity. Scenario comparisons and cited transcript inspection are useful
UX references; neither persona count nor product appearance is validation.

## Provisional recommendations requiring deeper validation

### Research harness

Keep Pydantic AI and separate the conversation/research interface from the
participant-policy interface. The app's assistant/planner uses GPT-6.1 Sol;
current simulation participants use GPT-6 Luna. A question should produce a
structured research brief, not force every conversation into protocol generation.
The brief should name the mechanism, operational measures, competing explanations,
comparison, sampling/replication rationale, horizon, cost and unsupported needs.

Expose a small set of read-only research capabilities: discover supported
mechanics, inspect an environment specification, validate a candidate, run bounded
scripted probes and inspect cutoff-scoped run evidence. Progress should be stored
as public stages and evidence, never as hidden reasoning. Only a fully validated
candidate becomes reviewable. Design, execution and analysis remain separate
explicit actions so a conversation cannot silently spend on a population rollout.

Bound the work by provider requests, tool calls, tokens, time and budget. Use a
computed call envelope and record stop reasons. Set participant horizons according
to the mechanism: enough rounds for exposure and response, with predeclared hard
caps and optional objective terminal conditions. A larger arbitrary turn limit is
not an intelligence improvement. Any later adaptive stopping must be declared
before execution and accounted for statistically.

### Generated environments

Generate **specifications**, initially from a bounded declarative vocabulary,
rather than executable Python. Presets remain useful examples and editing entry
points, but should not define the full expressiveness of the interpreter.
General reusable primitives include typed shared/private state, roles and local
access, action preconditions and deterministic effects, communication edges,
scheduled interventions, measurements and terminal predicates. Cross-reference
validation and finite bounds are part of the language, not model advice.

Complexity must be discoverable: tell the researcher exactly which required
mechanics are executable, approximate or unavailable. A company, town or room is
a narrative setting; it becomes an experiment only when its actors, information,
decisions and consequences are operationalized. Never silently replace an
unsupported mechanic with a thematic prompt. New semantics require versioned
rules and replay tests; generated prose remains inert data.

### Collaboration and scale

Represent who can communicate with whom independently of the environment theme.
Directed edges, hubs, teams and broadcast permit comparisons of hierarchy,
decentralization, isolation and information bottlenecks. Measure deliveries and
actual exposure; do not leak the contents or existence of private messages.
Prefer sparse local observations and communication for large populations.

A thousand entities is not necessarily a thousand active LLM agents. Do not claim
thousand-agent support until bounded observations, storage, scheduler, API
pagination, cost envelopes and a realistic load test demonstrate it. Full
checkpoints are useful at JAS's current scale, but become a storage bottleneck
when every turn duplicates a large world. A worker/lease design and snapshot/event
compaction belong to a separately validated scaling phase.

### Evidence, visualizations and benchmarks

The researcher should see the protocol and assumptions, actual model/harness,
conditions/seeds, exposure and opportunity denominators, state-based outcomes,
uncertainty, failures, cost and replay. A graph or timeline should derive only from
recorded messages/actions/state; narratives and annotations must be labeled.
Participants see only their declared observations, permissions and available
memory. Analysis sees the selected evidence cutoffs and treats recorded prose as
untrusted evidence. Private reasoning is never a measurement or UI artifact.

For intelligence evaluation, freeze task families before running; separate
development from held-out families; repeat trials; preserve failed attempts;
compare under the same cost envelope. Check question fidelity, executable
mechanisms, causal isolation, information privacy, exposure, outcome correctness,
evidence-supported analysis and calibrated abstention separately. Use independent
scripted/payoff oracles, adversarial unsupported requests and task perturbations.
Report cost, reliability and coverage alongside correctness. A deterministic test
suite is an engineering gate, not a live intelligence score. A $10 pilot can
diagnose failures; it cannot substantiate a “100×” or universal-generalization
claim.
