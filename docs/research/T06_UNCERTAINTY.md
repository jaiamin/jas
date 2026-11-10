# T06 failure-aware comparisons and uncertainty

Accepted by fresh integration review at no-ff merge
`aaf3a1522b371e68af845243854d581d48d1fc39`, from ticket HEAD
`20c7b020b88f64e153f8138adf59be7691b34f12` onto
`ff1567453cc119824bb4b3c03ceee1d73acdb9fe`. The fresh merger observed 1,007
backend tests, 109 frontend tests, 42 shared browser flows and two actual harness
flows passing. The current contract is schema 5 / export 6. See
[fresh acceptance and custody](#fresh-integration-acceptance-and-custody) below;
earlier observations describe the ticket branch, not a fresh rerun.

Ticket: [#17](https://github.com/jaiamin/ass/issues/17). Implementation branch:
`t3/t06-uncertainty`, prepared at integration source
`b7e5b1540ff9ccf63761a482a4288eed1ad8be4a`. Linux aarch64 Docker Sandbox,
16 KiB pages; assigned checkout only. No paid calls, descendants, extra
checkouts, publication, tracker changes or credential/security changes.
Root stash `f771128ba1c9295262a4073df40cc25647b1370f` is preserved untouched.

## Acceptance and plan

- [x] Preserve condition-specific planned, attempted, complete, failed,
  interrupted, excluded and unmatched counts and inspectable cell reasons.
- [x] Declare matching and inference units, observed support and dependence.
- [x] Withhold unsupported uncertainty; disclose small-sample limitations.
- [x] State selection assumptions and bounded sensitivity or nonidentification.
- [x] Concise results UI; cutoff-scoped read-only analysis and export provenance.
- [x] Independent API red/green cases, inherited baseline/development comparison,
  relevant backend/frontend/accounting/lifecycle/export and browser checks.
- [x] Merge latest accepted integration tip, resolve current contracts, verify,
  commit clean checkpoints and stop owned services.

Sequence: freeze expected outcomes and before evidence; implement one public API
slice at a time; update existing results UI and browser/export lifecycle; integrate,
verify, record all observed results and limitations. Raw attempts, source archives,
case identities, logs and hashes live under ignored `data/t06/`; preserve it.

## Independently specified development expectations (before implementation)

Approved seams: existing study/save/run/control/results/export and chat APIs,
real temporary database/engine/world; replace only the external model provider.
Supplement with existing replay/privacy/accounting checks. These DEVELOPMENT
cases are not held-out or live-model evidence.

1. **Missing arm:** two conditions, two seeds, one repetition, contribution-rate
   outcomes A=(0,1), B=(1,failed). Observed A mean=0.5, B=1; the single observed
   matched difference is +1, not +0.5. B has planned=2, complete=1, failed=1,
   excluded=1. A has one complete run unmatched with B. Planned-sample difference
   can be 0 through +0.5 under enforced rate bounds [0,1]; no missing outcome is
   recorded as zero. No confidence interval or full-sample effect is identified.
2. **Interrupted/unattempted:** pause after one decision in one arm and leave
   another ready. Preserve both planned cells with different reasons, no terminal
   estimates from partial evidence; attempt counts distinguish them.
3. **No pairs:** all arms unavailable or disjoint complete seeds. Retain every
   planned condition/measurement/contrast with null means and zero pairs rather
   than dropping the comparison. Rates can have broad bounds; unbounded payoff
   has an explicit lack of identification.
4. **Small/repeated support:** one seed with several repetitions/agents/turns
   supplies one observed seed cluster; two or three fixed seeds do not establish
   independent population sampling. Three equal outcomes must not become a
   zero-width confidence claim. Additional decisions/repetitions do not increase
   the number of seed clusters. Observed within-seed repetition means receive
   equal weight across observed seeds.
5. **Missing repetition:** seed 7 has two planned pairs (+1, unavailable), seed
   11 has two pairs (0,0). Observed seed-weighted difference=0.5; planned-sample
   bounds=[0,0.25] when the missing pair has A=1 and B in [0,1]. Report observed
   pairs=3/4 and clusters=2, never 3 independent replicates.
6. **No eligible metric:** completed run with no eligible report/commitment
   denominator remains complete but excluded for that metric; null is not zero
   and an undefined endpoint has no fabricated numeric outcome/bound.
7. **Frozen analysis:** capture unfinished/failed/ready cells and terminal metric
   support at submission. Complete a run and save a new revision while the
   Researcher response is pending. The persisted analysis/export must retain
   original matrix identity, cutoffs, statuses/reasons and calculations. Reads,
   reloading and export must not append evidence or participant requests.

## Decisions

- Existing protocols declare fixed seeds/repetitions but no population sampling,
  treatment randomization or independent-provider-sampling contract. All current
  intervals are withheld with that reason, independent of a seed-count threshold.
  Observed cluster counts are not certified independent sample sizes. No new
  design or inference-policy surface is introduced by T06.
- Matching cell: immutable revision × seed × repetition. Inference candidate:
  seed cluster within a revision (repetitions averaged); interacting agents and
  decisions are dependent within a run. Comparisons use the first condition as
  baseline and observed complete metric-eligible matched cells only, explicitly
  labeled as selected support. Broad causal/population claims remain unsupported.
- Sensitivity uses only enforced metric bounds, equal planned repetitions within
  each seed and equal planned-seed weights. Bounds are deterministic possible
  planned-sample means/differences, not confidence intervals or imputed evidence.
  Undefined eligibility/unsupported-range metrics with missing outcomes receive
  an explicit limitation. Fully observed finite endpoints have exact planned
  sample values; that does not identify population uncertainty.
- No T07 exposure tracing, T15 policies or T19 claim lenses. Models stay Sol
  Researcher and Luna participants. No historical suite/score edits.

## Attempts and checks

Environment/ancestry and clean starting branch observed. No owned work reset.
Initial exploratory lookup of nonexistent `interpretation.py` exited 2; located
the existing calculations in `assistants.py` instead. A combined tooling lookup
exited 2 because this new worktree had no `.venv`/`.tools`; Node 24.22.2,
pnpm 12.18.0 and Python 3.13.5 were present. A subsequent git-config lookup
exited 1 because no custom hooksPath was configured. No source was changed by
these discovery commands. Installed project-local uv in `.tools/uv` (exit 0),
avoiding the known system uv crash; raw log `setup/uv-install.log`.

Observed first checkpoint (all keyless, starting integration ancestry unchanged):

- T01 inherited runner before: six passing cases, zero live calls; complete
  source/cases/attempts/exports under `before/` and command provenance under
  `baseline-before/`. The frozen historical runner is unchanged.
- Missing-arm API red (`KeyError: comparison`) → green, 1 passed. Both full HTTP
  transcripts retained. Analysis fixture's first attempt lacked FunctionModel
  streaming and timed out; corrected provider boundary then produced the intended
  missing-comparisons red → green, 2 passed. Both failed attempts are retained.
- Seven independent small/repeated-support, interruption, missing-repetition and
  undefined-eligibility cases passed. The written missing-repetition upper bound
  was corrected from 0.5 to 0.25 before tests: 0.5 is the seed-7 upper mean, which
  receives half the planned weight alongside seed-11's zero. No outcome changed.
- Inherited focused tests initially: 86 passed, 1 failed due to an extra evidence
  read introduced while freezing sample membership. Reused the current captured
  checkpoint; unchanged deduplication regression now passes. Repaired result:
  **87 passed** across API, research, metrics, exports, assistants, chats and
  streaming. Old confidence-interval assertions were intentionally updated to the
  withheld contract; numerical means/matching/replication assertions remain.
- Static first attempts found line-length issues and nullable provider-call
  keys/turns; repaired without suppressions. Ruff and ty then passed. Full logs
  and source archives are preserved for all these attempts.
- UI disclosure red → green: 3 study tests passed, including counts and reasons
  before any completed outcome. Frontend TypeScript/production build passed.
- A fresh three-condition oracle exposed counting B as unmatched to C even
  though only A-versus-B/A-versus-C are planned. Red retained; fix counts each
  nonbaseline condition against its baseline only. Verification is recorded in
  `green-multicontrast/`.
- Installed UI/library skills used: impeccable, interface-design, shadcn,
  vercel-react-best-practices, find-docs; scoped implementation uses existing
  product/design context and stock table/disclosure patterns. Official React,
  Pydantic AI and shadcn/Radix docs are retained under `setup/`. Impeccable context
  succeeded; no visual redesign, new dependencies or paid image generation.

Exploratory glob `docs/EXPORT*` did not exist (exit 2); used DEVELOPMENT.md and
exports.py instead. One patch missed a formatter-changed function signature and
made no edit; reapplied at a stable nearby assertion. No failed attempt was
discarded.

Second checkpoint (including accepted T05 tip
`39491def73da7334164ca6d98896eaa03a2e5bf5` at merge `684d161`):

- T05-focused backend: 52 passed; full backend: **970 passed** (113.55 s).
  Frontend lint, **109 tests / 29 files**, TypeScript and production build passed.
- The new real-API browser flow passed at light/dark and 390/1440 widths:
  keyboard disclosure, planned counts, missing pairs/bounds, actual export
  download, immutable old revision and zero requests. The full inherited browser
  suite then passed **178 tests** (414.66 s), including those four cases. Source
  stayed unchanged throughout every recorded check. Screenshots and downloads
  remain in `browser-new-artifacts/` and `browser-inherited-artifacts/`.
- Shared preview navigation timed out and its snapshot returned “No preview
  automation host”; after these two failures the installed agent-browser
  inspected the task's read-only summary/detail successfully. That session was
  closed; the owned shared preview tab was also closed. Errors and manual
  screenshots/logs remain under `setup/`.
- Export contract red required a version bump for changed comparison semantics.
  T06 chooses **v6**, reserving T04's concurrent v5 activation contract. The first
  green attempt exposed inherited baseline assertions still requiring successful
  v4 reports; fixed only current tests, never the frozen runner/cases. The full
  backend pass includes those repairs.
- Frozen T01 after run (`after-pre-t04/`) executed all six cases. Four workflow
  cases fail **only** its historical `export-v4` assertion; the two expected
  schema-rejection cases pass. Its comparison exits 1 for those four contract
  flags and resulting `passed` flags. All other workflow, privacy, replay and
  accounting checks pass, with unchanged synthetic request usage. Preserve this
  intentional difference; it is not a fresh all-green baseline score.
- Independent review oracle `complete-payoff-v1` froze A=20, B=40, difference=20
  before execution. It exposed wrongly withholding an exact finite sample value
  when no missing outcomes exist. Script red and durable API red → green retained;
  the complete new API set then passed 9 cases. Population intervals remain
  withheld. Only missing outcomes require an enforced range.
- Independent one-microdollar-ceiling case exposed attempted=0 for a failed
  reservation with no sent request. First test attempt incorrectly searched for
  “budget” instead of the existing “spending ceiling” message; corrected the
  expectation, observed intended red, then green. Study and failed analysis/export
  now retain an execution attempt without inventing a provider request or cost.
  A discovery glob `test_accounting*` did not exist (exit 2); used existing
  `test_llm.py` and lifecycle coverage. All failed attempts remain archived.

Integration checkpoint includes T04 integration tip
`48600d2982516210e6a4e28528d2e1c6f1fd155e`. Retained schema 5, setup format v2,
activation journals, model/request links, and T05 research activity alongside T06
snapshots. Chose current export 6 and updated its API/participant/browser callers;
T04 historical evidence stays untouched. Merge conflicts were limited to shared
imports, export versions, frozen-baseline assertions and current-contract docs.

- New paused-after-unsent-failure oracle first failed as expected: disposition
  alone lost the attempt after Pause. The merged current contract now uses T04's
  durable activation membership. Pausing ready B invents no attempt; pausing
  failed A retains one, independent of requests/cost. Public API red → green,
  **89 focused tests passed**, including T04 participant and inherited baseline.
- Pre-merge checkpoint: 54 API/baseline/new tests and ty passed. Ruff found two
  newly long lines; wrapped them and reran successfully. Both logs retained.

## Ticket-branch verification (inherited by merger)

The ticket was handed off complete for fresh integration review. Latest included
accepted integration tip is
`350359fc2e9d3dce6ed157149ec50a3293e0f276`, merged at
`11b7afa997f220f763b9c3c8554f029b969d2456`. That final integration addition freezes
a new Sol DEVELOPMENT case pack/protocol; it changes no executable product input.
No live trial from that pack was run. T04 acceptance documentation at `7eea89f`
was separately merged, preserving its fresh-versus-inherited evidence.

| Observed source | Check | Result |
| --- | --- | --- |
| `df31a9e` / tree `e408e7d082ed922b562e272725f992f9f5e11da2125ac1081cc06cce721db0dc` | Full combined backend, including World/privacy/replay, API/export, T04/T05, accounting/cancellation/lifecycle and 10 new T06 cases | **1,005 passed**, 122.63 s pytest / 125.42 s wrapper |
| Same source | Full frontend | **109 passed / 29 files**; lint and TypeScript/production build passed |
| Same source | Impeccable detector on T06 results/Agent surfaces | Passed, no findings; final light/mobile and dark/desktop renders inspected |
| `fa1e42f` / tree `c3f61b72f05c8e68a55d62dbaee16d51214791b5688783fc7ff674d435a7f5f1` | After acceptance merge and removing residual unqualified “independent runs” prompt/copy | **105 affected backend**, **15 affected frontend** passed; Ruff, lint, TypeScript/production build passed |
| Same source | Shared browser: results/export, comparison, inspection, execution, Researcher activity/reload, streaming/reconnect, recovery and revision/draft lifecycle | **44 passed**, 93.55 s wrapper |
| `11b7afa` / tree `413cc5487cede6f00454041cf8dc2ba372c4906b2d590311cfc88bcc087e819a` | Real two-harness browser lifecycle under current export v6, desktop/light and phone/dark | **2 passed**, 14.98 s wrapper; ty passed |

The earlier full **178-browser** run is observed pre-T04 evidence, not a claim
that all 178 were rerun after T04. The later 44 shared and two actual harness
flows are the fresh combined browser checks. Ruff/ty passed at the combined
merge; only analysis prompt wording, accepted documentation and the new frozen
case pack followed. The affected 105 backend checks cover that wording change.
All 62 archived check wrappers report stable source during their execution.

No fresh production-container smoke was needed or run: T06 changes no container,
runtime configuration, dependency lock, workflow or shell script. T04's accepted
production/containment evidence remains inherited and attributed in its report.
No Actionlint/ShellCheck claim is made for this ticket.

### Before/after evidence and intentional differences

The unchanged T01 procedure/cases/runner remain the inherited DEVELOPMENT oracle:

- Case SHA-256:
  `6e4f138cf31d32b8a5e28e348edbccc2e9b1308b62f8b274d39cf0f24ba33a6e`.
- Harness SHA-256:
  `b6438d9fa3390d05f4f3c5583aa1e0e6f2095d1db653060257cdc817138a5826`.
- Before tree:
  `156346a65a3ab24800b23af394ae560f98486f3769d506fa2c39fec50d7b8ff8`
  at `b7e5b1540ff9ccf63761a482a4288eed1ad8be4a`; six passing cases.
- After tree: `e408e7d082ed922b562e272725f992f9f5e11da2125ac1081cc06cce721db0dc`
  at `df31a9e`; all six cases executed, **four retained export-v4 failures**
  and two passing expected schema rejections. After runner and comparison exit
  **1**. The comparison preserves four `export-v4` and four resulting terminal
  `passed` regression flags. Every other frozen check passes.
- Each before/after has 22 scripted participant requests, unchanged token/cost
  usage and **zero actual paid spend**. The synthetic ledger totals $0.00077;
  it is not provider spending. HTTP operations are 98 before, 103 pre-T04 and
  99 final; the final extra operation is one read-only status poll in the
  four-agent case. Full transcripts and `baseline-http-counts.json` retain it.

The independent parity oracle checked 298 fields across five completed runs and
22 turns. Its first attempt exited with a missing `export` key on the expected
schema-rejection case; the v1 script and failed log are retained. The repaired
raw comparison exits **1** with **44 request/response record differences**.
Its separate classifier accounts for all 44, with zero unexplained differences:
22 requests add T04's exact FunctionModel adapter provenance; 22 responses differ
only in fresh SDK timestamps/run/conversation/tool-call IDs. Original request
instructions, prompts, schemas and settings, output contents, observations,
checkpoints/state hashes, effects, measurements, metrics and usage are equal.
Neither the raw parity result nor frozen baseline failure flags were rewritten.

Current-contract positive tests independently require export **6**, comparison
metadata **1**, and retained T04 activation evidence. The UI/browser download and
old-revision checks inspect those same fields. T06 intentionally removes the
universal bootstrap/three-seed interval behavior while preserving observed
seed-weighted means and matching assertions. Historical benchmark files/scores
that existed at the starting tip are byte-unchanged. Newly inherited T04/Sol
development files are identical to accepted integration; T06 authors no benchmark
suite or score change.

### Evidence custody and limits

Ignored `data/t06/` preserves all raw attempts, HTTP transcripts, temporary
development databases, exports, screenshots, source archives and command logs.
`check-index.json` records every wrapper command, exit, duration, HEAD/tree hash,
source stability and log hash; it lists all **22 nonzero attempts** without
discarding intentional red or contract failures. The tracked inventory below
indexes every check. Setup/manual/tool failures are also described above and kept.
The wrapper source is copied to `setup/check-runner.py`; additional review and
manifest scripts are in `oracles/`.

The immutable [artifact manifest](../../data/t06/artifact-manifest.json) covers
**679 files / 88,724,509 bytes**, canonical SHA-256
`c971c20a9e66f06f96b63db77a55f4eace12aa887146674cc7b3278936094ad8`.
After this documentation commit, `final-state/` captures the clean final HEAD,
branch, included tip and tracked source; `artifact-manifest-final.json` extends
the inventory to that checkpoint without changing the earlier manifest or raw
results. Each manifest excludes only its own output. Preserve the entire worktree
and raw artifacts for the fresh merger; ignored evidence is intentionally uncommitted.

Port **18117** is closed after both browser servers' normal shutdown. The owned
agent-browser session and shared preview tab are closed. Root stash ref still
equals `f771128ba1c9295262a4073df40cc25647b1370f`; no stash content or unrelated
root `pbcopy` was inspected. Commits used normal hooks/scanning, with no leak
finding. No descendants, extra checkout, push, PR/issue change, reset, data deletion,
global install, security/credential change or unrelated process change occurred.

These are keyless deterministic DEVELOPMENT checks, not held-out or live Sol/Luna
competence evidence. Models remain Sol Researcher and Luna participants. Fixed
world seeds/repetitions do not establish independent population support; small
samples and outcome-dependent completion/eligibility limit generalization. Missing
conditionally defined or unsupported-range endpoints remain explicitly unidentified.
No T07 exposure, T15 comparison policies or T19 claim lenses were implemented.
At that ticket handoff, fresh merger review remained; its acceptance follows below.

## Fresh integration acceptance and custody

The merger worked alone in the assigned integration checkout. Only the progress
row conflicted; it was resolved to preserve both branches' history. Accepted
T01/T02/T04/T05, schema 5, activation journals and both live-discovery repairs
(`0ea4064`, `a874f7c`) remain. The two live regression tests and research-tools
source are byte-identical to the starting integration tip. The canonical-key
catalog and actual `template_parameters` instructions are still present.
`SOL_DEVELOPMENT.md` and every benchmark file are unchanged from that tip.
No product defect or substantive blocker was found; no source repair, alias,
conversion, reset or weakened check was needed.

Independent HTTP worked examples used different seeds (23/47) and an external
scripted provider, with model-network access disabled. They verify:

- Missing arm: A=0.5, B=1 on selected marginal support, matched difference=1
  from one pair, planned bounds=[0, 0.5], with the full failed/excluded/unmatched
  count matrix retained.
- Missing repetition: selected equal-seed difference=0.5 from three pairs in
  two observed clusters; planned bounds=[0, 0.25].
- Disjoint completed cells: marginal means 0/1, no observed pair or effect,
  planned rate bounds=[0, 1]. Completed runs without eligible reports retain
  null measurements and explicit nonidentification.
- Three arms: only the two baseline contrasts count; unmatched counts=[1,0,0].
  A fully observed payoff contrast has exact finite value/bounds=[20,20]
  despite lacking an implemented global range. A missing payoff remains
  unidentified; neither result identifies population uncertainty.
- Frozen analysis: captured statuses complete/failed/ready survive a successful
  retry, Pause of the ready arm and a new revision while the answer is pending.
  Prompt, persisted response, reload and repeated exports retain identical old
  matrix membership, revision/hash, reasons, cutoffs and calculations. Subsequent
  reads/export add no requests or usage.
- Failed unsent reservation then Pause: attempted/interrupted counts=[(1,1),
  (0,1)], one retained activation, zero provider requests and zero cost.

The full backend suite also covers one fixed seed with four repetitions, two
seeds with two repetitions and three fixed seeds. None certifies i.i.d. sampling.
Seed clusters describe observed support; interacting agents and decisions do not
increase independent support. Selected terminal estimates require explicit
selection assumptions. Finite planned-sample bounds are deterministic possible
values, not confidence intervals; broad causal/population intervals remain unsupported.

| Fresh merged-source check | Observed result |
| --- | --- |
| `.venv/bin/pytest -q` | **1,007 passed**, 106.64 s; API/comparisons/analysis, T04 policy, T05 Researcher, accounting/cancellation/lifecycle, privacy, replay and export included |
| Ruff / ty | Passed, including backend, benchmarks and repository scripts |
| Frontend lint / test / build | Passed; **109 tests / 29 files**, TypeScript and production build |
| Shared browser on `JAS_TEST_PORT=18217` | **42 passed**, 73.42 s wrapper: results/export, comparisons, inspection, controls/revisions, Researcher reload, streaming/reconnect, recovery and drafts |
| Actual two-harness browser lifecycle on 18217 | **2 passed**, 15.54 s wrapper, light/desktop and dark/phone |
| Six independent finite/frozen HTTP scenarios | Passed; complete request/response transcripts retained |
| Positive contract and direct-action parity | Schema **5**, export **6**, comparison **1**; all **22 turns / five runs** match, with exact prompts, schemas, settings, world evidence, output content and accounting |
| Custody/live-history closure | All **685** T06 files and **1,745** indexed Sol files reverified; source HEAD/status/tracked/evidence bytes, protected inputs and stash stable; port 18217 closed |

All fresh checks use merge `aaf3a15`, tracked working-source SHA-256
`4d05847173e61381d42b5395e7cb51bec14beece566032fd837044e7a8271ec8`;
the independent HTTP check ran on identical staged merge bytes before its commit.
The clean-clone T01 after tree is
`935bf2721db03658c3da276723e6407bac0afe694c8a797ca1ea20cc03602fbb`.
The inherited before source is `b7e5b1540ff9ccf63761a482a4288eed1ad8be4a`;
its observations were not rerun or relabeled fresh. Case/harness hashes above
are unchanged. All six fresh after cases execute with **22 scripted requests /
98 HTTP operations** and zero paid requests. The synthetic $0.00077 ledger
matches before exactly; it is not a provider charge.

The frozen v4 runner and comparator both intentionally exit **1**: four
`export-v4` failed checks and their four terminal `passed=false` flags remain.
The two expected schema-rejection cases pass. Positive verification independently
checks schema-5 activation provenance/settlement/links and the complete export-6
comparison grid, including null eligible outcomes. All **374 export differences
and 101 report differences (475 total)** are retained and classified, with **zero
unexplained differences**. SDK timestamps/IDs and added adapter/harness evidence
are distinguished from unchanged actions, outputs and world effects. No failed
flag was hidden to manufacture an all-green historical score.

The rendered failed-arm results, selected effect, actual failure reasons,
withheld uncertainty and 0–50% sensitivity were inspected through the shared
preview. Light desktop and dark 390px views remain usable, with no page overflow;
automated keyboard/disclosure/download/revision checks also pass. The first
manual visit overlapped Playwright's normal server shutdown and showed loading
then fetch failure. That attempt remains; inspection succeeded on an owned
keyless server using a copied finite-evidence database. No test/assertion/timeout
changed. Both Playwright servers, the copied-database server and owned preview
are closed. Only owned services were stopped.

Production smoke remains explicitly **inherited** from qualified T04 source
`3f3cf5c72eda10a346a6bc4ff44c1c3a7ce6c148`. Twelve container/runtime/configuration,
containment, lock and smoke inputs match its recorded bytes. No related input or
repair changed; the merged frontend build is fresh. No new container, workflow,
Actionlint or ShellCheck result is claimed.

Before merging, every ignored `data/t06/` artifact was copied without overwrites
to `.tools/research-harness/evidence/T06/data/t06/`: **685 files / 89,936,683 bytes**,
including the final manifest itself. All source/destination hashes and both
child indexes were verified, with stable source HEAD/status/tracked/evidence
bytes, and reverified at closure. Copy inventory canonical SHA-256:
`43db2a6e4ae3bc610e4d10d9eec3de2c0d0aced7017c3d5442f5479967702187`.
The child's final index covers **684 files / 89,797,582 bytes**, canonical
`ec485f469e554e13b998a0c51de3a53ec2494a2da4ce73b1b8be3f033529a24c`;
its own file SHA-256 is
`a5f1ec14af6a4e6e466256d4b6a504801d734ef09f9cb01c9633bda53e5f07a5`.
`T06-copy-verification.json` records every copied artifact. Source worktree intact.

Fresh logs, per-check tracked-source archives/identities, raw HTTP/database/export
evidence, independent scripts, all differences, screenshots and custody records
are in sibling `T06-integration/`. `check-index.json` retains all **13 wrappers**:
11 exit 0 and the two intentional frozen-oracle exit-1 results; all source bytes
were stable. Two initial read-only helper assumptions (a Sol manifest field name
and the catalog comprehension variable) were corrected; their failures are
retained separately and did not change product/evidence. The immutable
`verification-manifest.json` covers **501 files / 26,133,953 bytes**, canonical
SHA-256 `6142ad78f81bc8a7cf5259a9bbc2c7d8cf80b5e8e8924495b4924fbe49b55f59`.
It excludes only itself, disposable clone Git internals and generated Python
caches, all left on disk. A subsequent final checkpoint manifest adds the final
documentation commit/source archive without rewriting this verification manifest.

All **1,745 indexed Sol-development files** and its final manifest are intact;
canonical SHA-256 remains
`809deca0dc521829b6f18840daf926c0620e6f176a610bfd51f3926fcfa45d90`.
Global actual spending is unchanged: **$0.611632 / 55 known-usage requests**,
**$9.388368 remains** of $10, no active allocation and no paid merger calls.
The tuned narrow Sol successes do not close participant, held-out, reliability
or generalization gates. The original failures and authoritative live history stay.

No root `pbcopy` content was read, added, copied or archived; tracked-only
snapshots and the clean clone exclude it. Stash
`f771128ba1c9295262a4073df40cc25647b1370f` is untouched. No descendants, source
worktree disposal, push, PR/issue operation, host/security/credential change or
other-worktree/process change occurred. Parent owns draft PR #32/publication.
T03 and T08 remain in progress; T07 remains Ready. T15 still waits for completed
T08, T19 for T07 and T14 for T13. No consequential decision is outstanding.

## Complete observed check inventory

Every path is relative to `data/t06/`; the corresponding `check.json`,
`source.json`, `source.tar.gz` and `command.log` are retained. Exit 1 includes
intentional red/contract differences as detailed above.
This is the inherited ticket-branch inventory; fresh merger checks are indexed
separately by `T06-integration/check-index.json`.

| Artifact directory | Observed exit |
| --- | --- |
| `backend-after-t05/` | 0 |
| `backend-focused/` | 1 |
| `backend-focused-repaired/` | 0 |
| `backend-full/` | 0 |
| `backend-static/` | 1 |
| `backend-static-repaired/` | 0 |
| `backend-types/` | 1 |
| `backend-types-repaired/` | 0 |
| `baseline-after-final/` | 1 |
| `baseline-after-pre-t04/` | 1 |
| `baseline-before/` | 0 |
| `baseline-mechanics-parity/` | 1 |
| `baseline-mechanics-parity-repaired/` | 1 |
| `baseline-parity-classification/` | 0 |
| `browser-inherited/` | 0 |
| `browser-new/` | 0 |
| `checkpoint2-backend/` | 0 |
| `checkpoint2-ruff/` | 1 |
| `checkpoint2-ruff-repaired/` | 0 |
| `checkpoint2-types/` | 0 |
| `comparison-final/` | 1 |
| `comparison-pre-t04/` | 1 |
| `final-accepted-types/` | 0 |
| `final-backend/` | 0 |
| `final-browser-shared/` | 0 |
| `final-copy-build/` | 0 |
| `final-copy-lint/` | 0 |
| `final-copy-ruff/` | 0 |
| `final-copy-tests/` | 0 |
| `final-frontend-build/` | 0 |
| `final-frontend-lint/` | 0 |
| `final-frontend-tests/` | 0 |
| `final-participant-browser/` | 0 |
| `final-shared-backend/` | 0 |
| `final-ui-detector/` | 0 |
| `frontend-build/` | 0 |
| `frontend-checks/` | 0 |
| `frontend-tests/` | 0 |
| `green-activation-attempts/` | 0 |
| `green-complete-payoff-api/` | 0 |
| `green-export-contract/` | 1 |
| `green-frozen-analysis/` | 0 |
| `green-missing-arm/` | 0 |
| `green-multicontrast/` | 0 |
| `green-reservation-api/` | 0 |
| `merge-ruff/` | 0 |
| `merge-types/` | 0 |
| `red-activation-attempts/` | 1 |
| `red-complete-payoff-api/` | 1 |
| `red-export-version/` | 1 |
| `red-frozen-analysis/` | 1 |
| `red-frozen-analysis-corrected-provider/` | 1 |
| `red-missing-arm/` | 1 |
| `red-multicontrast/` | 1 |
| `red-reservation-api/` | 1 |
| `red-reservation-api2/` | 1 |
| `review-complete-payoff-green/` | 0 |
| `review-complete-payoff-red/` | 1 |
| `support-cases/` | 0 |
| `ui-after-t05/` | 0 |
| `ui-green/` | 0 |
| `ui-red/` | 1 |
