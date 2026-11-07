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

- Registered environment protocol; three distinct mechanics: simultaneous public goods,
  sequential trust exchange, and collaborative dependency tasks.
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
