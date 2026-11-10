# T05 bounded Researcher operations

Ticket: [#16](https://github.com/jaiamin/ass/issues/16). Branch:
`t3/researcher-probes`, prepared from clean integration
`7d16d8a4f1aa041a840681468cc7b645918b5fc3` on Linux/aarch64 in the assigned
Docker worktree. Implementation: `504d7561dd36c1fbf19ba2f9bf7fc535551ccde9`.
Latest integration `8f83a36bc0428abda418b93557f689657ce030ae` was merged without
conflicts as `5b70116867410ae0d2b1cd17f6b3ef090e4bb6d7`; combined-source checks
below qualify that clean commit. The final handoff commit changes documentation
only. No publication, tracker changes or spending occurred.

## Acceptance

- [x] Capture an unchanged source/case-stamped keyless baseline before edits.
- [x] Keep Pydantic AI/Sol and dispatch real capability, context and probe work.
- [x] Retrieve eligible durable proposals/artifacts with declared scope/cutoffs.
- [x] Return trusted-world observations, legal schemas and hypothetical effects
  from isolated copies without study saves, source changes or participant calls.
- [x] Retain public operations, sources, results, failures and stopping through
  streaming, reload, reconnect, restart and the planner handoff.
- [x] Preserve ordinary answers, original questions, honest unsupported outcomes,
  drafts, one pending chat turn and separate accounting for each model request.
- [x] Retain red/green development evidence, inherited comparisons and browser
  checks; include the latest integration tip and stop owned services.

Approved seams: public workflow HTTP API primary; independent World and
provider/accounting invariants supplement it. Deterministic fixtures establish
orchestration/mechanics, never live intelligence or fresh held-out acceptance.

## Delivered behavior and limits

`research_tools.py` dispatches `capabilities`, `context` and `probe` through the
existing general and scoped-investigation loops. Capability results inspect the
actual trusted catalog, parameters, measures, rule versions and implemented
mechanics. An absent environment is a retained rejection.

Context is frozen before the current turn and restricted to the same chat and
exact selected study/run scope, with compatible captured cutoffs. It considers
50 prior terminal records, initially indexes 12, searches questions for up to
eight matches, and retrieves selected proposals or operation artifacts. Older
eligible proposals remain retrievable beyond the short conversation window.
Recorded prose stays untrusted data. Source IDs/content hashes identify inputs.

A probe accepts an installed template/configuration, an eligible prior proposal
condition or a selected checkpoint at/before its frozen cutoff. It uses copied
trusted Worlds and up to eight explicit hypothetical actions, validated/settled
through the normal legal schema and rules. Each transition uses a fresh candidate
so rejection has no accepted effects. Results include actor-projected observations,
legal schema, events/measures, source/design/checkpoint hashes, and stopping.
No Engine, study save, participant provider or generated-code execution is
reachable from this dispatcher. T02 qualification does not admit its candidates
to these probes.

Three batches of up to four operations are followed by an answer-only fourth
model request; identical operations reuse their result. Every model request has
its own existing reservation/settlement, including failures and unknown usage.
Provider failure stops without retry/substitution. The version-1
`Analysis.output.research` envelope retains pending/completed/rejected/failed
operations and stop reasons. This additive output requires no database, world
or export migration/reset. Defaults remain Sol Researcher/Luna participants.

Ordinary questions need no protocol. On design intent, the unchanged original
question and retained `research_operations` reach the validated planner,
separately from web research. Existing Activity/Trace disclosure exposes public
work, results and source links/hashes; no generated UI primitive or theme change
was needed. SSE decoding, caller types and fixtures follow the envelope.

## Source-stamped inherited comparison

Both comparisons use untouched T01 DEVELOPMENT v1 cases and harness:

- Case SHA-256: `6e4f138cf31d32b8a5e28e348edbccc2e9b1308b62f8b274d39cf0f24ba33a6e`.
- Harness SHA-256: `b6438d9fa3390d05f4f3c5583aa1e0e6f2095d1db653060257cdc817138a5826`.

| Artifact directory | Clean source | Full input tree SHA-256 |
| --- | --- | --- |
| `data/t05/before/` | `7d16d8a` | `feb91d03dfef864bfe4952236dd4b5c8b50af6950c6ec9d97813083713bbdb65` |
| `data/t05/after/` | `504d756` | `bf432460eb25fba8cb71617e78532e34f93a9653b876e96d80622a718b5b29ce` |
| `data/t05/after-merge/` | `5b70116` | `5d26904d62e0ad374a4498c2c6ebff711e38364eaf5a45a039738517f5fac391` |

Each directory retains its source archive, per-file manifest, attempts, HTTP
operations, disposable database and exported evidence. Source stability passes
in all three reports. All six cases pass with unchanged stops/usage and 22
scripted participant requests. Read-only polling differs: 105/103/104 HTTP
operations. `comparison.json` and `comparison-merge.json` both exit 0 with no
regressions, improvements or before/after failures. These null inherited results
are separate from the new behavior's development improvement. Frozen historical
suites/scores and final held-out cases were not edited or used for tuning.

## Actual development red/green

Fourteen independent API cases exercise discovery; same-chat artifact retrieval;
fourteen-credit bargaining (offer five, accept: 5/9); cutoff enforcement and
rejection atomicity; unchanged/advancing source runs; old proposal search/probing;
original-question handoff; unsupported sources; deduplication/request limits;
failure/unknown charges; reconnect and restart.

Final development case SHA-256:
`f0f24de0ad9048ef2523156ddb8e459387679a36a0e06fb65f5708bdb283a3d0`.
Original incremental red/green logs remain in `data/t05/checks/`. An additional
controlled replay archived the final tests with pre-T05 `assistants.py` and
`planning.py`, then restored clean `504d756`: **14 failed → 14 passed**. This is
an orchestration replay with the remaining final T05 source, not the untouched
original checkout or live competence.

| Replay | Archived input tree SHA-256 | Result record |
| --- | --- | --- |
| Red | `6f904064c945797c8b7a00768598498cea5ae4b52b6a40c27495d770f346c4c2` | `checks/development-red2/check.json` |
| Green | `bf432460eb25fba8cb71617e78532e34f93a9653b876e96d80622a718b5b29ce` | `checks/development-green-r2/check.json` |

Both sources stayed stable, with identical case/wrapper hashes. Raw analyses,
source-run evidence and XML are in `development-red/` and `development-green/`;
`development-comparison.json` lists all 14 outcomes, zero regressions. Fresh
merged-source capture passes 14/14 in `checks/development-merged-r2/`, with raw
records in `development-merged-r2/`.

## Observed checks

Commands run from the repository root. Check directories below are under
`data/t05/checks/`, retaining exact commands, exits, hashes, logs and source
archives. Every qualified source stayed stable.

| Check | Clean `504d756` | Clean merged `5b70116` |
| --- | --- | --- |
| `.venv/bin/pytest -q` | 949 passed, 50.77s (`backend-final-r2`) | 961 passed, 113.86s (`backend-merged`) |
| `.venv/bin/ruff check backend benchmarks .github/scripts` | Passed (`ruff-final-r2`) | Passed (`ruff-merged`) |
| `.venv/bin/ty check` | Passed (`types-final-r2`) | Passed (`types-merged`) |
| `pnpm --dir frontend lint` | Passed (`frontend-lint-final-r2`) | Passed (`frontend-lint-merged`) |
| `pnpm --dir frontend test` | 108 passed (`frontend-test-final-r2`) | 108 passed (`frontend-tests-merged`) |
| `pnpm --dir frontend build` | Passed (`frontend-build-final-r2`) | Passed (`frontend-build-merged`) |
| Keyless Chromium, `JAS_TEST_PORT=18116` | Full suite: 169 passed, 5.8m (`browser-final-r2`) | 14 affected flows passed, 51.4s (`browser-merged`) |

The merged browser run covers `researcher-tools.spec.ts`, `streaming.spec.ts`
and `extensions.spec.ts`. T05's four light/dark, 390/1440px cases inspect public
results/sources/stopping and restore the follow-up draft after reload without a
second POST. Screenshots are in `data/t05/browser-merged/`; phone/light and
desktop/dark captures were visually inspected. The earlier full browser run is
not claimed as a fresh full merged-source run. T02's production smoke is inherited
from its integration report, not rerun here; T05 adds no runtime/container/workflow
dependency. `git diff --check` passes.

Failures/repairs remain visible: incremental indentation/capability-oracle/pytest
parameter/locator corrections; two additive activity assertions repaired before
a 94-test focused pass; four duplicate-summary/JSON browser locator failures in
`browser-first-failure/`; and two interrupted screenshot animation wait timeouts
in `browser-animation-wait-failure/` (fixed by waiting only on the relevant
disclosure). The first wrapper invocation treated `--` as an executable. A runtime
restart interrupted early final checks; directories without `check.json` remain
incomplete, never passing evidence. An extra merged raw-capture invocation had
13 failures/one pass because its output directory was missing
(`checks/development-merged/`); preparing a new directory fixed the invocation,
without test/product edits. No checks were weakened. All attempts are retained.

## Reproduction and handoff

Follow [T01's procedure](T01_BASELINE.md) for inherited comparisons. The local
wrapper `.tools/t05/check.py` is preserved as `data/t05/harness/check.py`:

```sh
.venv/bin/python -m benchmarks.research_baseline --output data/t05/new-attempt
.venv/bin/python -m benchmarks.research_baseline --compare \
  data/t05/before/report.json data/t05/new-attempt/report.json
mkdir data/t05/new-development
JAS_T05_EVIDENCE=data/t05/new-development .venv/bin/python .tools/t05/check.py \
  new-development -- .venv/bin/pytest backend/tests/test_researcher_tools.py -q
```

Choose unused output names: evidence is not overwritten. System uv has the
recorded 16 KiB-page crash; `.tools/uv/bin/uv sync --frozen` passed after merging
T02. Preserve **all of `data/t05/`** before worktree cleanup. `checks.json` indexes
completed/incomplete attempts; `artifact-manifest.json` records raw file hashes.
The parent owns copying evidence, the fresh merger and the single draft PR #32.

Playwright reported server shutdown and port 18116 refused connections after
completion. Stash `f771128ba1c9295262a4073df40cc25647b1370f` remains untouched.
No secrets were read, live requests made, paid funds spent, branch pushed, PR
created or issue changed. Live Researcher competence, participant discretion,
generated mechanics and held-out validation remain unverified or later-ticket
work; T05's deterministic implementation criteria pass.
