# Independent review of the research direction

Reviewed 2026-11-10. Scope: challenge the synthesis, environment representation,
behavior/validity, researcher-harness, and company/tool-world reports. This is a
research review, not an implementation approval or a reproduction of the cited
experiments. No production edits or paid calls were made by this reviewer.

## Assessment

The deeper review provides a defensible basis for comparing designs. It does
**not** establish an optimal architecture, universal environment generation, a
reliable thousand-agent operating envelope, or a measured improvement in JAS.
The reports generally make that distinction explicitly. Their strongest support
is for preserving alternative world implementations and explicit experimental
semantics, rather than for adopting one framework wholesale.

The following concerns are ranked by their effect on the next design decision.
Some are unresolved decisions already acknowledged in the reports; those are
identified separately from wording that needs correction.

## 1. Resolve replay and restoration guarantees before expanding the world seam

**Unresolved design decision.** Rich external worlds, asynchronous participants,
and language-mediated adjudication do not automatically satisfy JAS's existing
exact-replay and complete-checkpoint invariants. The reports acknowledge this,
but the implementation plan must explain which guarantees remain mandatory and
which kinds of environment are eligible to run under them.

These are distinct capabilities:

- Resetting a world to an initial configuration.
- Playing back an immutable trace and its recorded artifacts.
- Reapplying recorded actions to reproduce deterministic world consequences.
- Restoring a process, pending activities, deliveries, and participant memory.
- Forking a completed boundary and sampling new future decisions.

An adapter can support some without supporting all. Recording an LLM judgment
can make the original consequence replayable; it does not establish that a
changed action receives a consistent counterfactual judgment. Reproducing the
same implementation's result also does not prove its rules are correct.

**Source check:** Olam's [methodology, infrastructure and limitations](https://olamlabs.ai/research/multi-agent-arena)
explicitly describes optimistic forkability from participants' most recent
completed steps, with in-progress reasoning lost on some forks. This supports
the synthesis's caution, rather than a blanket exact-restoration guarantee.

**Decision test:** require a capability/guarantee matrix for candidate adapters
and explicit checkpoint boundaries. Do not silently weaken existing invariants
under the single label “replay.”

## 2. Scenario examples must not become mandatory complexity templates

**Wording correction.** The synthesis's “Required behavioral opportunities”
table and several detailed example tables prescribe distributed knowledge,
complementary actions, departments, persistent artifacts, or private information
too categorically. Surrounding prose is more qualified, but the tables could
become the implementation's actual acceptance criteria.

Those affordances depend on the question. Three agents with common knowledge
can support a valid study of bargaining or coordination. A thousand-agent
company voting study may legitimately use a compact action space without
departments or document editing. One agent can be studied in a simple game.
Private information is not necessary for every commitment violation.

The problem with an abstract action is whether it removes the mechanism under
study, not its abstraction alone. Replace “required” with illustrative
affordances and explain which question makes each affordance necessary.

**Benchmark implication:** include valid simple designs where extra agents,
private information, tool loops, or environmental detail would confound the
question. A harness should demonstrate restraint as well as capability to
construct rich worlds. Otherwise the benchmark may reward elaboration instead
of faithful experiment design.

## 3. Make analysis conditional on evidence coverage

**Wording correction with an implementation consequence.** New read-only lenses
can reanalyze existing trajectories only if those trajectories captured the
necessary evidence. No lens can recover an unrecorded observation, an external
artifact's missing version, unavailable model reasoning, or an opportunity that
the world never represented.

A lens should declare required evidence and report coverage and unknowns. For
example, a promise-breach analysis may need beneficiary, deadline, feasible
alternatives and subsequent action; message text alone may not identify these.
Delivered or included-in-context is observable. Actual attention, belief, or
internal retention is not established by a delivery log.

Keep exploratory post-hoc labeling useful, but preserve its status and avoid
presenting annotations as measurements of facts that were never captured.

## 4. A shared adapter is a starting seam, not the demonstrated advance

**Unresolved design decision, already substantially acknowledged.** JAS already
has a `World` abstraction. Multiple systems provide precedents for separating
worlds, participants and evaluation. Neither fact establishes the exact next
interface or proves one representation will generalize best.

The important open question is what must change at that seam: participant tool
sessions, action/observation types, eligibility and joint settlement, artifacts,
dynamic membership, lifecycle guarantees, and evidence provenance. A practical
comparison should demonstrate one existing controlled world and a materially
different artifact/tool world without forcing both into the existing balance,
signal, and round conventions.

Module composition also needs a concrete contract for shared identity, logical
time, authorization, ownership, atomic cross-module consequences, and consistent
snapshots. Two individually tested modules can still produce an invalid coupled
world. Treat this as a prototype acceptance criterion, not a benefit supplied
automatically by typed tools.

## 5. Retire superseded implementation criteria before resuming

**Documentation correction.** The older implementation plan is visibly marked
paused and historical. Its remaining next steps and checklist nevertheless
prescribe settling a declarative schema, a mandatory primary outcome, and a
deterministic thousand-actor workload. Those do not represent the deeper
review's exploratory modes, multiple representations, and distinction between
systems load and actual model behavior.

Replace its live acceptance criteria before implementation resumes. A
deterministic load test is useful evidence about runtime mechanics; it is not a
live thousand-agent behavior study. A $10 pilot can reveal severe harness errors;
it cannot validate broad intelligence or enterprise readiness. No major rewrite
should follow solely from a literature synthesis without the requested concise
design checkpoint.

## Independent primary-source spot checks

These checks tested pivotal qualifications rather than reproducing results:

| Claim checked | Primary evidence | Result |
| --- | --- | --- |
| AgentSociety2 attestation is not semantic validation | [Pinned phase-attestation contract](https://github.com/tsinghua-fib-lab/AgentSociety/blob/f70be25b9432a331c116db1301a796467dd8d2a8/extension/skills/agentsociety-analysis/v1.0.0/references/phase-attestation.md) | Explicitly checks required keys are present and nonempty, not prose quality. Synthesis is accurate. |
| Olam does not guarantee byte-faithful forks at every instant | [Multi-Agent Arena methodology](https://olamlabs.ai/research/multi-agent-arena) | Completed-step optimistic forkability and limitations are explicit. Synthesis is accurate. |
| OASIS million-user scale needs workload context | [OASIS v1, Table 2 and million-user setup](https://arxiv.org/html/2411.11581v1) | Table gives 18 hours per step and 27 A100s; activation probabilities are 0.1/0.01. Synthesis preserves these denominators. |
| Project Sid's headline scale is not its replicated cultural analysis | [Project Sid v1, §§5.3 and 8.4](https://arxiv.org/html/2411.00114v1) | Above-1,000 runs became sporadically unresponsive; reported cultural analysis uses one 500-agent, 9,000-second run. Synthesis is accurate. |
| Simultaneous semantics do not follow automatically from parallel calls | [Pinned PettingZoo conversion implementation](https://github.com/Farama-Foundation/PettingZoo/blob/6b3f4950d23da03a0061a6225ab493a47aace3e3/pettingzoo/utils/conversions.py#L104) | Conversion requires an explicit compatibility declaration; it warns that arbitrary conversion is unsafe. Synthesis is accurate. |

No material numerical contradiction was found in these spot checks. They do
not validate every paper, benchmark rubric, or company claim in the reports.
The source selection is purposive; architectural prevalence is not evidence of
superiority. Company-reported results remain company-reported.

Artificial Societies must be assessed through its current Societies research
pages and methods. Earlier failed publication URLs are not evidence that no
methodology exists. The separate company-validation review owns that current
assessment; this review does not duplicate or preempt its conclusions.

## What remains to decide

The next concise plan should identify the first supported question families,
the alternatives the prototype will compare, replay/capture guarantees, and the
criteria that would reject each alternative. It should keep general research
conversation, experiment design, participant execution and evidence analysis as
different capabilities. Preserve the requested Pydantic AI researcher with
GPT-6.1 Sol, GPT-6 Luna participants, future configurable participant systems,
and existing per-request spending guarantees. None of the reviewed evidence
justifies silently changing those constraints.
