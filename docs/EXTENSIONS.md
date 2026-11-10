# Extension candidate review

Open **Environments → Candidates**, check containment, then submit a candidate
specification. **Use safe example** supplies a small manually specified fixture.
Checking containment and validating candidates use no models, keys or budget.
Unfinished specification text is saved locally; each submitted review is an
immutable workspace record with its candidate hash, runtime proof, public
validation activity, outputs and provenance. Review links survive reload.

`jas-extension-candidate-v1` accepts a name, provenance, explicit core WebAssembly
text (`source`) and 1–16 integer `state`/`expected` examples. The sole export must
be `step(i32) -> i32`. State is a signed 32-bit integer copied into a fresh instance
for each example. Every example is repeated from another fresh instance. WAT
source is limited to 64 KiB; this is a narrow candidate contract, not a universal
world language. Native/Python plugins, WASI, host imports and additional exports
are unsupported. Unsupported formats are rejected explicitly.

A review has one of three admission statuses:

- `blocked`: local containment has not passed, changed, or cannot start/clean up.
  The artifact remains inert and can be inspected.
- `rejected`: executable contract, resource bounds or supplied examples failed.
- `needs_world_review`: the examples and fresh-instance restoration passed.
  Independently verify world actions, permissions, observation projection,
  consequences and complete replay through the independent admission step.

A candidate review never authorizes execution. **Check sealed relay admission**
separately checks the installed independent `sealed-relay-v1` specification. That
finite two-participant profile has explicit submitter/reviewer
permissions, a reviewer-private docket, three action credits and sequential logical
time. A failed or unsupported check remains visible in immutable admission history.
Candidate prose and self-tests cannot alter the checks. Finite checks establish
mechanics; they do not certify arbitrary programs, intelligence or research validity.

The separate T17 backend `reviewed-finite-v1` path requires an **independently
user-authored, reviewed, exhaustive external transition table frozen before
generation**. It supports at most256 encoded inputs, explicit role permissions,
conserved available/escrow/spent resources, terminal states and static actor-private
facts. Full-domain and four invalid signed integers are checked twice from fresh
instances, followed by actual World consequence/ACL/projection/restoration/replay
witnesses. The table is a declared prerequisite, not proof that natural-language
intent was independently understood. Candidate prose, examples and self-tests
cannot author, replace or relax it. Rich installed Worlds retain their own
interfaces. Dynamic information policy, arbitrary programs, host imports and
external systems remain unsupported.

Through `POST /api/chats`, an explicit `generation` allowance selects the frozen
contract and caps1–3 candidate attempts,1–12 total nested Sol requests,512–16384
output tokens/request,4096–180000 input bytes/request and$0.01–$10 for the question.
Every Researcher/generator/planner request reserves and settles separately under
all applicable question/investigation/study/workspace ceilings. Ordinary discussion
has no generation allowance. Generation emits explicit WAT through the real model
path, then validation/independent admission/library operations run on the qualified
worker path. No template selector or production WAT generator supplies the answer.
Candidate versions, failed checks, explicit repair links, sources and stop reasons
remain in append-only attempt events. Generation records/events use v2 and retain
each generator request's model, reservation, settlement, tokens, cost and error;
prior unversioned/v1 events are rejected explicitly. A resulting experiment remains pending
human review and separately authorized participant execution; discussion and saving
never sample participants. Copied probes are distinct from executable containment.

T17 is incomplete and UNACCEPTED. Its first scripted Pydantic AI Sol-identity
orchestration and its one combined-source integration check passed at the sources
recorded in [the T17 plan](research/T17_EXTENSION_GENERATION.md). Second scripted
generation/repair, actual World and Engine/private-tool/replay checks also pass at
their recorded sources. Complete generation export and final UI/production checks
remain unverified; live Sol competence remains unobserved.

After local containment and independent admission pass, **Save admitted environment**
uses the normal reusable mechanics library. **Review an experiment** opens the
standard design Review. Saving an immutable revision pins exact WAT content, WAT
and compiled Wasm hashes, package/profile versions, declared capabilities, current
runner/runtime fingerprints and full containment/semantic check provenance. Run,
Record, evidence export and exact call-free consequence replay use the same World
and scoped isolated runner. Changes or deletion in the library/review sidecar cannot
change pinned pending or past runs. Starting a new revision requires an actual
matching admission record; a pasted self-reported package cannot authorize it.

`execution_enabled` describes the current qualified boundary, not candidate
permission. Restart, runtime source changes or worker failure revoke qualification.
Run inspection shows why execution/replay is blocked while retaining evidence.
Unsupported package/profile/runtime semantics fail explicitly without fallback.
Requalification never rewrites a pinned package or substitutes a model.

## Containment boundary

Wasmtime 50.0.1 executes core WebAssembly with no imports of any kind, no linker,
no WASI context, host callbacks, preopened directories, inherited environment or
application interfaces. Imported functions, memories, tables and globals are
rejected before instantiation or module start functions. Only copied integers
cross this boundary; a candidate never receives a source run or participant.

Each validation uses a fresh bounded worker with an explicit environment
(`LANG`, scratch-only `HOME` and `TMPDIR`), isolated Python startup and no provider
credentials. The trusted worker compiles the explicit artifact and supplies no
host capabilities. Wasm cannot create processes, open files, discover credentials
or communicate over a network. The engine limits linear memory to 1 MiB, tables
to 128 elements, stack to 256 KiB and fuel to 100,000 per fresh checkpoint.
Compilation and execution share process limits (1 GiB address space, 2 CPU seconds,
32 file descriptors, 8 OS tasks, zero file/core output), a 4-second wall deadline
and 4 KiB result cap. Timeout kills the process group, waits for the worker and
removes its scratch directory. Guest errors expose bounded codes, not native
errors, paths or unrelated data.

The security boundary is **WebAssembly capability isolation**, supplemented by
process limits and lifecycle management. A Python subprocess alone is not the
boundary. This does not claim to contain arbitrary native code or vulnerabilities
in the trusted kernel, Python or Wasmtime runtime. No host mounts, credential
bindings, Docker socket, privileged mode or security-policy changes are needed.
Development namespace availability does not qualify a production container.

Qualification runs fixed independently specified development cases through the
same worker: safe outcomes, fresh state, host/WASI imports, all import kinds,
infinite/start loops, memory/table growth, stack and bounds traps, size/output
limits, explicit timeout/termination, empty credential environment and cleanup.
It is an explicit local action, never a candidate-supplied result or environment
flag. It resets on restart. Runtime/case fingerprints identify the proof; worker
failure or changed source revokes validation permission. Failed checks remain
visible. Actual development and production evidence is recorded separately in
[the T02 report](research/T02_CONTAINMENT.md), not inferred from CLI availability.

## Public workflow and storage

- `GET /api/extensions/runtime`: current local containment status and checks.
- `POST /api/extensions/qualify`: run the fixed keyless qualification suite.
- `POST /api/extensions/validate`: retain a new immutable review; blocked runtimes
  store the artifact without compiling or executing it.
- `GET /api/extensions/reviews` and `GET /api/extensions/reviews/{id}`: restore
  candidate, proof, public activity and results.
- `POST /api/extensions/reviews/{id}/admit` with `{"profile":"sealed-relay-v1"}`:
  run independent finite action/authorization/consequence/resource/termination and
  World projection/restoration/replay checks; retain a new immutable attempt.
- `GET /api/extensions/admissions` and `/api/extensions/admissions/{id}`:
  inspect successful, failed and unsupported attempts and pinned packages.
- `GET /api/extensions/profile`: inspect the finite-table prerequisite, supported
  bounds, unsupported semantics, contract and allowance schemas.
- `POST /api/extensions/contracts` and `GET /api/extensions/contracts[/{id}]`:
  freeze/inspect independently authored immutable external contracts.
- `POST /api/extensions/contracts/{id}/checks` with `review_id`, and
  `GET /api/extensions/finite-checks[/{id}]`: retain the actual full-domain
  independent artifact comparison; a passing check alone is not runnable.
- `POST /api/extensions/finite-checks/{id}/admit` and
  `GET /api/extensions/finite-admissions[/{id}]`: execute independent World checks
  and retain a pinned finite package or honest failed admission.
- `GET /api/extensions/generations[/{id}]` and
  `GET /api/analyses/{id}/requests`: inspect generation event/source history and
  each separately reserved/settled question request.

Reviews live beside the workspace database in `<database>.extensions/`, like
custom environment setups. They use `jas-extension-review-v1`, validate their
candidate identity/hash on read, and publish only complete files. The current
contract is DB15/export18/library10/definition2/research-operation2 with
generation-event-v2, including investigation ownership, institutional workflow,
finite packages, generation allowances and declared adjudication.
Capture1/comparison1/tool2.0/direct1.0 and installed World rules retain their meanings.
Incompatible persisted meanings and rule checkpoints are rejected on inspection,
export, execution and replay. No migration, adapter or reset is provided. In-memory
workspaces use an owned temporary directory. Include the sidecar with workspace
backups; keep it out of Git. Review history describes its recorded runtime;
current permission always comes from the live runtime status.

For a keyless production check, build the normal Dockerfile, start a fresh
non-root container with disposable data and no provider keys, and execute
`.github/scripts/smoke.py` inside it. The smoke check qualifies that real runtime,
then submits independently authored safe, denied and exhausted candidates through
the same HTTP API. It also admits/saves/pins the identical sealed-relay artifact and
checks literal World consequences and fresh restoration/replay in that image.
Engine/provider workflow witnesses are separate deterministic development checks. Never point this check at user data.
