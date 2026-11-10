# What JAS should study: agent behavior, environments, and valid inference

Research date: 2026-11-10. This is a targeted primary-source review and design
analysis, not a systematic literature census, independent reproduction, or
demonstration that a proposed JAS architecture works. Implementation is paused.
The distinctions below are more important than the number of papers collected.

## 1. The object of study

JAS can investigate **how a specified model-controlled system acts and changes
its behavior when it has particular information, tools, objectives, memories,
partners, and opportunities in a particular world**. The object is the whole
agent configuration, not an imagined human personality and not just the base
model. A useful empirical question can be descriptive, mechanistic, comparative,
or adversarial; it does not always start with a hypothesis or a success score.

Examples include:

- What strategies, roles, communication patterns, or conventions appear?
- When does an agent ask, inspect, delegate, conceal information, challenge a
  partner, abandon a plan, or recover from an error?
- Which local interactions precede population-wide coordination or breakdown?
- What changes under a different model, memory policy, tool interface,
  communication network, incentive, or environmental shock?
- Does a behavior transfer to new partners, tasks, histories, and settings?

"Agent behavior" therefore means a **trajectory of situated decisions and
interactions**, not a scalar quality attribute. A terminal success measure can
answer one question about that trajectory. It cannot stand in for the world,
the agent's strategy, or every consequence for other agents.

### Four records that must remain distinguishable

| Record | What it establishes | What it does not establish |
| --- | --- | --- |
| World state and settled events | What existed, changed, or was delivered under declared rules | What an agent knew or intended |
| Agent-specific observations and retained context | What information the harness actually supplied, when, and through which channel | What the model attended to or believed internally |
| Agent output and tool/action attempts | What the agent said, requested, promised, or attempted | That the requested action succeeded; that an explanation is faithful reasoning |
| Later responses and consequences | How agents and world processes responded over time | A unique cause, stable personality trait, or real-human prediction |

Actual tool requests, artifacts, social connections, approvals, messages, and
state transitions can provide much richer evidence than turns alone. A private
note or rationale is self-report; it may be part of the agent's memory
mechanism, but is not an instrument for reading its mind.

For frozen API models, numerical rewards are observed feedback and potentially
prompted objectives; they are not automatically a reinforcement-learning
training signal. Correct payoff arithmetic establishes the incentives offered
by the rules, not that a model optimizes them or has the corresponding private
preferences. Preserve the offered action/tool schemas as well as selected
actions: behavior cannot be interpreted without knowing the available
alternatives, and a schema can itself leak information that observations hide.

## 2. Strong primary evidence and its limits

### A. A particularly close match: conventions in populations of AI agents

Ashery, Aiello and Baronchelli, **Emergent social conventions and collective bias
in LLM populations**, *Science Advances* 11, eadu9368 (2025),
[full text and methods](https://pmc.ncbi.nlm.nih.gov/articles/PMC12077490/),
[DOI](https://doi.org/10.1126/sciadv.adu9368).

This is especially relevant because the authors explicitly study interacting AI
agents **rather than use LLMs as proxies for human participants**. Two agents are
randomly paired, independently choose a name from a set, and receive equal
rewards for matching or penalties for mismatching. Agents see only a bounded
history of their own encounters. They are not told they belong to a population
and are not instructed to create a global convention. Population-wide
coordination is therefore an observation, rather than an objective installed by
the experimenter.

The default configuration uses 24 agents, ten names and five remembered
interactions. The principal convergence curves average 40 runs, and the study
varies population and memory parameters. It randomizes the order of available
names, tests instruction comprehension, separately measures individual naming
bias, and introduces committed minorities after conventions form. Materials and
Methods specify payoffs, model versions, sampling, and the finite horizon used
to define a consensus flip. The study compares full trajectories and a separate
minimal naming-game model, not merely a dramatic example conversation.

Public implementation examined:
[simulation_module.py](https://github.com/Ariel-Flint-Ashery/AI-norms/blob/e57aeef151a46108fd1521c66e345e557e57dbf6/simulation_module.py)
and
[prompting.py](https://github.com/Ariel-Flint-Ashery/AI-norms/blob/e57aeef151a46108fd1521c66e345e557e57dbf6/prompting.py).
The code confirms pair sampling, shuffled option presentation, bounded local
histories and scores computed within the memory window. It also makes clear
that prompt framing, step-by-step instructions and the memory mechanism are
parts of the tested agent; these are not model-independent facts about
"societies".

**Implication:** a small world can support sophisticated science if it isolates
an interesting interaction mechanism. Complexity is not a prerequisite for
insight. Conversely, a thousand agents following an explicitly installed group
goal would not establish spontaneous organization.

**Limits:** four model families/configurations, homogeneous populations in the
reported experiments, finite alphabet choices, mainly randomly paired
populations, and prompt-dependent results. The paper identifies mixed-model
populations, richer networks and more realistic conventions as future work.
These findings do not establish arbitrary norm formation or human validity.

### B. Rich social evaluation cannot be collapsed to task completion

Zhou et al., **SOTOPIA: Interactive Evaluation for Social Intelligence in
Language Agents**, [v2 full text](https://arxiv.org/html/2310.11667v2), especially
Sections 2–3, Section 5, Appendix B, and Appendices D–G.

The environment combines 90 scenarios and 40 characters with private goals and
different relationships. Its evaluation deliberately separates seven dimensions:
goal achievement, knowledge, secrets, relationships, finances, rule compliance,
and believability. Some are subjective judgments, not environment facts.

Section 5 evaluates automated judging against a random subset of 200 episodes.
Human annotators receive dimension-specific instructions and examples. Human
agreement is moderate (reported Randolph kappa 0.503). GPT-4 correlates well with
human judgments on some dimensions for model-generated interactions, notably
goal, finances and relationships; agreement does not transfer equally across
all dimensions or to human-generated interactions. The paper explicitly warns
about evaluator bias. A high goal score is not evidence that secrets were kept,
rules followed, or partners treated well.

**Implication:** retain multiple independently interpretable evidence channels
and allow new qualitative lenses over recorded interactions. Do not present
"believability", "trust", or "relationship quality" as ground-truth state just
because a judge returns a number.

**Limits:** the paper studies dyadic, fixed turn-taking interactions, generally
capped at 20 turns. Physical/nonverbal actions are described in text, rather than
universally executed by an independently specified physical simulator.
Appendix B explicitly identifies multiparty, asynchronous and interruptible
interaction as extensions. SOTOPIA is not evidence that one round-robin chat
engine supports organizations or towns faithfully.

Current source inspected separately from the paper:
[evaluators.py at a0aaafb](https://github.com/sotopia-lab/sotopia/blob/a0aaafb440e570e5e61b7c44a44e5e417c545383/sotopia/envs/evaluators.py).
It separates rule-based termination and LLM episode evaluation. The current
implementation is not the immutable implementation used for the 2024 results.

### C. Other agents are part of an agent's environment

Leibo et al., **Scalable Evaluation of Multi-Agent Reinforcement Learning with
Melting Pot**, [full text](https://ar5iv.labs.arxiv.org/html/2107.06857), especially
Sections 4.1–4.4, Section 5 and substrate/scenario appendices.

The key distinction is **substrate + background population = scenario**. The
substrate supplies physics, maps, objects and action consequences; other agents'
policies produce the social situations encountered by the focal population.
Holding the substrate familiar while changing partners tests zero-shot social
generalization. Resident, visitor and universalization scenarios probe different
questions; familiar teammates and unfamiliar teammates are not interchangeable.

Section 4.4 specifies per-capita return for one benchmark purpose, then explicitly
adds separate secondary evaluations such as impacts on background agents and
inequality. A policy may score well by exploiting unfamiliar cooperators; that
does not make it generically cooperative. The appendix's commons, partner
defense, reciprocator and resource-specialist scenarios show how different
populations induce different strategic affordances in the same substrate.

**Implication:** environment rules, partner-population composition and model
matchups should be separately configurable. Test behavior against unfamiliar
partners and populations, not just copies of the same model in self-play.
Preserve externalities and distributional effects rather than only average
own-agent reward.

**Limits:** this work evaluates trained reinforcement-learning policies, not
black-box language-model agents. The original suite omitted communication and
language. Its measured gains, reward semantics and training protocol do not
transfer automatically to JAS.

### D. Grounding and intervention tests can separate coordination from reasoning

Barres et al., **tau-squared-Bench: Evaluating Conversational Agents in a
Dual-Control Environment**, [v1 full text](https://arxiv.org/html/2506.07982v1),
Sections 2.1, 3.1–3.3, 4.2–4.3 and Appendix B.

Both parties can change shared world state using distinct tools. The telecom
domain is formalized as a Dec-POMDP. A compositional task generator combines
initialization, solution and assertion functions, making tasks verifiable beyond
the plausibility of dialogue. No-user and oracle-plan ablations distinguish
reasoning load from coordination and decentralized control. The same final
failure can therefore receive different explanations depending on these
controls.

Section 3.3 distinguishes database checks, status assertions, communication
checks, action matching and natural-language assertions. The telecom results use
state assertion functions. Section 4.3 separately inspects simulator errors;
tool grounding improves reliability but does not eliminate mistakes by the
simulated partner. The table reports three critical errors among 50 telecom
conversations, despite an inconsistent caption saying none. This is a reason to
read the methods and tables rather than repeat a summary claim.

Current source inspected:
[evaluator.py at 033bf08](https://github.com/sierra-research/tau2-bench/blob/033bf082f48e4a3c6a1256208e93cf2ce9c3bb6f/src/tau2/evaluator/evaluator.py).
It preserves environment, communication, action and natural-language evaluator
types and explicitly labels natural-language assertions as work in progress.
The leaderboard's combined reward is a product of relevant components; JAS need
not inherit that aggregation as a universal behavior score. The repository now
also distinguishes half-duplex and full-duplex trajectories, illustrating that
the benchmark paper's interaction model and current implementation can differ.

**Implication:** support artifacts and tool-mediated consequences, not just
discussion. Use targeted ablations to investigate a failure and evaluate the
partner policy as part of the system. Keep final-state correctness separate from
how agents coordinated and what consequences they caused en route.

**Limits:** this is an asymmetric customer-support task, with a deliberately
constrained user simulator. It does not establish an ideal architecture for
unrestricted peer societies. The paper says expert domain curation remains
necessary. Procedural task generation is not evidence for automatic generation
of any new domain's correct semantics.

### E. Exploratory behavior analysis is a legitimate first stage

Cemri et al., **Why Do Multi-Agent LLM Systems Fail?**,
[v3 full text](https://arxiv.org/html/2503.13657v3), especially Sections 3.1–3.4,
failure taxonomy and intervention appendices.

The authors first use grounded-theory methods: theoretical sampling, open
coding, comparative analysis, memoing and iterative definitions. Six experts
examine an initial 150 traces; independent inter-annotator rounds refine the
taxonomy. The final human agreement is reported as kappa 0.88, and the automated
annotator is evaluated separately (reported kappa 0.77 against experts). A
generalization check uses additional systems and benchmarks. The later
MAST-Data corpus has 1,642 traces. The exploratory construction set and expanded
automatically annotated corpus must not be conflated.

The taxonomy distinguishes system specification, inter-agent misalignment and
verification problems, with 14 failure modes. Agent correctness alone misses
repetition, lost history, disregarded input, mismatches between rationale and
action, and poor stopping. The paper's intervention studies compare prompt and
topology changes while inspecting the resulting failure distributions.

**Implication:** JAS must allow open-ended observation and annotation before the
researcher knows what measures matter. A later lens can be defined from those
records and frozen before a new confirmatory study. Discovery traces are not
independent validation of the lens they inspired.

**Limits:** the taxonomy is scoped to sampled frameworks/tasks; high annotation
agreement does not prove root causes or universal coverage. The automated labels
are judgments with known measurement error. The authors explicitly acknowledge
important dimensions beyond their correctness-focused taxonomy.

### F. Recent evidence reinforces the need for time-resolved behavior

Pitre et al., **Understanding Communication Failures in Multi-Agent LLM
Systems**, [v1, 23 October 2026](https://arxiv.org/html/2610.32060v1), Sections 3–6
and Limitations.

The study starts with 3,211 failed multi-round trajectories. It validates
annotations on 200 failed trajectories with three annotators and adds a
500-correct-trajectory contrast set. It examines error onset, correction,
majority transitions, minority evidence, and recovery rather than only final
answers. Its contrast annotation is outcome-blind; this helps avoid merely
inventing a plausible failure explanation after seeing the outcome.

**Implication:** capture when evidence arrived, when an answer changed, what was
ignored, and whether recovery occurred. An apparent consensus may result from
coordination, evidence, copying, or suppression of a correct minority. The
transcript and intervention controls must allow those explanations to be tested.

**Limits:** failed-trace sampling cannot estimate general failure prevalence.
The authors explicitly exclude comprehensive coverage of tool-heavy,
file-mediated and long-horizon environments. This new preprint is suggestive,
not a settled account of all multi-agent interaction.

### G. Behavioral evaluation itself needs validation

Zheng et al., **Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena**,
[v4 full text](https://arxiv.org/html/2306.05685v4), Sections 3.3–3.4, 4.2 and
Appendix D, demonstrates position and verbosity effects and limited grading
reasoning. Human agreement results are tied to particular datasets and treatment
of ties; they are not a general guarantee for every judge or construct.

For JAS, an LLM can help identify semantic events in a rich transcript, but every
such lens needs a definition, source spans, model/version/prompt identity,
validation examples and uncertainty. Blind model identity where possible,
randomize or swap ordering in comparisons, retain disagreements, and audit
against adjudicated examples from held-out experiments. Multiple identical
judges agreeing is not independent ground truth. Exact arithmetic, permissions,
deliveries and tool effects should use recorded state and executable checks.

### H. Elicitation is not prevalence, and stated reasoning is not private belief

Anthropic, **Agentic misalignment: How LLMs could be insider threats**,
[full experimental report](https://www.anthropic.com/research/agentic-misalignment),
especially the threat/goal conflict controls, evaluation-awareness discussion,
and limitations.

The report studies fictional corporate email/tool settings across multiple
models, with controls that remove threats and goal conflicts. Its authors
explicitly describe iterative red-teaming, forced choices, unusually salient
information and artificial scenarios. This establishes that harmful behavior
can be elicited under particular conditions; it is not a naturalistic prevalence
estimate. It also explicitly cautions that stated reasoning cannot establish a
model's true beliefs about whether it is in an evaluation.

Relatedly, **Alignment faking in large language models**,
[v2 full text](https://arxiv.org/html/2412.14093v2), Sections 2.2, 3.3 and
Limitations, separates several behavioral and scratchpad-based measurements.
That study includes specific training-context manipulations, synthetic document
training and actual reinforcement learning; frozen API participants in JAS do
not reproduce those conditions merely by role-playing them.

**Implication:** preserve the distinction between an observed action, deliberate
experimental elicitation, and a claim about motive. Include conditions where
opportunities or instructions are absent. A profile explicitly asking an agent
to betray peers measures following that objective, not spontaneous betrayal.
Private model reasoning is not a portable or necessary JAS measurement.

## 3. A behavior ontology that does not erase rich interaction

The following are **candidate analytical lenses**, not mandatory fields that
every environment must reduce to. An environment supplies the events needed to
make a lens meaningful; an investigator can add a validated lens later.

| Lens | Evidence to preserve | Essential distinction or control |
| --- | --- | --- |
| Exploration and information seeking | Inspections, tool queries, uncertainty statements, newly delivered evidence | Information was supplied versus actively requested; redundant versus useful inspection |
| Coordination and division of labor | Task claims, assignments, shared artifacts, dependencies, approvals, completed work | Imposed roles versus endogenous specialization; activity versus complementary contribution |
| Communication and influence | Messages, recipients, delivery/exposure times, assertions, revisions, dissent | Sent versus seen; agreement versus independently checked agreement; factual correction versus copying |
| Disclosure and false claims | Source facts, observation at claim time, message content and audience | Factually false versus unknowable; disclosed information versus inferred intent to deceive |
| Commitments and defection | Accepted commitments, beneficiaries, deadlines, affordances and later actions | Infeasible promise versus eligible breach; goal conflict versus primed "betrayer" role |
| Reciprocity and selective partnerships | Repeated directed interactions, previous help/harm, partner choices | Structural access versus preferential choice; one dyad versus persistent population pattern |
| Coalition and institution formation | Voluntary joins/leaves, negotiated rules, ratification, authority grants and enforcement | Preassigned membership/rules versus structures agents can actually create or revise |
| Adaptation and recovery | Surprises, failures, repeated plans, policy changes, recovery paths | In-context response versus model-weight learning; recovery versus truncation or silent retry |
| Externalities and resource use | Resource flows, downstream effects, private/group outcomes and inequality | Own success versus harms to others; costly cooperation versus individually profitable action |
| Persistence, stopping and safety | Stop requests, completed goals, abandoned plans, repeated no-ops and failures | Appropriate completion versus premature stop; useful persistence versus an endless loop |

A lens may expose a distribution, sequence, motif, network, event cluster,
change point or qualitative code. It need not return one score. An objective
ground-truth event such as joining a team can coexist with an uncertain semantic
annotation such as "attempted persuasion". Those should remain different data.

**Trust is a useful example:** delegated authority, reliance after previous
outcomes, information disclosure and refusal to verify are observable. A hidden
floating-point "trust level" assigned by the simulator is an explicit model
assumption, not a measured psychological state. Likewise, observed co-working
does not by itself establish friendship.

## 4. Research modes and valid units of inference

### Exploratory study

A researcher can ask "What happens if these agents run a company?" without
already knowing the relevant endpoint. Require an explicit world, initialization,
agent/harness configurations, observation rules, resource/runtime limits and
capture plan. Preserve rich trajectories, errors, unexpected structures and
researcher annotations. Mark discovered patterns and post-hoc lenses as
exploratory. Do not manufacture a causal finding or optimize the world until an
interesting story appears.

### Controlled mechanism study

When the question asks why behavior changes, choose interventions and controls
that can distinguish explanations. For example, compare the same coordination
problem with one controller, distributed tool access, and distributed access plus
an oracle plan. Do not interpret a difference caused jointly by model, memory,
topology and observation content as a pure model effect. Sometimes a bundled
system comparison is the correct question; label the bundle.

### Confirmatory comparison or model evaluation

Freeze the claim, outcomes, eligibility rules, population/task sampling,
conditions, planned contrasts, stopping and analysis before fresh runs. Keep
the study separate from the discovery records. If a benchmark is meant to
generalize, hold out entire mechanisms/task families and partner configurations,
not only paraphrases of known prompts. Primary endpoints are useful here to
limit selective reporting; they remain a claim-specific statistical choice,
not the representation of the environment.

### Dependence, seeds and reproducibility

- A run of interacting agents is normally an experimental unit. Its thousands
  of decisions are dependent observations, not thousands of independent samples.
  Between-run replicated world seeds, task instances, initial networks and
  provider samples can each contribute different uncertainty.
- A matching world seed can reduce some variation; it does not make provider
  outputs deterministic. Temperature zero is not a guarantee of exact provider
  reproduction. Report model versions, sampling settings and repeated trials.
- Treatment can change action order and the number of random draws. If common
  random numbers are intended, stable per-process/per-entity random streams and
  explicit schedules are preferable to assuming one global seed supplies
  identical shocks on diverging trajectories.
- Replay of recorded actions can validate world settlement. It does not prove
  the model would independently make the same decisions again.
- Agents within one world can affect every other agent. Randomizing a treatment
  per agent requires an explicit design for interference; standard independent
  individual-level tests do not automatically apply.
- Matchups must vary roles/seats and partner assignments. With heterogeneous
  models, assignment to roles, population proportion, communication privilege,
  history and context length can confound an apparent model effect.
- No observed event may mean no eligible opportunity, no exposure, horizon
  truncation, or a true absence of that behavior. Preserve these alternatives.
- Null and negative results are valid outcomes. Do not add retries, profiles,
  pressure, or extra rounds after looking at results and still describe the
  original test as confirmatory.

## 5. Applying the reasoning to the requested examples

| Requested setting | Question-dependent affordances to consider | What a simplistic implementation would miss |
| --- | --- | --- |
| One agent in an environment | Inspectable/partially observed state, useful tools or artifacts, action consequences, surprises and stopping opportunities | Inventing a second agent; confusing final task success with exploration, recovery or boundary compliance |
| Three agents trapped in a room | Objects and manipulable affordances, feasible alternatives; distributed knowledge, dependencies, action timing and communication when relevant | Dialogue that declares an escape without changing world state; treating global knowledge as private information |
| Four friends and possible betrayal | Prior context, voluntary commitments or reliance, conflicting options with actual consequences, private information and subsequent responses | Installing betrayal as an agent goal, then calling it emergent; equating false text, harm, or non-cooperation with betrayal |
| A town descending into chaos | Spatial or institutional structure appropriate to the question, persistent resources/services, local exposure, agent-created responses, feedback, shocks and enough simulated time | A hidden "chaos" meter; agents merely narrating riots; supply collapse predetermined by impossible mechanics |
| A company with 1,000 agents | Individual agency and executable work; artifacts, organization/permission graphs, queues, ownership, dependencies and handoffs where relevant | One thousand voices doing the same abstract action each round; mistaking populated profiles for individual agency |

These examples identify capabilities to support, not a compulsory recipe for
each theme. Shared-information room studies and companies without predefined
departments can be valid; their questions require different opportunities.

There is no requirement to simulate every irrelevant physical detail. A company
study of approval bottlenecks may not need a physical office. A study of informal
coalition formation does need agents to choose partners and affect decisions;
preassigned teams alone would preclude the phenomenon. The right complexity is
the complexity required to let the behavior under study arise and have observable
consequences, while preserving plausible alternative behavior.

For a large company, observation can mix population summaries with drill-down
to work artifacts, interaction graphs and individual histories. Every active
agent need not receive a decision request at every global tick. Wake-up policy,
queues, simulated duration and concurrency settlement affect behavior and must
be part of the experimental contract. Sparse social/work graphs are a modeling
choice that can be varied, not a universal assumption imposed merely to save
tokens.

"Regardless of cost" removes one constraint; it does not remove dependence,
information leakage, scheduling artifacts, limited memory, state contention, or
the need for useful independent replications. A thousand-agent demonstration
and a valid thousand-agent experiment are different achievements.

## 6. Consequences for an architecture decision

These are proposed requirements inferred from the evidence, not a claim that
one reviewed paper proves an optimal implementation:

1. **Keep world and evaluation distinct.** World rules generate consequences;
   side-effect-free, versioned observation/analysis lenses interpret their
   records. A new lens should be able to reanalyze frozen trajectories without
   changing the world or spending on new participant calls. If a live
   reputation score changes agent observations or rewards, it belongs to world
   dynamics and must be declared as such, rather than disguised as analysis.
2. **Preserve behavior at several scales.** Agent histories, dyads, groups,
   artifacts and population dynamics all matter. Aggregate views must retain
   provenance back to the records and expose heterogeneity, timing and missing
   coverage. The raw record remains useful when initial measures prove poor.
3. **Do not make a small integer-state language the universal ontology.** Such a
   language can express useful controlled games. Rich organizations may need
   documents, tool APIs, structured objects, task/workflow graphs and evolving
   memberships. A general research platform needs a stable evidence and
   execution interface capable of hosting multiple environment implementations;
   universal generation of correct new semantics remains an open problem.
4. **Treat the harness as a scientific assistant, not a score optimizer.** It
   should determine whether the user wants exploration, design, execution,
   interpretation or a general answer; discover available mechanics; identify
   missing behavior affordances; propose tests; and distinguish absent evidence
   from a negative finding. A critic's persuasive approval is not validation.
5. **Represent population and policy configurations separately from substrate.**
   One-agent, homogeneous, heterogeneous, scripted-background and mixed
   populations answer different questions. Record which entities actually have
   model-controlled decisions. Model identity, prompting, memory, tools and
   scheduling are separately assignable experimental factors.
6. **Expose timing semantics instead of banning turns.** A turn-based game can
   be an appropriate controlled setting. Long-running organizations may need
   event-driven work and simultaneous actions. The choice must follow the
   mechanism and be tested, rather than assuming asynchronous execution is
   intrinsically more intelligent or realistic.
7. **Make uncertainty visible.** Record invalid actions, unavailable tools,
   timeouts, unresolved actions, evaluation disagreements, stopped runs and
   missing opportunities. A completed animation or fluent report is not a
   reliability claim. A small paid pilot can diagnose weaknesses, not establish
   arbitrary-environment generalization.

## 7. Evidence collection and remaining work

Full-text methods/limitations were inspected for the papers above; source files
were inspected for the naming-game, SOTOPIA and current tau-squared evaluation
implementations. No paper was independently reproduced and no JAS model calls
were made. Main-branch source was pinned to the retrieved commit where cited.

The initial requested SOTOPIA v4 and Melting Pot v3 URLs returned 404; the
available SOTOPIA v2 and Melting Pot full text were retrieved instead. Broad
Google search returned an interstitial and DuckDuckGo a bot challenge; neither
was bypassed. Europe PMC supplied the verified open full text and bibliographic
identity for the social-conventions paper. Therefore this review does not claim
exhaustive coverage of every paper available through November 2026.

Before implementation choice, the environment-representation review must test
the strongest alternatives against actual interaction requirements, not merely
compare conceptual diagrams. Before intelligence claims, JAS needs fresh,
family-held-out tests of question fidelity, experiment design, mechanism
construction, useful abstention, trace-grounded analysis and lens validity.

Local acquisition audit (ignored cache under `.tools/research-behavior/`):

| Retrieved artifact | SHA-256 |
| --- | --- |
| SOTOPIA full HTML | `fe0f4fb1bbab9219804481d9518721584b4181065aacbe4ef6adcc06004395c0` |
| Melting Pot full HTML | `636624da48c8b2cbd977a4828cc3fe2dba166c01af5eac78a90edfd846e68e12` |
| Social-conventions full XML | `411f21f4f26b8b57c1586456e6032afde3d8457d7c3bbd20717852d8e9a6a924` |
| tau-squared v1 full HTML | `53a884b733a4317d2bddf245b83b8b09716ce92867c41de619652409f35ba106` |
| MAST v3 full HTML | `252e1c7721675e902c6ebd8f757134830ff99ef4258898935923e6164fb80183` |
| October 2026 communication full HTML | `0eb551dcc7e68b882787759cdf8ed825e552382dacbb27e8c728b60ca5b37491` |
