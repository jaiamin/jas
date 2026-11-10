# T18 / #29: declared fallible adjudication

Status: **bounded BACKEND implementation; incomplete and unaccepted**.
ROOT released S1 once, S2 conditionally and S3 after the intended red. Setup,
own-import proof and the frozen first tracer red are recorded below. Frontend,
browser/service/production, new dependencies, actual provider/paid/live/held-out
work and publication remain held. Earlier preparation statements below record
that source-only boundary; later observations supersede their pending status.

## Authority and source identities

- Assigned Linux Docker Sandbox checkout:
  `/home/agent/.t3/worktrees/workspace/t3-9a531151`, branch
  `t3/t18-fallible-adjudication`. Initial tracked tree was clean; initial HEAD
  equals published frontier `a4ed87430040bfb19e554ab7721ec56412a075d5`.
  No ancestor AGENTS file was present; the checkout's `AGENTS.md` applies.
- ROOT subsequently published the documentation-only policy frontier
  `fdfb5f7a2768d159c4b523e02dfdaaecfe1bc0bd`, whose parent is `a4ed8743`.
  Its compact-report qualification section was read directly from that commit.
  Normal merge is required before ticket completion, after the commit/hook
  stage is released. It has not been merged during this preparation.
- Accepted application repair remains
  `23de5e48ed1aab790d634ec434cf10e8f91c7d9b`. Source diff from that repair to
  initial HEAD contains no `backend/src` or `frontend/src` changes. Current
  contracts remain **DB11 / export12 / library7**. No provisional T12/T17 merge.
- Read the explicitly invoked `implement-spec` and `tdd` skills, including
  TDD's test/mocking guidance; the spec, exact T18 ticket, current handoff and
  progress, compact historical report, final product plan, architecture, design,
  glossary, both ADRs and the relevant production/test paths below.
- Scope: [T18](../RESEARCH_HARNESS_TICKETS.md#t18--inspect-a-declared-fallible-adjudication-and-replay-its-consequences),
  [spec](../RESEARCH_HARNESS_SPEC.md), parent #11 and child #29. This is one
  implementation sub-agent in the assigned branch: no descendants or checkout.

Git blob identities at the initial frontier (Git object IDs, not run evidence):

| Source | Blob |
| --- | --- |
| `docs/RESEARCH_HARNESS_SPEC.md` | `1e9eff9a2b54664ad909a8db2029a078c13e614f` |
| `docs/RESEARCH_HARNESS_TICKETS.md` | `9e530396d86f38ac650f3fee8a375de5bb675d89` |
| `docs/ARCHITECTURE.md` | `02fd4de830471477c952190e4a2a03c4c0a58e1c` |
| `docs/DESIGN.md` | `171597fbbffe26b507a918913da04533373420a6` |
| `docs/GLOSSARY.md` | `bc12f9638220760fe7b75805a3f0bf95338da652` |
| `simulation/artifacts.py` | `12acc6c0b0be95c08cb6ce3d65c1cbc2d174c562` |
| `simulation/world.py` | `75049fd8c830f93c981925e434e55eeb78f5c246` |
| `simulation/checkpoints.py` | `d3e20bf9a7fced31634afbfbf9a5a85c8b5c9331` |
| `domain.py` | `c781ffe962c95888a47dfcc8faab32b7980c411c` |
| `execution.py` | `305e8a9078197a9f69b1a9d15e7c5ab9a68cea3d` |
| `llm.py` | `052d2f71c99daa672f8656fa1624bc80e19c1aa5` |
| `research.py` | `1b81ee70618f8241302a27afdd7156b93f725c61` |
| `exports.py` | `22af4ab6256022a6d257c4abe7b7b3652d44a4d6` |
| `extensions.py` | `527fb44900cea512bbad3f3b0d5826259d94497e` |
| `investigations.py` | `b76b7afa80916dffdfc0584901ec0ca997fc0cc5` |
| `backend/tests/conftest.py` | `1ed7487fe83c7ca5a0ebae3b864bb571b0902022` |
| `backend/tests/test_artifact_workspace.py` | `ded96358d510bae8154fde4df3624e60e8fe5da4` |
| `backend/tests/test_artifact_lifecycle.py` | `c67eb4e4f442542785993154cc6143fd75dadb37` |
| `backend/tests/test_investigation_review.py` | `8e7b6a0acb5b3cc9103b679af9df3d42ab95b028` |
| `backend/tests/test_research_baseline.py` | `f90155933499f1e735506fd43ccc8a04cfbf9cca` |
| `backend/tests/test_llm.py` | `269e7b29935e2ece22e3e16aed326b83500f9bfb` |
| `backend/tests/test_extension_admission.py` | `2e8a929344a57d55dcd4b236a7d0aeb7498de7cd` |
| `benchmarks/research-cases.json` | `1f7d1d21fddefd82b19974868d51064b1b8eec01` |
| `benchmarks/research_baseline.py` | `2bcb346da02533b91e61d85a7d224c0272df8e71` |
| `benchmarks/results/score-history.json` | `0a07b132e1b57eaf65449af6f860e610a0ea319a` |
| `benchmarks/results/REPORT.md` | `2738e6ed5d3ea189c71acb26e07cc19f491bb652` |
| `pyproject.toml` | `234a69f56644441a3422d8beee9a4a24f7039a48` |
| `uv.lock` | `d3fbd99f1e488a10c96afe9caac81d955c8c6506` |

Unqualified source names in this table are under `backend/src/agent_sim/`.
The new tracer's staged blob is recorded below after source preparation. The
policy compact-report blob at `fdfb5f7a` is
`a4a07d24ea56fc5231a2f1242179b63866bcda2b`. No historical raw artifact was
opened, recovered or used as a reference.

## Acceptance criteria and limits

- [ ] Review declares a versioned narrow mechanism, rubric, exact permitted
  inputs, model, inference/response limits and allowed effect before Run/Step.
  Saving, checking, catalog discovery and ordinary chat never call a judge.
- [ ] Immutable revisions pin that declaration independently of later library
  edits/deletion. Version affected persisted/canonical/export contracts together;
  reject incompatibility explicitly, with no aliases, migration or data reset.
- [ ] Record exact bounded inputs, raw fallible ruling/explanation, request and
  source identities, configuration, usage, errors and the distinct enforced result.
- [ ] World code checks actor/ACLs, artifact/source versions, every literal
  requirement, ruling scope and fact assertions before any permitted mutation.
  No prose, participant role or judgment can grant access, alter executable
  facts, invent a participant response or establish private belief/intent.
- [ ] Every judge request uses the existing atomic reserve/settle ledger and
  correct ownership/ceilings, including known failure, unknown usage,
  cancellation, settlement failure and primary-error preservation. No retry,
  substitution or duplicate send. Judge work is not participant inference.
- [ ] Preserve one Engine/writer, append-only attempts/evidence, pause/queued
  pause/reconnect and restart semantics. Committed rulings restore and replay
  without providers. Incomplete attempts remain visible and never auto-resubmit.
- [ ] Review, existing run Environment/Record/request inspection and export
  distinguish raw judgment from enforced consequence, with normal mobile/theme/
  keyboard/loading/error states. No new technical dashboard.
- [ ] Observe one red before production edits, then implement/verify one slice
  at a time. Run affected/inherited regressions and fresh current-contract
  qualification under ROOT's separate grants; retain all actual failures.
- [ ] Assess executable correctness separately from defined rubric accuracy,
  semantic uncertainty, disagreement and live competence. Deterministic provider
  stand-ins establish orchestration/evidence only; no live/held-out gate passes.

The already approved primary seam is the **real public HTTP workflow**. Existing
World/provider/accounting/privacy/replay seams supply independent oracles. This
does not ask to re-approve any testing seam.

## Frozen DEVELOPMENT task and public tracer contract

Case family `t18-pickup-note-development-v1`, seed **18131**, one author and two
decision opportunities. This is a deliberately small writing judgment, not
extension generation, human validity or a general semantic oracle.

Immutable readable artifact `pickup` v1 contains exactly
`{"desk": "west", "closes_at": 17}`. Writable `report` begins at v1 with
`{"desk": "", "closes_at": 0, "guidance": ""}`. The author has one write.
An unrelated unreadable `sealed` object and private goal have synthetic canaries.
No judge receives either canary, profile/goal, notes, history, other objects,
database access, researcher context or provider reasoning.

`pickup_note_actionability` **1.0.0** judges only whether `report.guidance` gives
a first-time visitor a coherent next action and distinguishes confirmed pickup
facts from an unconfirmed fallback. It is not a keyword/exact-string check.
World code separately requires `report.desk == "west"` (string),
`report.closes_at == 17` (integer, not bool/string) and citation of `pickup` v1.

Proposed minimal public declaration for the tracer:

- `parameters.artifacts.judgment`: mechanism/version, target `report`, field
  `guidance`, and `pickup` v1 evidence restricted to `desk` and `closes_at`.
- Condition `adjudicator`: version `1.0.0`, explicit model, low reasoning effort,
  512 response tokens. Keep this auxiliary identity separate from Luna's
  participant model/harness and reusable World mechanics.
- Only explicit `submit_artifacts` with passing hard checks can request judgment.
  `check_artifacts` remains a pure literal check. Hard-check failure sends no
  judge request and retains the existing unsuccessful submission semantics.
- Ruling fields: `verdict` (`accept`, `revise`, `abstain`), bounded explanation,
  and exact typed fact assertions naming the declared source/version/field/value.
  Require the complete declared assertion set once each. Unknown fields,
  sources, duplicate/missing assertions and mismatched facts cannot settle.
- The only effect is the submitted task's terminal result. Valid `accept` plus
  passing World checks permits `success`; valid `revise`/`abstain` permits
  `failure`. An invalid ruling fails the attempt without committing that turn.
  It cannot write documents, spend write units, grant ACLs, create messages or
  responses, change the closing hour or claim a visitor actually collected a book.
- Retain a researcher-scoped `adjudication` event with mechanism/version,
  adjudicator configuration, exact inputs, raw ruling, request ID and a separate
  `consequence` receipt (`applied`, `submission_status`, `hard_facts_passed`).
  Failed/incomplete requests retain ledger/attempt evidence even without a turn.

These are proposed public data fields, not a mandate for new Engine/adaptor
hierarchies. Ordinary artifact tasks retain their deterministic meaning.

**Model authority remains an explicit unknown.** The spec fixes Sol for the
Researcher/planner/assistant and Luna for model participants; it does not name
an adjudicator. The tracer uses an in-process scripted boundary under the
already priced Sol identity solely to separate auxiliary work from Luna. That
fixture is not a live model selection, default or spending permission. ROOT
must resolve adjudicator model authority before enabling live judge work.
Existing investigation authorizations also have no adjudicator identity/scope;
they must reject such work until the displayed authorization explicitly covers
it. Never relabel a judge as an analyst/participant to bypass the guard.

## Independent oracles frozen before any T18 outputs

The following inputs/expectations are authored from this task/rubric and the
accepted invariants before provider/candidate outputs. They are DEVELOPMENT,
not held-out cases. Literal World outcomes are separate from fallible reference
labels. No recorded second reviewer, model disagreement or accuracy is claimed.

| Case | Input / change from fixed facts | Independent expectation |
| --- | --- | --- |
| J01 clear | “Collect the reserved book at the west desk before 17:00. If you cannot get there in time, ask the library about another pickup date; availability is not confirmed.” | Defined rubric reference: `accept`. Under a valid scripted accept, two turns, report v2, no writes remaining, terminal success and `artifact_success=1`; source remains unchanged. |
| J02 opaque | “There is the place and the time. The other thing can probably be arranged.” | Defined rubric reference: `revise`; it gives neither an identifiable pickup action nor a qualified concrete fallback. A valid revise produces unsuccessful submission even though the two literal fields pass. |
| J03 borderline | “West desk, 17:00. Another day might work; ask first.” | No uniquely scored label. Accept/revise/abstain may reflect different readings of actionability. Preserve observed rulings/reasons and report disagreement/abstention separately; do not post-select a reference label. |
| J04 unsupported | “Collect at the west desk before 17:00. If late, your book is guaranteed to be held tomorrow.” | Defined rubric reference: `revise`; the fallback guarantee is unsupported by the allowed evidence. A judge accepting it is a rubric error, not a new executable guarantee. |
| F01 mismatch | Work has `desk="north"`, or closing hour `18`, `"17"` or `true`; source citation otherwise valid. | World hard-check failure; no judge send and no success. Report versions/remaining allowance are not changed by submission. |
| F02 contradiction | Correct work, but raw accept asserts source `closes_at=18`. | Reject the ruling at the World fact boundary; preserve raw ruling and charge; no submission turn/state mutation or retry. |
| F03 unsupported source | Raw accept references `pickup` v2, unknown field/object, duplicated/missing fact, or `sealed`. | Reject scope/assertions; no hidden object lookup, fact disclosure or state mutation. Same generic inaccessible-object error for missing/forbidden targets. |
| F04 denied authority | Participant or judge asks to write/read `sealed`, replace an ACL, fabricate a recipient response, private belief, effect or code execution. | Actor/world/schema denies; no protected names/payloads in actor/judge input, schema, errors or memory; raw prose remains inert. |
| F05 wrong pin | Stale work version, other run/turn/actor/configuration/input receipt, or changed mechanism/rule version. | No settlement with the wrong ruling; complete checkpoint/evidence immutable. Incompatibility is explicit. |
| F06 unsuccessful | Valid `revise` and `abstain` on the same otherwise correct work. | Terminal failure, `artifact_success=0`, no invented response or rewritten literal facts; raw ruling and enforced failure both inspectable. |
| L01 accounting | Each of two Luna replies: 101 input / 37 output tokens. One scripted Sol ruling: 41 input / 19 output. | Charges **29 + 29 + 272 = 330 microdollars**; 3 requests, 243 input / 93 output, known usage. Participant effort is only 2 requests / 58 microdollars. Actual paid spend is zero. |
| L02 failure/cancel | Judge fails before usage, fails after known usage, or cancellation races settlement; second settlement failure. | No fabricated ruling or consequence; unknown reservation retained, known usage settled once, primary provider/cancellation error preserved. No silent retry/substitute. Independently frozen failure schedules precede each later slice. |
| L03 lifecycle | Pause before request vs while judge in flight; duplicate start; crash with pending vs completed ruling. | No new judge send after a queued pause; in-flight final work respects the declared commit boundary. Restart pauses/interrupts without resubmission; completed evidence stays append-only. A completed response without committed turn is an interrupted attempt, not an auto-applied consequence. |
| R01 restore/replay | Committed J01, then a new app with providers that fail on any request. | Identical recorded inputs/ruling, versions, facts, events, measurements and checkpoint; verify two turns with **0 model requests**, unchanged ledger; corrupted ruling/input/consequence must fail verification. |

Reference rubric accuracy is defined only for **J01/J02/J04**, with denominator
three and each result retained separately. J03 is an uncertainty/disagreement
case and never enters that accuracy denominator. Unsupported and contradiction
paths F01–F06 measure enforcement, not judgment quality. A scripted correct
answer cannot establish measured live accuracy. Free explanations can be false:
World validation checks explicit fact assertions and permitted effects; it does
not certify semantic truth of explanations or participant text. Such prose stays
visibly fallible/unassessed and cannot replace literal facts.

Exactly one new test is staged:
`backend/tests/test_fallible_adjudication.py::test_declared_judgment_is_recorded_enforced_and_replayed_without_sampling`.
Its prepared Git blob is `bdf6a6630e1af096b6dd2272829414e1eb82fb36`.
It is the single J01 vertical tracer: review/validate/save without spending,
explicit execution with real Engine/accounting, distinct ruling/consequence,
private-input boundaries, export, app restoration and zero-call replay. It is
**unrun**, neither skipped nor claimed red/green. Additional cases remain this
frozen table until a concrete subsequent slice is released.

## Existing boundaries inspected; no repair proposed without a red

- `execution.py`: one start lock and per-run execution record; `_preflight`
  offloads through `asyncio.to_thread`; study startup checks every candidate;
  sealed-relay `World.step` is offloaded. Final accepted responses commit after
  Pause. The turn/checkpoint/events/measures/activation settlement share the
  optimistic single-writer transaction. `Engine.pause` also pauses its owning
  investigation, preventing the parent from restarting the child.
- `investigations.py`: worker-backed save runs off-loop and is shielded through
  cancellation before returning it; decision append reads the current record
  after obtaining the database write lock. Queued startup treats only
  paused/pausing parent state as a waiting continuation. These are the accepted
  T14 repairs, not T18 defects to rediscover or duplicate.
- `extensions.py`/`extension_sandbox.py`: current qualified runtime is required
  for every execution and even empty replay; source/runtime mismatch, restart
  and worker/cleanup failure revoke authority. Worker inputs are copied bounded
  integers with no credentials. T18 adds no generated executable path.
- `llm.py`: Pydantic AI, one request per reservation, retries disabled, atomic
  study/workspace/investigation reserves, independent settlement, unknown usage
  retained, primary errors/cancellation preserved. The current investigation
  model guard chooses researcher versus participant by ownership, so it cannot
  silently authorize a new adjudicator role.
- `research.py`/`exports.py`/routes and frontend review, `ArtifactView`,
  `RunRecord`, `RequestInspector`: immutable source and complete turn evidence
  are exposed already. Current request UI labels non-analysis work Participant;
  judge work needs its own existing-table label. Participant effort queries
  activation-linked calls, so auxiliary judge charges must not enter that count.
  Export currently omits a request's `purpose`; adding judge provenance must
  make its actual role identifiable. These are inspected integration needs,
  not implemented findings or freshly verified behavior.
- Relevant inherited tests cover artifact ACL/version checks, actual process
  restart/unknown usage, provider/settlement cancellation, independent T14 HTTP
  actual-worker Pause/startup/save, admitted-runtime loss and exact replay.
  Their source was read; none was executed in this branch.

## Post-retirement qualification contract

The section **Qualification after historical evidence retirement** at published
`fdfb5f7a` governs. No historical raw BEFORE is designated. Do not search other
owners, recover retired snapshots, reconstruct a purported retained reference,
invoke a comparator requiring deleted BEFORE, or claim historical zero
regressions/improvements. Older raw-evidence links are historical narratives.

Preserve original frozen T01 case/runner/score bytes. A later granted invocation
must record the **current-source actual** exit/checks, including whether its
four historical export-v4 failures recur. The baseline's own `snapshot()` uses
`git ls-files --others`; its four unit invocations are indirect producers.
Every invocation must select safe tracked regular files before any hashing/read,
including synthetic test descendants. Recorder-only filtering is insufficient.

The replacement is **fresh current-contract qualification** plus affected/new
feature regressions. Freeze full literal bounded inputs/actions/evidence/
checkpoints/privacy/cutoffs/replay/integer ledgers before that qualification's
outputs. Committed `benchmarks/research-cases.json` supplies these still-applicable
finite expectations, not deleted data or current candidate outputs:

| Case / runs | Turns and requests | Literal expected result |
| --- | --- | --- |
| `simple-binding-split` / 1 | 2 | Offer 5 from pie 14 then accept; balances sorted `[5,9]`. |
| `three-signal-disclosure` / 2 | 3 each | Own-signal choice at reward 7, accuracy 1; `[7,7,7]`; public-signal counts 0/private and 3/disclosed. |
| `four-feasible-promises` / 1 | 8 | Round 1 all contribute 2/promise 3; round 2 a=0, others=3; `[15.5,15.5,15.5,18.5]`, 4 eligible/3 fulfilled. |
| `six-token-permissions` / 1 | 6 | Only a allocates 4 to b, five workers work; `[2,2,2,2,6,8]`, shared output 10, role labels confer no authority. |

Total: **5 runs / 22 turns / 22 scripted requests**, each 100 input / 50 output
Luna tokens and 35 microdollars; total **2,200 / 1,100 tokens, 770 microdollars**.
Reservation expectations must use the exact frozen complete request bytes and
the declared price/input-bound rule, checked as integer ledger entries rather
than accepting aggregate rounded floats. Private facts must be absent from
public/unauthorized projections; cutoff inspection/export cannot add later
evidence, mutate source or spend. Restart/replay require zero new sends.

**Not yet prepared/released:** the independent fully enumerated 22-request
normalized-input/checkpoint/ledger manifest and source-keyed collector. They
must be frozen before that matrix runs, independently of application outputs;
this table alone does not claim full-input coverage. Neither obsolete T01
unsupported case (`commons` with one actor / environment `artifact`) is a
T18 semantic test. Any fixture made inapplicable needs an explicit frozen
coverage replacement first. Do not alter/rebaseline T01 to conceal failures.

## Private setup, output and peak forecast for ROOT

Forecasts only, not measurements or allocation. ROOT last reported approximately
1.84 GB shared free, **unreserved**; no own disk/cache/environment probe has run.
Use the shared lock for every later job:
`/home/agent/.t3/worktrees/workspace/t3-fdf9bdeb/.tools/research-harness/checks.lock`.
Retain ordinary **134217728**, setup **201326592**, production **268435456**
free-byte floors throughout each stage, with additional forecast headroom at
entry. Stop on missing dependencies/headroom; do not change floors or bypass
policy, fetch unapproved packages, clean owner caches or choose another owner.

1. **Proposed S1, one backend-only normal-manager setup, held.** Existing ROOT
   `/home/agent/.t3/worktrees/workspace/t3-fdf9bdeb/.tools/uv-bootstrap/bin/uv`
   may be used read-only only with ROOT's grant.
   Distinct environment `.venv`, managed Python under `.tools/t18/python`,
   temporary/build data under `.tools/t18/tmp`, no sibling installed-tree reuse.
   Prefer `uv sync --frozen --offline --python 3.13` against the exact owner-
   confirmed T14 uv cache through uv only. **T18 has no cache-consumer grant.**
   Required: ROOT coordination and T14 cache owner's explicit normal-manager
   reuse permission, including normal cache metadata/locking; exact cache and
   interpreter source must be confirmed without inspecting their payloads.
   No pnpm/store/browser allocation is requested. Conservative incremental
   setup ceiling **512 MiB peak**, **256 MiB retained environment/Python**,
   **1 MiB receipts/logs**; require at least **738197504 bytes** free at entry
   (setup floor + peak). No assumption that hardlink import has zero physical
   cost. Missing offline metadata/interpreter stops; online/private-cache
   fallback needs a separately concrete forecast/grant.
2. **Proposed S2, ONE first-red tracer invocation, separately held.** Use only
   this checkout's environment and task-local pytest temp/cache. Retain a
   compact source-input list, command, exit, log/JUnit and test data, at most
   **4 MiB output**, **64 MiB incremental peak**; entry at least **201326592
   bytes** (ordinary floor + peak). No other test or production edit before
   its actual observed failure. A source/runtime setup error is not a red.
   Proposed payload after the grant (not run):
   `.venv/bin/python -m pytest -q backend/tests/test_fallible_adjudication.py::test_declared_judgment_is_recorded_enforced_and_replayed_without_sampling`,
   with `--basetemp=.tools/t18/tmp/first-red`,
   `-o cache_dir=.tools/t18/pytest-cache` and JUnit/log output beneath
   `.tools/t18/attempts/first-red/`. No `uv run` sync is implicit in this stage.
3. **Later stages remain held.** Bounded backend slices need fresh forecasts
   (initial estimate: 16 MiB output / 128 MiB peak per segment). Frontend setup,
   browser/production, full current qualification, hooks/commit and provider/
   held-out work each need concrete ROOT release. Browser port **18131** is
   proposed only: no socket was opened or process started. New dependency or
   production footprints are unknown and cannot be inferred from historical
   hardlink counts.

If later evidence requires a recorder, author a transparent own compact source
collector in this checkout; do not execute inherited ignored helpers. Prefer
explicit relevant source lists and Git blob IDs over a whole-checkout archive.
Before any payload read, enumerate names, reject **every `pbcopy` / `.env*`
component and configuration/credential file**, reject symlinks and descendants
using `lstat`, require tracked regular files, then allow only approved inputs.
Apply the same policy at the Git-selection boundary of every nested producer,
including frozen T01 unit tests. Never open/hash/copy/capture/change/delete the
original ROOT untracked `pbcopy`, real configuration or synthetic `.env` content.
No inherited snapshot is safe merely because the outer recorder filters it.

## Preparation handoff / next decisions

- Prepared paths only: this document, the single unrun tracer, minimal
  `HANDOFF.md` and `docs/RESEARCH_HARNESS_PROGRESS.md` notes. All product source,
  frozen baselines, environments and services are unchanged.
- Remaining unknowns: live adjudicator identity/authority; explicit investigation
  judge authorization; final version bumps coordinated with ROOT (no provisional
  T12/T17 imports); granted cache/interpreter path and actual peak; full literal
  current-contract manifest; observed red/green; lifecycle/adverse coverage;
  browser/production qualification and live rubric accuracy. No fresh test,
  benchmark, semantic, health or acceptance score exists.
- Some broad source reads truncated and were followed by bounded source reads.
  Mistyped source-only artifact/snapshot lookup paths returned missing-file
  errors; the actual artifact tests and baseline snapshot source were then read.
  These are exploration attempts, not product failures or executed checks.
- Next boundary: ROOT's concrete S1/cache-owner release, then separately S2.
  Continue the implementation only through released stages; normal-merge the
  exact published policy frontier before final ticket completion. No commit,
  push, PR, watch, paid/provider call or acceptance is claimed.

## ROOT backend release and observed boundaries

ROOT explicitly selected `openai:gpt-6.1-sol` as the initial permitted explicit
adjudicator configuration, separate from Luna. This resolves the implementation
model-choice unknown; no implicit judge/default/substitution or actual provider
work is authorized. Investigation work must reject a judge not explicitly
covered by its displayed authorization. Coherent checkpoint hooks/commits and
normal merge of published `fdfb5f7a` are permitted after a qualified slice.

S1 `setup-01` passed once: exact ROOT uv, owner-granted T14 cache, frozen/offline/
hardlink sync with `/usr/bin/python3.13`, distinct `.venv`, task-local temporary
files, bytecode disabled. Own import proof reports this checkout's `sys.prefix`
and `backend/src/agent_sim/__init__.py`, base executable `/usr/bin/python3.13`.
Environment: 180,513,935 logical / 201,515,008 allocated bytes across 7,573
regular entries (not a claim of isolated physical allocation). Shared free was
1,753,100,288 at entry / 1,749,229,568 minimum and exit; observed shared net peak
3,870,720 bytes. Receipts/log/proof before the closing source list were 11,335
logical bytes. No retry/fallback/download/cache maintenance; lock released.

S2 `first-red` ran the exact frozen tracer blob
`bdf6a6630e1af096b6dd2272829414e1eb82fb36`, without a prior production edit.
Pytest exit1: **1 failed in 0.27s**, expected 200 versus actual HTTP422 on
`parameters.artifacts.judgment` and condition `adjudicator` extra-forbidden
fields. This is the intended product/API failure, not a setup error. Shared
free: 1,748,373,504 entry / 1,747,746,816 minimum; output footprint after the job
289,734 logical bytes, unchanged environment, lock released. No model boundary
was reached. Compact receipts, source lists, original log/JUnit and temporary
database stay under owned `.tools/t18/`; no source archive was produced.

S3 is now released: one backend vertical slice at a time, then the independently
frozen boundary/lifecycle/accounting cases and affected backend/static/type
checks. Per job: 128 MiB peak / 16 MiB new output, 64 MiB retained total,
ordinary134217728 floor plus forecast at entry, shared lock released between
jobs. The transparent own recorder `.tools/t18/record.py` captures only curated
safe source identities and command/resource outcomes; no inherited helper is
executed. Frozen T01 and full current-contract qualification remain separately
source-frozen work, never a comparison to deleted BEFORE data.

S3 `first-green-01`: unchanged first tracer **1 passed in 0.36s**, exit0.
Entry/minimum free 1,701,691,392 / 1,700,700,160; observed shared net peak
991,232 bytes. Retained own output 621,254 logical bytes at that boundary;
environment unchanged, lock released. Explicit Sol call uses the existing
ledger with purpose `adjudication` and no participant activation ownership.
Raw receipt and World consequence persist separately; restored replay consumes
the ruling and makes zero provider calls. This is an orchestration result,
not live judgment accuracy. Candidate contract versions are DB12/export13/
library8/artifact2.0.0, rejecting incompatible data without migration/reset.
`static-01` found one import-spacing error; retained unchanged. `types-01`
passed. Further affected and adverse checks, pre-execution review details,
lifecycle safety and all held UI/qualification gates remain outstanding.
