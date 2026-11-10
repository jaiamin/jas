# Evidence for an intelligent experiment-design harness

Research date: 2026-11-10. **Research only; implementation is paused.** This report
examines full methods, evaluation sections and selected public implementations.
It is an engineering synthesis, not a systematic review, an independent
reproduction, or evidence that JAS has improved. The earlier survey should not be
treated as a settled architecture decision.

## The question that the evidence can answer

JAS needs a researcher capable of turning an underspecified question about model
behavior into an interpretable experiment, and of explaining existing evidence.
That is different from giving every participant a more elaborate persona or
making a simulated organization complete its task successfully.

There are **two harnesses**:

- The **researcher harness** retrieves evidence, formulates competing explanations,
  selects or extends the environment, proposes manipulations and observations,
  checks mechanisms, and analyzes the resulting records.
- The **participant harness** supplies a model with observations, memory,
  tools, goals and a policy for deciding when to act. Its design is part of what
  an experiment may vary. A planner/reflection loop is an intervention, not a
  neutral improvement when studying behavior.

Both must be separate from the world that settles actions. A researcher that
silently instructs participants to cooperate, form coalitions or experience
social needs cannot then claim that the instructed behavior emerged naturally.
For JAS the object of study is the model **under a declared harness and
environment**, not a context-free personality and not a human population.

## What the strongest directly relevant systems actually establish

### AgentSociety 2: the closest research workflow, with important qualifications

Full text examined: [AgentSociety 2, arXiv:2607.11895v2](https://arxiv.org/html/2607.11895v2).
Relevant sections are [3.1](https://arxiv.org/html/2607.11895v2#S3.SS1),
[4.1–4.6](https://arxiv.org/html/2607.11895v2#S4.SS1),
[6](https://arxiv.org/html/2607.11895v2#S6.SS1), and
[9.4](https://arxiv.org/html/2607.11895v2#S9.SS4).

The researcher workflow has a real separation between research descriptions
and executable configuration. `HYPOTHESIS.md`, `SIM_SETTINGS.json` and individual
`EXPERIMENT.md` files describe hypotheses, groups and selected modules.
`init_config.json` instantiates agents and environments; `steps.yaml` specifies
simulation, intervention, ask and questionnaire steps. Records include replay
SQLite data and separate generated artifacts. This is useful evidence for
separating intent, execution and interpretation rather than treating a protocol
JSON object as sufficient scientific design.

The harness has coarse workflow progression and finer analysis phases. Structural
gates check artifacts and references; an assistant supplies an attestation of
methodological judgment. Source inspection substantially narrows what "gate"
means. The public
[harness contract](https://github.com/tsinghua-fib-lab/AgentSociety/blob/f70be25b9432a331c116db1301a796467dd8d2a8/extension/skills/agentsociety-analysis/v1.0.0/references/harness-contract.md)
explicitly separates deterministic checks from LLM judgment. The
[attestation specification](https://github.com/tsinghua-fib-lab/AgentSociety/blob/f70be25b9432a331c116db1301a796467dd8d2a8/extension/skills/agentsociety-analysis/v1.0.0/references/phase-attestation.md)
says the harness checks required rubric keys are present and nonempty; **it does
not grade prose quality**. Fingerprints detect changed artifacts and stale
attestations. Operation receipts, idempotency and duplicate-work exclusion improve
operational traceability; they do not certify a hypothesis or causal explanation.

The participant architecture uses progressive skill discovery, private workspaces,
tool execution and context management. Skill headers expose limited metadata;
full instructions and resources are loaded on demand. Context compression
preserves complete history outside the current prompt. These are implementable
patterns, but the paper does not establish that this combination is the best
participant policy for arbitrary behavioral research. Its cognition, emotion and
needs skills embody assumptions that JAS should expose as experimental factors.

The evidence is also narrower than an end-to-end intelligence benchmark:

- Section 6.1 evaluates routing against annotated module functions, arguments and
  call order on inputs collected from simulation calls. It tests correct
  operation selection, not whether the researcher asks a valuable question.
- Section 6.3 evaluates routing overhead for **100 agents over 40 steps**, with
  cold and warm cache runs. This should not be cited as a measured thousand-LLM
  study or a benchmark of hypothesis quality.
- Seven studies illustrate different domains and include custom agent/environment
  implementations. In the information-cocoon study, section 7.4 explicitly requires
  watch decisions from user-specific rule code without free-form generation.
  The evolutionary norms study also uses represented strategies and mutation.
  Not every entity or interaction in the headline scale is an independent
  language-model decision.
- Section 4.4 itself calls experiment design a **template-guided,
  constraint-driven translation** with researcher refinement. The paper does not
  show that arbitrary requests are autonomously translated correctly.
- Section 9.4 explicitly distinguishes auditability, simulation realism and
  experimental-mechanism validity. None entails the next.

**Implication for JAS:** artifact-backed stages, capability discovery and
appropriate deterministic checks are justified candidates. Copying an analysis
rubric, a skill system or a code router is not evidence of general research
competence. A capability limit must be represented explicitly rather than hidden
by an apparently complete attestation.

### The AI Scientist-v2: flexible search, not demonstrated per-attempt reliability

Full text examined: [arXiv:2504.08066v1](https://arxiv.org/html/2504.08066v1), especially
[3.1–3.2](https://arxiv.org/html/2504.08066v1#S3.SS1),
[4.1–4.2](https://arxiv.org/html/2504.08066v1#S4.SS1), and appendix C.

The system moves beyond fixed starting code by using literature-assisted idea
generation and experiment-tree search. A progress manager organizes preliminary
investigation, baseline tuning, agenda execution and ablations. Search nodes
retain code, intent, errors, runtime, metrics, plots and reviews; specialized
nodes represent debugging, hyperparameters, ablation, replication and aggregation.
The public
[journal implementation](https://github.com/SakanaAI/AI-Scientist-v2/blob/96bd51617cfdbb494a9fc283af00fe090edfae48/ai_scientist/treesearch/journal.py)
and
[agent manager](https://github.com/SakanaAI/AI-Scientist-v2/blob/96bd51617cfdbb494a9fc283af00fe090edfae48/ai_scientist/treesearch/agent_manager.py)
make those distinct artifacts inspectable. This is richer than repeatedly
rewriting one proposal after a verbal critique.

Its workshop result needs the full denominator. Roughly forty initial ideas
were generated; humans selected three ideas, executed multiple complete runs
with different seeds, and selected one complete manuscript per idea for
submission. One of the three submitted manuscripts cleared the workshop
threshold. The authors explicitly say the study asks whether at least one paper
can survive peer review, **not what fraction of runs succeeds**. The authors'
own audit found limitations including substantial training/test overlap in the
accepted paper and mismatches between figures and narrative. None met their
main-track quality standard.

**Implication for JAS:** preserve branches and failed designs when exploring
alternatives; obtain execution evidence before selecting a candidate; record
every attempt and selection. Do not interpret "one attractive output after
search" as reliable autonomous science. Tree search and code generation are
options with real cost and verification burdens, not required evidence-based
defaults for every chat request.

### Agent Laboratory: useful human oversight, fragile self-evaluation

Full text examined: [arXiv:2501.04227v1](https://arxiv.org/html/2501.04227v1), sections
3–5 and the evaluation prompts. The study produced fifteen autonomous papers
across five research topics and three backends, evaluated by ten volunteer PhD
students, and also examined a co-pilot mode. Its solver evaluation covers a
subset of ten low-complexity text/tabular MLE-Bench tasks.

The important evidence is the divergence between execution, report quality and
scientific value. Co-pilot feedback improved several reviewer dimensions, but
the study does not establish robust open-domain research performance. Its
limitations report fabricated experimental details in generated reports,
automated-review disagreement with humans, repetitive search/summarization,
context overflow, uncorrected degenerate experiments, and generated host-level
subprocess commands. The MLE-Bench comparison also averages valid submissions
from competing methods after excluding invalid submissions, so its comparative
mean is not a clean intention-to-evaluate reliability measure.

**Implication for JAS:** keep claim support linked to recorded execution and
independent calculations; report pipeline completion separately from quality.
Bound search and repair without hiding failed attempts. Code-generation access
requires an actual execution isolation design, not a reviewer saying it looks
safe. User review is particularly useful for consequential ambiguity, not as
a substitute for automated rule validation.

### ScienceAgentBench: evaluate the constituent scientific work directly

Full text examined: [arXiv:2410.05080v1](https://arxiv.org/html/2410.05080v1),
[task construction](https://arxiv.org/html/2410.05080v1#S2.SS2),
[evaluation](https://arxiv.org/html/2410.05080v1#S2.SS3), and
[setup](https://arxiv.org/html/2410.05080v1#S3).

This benchmark extracts 102 tasks from 44 peer-reviewed publications in four
disciplines. Nine subject experts validate task realism and rubrics; annotators
cross-check one another's tasks and run reference programs. It distinguishes
valid execution, output success, code similarity and cost, with stepwise
rubrics as a complement. Figure quality remains partly model-judged, so even
this benchmark is not entirely an executable oracle.

The evaluation catches shortcuts such as reading test labels instead of training
a model. It modifies datasets and withholds test labels to make those shortcuts
fail. A simpler self-debug framework outperforms the more expansive CodeAct
framework in this task distribution; this supports testing the value of tools
and loops rather than presuming a larger harness is better. Main results use
the best of three independently executed attempts; mean results are separately
reported. Those are different reliability estimands and must not be conflated.

**Implication for JAS:** measure design translation, mechanism verification,
execution and interpretation separately. A compelling report is insufficient.
Hidden counterexamples, independent reference environments and task-specific
checks are necessary. Keep both first-attempt reliability and best-with-budget
performance, including selection cost and the method used to choose outputs.

### MAST and scaling studies: coordination is an empirical factor

Full texts examined:
[MAST, arXiv:2503.13657v1](https://arxiv.org/html/2503.13657v1#S3) and
[Towards a Science of Scaling Agent Systems, arXiv:2512.08296v3](https://arxiv.org/html/2512.08296v3#S4).

MAST derives failure categories through grounded-theory analysis rather than
reducing each trace to task success. Its human taxonomy construction examines
more than 150 traces across five systems, while annotation-agreement refinement
uses three rounds of five traces and automated-annotator validation uses ten
traces. The much larger automatically analyzed corpus should not be described
as equivalently human-validated. Failures include specification problems,
misaligned interaction, missing verification and premature termination. This
is useful for diagnostics, not a validated universal causal model of failures.

The scaling study compares canonical single-agent, independent, centralized,
decentralized and hybrid structures under controlled budgets across six task
benchmarks. Benefits depend strongly on task decomposition and sequential
constraints. Its own [limitations](https://arxiv.org/html/2512.08296v3#S5) describe
modest team sizes, prompt sensitivity, small task subsets for costly benchmarks,
wide intervals, only six dataset clusters and preliminary frontier-model transfer
within one benchmark. Several regression effects lose conventional significance
under conservative inference. The results cannot be extrapolated into a rule
that four agents are optimal or a thousand agents cannot be useful.

**Implication for JAS:** researcher delegation and participant topology should be
tested. For research questions about populations, a thousand agents may be the
phenomenon of interest, not a way to maximize task-solving accuracy. For a task
solving comparison, include a single-agent baseline and state the compute
matching criterion. These are different experiments.

## Additional evidence on adaptation and context

[AFlow, arXiv:2410.10762v1](https://arxiv.org/html/2410.10762v1#S4) learns code-based
workflows through search over operators and executable feedback. It evaluates
candidate workflows repeatedly on validation data and reserves separate test
data. Crucially, the authors scope their tasks to reasoning problems with
readily available evaluation functions. This supports adaptive workflow
selection **when a trustworthy objective exists**, not optimizing an open-ended
research scientist against its own persuasive quality rating.

[Agentic Context Engineering, arXiv:2510.04618v1](https://arxiv.org/html/2510.04618v1#S3)
uses generator, reflector and curator roles with itemized incremental context
updates. Its [experiments](https://arxiv.org/html/2510.04618v1#S4) distinguish
offline adaptation from sequential online test-time adaptation; its financial
tasks show that noisy feedback can make adaptation harmful. Its
[limitations](https://arxiv.org/html/2510.04618v1#A2) require a sufficiently capable
reflector. This supports versioned, evidence-backed research memory as a
candidate; it does not justify silently adapting participant policies between
experimental replications. Learning across runs is a different treatment from
independent trials and needs its own protocol.

[DiscoveryBench, arXiv:2407.01725v1](https://arxiv.org/html/2407.01725v1) represents
answers through facets involving contexts, variables and relations, rather than
grading a fluent essay alone. It helps motivate structured claim assessment.
It does not solve environment construction or validate arbitrary new constructs.
[DeepResearch Bench, arXiv:2506.11763v1](https://arxiv.org/html/2506.11763v1) separates
report-quality assessment from citation-related assessment, which is useful for
the literature-research component. Neither benchmark is sufficient for JAS's
design→world→behavior chain.

## Comparing plausible researcher-harness organizations

These are candidates to test, not a result that one architecture is universally
best. They concern the researcher, not the number of simulated participants.

| Candidate | What it can do well | Failure that must be tested | Evidence limit |
| --- | --- | --- | --- |
| One general researcher with typed tools and persistent artifacts | Maintains question context, discovers capabilities, inspects and revises candidates without a rigid template for every conversation | Self-confirmation, overlooked alternatives, context loss, circular self-grading | Directly implementable; no paper here proves it is optimal for JAS |
| Coarse research workflow with specialist subagents | Independent literature, implementation and evidence-review contexts; distinct artifact responsibilities | Telephone-game losses, duplicate work, specialists sharing assumptions, costly superficial agreement | AgentSociety2 and AI Scientist-v2 demonstrate patterns; no clean JAS-like architecture ablation |
| Code-generating scientist with branch search | Can add semantics unavailable in a fixed library and explore genuine alternative implementations | Wrong-but-runnable code, test leakage, security exposure, selection bias, extreme search cost | Existing systems demonstrate flexibility and notable failures; auditability is not validity |
| Fixed template/configuration planner | Predictable output format and inexpensive constrained edits | Rejects or disguises novel mechanics; treats counts and schema completion as design intelligence | Useful baseline and narrow operating mode, inadequate as the only interface |

The common supported direction is **a small researcher interface over diverse
capabilities with inspectable artifacts and verifiable transitions**. The
evidence does not force a permanent swarm of researcher personas, an omniscient
LLM judge, or a universal integer-state language. A restricted language may
handle some mechanisms well; unsupported semantics need an explicit extension
path, not a narrated substitute.

## What the harness should be able to reason about

A research artifact should connect the question to the actual evidence chain:

1. **Target:** which observable behavior and which model/harness population is
   being studied? Exploration can ask what happens without predicting a sign.
2. **Competing mechanisms:** what alternative explanation could produce the
   same outcome? Which intervention or observation discriminates between them?
3. **World requirements:** which objects, affordances, information rules, temporal
   dependencies and irreversible consequences are needed? Which are absent?
4. **Participant assumptions:** model identity, goals, memory, tool-use loop,
   inference budget and inter-agent access. Which are held fixed or varied?
5. **Execution design:** relevant population resolution, scheduling semantics,
   intervention timing, independent replications, stopping rules and failures.
6. **Evidence plan:** full action/communication/state records and a set of
   behavior-specific lenses. A primary endpoint constrains a confirmatory claim;
   it does not replace the environment or discard unanticipated interactions.
7. **Validation:** what can be verified before execution, what requires a pilot,
   and what remains interpretation? Solvability is not participant competence.
8. **Claim scope:** what would a negative result, missing opportunity or
   inconclusive comparison mean? Which conclusions are not identifiable?

The harness should discover and explain these choices. It cannot know an
"optimal" population or horizon for every new question in advance. It can
propose defensible alternatives, identify necessary resolution, and run an
explicitly authorized pilot or sensitivity study. Population selection must not
silently substitute background scripted actors for requested model participants.

For the supplied examples, this changes the researcher's job:

- **One agent:** choose a genuinely individual behavior question, such as
  recovery after contradictory tool feedback. A multi-agent critique panel is
  not automatically part of the participant policy.
- **Three trapped agents:** establish distributed knowledge, complementary
  actions, irreversible choices and timing; compare actual information access
  or communication arrangements. A joint escape score alone cannot identify
  whether information was shared, ignored or never available.
- **Four friends and betrayal:** define commitments, opportunities, knowledge,
  feasible alternatives and material consequences. A hostile message or an
  unfulfilled impossible promise cannot automatically count as betrayal.
- **A town:** distinguish endogenous institutions and resource/access changes
  from narrator-described chaos. The harness must discover whether a candidate
  environment can represent those feedback processes over time.
- **A thousand-person company:** decide whether the question requires individual
  employees, groups, artifacts, task handoffs or evolving authority. Team counts,
  work products, local information and paths of influence matter as much as
  population size. Preserve worker identities when individual behavior is the
  subject; disclose any aggregation and test its sensitivity.

## A benchmark capable of rejecting a superficially sophisticated harness

The benchmark should test the researcher with **independent target mechanisms**,
not reward completion of forms that it was prompted to fill out. It should
separate component tests from full-loop experiments and preserve raw attempts.

| Assessment track | Example challenge | Independent evidence for assessment |
| --- | --- | --- |
| Question fidelity | A proposed betrayal study lacks any privately profitable alternative | Hand-built payoff/opportunity oracle; reject thematic substitutions |
| Environment selection and extension | A room puzzle requires simultaneous complementary actions, unavailable in a sequential preset | Reference transition system and scheduler witnesses; truthful gap detection |
| Information correctness | A hidden-state difference leaks through legal-action filtering | Paired hidden-state observation and schema noninterference checks |
| Design quality | Authority and information visibility change together despite a claimed isolated contrast | Computed factor differences plus independent review of mechanism semantics |
| Behavioral interpretation | Identical task success comes from a coercive hierarchy and voluntary coordination | Grounded trace questions with distinct permitted conclusions; inspect exposure and responses |
| Tool-grounded repair | A valid-looking candidate contains an unreachable prerequisite cycle | Hidden counterexample and a revised executable witness, not verbal assurances |
| Evidence discipline | A recorded note tells the analyst to ignore an unfavorable event | Prompt-injection tests; exact cutoff/citation checks; no invented requests or outcomes |
| Generalization | Familiar mechanics appear in unseen combinations and surface stories | Family-level held-out split, with composition and paraphrase variants separated |
| Resource choice | A single-agent question requests unnecessary population expansion | Justified design alternatives, preserved question and explicit cost envelope |
| Reliability | A model produces one attractive output after many failed proposals | First-attempt and bounded-search results, all attempts and selection costs retained |

Use at least three distinct generalization tests: unseen wording, unseen
combinations of supported mechanics, and genuinely missing capabilities. They
measure different things. Keep known unsupported cases, valid null designs and
cases with no need for a treatment; abstaining on everything is not success.

Compare the current planner, a single researcher with real tools, and any
specialist/search variant under the same model and declared compute envelope.
For capability comparisons, keep participant policies and world versions fixed;
for participant studies, vary those factors explicitly instead. Freeze case
families before the final evaluation. Do not let report judges or optimizers see
held-out oracles. Human/domain review is still needed for constructs whose
meaning is not captured by executable checks.

Report a vector of outcomes: fidelity, runnable correctness, information
integrity, design identification, interpretation support, useful abstention,
coverage, reliability, cost and time. Maintain an auditable error taxonomy and
qualitative failures. No weighted overall number should conceal a privacy leak
or a scientifically invalid substitute. A small paid pilot can locate failures;
it cannot establish broad generalization or a hundredfold improvement.

## Pydantic AI is compatible with these candidates, not evidence for one

Current documentation was checked through Context7 and the public source at
commit `16b754f94aed38d024f07f51f09968ce945a55cf`:

- [Agent and limits](https://pydantic.dev/docs/ai/core-concepts/agent/#usage-limits)
  support request/tool/token bounds and a deliberate wrap-up near a limit.
- [Capabilities and tool preparation](https://github.com/pydantic/pydantic-ai/blob/16b754f94aed38d024f07f51f09968ce945a55cf/docs/capabilities/custom.md)
  permit dynamic tool availability; prepared function tools determine both the
  visible tool definitions and executable tool set.
- Typed outputs, dependency injection and capability hooks provide the seams for
  a researcher, scoped tools and durable artifacts. None automatically supplies
  scientific validity, budget reservation, execution isolation or experimental
  independence.

JAS already reserves and settles individual provider requests. An expanded
Pydantic AI loop must preserve that invariant for **every request**, including
errors and unknown usage; raising a loop limit under one reservation is not a
valid integration. Keep GPT-6.1 Sol for research/analysis and GPT-6 Luna for the
currently requested participant experiments. Retain model/harness assignment as
an explicit experimental configuration for future cross-model studies.

## Source inspection and remaining uncertainty

The full HTML methods and limitations were retrieved for AgentSociety2,
AI Scientist-v1/v2, Agent Laboratory, ScienceAgentBench, MAST, the scaling study,
AFlow, ACE, DiscoveryBench, DeepResearch Bench and Agentless. Selected source
files were inspected at the commit hashes linked above. Fetching and reading is
not reproducing an experiment. No external benchmark, generated environment or
paid model run was executed for this report.

Important open questions remain: which environment capabilities JAS needs to
cover the target questions, which scheduling semantics are appropriate per
environment, how well semantic design quality can be assessed, and whether
specialist research delegation improves results enough to justify its cost.
The papers narrow these questions and expose failure modes; they do not remove
the need for comparative prototypes and an independently assessed benchmark
before selecting the final architecture.
