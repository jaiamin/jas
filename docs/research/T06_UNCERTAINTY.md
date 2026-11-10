# T06 failure-aware comparisons and uncertainty

Ticket: [#17](https://github.com/jaiamin/ass/issues/17). Implementation branch:
`t3/t06-uncertainty`, prepared at integration source
`b7e5b1540ff9ccf63761a482a4288eed1ad8be4a`. Linux aarch64 Docker Sandbox,
16 KiB pages; assigned checkout only. No paid calls, descendants, extra
checkouts, publication, tracker changes or credential/security changes.
Root stash `f771128ba1c9295262a4073df40cc25647b1370f` is preserved untouched.

## Acceptance and plan

- [ ] Preserve condition-specific planned, attempted, complete, failed,
  interrupted, excluded and unmatched counts and inspectable cell reasons.
- [ ] Declare matching and inference units, observed support and dependence.
- [ ] Withhold unsupported uncertainty; disclose small-sample limitations.
- [ ] State selection assumptions and bounded sensitivity or nonidentification.
- [ ] Concise results UI; cutoff-scoped read-only analysis and export provenance.
- [ ] Independent API red/green cases, inherited baseline/development comparison,
  relevant backend/frontend/accounting/lifecycle/export and browser checks.
- [ ] Merge latest accepted integration tip, resolve current contracts, verify,
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
  Undefined eligibility/unbounded metrics receive an explicit limitation.
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

Integration of accepted T04/schema v5 and final checks remain in progress.
