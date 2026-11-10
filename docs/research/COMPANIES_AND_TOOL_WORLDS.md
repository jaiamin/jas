# Company evidence and rich tool environments

Research date: 2026-11-10. Research only; implementation remains paused.
This is a purposive engineering review of methods and selected implementations,
not a systematic review or an independent reproduction. Company-reported
evaluations, demonstrations, and our engineering inferences are distinguished.

## Olam Labs: the relevant product is an instrumented world, not a personality score

Sources examined directly:

- [Multi-Agent Arena methodology](https://olamlabs.ai/research/multi-agent-arena),
  especially §§2–7: continuous sessions, scoring, agent interface, world design,
  infrastructure and explicit limitations.
- [Diplomacy evaluation](https://olamlabs.ai/research/diplomacy), especially §§3–4:
  seat-balanced performance and separately defined behavioral evaluations.
- [YC Labs/Olam game experiments](https://labs.ycombinator.com/projects/games/),
  including archived work products, the Minecraft setup and Mindustry setup.
- Minecraft harness source at commit
  [`775d558689f5e4eaa0f1d0d7a320035190b1fce6`](https://github.com/yc-software/minecraft-agent-harness/tree/775d558689f5e4eaa0f1d0d7a320035190b1fce6):
  [`docs/multi-agent.md`](https://github.com/yc-software/minecraft-agent-harness/blob/775d558689f5e4eaa0f1d0d7a320035190b1fce6/docs/multi-agent.md),
  [`docs/tools.md`](https://github.com/yc-software/minecraft-agent-harness/blob/775d558689f5e4eaa0f1d0d7a320035190b1fce6/docs/tools.md),
  and [`src/agent.js`](https://github.com/yc-software/minecraft-agent-harness/blob/775d558689f5e4eaa0f1d0d7a320035190b1fce6/src/agent.js).

### What is actually represented

Olam describes a shared world state and accepted actions, messages and resulting
states recorded append-only. Each participant has a continuing model/harness
session, private information and tool access. A session can inspect rules,
state and mail, then perform multiple operations before submitting a phase.
Free read tools, phase submission and tool-use choices are richer than one
fixed action plus a message on every global round.

The published arena example mixes simultaneous sealed talking with ordered move
phases and next-briefing delivery. The Minecraft harness uses queued events and
interruptions. These support explicit environment-specific timing, not a claim
that all of Olam's environments are asynchronous. Its methodology also mentions
internal multi-thousand-agent environments and harness/memory self-editing;
the accessible public material does not establish their active-agent workloads,
reliability or comparative behavioral validity.

The Minecraft implementation has perception, movement, inventory, crafting,
survival, storage and communication tools. A body-action runner serializes
incompatible physical actions while messaging can remain independent. The agent
runner receives queued events and interruption signals. Team mode adds a
directory, private asynchronous messages and a shared persistent workspace with
authored command logs. Planning documents and ration ledgers are artifacts the
agents write, not predeclared variables such as `leadership=1`.

The code explicitly distinguishes a local shared directory whose commands run
on the host without isolation from an externally isolated machine. This is an
important execution choice; copying a demonstration's shell tools into JAS
would require a separate isolation and permission design. No such code was
executed during this review.

### What the experiments can establish

The arena separates competitive performance from behavioral interpretation.
Diplomacy balances models across seats and compares communication with actual
orders. Promises, their feasibility and subsequent actions can be examined
without treating winning as a complete behavioral description. The methodology
anonymizes identities, uses multiple graders and examines grading variance.
These are valuable methodological choices, not a guarantee of unbiased grading.

Olam's default arena instructions provide rules and incentives without assigning
personality or strategy. Instructional interventions are separately identified.
That distinction matters for a betrayal study: assigning an agent a requirement
to betray measures compliance with that instruction, while providing an
opportunity leaves room to study whether and when the behavior occurs.

The game demonstrations expose important possible confounds. In the Minecraft
write-up, the first directory entry became a leader. Directory order could
therefore influence hierarchy formation. The Mindustry series compares different
models **and native harnesses together**. It is informative about the complete
systems in that setup; it does not isolate a pure model effect. Long-lived
context and native compaction likewise belong in the experimental configuration.

### Limits that change the JAS recommendation

Olam describes incomplete byte-faithful forkability when agents are in flight;
some environments reconstruct from the most recent completed step. Its
behavioral grader sometimes uses private reasoning, and the company explicitly
acknowledges problems distinguishing deliberate falsehood from hallucination
when such reasoning is unavailable. Subjective profile cards are not held to the
same standard as benchmarks.

JAS should use observable knowledge exposure, statements, commitments and
consequences. A false statement can be established; deliberate deception needs
additional evidence and remains a qualified interpretation. An asynchronous
world should state exactly what can be restored and replayed. Neither a
leaderboard nor a visually compelling civilization demonstrates universal
behavioral generalization.

**Engineering inference:** retain complete behavior records, expose tools and
persistent artifacts, separate participant sessions from world settlement, and
make scheduling and harness assumptions explicit. Do not copy Olam's private
reasoning grading, assume all timing is exactly reproducible, or reduce the
environment to the scoring rubric.

## Aaru, Simile, Artificial Societies and Altera have different evidentiary roles

[Aaru's evaluation](https://www.aaru.com/publications/population-simulation-at-the-replication-floor-research)
was read directly, including its evaluation conditions. Its central trajectory
model and population generator are explicitly **not language models**. The
reported evaluation measures individual-question answer distributions and
leaves higher-order and row-level coherence to future work. Its date-restricted
retrieval is useful contamination control. It does not validate autonomous
LLM-to-LLM organizational behavior or interactions merely because the product
uses the word simulation.

[Simile's confidence study](https://www.simile.ai/blog/confidence) predicts the
error of a trained human-behavior simulator using held-out questions and
experimental-sample-level splits. Generalization and case-specific uncertainty
are distinct. Some stronger confidence methods require model hidden activations,
which JAS's ordinary provider APIs do not expose. This is evidence for careful
validation and calibrated uncertainty, not a transferable confidence feature
or evidence that JAS predicts people.

[Artificial Societies](https://societies.ai/publications), now Societies, has
current accessible papers and public scoring code that the initial survey
missed. The [benchmark paper](https://arxiv.org/html/2609.30030v2) evaluates
twenty human sources, nine models and eleven distinct validity tests, preserving
coverage failures and native units. Its synthetic respondents **do not interact**.
The separate October proprietary-system comparison uses seven public sources;
it is not the full twenty-source study. The
[company-validation review](COMPANY_VALIDATION.md) examines those methods,
pinned scoring code, the conceptual fairness paper, intervention studies and
Rothko's specialized trained decision model. This evidence is useful for
claim-specific validation and calibrated limits, not proof of autonomous
multi-agent mechanism validity. The initial failed URLs were a retrieval gap,
not evidence that the company lacked substantive research.

[Altera/Project Sid](https://arxiv.org/html/2411.00114v1) is relevant for persistent
participants, concurrent information streams and specialization in Minecraft.
The environment representation review examines its full methods and limits.
The reported large population and emergent-looking artifacts are engineering
evidence; they do not establish arbitrary organizational validity or dependable
thousand-agent execution. JAS must verify the specific active population,
interaction semantics and runtime behavior it promises.

## Petri and Bloom: behavior discovery and generated evaluations

Full technical reports examined:
[Petri](https://alignment.anthropic.com/2025/petri/) and
[Bloom](https://alignment.anthropic.com/2025/bloom-auto-evals/).
Their introductory company posts are not the sole basis for these conclusions.

Petri takes a scenario seed, lets an auditor interact with a target through
multi-turn users and simulated tools, and produces multidimensional scores and
cited transcripts for researcher inspection. Its report separates evidence
extraction from interpretation and describes how this reduced hallucinated
transcript details. Conversation rollback enables adaptive search; those branches
are part of the search and cannot be counted as independent natural trajectories.

The report explicitly says absolute aggregate scores are rarely useful outside
their seed collection and recommends calibrating judges on representative
examples. Its limitations include unrealistic simulations, limited auditor
domain knowledge and reliance on humans for good hypotheses. A model can emulate
a software response incorrectly. The authors present Petri as exploration and
triage rather than a substitute for careful benchmark design or transcript review.

Bloom instead starts from a behavior and generates a distribution of scenarios.
Understanding, ideation, rollout and judgment remain distinct stages. Its full
report tests deliberately modified model organisms, judge agreement with a
small human-labeled transcript set, judge repeatability and sensitivity to
configuration. These are useful validation efforts, but they do not calibrate
all future behaviors. Its limitations explicitly distinguish simulated tool
responses from actual file or API consequences. Elicitation under selected
scenarios is not a deployment prevalence estimate.

Current maintenance was also checked: the old Bloom repository is frozen and
redirects to [Petri Bloom](https://meridianlabs-ai.github.io/petri_bloom/);
Petri's current documentation is at
[Inspect Petri](https://meridianlabs-ai.github.io/inspect_petri/). These are
research references, not proposed new dependencies for JAS.

**Engineering inference:** support open-ended exploration and targeted behavioral
tests, keep scenario-generation configuration and all branches, let researchers
inspect grounded evidence, and validate measurement lenses separately. Use
enforced domain tools when actual consequences matter. Narrative tool emulation
may be a declared exploratory mode; it must not silently replace an executable
world or supply causal ground truth.

## TheAgentCompany and AppWorld: richer environments with actual state

[TheAgentCompany, arXiv:2412.14161v3](https://arxiv.org/html/2412.14161v3), §§2–5,
limitations and appendices E–F, was examined alongside source at
[`98b68ef82a47690c316f42fddb05baafaab56851`](https://github.com/TheAgentCompany/TheAgentCompany/tree/98b68ef82a47690c316f42fddb05baafaab56851).
The environment includes persistent files, GitLab repositories, OwnCloud
documents, Plane tasks and RocketChat colleagues. A worker can browse, write
code, create artifacts and communicate. Task definitions, world initialization
and evaluators are separate. This is a concrete counterexample to representing
a company only as agents transferring counters.

Its benchmark primarily tests a worker completing assigned tasks with simulated
colleagues. It is **not** evidence of an autonomously functioning thousand-agent
company. Its limitations exclude much creative work and acknowledge limited
scaffold coverage and author-curated task content. Deterministic evaluation
also needs semantic scrutiny: one inspected meeting-room checkpoint checks for
a particular digit in chat. Passing such a check does not establish useful
communication. Executable tests can be shallow or incorrect too.

[AppWorld, arXiv:2407.18901v1](https://arxiv.org/html/2407.18901v1), §§2–3 and §7,
explicitly separates a reusable engine from its task benchmark. Its applications
have typed APIs, relational state, cross-application consequences, access checks,
pagination and controllable simulated time. API documentation partly derives
from implementation schemas. Tasks may have multiple valid solution paths.
Evaluation inspects expected and permitted state changes, including unintended
collateral changes, rather than forcing one reference action sequence.

This is strong evidence that an environment interface can remain compact while
domain implementations are deep. It also shows the engineering work required
for rich semantics: the paper describes extensive manual implementation and
testing, rather than an LLM generating a reliable arbitrary world in one call.
The published benchmark is single-assistant; its authors describe multi-agent
tasks as an extension, so its results cannot be reused as evidence of emergent
multi-agent dynamics.

**Engineering inference:** a reusable world interface should accommodate
structured tools, artifacts, spatial/resource simulations and external sandboxes.
A small declarative interpreter can be one implementation. It should not become
the universal ontology or require every future adapter to encode its semantics
as a handful of numerical variables.

## Boundaries of this review

Methods, limitations, documentation and selected source files were inspected;
none of these external experiments was reproduced. No paid model calls or
production changes were made. A linked PDF encountered during Petri retrieval
was identified as the Claude 4 system card rather than the Petri report and
excluded from the Petri evidence; the correct full HTML report was then examined.
These findings narrow the architecture choices. They do not establish one
universally optimal design or a measured improvement in JAS.
