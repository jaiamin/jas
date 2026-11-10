# T03 reusable environments

Ticket: [#14](https://github.com/jaiamin/ass/issues/14). Implemented on
`t3/add-reusable-environments` in the assigned isolated worktree. Ready for a
fresh integration review; this report does not claim parent acceptance.

## Acceptance

- [x] Store mechanics and named configuration examples independently of questions,
  populations/models/harnesses, conditions, replication and analysis.
- [x] Preserve optimistic revisions, atomic writes, validation and immutable
  experiment rules through library updates/deletion.
- [x] Keep catalog/Researcher/planner discovery, validation, editor/review, drafts
  and exports coherent; reject unsupported versions without adapters or resets.
- [x] Demonstrate two questions/populations sharing versioned mechanics, retaining
  independent study commitments and source-pinned rules, with execution/replay.
- [x] Verify independent permissions/privacy and keyless desktop/light and
  phone/dark reuse, draft recovery, accounting, lifecycle and export regressions.
- [x] Merge the latest accepted integration, commit with scanning/hooks, retain
  complete evidence and stop owned services. No push, PR or tracker changes.

Approved seams: public workflow HTTP API and browser workflow; the World
interface supplies independent rules/privacy/replay invariants. Existing
provider/accounting tests supplement settlement/lifecycle coverage. These are
already authorized by the task/spec; no additional seam or approval was needed.

## Contract and decisions

The library contract is `jas-environment-v3`; mechanics definitions are version 1.
Schema/export **6** follows accepted T04's v5. Definitions name an installed
world/rule version and contain named mechanical examples with unbound roles.
They exclude questions, actual populations/model assignments, participant
harnesses, memory choices, condition arms, replication and analysis commitments.
Extraction deduplicates identical mechanical setups, including harness-only
contrasts. Explicit experiment templates remain distinct from reusable sources.

`/api/design/environment` extracts mechanics; `/api/design/use-environment`
applies an example with explicit participant bindings while preserving the
study's other commitments. Without an existing design it starts a neutral
experiment. Catalog entries and Researcher capability results expose complete
built-in/custom source snapshots; custom discovery is bounded to 12 records.
Accepted integration's separate template-probe configuration remains available.

Immutable revisions embed the full `environment_source`, source revision and
content hash. Concrete experiment parameters remain authoritative and editable;
source examples establish provenance rather than live links. Library changes
cannot rewrite old or pending runs. Optimistic update/delete and atomic file
replacement remain enforced. Unsupported database schemas 4/5, library formats
v1/v2, definition versions and world-rule versions fail explicitly. No aliases,
conversions, data resets or World rule changes were introduced.

Editor reuse exposes examples/bindings and source review through existing stock
components/tokens. Browser drafts separately retain the library editing ID and
revision: changing world clears scientific provenance while retaining the
optimistic editing target across reload. Stale/deleted source drafts recover
without fetching a mutable replacement. Save-as-new remains explicit.

T09 owns solo/artifact worlds; current 2–12 constraints remain. No later World or
harness is implemented here. Researcher remains Pydantic AI
`openai:gpt-6.1-sol`; model participants remain `openai:gpt-6-luna`.
This T03 task made **zero paid requests; actual spend $0**. Synthetic provider
usage in keyless tests is accounting evidence, not spending. Other accepted
integration reports retain their own sources, allowances and observed results.

## Checkpoints and red/green evidence

| Slice | Retained evidence under `data/t03/` | Result |
| --- | --- | --- |
| Mechanics-only library | `tdd-01-red/`, `tdd-01-green/` | New public contract fails before implementation, passes afterward |
| Two independent experiments and immutable source | `tdd-02-red/`, `tdd-02-green/` | Different questions, populations/seeds and independent source-pinned rules |
| Extraction/catalog/neutral reuse | `tdd-03-red/`, `tdd-03-green/` | Built-in/custom sources use one contract without importing a study |
| Researcher discovery | `tdd-04-red/`, `tdd-04-green/` | Real capabilities operation returns reusable definitions and hashes; 24 focused checks pass |
| Browser draft identity after World switch | `tdd-05-red-corrected/`, `tdd-05-green-corrected/` | Reproduced 409 and lost update action; corrected rebuilt run passes all 12 reuse/workspace cases |

Independent API/World cases retain two populations executing **16 scripted
turns**, exact replay after library deletion, hidden-stock/schema parity,
role-based permissions independent of profile prose, rejected-action atomicity,
failed storage and competing optimistic edits. Applying mechanics preserves each
condition's model, direct/tool harness and memory. Full exports and owned test
workspaces remain in `final-backend-workspaces-03/` and earlier archives.

Implementation checkpoints: `121a959` mechanics, `d9fbb6a` discovery, `33277c5`
draft identity. Accepted integration merges: `15eebc2`, `4c5a745`, `a0a0d08`.
Final executable checkpoint: **`a0a0d08d17c060f4ce84177d95139ebec6890c15`**,
including latest observed integration
**`ff1567453cc119824bb4b3c03ceee1d73acdb9fe`**. Both independent discovery tests
were retained when merging; the later copied-probe fix merged cleanly. No
unaccepted branch was merged. The final documentation commit changes only this
report, progress and handoff; `final-source/source.json` records its exact HEAD
and verifies executable/test inputs are unchanged.

## Before/after identities

Both sources are clean, source-stable and use the unchanged T01 DEVELOPMENT v1
cases, FunctionModel harness, runtime and low-effort envelope.

| Identity | Before | Latest after |
| --- | --- | --- |
| HEAD | `b7e5b1540ff9ccf63761a482a4288eed1ad8be4a` | `a0a0d08d17c060f4ce84177d95139ebec6890c15` |
| Input tree SHA-256 | `a3b25f2ae4c3fec059d513408d513ad33ce62cbd6a41f0cc542290230d852c81` | `20bbcdb86d6aa955665d503ad924680fc01c4b887f13e1e38830fa2df7339194` |
| Source archive SHA-256 | `00f1f19ba177b541b74722c689a2ea25a51aaefafd0affefdfe1d3bcc0482289` | `3422084313b5a25322ac03493bf059387595f7c420e946ab214cfd5f87f88d4d` |
| Backend SHA-256 | `0b9328212b8584788a16af3b03c17b50f4a0535066d238aef590ca15ad867de2` | `44ee51eb145003d57a52f81a4c80bda490b9a0d0565c09eba288a398d1b8d405` |

Case SHA-256: `6e4f138cf31d32b8a5e28e348edbccc2e9b1308b62f8b274d39cf0f24ba33a6e`.
Frozen harness SHA-256:
`b6438d9fa3390d05f4f3c5583aa1e0e6f2095d1db653060257cdc817138a5826`.
Raw paired runs: `before/`, `after/`, `after-final/`, `after-latest/`.

The frozen v4 export oracle intentionally fails four `export-v4` checks and the
four consequent terminal `passed` flags under v6. After/comparison commands
retain exit **1**; no other check regresses, and per-case usage matches. Current
API/export/browser checks positively require v6. No historical case, harness or
score was edited. `direct-action-parity-latest.json` independently verifies all
**22 recorded turns**: observations, decisions, checkpoints/hashes, final states,
metrics, behavioral events and usage match. Event database IDs are explicitly
excluded from the behavioral event comparison. The comparison is deterministic
regression evidence, not a competence gain or fresh held-out evaluation.

## Observed verification and inherited attribution

Before source `b7e5b154`: **948 backend**, **106 frontend**, production frontend
build and **7 affected browser** checks pass, in `before-*` archives/logs.
The six frozen API cases pass with 22 scripted requests and 98 HTTP operations.

Fresh latest-source observations at clean `a0a0d08`:

- **1,008 backend tests pass** in 103.10s (`final-backend-03/`, XML and preserved
  test workspaces). This includes inherited accounting, cancellation, pause,
  restart, lifecycle, private observations, replay, library and export checks.
- **8 affected browser checks pass** (`final-affected-browser-01/`), covering
  Researcher persistence and both reuse/draft lifecycles.
- **2 real participant-policy browser flows pass**, desktop/light and phone/dark
  (`inherited-policy-browser-01/`). These are fresh runs of inherited T04 flows
  with deterministic provider responses, current v6 exports and exact replay.
- Ruff and normal `uv run ty check` pass (`final-ruff-03/`, `final-ty-04/`).
- Final image build/non-root production smoke, actual containment qualification
  and two-question/two-population reuse/export smoke pass (`production-build-03/`,
  `production-smoke-03/`). Production sends no model requests.

At clean `4c5a745`: **all 178 browser tests pass** in 6.5 minutes, with no
unexpected, skipped or flaky cases (`final-browser-02/`); **108 frontend tests**,
frontend lint and TypeScript/production build pass (`final-frontend-03/`,
`final-lint-02/`, `final-build-04/`). All frontend source/test/config/lock inputs
and served assets are identical in `a0a0d08`; `frontend-input-parity.json` and
`final-build-inputs.json` record every hash. The full 178-test run and frontend
results are attributed to `4c5a745`, not represented as fresh executions at the
later merge. Latest-source affected browser/policy runs supplement them.
Desktop/light and phone/dark final reuse and policy captures were inspected.

Earlier full checks at `d9fbb6a` (1,006 backend/108 frontend) and `4c5a745`
(1,007 backend) remain separately attributed. Historical T01/T04/T05 reports and
production qualifications remain historical; they are not relabeled as this
slice's fresh evidence. No hosted CI was run or claimed. No workflow, shell
script, dependency, runtime, mount, credential or security configuration changed.
Project-local uv 0.13.7 under `.tools/uv` avoids the system uv page-size crash;
frozen dependency installs pass without lockfile changes or global installs.

## Retained failures, artifacts and limits

Every attempt remains under ignored `data/t03/`. Non-green development attempts
include the expected API/UI tracer failures; two old frozen-oracle test
expectations (`backend-focused-01/`); an incomplete independent Action fixture
(`backend-focused-02/`); four changed template/mechanics URL oracles and a mobile
cumulative timeout (`browser-affected-01/`); one neutral-experiment-title oracle
(`final-browser-01/`, 175 passes); the initial wrong template key in `tdd-05-red/`;
a TypeScript narrowing error (`final-build-02/`); and the premature browser run
against the previous build (`tdd-05-green/`). The mobile trace showed time spent
before the update click; its long lifecycle uses 60 seconds with the same
behavioral assertions. `browser-affected-01/` also changed source during the run
and is diagnostic only. Clean final runs supersede it. A wrapper-injected
PYTHONPATH changed ty import resolution (`final-ty-01/`); the standard command
passes after removing that injection. No checks were weakened or disabled.

`data/t03/manifest.json` indexes exact commands/exits, source/case identities,
archive/log hashes, browser reports, failure notes and every artifact digest.
Source archives, API operations, exports, SQLite workspaces, provider evidence,
XML/JSON, failed traces, inspected captures and ignored utility scripts are all
retained. `final-source/` captures the final clean handoff source and product-input
parity. **Preserve the entire ignored directory before any future cleanup**;
ignored paths alone are not external durable storage. Parent owns fresh merger
review, artifact preservation and any later publication.

All three owned production containers and image tags are stopped/removed;
Playwright shut down its owned browser backends. Port **18114 is closed**
(`cleanup.json`). No preview session was opened. No stash or `pbcopy` was read,
changed or copied; no other worktree was modified or cleaned. No paid calls,
resets, publication, tracker actions or later-ticket implementation occurred.
Live provider behavior, Researcher/participant competence, held-out acceptance,
solo/artifact worlds and broader milestone claims remain unverified. **T03 spend $0**.
