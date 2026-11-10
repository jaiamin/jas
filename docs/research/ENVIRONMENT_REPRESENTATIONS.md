# Representing environments for experiments on agent behavior

Research date: 2026-11-10. **Research only; implementation is paused for design
review.** This report compares full-text methods and selected public source. It
does not independently reproduce the studies, audit their security, or establish
that a proposed JAS architecture will generalize. Engineering recommendations
below are distinguished from reported results.

## The design question

JAS should let a researcher ask what model-controlled agents do under specified
capabilities, information, constraints and interactions. A world supplies the
opportunities and consequences that make that question testable. It should not
be defined by the metric used to summarize a run.

For example, an organization is not a productivity score with a hierarchy prompt.
Its environment may contain persistent documents, interdependent work, permissions,
inboxes, review decisions, resource constraints and a changing authority graph.
Productivity, information loss and concentration of authority are different
observations of that world. Similarly, a small room with three agents may require
more precise mechanics than a town with a thousand loosely narrated inhabitants.

The strongest common pattern in the systems examined is **a shared interface over
different world implementations**, with explicit observation, action, consequence
and time semantics. There is insufficient evidence for declaring a universal
guarded-integer language, a narrative game master, or asynchronous agent loops
the best representation for every experiment. The earlier proposal of one
bounded-state interpreter as the main route to generality was premature.

## What JAS is measuring

The experimental subject is a model **under a declared participant harness in a
declared environment**. Changing its memory, tool discovery, reflection loop,
communication access or action frequency changes the subject being measured.
The researcher harness that designs the study must be separate from this
participant harness and from the world that resolves actions.

Observable behavior includes attempted and successful actions, communication,
information acquisition and disclosure, tool use, artifact production, coordination,
commitment fulfillment, responses to authority, and adaptation across experience.
A model's explanation is a self-report. A generated label such as “loyal,”
“angry” or “leader” is not direct evidence of an internal state. Behavioral labels
need declared observable criteria and access to the underlying traces.

This supports two legitimate workflows:

- **Exploration:** construct an instrumented setting, observe trajectories and
  discover patterns or failure modes. Preserve alternative interpretations and
  mark post-hoc measurements. An exploratory run need not have a scalar success
  objective or a confirmatory hypothesis.
- **Comparison or hypothesis testing:** specify the intervention, comparison,
  unit of analysis, observations and stopping rule before the relevant trials.
  Separate independent run replications from the many correlated events within
  one run. Preserve failed and inconclusive trials.

Both need coherent mechanics. Neither requires JAS to assert human predictive
validity. Claims should remain about the tested models, harnesses and worlds.

## Complexity is not a population count

The following dimensions determine what a representation must support. They are
not a proposed complexity score; collapsing them would hide important differences.

| Dimension | Simpler instance | More demanding instance |
| --- | --- | --- |
| Persistent state | A shared stock and account balances | Documents, objects, inventories, institutions and versioned artifacts |
| Action structure | Choose one move and amount | Parameterized tool calls, artifact edits and multi-step procedures |
| Temporal structure | Immediate consequence per move | Durations, deadlines, delayed effects, interruptions and concurrent work |
| Information | Public state or a private signal | Local views, permissions, private channels, uncertain beliefs and discovery |
| Coupling | Independent decisions or one common pool | Supply chains, task dependencies, contagion and feedback across modules |
| Endogenous structure | Fixed roles and interaction graph | Delegation, coalition formation, changing membership and rule amendment |
| Participant capability | One response per observation | Stateful tool use, retrieval, planning and long-horizon artifact work |
| Scale | One or a few active participants | Thousands of independently stateful policies and large event histories |

Increasing population does not supply missing affordances. Increasing the number
of variables does not make the consequences meaningful. A rich environment needs
mechanics that can actually support the behavior being investigated, without
instructing the participant to produce that behavior.

## What the primary systems actually implement

### AgentSociety 2: reusable typed modules rather than one world schema

Full text examined:
[AgentSociety 2, arXiv:2607.11895v2](https://arxiv.org/html/2607.11895v2), especially
[3.1](https://arxiv.org/html/2607.11895v2#S3.SS1),
[3.2](https://arxiv.org/html/2607.11895v2#S3.SS2),
[6](https://arxiv.org/html/2607.11895v2#S6.SS1),
[7.4](https://arxiv.org/html/2607.11895v2#S7.SS4), and
[9.4](https://arxiv.org/html/2607.11895v2#S9.SS4).

Section 3.2 identifies coupling between agents, environment schemas and interaction
protocols as an obstacle to reuse. Its answer is a set of environment modules
that expose typed operations and observation functions. A dual-channel router
accepts natural-language intentions with structured context and returns textual
explanation with structured results. New modules can wrap existing simulators;
they need not fit a universal inventory of social actions.

The concrete
[`EnvBase` interface](https://github.com/tsinghua-fib-lab/AgentSociety/blob/f70be25b9432a331c116db1301a796467dd8d2a8/packages/agentsociety2/agentsociety2/env/base.py#L360)
registers methods with `@tool(readonly=..., kind=...)`, lifecycle hooks and replay
metadata. Observe/statistics tools must declare themselves read-only; this is
an interface declaration and validation check, not a proof that arbitrary Python
is pure. Initialization configuration lists environment modules separately from
agents and permits
[one participant](https://github.com/tsinghua-fib-lab/AgentSociety/blob/f70be25b9432a331c116db1301a796467dd8d2a8/packages/agentsociety2/agentsociety2/society/models.py#L63).

This is more substantial than naming a scenario. The social-media module has
posts, comments, follows, feed ranking and action records. The event module has
activities with progress and duration, although its current model permits one
current event per person. The economy module provides particular economic
operations; its presence does not establish arbitrary organizational workflows.
Module composition still needs shared entity identity, time and interaction
semantics. Merely mounting two modules does not demonstrate correct coupling.

Environment generation follows requirements, a structured design specification,
Python generation, a separate review, validation and smoke execution. The design
specification includes state, operations, initialization and persistence. This is
a useful construction workflow, **not evidence that generated scientific
mechanisms are correct**. Source also narrows the apparent persistence guarantee:
the base
[`to_workspace` and `restore` hooks](https://github.com/tsinghua-fib-lab/AgentSociety/blob/f70be25b9432a331c116db1301a796467dd8d2a8/packages/agentsociety2/agentsociety2/env/base.py#L581)
do not automatically serialize an arbitrary module; the default restore returns
false. Each stateful implementation must earn its replay/resume guarantees.

Its time model is instructive. The current
[`Society.step`](https://github.com/tsinghua-fib-lab/AgentSociety/blob/f70be25b9432a331c116db1301a796467dd8d2a8/packages/agentsociety2/agentsociety2/society/society.py#L889)
sets a shared logical clock, fans out batches of participant work, waits for
them, steps the environment, advances time and checkpoints. Agents within a
batch run sequentially; batches can run concurrently. Environment operations
are conservatively serialized unless modules declare concurrency safety.
This is not an unrestricted real-time society just because it uses distributed
tasks and concurrent inference.

Reported empirical support must be kept specific:

- Section 6 tests operation routing, call order and argument grounding. Reported
  strict routing success for the Kimi-K2 CodeGen configuration is 60%; this is
  not an end-to-end research-quality score or a guarantee of correct extension
  creation.
- The cache/overhead experiment uses 100 agents and two 40-step runs. It does not
  establish arbitrary thousand-agent workload performance.
- The 10,000-user short-video study explicitly uses user-specific rule code for
  watch/not-watch decisions. It is not evidence of 10,000 independently reasoning
  LLM participants at each decision.
- Section 9.4 separates auditability, realism and experimental-mechanism
  validity. Aggregate agreement can coexist with incorrect individual pathways.

**Lesson for JAS:** reusable typed world modules are a strong candidate; module
generation, reliable routing, correct mechanisms and scientific interpretation
must be evaluated separately. The paper argues against tightly coupling every
possible world to one fixed state/action schema.

### Concordia: rich language-mediated interaction with explicit adjudication

Full text examined:
[Concordia, arXiv:2312.03664v1](https://arxiv.org/html/2312.03664v1), particularly
[2.2](https://arxiv.org/html/2312.03664v1#S2.SS2),
[2.3](https://arxiv.org/html/2312.03664v1#S2.SS3), section 4 and appendix A.

Participants propose actions; a game master determines consequences, maintains
grounded variables and controls who observes an event. The paper explicitly
allows internal logic implemented with ordinary modeling tools, including ODEs,
graphical models and finite-state machines. A small-business example grounds
money and exchanged goods; a phone module can invoke deterministic simulated
apps, real applications or model-generated responses. Concordia should not be
summarized as purely free-form narration.

The current
[`Engine` interface](https://github.com/google-deepmind/concordia/blob/15169db65cb00e9eadc126ecf19fe8aa6142e6f6/concordia/environment/engine.py#L30)
distinguishes observation, next actor/action specification, resolution and
termination. Separate implementations provide
[sequential](https://github.com/google-deepmind/concordia/blob/15169db65cb00e9eadc126ecf19fe8aa6142e6f6/concordia/environment/engines/sequential.py),
[simultaneous](https://github.com/google-deepmind/concordia/blob/15169db65cb00e9eadc126ecf19fe8aa6142e6f6/concordia/environment/engines/simultaneous.py), and
[asynchronous](https://github.com/google-deepmind/concordia/blob/15169db65cb00e9eadc126ecf19fe8aa6142e6f6/concordia/environment/engines/asynchronous.py#L132)
loops. Simultaneous play collects independent intentions before joint
resolution. The asynchronous implementation runs an observe-act-resolve loop
per participant, explicitly requires a thread-safe game master, and supports
dynamic membership. It cannot be treated as a harmless performance replacement
for sequential play: observation freshness and available actions change.

**Lesson for JAS:** use language to extend interaction where appropriate, but
declare which consequences are rule-enforced and which are model-adjudicated.
A model game master introduces another model, prompt and stochastic process
into the experiment. Recording its judgments permits replay of the record;
it does not establish consistent counterfactual consequences after a changed
action. A language-mediated adapter can be valuable for exploration without
being the default authority for accounts, permissions or other exact mechanics.

### Project Sid / Altera: rich external mechanics and a real scale limitation

Full text examined:
[Project Sid, arXiv:2411.00114v1](https://arxiv.org/html/2411.00114v1), especially
[2](https://arxiv.org/html/2411.00114v1#S2),
[3.2](https://arxiv.org/html/2411.00114v1#S3.SS2),
[5.2](https://arxiv.org/html/2411.00114v1#S5.SS2),
[5.3](https://arxiv.org/html/2411.00114v1#S5.SS3) and
[8.4](https://arxiv.org/html/2411.00114v1#S8.SS4).

Minecraft supplies persistent space, resources, recipes and physical constraints.
Obtaining advanced objects requires chains of earlier actions. These affordances
make division of labor more meaningful than simply assigning job labels. PIANO
uses concurrent planning, state and fast-action streams with a cognitive
controller intended to maintain coherence. This is a participant architecture,
separate from Minecraft's world mechanics.

The single-agent acquisition evaluation uses 25 explorers, five repetitions and
an action-awareness ablation. Spawn location contributes to variability. The
tax study uses 29 agents: 25 constituents, three influencers and an election
manager, with four repetitions per influencer/condition configuration. Guards
and police were omitted because of implementation complexity; observed rule
compliance therefore should not be interpreted as behavior under an implemented
coercive enforcement system.

The authors report runs above 1,000 agents, **but say those exceeded the server's
computational constraints and became sporadically unresponsive**. Cultural
results are analyzed from a single 500-agent run lasting 9,000 seconds. Twenty
seeded priests intentionally spread a particular religion; this differs from
spontaneous creation of a doctrine. Some role and meme measurements are inferred
from generated goals by model judgments or keywords.

**Lesson for JAS:** an external simulator is a legitimate world adapter when
its mechanics matter. Rich capability and environment engineering precede
interesting large-scale behavior. The headline population is not evidence of
reliable, replicated thousand-agent research infrastructure. Public PIANO
implementation was not inspected in this review; the architecture evidence here
comes from the report, not an audited implementation.

### OASIS: a relational social platform, exposure mechanism and activity model

Full text examined:
[OASIS, arXiv:2411.11581v1](https://arxiv.org/html/2411.11581v1), particularly
section 2, [4.1](https://arxiv.org/html/2411.11581v1#S4.SS1), section 4.2,
appendix C and [appendix H](https://arxiv.org/html/2411.11581v1#A8).

OASIS separates the platform database, recommendation, participant policy,
time-based activation and inference infrastructure. Posts, comments, follows,
recommendation exposure and action traces are persistent objects. Relationships
and content can change endogenously. The inspected current
[`Platform` implementation](https://github.com/camel-ai/oasis/blob/fced8869353f858de4ebe7b8f60321415f238fad/oasis/social_platform/platform.py)
provides typed operations with concrete relational effects; the
[`AgentEnvironment`](https://github.com/camel-ai/oasis/blob/fced8869353f858de4ebe7b8f60321415f238fad/oasis/social_agent/agent_environment.py)
builds participant observations. Current source is pinned separately from the
2024 paper and should not be presumed identical to its experimental version.

The paper's activation mechanism uses hourly activity probabilities; not every
registered user acts in every time step. In its million-user study, activation
probabilities are 0.1 for core users and 0.01 for ordinary users. Table 2 reports
**18 hours per time step on 27 A100 GPUs** for the million-agent configuration.
Local distributed inference, sparse activity and social-media action structure
are essential context for the scale claim. They do not estimate latency for a
thousand API-driven organizational workers.

Recommendation and temporal ablations demonstrate that exposure and activation
are substantive experimental mechanisms. Appendix H acknowledges a simplified
recommender, incomplete platform actions, text-only perception and multi-day
runtime at scale. It does not establish generality to physical rooms or company
production merely because the participant count is large.

**Lesson for JAS:** implement the mechanisms that mediate interaction, including
exposure, delivery and activity. Dynamic graph/content state is often more useful
than a single global relationship score. Declare sparse activation as a study
choice; never silently replace active model participants with scripts to meet
a population headline.

### Generative Agents: persistent spatial context and memory, limited evaluation

Full text examined:
[Generative Agents, arXiv:2304.03442v2](https://arxiv.org/html/2304.03442v2),
sections 4–7 and [8.2](https://arxiv.org/html/2304.03442v2#S8.SS2).

The environment has spatial locations, objects and statuses; participants have
local perception, associative memory, retrieval, planning and reflection. The
inspected
[`Maze`](https://github.com/joonspk-research/generative_agents/blob/fe05a71d3e4ed7d10bf68aa4eda6dd995ec070f4/reverie/backend_server/maze.py)
and
[`execute` implementation](https://github.com/joonspk-research/generative_agents/blob/fe05a71d3e4ed7d10bf68aa4eda6dd995ec070f4/reverie/backend_server/persona/cognitive_modules/execute.py)
ground movement and action addresses such as world/sector/arena/object. Spatial
grounding should not be mistaken for a detailed physical process for every
narrated activity. The environment is richer than its final believability score,
but the action implementation still determines what actually occurs.

Evaluation includes human ratings of interview responses and a descriptive
25-agent, two-game-day run. The interview ablations use memories from the same
full-architecture trajectory, rather than independently rolling out every
architecture condition. Section 8.2 acknowledges a short evaluation horizon,
unknown robustness and substantial cost/runtime for the original study.

**Lesson for JAS:** persistent artifacts and situated observation are useful.
Memory/reflection are experimental interventions, not automatically neutral
improvements. Believable interviews or an appealing visual replay do not certify
that the corresponding world mechanics are implemented or that the behavior
replicates across models and settings.

### PettingZoo and OpenSpiel: declare interaction semantics explicitly

Full texts examined:
[PettingZoo, arXiv:2009.14471](https://arxiv.org/html/2009.14471) and
[OpenSpiel, arXiv:1908.09453](https://arxiv.org/html/1908.09453), with current
interfaces inspected separately.

PettingZoo's agent-environment cycle is motivated by actual timing,
reward-attribution and conflict-resolution bugs in multi-agent environments.
It can represent simultaneous play by collecting intentions before world
updates; sequential method invocation does not itself imply sequential game
semantics. The current
[`AECEnv`](https://github.com/Farama-Foundation/PettingZoo/blob/6b3f4950d23da03a0061a6225ab493a47aace3e3/pettingzoo/utils/env.py#L29)
and
[`ParallelEnv`](https://github.com/Farama-Foundation/PettingZoo/blob/6b3f4950d23da03a0061a6225ab493a47aace3e3/pettingzoo/utils/env.py#L311)
expose observations, actions, dynamic membership and termination/truncation.
The
[AEC-to-parallel conversion](https://github.com/Farama-Foundation/PettingZoo/blob/6b3f4950d23da03a0061a6225ab493a47aace3e3/pettingzoo/utils/conversions.py#L104)
requires a declaration that the environment only updates in a compatible way.
It deliberately refuses to assume all environments can be parallelized safely.

OpenSpiel's
[`GameType`](https://github.com/google-deepmind/open_spiel/blob/3c5361621d8b0fc05fc0456604d8fada7096a2cb/open_spiel/spiel.h#L50)
declares dynamics, chance, information, utilities and reward timing. Player count
is an instantiation parameter. Importantly, it explicitly supports
[structured actions](https://github.com/google-deepmind/open_spiel/blob/3c5361621d8b0fc05fc0456604d8fada7096a2cb/open_spiel/spiel.h#L170)
when enumerating a combinatorial action space as flat integers is infeasible.
Different games share an interface while preserving different legal actions,
information states and transition implementations.

**Lesson for JAS:** separate shared experimental semantics from a universal
action vocabulary. These frameworks supply strong interface precedents and
concrete failure cases, not evidence that adopting their entire dependency
stack will solve arbitrary language-agent research.

### Melting Pot: reusable mechanics separated from social composition

Full text examined:
[Melting Pot 2.0, arXiv:2211.13746](https://arxiv.org/html/2211.13746), particularly
the evaluation setup and substrate/scenario definitions.

A **substrate** defines layout, mechanics, roles and action/observation spaces.
A **scenario** selects focal participants and held-out background policies.
The current
[`ScenarioFactory`](https://github.com/google-deepmind/meltingpot/blob/bc456f694a08dc6c4019fa9ca2fee1caaa2f4928/meltingpot/utils/scenarios/scenario_factory.py#L31)
keeps the substrate, roles, policies and permitted observation keys distinct.
The
[`Substrate` wrapper](https://github.com/google-deepmind/meltingpot/blob/bc456f694a08dc6c4019fa9ca2fee1caaa2f4928/meltingpot/utils/substrates/substrate.py#L33)
emits environment-specific events as well as timesteps and actions. Cooperative
cooking and resource-cleanup worlds contain actual spatial/resource mechanics;
they are not defined by their scalar return.

Its empirical question is social generalization to new partners and populations
on specified substrates. It does not demonstrate generalization to arbitrary
new worlds. The paper reports substantial remaining failures on several
substrate families, including cases near random performance.

**Lesson for JAS:** reuse a world across populations and interventions, and
hold out interaction partners where that matches the question. Do not conflate
partner generalization, layout transfer, new mechanics and open-ended research
competence under one “generalization” score.

## Representation choices and their failure cases

These are alternatives at the world seam, not a requirement to build five
frameworks now. A hybrid needs a declared authority for every state change.

| Representation | Appropriate uses | What it cannot establish by itself |
| --- | --- | --- |
| Guarded declarative state/transitions | Exact games, resource mechanisms, permissions, simple workflows; inspectable generated configurations | Arbitrary documents, rich task execution, physics or all novel mechanisms without an expanding language/runtime |
| Typed domain/tool modules | Organization workspaces, social platforms, institutions and composable persistent artifacts | Correct cross-module invariants, isolation or replay merely from typed operations |
| Language-mediated game master | Open-ended social interactions and qualitative exploration with broad attempted actions | Stable counterfactual rules, precise causal attribution or faithful enforcement from plausible prose |
| External simulator or sandbox | Spatial/physical worlds or real digital work where an existing implementation supplies necessary affordances | Determinism, performance, observation isolation or meaningful behavioral measures without adapter-specific work |
| Hybrid | Exact accounts/permissions plus flexible communication and explicitly modeled adjudication | Freedom from confounding unless adjudication and coupling are recorded and studied |

A declarative language is valuable where it is expressive enough and easier to
verify. It should be one implementation, rather than the definition of what an
environment can be. Conversely, unconstrained generated Python is not a shortcut
to generality: it moves difficulty into isolation, persistence, dependency
management, semantics and independent mechanism verification.

“Generated on the fly” has several different meanings:

1. Generate initial entities, maps, artifacts and role assignments under existing
   mechanics. Validate references, permissions and initial-state invariants.
2. Compose or configure existing modules. Validate interaction, scheduling and
   shared-resource invariants, not just each module in isolation.
3. Define new mechanics in an existing declarative representation. Check
   reachable transitions and counterexamples within its expressiveness.
4. Generate a new executable adapter. Require a real isolated execution design,
   versioned dependencies, lifecycle/checkpoint implementation and independent
   behavioral oracles before it becomes runnable research infrastructure.

The researcher should know which level was used. If level 1 cannot represent the
question, the system should report the missing capability and propose an
extension. It should not quietly turn new mechanics into descriptive text.
Evidence supports investigating these tiers; it does not justify promising
arbitrary autonomous environment generation in the first implementation.

## Scheduling is part of the experiment

Three concepts must remain distinct:

- **Logical time:** when events occur in the simulated world, including action
  durations, delayed delivery, deadlines and exogenous events.
- **Decision eligibility and settlement:** who may act, which version of the
  world they observe, when intentions become consequences, and how conflicts
  resolve.
- **Compute concurrency:** how many independent model requests are in flight.

Concurrent inference can serve sequential, simultaneous or scheduled worlds.
An event queue can deliver decisions that were computed at a barrier. Fully
asynchronous observe-act-resolve loops can expose provider latency as an
experimental advantage. Faster replies should determine simulated advantage
only when the study intends to measure that relationship.

The world must declare compatible scheduling semantics. Examples include:

| Semantics | Useful case | Required check |
| --- | --- | --- |
| Sequential decisions | Negotiation, an ordered procedure, inspection followed by response | Order is explicit, seeded or varied as a treatment; observations reflect preceding settled actions |
| Simultaneous intentions | Competing claims on a resource, sealed choices, coordinated moves | Shared observation cutoff; all eligible intentions settle under a declared joint-conflict rule |
| Logical event scheduling | Work duration, travel, message delivery and staggered activity | Stable tie-breaking, queue persistence, interruption rules and correct time advancement |
| Independent asynchronous loops | Real-time interactive settings where relative speed is part of the question | Thread-safe or serialized state authority; observed versions and timing recorded; latency effects acknowledged |

There is no evidence here for removing turns. A turn is a useful record of a
decision, even when it is no longer a mandatory round-robin execution rule.
Likewise, a universal number of rounds is unjustified. The study should choose
an interaction/time horizon and stopping rule that give the mechanism time to
operate; execution ceilings and budget exhaustion must be recorded as truncation
when they interrupt that horizon. Adaptive stopping must be declared and its
statistical implications considered for confirmatory comparisons.

## Mapping the user's examples to actual affordances

These are requirements to investigate, not claims that JAS currently implements
them or that every study needs every listed mechanism.

| Requested setting | Question-dependent affordances to consider | Examples of behavior to observe |
| --- | --- | --- |
| One agent | A persistent task/world, available tools, partial information where relevant, consequences and feedback | Exploration, adaptation, tool selection, persistence, error recovery, goal switching |
| Three agents trapped in a room | Explicit objects and access, possible exits, shared constraints; local/private information, communication and action duration/conflict when relevant | Information sharing, coordination, conflict over resources, honoring plans, strategy changes after failed actions |
| Four friends with possible betrayal | Relationship history, private information, actual opportunities to disclose or misuse entrusted access, commitments and observable consequences | Unauthorized disclosure, commitment violation, selective cooperation, response to evidence and repair attempts |
| A town that may descend into chaos | Locations/services and resources, local exposure, institutions with enforceable powers, dependency and disruption mechanics, changing graph/membership where needed | Cascading service failures, rule compliance, coordination, coalition formation, escalation/recovery and differences across observation channels |
| A company with 1,000 agents | Individually stateful workers; artifacts, inboxes/channels, permissions, interdependent work, delegation, review, resources and durations as required by the question | Information bottlenecks, delegation, duplicated work, coordination overhead, governance changes, artifact quality and recovery from failures |

These are not mandatory setting templates. A room can test conflict with shared
information; a company can study self-organization without predefined departments.
Selecting every listed mechanism would add assumptions as well as detail.

“Betrayal” must be operationalized, for example as breaking a recorded promise or
disclosing entrusted information. It cannot be established by a model saying
that it feels betrayed. “Chaos” similarly requires specified observable patterns
or an explicitly exploratory question; an engine-level chaos scalar would build
the answer into the world. Organizations need work that can succeed or fail
under world rules, rather than agents only reporting how productive they were.

Spatial visualization is optional for organizational work; an artifact timeline
and communication/dependency graph may explain it better. A room's visual state
must reflect implemented objects and actions. A town map should not imply physics
or enforcement that the underlying adapter lacks.

The researcher should justify population and policy granularity against the
question. It may propose one agent for adaptation, four for a disclosure problem,
or a thousand individually controlled workers for emergent organizational
effects. More agents can change network structure and coordination demands;
this is not automatically preserved by reducing the population. Aggregates,
scripted background actors and representative policies are possible study
choices, but must be named explicitly and compared where fidelity matters.
Cost alone is not a reason to reject the user's requested granularity.

## Organization recommended for design review

The evidence supports the following conceptual separation. These are domain
responsibilities to review, not a finalized class hierarchy or database schema.

| Object | Responsibility |
| --- | --- |
| Reusable environment definition | Versioned mechanics, configuration/initialization contract, observation/action capabilities, supported scheduling and state/artifact representation |
| Initialized world instance | Concrete entities, artifacts, event queue, private/public state and random state for one run |
| Participant policy and harness | Model, prompts, memory/retrieval, tools and decision loop; replaceable and experimentally variable |
| Study/experiment and immutable revision | Question, exploratory/comparative intent, chosen world snapshot, population, interventions, scheduling choice, measures, replication and stopping |
| Run | One realization, including model calls, observations, intentions, settled events, artifact history, checkpoints, costs and termination/truncation |
| Analysis | Evidence-linked calculations and interpretations over declared run cutoffs, retaining uncertainty and alternative explanations |

An environment library should therefore contain reusable mechanics and meaningful
configuration examples. An experiment binds those mechanics to a question and
population. A run instantiates that binding. A saved experiment must retain an
immutable snapshot/reference with resolvable versioned content so later edits to
the library cannot change its meaning.

At the world seam, the caller needs to know: how to initialize and restore;
what observations and action contracts exist for an eligible participant;
how proposed actions are validated and settled; how time advances; what events
and artifact changes result; and why the run ends. Those operations need not
force every world into a scalar reward, fixed actor count or universal action
menu. Capability declarations should determine which scheduling and observation
operations are valid; adding optional methods for every conceivable world would
create a shallow interface.

For JAS, a practical design comparison should start with its existing deterministic
worlds and a genuinely different artifact/tool world. Two working adapters can
reveal the necessary seam more credibly than a universal interface designed
entirely in advance. Language-mediated or external worlds can then be evaluated
against the same evidence and lifecycle requirements. This is an implementation
sequence to consider after review, not authorization to resume implementation.

The current
[`World`](../../backend/src/agent_sim/simulation/world.py)
already separates world rules from providers and persistence. It also embeds
round-robin selection, shared common state and observation conventions. The
current
[`Design`](../../backend/src/agent_sim/domain.py)
permits 2–12 profiles and 1–100 rounds. Supporting one or a thousand participants
requires more than changing those bounds: observation size, action schemas,
membership, accounting, checkpoints, artifact growth and run execution all need
measurement. The existing module is a useful starting seam, not evidence that its
present semantics fit every proposed world.

The app researcher remains Pydantic AI with GPT-6.1 Sol; current participant
policies use GPT-6 Luna as requested. Model identity belongs in the declared
participant configuration, so future model combinations can be studied without
changing the world. No new model calls were made for this report.

## Evidence to retain and show

Store enough information to reconstruct what happened: the world revision and
configuration, participant/harness assignments, seeds and random state, schedule,
actual observations, attempted actions, validation results, adjudication provenance,
settled consequences, message recipients, artifact versions, exogenous events and
checkpoints. Distinguish a participant statement from an enforced world fact.

Each analysis lens needs an evidence-eligibility contract: required event and
observation fields, relevant opportunity/exposure coverage and how missing,
truncated or unavailable records affect the claim. A new lens cannot recover
facts that the run never captured. Preserve unknowns instead of filling them
with a plausible narrative.

Participant prompts should contain their permitted observations, not the
researcher's full state or future intervention plan. A researcher can inspect
the complete record in an appropriate view, but a participant replay must not
leak other participants' private state. A graph, map or timeline should link to
the events/artifacts that justify it. Derived labels and model summaries should
be visibly distinguishable from raw events. Private reasoning is not a required
or justified visualization target.

For the existing UI, keep the overall appearance and expose progressive detail:
a concise design summary and capability gaps before running; a world/participant/
study distinction when reviewing; then a trajectory with optional graph, artifact
or spatial views appropriate to the adapter. This recommendation does not depend
on a broad visual redesign. A single generic score dashboard would hide the
mechanisms this product is meant to investigate.

## Checks needed before selecting and claiming the architecture

These are proposed discriminating checks. They have not been run by this review.

1. **Information isolation:** an agent with no access cannot obtain another's
   private artifact or message, including through observations, tool descriptions,
   errors, summaries and restored memory.
2. **Action grounding:** a request that merely describes success cannot change
   authoritative state; actual permitted actions can. An unimplemented mechanism
   is reported as a capability gap rather than fabricated into the narration.
3. **Conflict semantics:** competing simultaneous claims settle correctly and
   independently of provider completion order; sequential observation cutoffs
   and intentional priority rules remain distinguishable.
4. **Persistent work:** artifact edits, permissions, task dependencies, deadlines
   and interrupted activities survive checkpoint/restore. Derived summaries
   agree with source events rather than replacing them.
5. **Endogenous structure:** authorized changes to roles, relationships or rules
   affect later affordances; prohibited changes fail. The system need not assume
   a fixed graph when the question is graph formation.
6. **Replay and provenance:** deterministic adapters replay recorded actions
   exactly; nondeterministic adjudications and external results are retained as
   inputs. Report which guarantee was achieved. Do not equate playback with
   counterfactual validity.
7. **Schedule sensitivity:** vary eligible order, duration/tie-breaking and
   provider latency separately. Identify whether a reported behavioral effect
   depends on an accidental scheduling choice.
8. **Mechanism validity:** use independently specified small cases with known
   consequences and targeted ablations. A reviewer agreeing with generated
   prose or schema validation is insufficient.
9. **Researcher capability selection:** on fresh questions spanning the user's
   examples, evaluate whether the researcher chooses sufficient mechanics,
   appropriate population, a defensible horizon and useful evidence; include
   questions requiring a new adapter or an honest unsupported answer.
10. **Thousand-agent feasibility:** exercise actual per-agent state, realistic
    observation/artifact sizes, concurrency, accounting and checkpoint growth.
    A deterministic stand-in can measure systems throughput but cannot establish
    live intelligence, actual token cost or a thousand-agent behavioral result.
    Report active decision counts and policy types alongside entity counts.

“100 times more sophisticated” is an ambition, not a scientifically meaningful
single metric. Credible progress would mean supporting previously impossible
mechanisms, correct and inspectable trajectories, reliable research-design
decisions, and measured operating limits. No paper reviewed here proves a single
optimal architecture for all of the user's settings. The supported decision is
to preserve variation at the world seam, make experimental semantics explicit,
and test those capabilities before making broad generality claims.

## Source scope and reproducibility

Full-text HTML was fetched and methods, evaluation and limitations were examined
for the eight research lines above. Selected public implementation files were
also read. This is a focused engineering review, not a systematic literature
search or exhaustive audit. Commercial-platform evidence and researcher-harness
evaluations are covered separately by the wider review.

Public source snapshots inspected on 2026-11-10:

| Repository | Commit |
| --- | --- |
| `tsinghua-fib-lab/AgentSociety` | `f70be25b9432a331c116db1301a796467dd8d2a8` |
| `google-deepmind/concordia` | `15169db65cb00e9eadc126ecf19fe8aa6142e6f6` |
| `camel-ai/oasis` | `fced8869353f858de4ebe7b8f60321415f238fad` |
| `joonspk-research/generative_agents` | `fe05a71d3e4ed7d10bf68aa4eda6dd995ec070f4` |
| `Farama-Foundation/PettingZoo` | `6b3f4950d23da03a0061a6225ab493a47aace3e3` |
| `google-deepmind/open_spiel` | `3c5361621d8b0fc05fc0456604d8fada7096a2cb` |
| `google-deepmind/meltingpot` | `bc456f694a08dc6c4019fa9ca2fee1caaa2f4928` |

Paper versions and implementation snapshots are not interchangeable. The
downloaded full texts and source used for inspection are local research scratch
files; durable citations above point to the papers and immutable source commits.
