# JAS: behavior-first research direction

Status: **proposal for discussion; implementation paused**. Research date:
2026-11-10. This document replaces the premature architectural prescription in
the initial landscape survey. It synthesizes methods, limitations and selected
public implementations; it does not claim an independently reproduced result
or an empirically optimal architecture for JAS.

Interview update: the user accepted isolated extension generation, declared
fallible adjudication, budget-bounded investigations and task-capable participant
baselines without installed social results. They additionally require equal
attention to participant harnesses, separate research-validity checks, explicit
trust boundaries and small-population validation before dedicated scaling work.
The [decision record](DESIGN_INTERVIEW.md) distinguishes those settled choices
from the remaining questions.

Both interview rounds are now accepted. The first milestone covers a solo
evidence-seeking task, three-agent distributed information, four-agent
reliance/commitments and a 6–12-agent institutional workflow. Participants choose
when to use planning, retrieval, investigation and verification within declared
limits. At least one held-out extension must introduce genuinely absent mechanics
and pass independent checks before the scaling gate opens. The user subsequently
confirmed the consolidated plan and requested spec publication before implementation.

Latest scope correction: the user withdrew the dramatic large-population
example as a requirement. The first version targets **1–12 active participants**.
Use richer mechanics and better evidence at that practical scale; later
population increases require a concrete research question and measured limits.
Source discussions of larger populations remain evidence, not JAS commitments.

## What the app should make possible

JAS should help people investigate **how model-controlled agents act, interact
and adapt in worlds where actions have persistent consequences**. Questions may
concern one agent, a group, a heterogeneous model population, or an organization.
They may ask what happens, why it happens, what changes under an intervention,
or whether a behavior transfers to unfamiliar settings and partners.

The object of study is a model operating through a declared participant harness,
with particular information, tools, goals, memory and partners. This is neither
a claim about an unconditioned model personality nor a claim about humans.

A research environment is not its score. JAS should preserve:

1. What the world contained and what its rules permitted.
2. What each participant was actually shown, could inspect and retained.
3. What it said, created, requested, attempted and committed to.
4. What the environment accepted, rejected, delayed or changed.
5. How other participants and world processes subsequently responded.

These records support distributions, timelines, networks, artifacts, qualitative
annotations and specific measurements. A primary endpoint is useful for some
confirmatory claims; it must not define the whole world or erase other behavior.
Exploration does not require a preselected hypothesis, desired outcome or score.

## What changed after the deeper review

- **A universal bounded integer-state interpreter is not justified.** It may be
  useful for controlled games. AgentSociety2's domain modules, AppWorld's typed
  applications and Olam's game tools demonstrate much richer representations.
- **Asynchronous execution is not universally superior to turns.** PettingZoo
  documents failures from ambiguous update semantics; Concordia implements
  distinct sequential, simultaneous and asynchronous engines. Logical time,
  decision eligibility and concurrent model requests are separate concerns.
- **The participant harness is an experimental factor.** Memory, reflection,
  planning, scripts, context compaction and default objectives can install the
  very behavior a study claims to discover.
- **Artifact gates do not establish scientific validity.** AgentSociety2's
  public attestation contract explicitly checks presence/nonempty rubric keys,
  not the semantic quality of their prose. Independent mechanism checks and
  evidence-backed judgments are still necessary.
- **Large-population demonstrations need careful denominators.** Some published
  simulations use scripted decisions, and others report responsiveness limits.
  Entities, active LLM participants, requests and interactions are different.
- **Companies have different validation targets.** Olam's model-behavior games,
  Aaru's non-LLM population models and Simile's trained human-response simulator
  cannot be treated as interchangeable evidence for JAS.

Detailed support and source limitations are in
[environment representations](ENVIRONMENT_REPRESENTATIONS.md),
[behavior and validity](BEHAVIOR_AND_VALIDITY.md),
[researcher harness evidence](HARNESS_EVIDENCE.md), and
[company and tool-world evidence](COMPANIES_AND_TOOL_WORLDS.md).
The [company validation review](COMPANY_VALIDATION.md) follows current research
links that were missed in the initial survey. An
[independent challenge](RESEARCH_REVIEW.md) records objections and primary-source
spot checks; it is a review of this proposal, not an external reproduction.

## Representing simple and complex environments

Complexity has several independent dimensions: state and objects, available
actions, partial information, strategic interdependence, temporal dependencies,
changing social/work networks, persistent artifacts, and population composition.
Population size alone is not an adequate complexity measure.

A small naming game can reveal conventions with strong controls; a large company
may need documents, task dependencies, authority, resource flows and multiple
timescales. A company study of approvals might not require physical office
geometry. A town study of movement and access might. The harness should choose
detail according to the behavior that must be possible, and disclose every
important simplification.

The candidate organization is a **common execution/evidence interface over
multiple versioned environment implementations**:

- Controlled games and finite transition systems for mechanisms that benefit
  from exact, compact rules.
- Composable domain modules with structured entities, relationships, tools and
  artifacts for workflows, resource systems and evolving institutions.
- Audited adapters to richer executable sandboxes or simulators when the
  relevant behavior depends on their existing mechanics.

Environment implementations need explicit responsibilities: initialization,
observation projection, action/tool contracts, consequence settlement, logical
timing, event provenance, stopping and restoration. They need not share one
fixed action vocabulary or encode every object as a number. This is a candidate
seam to prototype, not a finalized method signature.

Admission must preserve JAS's complete-checkpoint and exact-action-replay
invariants. Distinguish trace playback, consequence replay, process restoration
and future forks. An external simulator that only records video or resets to its
initial state is not yet an eligible run adapter. Any proposal for weaker
guarantees needs a separate, explicit product decision; this review does not
authorize it.

JAS already has a `World` seam. The proposed change must earn its place by
removing concrete restrictions: fixed round/actor bookkeeping, shared observation
conventions, a fixed decision schema and whole-design library entries. Start by
testing the current worlds and one substantially different artifact/tool world
through a revised interface. That comparison should determine which operations
are actually shared; a larger abstract interface alone would demonstrate nothing.

Composition must also be demonstrated: shared identities, logical time,
permissions, ownership, atomic cross-module effects and consistent snapshots
cannot be assumed from individually typed modules. Couple workflow/artifact
changes to a resource constraint in a prototype and test conflicts, rollback
and restoration across both modules.

On-demand generation can configure, compose and instantiate supported modules.
Genuinely new semantics require an explicit extension path and verification.
Generating a plausible description is not generating a working environment.
Code-generated extensions would need independent tests and actual isolation;
they should not execute inside the trusted application merely because a model
or another model approves them.

## Separate five concepts

**Environment package:** reusable mechanics, capabilities, domain state, tools,
information access and timing. It should exist independently of one research
question, model lineup, seed list or evaluation rubric.

**Participant configuration:** model/provider, participant harness, goals,
memory/context strategy, tool access and inference settings. Population and
role assignments bind participants into the environment. Scripted background
entities must be distinguished from active model participants.

**Experiment:** the exploratory question or controlled claim, environment and
initialization, participant population, interventions, replication/stopping
plan and evidence capture. Save complete immutable definitions and referenced
versions rather than depending on mutable library records.

**Run:** one realized execution, including observations, attempted and settled
actions, deliveries, artifact changes, provider usage, failures and stop reason.
Replay validates consequences of recorded decisions; rerunning models samples
new behavior and is a different operation.

**Analysis lens:** a versioned, read-only interpretation over selected run
records. Exact state calculations, semantic labels and researcher annotations
have distinct provenance. New lenses can inspect existing trajectories without
changing their rules or rerunning participants, provided the necessary evidence
was captured. Each lens must declare its required fields, exposure/opportunity
coverage and treatment of missing or truncated records; unavailable evidence
cannot be reconstructed as fact. If a live reputation or reward changes
observations or action consequences, it belongs to world dynamics.

## The examples are design tests, not themes

| Setting | Question-dependent affordances to consider | Failure to guard against |
| --- | --- | --- |
| One agent | Information seeking, persistent tools/artifacts, recovery, meaningful stopping | Adding a second agent solely to fit the engine |
| Three agents in a room | Objects, access and possible exits; distributed knowledge or complementary actions when testing coordination | A claimed private-information study gives everyone the solution; escape is only narrated |
| Four friends and possible betrayal | Voluntary reliance/commitments, feasible alternatives and consequences; private information when relevant | A prescribed betrayer; counting every adverse outcome as betrayal |
| Town | Local access and exposure, resources/services, feedback, agent-created responses and possibly revisable institutions | A built-in chaos score or collapse forced by impossible resource rules |
| Organization of agents | Individual agency; workflow/artifact dependencies, permissions, handoffs or departments when relevant | Claiming rich workplace coordination while implementing only votes or transfers |

These examples test representational breadth. They are not mandatory templates:
a room can study conflict with shared information, and a company can study
coordination without predefined departments or legitimately use compact actions
for a voting study. Include a mechanism because the question requires it, and
preserve feasible alternative behaviors.

For the company, cost is a user choice. The engineering design must still
support bounded information retrieval, useful scheduling, world contention,
durable actor histories and tractable storage. Do not silently aggregate
requested individuals into scripted cohorts. Choose actor resolution and
network density because they answer the question, not solely to minimize cost.

## What an intelligent researcher should do

The research harness should conduct a conversation, discover available world
capabilities, inspect prior evidence, identify missing affordances, investigate
methods, propose alternatives and test candidate mechanisms. It should retain
durable artifacts and retrieve relevant context instead of depending only on
the last few chat turns or repeatedly dumping every run record into a prompt.

Its workflow should adapt to the request:

- General questions can receive explanations without creating a protocol.
- Exploration can create an open-ended world and evidence-capture plan.
- Mechanism questions need interventions that discriminate explanations.
- Confirmatory comparisons need frozen claims, eligibility, sampling, stopping
  and analysis decisions before fresh validation runs.
- Analysis must distinguish measured facts, interpretations, absent opportunities
  and unresolved uncertainty.

The leading candidate is a general researcher with real tools and persistent
research artifacts, with specialist review/search only where useful. Existing
literature does not establish that a permanent multi-agent research team is
better; this needs a controlled comparison. Independent executable verification
is valuable even when a verbal critic agrees with the researcher.

Keep Pydantic AI and GPT-6.1 Sol for this researcher. Current simulation
participants use GPT-6 Luna; provider/model/harness assignment remains an explicit
seam for later model combinations. Every provider request needs its existing
reservation and settlement guarantees. Research conversation does not silently
authorize a population rollout or paid environment execution.

Communication tools should expose real addressed deliveries, channels, shared
artifacts and permissions. Directories, recipient order, role assignments,
delivery latency, read receipts and context retrieval can all affect behavior.
Vary them when they bear on the question. Fixed research-agent teams and forced
debate are not substitutes for testing participant collaboration mechanisms.

No harness can know the optimal population and horizon for every novel question
in advance. It should justify candidate sizes, distinguish necessary resolution
from replication, and propose pilots or sensitivity analyses when the answer
depends on unknown dynamics. An interesting result is not a reason to
retroactively change a confirmatory design.

## Participant architecture has equal standing

The participant harness must be interchangeable alongside the model, with
planning, memory retrieval, investigation and verification as real capabilities.
A more sophisticated researcher driving the same single-call participant policy
does not meet the user's requirement. The current direct-action policy remains
useful as a reference condition, not the full target architecture.

Each harness operates through actor-scoped observations and tools, authorized
retained context and declared effort limits. It requests information/actions or
stops; world rules independently validate every operation and settle consequences.
Planning and verification are not privileged truth access. Retrieval must enforce
privacy across source artifacts, metadata, summaries, restored sessions and
cutoffs. Actor sessions, memory policies and tool-use receipts are part of
restoration and provenance; private provider reasoning is excluded.

Compare genuinely different harness implementations and targeted ablations.
Record model/harness identity, memory, tools, inference settings, use, failure
and work limits. Do not silently replace an underperforming policy or install
cooperation as a prerequisite for task capability. The user accepted participant
choice over capability use within the selected harness and declared effort limits;
fixed pipelines remain explicit alternative conditions.

Researcher probes run on isolated copies, without mutating source checkpoints,
appending source run evidence or contacting live participants. Copied state is
not execution isolation for generated code. Only world-enforced transitions
establish authoritative facts; a declared adjudication mechanism may consume a
recorded, fallible judgment, while explanations remain untrusted prose. These
requirements are recorded in the
[probe/authority ADR](../adr/0001-isolate-probes-and-world-authority.md) and
[participant-harness ADR](../adr/0002-participant-harnesses-are-experimental-factors.md).

## Discriminating validation before a broad rewrite

Compare candidate implementations against small, concrete behavioral tests
before selecting the final abstraction. These tests should include a rich
single-agent tool task, a distributed-information room, a commitment/opportunity
study and an environment where agents can create persistent shared artifacts.
These must establish meaningful interactions and defensible findings before
any proposed population expansion. There is no dedicated large-population
deliverable. If later studies need more participants, measure a workload that
actually represents those studies rather than relying on a toy counter test.

Include valid simple cases where extra agents, private information, tool loops
or detailed world mechanics would confound the question. The benchmark must
reward appropriate restraint as well as rich supported designs. A compact
thousand-agent voting study can be valid; it just does not validate rich company
workflows or arbitrary active-agent workloads.

Keep five validation questions separate:

1. **World correctness:** permissions, hidden information, causal effects,
   conservation, simultaneous settlement, restoration and executable oracles.
2. **Research competence:** question fidelity, useful alternatives, mechanism
   coverage, repair from counterexamples and honest unsupported conclusions.
3. **Participant capability:** planning, authorized retrieval, investigation,
   verification, memory restoration and actual comparison with simpler policies.
4. **Research validity:** independent replication, failed-run selection,
   treatment opportunities/exposure, baseline comparisons and claims actually
   supported by evidence, with appropriate uncertainty and interpretation limits.
5. **Runtime feasibility:** active actor count, delivery semantics, conflicts,
   request concurrency, interruption/restart, context bounds and storage growth.

Validity is claim-specific and separate from a runnable world, valid citations
or rich visuals. Retain all planned/attempted runs and failures by condition;
completed-only estimates must disclose selection and missingness. Count actual
replication rather than correlated agents or decisions. Distinguish treatment
assignment from application, opportunity, delivery and observed information;
exposed-only comparisons are not automatically causal. Run actual simple
policies as controls where relevant, not just scripted probes. Check numeric
claims independently and assess semantic support on fresh evaluated examples;
a cited transcript or a second model's agreement does not certify a conclusion.
Honest null/inconclusive findings are acceptable outcomes. Detailed criteria are
in [the current plan](../RESEARCH_HARNESS_PLAN.md#research-validity-acceptance-criteria).

Use held-out mechanism combinations and partner assignments, not just new
wording for familiar questions. Preserve all attempts, failures and selection
costs. A $10 live pilot can expose errors; it cannot establish broad intelligence,
enterprise readiness or a hundredfold gain. No model calls have been spent on
this research checkpoint.

Preserve the existing UI's appearance. In review, distinguish the reusable world,
participant configuration and experiment choices. Results should lead with a
trace-linked account of behavior, with optional interaction graphs, artifact
histories or maps when the world supports them. Keep mechanics, assumptions,
errors and provenance inspectable; participants receive only permitted
observations. No result view should manufacture spatial detail, intent or private
reasoning absent from the evidence.

## Proposed implementation sequence after this checkpoint

1. Establish both researcher and interchangeable participant harnesses, with
   behavior-evidence contracts, authorized tools, retained state and bounded work.
   Compare their capabilities against simple reference policies/workflows.
2. Build a narrow vertical slice: existing controlled worlds plus a persistent
   artifact/tool world, with single-agent and small-group studies. Use those
   genuinely different implementations to determine the world interface.
3. Exercise timing, collaboration and extensibility: simultaneous contention,
   permissioned messages/artifacts, private observations, restoration and
   on-demand composition. Only add new semantics after independent checks.
4. Integrate necessary UI controls and separate research-validity checks. Pass a
   small-population milestone with held-out tasks, meaningful interactions,
   participant competence and defensible findings. Preserve failures and costs.
5. Keep the initial population range at 1–12 active participants. Consider later
   increases only for concrete study needs after the milestone passes, measuring
   actual bottlenecks and distinguishing systems load from live behavior.

This is a proposed sequence for user adjustment, not approval to start the
paused implementation. The durable acceptance criteria are in
[the revised plan](../RESEARCH_HARNESS_PLAN.md).

## Current code and implementation boundary

The existing `World` seam, immutable revisions, append-only evidence, private
observations and budget ledger are useful foundations. The current action
vocabulary, two-agent minimum, twelve-agent maximum and round-based execution
are substantive restrictions. `EnvironmentLibrary` stores entire experiment
designs, confirming the user's concern about environment/design coupling.

The execution loop reconstructs a world from a full checkpoint for each
decision. Caching actor order only inside a transient world would not remove
the overall large-population cost. Full per-turn world snapshots and complete
population observations need measured redesign; increasing a field limit is
insufficient. These are code-level findings, not benchmark results.

Preliminary edits to `assistants.py` and a new `research_tools.py` existed before
the user requested this research checkpoint. They remain unverified and paused;
they are not an approved implementation of the direction above. No production
code was changed during the deeper research review. The next decision should be
the research model and environment extensibility approach, followed by a scoped
implementation plan, rather than another immediate broad rewrite.
