# Research foundations

These sources inform experiment design. They do not establish that model participants
reproduce human behavior. [Evaluation tooling](../benchmarks/README.md) checks application
workflows and mechanics; it does not validate human predictions.

| Primary source | What it supports | Product consequence |
| --- | --- | --- |
| [Generative Agents, Park et al.](https://arxiv.org/abs/2304.03442) ([full text](https://arxiv.org/html/2304.03442)) | Experience retrieval, planning and reflection improve perceived believability; memory can introduce embellishments. | Persist original experiences; distinguish retrieved events from self-authored notes. Compare memory conditions rather than assuming reflection is universally beneficial. |
| [Agents grounded in self-reports, Park et al.](https://arxiv.org/abs/2411.10109) | Interview/survey-grounded agents predict held-out responses better than demographic-only agents in their evaluation; human test-retest consistency is an important reference. | Do not invent demographic realism. Explicit profiles and preferences are experimental inputs; human validity requires consented calibration and held-out human data. |
| [Concordia, Vezhnevets et al.](https://arxiv.org/abs/2312.03664) | Separates agent cognition, associative memory and environment adjudication. | Environment adapters own facts and transitions; models choose actions, never adjudicate their own success. Use deterministic rules where possible for auditability. |
| [SOTOPIA, Zhou et al.](https://arxiv.org/abs/2310.11667) ([full text](https://arxiv.org/html/2310.11667)) | Social interaction requires multiple goals and evaluation dimensions; model/human performance differs; judgments need validation. | Separate task payoff, cooperation, truthfulness, commitments and communication. LLM analysis is an interpretation, not ground-truth scoring. |
| [AgentSociety](https://arxiv.org/abs/2502.08691) | Supports large-scale agents, interventions and surveys; reports alignment in selected cases. | Treat intervention design and repeated trials as first-class. Scale alone does not establish validity; start with small interpretable environments. |
| [AI Deception survey, Park et al.](https://arxiv.org/abs/2308.14752) | Defines deception in terms of inducing false beliefs toward another outcome. | A false report against known ground truth is observable. Intentional deception remains a hypothesis; never infer intent from a rationale or label every error a lie. |
| [MACHIAVELLI, Pan et al.](https://arxiv.org/abs/2304.03279) | Reward and ethical behavior can conflict; benchmarks need explicit operational measurements. | Manipulate incentives; keep success and behavioral costs separate. Avoid a universal "good agent" score. |

| Evaluation reference | Design consequence |
| --- | --- |
| [Melting Pot](https://arxiv.org/abs/2107.06857) | Hold out partners, combinations and wording; report performance outside the development distribution. |
| [PettingZoo parallel API](https://pettingzoo.farama.org/api/parallel/) | Separate private observations; settle joint actions together when causality requires it. Serialized model requests do not make observations sequential. |
| [tau-bench](https://arxiv.org/abs/2406.12045) | Score independently specified outcomes and repeated-trial reliability through real application execution; preserve failures and label retests. |
| [Le Texier, *Debunking the Stanford Prison Experiment*](https://doi.org/10.1037/amp0000401) | Do not use the original study's claims as ground truth. The institutional token game measures permissions and oversight, not prison psychology. |

## Interpretation limits

- Environment rules enforce consequences; models choose actions and never adjudicate
  their own success. Natural-language context does not create new mechanics.
- Observations, researcher ground truth and model self-report are separate evidence.
  False reports do not by themselves establish intent to deceive.
- Compare memory conditions against recorded experience. Reflection may add errors;
  behavior changes do not imply model weight updates.
- Average fresh repetitions within environment seed for summaries and matched comparisons.
  Keep all failures, explicit denominators and seed-level uncertainty; turns and repeated
  seeds do not create extra independent environment randomizations.
- Report payoff, accuracy, stock, sanctions and agreements separately. There is no
  universal personality, morality or human-realism score.
- Human predictive claims require consented reference data, held-out participants,
  sensitivity checks and independent coding. Workflow success alone is insufficient.

Seed controls environment randomization, not LLM sampling. Model/version, settings,
rule versions, requests, outputs and estimated costs remain part of each saved run.

See [experiment validity](EXPERIMENT_VALIDITY.md) for the later primary-source review,
implemented preflight, capability limits and post-checkpoint verification.
