# Architecture

A single FastAPI process serves a built React app and a same-origin JSON API. Server-owned
async tasks execute separate runs with bounded concurrency; decisions within one run
remain ordered. Only explicit user actions create paid work. Restart pauses interrupted work.

## Storage

SQLAlchemy 2 typed mappings; SQLite WAL, foreign keys and busy timeout. Startup creates
schema v9 for fresh workspaces and rejects incompatible schemas. Local transactions
commit each turn's input, decision, consequences, metrics and checkpoint together.

| Record | Purpose / invariant |
| --- | --- |
| Study | Stable research question and identity. |
| Revision | Immutable validated design and content hash; runs reference an exact revision. |
| Condition | A treatment with resolved settings and model. Unique within revision. |
| Run | Condition × seed × repetition, status and latest checkpoint; unique matrix cell. |
| Agent | Run-scoped participant/profile/model. No cross-run private memory. |
| Turn | Append-only observed input, typed output, state hash and complete checkpoint. |
| Event | Typed consequence with actor, recipient, visibility and structured payload. |
| Measurement | Versioned metric value, denominator and turn/round. Null rates stay null. |
| Analysis | Design proposal, general conversation or scoped analysis; explicit question, answer and status. Scoped analysis freezes evidence cutoffs. |
| Annotation | Researcher interpretation attached to a specific run/turn. |
| Provider call | Reservation before sending; actual or unknown usage after. Atomic workspace/study ceilings. |

Use relational keys/indexes for identity, joins, selection and time series. Use JSON for
versioned immutable specifications and environment-specific payloads. Do not turn all domain
objects into an unqueryable single blob or duplicate transient UI state in the database.
Claims, commitments and exchanges are typed events with explicit payloads, not separate
mutable truth sources. Relationship views and behavioral summaries are derived from them.

## Experiment deletion

`DELETE /api/studies/{id}` removes an entire experiment, all immutable revisions, its
matched runs, annotations, measurements, events, turns and participants in one transaction.
It removes only chat messages scoped to that experiment, preserving unrelated conversation
turns and unscoped design proposals. There is no individual-run deletion or mutation endpoint.
The route stays synchronous on the owning engine/assistant event loop; it checks live task
ownership, run status, pending chat turns and unsettled calls before deletion. Acquire the
study write lock before reading dependents. Block deletion until runs stop and related chats
and requests settle; roll back every change on rejection. Provider-call usage/status/cost
records survive with deleted foreign keys detached and request/response payloads cleared;
workspace charges and ceilings never reset. This requires no schema change. UI deletion
requires explicit confirmation; local browser drafts remain recoverable.

## Experiment design

The planner scopes the question and justifies agents, conditions, seeds, repetitions and
rounds; optionally retrieves public methodological research; drafts a typed protocol; validates
its invariants; and obtains a separate critique. At most three protocol revisions resolve
validation/review feedback. Provider failures stop visibly without retries or substitution.
Declared factorials require complete computed condition-grid coverage; the originating brief
is checked again at save and execution. Coupled fields count as one bundle; partial designs
remain allowed without a full-factorial claim.
Proposal stages, research sources, reviews and provider traces remain Analysis data.
Revisions record the originating proposal; exports retain that proposal and its requests.

Browser drafts preserve unfinished visual edits and raw JSON per source document;
assistant visibility and other presentation parameters do not change draft identity. Invalid drafts
can be recovered in the specification editor. Only backend-validated designs become immutable
revisions and run matrices; saving does not start execution.

## Agent workspace

`/agent` is a single conversation surface with a conversation toolbar and a contextual
composer. Experiment/run Ask Agent links select their record on that page. The protocol
editor offers Generate with Agent while keeping unfinished manual drafts.
Proposals stay in chat until Review protocol opens the editor; Back to Agent returns to
their conversation. No proposal automatically saves or runs.

`POST /api/chats` accepts a question, context (`general`, `new`, `study:<id>`, or `run:<id>`),
and optional existing `chat_id`. The first accepted message creates the conversation.
`GET /api/chats` lists summaries; `GET /api/chats/{id}` restores ordered Analysis turns.
`GET /api/chats/{id}/events` streams the latest turn as server-sent snapshots, with a
heartbeat during quiet stages and completion closing the stream. Only the active turn is
sent, avoiding repeated transmission of the conversation. Disconnecting never cancels or
resubmits provider work; polling and reload restore the same persisted record.

Provider streaming uses the existing budget reservation, single-request limit, timeout and
trace accounting. Partial prose is stored under `Analysis.output.partial`; it is pending
content, not a validated finding or protocol. Final schema, citation and design checks still
gate completion; failures remove partial prose. No private model reasoning is exposed.
Design candidates do not stream their technical explanations into answer prose.
The existing post-preflight DesignReview call produces a bounded user-facing `summary`
alongside its issues. Only an approved review publishes it; candidate `explanation`
remains public pre-check rationale under activity. Structured mappings and computed
check results remain the authoritative evidence. This adds no provider request.
Public stage names persist in `output.activity`, including checks and payoff calculations;
slow read-only tools publish their stage before executing off the event loop. Live tool
results and saved records use the same scope/source/preflight/inspected-range evidence.
A general-to-design handoff persists the public acknowledgement in `output.introduction`,
retains it through every planner stage and terminal status, and transports it in live events;
it stays separate from the reviewed proposal summary and never represents private reasoning.
Conversation identity is an indexed Analysis field, with no duplicate message store.
One pending turn per chat prevents overlapping follow-ups; independent chats can run
concurrently. Failed turns stay inspectable and retry as a new turn in their original context.

The existing planner, investigator, provider tracing and budget accounting execute the
messages. General answers receive the environment catalog and recent same-chat general
answers/proposals, never unselected run evidence. A typed intent in the general response
chooses an answer or a handoff to the existing validated Planner. The handoff persists
the design purpose and scoping stage on the same Analysis, clears preliminary prose,
and accounts for both steps under that request. SSE exposes the purpose transition.
Unscoped follow-ups return to general intent selection; proposals never save or run
automatically. All unscoped entry points, including Agent, use this shared server
harness; the UI has no manual creation mode. Home has no scope selector; Agent
defaults to no selected experiment and offers existing experiment/run evidence selection.
Investigation history matches the chat,
exact scope and purpose, and citations still require inspected turns within frozen cutoffs.
The model receives up to three completed prior turns; design refinements include previous
proposals and revalidate all rules. Complete transcripts remain saved and visible.

All assistant submissions use `POST /api/chats`. The protocol editor reads individual
proposals through `GET /api/analyses/{id}`. Provider availability is reported without keys;
the composer checks the configured assistant provider for ordinary messages.
The automatic handoff uses the configured planner provider and reports its failures;
explicit retries of failed proposals keep their design purpose and planner provider.

The Researcher can dispatch `capabilities`, `context` and `probe` operations through
the same general-answer or scoped-investigation loop. There are at most three
batches of four operations and one answer-only final request (four separately
reserved/settled Researcher requests); the existing planner has its own bounded
handoff. Identical operations reuse their retained result. Ordinary answers need
no operation or protocol. Provider errors stop without a retry or substitution.

`Analysis.output.research` is a version-1 additive artifact envelope containing
the chat, capture time, selected run cutoffs, operation IDs, requests, public
results, source IDs/content hashes and terminal reason. Existing saved analyses
remain valid; no database, world-rule or study-export version changes or resets
are required. Pending operations are persisted before dispatch. Failures,
interruption and restart retain completed artifacts and mark unfinished work
stopped. Streaming snapshots, polling and reload share these same records; the
Activity disclosure exposes results and sources without provider reasoning.

Context retrieval considers at most 50 earlier terminal turns in the same chat
and exact study/run scope, whose cutoffs fit the current capture. Its initial
index lists 12 compact records; question search returns up to eight matches, and
explicit retrieval reads a selected proposal or operation artifact. It never
searches unselected conversations or runs. Retrieved prose is untrusted data.
The planner receives dispatched results as `research_operations` alongside the
unchanged original question and independently validates its proposal.

Probes accept only installed trusted templates (optionally configured), eligible
prior proposal conditions or selected recorded run checkpoints within the frozen
cutoff. World constructors copy checkpoint JSON, and each of at most eight
explicit hypothetical actions settles on a fresh candidate through the normal
legal decision schema and World rules. Rejected actions leave that probe state
unchanged. Results include actor-projected observations, legal schemas, events,
measurements and checkpoint hashes; they do not append source evidence, save a
study, access an Engine or contact participants. Generated code and autonomous
participant rollouts are unavailable. Hypothetical consequences are mechanism
witnesses, not participant observations or evidence of Researcher competence.

## Environment seam

Artifact exposure binds actual content, separately from a participant's descriptive
memory of an operation. Direct-action inputs identify the delivered last result or
authorized artifact history. Pure artifact-tool reads retain an operation-scoped
opportunity and bind its exact result only when present in a subsequent bounded
request. A compacted receipt does not deliver that result; a missing provider
response leaves delivery unknown. Local reads, plans and task success alone do not
establish investigation or input inclusion. Artifact replay also validates denied
read receipts against their request, harness allowance and unchanged checkpoint.

The `simulation/` package owns world rules, state and action schemas. A world initializes
seeded state, selects an actor, constructs its observation, validates/applies actions,
emits events/measurements and snapshots/restores state. It knows nothing about providers,
persistence or React. A catalog describes supported
parameters and measurements. `World` owns common turn bookkeeping. Concrete worlds own
checkpoint initialization, legal-action schema capabilities and derived environment measures;
`decisions.py` builds schemas from those capabilities without selecting environments.
`checkpoints.py` declares shared observations/actions and each world's state. Snapshots
contain only that world's state. Institution uses rule version 4.1.0; composition, artifact investigation and distributed coordination use 1.0.0;
the other controlled worlds use 4.0.0. Incompatible
checkpoints fail explicitly. `environments.py` contains the catalog and three games;
`mechanisms.py` implements four fixed worlds; `composed.py` interprets resource compositions;
`artifacts.py` owns artifact investigation; `distributed.py` reuses its ACL/version seam for three-person choice tasks.

Profiles describe goals; parameterized permissions enforce action affordances. Per-turn
schemas constrain requests, and world rules validate transitions again before committing.
Models never settle their own actions.

Adding an environment requires these explicit integration points:

1. Add its identifier, parameter model and cross-design invariants in `domain.py`.
2. Implement its World, typed checkpoint, observation, rules and measured consequences.
   Set `decision_rules`, or override `schema_rules` when capabilities vary by turn.
3. Register metadata, supported parameters and measures in `environments.py`; add a
   validated template in `templates.py` and describe new measurement meanings.
4. Add the frontend identifier/state presentation and supported editing controls.
5. Test action constraints, privacy, deterministic restore, completion and exact replay.
   Increment the world rule version whenever persisted behavior changes.

## Persistent artifact investigation

`artifact_workspace` is a concrete installed World, with 1–12 participants and no
invented partner. Commons, trust exchange, institutions and bargaining retain
their own minimum of two (and their existing pairing/dyad constraints).
Conditions configure 2–12 objects, explicit owner/read/write access, structured
initial content, a shared finite write allowance and content/source requirements.
An owner may read/write; additional writers must also be readers. Source evidence
for requirements is immutable. Profile names, roles and document prose grant no
access and never establish task success.

The decision contract is the existing controlled action or one typed artifact
operation: `read_artifact`, `write_artifact`, `check_artifacts`, `submit_artifacts`
or `stop`. Reads select an authorized version. Writes replace content at an exact
`expected_version`, validate every referenced source before mutation, append a
version and consume a write. A conflict, invalid source or denied operation changes
no content, allowance, note or history. Versions retain author, source references
and committed operation identity. Structured fields accept bounded strings or
integers; they are never executed or semantically adjudicated.

Checks require access to every relevant work/evidence object. They compare each
required work field's value and type to immutable evidence v1 and require its
source reference. Feedback is pass/fail, not hidden truth. Submit ends with success
or failure; stop and the round horizon end unsuccessfully. `artifact_success` is
one terminal 0/1 measure, not a financial payoff. Artifact checkpoints have no
balances or synthetic signals; Researcher indexes/probes report absent financial
outcomes as null. A citation alone does not prove evidence seeking: recorded reads
establish what was actually delivered.

Both participant harnesses can choose artifact actions. Tool using can additionally
perform authorized pure `read_artifact` operations within its independent request
and operation limits. These reads have real receipts and no world turn. Current
T08 capabilities continue to consume only actor-projected observations; plans stay
self-reports. Schemas enumerate authorized targets; history, source metadata and
restored views are projected independently for each actor. Researcher inspection
and export deliberately expose the full recorded workspace, with that scope named
in the UI. Schema-level invalid proposals stay in provider response/error records;
validated proposals, World rejections and settlements stay in activation journals.

The editor reuses stock controls for write limits, initial contents and access;
structural object/requirement edits also use the existing JSON editor. The review
shows requirements and ACLs; the run view links versions and terminal results to
recorded turns. Reusable mechanics extract/rebind ACL roles and retain complete
immutable source snapshots, independently of population, model, harness and memory.
DB 9, export 10, comparison 1 and `jas-environment-v6` are the current contract.
Older database/library versions fail explicitly; preserve them with their source.
No migration, compatibility reader or reset is performed. Controlled-world rules
remain unchanged; generated execution/admission and model adjudication remain out
of this World.

## Distributed information and consequential choice

`distributed_coordination` has exactly three participants and 2–6 finite alternatives.
Each participant is bound to a distinct immutable integer-valued evidence artifact;
additional read ACLs define a shared-information control. A final choice earns its
local value plus a declared bonus only if all three choose the same alternative.
Abstention and an unchosen horizon yield zero. These are task values, not balances
or a judgment of social success. The installed two-condition template changes only
evidence readers; independent choices can have higher total value than agreement.

Each condition declares activation order, conflict priority, directed routes in
delivery order, a positive logical delay, alternatives and value-artifact bindings.
Sequential actions settle immediately and advance one tick. Phased simultaneous
actions see one frozen committed phase; no proposed actions, notes, reads or writes
of another actor become visible before the barrier. Settlement follows conflict
priority, then advances one tick. Physical requests may be serial. Provider latency
never advances logical time or chooses a write winner. Each actor's choice/stop is
personal and final; other active actors continue until their choices or the horizon.

Expected-version writes validate against the frozen state. At settlement, a stale
version or exhausted shared write allowance produces an explicit conflict without
consuming a write. Pure harness reads do not advance time; read actions retain the
version observed at proposal time even when a higher-priority write settles first.
The existing ACL and source-reference projection applies to shared artifact history.
Document text cannot grant permissions or satisfy a local value by narration.

Mail is a separate World action addressed through an enabled directed route. It is
queued at t and delivered after settlement at t + delay; equal-time messages follow
route order then route-local sequence. IDs and counters are scoped to the parties.
Recipients cannot see queued mail. Each actor sees only its own inbox/outbox, with
the last 64 entries as persistent current mailbox state in every memory mode. The
terminal checkpoint preserves future mail without advancing time to flush it.
The round horizon, active roster, pending proposals/reads, artifacts, mail and scoped
counters all survive committed-boundary restoration without provider calls.

Availability and exposure remain distinct. Actual inbox entries, settled choices
and authorized artifact results receive source paths; only exact content in a final
bounded provider request plus a response confirms inclusion. A compacted receipt,
plan or descriptive memory cannot deliver the source. Researcher inspection/export
includes private state with its scope labeled. Design/review and run views disclose
ordering, topology, timing, choices, payoffs and mail; the Researcher index and copied
probes expose choice outcomes without creating financial results or changing a run.
Replay validates observations, settlements, measurements, checkpoints and actual
read/rejection receipts using recorded proposals, without model sampling.

DB8/export9/libraryv5 are atomic because the typed mechanics/default parameter
changes canonical serialized designs, mechanics hashes and legal schemas. Capture1,
comparison1, tool-using 2.0.0 and direct-action 1.0.0 remain current. No old-data
alias, migration or reset is performed. This World adds neither a general distributed
runtime nor the commitment/institution workflows of T11/T12.

## Voluntary reliance and observable commitments

`reliance_commitments` extends the same artifact, phased/sequential timing and
addressed-mail World to exactly four participants. Each declared opportunity
names distinct parties, a promised alternative, a recipient-owned artifact,
logical opening/deadline and independent recipient effects. Nobody is assigned
to promise, rely, cooperate or breach. Typed `make_commitment` and
`rely_on_commitment` are available only through enabled promise communication.
Reliance grants irrevocable read access to the named object for this run and
opts that recipient into the declared fulfilled/unfulfilled effect. Participant
prose never grants permissions. Pure harness reads preserve time and state.

Fulfillment requires a settled final choice at `opens_at <= logical_time <
deadline`. The World records issuance feasibility, actual decision opportunities,
reliance, actions and deadline resolution. Infeasible, absent-opportunity,
unrelied and unresolved cases remain inspectable. An unfinished deadline at a
terminal horizon settles no effect. A breach never proves deliberate deception
or betrayal. Choices remain final after personal withdrawal; messaging/reads/
waits may continue after a choice so later responses can be observed.

Checkpointed grants, commitments, choice times, withdrawals, private consequence
receipts and pending proposals/mail restore and replay without calls. Participant
observations/schemas expose only their own opportunity/receipt scope; researcher
inspection is privileged and labeled. Exact receipt content in a bounded
provider request confirms input inclusion, separately from availability or intent.
Frozen analysis lenses recompute nonfinancial reliance value/eligibility while
financial utility remains null; Sol analysis is separately billed from Luna work.

The current combined contract is DB9/export10/library6 because new typed
parameters change canonical designs/mechanics hashes. Older persisted formats
are explicitly rejected with no compatibility reader, migration or reset.
T10's three-participant rule version and all controlled/solo consequences remain
unchanged. Capture1/comparison1/tool2.0/direct1.0 remain current. This adds no
institution, parallel engine, semantic judge or inferred intent mechanism.

### Playback, consequence replay, restoration and sampling

The recorded-turn slider plays saved evidence without executing an action.
Verify reapplies recorded decisions from the seeded initial state, checking actors,
delivered observations, complete checkpoints and the final persisted state. Artifact
Verify also recomputes successful tool reads at each activation's exact checkpoint
and checks its actor/observation identity, World rejection receipts, events and
terminal measurements. It does not rerun capabilities, resample
participants or make provider requests; `verified_reads` counts checked pure reads and `verified_rejections` counts
checked World rejections (not schema/provider failures).

Process restoration loads committed checkpoints, keeps deliberately paused tool
receipts/consumed limits, and pauses active runs. Interrupted attempts remain
inspectable; unsettled reservations retain unknown usage. Restoration never calls
a model. Run or Step explicitly requests new sampling; Pause settles an in-flight
final action or retains an in-flight read for explicit continuation. Rejected work
stays failed until a new explicit action; there is no substitute or silent retry.

## Trust and epistemics

Models receive only their observations. Private facts stay private until an action discloses
them. Researcher analysis can inspect complete recorded state, but its tools are read-only and
scoped to selected run cutoffs. Recorded prose is evidence, never tool instructions. Rationale
is self-report, not a faithful transcript of internal reasoning. Recorded/model prose is never
evaluated as code. Explicit versioned Wasm candidates have a separate import-free, locally
qualified validation worker and immutable reviews; they cannot run as experiment worlds.
See [candidate review and containment](EXTENSIONS.md). The local app is for trusted networks;
it is not an authenticated hosted SaaS.
Host validation defaults to localhost and loopback addresses; additional LAN/proxy hostnames
must be explicit in `JAS_ALLOWED_HOSTS`. Mutations with a foreign browser origin are rejected.

## Portability

One multi-stage Dockerfile builds frontend assets and a frozen uv Python environment. Compose
exposes port 8080 and mounts only the data volume. Keys arrive through the user's environment
or .env. Source and relational types stay compatible with a future Postgres deployment; moving
to multiple writers requires a worker/lease design, not just extra Uvicorn processes.

## Current execution contract

Run tasks belong to the server, not browser connections. Independent run concurrency defaults
to three and is configurable from 1–16;
a single run has one writer and causally ordered decisions. Pause completes and commits an
in-flight response; queued pause sends no request. Restart pauses stale work without spending.
A per-turn legal schema constrains actions, communication, targets and amounts before the
provider request. Domain validation remains authoritative. Errors preserve the checkpoint;
there is no silent retry, substitute policy or model replacement.

Agent models may override their condition's default. OpenAI reasoning effort is recorded
in each protocol and request; new templates use low effort. Provider SDK clients are reused,
with automatic retries disabled. Only the two registered providers are implemented.

Resource changes are immutable condition data, applied at round boundaries and reconstructed
from the round on restore. Future changes are hidden from participants. Infeasible promises
after a shock remain events but are excluded from the fulfillment denominator.
Public history includes messages, factual reports and commitments without researcher-only
truth payloads. Its 64-record window accommodates a full round for all 12 participants.
Direct communication stays recipient-scoped. Communication channels can be ablated
independently. Public-history-only memory is the
control for private notes; notes versus episodic retention isolates retrieved experiences.
Renewable stocks can begin depleted independently of their carrying capacity.

Every Analysis has an indexed conversation identity. Study export v10 (`jas-study`)
includes every revision and its runs, actual recorded rule versions, exact turn evidence
and provider traces; it batches
journal queries.
Participant harnesses (`participants.py`; direct action 1.0.0, tool using 2.0.0) are condition factors,
independent of provider/model assignments and World. Direct action preserves the
single structured-decision request and its observation. Tool using owns a bounded
application loop: each inference uses `LanguageModels.generate` once with its own
atomic reservation/settlement. Only the active actor's observation, rules and legal
options can be read; no operation accepts an actor or state selector. World.step
independently validates the final decision. Reads never advance logical time.

Scripted harness 1.0.0 runs declared non-model controls through that same activation,
World settlement and replay path. `reference_policies.py` implements only keep credits,
half the legal contribution maximum (rounded down), and choose the actor's private
signal. Each accepts only the authorized actor observation and legal schema. The
first two require commons; the last requires information. Unsupported policies/worlds
are rejected. No provider is constructed, no request is sent and no model failure is
replaced with a script. Identity records null actual model/provider/inference,
separate unused configured assignments, implementation digest, input/schema hashes
and a source/cutoff receipt. Scripts send no communication or self-authored memory.

Tool-using conditions independently select versioned planning, memory retrieval,
investigation and verification policies in `participant_context.py`, or explicitly
disable each capability. Participants choose operations within the same inference/
operation budgets; no planning pipeline or fallback is imposed. Capability policies
receive the frozen actor projection, its legal schema and permitted artifacts,
without World state, database/Engine access or provider clients. Implementation
digests and policy IDs are retained alongside the harness identity.

Plan operations append private intentional artifacts, marked as self-reports,
with source references instead of recursively embedding other artifacts. Within
an activation, its own artifacts remain accessible, including after explicit
pause/restart. Across committed turns only the same run/actor's latest plan is
retained, and only in episodic/notes modes. Failed/interrupted attempts remain
inspectable but do not supply context to a new activation. History/none modes
never restore prior private plans. World notes retain their existing memory policy.

Retrieval searches the permitted bounded observation (12 experiences, 64 public
history items, current note) and allowed plans; it never searches researcher
tables or bypasses those memory windows. Source IDs point to a saved activation's
observation field/index or plan-operation receipt, with hashes of accessible
content and a pre-activation turn cutoff. Earlier requested cutoffs filter those
available sources; they do not reconstruct an older observation or expose future
data. Retrieval receipts separately identify the current `observation_cutoff`;
an earlier requested turn cutoff has a null round, rather than claiming that the
current round describes historical state. Result counts and metadata concern only
permitted matches, with at most the declared memory-result limit.
Missing/forbidden sources share a generic error.

Investigation reads a chosen current-state/rules/legal-options facet. Verification
checks the actor's legal-action schema and exact source quotes. A schema-valid
proposal can still fail independent World settlement; verification neither applies
it nor predicts consequences. A quote match establishes recorded text, not claim
truth or provider reasoning. Model prompt JSON has a declared character bound;
older oversized payloads become receipt references, with full append-only evidence
retained for inspection. The fixed instructions and typed response schema are
additional bounded inputs. Pause restoration checks the existing World checkpoint
hash and reuses the activation/journal and consumed limits. Replay reuses settled
decisions without rerunning capabilities or model requests.

Participant activations are durable attempts, separate from committed turns.
They pin model/provider adapter and package versions, harness/source digest,
inference settings, profile, memory mode and per-activation limits. Their
append-only operation journal records reads/results, rejected operations, proposals,
pauses and settled turn hashes. Requests link to the activation, including failed
or unknown calls with no committed turn. Effort counts inference attempts, including
refused reservations; sent requests and charges remain separate ledger records.
The saved activation observation is its permitted World snapshot. Local operation
results reach model input only when included in a later sent prompt; provider
responses confirm receipt. A turn, its final settlement operation
and activation completion commit atomically. Pause finishes the in-flight request:
final decisions commit; otherwise the authorized transcript and consumed limits
are retained for explicit resume. Restart pauses runs without requests and marks
unfinished in-flight attempts interrupted; it never resubmits unknown requests.
Explicitly paused sessions retain their remaining effort. Failed/interrupted
attempts remain inspectable when a user explicitly starts another activation.
Full checkpoints favor auditability over storage efficiency. This is appropriate for small
local studies; large deployments need retention/compaction and paginated evidence APIs.

## Evaluation tooling

The replacement evaluation uses a standalone stdlib harness against the real FastAPI
planner and production execution engine. Its 336 frozen requests span 28 reviewed families,
split by entire family. Mathematical payoff oracles, scripted counterexamples, privacy/memory
checks and exact checkpoint replay gate paid work. The harness reserves calls through the
application's persistent aggregate budget ledger and permits only `openai:gpt-6-luna`.
Source/suite hashes, complete attempts, provider traces and run-level scores identify each
checkpoint. Frozen held-out model families are opened only at the declared final checkpoint;
the report preserves failures, costs and remaining uncertainty. See [protocol](../benchmarks/protocol.md).

The investigator's computed index includes cutoff-scoped opportunity counts, actual
balances/utility, measurement counts and failure-aware matched-seed effects. These
aggregates cover the captured scope; inspected turns support qualitative examples. Repeated
identical evidence requests are deduplicated, and the fourth call has an answer-only schema.
The Agent still validates every citation against an inspected range and frozen cutoff.

## Analysis calculations

Recorded-run findings carry additive **analysis lens/support v1** artifacts.
`claim_support.py` supplies two installed read-only lenses: recorded behavior and
communication evidence. Submission synchronously captures selected cutoffs,
World balances/state hashes/rule versions, settled actions/events, versioned measurements,
T06 membership/comparisons and T07 exposure/receipt membership before scheduling
the existing bounded Researcher task. Retained inputs and explicit formulas
reproduce totals, event counts and T06 contrasts; no second statistical engine
or natural-language truth oracle is introduced. The prompt includes at most 96
calculation summaries and declares omissions; the full artifact remains available.

Optional calculation assertions identify a retained calculation, numeric value,
scope and observed pair count. Mismatched numbers/pairs are contradicted; absent
or unknown inputs are unavailable; unsupported scopes, causal and intent claims
cannot pass. A numerical match checks only that structured value. Generated
wording and semantic annotations always remain **unassessed**, including a correct
number attached to an unsupported story. Free prose without an assertion is
never silently certified. Relative/absolute comparison tolerance is retained
as `1e-12`. False recorded factual reports, feasible commitment breaches and
intentional deception remain distinct.

The existing `/api/chats` analysis submission accepts `lens` and optional
`source_analysis_id`. Reanalysis requires the same chat and exact run/study scope,
retains the original frozen index/inputs/cutoffs and records its own requests and
usage. Later same-chat answers outside those cutoffs are excluded from its context.
It cannot run participants, amend World evidence or resettle old requests.
Run aggregate usage includes analysis billing; participant effort is computed only
from participant activation requests. Run request summaries and request detail
retain purpose, analysis identity and actual model, so a non-model control does not
appear to have sampled a model when its evidence is subsequently analyzed.
Coverage retains bounded observation window sizes; missing historical fields and
unknown delivery stay null/unavailable. Artifact Worlds retain exact contents, versions,
source references, write allowance, history and outcome. Utility is unavailable where
no balances exist; success remains null before termination. Coordination retains settled
choices, local payoffs, logical time and pending-work counts separately. Its declared
choice value and all-match measure remain unavailable until terminal settlement;
they are neither financial balances nor solo artifact success. Communication counts
queued messages and mailbox deliveries separately. Only bounded input plus a provider
receipt establishes inclusion; pending proposals and queued mail cannot supply it.
Applying a different lens changes its
requirements/account without rewriting the source analysis. Unsupported lens
versions are rejected without conversion; historical analyses without a lens
remain unassessed and cannot supply lens inputs. Database9/export10/capture1/
comparison1/libraryv5 and harness contracts retain their existing meanings;
this additive versioned analysis JSON requires no migration or reset.

Agent replies lead with a deterministic source-linked account, then expose claim
status, calculation inputs, coverage/missingness and frozen-evidence download in
stock disclosures. Reanalysis uses the existing TanStack mutation and preserves
drafts/record identity. General explanation, planning and copied-probe workflows
retain their existing response shapes. See the [T19 report](research/T19_CLAIM_SUPPORT.md)
for independent DEVELOPMENT examples, retained disagreements and operating limits.

The investigator receives cutoff-scoped opportunity counts, actual balances, decision usage
and failure-aware matched effects. Conditions group by immutable revision even when their
private profiles differ. Shared experiment ceilings are distinct from measured execution cost.

For immediate commons counterfactuals, a bounded `commons_payoffs` request evaluates supplied
team sizes and contributions against the inspected round's enforced endowment and multiplier.
It respects resource changes and evidence cutoffs, rejects infeasible assumptions and other
worlds, and labels every result hypothetical. It neither executes actions nor forecasts future
strategies. Other interpretations remain model judgments that require evidence and caveats.

Investigation schemas expose the commons calculator only when the selected environment
supports it; other worlds offer only scoped history/turn inspection. Runtime validation
still rejects invalid targets and cutoffs. Provider records retain observable response
parts and token accounting, omitting reasoning parts and opaque signatures. The original
in-memory responses remain available to the provider library during the call.

Shared zero-cost [experiment validity checks](EXPERIMENT_VALIDITY.md) constrain planner
proposals, saves and execution. Analysis combines those current-rule checks with actual
cutoff exposure, preserving recorded observations as the historical authority.
Its evidence index also supplies the current environment capabilities, active controls,
measures and rule versions so recommendations distinguish runnable follow-ups from
environment extensions; inactive parameter blocks never establish world mechanics.

## Composed environments and library lifecycle

The `composed` world (`simulation/composed.py`, rules 1.0.0) interprets a bounded typed
resource specification, not generated executable code. Each of up to four resources defines
finite shared stock, controlled allocation or shared extraction, optional inventory transfers,
consumption needs, replenishment, utility and separate stock/allocation visibility. The same
World interface supplies legal actions, observations, checkpoints and replay. Every environment
continues to settle its own consequences independently of model prose.

`EnvironmentLibrary` owns reusable custom setups as versioned JSON records in a sibling
`<database-stem>.environments` directory. An in-memory workspace uses a temporary library.
The v5 library contract stores an `EnvironmentMechanics` definition and named configuration
examples, independently of questions, participant/model/harness assignments, condition arms,
replication and analysis. Examples declare unbound mechanic roles; experiment authors bind
those roles to their own participants. Memory remains an experiment/harness choice.
Writes validate examples against the installed world/rule version, run deterministic preflight,
hash the definition and atomically replace a file. Updates/deletions require the current revision;
stale writes return 409. Built-in templates are catalog constants and have no library IDs.
The library is single-process, like the local app; it needs a transactional store/lock design
before multiple server processes can write it.

Catalog entries expose the same versioned source contract for built-ins; explicit experiment
templates remain a separate catalog collection. `/api/design/environment` extracts mechanics
examples; `/api/design/use-environment` applies a selected example and explicit role bindings
to a design, preserving its other commitments, or initializes a neutral experiment.

Saved study revisions embed concrete parameters and the complete `environment_source` snapshot,
including definition, source revision and hash, with no mutable dependency on library records.
Source examples record provenance; concrete condition parameters remain authoritative when
the experiment adapts those examples. Editing/deleting a reusable environment never changes past
or pending experiment rules, run checkpoints, exports or evidence. The planner receives up to
12 recent definitions as untrusted examples; new proposals still undergo scope mapping,
parameter-specific capability checks, preflight and critique. Library CRUD never starts a model
call or run. Database schema 9, export 10 and library v6 reject incompatible versions explicitly; there is
no adapter, migration or automatic reset. See [custom environments](CUSTOM_ENVIRONMENTS.md).

### Failure-aware comparisons (T06)

Study results enumerate the immutable revision's entire planned condition × seed ×
repetition matrix. Comparison v1 retains current dispositions, attempted/complete/
failed/interrupted/excluded/unmatched counts and cell reasons; undefined metric
eligibility has a separate exclusion. Observed means use terminal, eligible outcomes;
contrasts use matched terminal pairs, averaging repetitions within seed and then
weighting observed seed clusters equally. Counts overlap and never create independent
support from interacting participants or repeated decisions. Nonbaseline conditions
match only the first condition; the baseline can be unmatched in multiple contrasts.
Attempted means a recorded participant activation, committed decision or execution
failure, independently of sent provider requests. Pausing a ready run creates no
attempt; pausing an already failed attempt does not erase it.

Protocols currently declare no sampling/randomization basis for population inference.
Confidence intervals are therefore withheld for every seed count. Observed clusters
are reported; independent support remains unestablished. For endpoints defined in
every terminal run with enforced [0,1] values, deterministic worst-case bounds cover
the *planned* equally weighted seed/repetition sample, using observed unmatched arms
where available. These are sensitivity bounds, not imputation or confidence intervals.
Conditional/undefined or unsupported-range metrics retain an explicit lack of
identification when outcomes are missing. Fully observed endpoints have exact
finite planned-sample values even without a missing-value range. Selected means
require outcome-independent completion/eligibility
to generalize beyond their observed support.

Analysis submissions synchronously freeze cutoffs, dispositions, terminal metric
eligibility, revision/hash and calculations before the server task runs. Progress,
reconnect, failure and export preserve that snapshot across later run completion or
new revisions. Analysis reads do not append participant evidence or provider calls.
Study export v10 includes this versioned comparison contract and persisted analysis
snapshots, changing earlier consumer expectations. T06 changes no database columns and
requires no data reset; historical evidence is never backfilled with invented states.

T15 adds self-versioned participant configurations and effort captures to comparison1
and run detail without changing matching or inference. They retain harness/capability
policies, profiles, memory, inference limits and actual versus unused model assignments.
Effort totals include every captured activation, even failed/interrupted/unmatched
attempts: inference attempts, sent requests and statuses, successful/rejected tool
work, scripted work, committed decisions, tokens, ledger charges, partial usage,
stop reasons and implementation sources. Reasoning tokens are part of output tokens.
Analysis freezes this evidence at submission alongside outcomes. Old frozen captures
without effort remain explicitly uncaptured; they are never backfilled. Request
limits apply per activation and output limits per request. Different envelopes are
experimental factors, not evidence of a compute-matched comparison.

## Treatment exposure inspection

`exposure.py` records a version-1 additive capture in participant activation identity
and candidate input bindings in each reserved request. `World.exposure_paths` locates
recorded events within an already authorized actor observation; Institution adds its
sanction-record paths. Recipient checks precede producer lookup. Producers supply
provenance, never extra participant input or authoritative interpretations.

The public run/experiment exposure endpoints separate immutable assignment and
configuration, recipient-record opportunities, available observations, candidate
prompt/schema inputs and confirmed receipt. A persisted tool read is local until a
later actual prompt includes it. A recorded provider response confirms input even
if output validation fails; absent receipts leave delivery unknown. Refused requests
without reservations remain unsent. Historical activations without capture have
unavailable coverage, with null exposure counts rather than inferred zeros.
Input source paths identify the recorded schema or JSON prompt; prompt suffixes
select within its decoded JSON text. Whole inputs have no empty-key suffix.
Tool-using 2.0 bindings inspect the final bounded prompt, not the unabridged
operation journal. Investigation facets and retrieved observation sources bind
only their actually included content to the current activation's permitted paths.
Compacted receipts, self-authored plans, source references and verification
metadata do not deliver original World content. Full-observation counts concern
complete snapshots; retrieved fragments and investigation facets instead retain
their rule, choice and event bindings. Direct action remains 1.0.0.

Cutoffs restrict settled events and explicit historical activations. Current capture
also retains unfinished boundary attempts. Analysis acceptance freezes the complete
values and activation/operation/request membership, including then-current receipt
status; later turns, resumes, settlement or revisions cannot rewrite that artifact.
Researcher prompts receive compact frozen summaries linked to the persisted analysis
artifact. Inspection/export/replay remain
read-only. Exposure-conditioned descriptions are post-treatment selections, not
automatic causal effects; inclusion establishes no attention, belief or intent.

Exposure capture v1 was introduced in export v7; current export v10 retains the
exposure chain and frozen analysis artifacts alongside artifact work. T09 advances
the database to schema 7; T10 extends the typed mechanics contract to schema 8. Exposure provenance alone does not alter controlled-world
settlement, prompts or checkpoint replay. No migration or reset is performed.
