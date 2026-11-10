# Research harness and simulation plan

Status: **approved; shared understanding confirmed**. Updated 2026-11-10.
The user then requested spec synthesis/publication before implementation.
See [the implementation spec](RESEARCH_HARNESS_SPEC.md).
Latest correction: target **1–12 active participants initially**. The user
withdrew the dramatic population example as a requirement; there is no fixed
large-population deliverable. Later expansion needs a concrete question and
measured operating limits.
This replaces the initial implementation checklist. A universal bounded-state
interpreter, mandatory primary endpoint and deterministic-only large-population
test are not accepted requirements. The evidence and its limits are in
[the research direction](research/RESEARCH_DIRECTION.md).

The user requested grill-with-docs before implementation and has accepted both
rounds, including all seven recommendations and four explicit refinements.
[The design interview](research/DESIGN_INTERVIEW.md) records the decisions and
disclosed engineering defaults. The user answered “Yes” to the consolidated
plan, completing that checkpoint. These questions are not reopened; the active
step is the explicitly requested to-spec publication.

## Objective

Help researchers ask questions about model-agent behavior, design appropriate
worlds and experiments, and inspect what the agents actually did. Support
exploratory studies as well as controlled comparisons. Preserve the existing UI
appearance, immutable evidence, privacy, replay and per-request accounting.

## Proposed organization

- **Environment package:** versioned reusable mechanics, tools, objects,
  permissions, information access, timing and restoration contracts.
- **Participant configuration:** model and harness, memory, goals, inference
  settings, tool access and effort allowances; population/roles bind participants
  into a world. Participant harnesses are interchangeable experimental factors.
- **Experiment revision:** question, selected world/initialization, population,
  interventions, evidence capture, replication and stopping decisions.
- **Run:** realized observations, attempted/settled actions, deliveries,
  artifacts, usage, failures and termination.
- **Analysis lens:** independently versioned calculations or interpretations,
  with required evidence, eligibility, coverage and unknowns.

These are proposed responsibilities, not an approved schema. Resolved terms are
recorded in [the glossary](GLOSSARY.md). A model under a particular participant
harness is the experimental subject; human predictive validity is outside this task.

## Sequence and acceptance criteria

Begin with a provider-free qualification of the execution/accounting contracts
and a fail-closed, credential-free extension isolation mechanism in the permitted
development and production runtimes. Current CLI availability does not prove
containment, and the app has no existing production runner. If qualification
fails, do not execute generated code, weaken host security or claim the extension
milestone passed. Settle the concrete runner through this proof rather than
adding speculative infrastructure.

1. **Two equally developed harness architectures.** Keep Pydantic AI. The
   GPT-6.1 Sol researcher gains capability discovery, evidence retrieval, draft
   editing, isolated probes and durable research artifacts. GPT-6 Luna
   participants gain an interchangeable harness contract for planning, memory
   retrieval, investigation and verification, described below. Compare genuine
   participant-policy implementations and the research workflow on fresh tasks;
   a larger prompt or a renamed single-call policy does not satisfy this step.
   A permanent multi-researcher team is not a default requirement.
2. **Small executable worlds and trust boundaries.** Exercise existing
   controlled worlds and a genuinely different artifact/tool world. Include
   single-agent and small-group studies plus valid simple cases. Independently
   enforce observations, tools, permissions and consequences. Probe isolated
   copies, test joint resource/workflow effects, and preserve complete restore
   and replay semantics. Compare timing choices only where they matter.
   Unsupported mechanics may enter an isolated extension-generation and
   verification stage; failed checks produce an honest capability gap.
3. **A separate research-validity requirement.** Implement failure-aware
   uncertainty, treatment/exposure accounting, actual baseline-policy
   comparisons and evidence-supported claim assessment. Test these separately
   from world correctness and UI behavior, including adversarial cases where
   valid citations accompany false conclusions. Exact criteria are below.
4. **Small-population validation milestone and necessary UI.** Preserve the
   current look while exposing world/participant/experiment choices and
   grounded trajectories. Freeze fresh evaluation families and retain every
   attempt. The milestone must demonstrate meaningful interactions, participant
   competence, enforced privacy/authority and defensible findings. The accepted
   scope is one-agent evidence seeking, three-agent distributed information,
   four-agent reliance/commitment opportunities and a 6–12-agent institutional
   workflow with persistent artifacts. At least one held-out task must generate
   genuinely new mechanics that pass independent checks. Null or inconclusive
   results can be scientifically sound; merely
   completing a run or producing an interesting story cannot pass the gate.
5. **Practical populations.** Support 1–12 active participants initially, chosen
   for the mechanism and necessary roles rather than a larger-is-better target.
   Complete the accepted behavioral/validity milestone before considering any
   increase. A later increase needs a concrete research purpose and measured
   memory, observations, request and storage limits; no dedicated large-scale
   infrastructure is required now. Distinguish actual model participants from
   background entities and do not silently replace them with scripts.

## Interchangeable participant harnesses

The researcher and participants have different authority and separate retained
state. Both architectures need real tools and lifecycle handling. A participant
harness receives that actor's permitted observation, available tool contracts,
private retained context and versioned effort limits. It proposes tool requests,
an action or a stop; the world independently validates and settles every request.

Participant implementations must support replaceable policies for:

- **Planning:** maintaining an actionable plan or choosing a next step, without
  installing a required social outcome or exposing private model reasoning.
- **Memory retrieval:** retrieving permitted personal experiences and artifacts
  with source identity, access checks, cutoff and context limits. Private data
  cannot leak through retrieval metadata, summaries or restored sessions.
- **Investigation:** gathering evidence through the actor's available world
  tools. This never grants the researcher's full-state view or run-database tools.
- **Verification:** checking a proposed action, artifact or factual assertion
  against evidence the actor can access. Verification is not a hidden-truth oracle
  and cannot bypass action permissions or guarantee a correct model judgment.

Keep a simple direct-action harness as an explicit reference implementation and
compare a tool-using implementation plus targeted ablations under declared
effort budgets. Record model, harness/version, memory policy, tool configuration,
inference settings, operations, failures and stopping. Restore actor sessions
and authorized retained artifacts; exclude private provider reasoning from
evidence. Account for every auxiliary model call. Participants choose when to
invoke planning, retrieval, investigation and verification within their selected
harness and declared effort limits. Fixed staged pipelines remain explicit
alternative conditions rather than the default.

## Small-population milestone: accepted scope

| Study family | Concrete capability to establish | Independent checks |
| --- | --- | --- |
| One participant seeking evidence | Investigate through authorized tools, retrieve relevant retained evidence, verify and act or stop | Known answer/access oracle; evidence provenance; matched simpler policy; recovery and stopping |
| Three participants with distributed information | Share or withhold local knowledge, coordinate consequential actions, respond to deliveries | Observation isolation; exact delivery/exposure; feasible alternative actions; shared-information control |
| Four participants with reliance/commitment opportunities | Voluntary reliance, feasible promises, conflicting choices and subsequent response | Eligibility, deadlines, feasible fulfillment and observed consequences; do not label every breach betrayal |
| Six–twelve participants in an institutional workflow | Create persistent work, exercise permissions, hand off dependencies and respond to declared procedures | Artifact/version and dependency oracles; authorization; joint effects; logical-time conflict/restoration checks |

These are question families, not four fixed narratives or a compulsory policy
sequence. Include valid simple cases and null outcomes; use multiple fresh
variants and declared repetition/matching. Do not alter a confirmatory case
after observing its outcome to manufacture cooperation, betrayal or emergence.

The gate requires separately recorded evidence of:

1. **World and isolation correctness:** authoritative permissions/consequences,
   unchanged source state/evidence after probes, private tool/observation
   isolation, atomic composed effects and exact recorded-action replay.
2. **Participant capability:** two working policy implementations at the same
   interface, actual planning/retrieval/investigation/verification affordances,
   source-linked memory, bounded effort and accounted auxiliary requests.
   Qualification tasks test usable capabilities, not required social behavior.
3. **Research competence and validity:** question fidelity, correct mechanism
   selection, meaningful opportunities, honest unsupported conclusions,
   failure-aware uncertainty/exposure/baselines and evaluated claim support.
   Retain separate results rather than a single opaque pass score.
4. **End-to-end live evidence:** separately authorized, repeated small-group
   Luna trials and real Sol research trials, with all failures and actual effort
   reported. Deterministic stand-ins and browser mocks do not satisfy this item.
5. **Held-out extension generation:** an independently specified task outside
   development cases must produce an extension with genuinely absent mechanics
   and pass external acceptance/privacy/replay checks. Generated self-tests are
   supplemental. Preserve every attempt; if none succeeds, the gate stays closed.

Define full cases, sampling/precision rationales, rubrics and source hashes
before validation, after development stabilizes. An independent case author
can freeze checks without exposing the held-out prompts during implementation.
Do not tune on validation outputs and silently rescore repaired attempts.
Small-sample claims remain limited; one extension success is not universal
environment-generation evidence.

The current $10 authorization covers fresh Sol benchmarks. Prepare the Luna
trial manifest and estimate after deterministic qualification, and execute it
only with an explicit participant-run allowance. Until the actual live trials
run, report the live milestone as unverified rather than calling the scale gate
passed.

## Execution and UI defaults

Each environment declares logical time, decision eligibility, tool/action
contracts, observation cutoffs and contention settlement. Provider latency is
not world priority unless the experiment explicitly studies it. Initial
qualification covers sequential and phased-simultaneous semantics, plus explicit
logical-time delays for messages/work. Preserve one authoritative writer per
run and complete committed-boundary checkpoints of actor state and pending
activities. A distributed asynchronous deployment is outside the first milestone.

Reuse the current appearance and remote-state patterns. Review makes reusable
worlds, participant configurations and experiment choices distinguishable.
Results lead with a trace-linked account of behavior, including exposure,
failures, uncertainty and claim status. Add interaction graphs, artifact history
or maps only when supported by recorded evidence. Keep detailed mechanics and
provenance inspectable without crowding the default view. No private reasoning
or unrelated visual redesign is part of this scope.

## Research-validity acceptance criteria

This is a separate claim-specific assessment, not a combined score or a promise
that an automated judge can certify arbitrary science.

- **Small-sample uncertainty:** declare inference/replication units and matching;
  do not treat correlated agents, decisions or repeated shared histories as
  independent evidence. Report planned and observed runs, groups and effective
  replication. Choose uncertainty methods appropriate to the design and disclose
  when there is insufficient support for a useful estimate. A three-seed rule
  or a displayed bootstrap interval is not a universal validity threshold.
- **Failed-run selection:** retain the full attempt ledger and arm-specific
  complete/failed/interrupted/unmatched counts, including exclusions and reasons.
  Estimates cannot silently filter to completed runs. Report selection limits
  and appropriate sensitivity or bounds when failures could change the claim.
  A repeated or repaired attempt remains visible; it does not erase its predecessor.
- **Treatment exposure:** distinguish assignment, applied configuration,
  opportunity, delivery and inclusion in observations when those stages apply.
  Report eligible and exposed denominators at the analysis cutoff. Assignment
  effects and exposure-conditioned descriptions are different; post-treatment
  filtering does not automatically support a causal conclusion. Included
  information does not prove attention, belief or intent.
- **Simple baselines:** run declared scripted/reference policies and a simple
  model harness in matched conditions where relevant. Scripted mechanism probes
  alone are not behavioral baselines. Compare harnesses under recorded effort
  envelopes and include ablations that distinguish memory, tool access and
  deliberation. These are explicit conditions, never silent fallback policies.
- **Claim support:** recompute checkable totals and opportunity/coverage facts
  independently. Tie claims to inspected evidence, alternatives and uncertainty.
  A valid citation does not establish entailment. Contradictory or unsupported
  claims cannot receive a passed validity assessment. Semantic judgments need
  independent evaluation on fresh labeled/controlled examples, with disagreement
  and unvalidated labels retained; a second fluent model is not ground truth.
- **Evaluation discipline:** freeze fresh cases and rubrics before validation,
  separate development/selection from evaluation, preserve all attempts and
  generation costs, and include valid simple/null cases. Causal claims, reliable
  descriptive findings and tentative exploration require different evidence.

## Trust boundaries and independent enforcement

- **Researcher probes:** operate on explicitly isolated world copies; cannot
  mutate the source checkpoint, append source run evidence or deliver messages
  to live participants. Tests compare source hashes/evidence before and after.
- **Participant operations:** use actor-scoped observation, retrieval and tool
  interfaces. World code rechecks permissions, visibility and action validity
  at settlement, including restored sessions and concurrent conflicts.
- **Generated extensions:** execute outside the trusted app with scoped world
  interfaces and independent admission checks. A copied Python object does not
  isolate executable code. No direct access to user data, host secrets, provider
  credentials or an unrestricted world database is granted by generation.
- **Adjudication:** only a declared, versioned world mechanism may consume a
  fallible adjudicator result. Preserve inputs and rulings for replay; prevent
  contradiction of executable facts or invention of participant responses.
  Generated explanations themselves never become authoritative facts.
- **Analysis:** operates read-only over recorded cutoffs. Generated findings,
  labels and visual summaries cannot rewrite state or serve as independent
  evidence for their own claims. Recorded/model prose remains untrusted data.

Accepted tradeoffs are recorded in
[probe/world authority](adr/0001-isolate-probes-and-world-authority.md) and
[participant harnesses](adr/0002-participant-harnesses-are-experimental-factors.md).

## Guarantees and validation

- Environment complexity follows the question, not population size or theme.
  A three-agent room, four-agent reliance study, evolving town and organizational
  company are capability tests, not compulsory detailed templates.
- Population, graph, participant harness and horizon need defensible rationales.
  Where dynamics are unknown, propose pilots and sensitivity checks rather than
  claiming an optimal design in advance. Exploratory studies need not invent a
  hypothesis or scalar endpoint. Confirmatory stopping/analysis remains frozen.
- Keep world correctness, research competence, participant capability, research
  validity and runtime feasibility as separate evaluation tracks. Use held-out mechanism
  combinations and partners, not just rewordings of familiar prompts. Neither
  a verbal critic nor structural validation proves scientific quality.
- An analysis lens may only assert facts supported by captured evidence. Expose
  opportunity denominators, missingness, truncation and subjective annotations.
  Delivery or inclusion in context does not prove attention, belief or intent.
- Preserve complete checkpoints and exact action replay. Require an explicit
  capability matrix and completed boundaries for every candidate adapter.
  Playback, process restoration and counterfactual forks are distinct. An
  external world that cannot meet current guarantees is not admitted by this
  proposal; weakening the contract requires a separate product decision.
- Preserve participant privacy, append-only evidence, immutable revisions and
  explicit version rejection. Do not mutate user data, install compatibility
  adapters or reset data. Identify any schema/reset implications for review
  before an incompatible change.
- Every provider request must reserve and settle its own usage. Keep
  cancellation, unknown usage, primary errors and no-silent-retry behavior.
  Research chat and saved proposals never silently launch population rollouts.
- Simulation participants currently use **GPT-6 Luna**. Future mixed-model and
  harness assignments remain separate from world mechanics. Authorized fresh
  **GPT-6.1 Sol benchmark trials have a $10 total ceiling**; no such calls have
  been made. Any live participant execution also needs its explicit run budget.

## Research checkpoint

- [x] Pull latest code and inspect current contracts and bottlenecks.
- [x] Review empirical methods and selected public implementations.
- [x] Examine Olam and current company validation research; distinguish their targets.
- [x] Independently challenge pivotal claims and revise the initial direction.
- [x] Prepare the concise revised plan for user adjustment at this checkpoint.
- [x] Record Q1–Q7 and the four added requirements as accepted decisions.
- [x] Confirm shared understanding of this consolidated plan.
- [ ] Implement the reviewed scope; run appropriate correctness/UI checks.
- [ ] Run authorized fresh evaluation and publish observed limits.

Preliminary `assistants.py` edits and untracked `research_tools.py` predate this
research pause. They are incomplete, unverified and not an approved architecture.
No production implementation or paid trials were performed during the deeper
review. External experiments were not independently reproduced. This review
does not establish universal generalization, enterprise readiness or a 100× gain.
