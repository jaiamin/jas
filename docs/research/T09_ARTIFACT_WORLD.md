# T09: persistent artifact investigation

Ticket [#20](https://github.com/jaiamin/ass/issues/20). Implementation branch
`t3/implement-t09-artifact-world`, assigned worktree
`/home/agent/.t3/worktrees/workspace/t3-872f635b`, clean base
`c2a7d5af53c8f2bd183731285936afac5076d632` on accepted
`integration/research-harness`. This report does not imply root acceptance.

## Acceptance and progress

- [x] Confirm assigned checkout/base; read spec, full ticket, architecture,
  glossary, ADRs, implement-spec and TDD (including tests/mocking).
- [x] Run frozen T01 before comparison on clean tracked-only starting source.
  Exit 1: four inherited export-v4 failures, retained in `data/t09/before/`.
- [x] Solo real HTTP study, permitted evidence reads, versioned writes,
  deterministic checks, submission and explicit stop.
- [x] Independent access, contention, atomic rejection, observation and
  checkpoint/replay oracles; both accepted participant harnesses.
- [x] Current validation/request/persistence/export/library contract, copied
  probes, immutable source snapshots and honest artifact-specific outcomes.
- [x] Existing editor/review/history UI; browser success/failure/recovery,
  loading/error/draft identity, keyboard and mobile.
- [x] Merge latest accepted integration, final inherited/static/browser checks,
  source-stamped after comparison and classification of every difference.
- [x] Commit coherent checkpoints, complete ignored evidence manifest and
  handoff. Parent owns review, publication and issue status.

## Approved seams and independent worked examples

Primary seam: real public workflow HTTP API with temporary SQLite and only the
external provider replaced. Supplemental seams: public World rules and
checkpoints, provider/accounting lifecycle, browser user workflows. These seams
and product scope were approved before this task; no reconfirmation is needed.
Use one failing public behavior test, minimal implementation, green per slice.
Raw red/green logs and case/source identities stay under ignored `data/t09/`.

The first worked example has one investigator, immutable measurement v1 with
reading **17**, a writable report v1 initially holding reading **0**, and two
available write units. Reading measurement, writing report v2 with reading 17
and a measurement-v1 source reference, checking and submitting must succeed.
The success is executable content/source validation, never a claim in prose.
A wrong report must fail submission, a stop must remain unsuccessful, and a
stale/unauthorized write must change neither content/version nor write units.
A sealed system object has no participant reader, owner or invented partner.
Its identity, content and versions must not leak through schemas or errors.

## Decisions and scope

- Extend the existing World/execution/activation journal; no second engine,
  generated execution, model judge or collaborative phase scheduler. Accepted
  T08 and T07 integration changes are retained without expanding their scope.
- Concrete world key: `artifact_workspace`. Objects have fixed executable ACLs,
  structured content and append-only versions. Named roles/profile prose confer
  no access. A shared write allowance couples actual work to a finite resource;
  it is not a financial payoff. Source-linked checks use readable evidence.
- Direct action selects concrete artifact operations; the tool harness may also
  read authorized documents without advancing world time. Actual reads and
  rejected/settled operations stay inspectable. No automatic substitute action.
- Replay applies recorded consequences; playback reads recorded evidence;
  restoration loads the committed checkpoint; explicit resume/start requests
  new inference. Replay/restoration never contact a provider.
- Version persisted meaning atomically (DB/export/library as necessary), reject
  incompatible data, and preserve controlled-world rules and behavior.
- Budget: **$0**. No live models, services or paid web calls. Existing global
  Sol spend $0.611632/55 requests is historical, not a T09 allocation. Model
  labels remain Sol for Researcher and Luna for model-controlled participants.

## Next steps

Root owns fresh merger review and acceptance. Preserve the entire ignored
`data/t09/`, including its verified archives and member indexes, before any cleanup.
The final manifest and closure identify the handoff HEAD and included integration;
the implementation is not yet accepted. Live Luna work requires a separate concrete
manifest/estimate and explicit allowance. No implementation decision remains open.

## Development checkpoint (before accepted T08 merge)

Actual HTTP/World red → green slices are preserved in `data/t09/setup/slice*`:
solo versions and replay (slice1), atomic stale rejection and explicit recovery
(slice2), real harness artifact reads (slice3), private source metadata (slice4),
neutral mechanics reuse and immutable source (slice5), copy-isolated Researcher
probe/no invented finance (slice6). The shared-work source reference test found
and repaired an actual unauthorized identifier leak. Infrastructure ENOSPC and
the initial failed collection/fixture repairs are retained, not counted as reds.

Slice7 browser red was the absent form. Green confirms edited write allowance
and evidence persist through reload/save with one participant and zero requests.
Three intermediate build attempts retained action-union/optional-balance typing
failures before the passing build. `checkpoint-backend` passed 29 tests (six new
artifact cases and existing execution checks); Ruff and ty passed. A first full
backend attempt had 53 failures/1025 passes; fixture/environment-matrix updates
were required and the focused rerun was 611 passes/one artifact terminal-count
fixture failure, since fixed. No final whole-suite claim yet.

Accepted local integration advanced to `9750cafea48120ceec11530ed11a214661a374b3`
(T08); merge before continuing current-contract verification. This is observed
from the integration ref, not delegate polling. No paid model requests occurred.

## Investigation and inspection qualification

Accepted T08 (`9750caf`) is included by merge `c038fd0`; both harnesses retain
their accepted identities and capabilities. A later accepted cutoff-filter repair
(`de5556b`) is queued for the next integration merge. No unaccepted branch was
read or merged.

- Slice8: missing artifact inspector red → versions/source-turn links, success,
  slider playback and Verify green. One intermediate failure selected a link as
  a button; preserve it as a test-selector error, not a product failure.
- Slice9: read-receipt/observation replay red → green, including deliberate
  corruption rejected through the public Verify endpoint with providers forbidden.
- Slice10: failed submission and explicit stop passed initially; read-at-horizon
  exposed an actual operation-identity bug (origin zero overwrote current turn).
  The fixed history/terminal pointer passes all three terminal cases.
- Slices11–13: existing lifecycle independently qualified: a paused pure read
  survives database reopen without a call, explicit continuation reuses the same
  receipt/limits, and an actually killed owned process restores versioned work,
  pauses and retains the in-flight reservation as unknown. Both harnesses retain
  actual reads and primary provider failures without retry. Initial accounting
  assertions incorrectly named absent export fields; corrected to public fields,
  with all failed attempts retained.
- Slice12: two real competing writers retain v1/v2/v3, reject stale/exhausted
  writes atomically and restore identical actor observations. Foreign actors,
  unreadable/future sources and invalid forecast cannot change work or notes.
- Slices14–15: actual UI failed submission/rejected-write recovery pass with both
  real harnesses, desktop/light and phone/dark. Reload and Verify do not spend;
  only explicit Run recovers. The test-server stand-in is opt-in and keyless.
- Slice16: public API qualifies 1 and 12 participants, rejects 13, preserves
  genuine controlled-world minimums, rejects mutable evidence/old library v3,
  and journals a denied tool read without delivering sealed content.
- Slice17: Verify initially accepted forged event/measurement evidence; the
  new artifact checks reject both without changing state or usage.
- Slice18: Verify now replays World-rejected attempted requests on a checkpoint
  copy, checks rejection text and atomicity, and counts verified rejections.
  Actor privacy/schema/restore invariance also runs in all four memory modes.

Observed combined checkpoint before the last oracle additions: **1125 backend
tests passed**, 109 frontend tests passed, Ruff/ty/frontend lint/build passed.
Seven optional-actor typing errors in the new oracle were fixed by asserting
actual actor availability. No checks were disabled. Final combined-source checks
and clean-source deterministic comparison are still pending.

The form intentionally keeps structural object/field requirements in the existing
JSON editor, while stock visual controls edit names, contents, ownership/access
and finite write allowance. Review and run inspection name researcher scope and
show actual versions/source links, outcomes and receipts. No new dependency,
custom style system, model judge, generated execution or financial proxy exists.

## Latest accepted integration and contract

Merge `adf3c45` included accepted T08 retrieval filtering and documentation at
`e2d42c9`; 1,133 backend tests, 109 frontend tests, Ruff/ty/lint/build, eight
artifact/harness browser flows and the UI detector passed. The two accepted T08
browser flows exposed their old export-6 assertion; the current-contract fixture
repair passed both, with the original failures retained. Screenshots of actual
artifact success/failure/recovery were inspected at desktop/light and phone/dark.

Integration then advanced to `a92105fd2300de97e8668400a2174019e3f96788` with T07.
Merge `1ba6f6e` preserves its exposure capture, source/input bindings and browser
flows, alongside artifact instructions/read tools and accepted T08 capabilities.
Three expected merge conflicts (imports/instructions, contract prose, browser
suite membership) are retained in the command log and resolved by preserving
both behaviors. No unaccepted ticket branch was read or merged.

Current combined contract: **DB 7 / export 8 / comparison 1 /
`jas-environment-v4`**. Accepted T07 already uses export 7; artifact requests,
state and outcomes require a distinct current export. A public artifact workflow
first failed expecting 8, then passed after the exporter/fixtures/docs update;
76 artifact/lifecycle/context/exposure tests pass on the combined source.
Controlled-world rule versions remain unchanged. There is no alias, migration,
reset, paid call or model substitution.

The first clean-source after comparison (before T07 arrived) is retained in
`data/t09/after/`. Frozen T01 before/after and comparison exit 1 with the same
four export-v4 failures and failed flags. Its independent audit verifies all
22 turns/five runs, exact controlled request payloads and accounting, current
DB7/export7/library4, and classifies all 1,117 JSON differences with none
unexplained (633 raw export differences; the remainder includes reports,
manifests, design/catalog additions and catalog ordering). This is an interim
source, not the final combined-source comparison. Final gates must include T07
and export8 and will be recorded below without overwriting this evidence.

## Final implementation and accepted-source qualification

Merge `8a7b089` includes accepted integration `777a609` (its actual second parent),
including the repaired binding of exposure to final bounded requests and real T08
capability delivery. Artifact-specific instructions and authorized read receipts are
retained. The accepted exposure browser configuration supersedes the earlier
tool-only compatibility fixture. Merge `14278e6` includes accepted integration
`32fa9fc9aa5080a87458ea22756478dbe8b4eda3`; merge `145f1a4` also includes the
latest observed accepted tip `59e20935c17bd8ea0c44f712790ffeeb38ebb83b`.
Both merges change only accepted-review/frontier documentation. Other ticket
statuses are retained.

The application checkpoint is `fe0ba04a87c2450b260dfa2232c1f505b69e2310`.
Its backend source digest is
`c5894f1af4cfe340c1c46b00f89edc24f054ab543ecb08168c68cd79144b648d`.
Final closure compares actual application/test/build inputs with the recorded
checks; later handoff and accepted-review prose does not change those inputs.
Current contract remains **DB7 / export8 / comparison1 / jas-environment-v4**.

Final vertical refinements retain their actual attempts:

- Slice21: manual production inspection found unsupported communication-channel
  controls in the artifact editor. `slice21-unsupported-channels-red` fails at the
  browser seam; the minimal existing-capability gate passes the full 11-flow green
  check and is committed at `db50ee3`. The final production phone/dark capture
  confirms the controls are absent and artifact ACL/write controls remain usable.
- Slice22: the inherited catalog recovery test still expected eight worlds.
  `final-full-browser` records 181 passes and that assertion failure. Updating its
  three counts to the nine installed worlds passes the unchanged loading/error/
  retry flow (`slice22-catalog-recovery-green`), committed at `fe0ba04`.

Observed final checks (all exact commands, source maps, diffs and outputs are in
`data/t09/checks/`; names below are their record prefixes):

| Check | Observed result | Record |
| --- | --- | --- |
| Full backend | 1,176 passed, including 28 artifact/lifecycle cases | `accepted-final-backend` |
| Python static | Ruff and ty passed | `accepted-final-ruff`, `accepted-final-ty` |
| Frontend | 111 tests / 30 files, lint and production build passed | `accepted-final-frontend-*` |
| Inherited browser | 181 passed; one ENOSPC screenshot failure; all four affected Researcher variants then passed | `accepted-final-full-browser`, `accepted-final-researcher-storage-recovery` |
| Artifact, harness and exposure browser | 11 passed, including both harnesses' failed submission/rejected-write recovery | `accepted-final-harness-browser` |
| T08 context browser | Both pause/restore/receipt flows passed after final accepted merge | `accepted-final-context-browser` |
| T07 with T08 capabilities | Both actual capability-delivery/exposure/export flows passed after final accepted merge | `accepted-final-capability-exposure-browser` |
| Production | Fresh build; non-root/keyless SPA; all 26 containment checks, safe/denied/exhausted reviews; solo artifact export8 and Verify0; zero requests | `accepted-final-production-*` |

Every inherited browser case has a passing result on the qualified application
source across the completed run and focused rerun. **Do not describe this as one
uninterrupted green full suite**: the full run exits 1 because storage filled while
creating the light/1440 Researcher screenshot directory. Its failed output is
retained in `browser-full-fe0ba04/`; all four variants pass after storage recovery,
without changing the application or assertions. The earlier catalog failure and
all other failed attempts also remain preserved.

Final production image identity is
`sha256:3af9cbff72fb63fc17c4876c324f773c50787406c74e6aa7b41db0277ad4f682`.
Actual 390px/dark editor, researcher-scoped versions and call-free Verify captures
are in `browser-production-final/`; initial state/export/database/logs are in
`production-accepted-final/`. The original pre-fix inspection stays in
`browser-production-manual/`. Two manual waits named the wrong tab/heading and
timed out; actual snapshots then confirmed the rendered surfaces. These are
selector errors, not product failures. The owned tab, container, volume and image
tag are closed/removed; final closure checks port 18120 and owned resources.

## Final deterministic comparison

`before/` uses clean base `c2a7d5a`; `after-accepted-final/` uses clean `fe0ba04`.
Both retain complete tracked-only source archives. Frozen T01 runner/cases/scores
remain unchanged. `accepted-final-frozen-after` and its comparison both exit **1**
with the same four intentional export-v4 failures and failed flags, no regressions
or improvements. The two historical unsupported gap cases still reject, including
the unknown `artifact` alias. This does not replace the independent artifact cases.

The positive `accepted-final-current-contract` audit passes DB7/export8/comparison1/
library4 and independently checks **22 turns / five runs / 22 provider stand-in
requests**. Controlled decisions, actor observations, checkpoints, state hashes,
metrics, actual prompts/schemas/settings and accounting retain parity. All 22
additive T07 input bindings are independently checked. Both workflows make 98 HTTP
operations. The audit classifies **1,220 raw JSON differences**, plus 47 keyed
catalog differences, with **zero unexplained**. Differences include the required
request/export metadata, explicit null artifact fields/hashes, accepted T08 schema,
new world/library contract/order and volatile source/record/time identities.
Raw exports are not byte-identical.

Earlier after/comparison runs remain in their separate directories, including the
first final audit that failed closed on one extra read-only status poll and its
subsequent independently verified classification. Do not present an earlier source
or that failed audit as the final result.

## Evidence preservation, limits and handoff

Preserve **all `data/t09/`**, not only its passing logs. `artifact-manifest.json`
indexes every remaining file/link and its hashes/targets; its external checksum
excludes only those two self-referential manifest files. `checks/final-closure.json`
records the final clean branch/HEAD, accepted integration, exact input parity,
protected benchmark hashes, preserved stash object and closed owned resources.

Shared-disk exhaustion required reversible packing. Four archives under `archives/`
retain 1,459, 1,437, 638 and 414 files/symlinks respectively, with complete member
indexes and byte/target verification before expanded copies were removed. Completed
check paths temporarily packed in archive04 have been restored; the remaining
pytest payloads stay packed. Restore any archive from the project root with
`tar -xzf data/t09/archives/<archive>.tar.gz`. Final manifest generation rechecks
every member of all four archives. A first packer assertion failure is retained
with its exact failed script; it is an evidence-tool failure, not a product red.
Only disposable Python caches in this assigned checkout were otherwise removed.

Early slices1–6 retain original red/green logs and case identities, but not a full
per-attempt dirty-source hash/archive wrapper. Later checks do retain full source
maps and binary diffs. This historical evidence gap is not reconstructed. Synthetic
test configuration fixtures were verified against their tracked generator at
`backend/tests/test_cli.py:19` and retained as opaque bytes only in ignored evidence;
no real environment/credentials or unrelated root clipboard data was read/copied.

The world deliberately uses executable typed content/source equality, fixed ACLs,
version conflicts and a finite write allowance. Structural object/field/requirement
changes use the existing JSON editor. T10 collaboration/timing, T18 model
adjudication and T16 generated-world admission are not implemented here. T02
containment still does not admit a runnable world. No financial outcome is invented
for this task, and deterministic stand-ins establish mechanics only.

Actual paid spend is **$0**. Historical global Sol usage remains $0.611632/55 known
requests ($9.388368 of $10 remaining); it is not a T09 allocation. Live behavior,
held-out generalization and research competence remain unverified. No push,
publication, ticket closure, stash operation, data reset or security change was
performed. Root must freshly review this branch before marking T09 accepted.
