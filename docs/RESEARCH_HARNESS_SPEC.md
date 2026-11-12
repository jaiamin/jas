# Evidence-led researcher and participant harnesses for JAS

Accepted product requirements. The Problem Statement records the original design
motivation; current implementation and verification are documented in
[Architecture](ARCHITECTURE.md) and the
[product review](research/FINAL_PRODUCT_REVIEW.md). Live evaluation gates remain
requirements until independently demonstrated.

## Problem Statement

JAS users want to ask meaningful questions about model-agent behavior, create
experiments that faithfully implement those questions, and inspect what agents
actually did. The original workflow was limited by fixed environments and action
shapes, experiment-shaped environment records, a narrow research workflow and
participants that make one structured decision per model request. Making the
researcher more articulate would leave substantial limitations in participant
capability, world representation and research validity.

The product needs to support both simple controlled studies and richer worlds
with tools, persistent artifacts, private information, consequential interaction
and explicit timing. Relevant settings include a single agent, three agents in
a room, four agents with opportunities for reliance or betrayal, an evolving
town and an organization with individually active agents. These are questions
about AI agents under declared harnesses, not validated predictions of humans.

Richer worlds and visualizations alone do not make findings trustworthy.
Small samples, correlated observations, completed-run selection, absent
treatment exposure and unsupported analyst claims can invalidate conclusions
even when execution and citations appear correct. Large-population engineering
would compound these weaknesses unless meaningful small-population behavior
and defensible findings are established first.

## Solution

Build an evidence-led investigation workflow with two equally developed
architectures: a Pydantic AI Researcher using GPT-6.1 Sol and interchangeable
participant harnesses using GPT-6 Luna. The Researcher can answer questions,
inspect evidence, design and validate experiments, propose bounded pilots
and analyze authorized runs. Independently authored environment extensions
require separate validation and admission. Participants can
choose planning, memory retrieval, investigation and verification through
permitted tools and declared effort limits.

Separate reusable environment mechanics, participant configurations,
experiment revisions, realized runs and read-only analysis lenses. Retain
small controlled worlds while adding a genuinely different artifact/tool
world; derive the shared interface from working implementations rather than
forcing every setting into counters or one universal action language.

World rules independently enforce permissions, visibility and consequences.
Research probes operate on isolated copies. Generated extensions require a
qualified, credential-free execution boundary and independent admission
checks. Agent statements and generated explanations never become authoritative
world facts merely because they are persuasive.

Deliver a small-population milestone spanning solo evidence seeking,
three-agent distributed information, four-agent reliance/commitments and a
6–12-agent institutional workflow. Establish separate evidence for participant
capability, world correctness, research competence and research validity.
Target 1–12 active participants in the
first version, with population size justified by the question. Consider later
expansion only for concrete studies and after validation of the relevant
operating limits. Preserve the current UI appearance while making behavior,
evidence, uncertainty and failures inspectable.

## User Stories

1. As a workspace user, I want to ask a general question about experiments without creating a protocol, so that the Researcher remains useful for discussion and explanation.
2. As an experiment author, I want the Researcher to preserve my original question, so that a convenient proxy cannot silently replace the behavior I intended to study.
3. As an experiment author, I want clarification when ambiguity materially changes an experiment, so that routine implementation choices do not cause unnecessary interruptions.
4. As an experiment author, I want to conduct exploratory studies without inventing a hypothesis or scalar endpoint, so that unexpected behavior can be investigated honestly.
5. As an experiment author, I want controlled comparisons with explicit interventions and alternative explanations, so that observed differences have an interpretable basis.
6. As an experiment author, I want confirmatory decisions frozen before validation trials, so that later adaptation is not disguised as an advance prediction.
7. As an experiment author, I want the Researcher to inspect available mechanics and their limits, so that plausible prose is not mistaken for implemented capability.
8. As an experiment author, I want unsupported mechanics identified with constructive alternatives, so that a failed capability assessment still helps me plan useful research.
9. As an experiment author, I want population size justified by the question, so that neither automatic minimization nor automatic expansion distorts the mechanism.
10. As an experiment author, I want population resolution distinguished from independent replication, so that more interacting agents are not presented as more independent evidence.
11. As an experiment author, I want horizons and stopping conditions justified by opportunities and response times, so that meaningful behavior is not cut off by arbitrary turn limits.
12. As a workspace user, I want durable research context and retrievable artifacts, so that the Researcher can continue work without repeatedly receiving every record.
13. As an experiment reviewer, I want to inspect proposed rules and assumptions before execution, so that important simplifications remain visible.
15. As a workspace user, I want saving a proposal or asking a question to remain distinct from authorizing paid participant execution, so that ordinary conversation cannot trigger an unexpected rollout.
16. As a workspace user, I want visible spending and work limits with recorded stop reasons, so that authorized model work remains bounded and understandable.
18. As an experiment author, I want reusable environments independent of one question and model lineup, so that the same mechanics can support different studies.
19. As an experiment author, I want environment configuration examples separate from experimental commitments, so that reuse does not accidentally import unrelated conditions or analysis choices.
20. As an experiment author, I want generated configurations to compose verified capabilities, so that common new scenarios can be created efficiently and reliably.
21. As an experiment author, I want to supply independently reviewed extensions when genuinely new mechanics are needed, so that the installed catalog does not become a permanent ceiling.
22. As an experiment reviewer, I want extension provenance and admission results, so that executable code is not trusted on the strength of its explanation or self-tests.
24. As an experiment author, I want saved revisions to pin complete versioned definitions, so that later environment edits cannot change previous or pending runs.
25. As an experiment author, I want objects, relationships, tools and artifacts where the question needs them, so that rich work is not reduced to agents narrating abstract counters.
26. As an experiment author, I want valid simple environments preserved, so that extra detail does not confound a question that needs only a small action space.
27. As an experiment author, I want timing and conflict rules declared per environment, so that sequential, simultaneous and delayed interaction have clear meanings.
28. As an experiment author, I want provider response speed separated from logical world time, so that API latency does not accidentally determine priority or outcomes.
29. As a workspace user, I want capable participant harnesses as well as a capable Researcher, so that participants can perform meaningful work rather than remain unchanged behind a better planner.
30. As an experiment author, I want participant harnesses interchangeable independently of models, so that model effects and harness effects can be studied separately.
31. As an experiment author, I want participants to maintain actionable plans when useful, so that consequential tasks can span more than one isolated response.
32. As an experiment author, I want participant memory retrieval grounded in authorized experiences and artifacts, so that memory can be studied without exposing unrelated private information.
33. As an experiment author, I want participants to investigate through actual environment tools, so that information seeking is observable behavior with real results.
34. As an experiment author, I want participants to verify actions and assertions against accessible evidence, so that verification is useful without becoming a hidden-truth oracle.
35. As an experiment author, I want participants to choose when to plan, retrieve, investigate and verify, so that every decision is not forced through an identical expensive pipeline.
36. As an experiment reviewer, I want each participant's model, harness, memory, tools, inference settings and effort limits recorded, so that the experimental subject is identifiable.
37. As an experiment author, I want a direct-action reference harness, so that a more elaborate participant policy can be compared against a simpler alternative.
38. As an experiment author, I want targeted memory, tool and deliberation ablations, so that capability changes can be distinguished from extra computation.
39. As an experiment author, I want task-capable defaults without prescribed cooperation, betrayal, hierarchy or humanlike needs, so that the study does not install the social result it claims to discover.
40. As an experiment author, I want motives, personas and social assumptions declared as factors, so that their influence can be examined rather than hidden in defaults.
41. As an experiment author, I want future model and provider combinations to fit declared participant configurations, so that changing the lineup does not require rewriting world mechanics.
42. As a workspace user, I want every auxiliary participant and researcher request accounted for, so that multi-step harnesses cannot bypass the spending ledger.
43. As an experiment author, I want a meaningful single-agent study, so that the engine does not invent a second participant merely to satisfy its current minimum.
44. As an experiment author, I want three agents with distributed information and consequential choices, so that sharing, withholding and coordination can be observed.
45. As an experiment author, I want four agents with voluntary reliance and feasible commitment opportunities, so that breaches and responses can be studied without assigning a compulsory betrayer.
46. As an experiment author, I want a small institutional workflow with persistent work and enforced permissions, so that handoffs, dependencies and procedures have real effects.
47. As an experiment author, I want communication graphs, channels and delivery rules chosen for the question, so that a hierarchy or sparse network is not imposed solely for convenience.
48. As an experiment author, I want authorized changes to procedures or relationships to affect later choices where supported, so that institutional adaptation can have consequences beyond dialogue.
49. As an experiment reviewer, I want messages, commitments, attempted actions, rejections and settled consequences distinguishable, so that statements cannot be confused with completed work.
50. As an experiment reviewer, I want actual observations and available alternatives preserved, so that behavior can be interpreted in the context of what an agent could know and do.
51. As a participant-policy developer, I want access checks enforced independently on observations, retrieval and tools, so that a prompt or role label is not the security boundary.
52. As a workspace user, I want private data protected in histories, metadata, summaries, tool errors and restored sessions, so that privacy does not depend on only one carefully filtered prompt.
53. As an experiment reviewer, I want researcher probes to leave the source run and its evidence unchanged, so that investigation cannot contaminate the experiment it inspects.
54. As a workspace user, I want generated extensions denied host secrets, provider credentials and unrestricted data access, so that new environment mechanics do not inherit application authority.
55. As an experiment author, I want any model adjudicator explicitly declared and versioned, so that judgment-dependent consequences are identifiable experimental assumptions.
56. As an experiment reviewer, I want fallible adjudications separated from executable facts and participant responses, so that a judge cannot invent behavior or override enforced state.
57. As a workspace user, I want pause, cancellation, reconnect and restart to preserve committed work and accounting, so that interruption cannot duplicate spending or corrupt a run.
58. As an experiment reviewer, I want complete checkpoints and exact replay of recorded decisions, so that consequences can be audited without spending on new model calls.
59. As an experiment reviewer, I want replay, trace playback, process restoration and new model sampling distinguished, so that different reproducibility guarantees are not conflated.
60. As an experiment reviewer, I want research validity assessed separately from execution success, so that a runnable experiment is not automatically treated as a trustworthy conclusion.
61. As an experiment reviewer, I want uncertainty appropriate to actual independent replication, so that correlated agents and decisions do not produce false precision.
62. As an experiment reviewer, I want small-sample limitations visible, so that an interval or minimum-seed rule is not presented as universal scientific certification.
63. As an experiment reviewer, I want every planned and attempted run retained with its outcome, so that failed and interrupted trials cannot disappear from the research record.
64. As an experiment reviewer, I want failure rates, exclusions and unmatched comparisons shown by condition, so that completed-run selection is visible before interpreting effects.
65. As an experiment reviewer, I want sensitivity or bounds where failures could change a conclusion, so that estimates do not hide an unknowable missing-data assumption.
66. As an experiment reviewer, I want assignment, implementation, opportunity, delivery and observation distinguished when applicable, so that absent treatment exposure cannot support an invented effect.
67. As an experiment reviewer, I want eligible and exposed denominators tied to the analysis cutoff, so that later events and ineligible opportunities cannot inflate a finding.
68. As an experiment reviewer, I want assignment-based and exposure-conditioned comparisons labeled distinctly, so that post-treatment filtering is not silently interpreted causally.
69. As an experiment author, I want actual simple reference policies run in matched conditions, so that scripted preflight probes are not mistaken for behavioral baselines.
70. As an experiment reviewer, I want checkable claims recomputed from underlying evidence, so that a well-formed citation cannot conceal an invented total or reversed comparison.
71. As an experiment reviewer, I want semantic claims evaluated for evidential support and uncertainty, so that a second fluent model is not mistaken for ground truth.
72. As an experiment reviewer, I want unsupported intent labels qualified, so that a false statement or broken promise is not automatically called deliberate deception or betrayal.
73. As a workspace user, I want useful null and inconclusive findings, so that the system does not keep redesigning a study until it produces an interesting story.
74. As an experiment reviewer, I want raw events, calculated measures and semantic annotations separately identifiable, so that an interpretation cannot rewrite the evidence it describes.
75. As an experiment reviewer, I want new read-only analysis lenses over sufficient recorded evidence, so that existing trajectories can answer additional questions without rerunning participants.
76. As an experiment reviewer, I want missing or truncated evidence reported, so that an analysis lens cannot reconstruct an unrecorded fact as certainty.
77. As a workspace user, I want the existing visual appearance retained, so that the architectural redesign does not discard a UI I already find useful.
78. As a workspace user, I want concise summaries with inspectable mechanics and provenance, so that important details remain available without overwhelming the default view.
79. As a workspace user, I want trace-linked interaction graphs and artifact histories where useful, so that collective behavior can be explored beyond a scalar score.
80. As a workspace user, I want spatial views only when supported by actual world mechanics, so that a map does not imply simulated physics or access rules that do not exist.
81. As a workspace user, I want drafts, record identity and reviewed proposals preserved across navigation and late responses, so that asynchronous research does not overwrite unfinished work.
82. As a workspace user, I want usable loading, error, empty, keyboard and mobile states, so that the new workflow remains reliable under ordinary interaction failures.
83. As an experiment reviewer, I want evidence and configuration available through the existing inspection and export workflow, so that a result can be audited outside its generated summary.
84. As an experiment reviewer, I want fresh development and held-out cases separated with source identity, so that repeated tuning is not disguised as generalization.
86. As an experiment reviewer, I want independently specified extension acceptance checks and all attempts preserved, so that generator-written tests alone cannot establish correctness.
87. As a workspace user, I want the small-population milestone visibly gated on live and deterministic evidence, so that mocks or load tests cannot stand in for behavioral validation.
88. As a workspace user, I want the first version focused on 1–12 active participants, so that interaction depth and defensible findings take priority over an unnecessarily large cast.
89. As an experiment author, I want population size justified by the question and measured operating limits, so that each declared model agent has meaningful individual agency without an arbitrary scale target.
90. As an experiment reviewer, I want operating limits and unresolved failures stated honestly, so that a narrow success is not marketed as universal intelligence, enterprise readiness or a 100-fold improvement.

## Implementation Decisions

1. **Five separate responsibilities.** Reusable environment packages define mechanics, supported tools, initialization, information access, timing and restoration. Participant configurations define the model and harness. Experiment revisions bind these to a question, population, conditions, capture and stopping/replication decisions. Runs retain realized execution. Analysis lenses are versioned read-only interpretations with evidence requirements. An environment library must not use a complete experiment design as its only reusable contract.

2. **Preserve existing useful seams.** Extend the existing World interface and existing investigation/design/run/evidence workflow. Derive necessary operations from existing controlled worlds and one materially different artifact/tool world. Do not add a parallel application engine or a broad hierarchy of hypothetical adapters. The concrete type signatures remain an implementation result of these working examples; this spec fixes their observable responsibilities.

3. **Keep Pydantic AI and the agreed models.** The app Researcher, planner and assistant use `openai:gpt-6.1-sol`. Current model-controlled simulation participants use `openai:gpt-6-luna`. Model identity, provider, harness and inference settings are separate declared factors. Preserve a replaceable provider/model interface for future mixed-model experiments without implementing unrelated providers now.

4. **Researcher workflow.** Support general explanation, exploratory design, controlled mechanism studies, confirmatory comparisons and evidence analysis without forcing every message into protocol creation. Expose capability discovery, relevant evidence retrieval, draft editing, isolated probes, extension preparation and validation results as real operations. Retain durable research artifacts and retrieve relevant context instead of repeatedly dumping all run records into a prompt. Unsupported needs must remain explicit.

5. **Equal participant architecture.** Introduce an interchangeable participant-harness contract receiving an authorized observation, actor-scoped tools, retained context and effort limits. It requests information, proposes an action or stops. Provide at least two working implementations: a simple direct-action reference and a capable tool-using policy. Planning, retrieval, investigation and verification policies must be replaceable rather than encoded solely as a larger persona prompt.

6. **Participant discretion and experimental identity.** The capable harness lets participants choose which capabilities to invoke within its declared allowance. Mandatory pipelines are named alternative conditions. Record harness/version, memory policy, tool configuration, inference settings, actual operations, failures and stop reasons. A harness change is not reported as a model-only improvement. Qualification tests useful competence, not compulsory cooperation or any desired social result.

7. **Authorized memory and verification.** Retrieval is source-linked and cutoff-aware over the actor's permitted experiences, notes and artifacts. Actor-authored plans or notes are explicit artifacts with declared visibility, not exposed provider reasoning. Investigation uses the actor's world tools and never inherits researcher database access. Verification uses accessible evidence and has no privileged truth oracle. Restore retained actor state consistently with world checkpoints.

8. **World authority.** The World module independently validates every tool/action request, enforces permissions and visibility, and settles consequences. Profiles and role names do not grant authority by themselves. Observations, legal schemas, errors, metadata, summaries and restored memories must respect the same information policy. Attempts, rejections and successful effects remain distinguishable. Researcher or participant prose cannot assert a transition into existence.

9. **Research probes and extension isolation.** A probe runs against an isolated copy and cannot mutate the source checkpoint, append source evidence or contact live participants. Copied state is separate from executable-code containment. Before generated extensions execute, qualify a fail-closed, credential-free runtime in both permitted development and production environments. Generated artifacts have no direct access to host secrets, provider credentials, user databases or unrestricted application interfaces. Do not weaken host security, change host mounts or expand credential forwarding to make qualification pass.

10. **Extension admission.** Prefer configuring and composing verified mechanics when sufficient; accept only an explicitly supplied extension when semantics are genuinely absent. Independently check action contracts, authorization, observation projection, consequences, resource bounds, termination and restoration/replay before admission. Generated self-tests supplement independent checks. Failed admission remains a visible capability gap; artifact execution stays disabled if containment cannot be qualified. The runner technology is selected by that proof, not prescribed speculatively here. Recorded/model prose remains inert; only an explicit executable extension artifact can enter this separate admitted path.

11. **Multiple rich representations.** Controlled games, finite transitions, structured artifacts, task/workflow dependencies, resources and institutional rules can be different environment implementations. Do not force all objects into numerical variables or one fixed action vocabulary. Environment complexity follows the requested mechanism; physical geometry, private information, departments and humanlike needs are not mandatory setting templates.

12. **Composition correctness.** Coupled modules share explicit identity, logical time, authorization, ownership and consistent checkpoints. Demonstrate real cross-module effects, including a resource constraint coupled to workflow/artifact changes. Validate atomic rejection/settlement, conflicts and restoration of the coupled world. Individually typed modules do not establish correctness of their composition.

13. **Timing and collaboration semantics.** Each environment declares eligibility, observation cutoffs, logical time, delivery and contention rules. Initial qualification covers sequential and phased-simultaneous cases plus explicit delayed messages/work. Concurrent provider completion is not implicit world priority. Communications are addressed deliveries through declared channels and permissions. Directories, role ordering, recipient ordering, local exposure and shared artifacts remain visible assumptions or controlled factors where relevant. A fully distributed asynchronous deployment is not required for this milestone.

14. **One authoritative writer and complete lifecycle.** Preserve one engine per database and one writer per run. Independent runs may proceed concurrently. Checkpoints include authoritative state, relevant actor sessions and pending activities/deliveries at explicit committed boundaries. Tasks survive browser disconnects; pause commits in-flight work according to the existing contract; restart pauses without new paid work. No silent retries, substitute policies or model replacement are allowed.

15. **Reproducibility guarantees.** Preserve seeded determinism and exact recorded-action replay without model calls. Distinguish trace playback, consequence replay, process restoration and a new future sample. Retain declared adjudications or external results as replay inputs with provenance, without claiming counterfactual consistency from playback. An adapter that only resets or records a video is not admitted under the existing complete-checkpoint/replay contract.

16. **Declared fallible adjudication.** A versioned world mechanism may consume a model judgment for an explicitly judgment-dependent outcome. Record its inputs, configuration and ruling. It cannot contradict executable facts, invent a participant's response or establish private belief/intent. Generated explanations remain interpretations, even when a declared ruling affects later enforced state. Evaluate judge quality separately from world mechanics.


18. **Per-request accounting.** Every researcher, participant, planner, verifier and adjudicator request reserves budget atomically before sending and settles its own actual or unknown usage. A multi-request loop cannot reuse one reservation. Preserve unknown charges, cancellation semantics and primary errors through settlement failures. Apply explicit participant effort limits in addition to existing workspace/study ceilings. Record real model/tool work and why it stopped.

19. **Research validity is independent.** Treat world correctness, researcher competence, participant capability, claim-specific research validity and runtime feasibility as separate tracks. Do not collapse them into a universal intelligence or validity score. A schema-valid design, completed run, citation or attractive graph does not establish a supported conclusion.

20. **Small-sample inference and selection.** Declare replication, matching and inference units appropriate to the claim. Do not count correlated agents, decisions or repeated shared histories as independent evidence. Report planned and observed samples with appropriate uncertainty, and disclose insufficient support rather than applying a universal minimum-seed certification. Preserve all attempts and condition-specific complete/failed/interrupted/unmatched counts and exclusion reasons. Completed-only estimates must disclose selection assumptions and use sensitivity or bounds where appropriate; repaired attempts do not erase failures.

21. **Treatment and opportunity accounting.** Record assignment, applied configuration, eligibility/opportunity, delivery and inclusion in observations where those stages apply. Calculate denominators at the analysis cutoff. Distinguish assignment effects from exposure-conditioned descriptions; filtering on a post-treatment event does not automatically identify a causal effect. Included or delivered information is not evidence of attention, belief or intent. An absent opportunity must constrain the finding rather than inspire a causal story.

22. **Baselines and claim support.** Run actual declared scripted/reference policies and simple model harnesses in matched conditions where relevant; preflight scripts alone do not satisfy this requirement. Compare harnesses under recorded effort envelopes and targeted ablations. Recompute checkable claims independently from underlying evidence. Assess semantic support on fresh independently evaluated examples, retaining disagreement and uncertainty. A valid citation or another model's agreement is not an entailment guarantee. Falsehood, commitment breach and intentional deception remain distinct claims.

23. **Evidence and read-only analysis.** Preserve observations, available alternatives, requested operations, delivered messages, artifacts/versions, adjudication provenance, accepted/rejected consequences, usage, failures and stop reasons. Keep raw events, exact calculations, annotations and generated findings distinguishable. Analysis lenses declare required evidence and missingness/coverage rules; they cannot recover unrecorded facts. Analysis is read-only and cutoff-scoped, and recorded prose is treated as untrusted data rather than tool instructions.

24. **Small-population acceptance gate.** Deliver four families with fresh variants and appropriate repetitions: one-agent evidence seeking; three-agent distributed-information coordination with a shared-information control; four-agent voluntary reliance and feasible commitments; and a 6–12-agent institutional workflow with persistent work, permissions and dependencies. Include valid simple, null and inconclusive cases. Establish actual information flow and consequential interaction rather than success by narration. No required cooperative, deceptive or dramatic outcome is part of acceptance.


26. **Preserve the UI and public workflow.** Retain the existing appearance and remote-state patterns. Make reusable world choices, participant configurations and experiment decisions distinguishable in review. Results lead with a concise evidence-linked behavioral account and inspectable uncertainty, failures and claim status. Add graphs, artifact history or maps only when supported by recorded mechanics/evidence. Preserve drafts, record identity, late-response isolation, one pending chat turn, reconnect without resubmission and accessible loading/error/empty/mobile/keyboard states.

27. **Versioning and data discipline.** Experiment revisions remain immutable and evidence append-only. Version persisted rules, schemas, packages and exports, and explicitly reject incompatible data. Do not introduce legacy aliases, migration frameworks or compatibility adapters. Do not silently delete/reset user data or reinterpret historical results; identify concrete incompatibilities and reset implications before any destructive action. Update domain validation, callers, fixtures, exports and review surfaces together.

28. **Implementation order and practical population.** First qualify isolation and accounting, then implement both harnesses with the small executable worlds, separate validity checks and necessary UI, and finally run the frozen acceptance milestone. Support 1–12 active participants initially; choose the smallest population sufficient for the requested mechanism while preserving necessary roles and heterogeneity. There is no fixed large-population deliverable. Later increases require a concrete research need and measured observation, memory, request and storage limits, with actual active participants distinguished from background entities. Do not add speculative large-scale infrastructure or silently substitute scripted agents for model participants.

## Testing Decisions

1. **Primary acceptance seam: the existing public workflow API.** Exercise question, reviewed design, immutable revision, authorized run, evidence inspection, analysis and export through the real application workflow. Extend existing operations rather than adding a testing-only research API. Assert externally visible results, state, usage and failures; avoid tests of private call order, prompt wording, class layout or duplicated implementation logic.

2. **Prefer existing lower seams only where justified.** Use the existing World interface for independent mechanics/privacy/replay oracles and the existing provider/accounting interface for reservation, cancellation and unknown-usage races. The participant-harness contract belongs at the existing execution-to-policy seam and must admit both real implementations. These focused tests supplement the public API acceptance story; they do not require a collection of new test-only abstractions.

3. **Prior art: lifecycle and evidence API tests.** Existing tests already create a design, step a run, inspect observations/events/state hashes, annotate/export evidence and replay. Reuse their temporary database and fake-provider conventions for deterministic correctness, immutable revisions and provenance. Existing chat/proposal tests cover persistence, scoped context and proposals that do not save or execute themselves.

4. **Prior art: world and execution tests.** Existing tests exercise installed worlds, random legal trajectories, exact replay, corrupted evidence, resource conservation, atomic rejection, permission-versus-role distinctions, sealed choices and private-memory delivery. Extend those independent invariants to richer tools, coupled modules, artifacts, logical-time conflicts and actor-session restoration rather than asserting one reference transcript.

5. **Isolation qualification.** Before any generated mechanics execute, test the proposed runtime against explicit access and resource boundaries in the production deployment as well as development. Show that denied host/data/credential access and exhausted limits fail closed without altering host security settings. Separately fork a world, probe it and verify that source checkpoint hashes, evidence and live participant deliveries remain unchanged. Observation copying alone cannot pass executable containment.

6. **Participant capability and substitution.** Run the same eligible task through the direct-action reference and capable harness via the same execution interface. Use neutral tasks requiring inspectable evidence retrieval, tool investigation, planning persistence and accessible verification. Verify actual capabilities, privacy and accounting, while permitting the participant to choose its operations. Test ablations and effort limits; do not qualify a harness merely because it cooperates or produces a longer explanation.

7. **Provider and cancellation regression coverage.** Extend existing atomic-reservation, shared-budget contention, no-retry, unknown-usage, primary-error preservation, one-writer and pause/restart tests to every auxiliary harness request. Inject failures before sending, while waiting and during settlement. Assert actual request counts, retained ledger charges and committed evidence rather than successful return values alone. Keyless correctness tests must never consume assigned credentials.

8. **Timing and privacy independence.** Vary provider completion order independently of logical scheduling and compare against declared sequential/simultaneous consequences. Check competing claims, stable observation cutoffs, delayed mail, artifact access and restored state. Attempt leakage through action schemas, tool descriptions, metadata, errors, summaries and memory retrieval as well as ordinary observations.

9. **Failure-aware small-sample evidence.** Extend current seed/matching tests with planned trials containing failed and interrupted arms, unmatched pairs and missing repetitions. Preserve every planned/attempted cell, expose exclusions and effective replication, and verify the appropriate limited or inconclusive status. Additional correlated decisions or repetitions must not create fictitious independent support. Do not treat the existing three-seed bootstrap threshold as the new validity oracle.

10. **Treatment and baseline checks.** Use independently specified small cases to verify exact intervention application, opportunity, recipient delivery and observation within cutoffs. Include absent exposure and infeasible commitments. Compare actual scripted/simple participant policies in matched runs; distinguish those baselines from preflight witnesses. A causal claim must not pass simply because the intended treatment appears in configuration.

11. **Unsupported claim regressions.** Give the analyst fresh evidence with small samples, missing arms or absent exposure, then evaluate responses containing valid inspected citations but invented totals, reversed conditions or unsupported causal/intent claims. Numeric contradictions should be independently detectable. Evaluate qualitative support against independently specified examples and retain uncertainty/disagreement; do not claim universal semantic verification from a handful of fixtures.

12. **Four-family behavioral milestone.** Freeze varied solo, three-agent, four-agent and institutional-workflow cases with known permissions/consequences and feasible alternative behavior. Use deterministic providers for mechanics/orchestration and separately authorized repeated live trials for actual research/participant competence. A mock, visual demo, interesting conversation or all-complete status cannot substitute for the live behavioral evidence.


14. **Browser prior art and regressions.** Reuse existing keyless browser flows for streaming/reconnect, malformed-stream recovery, navigation/new-draft protection, delayed validation/save and per-run observation drafts. Verify the necessary world/participant/review/evidence changes in light/dark and narrow/desktop layouts, including keyboard access, loading/errors/empty states and stale responses. Keep appearance changes limited to the accepted workflows.

15. **Analysis/export immutability.** Verify that changing an analysis lens, annotations or reusable library records cannot mutate pinned experiment definitions, source observations, usage or recorded consequences. Replay must use recorded actions/results without new model calls. Export should retain enough version and attempt provenance to audit conclusions while excluding private provider reasoning and unrelated records.

16. **Source and budget discipline.** Freeze case families, assessment rules, sampling rationale and source identities before validation; retain failures and selection costs. Use new development and held-out work rather than modifying or tuning published historical suites. Keep live Sol benchmarks within the explicitly approved $10 total and obtain an explicit allowance for Luna participant trials. Until live trials run, mark that part of acceptance unverified.

17. **Appropriate project checks.** Run affected backend lint/type/tests, frontend lint/type/unit/build and browser checks as implementation warrants. Runtime/container changes require the production smoke check; workflow changes require their established validators. Use isolated temporary data and distinct services/ports. Never weaken checks, remove adverse cases or report unobserved success to clear a gate.

18. **Separate gate outcomes.** Report world/isolation correctness, participant capability, research competence, claim validity and runtime feasibility independently. The small-population gate opens only with the required deterministic and live evidence plus the held-out extension result. Do not use a combined score to hide a failed prerequisite, or a load benchmark to claim intelligence or behavioral validity.

## Out of Scope

- Predicting human behavior, demographic fidelity or validated synthetic human populations.
- Universal environment generation, a context-free personality measure, an automated certification of arbitrary scientific conclusions, or an unmeasured 100-fold improvement claim.
- Dedicated large-population optimization, a large-scale demonstration or a fixed population expansion target. The initial supported range is 1–12 active participants; later increases need a concrete research purpose and measured validation.
- A fully distributed asynchronous worker platform, enterprise multitenancy, public-host authentication or production-readiness claims beyond the existing single-user local workspace.
- An unrelated UI redesign, invented spatial detail, or exposure of private provider reasoning.
- A universal bounded-counter language that every future world must use, and a permanent multi-researcher team installed without evidence that it solves an observed problem.
- New provider implementations, training/fine-tuning, reinforcement-learning infrastructure or external paid services unrelated to the accepted milestone.
- Arbitrary execution of recorded/model prose, in-process execution of unqualified extensions, weakened replay/privacy/accounting guarantees, host-security changes or expanded credential access.
- Data resets, deletion of user evidence, migration/compatibility frameworks, changes to historical benchmark scores, silent retries or automatic policy/model substitution.

## Further Notes

The user accepted all seven interview recommendations, the four refinements
about participant architecture, separate validity, trust boundaries and
small-population-first sequencing, and then confirmed the consolidated plan.
The user subsequently clarified that population size should be reasonable
rather than a large fixed target. The initial range is therefore 1–12 active
participants. This spec incorporates that correction without reopening the
interview or weakening the behavioral and validity milestones.

Respect the accepted decisions titled “Isolate researcher probes and preserve
world authority” and “Treat participant harnesses as replaceable experimental
factors.” The spec uses the existing glossary's distinction between the app
Researcher and the model-controlled participants whose behavior is studied.

The evidence review examined full methods, limitations and selected public
implementations. Olam's persistent sessions, tools, artifacts and separation
of world mechanics from behavioral evaluation are useful precedents, including
its explicit scheduling/fork limitations. The naming-game literature shows that
simple controlled environments can support sophisticated behavior research.
AppWorld, Concordia, Melting Pot, AgentSociety 2 and behavioral evaluation work
inform the design without establishing an optimal JAS architecture. Aaru,
Simile and Artificial Societies study distinct validation targets; their
human-response results do not establish autonomous agent-interaction validity.
No cited external experiment was independently reproduced during this work.

The initial implementation checkpoint is real qualification of extension
isolation and accounting. Docker/bubblewrap CLI availability in development
does not demonstrate containment or a usable production runner. Failure must
remain visible rather than being bypassed with host changes or weaker rules.

The $10 fresh Sol benchmark allowance remains unused at spec publication.
It is not an authorization for arbitrary participant rollouts. Prepare the
small Luna trial manifest and cost estimate after deterministic qualification,
and execute it only with an explicit participant-run allowance. A small pilot
can expose errors; it cannot establish broad intelligence or enterprise readiness.

Earlier preliminary research-tool code is incomplete and unverified. It is
not evidence that this architecture, the isolation boundary or any behavioral
milestone already works. Implementation must report observed checks, retained
failures and remaining limitations against the gates above.
