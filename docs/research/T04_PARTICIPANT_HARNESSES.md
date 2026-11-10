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
- [ ] Run inherited/new checks, retain red/green evidence and a same-input
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
Next: immutable-source paired comparison, final checks and integration merge.
