# What simulation companies have actually validated

Research date: 2026-11-10. Research only; implementation remains paused.
This is a targeted review of primary methods, results, limitations and selected
source code, not a systematic review or an independent reproduction. Published
results below are company-reported unless explicitly stated otherwise. No paid
model calls were made.

## Correction and central finding

Artificial Societies must not be dismissed because earlier publication links
returned 404. Its current site is [societies.ai](https://societies.ai/), with a
working [publication index](https://societies.ai/publications), two recent
validation papers, a public benchmark repository, and October product results.
These materially improve the evidence available for this review. The January
2026 evaluation PDF linked from its current evaluation page still returned 404
when checked; its claims were therefore not independently examined in that PDF.

The strongest transferable lesson is **claim-specific validation**. Matching
answer distributions, preserving relationships, recovering interventions,
predicting consequential actions, and producing interacting populations are
different achievements. Evidence for one does not establish the others.

JAS studies AI-agent behavior. Its empirical target is what a specified model
and harness do in an implemented environment. Human-prediction products offer
useful validation methods, but their human-fidelity objectives must not become
JAS's objectives by accident. Humanlike inconsistency, demographic personas and
human population distributions are not universal requirements for our agents.

## Evidence map

| Source | Actual target and evidence | What it does not establish |
| --- | --- | --- |
| Olam Multi-Agent Arena and Diplomacy | Continuing agent sessions in shared rule-governed worlds; competitive outcomes and separately defined behavioral measures; communication compared with actual actions | Arbitrary-world generation, universal behavior scores, or complete byte-faithful branching of agents in flight |
| Artificial Societies public benchmark | Twenty human sources, nine general-purpose models, eleven tests of noninteracting synthetic respondents; public methods and scoring code | Validity of interacting societies, prospective unseen-study generalization, or the proprietary system's complete capabilities |
| Artificial Societies October product comparison | Proprietary system evaluated on seven public survey sources using benchmark respondents, items and scoring code | Independent replication, full eleven-test coverage on all twenty sources, or long-term interaction validity |
| Artificial Societies misinformation study | Retrospective intervention and response comparisons with published studies; frozen design reported | Prospective forecasting or independent discovery of every dynamic mechanism used |
| Artificial Societies fairness paper | Conceptual validation framework and reporting checklist | New empirical evidence; the paper explicitly creates and analyzes no new data |
| Aaru September evaluation | 2,993 survey questions, separate purchase-ranking evaluation, and error prediction for its proprietary system | LLM-only organizational simulation, row-level coherence or multi-agent interaction validity |
| Simile confidence study | Held-out prediction of distributional error, with full experimental samples grouped into folds | A generic confidence score for arbitrary agent worlds or a result about emergent multi-agent behavior |

For Olam's game interfaces and the richer tool-world implementations, see the
companion [company and tool-world review](COMPANIES_AND_TOOL_WORLDS.md). The
sections below examine company validation in more detail.

## Olam: instrumented interaction, with causal claims still requiring design

Primary sources: [methodology](https://olamlabs.ai/research/multi-agent-arena),
[Diplomacy](https://olamlabs.ai/research/diplomacy),
[YC Labs game experiments](https://labs.ycombinator.com/projects/games/) and
[training rationale](https://olamlabs.ai/research/why-multi-agent).

Olam is particularly relevant because its object is model behavior in shared
worlds, rather than predicting human survey responses. Its June rationale
argues for studying negotiation, collaboration and social complexity with
legible game state, accepted actions and recorded luck variables. That is a
research motivation, not itself an empirical demonstration that all resulting
behavioral interpretations are correct.

The arena's methodological value is the separation of world rules, persistent
participant sessions, competitive performance and behavioral interpretation.
Diplomacy can compare an agent's communication with its subsequent orders,
balance seats, and inspect explicit commitments. Minecraft and Mindustry add
tools, artifacts and persistent coordination. The resulting environment is
larger than its eventual measurement rubric: negotiations, plans, inventories
and written work products exist before an analyst measures them.

Scheduling is mixed rather than uniformly asynchronous. The public Warpath
example has sealed simultaneous talking, ordered move phases and mail delivered
in the recipient's next briefing. Free read tools and multiple operations within
a phase coexist with explicit submission barriers. Those semantics are part of
the experiment, not a superficial runtime detail.

The methodology also says agents can edit their harness and memory in its
**internal multi-thousand-agent environments**, while public arenas normally
use the selected harness's native compaction. The accessible public material
reviewed does not independently validate those internal population counts,
throughput or behavioral results. That statement is a company description of
internal capability, distinct from the documented public arena methods and
the source-reviewed Minecraft demonstrations.

Complete traces improve attribution but do not automatically identify causes.
A failed negotiation can involve an incentive change, an information difference,
seat effects, stochastic output, timing or participant-harness differences.
Randomized interventions and matched repetitions remain necessary. Inspecting
an agent's explanation does not establish its actual decision mechanism.
Olam itself notes limitations around interpreting deception without private
reasoning; JAS should retain that uncertainty and use observable evidence.

The demonstrations also expose useful confounds. The first Minecraft directory
entry became a leader; directory order is therefore a plausible experimental
factor. The Mindustry comparison varies models together with their native
harnesses. It measures complete systems in that configuration, rather than
isolating a model-only effect. These details matter more than the population
size or the visual appeal of an emergent-looking society.

**Transfer to JAS:** instrument real action opportunities and consequences;
record communication, knowledge exposure, tool results, artifacts and scheduling;
measure behavior after it occurs; distinguish model comparisons from complete
participant-system comparisons. Do not make a behavioral label the world state.

## Artificial Societies: a stronger evidence base than the old links suggested

### The public benchmark is an empirical validation study

Source: [Artificial Societies Benchmark, v2](https://arxiv.org/html/2609.30030v2),
especially §§3–6 and appendices C and E. The paper is company-funded, with
company-affiliated authors; one author is also Oxford-affiliated. This is
publicly inspectable company research, not independent product validation.

The study evaluates twenty human sources, nine models and two statistical
controls. Its eleven tests retain their native units and unavailable estimates:

| Domain | Questions tested |
| --- | --- |
| Internal, IV-1–IV-4 | Repeat consistency; constraints and opposing answers; paraphrase sensitivity; administration and wording effects |
| Construct, CV-1–CV-3 | Within-scale relationships; associations with independent criteria; separation between constructs |
| External, EV-1–EV-4 | Response distributions; individuals and subgroups; experimental effects; transfer of measurement structure |

This paper's terminology is specific to its framework. Its “internal validity”
includes response consistency; that should not be confused with establishing
causal identification in an experiment on AI agents.

Most tasks include up to 512 matched people, with source-specific exceptions.
Linked records stay together across development/evaluation splits. Models see
questions and available profiles, with target answers withheld; sequential
tasks retain previous generated answers. **The synthetic respondents do not
interact.** This is an important boundary on what its results can establish.

The controls distinguish plausible marginal fit from relationships. One samples
each item independently from human response distributions; the other uses a
Gaussian rank copula to approximate dependence. Both closely reproduce item
distributions on the highlighted SAPA comparison, but mean absolute error in
between-trait correlations is 0.170 for independent sampling and 0.040 for the
copula. Getting each answer frequency right leaves substantial room to get the
joint behavior wrong.

Other results reinforce this distinction. A model with relatively good
distributional fit can still give inconsistent opposing answers. Across 24
messenger interventions, mean absolute effect error ranges from 0.23 to 1.10
rating points, against a mean absolute human effect of 0.52. Correct aggregate
levels therefore do not imply correct intervention magnitudes. Missing response
categories and constant answers sometimes make structural comparisons
unestimable; those cells are not interpreted as success.

The study handles coverage explicitly. Most estimates require 90% valid model
responses overall and per item, 90% human-target coverage and at least thirty
people. Structural comparisons require larger complete samples. The paper
correctly describes these as operational reporting rules, not universal
validity thresholds. It bootstraps people 500 times, retaining each person's
answers together and preserving experimental assignment. It also reports
missing-answer sensitivity bounds and insufficiently supported subgroups.

### Richer participant descriptions are an intervention, not an automatic improvement

The Twin comparison audits distilled profiles and retains 430 of 512 without
repairs. Nine models receive identical profiles, and comparisons use matched
people and questions. Distilled descriptions improve some models and worsen
others. History plus distilled text reduces bounded prediction error by about
0.041–0.047 for Gemini and 0.027–0.028 for Claude across two repetitions.
Mistral's point estimates worsen, but missingness and sampling uncertainty
weaken the directional conclusion. Original and distilled descriptions also
affect Scout differently.

The authors acknowledge that OpenAI distillation and Claude auditing may favor
those provider families; profile exclusions limit the target cohort. More
information, more memory and more elaborate role descriptions must therefore
be evaluated as participant-harness changes. They cannot be presumed to improve
JAS simply because they make its agents sound more detailed.

### Important limits are stated rather than hidden

The human datasets are public, and the authors cannot establish whether model
training included questions, answers or published results. The paper explicitly
says it does not demonstrate generalization to unseen studies. Target answers
withheld at inference are a useful control, but do not remove training
contamination.

Some diagnostics were specified after outputs became available and are
interpreted descriptively. The benchmark used frozen internal analysis plans
but was not formally preregistered. Parsing rules were developed from observed
formats and finally applied across models; raw outputs, normalizations and
coverage failures remain relevant. These are reasons to separate locked
evaluation from exploratory analysis, rather than reasons to discard the work.

Correlations with grades and wearable records are additional external evidence,
but do not establish calibrated prediction of consequential behavior. The study
also does not validate individual counterfactual effects merely because a
profile can be copied into treatment and control conditions.

### Public code makes several methodological choices concrete

Repository inspected at
[`46b8ed52ef457bb60ad25b455ea884c9f51317c6`](https://github.com/artificial-societies/artificial-societies-benchmark/tree/46b8ed52ef457bb60ad25b455ea884c9f51317c6):

- [README](https://github.com/artificial-societies/artificial-societies-benchmark/blob/46b8ed52ef457bb60ad25b455ea884c9f51317c6/README.md)
  documents 36 task specifications and 7,128 scorecard cells, with native
  diagnostics, configuration and availability metadata. These are cells, not
  7,128 independent studies.
- [Copula implementation](https://github.com/artificial-societies/artificial-societies-benchmark/blob/46b8ed52ef457bb60ad25b455ea884c9f51317c6/benchmark_experiment/copula.py)
  explicitly rejects development/evaluation person overlap, records development
  provenance, and samples held-out people with deterministic seed-derived keys.
- [Scorecard implementation](https://github.com/artificial-societies/artificial-societies-benchmark/blob/46b8ed52ef457bb60ad25b455ea884c9f51317c6/benchmark_experiment/scorecard.py)
  refuses incompatible endpoint pooling and retains incomplete support. Its
  interpretation states that presence is not success, empty cells are not zero
  error, and there is no omnibus validity certification.
- [Coverage policy](https://github.com/artificial-societies/artificial-societies-benchmark/blob/46b8ed52ef457bb60ad25b455ea884c9f51317c6/analysis/coverage_policy/policy.json)
  versions response coverage, bootstrap replicates and bootstrap-success rules.

The repository excludes human respondent data, profiles, populated prompts,
respondent-linked model outputs and provider payloads. It is useful public
scoring infrastructure, not a complete unrestricted raw-data release. Selected
code was read; its analyses were not rerun.

### The proprietary product evaluation is a separate claim

The [October comparison](https://societies.ai/benchmark) evaluates Artificial
Societies on seven public survey sources, 2,796 synthetic respondents and
68,280 answers, using benchmark respondents, items and scoring code. It reports
mean population TVD of 0.08 versus 0.31 for the best general-purpose model,
alongside subgroup, dispersion, wording-effect and relationship measures.

This is more substantive than a product demonstration. However, “lowest error
on every measure reported” does not mean every possible measure, every source,
or all future experiments. The evaluated sources are public; the blog does not
establish independent replication or unseen-source generalization. Its product
results must remain distinct from the benchmark paper's nine-model study.

[Rothko's architecture description](https://societies.ai/rothko) says the company
changes a pretrained model's architecture to output decisions rather than
ordinary language, then trains it on behavioral data including transactions,
mobility, interviews and surveys. Exact architectural and training details are
proprietary. This is a specialized predictive model, rather than evidence that
adding more prompted general-purpose personas will produce the same result.
It does not change JAS's chosen Sol researcher and Luna participant models.

### Its intervention study shows why a matching result can have different causes

The [misinformation study](https://societies.ai/misinformation) reports
retrospective comparisons with four published UK experiments and additional
regional evidence, covering more than 25,000 human participants. It reports
that design, instruments, code and panel were hashed and time-stamped before
the first simulation call. Results include direction, relative magnitudes and
specific mismatches, rather than only headline correlations.

One particularly informative limitation is explicit: synthetic participants
do not live through the weeks between surveys. For delayed fact-check effects,
the implementation imports a published recall/forgetting rate and switches
between remembering and answering afresh. The resulting effect decays to 8%
of its original size, matching the human result. That is conditional success
of the implemented mechanism; it is not evidence that the agents independently
discovered a realistic forgetting process. The society also represents 2026
while several human samples were collected in 2020; the authors emphasize
relative comparisons over absolute levels.

**Transfer to JAS:** record whether a temporal effect emerges from participant
behavior or is imposed by memory, retention, diffusion or scheduling rules.
Show mechanism provenance beside a matching outcome. A town becoming polarized
because its engine explicitly increases a polarization parameter is a different
experiment from polarization arising through recorded interactions.

### The fairness framework supplies hypotheses and reporting requirements

[Consequential Behaviour and Representational Fairness, v3](https://arxiv.org/html/2609.27690v3)
is a conceptual paper. It explicitly reports no new data created or analyzed.
Decision-context authors received company funding; company coauthors are
founders/employees. The paper discloses these relationships and states the
decision-context authors retain authority over content and publication.

It distinguishes a behavioral criterion from location, dispersion, response
process and structural diagnostics, with intervention effects crossing those
categories. Its electric-vehicle tariff example illustrates the framework; it
is not a new field validation of charging predictions.

For cloned-persona counterfactuals, it requires repeated draws in the same
condition to quantify simulation noise. It also warns that changing a treatment
prompt can change the implicitly represented participant, rather than only the
intended treatment. Repeated draws are clustered observations, and conditional
profile effects do not establish individual human causal effects.

These controls transfer directly to agent experiments: declare which inputs
change, preserve everything else that can actually be preserved, quantify
same-condition variability, and distinguish an exact world checkpoint from
reproducibility of a stochastic provider response. For interacting populations,
randomization and analysis must additionally respect shared-world dependence.

### Product UX is useful design evidence, with different epistemic limits

The [focus-group design post](https://societies.ai/focus-group-design) separates
participant selection, discussion guides and analysis. It provides an observed
speaker graph, share of voice, themes, disagreement and the original transcript.
It chooses four to fourteen participants for that product's conversational
dynamics, not as a universal scientific optimum.

This is useful UX rationale, not a validated general theory of group formation.
Its depiction of what personas are “thinking” should not be copied as evidence
of private cognition. JAS can show explicit commitments, recorded messages,
actions and evidence-grounded interpretations without exposing private reasoning
or implying an invisible mental state has been measured.

## Aaru: meaningful evaluation of a different modeling approach

Source: [Population simulation at the replication floor](https://www.aaru.com/publications/population-simulation-at-the-replication-floor-research),
September 24, 2026; methods, results, comparisons and confidence sections.

Aaru explicitly says its core trajectory predictor and population generator
are **not language models**. Its normal production system uses substantial
alternative data; this evaluation removes some confidential sources/practices
and uses Exa as its only external retrieval tool. It restricts retrieval to
dated snapshots from before fieldwork, excludes source-publisher domains and
prediction markets, and selects 2026 surveys as a contamination mitigation.
These are substantial methodological details, although they do not disclose
enough to independently reconstruct the complete product.

The main evaluation covers 2,993 questions from 186 study series and nine
industries. It measures univariate answer distributions and explicitly defers
higher-order accuracy and logical row-level coherence. It reports mean observed
TVD of 7.62 percentage points and MAE of 3.53 points. Its sampling adjustment
reduces those to 5.98 and 2.78 respectively, using printed or imputed sample
sizes and a design effect of one. Adjusted values therefore depend on those
assumptions; they are not direct observations of error against a known population.

Comparisons with historical survey-to-survey disagreement contextualize the
result, but use different questions, populations and times. A score lying in
that range is not a matched proof that simulation is equivalent to collecting
new data. Similarly, cross-paper model comparisons are not all matched trials;
the article notes that some evaluations use different questions and populations.

The separate purchase evaluation is valuable because its outcome is recorded
purchasing rather than stated consideration. Across 100 brand-period
observations in fourteen category-period groups, Aaru reports 92.4% correct
pair ordering versus 77.8% for purchase-consideration data and 79.3% for a
brand-size baseline on available pairs. Its result averages three runs before
ranking. This supports brand ordering on those observations; it does not
establish calibrated purchase probabilities, individual behavioral trajectories,
intervention effects or interacting populations. The 340 brand pairs also share
brands and groups and must not be treated as 340 independent experiments.

The confidence analysis retains approximately half of questions to reduce
mean observed TVD from 7.62 to 4.54 points and the rate of errors over sixteen
points from 9.5% to 1.0%. This is a useful coverage–accuracy tradeoff. Its
comparison with Simile's AUROC is on separate evaluation datasets, as the article
acknowledges. It cannot establish a matched company ranking.

**Transfer to JAS:** constrain information cutoffs; compare exact matched cases;
keep raw and adjusted estimates distinct; validate actual action outcomes;
evaluate uncertainty by how well it predicts future error at declared coverage.
Do not cite this evidence for a thousand independently prompted LLM employees.

## Simile: confidence requires its own held-out validation

Source: [Building confidence in Simile](https://www.simile.ai/blog/confidence),
by Andrew Wesel, Sarah Chen and Percy Liang. This is a company-authored technical
post, not an independent evaluation of arbitrary simulation platforms.

Simile predicts action distributions for a described population and situation,
trained on behavioral and interview/survey data. It then learns to predict the
error of those distributions. Around 8,600 questions are held out from both
simulator and confidence-model training. Five-fold evaluation keeps question
text and its full experimental sample in one fold; topics often cluster within
samples. Layer and learning-rate selection use further training/validation
splits rather than selecting directly on the final held-out fold.

Basic output features are weak predictors of error: reported AUROC is 0.566.
General-purpose embeddings improve it to 0.686, hidden-state probing to 0.730,
and continued fine-tuning to 0.736. The strongest method has RMSE 0.0776 in TVD
units and error correlation 0.565. Probing and continued fine-tuning are not
significantly separated on AUROC in that evaluation. These are useful but
imperfect error predictors, not guarantees about an individual answer.

The “decision-quality” threshold of 0.16 TVD comes from about 2,750 internal
ratings by fourteen raters, with agreement measured on 410 multi-rated questions.
The authors expect the definition to evolve with external ratings and more
diverse evaluations. It is not a universal threshold for scientific validity.
Product confidence buckets are calibrated on the evaluation set; portability
to new environments or future model versions needs additional evidence.

The hidden-state probe uses activations from a forward pass, which ordinary
OpenAI participant APIs do not expose. JAS cannot copy that method by asking a
chat model how confident it feels. It also does not yet have representative
held-out labels on which to train or calibrate a general confidence model.

**Transfer to JAS:** separate confidence in an experiment design, measurement
reliability, between-run variation and uncertainty about a substantive claim.
Initially report observed coverage, repetitions, effect intervals and unresolved
assumptions. Add learned confidence only after validating it on independent
experiment families. A single “confidence: 92%” field would hide these distinctions.

## Implications for the proposed JAS architecture

These are engineering inferences from the reviewed evidence, not experimentally
proven optimal architecture choices.

1. **Represent the experimental system before choosing its measures.** A company
   needs work artifacts, organizational authority, access permissions and action
   consequences when the question depends on them. A small room may need only
   locations, available resources and private observations. The question selects
   the necessary mechanisms. Increasing agent count or variable count alone
   does not increase scientific sophistication.
2. **Keep environment, participant system and experiment separately identifiable.**
   A reusable world supplies state, observations, action/tool semantics, time and
   transitions. Participant configuration supplies model, policy instructions,
   memory and tools. An experiment supplies allocation, interventions, repetitions,
   stopping rules and measurements. Record their immutable versions together.
   Changing any of them can change the behavior under study.
3. **Support several depths of world implementation.** A discussion or choice
   protocol, a rule-based shared world and an artifact-rich software sandbox
   answer different questions. Neither a handful of generic counters nor a full
   simulated operating system is the right mandatory representation for all
   cases. Generated worlds need executable checks and explicit assumptions;
   apparent plausibility is insufficient.
4. **Choose populations through the research design.** A single agent can be the
   correct design. Four participants can expose a cooperation mechanism; a
   thousand may be essential for network or organizational scaling. Do not
   silently replace a requested thousand-agent study with a few representatives.
   Sparse communication and activity scheduling can preserve a full population
   while avoiding mandatory all-to-all interaction. Their effects on behavior
   must be declared and tested.
5. **Treat scheduling and collaboration as experimental mechanisms.** Who may
   speak, act, read, interrupt, delegate or edit a shared artifact can determine
   outcomes. Phase barriers, discrete events and external real-time worlds
   should be chosen for the phenomenon, with their replay limits made explicit.
   No company reviewed establishes one universally optimal turn count or graph.
6. **Keep discovery and confirmation separate.** Search for interesting behavior
   can use adaptive scenarios, branches and post hoc analyses. Confirmation
   needs frozen hypotheses, independent trials or held-out families, matched
   allocation and declared measures. Search branches and repeated calls are
   not independent experimental samples.
7. **Report a validity profile alongside the behavior record.** Keep effect size,
   uncertainty, coverage, invalid actions, measurement agreement and observed
   mechanism traces separate. A company-wide average can conceal failures by
   role, access level or network position. Empty or unsupported comparisons
   stay visible. Do not combine them into an omnibus intelligence score.
8. **Preserve the chosen model roles.** Pydantic AI and GPT-6.1 Sol remain the
   researcher harness; GPT-6 Luna remains the current simulation participant.
   A future provider interface should let researchers intentionally vary models
   and combinations while recording exact configuration. No automatic model
   substitution is justified by these company comparisons.

## Concrete tests the evidence suggests

| User example | Observable behavior and world requirements | Stronger validation than a plausible transcript |
| --- | --- | --- |
| One agent | Tools, task constraints, information and actual state changes relevant to the question | Check unintended changes, vary irrelevant framing, compare declared goals with achieved actions |
| Three agents trapped in a room | Private observations, resource access, feasible actions, time and consequences | Test knowledge boundaries, same-condition variability and resource/information interventions; avoid labeling narrative tension as behavior |
| Four friends and possible betrayal | Explicit opportunities, observable commitments, asymmetric information and consequential choices | Compare statements with available knowledge and actions; vary incentives without instructing betrayal; retain alternative interpretations |
| Town approaching disorder | Local communication, institutions, resources and action consequences that permit the hypothesized mechanism | Randomize shocks/network structure, inspect event chains, repeat independent towns and separate imposed transition rules from emergent action patterns |
| Thousand-agent company | Individually represented participants where required, roles, permissions, tasks, artifacts and shared dependencies | Vary hierarchy/communication while preserving work; measure delegation, errors, bottlenecks and outcomes by role; use independent companies/runs as analysis units where appropriate |

For every case, first test the world's transitions and evidence boundaries,
then the measurement, then the behavioral claim. A successful replay validates
record reconstruction; it does not establish a model's behavioral generality.
Likewise, neither this review nor the company results measure a “100 times”
improvement in JAS. That ambition needs concrete outcomes and independent trials.

## What was and was not verified

The two Artificial Societies papers' substantive methods/framework, results,
limitations and relevant appendices were examined directly. Company evaluation
and product posts above were read in full. Selected benchmark code was inspected
at the pinned commit. Olam's full methodology, Diplomacy and YC implementations
are covered by the companion report; its additional June rationale was read
directly for this review. Aaru and Simile methods, results and qualification
sections were examined directly.

No external study was reproduced, no proprietary training data or architecture
was inspected, no paid trial was run, and no production implementation changed.
The inaccessible January Artificial Societies PDF remains an evidence gap.
These sources support more careful experiment design and validation; they do
not establish that any vendor solves arbitrary multi-agent experimentation.
