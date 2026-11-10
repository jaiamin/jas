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
- [ ] Independent access, contention, atomic rejection, observation and
  checkpoint/replay oracles; both accepted participant harnesses.
- [x] Current validation/request/persistence/export/library contract, copied
  probes, immutable source snapshots and honest artifact-specific outcomes.
- [ ] Existing editor/review/history UI; browser success/failure/recovery,
  loading/error/draft identity, keyboard and mobile.
- [ ] Merge latest accepted integration, final inherited/static/browser checks,
  source-stamped after comparison and classification of every difference.
- [ ] Commit coherent checkpoints, complete ignored evidence manifest and
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
  generated execution, model judge, collaborative phase scheduler or T08 merge.
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

Continue actor contention, terminal/restart/accounting and replay oracles, then
artifact inspection and browser success/failure/recovery. The configuration
reload/save browser tracer passes. Use existing `.venv/bin` tooling; the own
project-local uv bootstrap was removed to free shared disk after ENOSPC. Browser
port **18120** is reserved for this task. Do not inspect real configuration,
touch the preserved stash, other worktrees/processes or frozen T01 history.

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
