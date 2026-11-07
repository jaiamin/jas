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

## Environment seam

An adapter validates parameters, initializes seeded state, selects an actor, constructs that
actor's observation, validates/applies an action, emits events/measurements and snapshots/restores
state. It knows nothing about providers, persistence or React. A catalog describes supported
parameters and measurements. Register a new adapter there and add its typed action contract;
the React environment view currently provides three explicit renderers.

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

Run tasks belong to the server, not browser connections. Three runs may execute concurrently;
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
