# T07 treatment opportunity, delivery and observation

Ticket: [#18](https://github.com/jaiamin/ass/issues/18). T07 implementation is
complete on `t3/research-exposure-capture`. Its historical implementation evidence
is retained below; fresh combined T07/T08 integration review follows at the end.
No descendants, publication, tracker edit or paid call.

## Acceptance

- [x] Existing-world three-participant actor/target/observer disclosure and absent-exposure cases.
- [x] Source-linked assignment, applied configuration, recipient opportunities,
  available observations and actual input/delivery, with cutoff denominators.
- [x] Historical capture absence, measured zero, unknown delivery, unsent attempts
  and confirmed inclusion remain distinct; no attention/belief/intent inference.
- [x] Run Record and experiment Overview inspection and current exports; recipient
  and memory boundaries remain independently enforced for participant inputs.
- [x] Assignment-based versus exposure-conditioned descriptions are explicit;
  exposed-only filtering never becomes an automatic causal effect.
- [x] Independent observation/utility/cutoff oracles, inherited regressions,
  replay/accounting/lifecycle and a reusable World producer seam.

## Source and decisions

The prepared checkout was clean at
`aaf3a1522b371e68af845243854d581d48d1fc39`, also its initial integration tip,
already containing accepted checkpoint
`ff1567453cc119824bb4b3c03ceee1d73acdb9fe`. OS/cwd/AGENTS.md and required
spec/ticket/progress, domain/ADR, behavior/validity, architecture/design, T01 and
Sol-development context were read before implementation. Nothing was reset.
`data/t07/initial-source.tar` preserves the immutable starting commit; the before
checkpoint differs only by this report. T03/T06 other-worktree reports were
read-only context; no child branch was cherry-picked.

The implementation checkpoints are `8ad79f2` (acceptance freeze), `c723267`
(backend), `b409fca` (inspection UI), `67cd8c3` (accepted T03 mechanics merge),
`374bdda` (source-link fixes) and tested clean combined source
`3749ce4f807a64cde5fb06557f2198ba49b89443`. The final included accepted integration
tip is `6b7ad09248f915320bdaf1aa4d2ba10d5e6d0789`. Later changes are
acceptance/handoff prose; the closure record verifies the complete
executable/test/configuration input hashes.
The manifest records the final branch/HEAD and exact check source identities.
The observed integration ref `9750cafea48120ceec11530ed11a214661a374b3`
contains a provisional T08 merge; its handoff still queues fresh review and says
T08 is unaccepted. It is deliberately excluded. The accepted parent was merged
at `b2aeecc020f2b82ff7bf8a70de4a56c603eb367b`; no T08 child code was imported.

Current contracts are database **6**, study export **7**, exposure capture **1**,
comparison **1** and **jas-environment-v3**. Schema 6/mechanics-only library v3
come from accepted T03; T06 comparison/sample-membership semantics remain.
T07 adds JSON provenance without changing database columns or World rule versions.
No data conversion, reset, alias, second engine or universal intervention ontology.
No T10 phases/artifact world or T19 semantic-claim system.

A World producer locates a recorded event only inside an already authorized actor
observation. Recipient enforcement precedes producer lookup; Institution supplies
its own sanction-record paths. Future Worlds can supply paths for their own
observation shape. Provenance never enters participant prompts, schemas or tools.
Participant-facing projections enforce recipients and memory independently of the
researcher's privileged, read-only inspection.

Direct-action input includes the current observation. The tool policy's initial
request includes its profile/limits and legal schema; a local read result reaches
model input only when a later request actually includes it. Candidate inputs bind
to the exact reserved request; provider responses confirm receipt even when output
validation fails. A missing receipt remains unknown, not confirmed or measured
zero. Refused inference attempts without requests are unsent. Missing historical
capture produces unavailable/null exposure, never backfilled delivery.

`GET /api/runs/{id}/exposure?through_turn=N` restricts historical committed turns
and activations. Current inspection also retains unfinished boundary attempts.
Analysis acceptance synchronously freezes complete values and activation/request/
operation membership, including then-current receipt status. Later settlement,
resume or revisions cannot alter it. Researcher summaries link to the persisted
analysis artifact. Input paths select the recorded schema or decoded JSON prompt.

Counts describe unique participants and recipient-record opportunities, including
authors; they are not independent experimental units. Assignment-based descriptions
retain assigned runs and failures. Exposure-conditioned selection is post-treatment
and cannot automatically identify a causal effect. No sanction record does not
establish absence of rule-framing or legal-choice exposure. Inclusion establishes
neither attention, belief nor intent.

## Independent DEVELOPMENT cases and TDD

The approved public HTTP workflow seam uses real disposable SQLite, execution,
accounting and settlement with only the external provider replaced. Independent
World observation/step/snapshot and literal utility/cutoff oracles supplement it.
All cases are development checks, not held-out validation.

| Case | Independently expected and observed |
| --- | --- |
| Private disclosure | Existing Commons; seed 0; alex/morgan/riley both rounds. Each contributes 2 of 10 at multiplier 1.5: 11 each per round, final **22/22/22**. Alex's addressed message settles at turn 3. Eligible actor/target **2**; confirmed inclusion **0** at cutoff 3, **2** by final cutoff. Riley never receives it. |
| Public control and source resolution | Public message has **3 eligible / 3 included**. Every available-observation source resolves to the correct actor; each confirmed prompt/schema source resolves to recorded input, including whole-input roots. |
| No realized exposure | No message yields **0 / 0** record opportunities. Direct-action rules still reach all three. A tool policy deciding without reads has **0 World-observation/rule inputs**, despite stored observations, and **3 legal-schema recipients**. |
| Private institution record | With memory none, sanction records are eligible for two parties; only the later target receives one. The observer receives no sanction record but still receives rule framing. Independent final utilities are **-1/2/2**. |
| Receipt/failure | A timeout without receipt gives unknown input, null exposed counts and retained unknown usage. An invalid output with a real response confirms input independently of failure. Ceiling refusal gives one unsent attempt, no request or charge. |
| Pause/restore | A local read before the next sent request gives zero confirmed message inclusion. Sequential process restoration sends nothing. Explicit resume reuses the activation, adds one request, and confirms one participant; replay spends nothing. |
| Frozen cutoff | Analysis accepted at turn 3 retains zero included and exactly three participant requests after later completion delivers to two participants and a new revision is saved. Its source still resolves to that saved snapshot. |
| Memory/privacy/replay | Four memory modes × two harnesses; other goals, private messages and provenance stay out of unauthorized prompts/schemas. Independent World restoration preserves the observer's projection and exact checkpoints. |

The initial freeze is `expected-v1.json` (SHA-256
`d8a686bf10e9f1b323b034a49debbe829cbf98161ee71b053af2b319a5f0cb50`).
It proposed a three-person trust task, but that existing World requires pairs.
V2 switched to Commons (`a4a62c6401ea0cf214142fcb9c1a6d302453dc4238f766a39ba5ed4afcdc2a2c`)
and incorrectly expected immediate communication. Existing Commons seals messages
until round settlement. V3 corrected the independent oracle to two rounds, without
changing World settlement (`f67d29314fb6c48b90aab383b58930b1b4ecdc5b46664be903b0017059ad4eb2`).
V1 precedes ticket implementation; v2/v3 follow observed oracle corrections. Their
retained `frozen_before_implementation` flag must not be read as a whole-ticket
chronology claim. Additional source-link expectations were frozen before those fixes.
All earlier freezes, source archives, attempts and failures remain intact.

Eight retained red/green slices cover the missing endpoint, Institution producer,
no-read observation distinction, frozen analysis, export/failure/privacy variants,
UI unknown/retry/late-selection states, frozen source links and exact input paths.
`data/t07/*/check.json` records exact command, exit, source HEAD/tree/archive,
log digest and source stability; no failed flag was relabeled. Early case folders
predate embedded source IDs; raw exports/provider inputs/operations and matching
source archives remain, without inventing missing identities. Final cases embed
the exact wrapper source identity and test digest. Tests do not depend on ignored
freeze files being present in a fresh checkout.

## Observed verification

All final executions below use clean source `3749ce4`, full input-tree SHA-256
`e20b45ae4c617c3509eb0017ad84f11b0dea2fbc13611b0f374b291d2e161e4a`.

| Check | Observed result and retained record |
| --- | --- |
| Full backend | **1,038 passed**, 112.21 s; `final-backend/`, XML and task-owned test workspaces, including accounting, cancellation, ceilings, one writer, lifecycle, privacy, replay, export, T03/T06 and **20 exposure cases**. |
| Backend static/types | Ruff and normal ty pass; `final-static/`, `final-types/`. |
| Frontend | **111 passed / 30 files**; lint, TypeScript and production build pass; `final-frontend-tests/`, `final-ui-lint/`, `final-ui-build/`. |
| Full browser | **182 passed**, 379.92 s wrapper / 6.3 min Playwright; `final-browser-recovered/`, source unchanged after storage recovery. |
| Actual policy/exposure browser | **5 passed**, 20.10 s wrapper / 19.9 s Playwright; `final-browser-exposure/`, actual direct/tool policies, disclosure/export desktop + phone, and loading/failure/retry. |
| UI mechanical review | Impeccable detector returns **[]**, exit 0; `final-ui-mechanical/`. |
| Positive current contract/parity | Schema **6**, export **7**, capture **1**, library **v3**, exact **22-turn / five-run** parity; `final-t01-parity/`, `parity-final/`. |
| Frozen T01 | After and comparator retain **exit 1**, four `export-v4` failures and four failed terminal flags; no regression or improvement in any other check. |

Browser runs use keyless disposable services, task-owned outputs and
`JAS_TEST_PORT=18118`. Stock components/tokens support keyboard disclosures,
loading/error/retry, late responses, contained mobile tables and desktop/light +
phone/dark inspection. Final region screenshots and actual exported JSON are
retained and visually inspected. The phone capture after collapsing sources
scrolls the heading behind the sticky app header; the earlier heading visibility
assertion and experiment Overview capture cover the top, while the region image
covers the counts, source controls and interpretation. Full inherited flows
combine real record/save operations with controlled HTTP provider-state fixtures;
actual policy trials exercise the real two harnesses with deterministic provider
responses.

Earlier freshly observed checkpoints remain separately attributed: 37 inherited
policy/export/T01 checks before implementation; 1,037 combined backend and 111
frontend checks at `67cd8c3`; 51 analysis/exposure regressions after source-link
repair; 20 exposure cases and three execution browser flows after input-path/mock
repair. Prior T01/T03/T04/T05/T06 reports and production/container qualification
are inherited, not fresh T07 executions. No runtime/container/workflow/dependency
contract changed; no fresh production image or hosted CI is claimed. Python
3.13.5/Node 24.22.2/pnpm 12.18.0 are used. Project-local uv 0.13.7 under
`.tools/t07-uv/` handles the known system page-size issue; frozen installs pass.

## T01 before/after and exhaustive classification

The unchanged frozen runner/cases/runtime/effort envelope were executed before
implementation and after the final product checkpoint. Original failure flags
and exit 1 are preserved; current-contract positive checks are separate.

| Identity | Before | Final after |
| --- | --- | --- |
| Clean source | `8ad79f20e10f33dd2d354df2ce5435245254ef7f` | `3749ce4f807a64cde5fb06557f2198ba49b89443` |
| Tree SHA-256 | `a5ecdef4dd85ce6344db2be19dfe26d149ab70056d1b15b0913bc54cfeb8fae2` | `e20b45ae4c617c3509eb0017ad84f11b0dea2fbc13611b0f374b291d2e161e4a` |
| Archive SHA-256 | `86fdfc1006e63b1799f9ea46498e903be59d543ba4e8c5f71c444e9e67d201fc` | `5a5d543d92f7d446d45d8b08d460985079f98c2256f2de1f9a5e8bdcf4247e8b` |
| Backend SHA-256 | `dd8e0f9aaf2293507d6839ef0fea7512d3a2880d52671f0f865735a7a14d3579` | `e0bd4f7c8a16a1e428d16de22e9bdac7d87e2be049a417141572b6a1613d5e14` |

Case SHA-256:
`6e4f138cf31d32b8a5e28e348edbccc2e9b1308b62f8b274d39cf0f24ba33a6e`.
Frozen runner SHA-256:
`b6438d9fa3390d05f4f3c5583aa1e0e6f2095d1db653060257cdc817138a5826`.
Both source-stability checks pass. Original `before/`, preliminary `after/` and
final `after-final/` remain. The final unchanged comparison is in
`final-t01-comparison/command.log`; it has zero regressions/improvements and
retains the four failed export checks plus their terminal failures.

Independent `classify.py` positively checks all **22 turns / five runs**:
observations, legal schemas, decisions, checkpoints/hashes, final states, events,
metrics, full prompts/instructions/settings, output content and accounting match.
Usage is 22 synthetic requests, 2,200 input / 1,100 output tokens and **$0.000770
synthetic charge**, with **$0 actual spend**. HTTP operations differ **98 → 103**
only through polling/scheduling; canonicalized mutation sequences match.

Every one of **1,058 JSON/report/catalog/operation differences** is retained in
`parity-final/differences.json`, with **zero unclassified**: T07 export 6→7 (4),
additive exposure (70), participant source identity (44), inherited T03 nullable
source (25), design hash (16), mechanics/library catalog/schema (14), source
provenance (136), generated record/provider identities (313), HTTP path identities
(90), polling/scheduling (69) and observed timestamps/latencies (277). Added
subtrees count as one recorded difference with their complete raw value.

## Retained failures, custody and limits

Retained development failures include the missing endpoint/component tracers;
invalid initial World/timing oracles; two import mistakes; frozen exposure lost
by a progress update; an invalid tiny-budget fixture; initial static/type issues;
UI accessible-copy and endpoint-fixture mismatches; a temporarily unused export
import; three restore-test type errors; and the two source-link defects. Repairs
preserve the original failures and do not weaken checks. A cumulative mobile
policy timeout is retained; its unchanged five-flow rerun passes. A broad study
HTTP mock intercepted exposure responses; narrowing its route preserves all
assertions and the complete execution flows pass.

The final full-browser attempt also retains seven environmental failures from
shared-filesystem ENOSPC: qualification could not create its temporary directory,
and six screenshot/output directories could not be created. It passed 175 tests.
Only T07's completed synthetic case outputs were losslessly compressed to recover
137,001,589 bytes: 499 JSON files, with raw/gzip digests and decompression checks
in `compression-index.jsonl`. This changes storage representation, never evidence
content. No other worktree, process or shared cache was changed. The unchanged full rerun passed all **182** tests; its source, tests and configuration remained identical. Both failed and recovered attempts remain.
A closure-only assertion also retained its failure when concurrent T08 status
changed from queued to review in progress. Both statuses remain unaccepted;
closure now records the status explicitly and excludes the provisional repair
`de5556b3da67a8d276ee8fb6d098760911dd03b2`. No product input changed.
The early shared-preview navigation before its server existed is also retained;
both owned preview tabs are closed.

Preserve the entire ignored `data/t07/`, including its immutable `manifest.json`,
raw logs/operations, source archives, freezes, failed attempts, provider inputs,
compressed case files, exports/SQLite workspaces and inspected screenshots.
The manifest indexes all physical artifact hashes, exact commands/exits/sources,
case identities, compression mapping and the final branch/HEAD; it excludes
itself and treats generated test `.env` files as opaque metadata. Nothing reads,
prints, copies or publishes real credentials. The final closure record verifies
executable-input parity and protected-file/ancestry/service checks. All **68**
command wrappers retain stable source identities: 39 exit 0 and 29 nonzero
(27 exit 1, one exit 2, one exit 4); nonzero results remain failures, including
intentional red checks and the frozen baseline. Stash
`f771128ba1c9295262a4073df40cc25647b1370f` and root untracked `pbcopy` remain
untouched. Historical benchmarks, researcher-development-cases.json and final
held-out inputs are unchanged. All owned services/browser sessions are stopped.

Researcher/planner/assistant remain Pydantic AI **Sol**; participants remain
model-controlled **Luna**. This ticket makes **zero paid calls / $0 spend**.
Global inherited Sol charges remain **$0.611632 / 55 known-usage requests** of
$10, with **$9.388368 remaining**, no active child allocation and no Luna allowance.
The original live canonical-key failures and first-repair parameter failures in
[SOL_DEVELOPMENT.md](SOL_DEVELOPMENT.md) remain. Its two targeted repaired successes
are tuned development repetitions with unblinded review, not reliability,
general intelligence or held-out generalization. Keyless mocks/browser checks
establish mechanics, not those live capabilities or attention/belief/intent.

No live-provider, high-concurrency/load or semantic paraphrase validation is
claimed. Final held-out cases were not run or tuned. Parent fresh integration
review remains required; implementation completion does not mean acceptance.

## Fresh integration acceptance (2026-11-10)

T07/#18 is accepted after fresh sole-writer review in
`/home/agent/.t3/worktrees/workspace/t3-fdf9bdeb`. Assigned accepted integration
`e2d42c9fa81ac3b9ce2f440f0ef480e0bb76444d` was joined to the exact clean source
`e7800d3a400fc133a7b6a0204d5e03ed4d8bb79e` by no-ff merge
`a92105fd2300de97e8668400a2174019e3f96788`. The source correctly excluded
then-provisional T08; this integration retains accepted T08 merge `9750caf` and
cutoff repair `de5556b`. Only progress/handoff prose conflicted. The historical
implementation and freeze chronology above remain intact.

Current contracts are **DB 6 / export 7 / exposure capture 1 / comparison 1 /
library v3 / tool-using 2.0.0 / direct-action 1.0.0**. No migration, compatibility
alias, reset or World-rule change. Researcher/planner/assistant remain Pydantic AI
`openai:gpt-6.1-sol`; model participants remain `openai:gpt-6-luna`.

### Findings and repairs

The initial merged T07 suite passed 20 cases, but independent combined-contract
checks exposed two concrete defects. T07 missed actual T08 investigation/retrieval
source delivery, and it falsely treated the unabridged local observation journal
as model input when T08's bounded prompt had replaced that content with receipt
references. Product repair `d5568c1b8a60577ac275408c3800abe537d63b9f` binds authorized
observation fragments to their exact content in the **final bounded prompt** of
each separately reserved request. It verifies content equality and retains the
request's own confirmed/unknown receipt. Stored observations, local reads, omitted
content, plans, source references and verification metadata cannot independently
confirm original World delivery. Whole-observation counts require a complete
snapshot; delivered facets still bind their actual rules/choices/event fragments.

The accepted `participant_context.py`, including the separate actual
`observation_cutoff`, is byte-identical to `de5556b`. T08 capability selection,
limits, actor sources, privacy and accounting are preserved. Browser fixture
checkpoints `0d1bb29` and `777a609` use the supported version-2 capability fields,
export 7 and actual investigate/plan/retrieve/verify/decide operations. A combined
fixture's six deliberate one-second pauses exceeded its five-second completion
poll; the context-mode poll is now fifteen seconds with every behavioral assertion
retained. An inherited long test-server string was formatted to satisfy Ruff.

Both Standards and Spec review were performed personally, without descendants.
The review covers assignment/configuration/opportunity versus availability and
actual sent input; source resolution; absent opportunities versus unavailable
history; unknown receipt versus measured zero; invalid responses, failures and
unsent attempts; historical cutoff denominators and frozen pending analysis
membership through later settlement, restore/resume and revision. World recipient
authorization precedes producer lookup. Actor scope applies to prompts, schemas,
tool results/errors, counts/metadata and restored memory. Self-authored plans do
not become World authority.

New public-HTTP oracles exercise three real participants across private actor /
target / excluded observer, public and absent controls, all four memory modes,
Commons final balances **22/22/22** and Institution private-sanction balances
**-1/2/2**. They also exercise T08 rule/state investigation, retrieval, disabled
operations, plan/verification non-delivery, context compaction, unknown/invalid/
unsent delivery and pending-analysis freeze. Restore now covers both observation
and T08 retrieval. Actual-input pointers resolve to recorded requests; observation
and assignment pointers resolve to their recorded sources.
Counts remain recipient/opportunity descriptions, not independent experimental
units or evidence of attention, belief or intent. Exposure-conditioned subsets
remain post-treatment selection, without an automatic causal interpretation.

### Fresh verification and retained failures

| Fresh check | Observed result and evidence under `T07-integration/` |
| --- | --- |
| Full combined backend | **1,094 passed**, 116.02 s; `backend-final/`, `backend.xml`, retained workspaces and case outputs. Runs from a clean tracked-only clone of `d5568c1`, tracked inventory SHA-256 `4593eccb0bd2ec72bea71742cc15af6b48831a816643770d836287210f2225c7`. |
| Affected public participant/exposure/access group | **108 passed**; `green-combined/`. Full suite includes **43** exposure cases: 22 combined T07/T08, 21 original/restore cases. Forty-two embed source/case identity; the independent World-only case is linked through JUnit and its frozen test source. |
| Independent T08 API/World checks | **377 pass**, freshly rerunning accepted reviewer-authored oracles on combined source; `api-world/`, `t08-api-world-cases/`. Covers capabilities, memory, source cutoffs, metadata/count/schema privacy, foreign actors/runs, restore, budgets, failures, replay and export parity. |
| Backend static/types | Ruff and normal ty pass; `ruff-repaired/`, `ty-repaired/`. Test-server Ruff also passes after formatting. |
| Frontend | **111 tests / 30 files** pass with one worker; lint, TypeScript and production build pass. `frontend-units/`, `frontend-lint-final/`, `frontend-build-final/`. |
| Actual policy/exposure browser | **5 pass**; `browser-harness/`, direct action and current tool policy, disclosure/export desktop/light + phone/dark and loading/failure/retry. |
| T08 pause/restore browser | **2 pass**; `browser-context/`, capabilities and persisted receipts in both themes. |
| Actual T08 + exposure browser | **3 pass** after fixture timing repair; `browser-context-exposure-repaired/`. Each disclosure run has **30 scripted requests**, private source pointers into retrieval `items`, and the actual capability journal. The loading/retry case repeats the preceding flow. |
| Shared affected browser workflows | **52 pass**; `browser-shared/`: workspace, drafts, recovery, execution, inspection, streaming, uncertainty, environment reuse and Researcher tools. |
| Mechanical/visual UI review | Impeccable detector returns **[]**. Fresh exposure region/Overview and T08 receipt screenshots were inspected; mobile content stays contained and controls/interpretation remain readable. |
| Neutral DEVELOPMENT comparisons | Five accepted T08 cases / **47 scripted requests** and five inherited T04 harness cases pass; `context-development/`, `harness-development/`. Intentional unknown/failure outcomes remain failures in their raw records. |

There are **61 distinct passing browser flows plus one passing repeat**, all on
owned keyless port **18218**. The child's **1,038 backend / 182 full-browser**
results above are inherited; no fresh full 182-flow run is claimed. Post-full-suite
changes before acceptance are confined to the two dedicated browser fixture files;
backend tests and product code are unchanged. Later acceptance edits are prose.
Deployment/container, dependencies/lockfiles and workflow inputs are unchanged;
production smoke remains inherited from accepted T03/`6c290df`, not a fresh image
or hosted CI run. The shared preview successfully opened the owned service with
no console errors; its tab was closed. All five Playwright-owned services exited,
no manual service was started, and **18218 is closed**.

Every attempt remains. Initial combined red: **18 failed**, including an oracle
that searched for its own full-canary query. Correcting the query retained
**10 failed / 8 passed** before product repair. That group also contained an
invalid 8,000-character context fixture exceeding the 4,000 domain limit; the
first green was **17 passed / 1 invalid-fixture failure**. A separate valid
4,000-character compaction red proves the product defect independently: **2**
falsely exposed message participants against expected **0**. The repaired 108-case
group and full 1,094-case suite pass. Two initial ty errors, the incomplete
version-2 browser fixture build, focused test-server Ruff failure, and the combined
browser **1 pass / 2 timing failures** are retained beside corrected successes.
The initial no-ff merge conflict exit 1 is also retained. Two manifest-helper
failures concerned case-artifact enumeration and gzip reading. Two later captured-
contract helper failures miscounted an evidence dictionary and attempted to load a
WAL-mode SQLite image into memory. Their corrected audit explicitly passes DB 6,
export 7, capture 1, comparison 1, library v3, direct-action 1.0.0 and tool-using
2.0.0 across the five baseline runs and 22 combined-context cases; see
`acceptance-checkpoint/current-contract-final/` and `current-contract.json`.
None changed or rescored a product test. Early wrappers without archives retain per-file source
inventories/Git identities and saved red test/helper snapshots; later wrappers
include tracked-only source archives. No failed flag was relabeled.

### Frozen T01 and current-contract parity

The untouched T01 runner/cases still return **exit 1**, with all four export-v4
failures and four failed terminal flags visible. Comparison to accepted T08's
post-cutoff-repair capture reports **zero regressions and zero improvements**.
Positive checks separately establish **schema 6 / export 7 / capture 1 / harness 2 /
library v3 / comparison 1**. Exact behavior and accounting match for all
**22 recorded turns / five runs**: observations, actions, events, checkpoints,
final states, prompts, schemas, settings, outputs, 22 synthetic requests,
2,200 input / 1,100 output tokens and synthetic charge **$0.000770**. Actual spend
is **$0**. HTTP operation counts changed 98 → 97 through polling; canonical
mutations match. `parity-result/differences.json` classifies all **885** differences,
with **zero unexplained**:

| Difference class | Count |
| --- | ---: |
| Wall time, timestamps or latency | 270 |
| Generated run/study/activation/provider identities | 313 |
| HTTP polling/scheduling, with mutation parity checked | 17 |
| Additive T07 exposure provenance | 70 |
| T07 participant source identity | 44 |
| Export contract 6 → 7 | 4 |
| Exact source/provenance identity | 96 |
| Generated identifiers in HTTP paths | 71 |

All 30 benchmark files remain byte-identical to assigned integration `e2d42c9`.
Frozen runner SHA-256 is
`b6438d9fa3390d05f4f3c5583aa1e0e6f2095d1db653060257cdc817138a5826`;
cases SHA-256 is
`6e4f138cf31d32b8a5e28e348edbccc2e9b1308b62f8b274d39cf0f24ba33a6e`.
T06 comparison and frozen analysis snapshots, T03 source-pinned mechanics and
immutable reuse, both real Sol discovery fixes/tests `0ea4064` / `a874f7c`, copied
probes and the T02 isolation gate remain. No T09/T15/T19 implementation or
generated admission was added.

### Evidence custody, limits and handoff

Before merging, **complete** ignored source `data/t07/` was preserved without
overwrites under `.tools/research-harness/evidence/T07/`. All **2,161 indexed
files / 250,415,161 indexed bytes** verify against child manifest SHA-256
`05790f34953d8b841c3ab66b17e8c466d863f61245dbb7beea69661f2e192841`.
Complete preservation includes manifest/opaque fixtures: **2,164 files /
251,316,466 bytes / 176 symlinks**, canonical inventory SHA-256
`94c1edfd1d132b8d93bcf287a24e95b80f40b60e4b358e2a7dbdb28fced627f8`.
All **499** child compression mappings verify, including decompressed sizes and
hashes. Source/copy inventories and source HEAD/index/status were reverified
unchanged. Source checkout `/home/agent/.t3/worktrees/workspace/t3-8e1a5746` stays
intact. Preservation record SHA-256 is
`0d6caba9f1c0dd81ebf30bbb6e78193f3b7b99b909dd0a392fc4dcab8a395001`.
Two known synthetic pytest `.env` fixtures were handled only as opaque hashes/
copies after checking their tracked generator; no contents were printed/committed.

Fresh `T07-integration/verification-manifest.json` freezes **1,659 files /
93,761,566 bytes / 263 symlinks / 51 check records**, including **11 nonzero
attempts**, source/case identities and raw results. Canonical SHA-256:
`513ccf5f40434015168907be783f40c045064fc572c7bafa861f2acc39c94001`;
manifest file SHA-256:
`b0d3a0b83a67b17037f0c539d086eb600febdd9e4557fbe41387e476195667f3`.
The manifest excludes itself, reproducible clean-clone Git metadata and the
separate later `acceptance-checkpoint/` records. That directory retains the two
manifest-helper failures, successful freeze, final acceptance HEAD/hook result and
postcommit inventory recheck. Never overwrite a frozen manifest.

Only closed, task-owned fresh outputs were losslessly compressed: **822 mappings**,
**294,764,108 bytes saved**. Every raw/gzip digest and decompressed size verifies;
no frozen child/prior evidence, valuable data or other checkout was altered.
Shared free space fluctuated down to about 106 MiB during bounded browser checks;
no fresh ENOSPC failure or host/storage/security change occurred. Final resource
measurement is recorded separately with the acceptance checkpoint. No obsolete
Docker pruning or other maintenance was repeated.

Prior evidence is unchanged: **24,393 files / 2,055,181,108 bytes / 1,119 symlinks**,
canonical SHA-256
`e5e63dddd364f94d2a4ce64fadd4cd2c9823d6f8c756a8570007a4bb72ef5444`.
All **1,745 Sol artifacts** verify; manifest SHA-256
`286209af7b340d1c38766b4a2ed008a4a791d867bb3f6e195f5500ed5769d4c8`,
canonical SHA-256
`809deca0dc521829b6f18840daf926c0620e6f176a610bfd51f3926fcfa45d90`.
Stash `f771128ba1c9295262a4073df40cc25647b1370f` remains. Root `pbcopy` was never
read/copied/archived; clean tracked-only captures exclude it and real configuration.

Review spend **$0**, no paid Luna; global Sol remains **$0.611632 / 55 requests**,
**$9.388368 remaining**. Mechanical DEVELOPMENT validity is separate from live,
held-out and generalization competence, which remain unverified. No descendants,
publication, PR/issue edits/watches/closure or worktree cleanup. **T19 is Ready**;
**T10 still waits on accepted T09**. T09/T15 remain running, unpolled and untouched.
Root resumes shared-checkout ownership and owns publication/new frontier at
https://github.com/jaiamin/ass/pull/32. Hosted checks/reviews were not queried.
