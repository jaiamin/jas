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
  consequences and complete replay before admission in T16.

**No candidate is a runnable environment.** `runnable` and runtime
`execution_enabled` are always false. Supplied examples can be wrong or weak;
passing them is neither independent semantic admission nor intelligence evidence.
Existing installed environments, model assignments, accounting and replay are
unchanged. Experiment revisions and study export v8 do not acquire candidates.

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
  candidate, proof, public activity and results. No update/admit/run endpoint.

Reviews live beside the workspace database in `<database>.extensions/`, like
custom environment setups. They use `jas-extension-review-v1`, validate their
candidate identity/hash on read, and publish only complete files. The database
schema and existing rules/exports require no migration or reset. In-memory
workspaces use an owned temporary directory. Include the sidecar with workspace
backups; keep it out of Git. Review history describes its recorded runtime;
current permission always comes from the live runtime status.

For a keyless production check, build the normal Dockerfile, start a fresh
non-root container with disposable data and no provider keys, and execute
`.github/scripts/smoke.py` inside it. The smoke check qualifies that real runtime,
then submits independently authored safe, denied and exhausted candidates through
the same HTTP API. Never point this check at user data.
