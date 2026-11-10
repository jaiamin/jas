# Research vocabulary

| Term | Meaning |
| --- | --- |
| Experiment (study) | A research question investigated by a specified protocol. “Experiment” is the interface term; “study” is its established synonym. |
| Protocol | The explicit population, rules, conditions, seeds and measurements defining an experiment. |
| Design revision | An immutable definition of population, mechanics, conditions, seeds and measurements. |
| Environment | Rules that determine observations, allowed actions and consequences. |
| Condition | A named treatment applied to otherwise matched experiments. |
| Agent profile | A declared identity, goals and preferences used to initialize an agent. |
| Agent | One model-controlled participant in a specific run. |
| Run | One realization of a condition, seed and repetition, producing a behavioral trajectory. Runs are not automatically independent statistical replicates. |
| Round | An environment-defined interaction cycle. |
| Turn | One agent decision, distinguished from a full round. |
| Observation | The information actually available to an agent before a decision. |
| Decision | A recorded action and optional self-reported rationale and memory. |
| Event | A consequence enforced and recorded by environment rules. |
| Claim | A checkable statement about a specified fact, compared with available ground truth. |
| Commitment | An explicit promise whose deadline and fulfillment are observable. |
| Relationship | A directed history of interaction and measured reciprocity; not proof of emotion. |
| Memory | An agent's retained experiences or self-authored notes. |
| Metric | A versioned calculation with scope, units and eligibility denominator. |
| Finding | An interpretation supported by cited evidence and stated uncertainty. |
| Adaptation | A change in behavior across experience; does not imply model weight updates. |
| Replay | Reapplying recorded actions to verify deterministic state transitions without model calls. |
| Permission | An enforced action affordance, distinct from a profile's role label. |
| Oversight | A seeded procedural check that can reverse an unjustified sanction. |
| Appeal | An agent action requesting deterministic review of a recorded sanction. |
| Outside option | The payoff each negotiator receives on exit or exhausted negotiation. |
| Private evidence | Information visible only to authorized participants, including world-generated signals or artifact versions. |
| Resource stock | Persistent shared inventory, distinct from a fresh per-round endowment. |
| Benchmark case | A versioned question, split, expected mechanics and explicit assessment criteria. |

## Reusable environments

**Environment definition**:
A reusable description of world mechanics and configuration examples, independent
of an experiment's question, participants and research commitments.

**Configuration example**:
A named mechanical setup with any required unbound roles. An experiment assigns
participants to those roles and may adapt the setup for its own question.

**Environment source**:
The complete source definition and revision retained with an experiment as the
provenance of its chosen mechanics.

## Research and participant roles

**Researcher**:
The app assistant that helps formulate questions, design experiments and interpret
their evidence. It is distinct from the participants whose behavior is studied.

**Researcher harness**:
The instructions, tools and retained research context through which the researcher
conducts its work.

**Participant harness**:
The instructions, memory, tools and decision process through which a participant
acts in an experiment. Its configuration is part of the system being studied.

**Investigation**:
A bounded research workflow that develops a question, designs and checks an
experiment, executes authorized trials and interprets their evidence.

**Environment extension**:
A versioned addition to world mechanics that introduces capabilities absent
from the installed environment definitions.

**Extension candidate**:
An explicit versioned executable artifact submitted for containment and behavior
review. A successful example check does not admit it as a runnable environment.

## Evidence and validity

**Research validity**:
The extent to which an experiment's design, execution and evidence justify a
particular conclusion. It is specific to the claim being made.

**Treatment exposure**:
The realized application of an intervention to a participant's observations,
available choices or action consequences, distinct from assignment or mere availability
to the participant's harness. Information inclusion establishes neither attention,
belief nor intent.

**Exposure opportunity**:
A participant's eligibility to receive an input or record under its information rules,
whether or not scheduling, memory and chosen operations lead to actual delivery.

**Input inclusion**:
The presence of information in a model input, with a provider receipt confirming
delivery. A stored observation or local read result alone does not confirm delivery.

**Assignment-based description**:
A description retaining assigned runs, including absent opportunities, missing inputs
and failures.

**Exposure-conditioned description**:
A description restricted to participants or runs selected by realized exposure after
assignment. That selection does not automatically identify a causal effect.

**Baseline policy**:
A reference policy used to distinguish the behavior of a studied participant
system from a simpler or otherwise controlled alternative.

**Research probe**:
A hypothetical inspection or test of world mechanics on an isolated world copy.
It is distinct from a participant's actions in a recorded experimental run.

**Authoritative world state**:
The state established by accepted world transitions. An agent's statement or an
analyst's explanation is not itself an established world fact.

## Artifact work and execution modes

**World artifact**:
A persistent object with authorized readers/writers and inspectable content versions.
It is distinct from a participant's private plan or an analyst's interpretation.

**Artifact version**:
An immutable content revision with its author, source references and recorded origin.

**Source reference**:
A link to a specific artifact version used in work. A reference alone does not
establish that a participant read it or that a prose claim is true.

**Submission outcome**:
The terminal result of the world's declared checks on submitted work, independent
of the participant's claimed success.

**Trace playback**:
Viewing saved observations, decisions and consequences without executing them.

**Consequence replay**:
Reapplying recorded actions to verify deterministic consequences and authorized
read receipts, without new model sampling.

**Process restoration**:
Recovering committed work and unfinished attempt records after a server restart.
It does not itself resume participant sampling.

**New model sampling**:
An explicitly requested inference that may spend budget and produce a new proposal.
It is distinct from playback, replay and restoration.
