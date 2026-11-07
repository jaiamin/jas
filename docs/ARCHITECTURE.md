# Architecture

A single FastAPI process serves a built React app and a same-origin JSON API. Server-owned
async tasks execute independent runs with bounded concurrency; decisions within one run
remain ordered. Only explicit user actions create paid work. Restart pauses interrupted work.

## Storage

SQLAlchemy 2 typed mappings; SQLite WAL, foreign keys and busy timeout. An explicit schema
migration runs at startup; unsupported future schema versions fail visibly. Local transactions
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
| Analysis | Explicit question, frozen evidence cutoff, answer/citations and status. |
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

Browser drafts preserve unfinished visual edits and raw JSON per editor route. Invalid drafts
can be recovered in the specification editor. Only backend-validated designs become immutable
revisions and run matrices; saving does not start execution.

## Environment seam

An adapter validates parameters, initializes seeded state, selects an actor, constructs that
actor's observation, validates/applies an action, emits events/measurements and snapshots/restores
state. It knows nothing about providers, persistence or React. A catalog describes supported
parameters and measurements. Register a new adapter there and add its typed action contract;
the React environment view renders the current state and recorded events of every adapter.

## Trust and epistemics

Models receive only their observations. Private facts stay private until an action discloses
them. Researcher analysis can inspect complete recorded state, but its tools are read-only and
scoped to selected run cutoffs. Recorded prose is evidence, never tool instructions. Rationale
is self-report, not a faithful transcript of internal reasoning. No generated text is evaluated
as code. The local app is for trusted networks; it is not an authenticated hosted SaaS.

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

SQLite schema v2 migrates v1 request tracing in place. Study export v2 includes every
revision and its runs, exact turn evidence and provider traces; it batches journal queries.
Full checkpoints favor auditability over storage efficiency. This is appropriate for small
local studies; large deployments need retention/compaction and paginated evidence APIs.

## Environment and evaluation seams

`world.py` owns the checkpoint/observation interface. `environments.py` registers adapters
and contains the original three games; `mechanisms.py` implements four additional state
machines. The legacy games retain rule version 1.0.0; additional mechanics use 2.0.0.
Version checks are per adapter. Old studies keep their original snapshots and remain
replayable; incompatible rule changes must fail explicitly, never migrate evidence silently.
New optional parameter groups use schema defaults when reading older design revisions.
No database table migration is needed: immutable protocols and checkpoints remain JSON.

Profiles describe goals; parameterized permissions control actions. The runtime derives
per-action schemas from current affordances, then the adapter validates the transition
again before commit. This allows offer-only amounts, target restrictions and role permissions
without asking the model to interpret narrative authority. Models never settle their own actions.

Inspect is a development-only dependency. Its application solver calls the same FastAPI
routes as the frontend through an in-process HTTP transport, including the multi-stage
planner, complete run matrix, export and verification. The application still owns provider
clients, checkpoints and atomic accounting. Production images omit the evaluation framework.
Each benchmark process owns one database/engine; a source digest and fixed case digest
identify the tested implementation. Reserved combinations are evaluated only after development.
