# Architecture

A single FastAPI process serves a built React app and a same-origin JSON API. Server-owned
async tasks execute independent runs with bounded concurrency; decisions within one run
remain ordered. Only explicit user actions create paid work. Restart pauses interrupted work.

## Storage

SQLAlchemy 2 typed mappings; SQLite WAL, foreign keys and busy timeout. Startup creates
schema v4 for fresh workspaces and rejects incompatible schemas. Local transactions
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

## Experiment design

The planner scopes the question and justifies agents, conditions, seeds, repetitions and
rounds; optionally retrieves public methodological research; drafts a typed protocol; validates
its invariants; and obtains a separate critique. At most three protocol revisions resolve
validation/review feedback. Provider failures stop visibly without retries or substitution.
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
Conversation identity is an indexed Analysis field, with no duplicate message store.
One pending turn per chat prevents overlapping follow-ups; independent chats can run
concurrently. Failed turns stay inspectable and retry as a new turn in their original context.

The existing planner, investigator, provider tracing and budget accounting execute the
messages. General answers receive the environment catalog and recent same-chat general
answers/proposals, never unselected run evidence. Investigation history matches the chat,
exact scope and purpose, and citations still require inspected turns within frozen cutoffs.
The model receives up to three completed prior turns; design refinements include previous
proposals and revalidate all rules. Complete transcripts remain saved and visible.

All assistant submissions use `POST /api/chats`. The protocol editor reads individual
proposals through `GET /api/analyses/{id}`. Provider availability is reported without keys;
the composer checks the configured planner provider for creation.

## Environment seam

The `simulation/` package owns world rules, state and action schemas. A world initializes
seeded state, selects an actor, constructs its observation, validates/applies actions,
emits events/measurements and snapshots/restores state. It knows nothing about providers,
persistence or React. A catalog describes supported
parameters and measurements. `World` owns common turn bookkeeping. Concrete worlds own
checkpoint initialization, legal-action schema capabilities and derived environment measures;
`decisions.py` builds schemas from those capabilities without selecting environments.
`checkpoints.py` declares shared observations/actions and each world's state. Snapshots
contain only that world's state. All seven worlds use rule version 4.0.0; incompatible
checkpoints fail explicitly. `environments.py` contains the catalog and three games;
`mechanisms.py` implements the other four worlds.

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

## Trust and epistemics

Models receive only their observations. Private facts stay private until an action discloses
them. Researcher analysis can inspect complete recorded state, but its tools are read-only and
scoped to selected run cutoffs. Recorded prose is evidence, never tool instructions. Rationale
is self-report, not a faithful transcript of internal reasoning. No generated text is evaluated
as code. The local app is for trusted networks; it is not an authenticated hosted SaaS.
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

Every Analysis has an indexed conversation identity. Study export v3 (`jas-study`)
includes every revision and its runs, exact turn evidence and provider traces; it batches
journal queries.
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
balances/utility, measurement counts and matched-seed effects for completed runs. These
aggregates cover the captured scope; inspected turns support qualitative examples. Repeated
identical evidence requests are deduplicated, and the fourth call has an answer-only schema.
The Agent still validates every citation against an inspected range and frozen cutoff.
