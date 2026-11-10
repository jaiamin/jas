# T02 — Candidate review and containment

## Scope and acceptance

Implement issue #13 on `t3/c37e5b27`, initially based on clean integration
`7d16d8a4f1aa041a840681468cc7b645918b5fc3`. The inherited T01 DEVELOPMENT v1
cases and runner remain frozen. Before evidence: `data/t02/before/`; setup and
failed alternatives: `data/t02/setup/`. No paid calls or preserved-stash changes.

Acceptance: a versioned, bounded candidate submission and immutable public review;
truthful local runtime qualification; independent safe/denial/resource/termination/
cleanup witnesses in development and the actual production image; source state,
evidence and participant delivery isolation; existing workflow and browser checks;
a comparable after run. Candidate validation does not admit a world (T16).

## Plan and decisions

- [x] Check Linux ARM64, clean assigned branch, and integration ancestry.
- [x] Retain the source/case-stamped keyless inherited baseline before changes.
- [ ] Specify qualification oracles, implement one public-API TDD slice at a time.
- [ ] Deliver environment candidate review using existing UI primitives.
- [ ] Run the same containment cases in development and actual production.
- [ ] Run inherited/new checks and paired baseline; retain failures and repairs.
- [ ] Commit, merge the latest integration tip, recheck and stop owned services.

Development bubblewrap/user namespaces work. The existing non-root production
image rejects namespace creation with `EPERM` (raw inventory log retained).
Docker-in-Docker would require a socket/credential/mount or privilege change and
is excluded. The allowed alternative is Wasmtime with **no host imports and no
WASI** in a bounded worker. Verify its maintained package and current API before
adding it. The threat model is hostile core WebAssembly/WAT, not native/Python
plugins or vulnerabilities in the trusted kernel, Python or Wasmtime runtime.

The initial artifact contract is `jas-extension-candidate-v1`: explicit WAT,
provenance, a single exported `step(i32) -> i32`, independently supplied bounded
integer examples. Instances and integer checkpoint inputs are fresh copies.
No host callbacks, files, environment, network, clocks or application services
are linked. Candidate examples establish mechanics only; they cannot establish
world authorization, observation privacy, scientific validity or intelligence.
A successful review remains unavailable as an experiment environment until T16.
Qualification is local, fingerprinted, invalidated on restart, and cannot be
supplied by a candidate or enabled with an environment flag.

## Independent DEVELOPMENT qualification cases (v1, specified before runner)

- Safe transition: `2*x+3` maps -4/0/8 to -5/3/19. Repeated fresh instances
  return the same values; no retained global state crosses calls.
- Filesystem: even an unused host `read_file` or WASI `path_open` import fails
  closed. A fake sentinel outside the worker scratch is unchanged.
- Data/application: a host `query_database` import is denied before start code.
- Credentials: WASI `environ_get` and host `get_secret` are denied. The worker
  receives an explicit empty credential environment; use fake test values only.
- Network: WASI socket and host HTTP imports are denied, with no callback/linker.
- All import kinds: imported memory/table/global are also denied, even if unused.
- Fuel: an infinite loop terminates at its instruction allowance; start-function
  loops are covered as well as exported calls.
- Memory: over-limit initial memory is rejected and growth beyond 1 MiB fails;
  table growth beyond 128 elements fails. Stack recursion traps boundedly.
- Compile/input/wall/output limits: oversized input rejected before compilation;
  worker timeout kills and reaps the worker; output cannot exceed a fixed cap.
- Termination/cleanup: success, rejection, trap and timeout leave no worker or
  scratch artifacts; a subsequent safe fixture still succeeds.
- Isolation: copied World state can change without changing source snapshots or
  observations; API candidate reviews leave a recorded run's checkpoint,
  evidence, replay and next participant delivery unchanged and spend nothing.

These are public development cases, independently specified from the accepted
boundary requirements. They are not final held-out tests or model-generated
self-tests. Keep raw failed runs; revise case versions if an oracle needs repair.

## Evidence and handoff

Implementation and observed results pending. Runtime qualification is **not yet
complete**; generated execution must remain disabled until the local boundary
passes, and adoption requires actual development and production evidence.
