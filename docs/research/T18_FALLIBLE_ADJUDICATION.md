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

## Backend continuation boundary (before final-source merge)

`e16a7ebf` records the first qualified vertical slice; normal merge `1a7ad1d3`
includes exact published `fdfb5f7a`. ROOT's superseding final target is now exact
`0527e737d93786d0f5579d5a13827c472cf370fa`; its quality-review cutoff repair
and navigation-audit correction were read directly at that tip. No sibling
implementation or moving ref is an integration target.

Subsequent independent DEVELOPMENT cases cover literal facts/typed scope,
ACL/opaque object denial, inert prose, scripted accept/revise/abstain and
unsupported-guarantee rubric errors; per-request integer accounting, atomic
study/workspace ceilings, known/unknown/cancellation with a real SQLite
settlement-failure trigger; actual-process crash before response and after
recorded ruling but before turn commit; queued pause, duplicate in-flight Start,
missing judge provider preflight, investigation authorization denial and
cross-run ruling provenance. Successful replay/restoration calls no provider.
Investigations explicitly reject adjudication: their current displayed
researcher/participant authorization grants no judge identity or scope. This
implementation does not add a new authorization flow or implicit judge.

Observed product reds, each retained before its narrow repair: missing rejected
ruling receipt; Pause before judge dispatch; Pause while judge waits for provider
capacity; absent declaration in preflight; identical ruling borrowed from another
run accepted by replay; investigation scope permitting participant work; missing
judge provider allowing Start; and judge-effort-only conditions called duplicate
arms. The last red `judge-contrast-red` failed HTTP preflight's empty-duplicates
assertion; `judge-contrast-green` passes after adding adjudicator settings to the
condition grid and a separate `changed_adjudicator` comparison. Participant
assignment remains distinct. No live accuracy is inferred from any stand-in.

Adverse fixture/check attempts are also retained: incorrect export activation
path; six rubric fixtures lacking immutable source `operation:0`; two scope
fixtures stopped by question-quote then researcher-token validation (not product
reds); import spacing, Event polling lint, line lengths and JSON-inference types.
The corrected preflight-scope attempt was the genuine red. The subsequent
`static-04` whole backend/benchmark/script Ruff and `types-03` global ty passed.
They predate the final contrast and integration and are not final-source checks.

`feature-qualification-01`:41 passed/6.21s; `inherited-engine-01`:25/1.80s;
`inherited-ledger-01`:12/0.43s; `inherited-artifact-01`:10/1.15s and
`inherited-artifact-02`:15/1.16s; `inherited-library-01`:13/1.41s;
`inherited-review-01`:676/52.52s. The last group includes the real accepted T14
worker/save/Pause boundaries without replacing them with mocks. These results
are finite preservation checks, not final ticket acceptance. The contrast test
is additional to the41-feature result.

Every job used the shared lock and released it. Environment remains180,513,935
logical/201,515,008 allocated bytes. The last job entered at1,104,269,312 free,
minimum1,084,129,280, observed shared net peak20,140,032; retained own output
40,251,658 logical bytes. Earlier `compact-01` losslessly compressed CLOSED
SQLite outputs, verified decompressed hashes and recorded exact per-file
path/hash/size/mode/uid/gid/integer-ns restoration in
`.tools/t18/sqlite-restoration.json` before removal. Added observed peak12,288
bytes, within8MiB; logs/JUnit and adverse attempts remain. Further compaction
will use only that own closed-output mechanism, never another owner's files.

Final-source backend qualification is now released under the unchanged128MiB
peak/16MiB output per job,64MiB total and entry>=268435456 rule. The literal
22-request reference and invocation-local safe snapshot guard must be frozen
before outputs. T01 runner/cases/scores remain untouched; obsolete unsupported
capability descriptions need explicit current replacements. Frontend/browser/
services/production/providers/live/held-out/publication remain held;18131 is
unopened. No semantic-truth, generic-competence or live-rubric-accuracy claim.

At this coherent pre-merge checkpoint, `static-05` (all backend/benchmarks/
GitHub-script Ruff) and `types-04` (global ty) pass after the contrast repair;
`git diff --check` is clean. The frozen first tracer still has its original
blob `bdf6a6630e1af096b6dd2272829414e1eb82fb36`.

## Fresh current-contract oracle freeze (before candidate outputs)

The exact accepted ROOT target0527e737 merged normally without conflicts after
coherent e14ee886 (normal Gitleaks passed). Both documentary histories remain.
Candidate versions remain DB12/export13/library8/artifact2.0.0. The merge is
integration, not a passing application test. `compact-02` then compressed only
closed own SQLite outputs: retained40,443,937→6,354,804 logical bytes; observed
added peak24,576 bytes; exact restoration maps remain with all logs/JUnit.

Before any candidate matrix output, `oracle-freeze-01` generated the tracked
literal `backend/tests/fixtures/t18-current-contract.json` using independently
authored stdlib-only `benchmarks/t18_current_reference.py`. It imports/calls no
JAS model, World, schema generator, provider or deleted historical reference.
Every one of22 observations/full JSON prompts, instructions, settings, raw
schemas, decision, events, measures, initial/each final checkpoint, state hash,
input-evidence binding and reserved/settled integer entry is enumerated.
Only generated event identities normalize to per-run turn/event ordinals.
Exact input JSON order matters to the byte-bound reservation. Per-request
100/50 tokens and35 microdollars are fixed, totaling2200/1100/770; replay0.
Finite rules/arithmetic/RNG seeding were read from source and independently
expressed; this is current correctness, not a retained BEFORE comparison.

The four public-HTTP matrix cases preserve4 studies/5 runs/22 turns/22 requests,
including both private/public information arms. Save/preflight spends0. Each
run steps to1, freezes evidence/exposure, resumes, and must preserve the cutoff
and initial/complete checkpoints. All request payload fields, typed events,
measurements and ledger rows are checked. A restored app with provider lookup
that fails checks all committed runs without new sends or source mutations.
A fixed scripted policy cannot demonstrate live competence or accuracy.

Unsupported T01 fixture replacement is explicit before any T01 invocation:
its single-actor commons and unrecognized `artifact` alias still reject; their
historical claims of missing solo/artifact capability are obsolete. The frozen
T18 tracer and inherited solo artifact case positively cover authorized reads,
immutable source/versioned write/submit, exact restoration and replay. A new
current alias-rejection case separately requires HTTP422 and zero spend. The
unchanged T01 runner/cases/scores are never rebaselined to these capabilities.

`benchmarks/t18_snapshot_guard.py` supplies invocation-local Git selection to
EVERY frozen `snapshot()` call and substitutes only the backend digest's unsafe
recursive discovery with the same protected/symlink-safe tracked selection.
The frozen producer itself receives only curated backend/qualification source,
not a whole checkout. Protected `.env*`/`pbcopy` components are excluded before
lookup/read; every selected component is lstat-checked and symlink descendants
are excluded. Guard tests use only empty synthetic protected names, never
configuration payloads. No original ROOT protected file is touched. The
separate direct digest is guarded too; outer recorder filtering alone is not
considered sufficient. No application behavior or historical score is patched.

These qualification cases and the privacy guard are staged/unrun at this
freeze. Their exact Git blobs and literal-fixture SHA are recorded in the next
source-only receipt. Any fixture/adapter mismatch or genuine failure will be
retained and classified before an explicitly versioned correction; no observed
output becomes a retroactive frozen oracle. T01 actual exit/checks remain a
separate CURRENT execution, not a historical comparator invocation.

Freeze identities: reference-generator Git3f6198cccccfde0d5f7ff25b76bb3d11b556ba74;
guard6b5d27651c1195cd2a733a5a82c63f0a852a34df;
literal fixture Git5cfdb486f45a4425ff332b58ffa9d73ca8dbb2d7,
445,836 bytes, SHA256
`028dd37bf5d84758a2db95283855442e44450cbc515f27f046fc108fb102a514`.
Original pre-output qualification-test blob20d93e3cd3c7a17f84aba8266498c69446630243
was strengthened with a synchronous forbidden provider-lookup trap before
candidate execution. The literal reference is unchanged.

`snapshot-guard-01` failed on a synthetic repo's missing HEAD, not on selection
or product behavior. The frozen snapshot selected/archived only allowed.py.
However, setup had used broad `git add backend` on empty synthetic protected
names (no configuration values/payload ever existed). This unnecessary indexing
was removed: guard02 uses name-only Git metadata, so no Git producer can index
those protected names. This adverse setup is retained and privately disclosed
to ROOT; original ROOT pbcopy and real credentials were never accessed.
`snapshot-guard-02`:2 passed/0.14s. It checks the nested frozen producer and its
indirect digest, archive membership and exclusion before filesystem lookup.

`current-matrix-01`: alias replacement passed, bargaining stopped at turn0
because the test incorrectly expected the *raw persisted* instructions to equal
the provider-adapted instructions including the trailing newline. The complete
prompt already matched. Installed Pydantic AI `_instructions.py` explicitly
strips instruction outer whitespace in `_add_instruction_text`/`_add_instruction_part`.
This is an oracle adapter omission, not a product red. The original445,836-byte
v1 fixture remains unchanged. An explicit v2 fixture adds only the expected
provider-instructions string (stripped); all raw request bytes, schemas,
reservation integers, actions/evidence/checkpoints remain unchanged. This
source-derived amendment is frozen before the second candidate attempt; the
adverse attempt and original oracle are retained, never silently rebaselined.

Current matrix v2 SHA256 is
`c23eaf493b3b9ffcc377d9a274b8533abfaa51c07544ee48fa12ebd6ba38ecef`.
`current-matrix-02` bargaining passes; `current-matrix-03` remaining3 cases
(including both information arms) passes. Together4 cases cover5 runs/22 turns/
22 complete stored request payloads, per-request integer reserves/settles,
all observations/actions/events/measures/checkpoints and zero-call restored
replay. The alias replacement passed in the retained first attempt. A later
strengthening, declared before its next execution, additionally requires the
actual FunctionModel tool schema to equal the already frozen raw schema. It
changes no expectation or application behavior. The reference generator now
contains the explicit v2 envelope transformation for reproducibility; v1/v2
literal files stay byte-for-byte unchanged.

`t01-current-01` executes the unchanged runner/cases on current backend source
under invocation-local safe selection: actual exit1; exactly four failed checks,
each `export-v4`, with their original failed flags/check-failure stops. All
other checks pass; both schema-rejection fixtures pass with zero requests.
Source unchanged=true;22 requests/2200 input/1100 output tokens/770 synthetic
microdollars, actual live requests0. The failure is retained, not called green.
Runner SHA256b6438d9fa3390d05f4f3c5583aa1e0e6f2095d1db653060257cdc817138a5826;
suite SHA2566e4f138cf31d32b8a5e28e348edbccc2e9b1308b62f8b274d39cf0f24ba33a6e.
No original score bytes changed and no historical comparator was invoked.

The first standalone unit wrapper lacked checkout sys.path and failed import
before collection (`inherited-baseline-unit-01`), not a product red. After
explicitly selecting this checkout, units02/03 pass one each, including retained
provider failure/unknown usage/no retry. Pytest warns that pre-imported anyio
cannot be assertion-rewritten; this does not alter the frozen test. The third
snapshot-producing unit remains queued, always inside the same guard.

`static-06` found only two overlong reference-generator lines; global `types-05`
passes. The attempted formatter label `format-02` already existed, so the
recorder refused before acquiring a lock or executing a command. No prior
attempt was overwritten. A unique format-current label records the real job.

`current-matrix-schema-01` retained a second adapter mismatch: raw ledger schema
has property titles; Pydantic AI `tools.GenerateToolJsonSchema` explicitly removes
property titles in `_named_required_fields_schema`. The unchanged complete
stored schema assertions already passed; no World/application failure occurred.
The v3 source-derived envelope preserves v1/v2 and adds the literal actual tool
schema/name/description/strict setting. Only property titles are removed; no
constraint, legal action, ACL, observation, raw request or reservation changes.
This v3 is frozen before further actual-tool-schema qualification. It now also
checks no unrelated function tools/text-output channel are exposed.

Sequencing disclosure: while oracle-amendment-03 waited for shared flock, the
next shell prematurely tried to stage/hash the not-yet-created v3 file. Those
commands failed. The first schema02 test was queued too early. Receipts prove
that the independent generator completed/released at1794334604.8643062 and the
candidate job acquired at1794334604.864339; schema02 passed. However, that first
schema02 source list lacks the untracked v3 fixture's pre-run hash. This is a
provenance gap, not retroactive source-frozen qualification. Preserve it. The
v3 file is now explicitly staged/hashed before the new full matrix invocation;
that forthcoming invocation supplies final qualification. No concurrent command
wrote its bytes, and no application production edit was made.

A source review found a coverage gap, not an observed product defect: the new
scope/configuration had not independently exercised reusable-library deletion
and later study-revision edits. Before its execution, new F07 freezes this:
extract/save mechanics without model identity; automatic reuse lacking a judge
must422/spend0; explicit reuse retains Sol/low/512. Change the library desk to
north, delete revision2, then change the study's current judge effort to high.
The original run must retain its v1 west/17 source, low configuration and two
participant+one judge requests330 microdollars; export keeps both immutable
revisions and original source; replay2 turns with0 requests. No production
repair is proposed ahead of observing this preservation case.

## Next UI source-only freeze; setup and execution held

ROOT permits source preparation of exactly one first shell-inclusive UI tracer,
`frontend/src/pages/adjudication.test.tsx`, before any frontend output. It uses
the real WorkspaceProvider/WorkspaceShell, Study and Run pages with literal
HTTP response fixtures; it supplements, never replaces, the real public-HTTP
backend seam. No product UI edit precedes its separately released observed red.
The shell is essential: ROOT withdrew an earlier navigation defect claim after
the isolated fixtures had omitted that existing remount boundary.

UI01 starts at the existing experiment review, opens its stock scope disclosure,
and requires an accessible Fallible adjudication region before Run. Frozen
values: pickup_note_actionability1.0.0; report.guidance; pickup version1 fields
desk/closes_at; adjudicator1.0.0 openai:gpt-6.1-sol, low,512 tokens; participant
openai:gpt-6-luna remains separate; one judge request per submission attempt;
$2.00/million input and $10.00/million output tokens. The reviewer must see
fallibility, allowed inputs, private-fact/response/belief limits and the sole
terminal-submission-status consequence before the first POST.

After that explicit Run action, existing Runs navigation opens turn2 evidence.
The recorded fallible judgment and enforced consequence must have separately
named regions. The literal judge accepts while its explanation claims
"The book is guaranteed to be held tomorrow." Its exact asserted source facts
remain west/17; World permits only submission success with hard_facts_passed.
That unsupported explanation remains visibly raw/fallible and cannot appear as
an enforced availability or participant response. Recorded request identity,
Sol model,41/19 tokens and272 microdollars (currency display may round to
$0.0003) stay with judge work. Two Luna calls101/37 tokens and29 microdollars
each stay participant work; total330 microdollars. This known erroneous rubric
acceptance is deliberate fallibility coverage, not measured semantic accuracy.

ROOT superseded the earlier512MiB setup proposal; no pnpm/preflight was invoked.
Future ONE metadata-enabled normal install would use read-only
`/home/agent/.local/bin/node`24.22.2 and
`/home/agent/.local/bin/pnpm`12.18.0 with owner-authorized coordinated
`/home/agent/.local/share/pnpm/store`, DISTINCT frontend/node_modules and own
`.tools/t18/pnpm-cache` policy metadata. Required flags are `--frozen-store
--frozen-lockfile --package-import-method=hardlink`; the known private-metadata
offline miss is not retried. No T14750-byte cache/other owner metadata access,
manual copies/links, downloads, cache maintenance or policy bypass.

Evidence-based future forecast: modules about373MB logical/426MB inode-allocated
(largely shared hardlinks), private metadata about176.8MB; observed sibling net
new198.5MB is shared/unreserved, not a private physical bound. Conservative
incremental peak650MiB=681574400 plus ordinary floor134217728 requires
entry>=815792128 under shared checks.lock. Setup log/receipt<=1MiB; stop on
missing metadata, failed preflight or output/peak/floor breach. ROOT's observed
714739712 free is below entry. Permission for the future store is not execution
release: setup, frontend checks, service/browser18131, production and all live/
provider/paid/held-out work remain held. No setup preflight or store read yet.

UI01 frozen Git blob is `987d829cf685faaa1b84656c466ca6945184c80a`.
`ui-source-freeze-01` records protected/symlink-safe source identities and a
clean diff check only. It invokes no frontend runtime, compiler, test, formatter,
manager or cache consumer. Its future expected failure is missing product
declaration/ruling presentation after the real shell successfully loads, not
fixture/resize/router/setup failure. It is not observed red or qualification.

## Final released backend boundary (2026-11-10)

Candidate application bytes have not changed since normal exact ROOT merge
`02bd7237413970d68663a909497d4d87408dbe0f`. No provisional sibling was merged.
ROOT's superseding target `670ab3ee73b025ea0695ce941d219be980819a95` adds the
bounded native-HTTP benchmark and documentation, with no application changes
from0527e737. Its normal merge follows the coherent qualified checkpoint.
No container/service/browser/native benchmark or provider work is released here.

The source-frozen full v3 matrix subsequently ran as
`current-matrix-final-01`:7 passed/1.12s, including the four family cases
(five runs/22 turns/22 requests), alias rejection and both snapshot guards.
This is the new qualification after the disclosed schema02 pre-run source-gap;
schema02 remains unqualified for that claim. V3 literal SHA256 is
`0d359265e94d528083a061034e2b3d67760380f4eace3c1228724388995db77c`,
Git blob `67c416815dcaf9f735fd52e478a9307ea3e6d666`. Original v1/v2 files remain.
`references-final-02` regenerates all three independently and checks exact
bytes/hashes, original frozen T01 runner/cases/scoring equality to a4ed8743,
unchanged first-tracer blob and exact accepted ancestry. No candidate output
is used to regenerate any oracle.

F07's first `judge-pins-01` got405 because the fixture used nonexistent PUT
study; this is a fixture failure, not product red. Correct POST `/revisions`
passes in `judge-pins-02` and again within `feature-final-02`:
**43 passed/6.48s**. The first tracer remains original bdf6a663 bytes. Actual
restart, capacity/pause/settlement, budget ceilings, unknown usage/primary error,
hard-fact/ACL/input scope, disagreement and replay/provenance cases stay intact.
The earlier `feature-final-01`42-case pass remains attributed to its older
test membership, not relabeled43.

Closed `.tools/t18/backend-qualification-01.json` independently joins named
receipts and JUnit membership: **373 distinct final-backend cases pass** with
identical backend production source maps in all selected jobs. It retains
exact case IDs, source identities, receipt/JUnit hashes, floor/peak/output
bookends and every nonpass status. Group membership is:

| Group | Distinct cases |
| --- | ---: |
| T18 adjudication | 43 |
| Fresh current contract, alias and snapshot privacy | 7 |
| Engine and ledger | 37 |
| Artifact lifecycle | 3 |
| Participant harnesses | 36 |
| Exposure | 21 |
| Claim support | 31 |
| Domain/DB/library contracts | 18 |
| Reference policies | 24 |
| Researcher design | 8 |
| Uncertainty | 10 |
| Reliance commitments | 51 |
| Reliance integration | 41 |
| Public API, including all six deletion cases | 40 |
| Guarded snapshot-producing T01 units | 3 |

Claim segments execute32 cases with one duplicate; the manifest deduplicates
31. Earlier25 artifact,13 library/reuse and676 validity/instrument/real-worker
results are pre-merge checks; they are not added to this final-source total.
The final three T01 units pass under invocation-local safe selection; the
pre-imported-anyio assertion-rewrite warning remains retained. No comparator
requiring deleted BEFORE was run; its synthetic unit is not a replacement for
retired historical evidence.

`t01-current-final-01` again runs the unchanged T01 CURRENT: actual exit1,
exactly four failed `export-v4` checks with original false flags and
check-failure stops. All other checks and both rejection fixtures pass;
98 HTTP operations,22 scripted requests/2200 input/1100 output tokens,
770 synthetic microdollars, source_unchanged=true, live0. Report SHA256 is
`722830b2d134199256d38a4f9cc68c812c59b8c1a9059c8344469c389bae5610`.
The prior T01 CURRENT attempt and its failure flags remain. The later generator
source-line split changes no generated fixture bytes or application bytes;
references-final-02 proves all three literal identities unchanged. No historical
zero-regression/improvement or raw retained-reference claim follows.

Adverse resource attempts remain explicit: `inherited-claims-01`,
`inherited-uncertainty-01` and `inherited-api-02` refused their retained-output
forecasts before testing. `inherited-claims-02` exceeded its16MiB output grant
and was terminated with SIGTERM/exit-15 at roughly16.9MB; that job is
unqualified. Smaller explicit claim segments pass, preserving the over-limit
attempt and all its closed material. Static06 and static-types-final-01 found
overlong reference-generator source strings; the latter stopped before ty.
After a source-only string split, `static-types-final-02` passes whole backend/
benchmarks/GitHub-script Ruff, global ty and diff checks. Formatting is not
product red→green. A patch-context mismatch during documentation update made
no edits; the corrected patch preserved both documentary histories.

All actual jobs release shared checks.lock. Compact03..07 touch only CLOSED
own SQLite outputs, verify gzip round trips and retain exact per-file
restoration maps before removing originals. Compact07 added observed49,152
bytes (grant8MiB) and reduced retained49,173,115→25,791,570 logical bytes.
Manifest01 ends with28,845,267 logical/31,068,160 allocated retained bytes,
entry658,612,224/minimum658,391,040 free; own environment remains180,513,935
logical/201,515,008 allocated/7573 files. These are shared/unreserved
bookends, not a future allocation. Every ordinary floor/peak is preserved;
the over-limit output attempt above is not concealed by compaction. The former
ce06dfef recorder is retained as own explicit source file before adding safe
UI source selection and pinning the superseding integration target.

The first private status steer was rejected because ROOT had no running turn;
normal auto delivery then succeeded. It grants no extra execution. Current
contract candidates remain DB12/export13/library8/artifact2.0.0, explicitly
rejecting old DB11/library7; no compatibility aliases, migration or reset.
Backend deterministic correctness is finite. UI01 is unrun, frontend integration
and browser/production qualification are held, live judgment accuracy remains
unverified, and T18/#29 remains **incomplete/unaccepted**.
