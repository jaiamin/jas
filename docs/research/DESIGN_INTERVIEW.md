# Harness and simulation design interview

Status: **complete; Q1–Q7 and consolidated plan confirmed**.
Started 2026-11-10. The user then requested to-spec before implementation.

Latest correction: the user explicitly withdrew the dramatic large-population
example as a requirement and asked for a reasonable target. The first version
targets **1–12 active participants**; later increases need a concrete research
purpose and measured validation. This supersedes historical population targets
below without reopening the accepted harness, isolation or validity decisions.
The user explicitly invoked grill-with-docs before implementation. This record
tracks the decision tree and answers; recommendations become decisions only
through explicit answers.
The [research direction](RESEARCH_DIRECTION.md) supplies evidence, and the
[implementation plan](../RESEARCH_HARNESS_PLAN.md) remains provisional.

## Established constraints

- Study model-agent behavior, not human predictive validity.
- Pydantic AI remains the harness framework; GPT-6.1 Sol is the app researcher;
  current simulation participants use GPT-6 Luna. Future participant systems
  must be replaceable without changing world mechanics.
- Support appropriate single-agent, small-group and genuinely active large
  populations. Cost alone must not exclude the requested level of detail.
- Preserve the existing UI appearance unless a necessary workflow requires changes.
- Fresh Sol benchmark spending has a $10 total ceiling; none has been spent.
- Existing project invariants remain in force. Proposed exceptions must be
  explicit decisions, not inferred from enthusiasm for richer worlds.
- Complete this interview and confirm shared understanding before implementation.

## Decision tree

The frontier contains decisions whose prerequisites are already established.
Ask the entire frontier in a round; do not ask dependent choices speculatively.
The user accepted all four first-round recommendations and added four binding
requirements. New questions below refine the remaining tradeoffs rather than
reopening those choices.

| Decision | State | Prerequisites | Dependent decisions |
| --- | --- | --- | --- |
| Q1: Handling genuinely unsupported mechanics | Accepted | Established generalization goal | Extension generation, verification, isolation and failure behavior |
| Q2: Authority for ambiguous social consequences | Accepted with explicit world-authority requirement | Established behavioral target | Adjudicator provenance, measurement eligibility and replay admission |
| Q3: Budget-bounded autonomous investigations | Accepted | Established question-to-result goal and explicit paid actions | Review checkpoints, adaptation, stopping, budgets and cancellation |
| Q4: Task-capable participant baseline without installed social results | Accepted | Established distinction between researcher and participants | Memory, reflection, goals, role initialization and participant-system comparisons |
| Q5: Small-population milestone scope | Accepted | Q1–Q4 and user-required validation-before-scale | Four small-study families and separate capability/correctness/validity gates |
| Q6: Participant choice of planning/investigation effort | Accepted | Interchangeable participant harnesses and bounded work | Optional capability use, effort records, simple reference harness and ablations |
| Q7: Generated-extension evidence before scaling | Accepted | Q1 and user-required small-population gate | Held-out new mechanic, independent expected consequences and preserved attempts |
| World composition and execution contract | Resolved for the milestone by existing invariants and disclosed defaults below | Q5–Q7 | Prototype concrete semantics; no weaker replay or implicit provider-time priority |
| Researcher tools, durable artifacts and work limits | Resolved in scope by Q1/Q3/Q6 and per-request accounting | Q3, Q5–Q7 | Implement scoped tools and configurable bounded work; tune only on development tasks |
| Results and review experience | Resolved in scope by Q5 and validity requirements | Q5 and evidence/capture contracts | Preserve appearance, expose evidence/uncertainty and adapt views to represented worlds |
| Final shared understanding | Confirmed by explicit “Yes” | Q1–Q7 and the four added requirements | Complete the subsequently requested spec publication, then follow the approved implementation scope |

This is the current map, not a promise to ask every implementation detail.
Routine choices can be resolved from repository patterns; product tradeoffs
and consequential assumptions need explicit settlement.

## Round 1: accepted

**Q1 — Unsupported mechanics.** When a requested experiment needs mechanics
absent from the library, should the researcher attempt to create and test an
extension? Recommendation: yes, as a bounded, isolated generation/verification
stage with honest failure if the necessary checks cannot be met. A prompt-only
substitute does not count as support. This is a larger scope than composition.

**Q2 — Ambiguous consequences.** Should explicitly declared model adjudication
be permitted for interpretive social outcomes? Recommendation: yes, while
executable facts such as inventory, permissions, deliveries and rule-governed
votes remain authoritative. An adjudicator cannot invent a participant's response
or treat its private beliefs as known. Record adjudications as fallible inputs. This does
not by itself relax existing replay/checkpoint guarantees or validate a judge.

**Q3 — Investigation autonomy.** Should one explicit investigation action, with
a visible spending/work envelope, authorize design, checks, exploratory pilots,
execution and analysis within that scope? Recommendation: yes; material intent
ambiguity, exhausted budget or a change in scope stops for user input. Retain
frozen confirmatory decisions and provenance for exploratory adaptation.

**Q4 — Participant baseline.** Should default participants use a task-capable,
declared harness without installed cooperation, betrayal, hierarchy or human
needs? Recommendation: yes; richer memory, reflection, persona and objectives
are named factors that may be selected or compared, not automatic improvements.
Task-appropriate tools and usable context remain available and their
configuration is recorded. The baseline is declared, not claimed to be free of
all behavioral influence.

The user's explicit answer was: “For your four questions, I'll go with your
recommendation.” This settles Q1–Q4; it does not approve production implementation
or answer later questions. Record the following refinements as requirements.

## Additional user requirements: accepted

1. **Participant architecture has equal standing.** Define interchangeable
   participant harnesses for planning, memory retrieval, investigation and
   verification. A more capable researcher must not leave participants as the
   same single-call policy under a new name. Harness/model assignments,
   information access and effort are explicit experimental factors.
2. **Research validity is a separate requirement.** Address small-sample
   uncertainty, failed-run selection, treatment exposure, simple baselines and
   whether evidence supports analyst claims. Versioning, citations and richer
   visualizations are not substitutes for these checks.
3. **Trust boundaries are explicit.** Researcher probes operate on isolated
   copies. World rules independently enforce permissions, visibility and
   consequences. Generated explanations never become authoritative facts.
   Declared adjudication remains a fallible input to an enforced mechanism.
4. **Small-population validation precedes scaling.** Establish meaningful
   interactions and defensible findings before dedicated 1,000-agent work.
   A mechanically completed run or load test does not satisfy that milestone.
   A well-supported null or an honest inconclusive result can satisfy the
   evidence standard; an interesting social outcome is not required.

The small-first sequencing superseded the earlier unconditional population
implementation step. The user's later correction removes the fixed large-scale
goal altogether. The initial supported range is 1–12 active participants;
individuals cannot silently be replaced with scripted cohorts.

## Round 2: accepted

**Q5 — First milestone.** Should the small-population milestone cover a solo
evidence-seeking task, three-agent distributed-information coordination,
four-agent reliance/commitment opportunities, and a 6–12-agent institutional
workflow with persistent work? Recommendation: yes, with simple controls,
fresh repetitions and separately checked participant competence, world
correctness and claim validity. Include legitimate simple/null cases. Exact
sampling and precision plans follow the chosen claims, not a universal run count.

**Q6 — Participant effort.** Within a declared harness and effort allowance,
should participants choose when to plan, retrieve memory, investigate and
verify rather than always traverse a fixed sequence? Recommendation: yes;
make these real tools/capabilities, record use and stopping, and retain a
simple direct-action harness plus controlled ablations for comparison. Choosing
to investigate is observable behavior. Internal reasoning remains private.

**Q7 — Evidence for new environment generation.** Before the scale gate opens,
should at least one held-out small-population task require a genuinely new
mechanic generated through the extension path? Recommendation: yes; define
expected behavior and acceptance checks independently before seeing the output.
Hand-authored worlds and self-generated tests alone cannot establish that
capability. Retain attempts and failures; one success does not prove universal
environment generation.

The user answered “yes to all,” explicitly accepting Q5–Q7. These choices are
settled and must not be asked again. No additional product question is needed
for the agreed milestone. The following engineering defaults make the remaining
implementation choices visible; they do not silently expand scope.

## Consolidated implementation defaults

- **World mechanics:** preserve existing controlled worlds and develop a
  materially different artifact/tool world. Derive the shared interface from
  those implementations; do not invent a universal numeric state language.
  Modules must demonstrate atomic shared effects, consistent identities/time,
  privacy and checkpointing when composed.
- **Timing:** declare logical-time, eligibility and conflict semantics per
  environment. Provider response speed is not an implicit priority rule.
  Verify sequential and simultaneous/phase cases, and represent delayed
  messages/work through explicit logical-time events. A fully asynchronous
  distributed deployment is not required for the small-population milestone.
- **Lifecycle:** one authoritative writer per run; world settlement remains
  independent of researcher/participant policy. Restore actor context, pending
  activities and deliveries at explicit committed boundaries. No silent
  retries, policy replacements or budget resets.
- **Effort:** researcher and participants have explicit model/tool/token/work
  ceilings and stop reasons. Participants may select supported capabilities;
  fixed pipelines are named experimental alternatives. Tune concrete defaults
  using development cases before freezing validation; no universal optimal
  number of turns is claimed.
- **Extension admission:** first prove a credential-free, fail-closed isolation
  mechanism in the permitted development and production runtimes. If this fails,
  do not execute generated code or mark the generation milestone passed. A
  separate process, copied state or executable syntax checks alone do not
  establish containment. Never change host mounts or security settings to bypass
  a failure.
- **Evidence:** preserve all attempts and declared cutoffs. Distinguish raw
  events, calculations, semantic annotations and claim assessments. Display
  trace-linked summaries with optional graph/artifact/map views only where
  supported. Avoid unrelated UI redesign and private reasoning exposure.
- **Generality evaluation:** freeze development/evaluation boundaries and
  independently authored criteria before validation. At least one held-out
  task requires genuinely absent mechanics, not renamed installed rules.
  Keep all generated artifacts, repairs, costs and failures. One success is
  evidence of a narrow capability, not universal generation.
- **Scope:** build and validate the four accepted small-study families first.
  There is no dedicated large-population deliverable; any later increase follows
  the validation gate and a concrete study need. Live trials always need explicit
  run budgets. No paid participant budget is inferred from
  the $10 Sol benchmark allowance.

These defaults can be implemented reversibly and checked through the agreed
contracts. A finding that requires weaker invariants, destructive data changes,
expanded credential access or new paid infrastructure becomes a concrete
exception for user review rather than an automatic implementation choice.

## Code facts inspected for the interview

Read-only inspection distinguished the working base from incomplete local edits:

- The domain accepts 2–12 profiles and fixed action shapes; current compositions
  model resource economies, not arbitrary new state/action mechanics.
- General answers in the working base make one catalog-informed provider call;
  scoped investigation permits four calls, with the final one answer-only.
  The preliminary new research requests are not dispatched by that base workflow.
- The environment library stores complete designs. Saved experiments separately
  embed immutable definitions and resolved condition parameters.
- Each participant decision is one provider request. Calls atomically reserve
  estimated cost; unknown usage retains the reservation. A native multi-request
  loop cannot inherit one reservation for all its requests.
- Restore uses design, resolved parameters, seed and a full checkpoint; replay
  re-executes recorded decisions and compares checkpoint hashes without models.
- Participant profiles currently lack harness identity; memory uses bounded
  histories and a note rather than interchangeable retrieval. Preflight creates
  copied worlds, but that does not contain generated executable code.
- Small-sample code averages within seed and suppresses intervals below three
  seeds; it does not establish precision or a claim-specific validity verdict.
  Study estimates select completed runs without a complete failure-selection
  assessment. Realized exposure diagnostics cover only selected mechanisms.
- Analyst citation checks enforce inspected ranges and cutoffs, not whether
  prose follows from those citations. Scripted mechanism probes are not actual
  matched participant-policy baseline runs.

References: `backend/src/agent_sim/domain.py`, `environment_library.py`,
`assistants.py` at HEAD, `planning.py`, `llm.py`, `execution.py`, and
`simulation/world.py`. These are code-inspection findings, not fresh test results.
Follow-up read-only inspections additionally checked `metrics.py`, `validity.py`,
`simulation/composed.py` and existing metric/analysis tests. Those tests were
read, not rerun; their definitions are not a fresh verification result.

Local runner inventory found Docker and bubblewrap CLIs, but no isolation
runtime in the production image or existing extension runner in the app.
CLI availability does not establish containment or nested-runtime support.
No namespaces, mounts, security policy or host resources were changed or probed.

## Documentation and acceptance

Resolved vocabulary belongs in [the glossary](../GLOSSARY.md). Material accepted
architectural tradeoffs will use short numbered records in `docs/adr/` when
needed. The interview is complete only when no consequential branch remains
silently assumed and the user confirms the shared plan. No production code or
paid calls are authorized by the interview itself.
