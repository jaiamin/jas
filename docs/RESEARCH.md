# Research foundations

Reviewed 2026-11-07. These are design inputs, not evidence that this platform reproduces humans.

| Primary source | What it supports | Product consequence |
| --- | --- | --- |
| [Generative Agents, Park et al.](https://arxiv.org/abs/2304.03442) ([full text](https://arxiv.org/html/2304.03442)) | Experience retrieval, planning and reflection improve perceived believability; memory can introduce embellishments. | Persist original experiences; distinguish retrieved events from self-authored notes. Compare memory conditions rather than assuming reflection is universally beneficial. |
| [Agents grounded in self-reports, Park et al.](https://arxiv.org/abs/2411.10109) | Interview/survey-grounded agents predict held-out responses better than demographic-only agents in their evaluation; human test-retest consistency is an important reference. | Do not invent demographic realism. Explicit profiles and preferences are experimental inputs; human validity requires consented calibration and held-out human data. |
| [Concordia, Vezhnevets et al.](https://arxiv.org/abs/2312.03664) | Separates agent cognition, associative memory and environment adjudication. | Environment adapters own facts and transitions; models choose actions, never adjudicate their own success. Use deterministic rules where possible for auditability. |
| [SOTOPIA, Zhou et al.](https://arxiv.org/abs/2310.11667) ([full text](https://arxiv.org/html/2310.11667)) | Social interaction requires multiple goals and evaluation dimensions; model/human performance differs; judgments need validation. | Separate task payoff, cooperation, truthfulness, commitments and communication. LLM analysis is an interpretation, not ground-truth scoring. |
| [AgentSociety](https://arxiv.org/abs/2502.08691) | Supports large-scale agents, interventions and surveys; reports alignment in selected cases. | Treat intervention design and repeated trials as first-class. Scale alone does not establish validity; start with small interpretable environments. |
| [AI Deception survey, Park et al.](https://arxiv.org/abs/2308.14752) | Defines deception in terms of inducing false beliefs toward another outcome. | A false report against known ground truth is observable. Intentional deception remains a hypothesis; never infer intent from a rationale or label every error a lie. |
| [MACHIAVELLI, Pan et al.](https://arxiv.org/abs/2304.03279) | Reward and ethical behavior can conflict; benchmarks need explicit operational measurements. | Manipulate incentives; keep success and behavioral costs separate. Avoid a universal "good agent" score. |

## Included now

- Registered environment protocol with seven distinct rule systems, including simultaneous
  public goods, sequential trust exchange and collaborative dependency tasks.
- Private information and bounded communication; complete researcher ground truth.
- Repeated interaction, agent notes, deterministic episodic retrieval and a memory ablation.
- Structured factual reports checked against the fact actually shown to the actor.
- Explicit promises with deadlines and observed fulfillment.
- Directed exchange/commitment records; relationship views describe interaction, not feelings.
- Matched seeds, multiple repetitions, immutable design versions and condition-level results.
- Forecast error and early/late behavior summaries as evidence of adaptation, not weight learning.
- Saved model/version/settings, inputs, outputs, rule versions, timestamps and request costs.

## Excluded deliberately

- Arbitrary AI-authored Python/JavaScript execution; research prompts generate validated data.
- Invented psychological precision (numeric love, morality or consciousness), demographic
  stereotypes, and unsupported claims about human representativeness.
- LLM-written consequences, silent retries, substitute models and scripted "successful" agents.
- Public multi-tenant hosting, external worker fleets and vector databases before demand exists.
- Automatic causal conclusions from one trajectory, turn-level pseudoreplication or hidden
  judge scores. Condition summaries expose independent run counts and uncertainty limits.

## Next validation steps

1. Compare against known public-goods/trust-game baselines and sensitivity to wording,
   role/order permutations, model settings and payoff scaling.
2. Add human-coded event labels and measure agreement with automatic interpretations.
3. Import consented human traces under matched rules; hold out participants/scenarios.
4. Add generative memory/reflection as randomized treatments, with cost and hallucination
   checks against the original journal. More complexity must improve predictive validity.

## Product and interface research

Official documentation inspected on 2026-11-07:

- [Langfuse evaluation concepts](https://langfuse.com/docs/evaluation/core-concepts.md),
  [datasets](https://langfuse.com/docs/evaluation/experiments/datasets.md) and
  [comparison](https://langfuse.com/docs/evaluation/experiments/compare-experiments.md):
  preserve versions and individual outputs behind aggregate comparisons.
- [Braintrust workflow](https://docs.braintrust.dev/workflow.md),
  [experiments](https://docs.braintrust.dev/evaluate/run-evaluations.md),
  [comparison](https://docs.braintrust.dev/evaluate/compare-experiments.md) and
  [Loop](https://docs.braintrust.dev/loop/capabilities.md): AI-assisted investigation should
  operate over inspectable records, with manual control over the experiment.
- [Inspect log viewer](https://inspect.aisi.org.uk/log-viewer.html): move from comparison
  into specific samples, messages and failures without discarding provenance.
- [shadcn sidebar](https://ui.shadcn.com/docs/components/radix/sidebar) and
  [input group](https://ui.shadcn.com/docs/components/radix/input-group): familiar compact
  navigation and composition. Footer settings/appearance, semantic neutral themes and a
  focused mobile drawer suit this local tool; account controls do not serve a current task.
- [OpenAI web search](https://developers.openai.com/api/docs/guides/tools-web-search):
  optional planner research records actual tool-returned sources and metered usage. Scoping,
  drafting and a separate critique precede reviewable protocols; external text is evidence,
  never executable instructions.

These references informed interaction design, not claims of market demand, scientific
validity or access to product internals. The scientific abstracts above were fetched;
Generative Agents, SOTOPIA and Concordia full-text sections were also inspected. Simile's
site and Anthropic's eval article still return HTTP403. Official framework docs were
verified through Context7; OpenAI model, tools and pricing docs through official sources.
Configured rates remain estimates; credits, cache and provider accounting can differ.

## Realism and product boundaries

Concordia's full text was subsequently inspected (including its explicit treatment of
turn-taking and simultaneous action). A turn is an execution boundary, not necessarily
a claimed unit of human time. Commons choices are sealed until a joint settlement;
trust transfers follow causal send/return opportunities; dependency work carries progress
across decisions and finishes when the task graph completes. Resource schedules create
unannounced changes with persistent effects and an explicit control condition. Current
mechanics still abstract physical time, conversation, institutions and tool use.

The useful next step is a measured increase in environmental depth: calibrated action
durations and deadlines, persistent inventories, information acquisition, enforceable
contracts and interaction networks. Add one mechanism with reference trajectories,
privacy tests, operational metrics and held-out scenarios before broadening the planner.
Avoid a free-form model game master until its adjudication can be evaluated independently.

Benchmark success is workflow coverage, not realism. Keep failures, avoid selecting only
successful seeds, hold out combinations and wording, and report the model used. A smaller
model helps find schema/affordance problems cheaply; it does not stand in for stronger-model
behavior. Human comparisons require external, consented reference data and separate
validation. Enterprise interest and product-market fit have not been established.

## Generalization and environmental depth

Additional primary sources and framework documentation inspected for the larger evaluation:

- [Melting Pot, Leibo et al., 2021](https://arxiv.org/abs/2107.06857): evaluate unfamiliar
  partners and situations, not only performance in the development distribution. Our suite
  separates development questions, reserved context combinations and longer trajectories.
  This is a design principle, not reproduction of its MARL benchmark or results.
- [PettingZoo parallel API](https://pettingzoo.farama.org/api/parallel/): separate per-agent
  observations and action spaces; joint actions settle together when causality requires it.
  We retain the existing checkpoint interface and sealed settlement rather than adding
  a second runtime or pretending serialized model requests imply sequential observations.
- [Inspect solvers](https://inspect.aisi.org.uk/solvers.html) and
  [evaluation sets](https://inspect.aisi.org.uk/eval-sets.html): use maintained scheduling,
  scoring and inspectable logs. A custom application solver exercises our real HTTP API;
  it does not duplicate provider execution. Provider retries are disabled. Explicit retests
  write new artifacts and retain the original errors. Inspect's mock transport makes no
  model calls; actual planner and participant calls use metered GPT-6 Luna clients.
- [OpenAI evaluations](https://developers.openai.com/api/docs/guides/evals): fix the input
  schema and explicit criteria, preserve individual outputs and iterate on observed errors.
  We use local Inspect logs instead of uploading private simulations to a hosted eval store.
- [Le Texier, 2019, *Debunking the Stanford Prison Experiment*](https://doi.org/10.1037/amp0000401):
  publication metadata was verified through Crossref and the first four pages were read
  in the [author PDF mirror](https://gwern.net/doc/psychology/2019-letexier.pdf), including
  methods and seven archival findings. Publisher/PubMed access was blocked. Its critique is a reason to avoid taking the original
  study's claimed inevitability of abuse as a ground-truth target. Our institutional token
  game tests permissions, procedural sanctions, transparency, appeals and oversight; it
  cannot replicate prison psychology, physical harm or validated human responses.

Four additional rule systems provide genuinely distinct opportunities: binding two-party
bargaining with discounting and exit, sequential decisions on noisy binary evidence,
permissions and procedural oversight, and persistent renewable stocks with collapse.
Each has typed parameters, legal-action constraints, independent rule tests, seeded
adjudication, observable measurements and replay. A role name grants no permissions;
only an explicit authority assignment does. Resource stock persists between rounds.
Accepting an offer actually ends the negotiation and transfers the agreed surplus.
Private evidence has a known generation process, rather than being invented by the model.

We deliberately avoid a universal personality vector, emotional-state score, arbitrary
agent-authored rules, or a free-form LLM game master. Concordia's component approach is
valuable for open-ended worlds, but a model adjudicator adds a second unvalidated source
of behavior. Inspect supplies the harness; existing deterministic adapters supply the
rules; Pydantic AI supplies typed model requests. Adding more orchestration frameworks
would not improve validity. Human-grounded profiles, consented traces, elicited utilities,
validated judges and out-of-sample human comparisons remain separate future work.

A passing workflow does not show that agents are human-like, that an intervention works,
or that the schema is perfected. Short pilots test affordances and protocol alignment;
longitudinal cases test memory/settlement reliability. Behavioral outcomes may disagree
with hypotheses and still be valid experiments. Report accuracy, payoff, stock, sanctions
and agreement separately. Seed controls environment randomization, not LLM sampling.
