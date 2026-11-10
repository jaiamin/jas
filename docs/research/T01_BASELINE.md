# T01 current-workflow baseline

Ticket: [#12](https://github.com/jaiamin/ass/issues/12). Scope: baseline tooling,
independent DEVELOPMENT fixtures and evidence only. Product behavior is unchanged.
The starting source is integration commit `b02536cbe2f298668a72fa336d63dad7336a696d`.
The baseline uses the approved HTTP workflow seam with real disposable SQLite,
world settlement, accounting and replay, replacing only the external provider.

## Reproduce without spending

Use Python 3.13+, Node 24+, pnpm 12 and the committed locks. From a clean source
checkpoint in the assigned checkout:

```sh
uv sync --frozen
pnpm --dir frontend install --frozen-lockfile
uv run python -m benchmarks.research_baseline --output data/research-baseline/before
uv run ruff check backend benchmarks .github/scripts
uv run ty check
uv run pytest --junitxml=data/research-baseline/backend.xml
pnpm --dir frontend lint
pnpm --dir frontend test
pnpm --dir frontend build
JAS_TEST_PORT=18112 pnpm --dir frontend test:e2e
```

The runner refuses existing output directories, never loads `.env`, clears both
provider keys and disables live Pydantic AI model requests. The normal
FunctionModel boundary supplies scripted decisions with synthetic usage. Model
labels remain Sol for the Researcher and Luna for participants; neither model
is actually called. Exported charges are synthetic accounting evidence, not
spending. There is no live mode or paid budget inferred here.

Each output contains `manifest.json`, `report.json`, an exact `source.tar.gz`,
`attempts.jsonl`, numbered HTTP `operations.jsonl`, installed `catalog.json`,
`settings.json`, normalized designs, preflight results, complete `jas-study` v4
exports including provider traces, and an owned SQLite database. The archive
contains tracked and nonignored working files, including fixtures, locks,
tests and frontend inputs. The manifest records HEAD, working changes,
per-file hashes, full tree/archive/backend digests, case digest, runtime versions,
harness code digest, effort settings, per-attempt usage and terminal run errors.
Source stability is checked again before completion. Preserve whole directories;
their ignored paths alone are not durable evidence storage.

## Independently specified DEVELOPMENT cases

[research-cases.json](../../benchmarks/research-cases.json) is a new, public,
versioned case set, authored before its first execution from the accepted study
requirements and worked outcomes. It neither imports nor changes historical
case families, held-out tasks or scores. These six cases are development inputs,
never fresh held-out validation. All attempts and oracle corrections remain
visible; current limitations are part of each case.

| Case | Independent current-workflow check | Accepted milestone still unproved |
| --- | --- | --- |
| `simple-binding-split` | Fourteen-credit pie, offer five, accept: two turns, balances 5 and 9; one descriptive condition is valid | Live Researcher ability to choose a simple design |
| `three-signal-disclosure` | Three perfect signals, reward seven: each earns seven; private/public observations expose zero/three signals; exact replay | Distributed evidence retrieval and joint artifact work; phased delivery/conflicts |
| `four-feasible-promises` | Four endowments of six; round-one contributions two each give payoff eight each. Round two contributions 0/3/3/3 give dividends 4.5 and final balances 18.5/15.5/15.5/15.5; four feasible promises, three fulfilled | Rich voluntary reliance, persistent plans and participant-chosen verification |
| `six-token-permissions` | Only a has authority despite everyone's role label; allocation four to b, eight retained, five workers earn two each; shared output ten | Atomic resource-consuming artifact/dependency workflow across 6–12 agents |
| `solo-evidence-gap` | One-profile design is rejected specifically at profiles, with zero requests | One participant reading authorized versioned evidence, retaining a source-linked plan, checking it and updating an artifact |
| `persistent-artifact-gap` | Unknown artifact environment is rejected specifically at environment, with zero requests | Owner-scoped read/write, consequential content/version changes and complete restoration |

For future solo acceptance, independently require an allowed measurement to be
retrieved with source/version, a denied private document to stay inaccessible,
and a checked update to survive pause/replay. For the three-agent task, give
each actor a distinct required fact and compare with an all-facts-shared control;
verify recipient/cutoff delivery and an output requiring all three facts. For
four-agent reliance, require a freely chosen dependency, an affordable promise,
a feasible alternative/breach and recorded downstream consequences. For the
institutional task, couple a finite resource, a permitted artifact update and
prerequisite completion; a failed authorization/resource check must change none
of them, and restore/replay must retain the same state. These checks are
specified development targets, not capabilities established by token proxies.

Unsupported schema rejection does not assess natural-language recognition of an
unsupported request. Scripted legal choices do not assess participant discretion,
Researcher competence, claim entailment, isolation of generated code, or model
intelligence. All live and held-out milestone gates remain unverified.

## Inherited before/after procedure

1. Before changing each ticket's behavior, commit its starting source and run
   the keyless runner into a new directory; retain the relevant inherited
   backend/browser/frontend logs with their exact commands, exits and source.
2. Specify the new behavior's public API regression and independent World or
   accounting oracles before implementation; record its red/green cycle. Add
   fresh development variants separately from final held-out validation.
3. Implement and commit, then rerun the same case version, harness digest,
   runtime and effort envelope into another directory, plus the affected
   inherited regressions and the new behavior's checks. Browser lifecycle uses
   an owned temporary workspace/unique port, never user data.
4. Compare the two reports:

   ```sh
   uv run python -m benchmarks.research_baseline --compare \
     data/research-baseline/before/report.json \
     data/research-baseline/after/report.json \
     > data/research-baseline/comparison.json
   ```

   Comparison rejects different case/harness/runtime identities, missing or
   duplicated cases, changed check sets and source changes during a run. It
   lists every check regression/improvement, before/after failure and per-case
   stop/usage pair. A nonzero exit blocks unexplained adoption; an aggregate
   gain cannot cancel a privacy, replay, accounting or workflow failure.
5. Retain intentional contract changes as explicitly reviewed differences with
   their new positive checks. Version genuine oracle/case corrections and rerun
   **both** sources with the corrected harness; never overwrite old attempts or
   call a repaired trial fresh validation. Preserve raw attempts if a failure
   prevents comparison. Repeat relevant live comparisons only after a specific
   allowance, recording every request/tool operation/stop and keeping competence
   and correctness separate. No paid command is part of this ticket's procedure.

## Preserved prior art

Stash `f771128ba1c9295262a4073df40cc25647b1370f` remains untouched. Its parent
is `7cb3279bf2a0396da87536e16610eaac56539ce3`. Inventory:

| Stored file | Identity and scope |
| --- | --- |
| `assistants.py` | 27 added / 2 removed lines; imports draft research tools, expands general instructions and splits response schemas. SHA-256 `5bd378879671f36184c718e0967d20d08e5ab718127040d2cb4c800a2a83f6db` |
| Untracked `research_tools.py` (stash third parent) | Catalog/method/probe request schemas, static methods advice, hypothetical preflight/workload/commons payoff and optional scripted-step helpers. Blob `ad917627b927d818e884dd1d531c9940cb038684`; SHA-256 `37e24e405703b4720fdbde7baf76ce81618df11512bd10e90b2bf9291f1f7d55` |

There is no implemented assistant request loop in that patch, no independent
qualification/tests, and no generated-code containment proof. Its prose includes
superseded population/interpreter claims. None of it is imported, exercised or
credited as baseline capability. Inspect later as prior art; do not apply/drop it.

## Observed evidence

Implementation and final baseline/check evidence are recorded below after the
source checkpoints are committed. Live requests and actual spend: **zero**.

- On clean `b02536c`: inherited backend **931 passed** (48.78s), frontend
  **106 passed / 29 files**, frontend lint and production frontend build passed.
  Raw logs: `data/research-baseline/setup/`.
- `/usr/bin/uv sync --frozen` failed before resolution (exit 134): jemalloc
  unsupported 16 KiB page size. Project-local `uv 0.13.7` installed with
  `python3 -m pip install --target .tools/uv uv`; `.tools/uv/bin/uv sync --frozen`
  passed. Substitute `.tools/uv/bin/uv` for `uv` in this sandbox; locks unchanged.
- New API tracer: missing runner → red; six retained API cases → green. First
  executable attempt had a runner arm-order defect, retained in
  `setup/api-attempt1/`; fixed by condition identity without changing case bytes.
- Failure-retention tracer: red (runner resumed a failed step) → green (one
  unknown reservation, no automatic retry, zero turns, retained export). The
  test expectation was corrected to the established sanitized `RuntimeError`
  error contract; product error disclosure was unchanged. Raw red artifacts:
  `setup/provider-failure-red/` and `setup/tdd-*.log`.
- Comparison tracer: absent comparator → red; per-check regression reporting,
  retained failures and rejected incomparable case sets → green. Terminal
  `passed` failures are retained alongside individual failed checks. Current
  focused result at the first checkpoint: **3 passed**.
- Disconnect-retention tracer: a simulated API transport disconnect initially
  aborted the runner → red; the failed attempt/operation now persists with
  unknown usage and the remaining cases continue → green, **4 passed**. An
  unexpected failure after save also retains a best-effort partial export.
  Logs: `setup/tdd-red-disconnect.log`, `setup/tdd-green-disconnect.log`.
- The full owned keyless Chromium suite passed: **165 passed**, zero unexpected,
  skipped or flaky tests (338.46s). It ran against the unchanged production
  backend/frontend with `JAS_TEST_PORT=18112`; Playwright shut down its server.
  Log with JSON results: `setup/browser.log`.
