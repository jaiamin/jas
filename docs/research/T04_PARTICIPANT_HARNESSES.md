# T04 bounded participant harnesses

Ticket: [#15](https://github.com/jaiamin/ass/issues/15). Prepared branch
`t3/19c753ac`, renamed locally to `t3/participant-policies`, based on integration
`7d16d8a4f1aa041a840681468cc7b645918b5fc3`.
Only T04 is in scope. No paid calls, historical/held-out suite edits, stash
application, publication, T08 planning/memory or T09 world work is authorized.

## Acceptance and plan

- [x] Check Linux/cwd/clean branch and integration ancestry; retain the clean
  T01 keyless before source/cases/harness in `data/t04/before/`.
- [x] Deliver direct-action and bounded tool-using implementations at the
  execution → `LanguageModels.generate` seam on existing controlled worlds.
- [x] Pin versioned policy, model/provider, tools, inference settings and effort
  bounds; keep goals/personas explicit study factors and defaults unchanged.
- [x] Execute only active-actor observation/rules/legal-options reads; validate
  final effects independently in World. Retain failed activations and operations.
- [x] Reserve/settle every inference separately; preserve primary failures,
  unknown usage, one writer, pause/restart, privacy and exact replay.
- [x] Configure/review both policies and inspect actual operations using existing
  UI patterns. Demonstrate both through deterministic public API/browser flows.
- [x] Run inherited/new checks, retain red/green evidence and a same-input
  before/after comparison; merge latest integration, commit, stop owned services.

Approved seams: public workflow HTTP API primarily; independent World and
provider/accounting invariants supplement it. External providers alone are
replaced by deterministic `FunctionModel` implementations. They establish
mechanics, never model intelligence. Live capability remains unverified.

## Decisions

- Policy belongs to a condition, independently of its model and environment.
  Existing per-profile model overrides continue to apply. Direct action remains
  the default and retains its observation, decision schema and single request.
- Tools take no actor/run/state selectors: they can only read the current
  actor's authorized observation, its rule text or legal alternatives.
- Each tool-policy inference passes through the existing single-request ledger;
  the application owns the bounded loop, not an unaccounted provider loop.
- Pause finishes the current inference. A final decision may commit; otherwise
  persist the activation transcript and remaining limits for explicit resume.
  Interrupted/unknown requests are retained and never silently retried.
- Effort counts inference attempts, including a refused reservation. Sent
  requests and actual/unknown charges remain separately inspectable in the ledger.
  The activation observation is the permitted World snapshot; actual model
  deliveries are the recorded prompts and tool results. No prior activation
  transcript bypasses the selected memory mode.

## Evidence and progress

Before behavior changes: clean source `7d16d8a4f1aa041a840681468cc7b645918b5fc3`,
`data/t04/before/`: six passing DEVELOPMENT v1 cases, 22 scripted requests,
2,200 synthetic input / 1,100 output tokens, synthetic $0.000770 ledger charge,
104 HTTP operations, source stability passed, actual spend $0.
Exact source/case/harness/runtime hashes are in `manifest.json` and `report.json`.
Setup log: `.tools/t04-baseline-before.log`. Local uv 0.13.7 in `.tools/uv`
uses the T01 workaround; shared tools and lockfiles are unchanged.

Implemented public API red → green slices: unsupported harness input → both
policies with independently ledgered operations (`tdd-01-*`); absent settled-effect
record → atomic `settle` operation (`tdd-02-*`); harness-only arms collapsed to one
factor → distinct factor and review differences (`tdd-03-*`). Initial run-order
test assumption was repaired by selecting condition identity. All failed logs
remain in `data/t04/`; the early runner setup errors (missing build, wrong editor
URL and a TypeScript extension) remain in `ui-01-red.log` and build logs. The
qualified UI red specifically failed on the absent harness selector; both real
desktop/light and phone/dark workflows subsequently passed (`ui-01-green-attempt1.log`).

Independent new DEVELOPMENT v1 cases are in
`benchmarks/participant-harness-cases.json`; `benchmarks.participant_harness_trial`
preserves source archives, input hashes, all attempts/HTTP operations and full
exports. `data/t04/development-attempt1/` passes all five expected-outcome cases,
including retained failed activations and unknown usage, with source stability.
These are scripted mechanics checks, never a live or held-out intelligence result.

The T01 runner/cases remain byte-unchanged. Its frozen v4-export oracle is expected
to fail four cases under the intentional current v5 contract. Retain those
failures explicitly in the paired comparison; the updated API/export tests must
positively verify v5. No other baseline check may regress. Schema 5 and setup
format v2 explicitly reject older data; no reset/conversion was performed.

Observed so far: clean-source inherited 935 backend and 106 frontend tests pass;
90 focused backend tests pass, then 28 new API/accounting/world cases pass across
all eight installed worlds. Pause/restart preserves one activation and remaining
effort; in-flight restart retains an interrupted activation and unknown reservation.
Auxiliary cancellation and secondary settlement faults preserve primary failures.
Review verification: 964 backend tests and 106 frontend tests passed, as did
Ruff, ty (after adding the missing portal-narrowing assertion), frontend lint
and production build. Inspection now batches activation operations per run.
All 31 focused policy tests pass, including supplemental accounting/lifecycle
cases that revoke either ceiling during the first request and check that no
auxiliary request is sent, and pause during the final tool-policy inference to
check its atomic commit. The first browser run stopped after 24 passes without
a terminal result (`browser-inherited.log`); retain it as incomplete, not a
passed suite. A separate final run is in progress. Review copy formatting
failed lint once and was repaired; both logs are retained.
The completed runs and source attribution follow below; intermediate development
logs are retained as development history, not substituted for archived-source
evaluation evidence.

## Final source and comparison

Implementation checkpoint: `3acf3c160fb398c8996e71f6065bf1d4b970a201`.
`602c597` adds the auxiliary-capacity cancellation regression. Merge
`86e57f99cdd4a9d02e6ebdfef120fb2510c9d2ca` includes integration checkpoint
`8f83a36bc0428abda418b93557f689657ce030ae`. Conflicts were limited to
HANDOFF/progress prose; both ticket handoffs and integration's other statuses
were preserved. Routes, shared types and architecture/UI/development docs merged
without code conflicts. A final conflict-free sync at
`3f3cf5c72eda10a346a6bc4ff44c1c3a7ce6c148` includes integration follow-up
`c546c857348cb433163d52f99efc07f790a17288` (T02 review identity/worker-exit repair).
T04 executable inputs are unchanged by that sync; fresh checks below include it.
Subsequent report-only changes do not alter executable inputs.

| Archived source | HEAD | Full tree SHA-256 | Source archive SHA-256 |
| --- | --- | --- | --- |
| `data/t04/before/` | `7d16d8a4f1aa041a840681468cc7b645918b5fc3` | `feb91d03dfef864bfe4952236dd4b5c8b50af6950c6ec9d97813083713bbdb65` | `b8fb8bb067e5ba905adb44953e372f920ecd0bf908119e14a25622e80e61e8f1` |
| `data/t04/after/` | `3acf3c160fb398c8996e71f6065bf1d4b970a201` | `c65fae17d3a93353cab8ec862ad4a9ee8863bc94f5c5f589fddfd371c6dbd152` | `79f0cf7104b6711ea343411e382bed7fcf4c251218d0db03af7fd2f57f426f25` |
| `data/t04/after-integration/` | `86e57f99cdd4a9d02e6ebdfef120fb2510c9d2ca` | `58086b77ba007daf6bb69551c4cf68aec571d6bc7603eb3c43051857cdc7436f` | `304c0314b782451d6acdca3b00fe77dc06b43bfc30fb036adc23d7495b0262e1` |
| `data/t04/after-handoff/` | `3f3cf5c72eda10a346a6bc4ff44c1c3a7ce6c148` | `9e0321f7df75d4bd992d4f5baef2e51d0dc0a71fad351ad3760fdc8dbecc4e63` | `7f6418d2d219ee68af7e2608e14b720721e002d67471fcd016e33544decad33f` |

All four evaluated sources were clean and source-stable. The unchanged T01
DEVELOPMENT v1 case digest is
`6e4f138cf31d32b8a5e28e348edbccc2e9b1308b62f8b274d39cf0f24ba33a6e`;
the identical scripted harness digest is
`b6438d9fa3390d05f4f3c5583aa1e0e6f2095d1db653060257cdc817138a5826`.
All after comparisons exit **1**, intentionally retaining four `export-v4`
failures and their terminal `passed` flags. Every other check passes. The five
completed runs retain identical observations, decisions, complete checkpoints,
state hashes, final state, metrics and usage across all **22 turns**; see
`direct-action-parity-handoff.json` and its retained verification script.
Each baseline has 22 requests, 2,200/1,100 synthetic tokens and a $0.000770
synthetic charge. HTTP counts 104 → 105 reflect read-only polling. No competence
gain is claimed from the identical behavior or changed contract.

The fresh five-case DEVELOPMENT trial at `data/t04/development-handoff/`
uses the same clean final merged source and passes every expected outcome. Case digest:
`ba1938bfa0bce148a6ea01d785cc3cb1cb6f4a95454510d4c7431fc3f88100e1`;
trial harness digest:
`8609cf4a711724ed47a0eec1f645c3c74108a4c96ff72a8fd1e375996639973b`.
Its 30 requests include the retained forbidden-operation and unknown-usage
failures: 2,900/1,450 known synthetic tokens, $0.002377 synthetic charged/reserved
cost, partial usage true. The matched policies independently settle 12 credits
each; the memory-none two-round variant settles 24 each. `development-attempt1/`
and `development-final/` retain earlier dirty/clean source archives respectively;
`development-integrated/` retains the first integration checkpoint.
All earlier attempts remain available. Actual spend is **$0**.

## Observed final checks and handoff

- Final merged source `3f3cf5c`: Ruff, ty, **981 backend tests**,
  frontend lint, **106 unit tests** and production frontend build pass. Logs/XML:
  `data/t04/handoff-*`. The prior integration checkpoint passed frozen dependency
  sync and 980 backend tests (`integration-*`). Pre-merge full backend checks
  separately passed 964 then 967 tests; the final suite includes all 32 policy
  cases and T02's tests.
- The full inherited Chromium suite passes **165 tests**, zero skipped,
  unexpected or flaky cases (`browser-final.json`, `browser-final-exit.json`,
  `browser-final-results/`). This run used the final pre-merge product/UI; the
  source was committed during the run and later edits were tests/docs only.
  This full run predates integration; the seven affected flows were checked
  separately on the final merged source.
- On the clean merged source, **2 actual two-policy browser flows** pass in
  desktop/light and phone/dark: configure, review, save a new immutable revision,
  run each policy, inspect real operations/accounting and verify exact replay.
  `handoff-policy-browser*` retains reports and screenshots. The **5 T02 browser
  flows** affected by the shared integration surfaces also pass separately
  (`handoff-extensions-browser*`). Earlier `policy-browser-final*` and
  `integration-extensions-browser*` results remain retained. All owned servers
  shut down normally.
- Reviewed rendered light/desktop and dark/phone policy records; no document
  overflow. The Impeccable detector returns an empty findings list for the changed
  T04 UI (`impeccable-detector-final.json`). Existing primitives/tokens/appearance
  remain the basis; no styling dependency was added.
- A fresh production image builds and the existing smoke passes as non-root
  with explicit empty provider keys, including actual containment qualification,
  denial, limits and cleanup. Final logs: `handoff-production-build.log`,
  `handoff-production-smoke.log`, `handoff-production-server.log`; exact
  container/image IDs are retained separately. Earlier production logs remain.
  The owned container and task image tag were removed, with no host ports or
  user-data mounts. Port 18115 refuses connections; the owned preview was closed.
- Commit secret-scanning hooks, explicit staged Gitleaks and `git diff --check`
  pass. No pushes, PR changes, issue changes, paid calls, stash operations,
  data resets or other-ticket status edits were performed.

Preserve the entire ignored `data/t04/` directory and `.tools/t04-*` setup logs.
`checks.json` indexes commands/results and log hashes; `artifact-manifest.json`
indexes raw artifacts. The compact tracked record is this report. All keyless
T04 acceptance criteria are met and the branch is ready for the parent's fresh
integration review. Live model competence, paid-provider behavior and held-out
validation remain **unverified and unauthorized**; T08/T09 capabilities are absent
by scope. Early incremental red/green logs do not have separate complete dirty
source archives; the reported before/after/development evaluations do.
