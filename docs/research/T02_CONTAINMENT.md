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
- [x] Specify qualification oracles, implement one public-API TDD slice at a time.
- [x] Deliver environment candidate review using existing UI primitives.
- [x] Run the same containment cases in development and actual production.
- [x] Run inherited/new checks and paired baseline; retain failures and repairs.
- [x] Commit, merge the latest integration tip, recheck and stop owned services.

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

The narrow import-free Wasm validation boundary is qualified in both actual
development and production. Experiment/world admission remains disabled and
belongs to T16; this report does not qualify native/Python plugins.

## Implemented behavior

The working branch was automatically renamed to `t3/candidate-containment-review`
from `t3/c37e5b27`; the assigned worktree did not change. Implementation commits:
`aca1088` (API/worker/reviews), `5146f62` (UI/docs/production smoke), `74daeeb`
(actual deadline qualification). The subsequent browser-only test repair waits
for the qualification response before asserting the rendered status.

[Extension documentation](../EXTENSIONS.md) records the versioned contract,
limits, HTTP operations and threat model. Environments → Candidates provides
keyless local qualification, a retained specification draft, immutable source-
pinned reviews and public validation activity. Admission is blocked/rejected/
needs-world-review; `runnable` and `execution_enabled` are always false. A passed
example never enters the installed catalog. Runtime permission resets on restart,
source changes or worker failure; no candidate or environment flag can grant it.

The maintained Bytecode Alliance `wasmtime==50.0.1` dependency has a Linux ARM64
wheel uploaded 2026-10-22. Package metadata and official Python/current Context7
API references are retained under `data/t02/setup/wasmtime-*`. No Docker socket,
privileged container, added capability, security option, host mount, credential
forwarding or host policy was introduced. The namespace-only production failure
remains in `setup/production-namespace-inventory.log`; the successful Wasm
alternative does not depend on that unavailable mechanism.

## Source-stamped inherited comparison

Both sources ran the unchanged T01 DEVELOPMENT v1 case set
`6e4f138cf31d32b8a5e28e348edbccc2e9b1308b62f8b274d39cf0f24ba33a6e`
and unchanged harness `b6438d9fa3390d05f4f3c5583aa1e0e6f2095d1db653060257cdc817138a5826`.
Same Python/Pydantic AI/FastAPI/httpx versions, low effort, scripted FunctionModel,
Sol Researcher/Luna participant labels, and per-response synthetic usage.

| Identity | Before | After actual-deadline repair |
| --- | --- | --- |
| Clean HEAD | `7d16d8a4f1aa041a840681468cc7b645918b5fc3` | `74daeeb43b24ba7236edfb2211e96e38b17e4c0b` |
| Full input tree | `feb91d03dfef864bfe4952236dd4b5c8b50af6950c6ec9d97813083713bbdb65` | `55ee1dee597a9866f80fc80c4de6bd4b17cea770b2efd0f156ff9e0ffc401072` |
| Source archive | `44970797ef9f356cd91774d890970e8f6e2b251a02b31db096637c9562404772` | `8e025c193460704da55704462ccc9cbfa5e5b95c3d716947ab2c238edeab36fd` |
| Production backend | `eaf2fc9d5e92a3a2c95ebbd9178dc5656d8f282196570ca278871d2d08f28b62` | `fbabd0077ed8bf5f1735022aec9451768e47ddefc7e81a722723056536941952` |
| Artifact directory | `data/t02/before/` | `data/t02/after-deadline/` |

Both attempts retained all six cases, with four supported witnesses completing
and two expected unsupported-schema rejections. Each recorded 22 scripted
responses, 2,200 synthetic input/1,100 output tokens and $0.000770 synthetic
ledger charges; **actual calls/spend: zero**. HTTP operations were 102/98 because
read-only polling varies. Both source-stability checks passed.
`comparison-deadline.json` exited 0: no regressions, improvements or failed
attempts. Initial `after/` and `comparison.json` are also retained, with their
own earlier source; neither overwrites the final comparison. Browser-test and
evidence-only commits after `74daeeb` do not change product execution inputs.

## Observed qualification and failure retention

The independently specified case file is DEVELOPMENT v1, SHA-256
`d765db74393ecaaf622cf6ae150ab7fe6055282700c77b4667a51621b82e47ef`.
All **26 checks passed** in both final boundaries, including actual safe outputs
`[-5, 3, 19]`, fresh mutable-global instances `[1, 1]`, filesystem/data/credential/
network import denials, imported memory/table/global denial, fuel/start-loop
termination, memory/table/stack/bounds limits, input/output bounds, credential-free
environment, process reaping, scratch cleanup and an unchanged fake sentinel.
The fixed timeout probe reaches the same **four-second wall deadline** as a
candidate. The development qualification took 4.970 seconds in the retained run.

- Development proof: `data/t02/development-deadline/{source.json,source.tar.gz,runtime.json,timing.json}`;
  fingerprint `e7eb9ef72200f526089c16a58eb10f7a1d3376cf75a0b240d36b2450ee7b10b4`.
- Production proof: `data/t02/production-deadline/{runtime.json,reviews.json,settings.json,container.txt,server.log}`
  and `setup/production-deadline-{build,smoke}.log`. Fresh image
  `jas-t02-c37e5b27:deadline`, ID
  `sha256:dcdcafb0e81acba3a757de87b38c6730022ccc46054bf6328126dd52f168fac5`,
  built from `74daeeb`; non-root `10001:10001`, no mounts/added capabilities/
  security overrides, unique container `jas-t02-prod-deadline-c37e5b27`, port 18193.
  Fingerprint `be3624bc9d0a393b26c79d7c65cc19b931cfe81544b47800e88d573c7c66cfea`.
  Production smoke passed health, SPA/assets, keyless state, real containment,
  independent `3*x-1` examples `[20, -7]`, hostile application imports, exhausted
  fuel, review restoration and another safe execution after rejection.

Recorded development failures and repairs are retained, never erased:

- API tracer: missing endpoints red; inert/restorable review green. Reproducible
  red on the exact pre-change archive plus hash-pinned current development test:
  `data/t02/red-replay/{source-identity.json,source/,red.log}` (two observed failures).
  Subsequent API admission/examples/restoration and independent hostile variants
  pass. Original iterative red/green logs remain under `setup/`.
- Worker unavailability initially mislabeled a candidate rejection; the red
  revocation test now passes with a blocked review and disabled runtime.
- The source-delivery oracle initially omitted the established engine-added
  `you` profile. Corrected the oracle, not the product contract. Its original
  failure and source archive are in `checkpoint-backend/`; green proves source
  checkpoint, full run/export/usage, exact replay and actual next delivery are
  unchanged after qualification/candidate validation and a separately advanced
  World copy. All participant responses use the deterministic provider.
- First termination witness used a shortened deadline. A fresh API timing
  regression failed at 1.259 seconds; exact dirty-source archive/manifest and log
  are in `deadline-red/`. Removed the test-only deadline branch. All 12 focused
  backend tests then passed in 52.85 seconds. Earlier qualification artifacts
  under `development/` and `production/` remain retained but are superseded for
  the actual-deadline claim.
- Browser tracer: Candidates tab absent → red; real qualification, retained
  draft/review and disabled mobile failures → green. After the deadline repair,
  the five-second UI assertion expired while qualification was still pending.
  Preserve `browser-deadline-failure/` and `setup/browser-deadline.log`; wait for
  the actual HTTP response, then keep all original outcome/UI assertions.
- The first smoke invocation preceded server readiness and failed with connection
  refused. `setup/production-smoke.log` is retained; the ready retry and final
  fresh-image smoke passed. No security setting or check was relaxed.

No source World, provider/accounting implementation, persisted rules, database
schema, study export, generated UI primitive, historical benchmark suite/score
or held-out case changed. Stash `f771128ba1c9295262a4073df40cc25647b1370f` remains
untouched. No live model or scientific generalization claim is established.

## Verification and handoff

Observed checks (use project-local `.tools/uv/bin/uv` in this sandbox):

| Check | Observed result and source |
| --- | --- |
| Frozen installs | `uv sync --frozen`, `pnpm --dir frontend install --frozen-lockfile` passed |
| Ruff / ty | `uv run ruff check backend benchmarks .github/scripts`, `uv run ty check` passed after deadline repair |
| Full backend | `uv run pytest --junitxml=data/t02/backend.xml -q`: **946 passed**, 64.50s, product checkpoint `5146f62` |
| Affected backend after repair | `uv run pytest backend/tests/test_extensions.py -q`: **12 passed**, 52.85s, `74daeeb` |
| Frontend | lint, all **106 unit tests / 29 files**, TypeScript and production build passed; UI unchanged after `5146f62` |
| Full browser | `JAS_TEST_PORT=18113 pnpm --dir frontend test:e2e`: **168 passed**, 5.7m; includes the 165 inherited flows and 3 new flows |
| Browser after deadline repair | Same port, `test:e2e extensions.spec.ts`: **3 passed**, 10.0s, `b28f5b3`; actual HTTP completion wait, no relaxed outcome assertions |
| Actual production | Normal Dockerfile build plus extended `.github/scripts/smoke.py`: passed on final non-root `:deadline` image |
| Baseline comparison | Same T01 cases/harness/runtime: exit 0, no regressions/failures |
| UI review | Light/dark mobile captures inspected; no horizontal overflow, retained invalid draft and disabled validation; design detector returned `[]` |

Raw logs/XML, before/after archives, HTTP operations, exports/ledgers, qualification
proofs, exact deadline red source, failed browser traces and production identities
are retained throughout ignored **`data/t02/`**. `data/t02/checks.json` indexes
commands/results and log hashes. Preserve this whole directory when handing the
worktree to the merger. Source-stamped baseline/qualification archives provide
reproduction; original iterative development logs are retained separately.

Latest integration merge was `git merge --no-edit integration/research-harness`:
`7d16d8a4f1aa041a840681468cc7b645918b5fc3` was already included, no conflicts.
A final merge/ancestry check is repeated at handoff. Both disposable production
containers were stopped and removed. Playwright stopped its owned backends;
owned service ports are checked at handoff. No browser session remains.

T02's narrow validation/containment criteria are met and ready for independent
integration review. There is no remaining runtime blocker for this import-free
Wasm contract. Native/Python extensions, full world admission (T16), live model
competence, research validity and held-out generation remain unqualified.
No pushes, PRs, issue edits/closures or other ticket status changes were made.
