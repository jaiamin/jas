# Agent creation repair and live checks

2026-11-11. Follow-up on `fix/agent-protocol-maps`, PR33. The reported input-bound
failure is repaired. Real Anthropic requests now reach validated drafts and saving;
this is bounded workflow qualification, not a reliability or scientific-validity benchmark.

## Acceptance and behavior

- The retained failing draft reaches review under the unchanged 180,000-byte input bound.
  Complete candidate/probe evidence remains available; nothing silently truncates it.
- Explicit creation requests route to the planner. Scoping, drafting/revision and review
  receive explicit stage contracts. Saving and participant execution remain separate actions.
- Closed scoping/review records request strict provider output. Dynamic-map protocols keep
  automatic adapter selection, preserving artifact content and participant-information keys.
  Typed/domain validation, reservation/settlement, primary errors and no automatic retries
  or model substitution remain enforced.
- Equivalent quotation typography is accepted without accepting fabricated words. Optional
  commentary is not required to accept an otherwise valid protocol. Review summaries allow
  1200 characters, while instructions target 200–400.
- Built-in source provenance is pinned by the server; saved/custom source records must remain
  unchanged. Draft output must be a nested object, not serialized JSON or parameter markup.

## Diagnosis and regression evidence

Analysis `9d901a31d60d4873` failed after drafting and copied probes. Its question was
173 characters. Review repeated unrelated environment discovery, universal schema and rule
examples alongside the candidate and probes. A retained public-input replay reproduced it.
Review now projects discovery to the selected environment with the original result's hash,
and omits duplicate schema/examples. Scoping omits duplicate schema/examples too. Full
retained discovery and actual probe actions/observations/consequences remain unchanged.

Live adverse attempts additionally exposed missing chat routing, mixed lookup/handoff
responses, excess scoping prose, template quotations, and a revision returning the wrong
stage's fields. Instructions and output descriptions now distinguish those stages. Complete
small record schemas remain visible because strict provider schemas can strip constraints;
local validation continues to enforce every bound.

Recorded checks under `.tools/agent-context/`:

- `repro-final-result.json`: original retained scenario completes with three accounted
  scripted calls. It is an offline replay, not a live original-provider success.
- `final-regressions-08.log`: 146 related cases pass after dedicated scoping instructions.
- `final-regressions-09.log`: 51 planning/provider/investigation cases pass after the final
  draft/revision output clarification.
- `final-regressions-10.log`: 49 chat/assistant/streaming/research-tool cases pass after final
  answer guidance. Those last instructions do not alter planning schemas or execution.
- `contract-v7.log`: ten current-contract cases pass. The independent reference advances
  v6→v7 only for 22 `strict_output=null` request annotations and 22 tool strict-selection
  fields. All other literal prompts/actions/checkpoints/integer costs are identical.
  Freeze proof: `current-contract-v7-freeze.json`; fixture SHA256
  `6f1709c23966c65d96b65242aefaf3d18826059f02faa6fb1d41b9d77cac2812`.
- Whole backend/benchmarks/scripts Ruff and global ty pass. All 13 changed Python files pass
  formatting. An optional whole-tree format check found eight unrelated pre-existing files;
  they were not reformatted in this repair. Hosted CI remains the full-suite merge gate.

The concurrent-investigation test uses a $0.40 ceiling so the compact scope reservation fits
once but not twice; it still asserts atomic refusal and exact accounting. Its old $0.60
ceiling no longer created contention after prompt compaction.

Official references: [Anthropic structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
and [Pydantic AI output](https://ai.pydantic.dev/output/).

## Real Anthropic and browser results

The user authorized real Anthropic spending. An isolated workspace on18143 used Haiku4.5,
a $3 final ceiling (initially $2), an 80-dispatch ceiling and a wrapper rejecting other models
and participant purposes. Actual total: **73 requests, 1,616,125 input / 77,281 output tokens,
$2.002530**, no unknown usage. There were 58 complete and 15 failed provider calls across
14 complete and 19 failed analyses, retained across successive source phases. These totals
include diagnosis and adverse attempts, not 73 successful tests or a success-rate benchmark.

Successful workflow observations:

- `anthropic-phase10/small-protocol-recovered.json`: short two-agent bargaining pilot,
  one condition/seed, two rounds, $0.50, direct-action Luna. Four real calls, $0.094588;
  API validation200. Browser Agent review → editor Review → Create experiment201 → saved
  ready run → reload worked at desktop/light and phone/dark. Saving dispatched no calls.
- `anthropic-phase12-direct/results.json`: detailed 1530-character bargaining request,
  two communication conditions, matched parameters, one seed/repetition, four rounds,
  $0.50 and direct-action Luna. Four real calls, $0.141160; validate200/save201/export200.
- `anthropic-phase13-variety/results.json`: the original delayed-communication question,
  three agents, delays1/8, three seeds/two repetitions/ten rounds. Three real calls,
  $0.100150; validate200/save201/export200 with12 ready runs. The original question had
  no explicit count/model/budget requirements; this is a reviewable prospective design.
- `anthropic-phase14-answers/`: short explanation and unsupported-consciousness request
  both complete and remain separate from protocol creation. No replacement protocol was
  fabricated. The matched-seed explanation now distinguishes model decisions from World seeds.

Successful protocol checks confirm executable configuration and flow, not the correctness of
all generated prose. Manual review caught causal overclaims, philosophical overstatements,
and a coordination analysis plan conflating shared-draft writes with individual commitment.
Earlier answers and defects remain recorded in `anthropic-phase13-variety/content-review.json`;
the final refusal still overstates philosophical limits. Scientific claims, denominators and
mechanic descriptions therefore still require human review. Do not call this model competence,
perfect content quality, independent scientific acceptance or participant-run qualification.

Runner defects are also retained: null coordination metadata caused a failure after one valid
result; recovered read-only without new calls. A general refusal was incorrectly scored using
the planner-only `supported` field. Neither defect is retroactively a product red/green.

All15 saved test runs remain ready; **zero participant calls**. Browser tab/test service are
closed and18143 passed reuse-bind proof. `live-final-accounting.json` and
`live-server-closure.json` record closure. Only own closed evidence was losslessly archived;
the live-test SQLite archive has full independent readback and exact restoration metadata in
`.tools/agent-context/anthropic/restoration.json`. User data, dependencies, shared caches and
other worktrees were not cleaned. Local refresh/publication status is recorded in HANDOFF.

## Hosted CI fixture follow-up

The `a6200c9` full hosted backend run passed1840 cases and failed two fixtures missed by
scoped qualification. Both reproduce locally: the SSE mock omitted the required explicit
routing decision; T17's exact request-key assertion omitted `strict_output`. Only those
fixtures changed: the stream now explicitly declines a protocol handoff, and the literal
request assertion requires the new field to equal null. The frozen T17 fixture bytes,
stream/reconnect/request-count checks, complete checkpoints and accounting remain unchanged.
API/T17/T18/streaming/provider-adapter regression groups pass62 cases (6.68s); affected Ruff,
formatting and diff checks pass. No production change or additional live spending. Full CI
must pass the new head; the earlier hosted failure remains recorded.

## Reopened: revision context overflow (2026-11-11)

The user observed the same input-limit failure twice after PR33's green CI. Exact new
analyses `dc58bc3c7b5f4f42` and `8b6c36fe533b4160` stop at the first revision. Retained
public records are captured under `.tools/agent-revision-limit/`; user attempts are unchanged.
The offline direct-planner replay reproduces the exact error: review fits124,890 bytes,
then revision expands to236,889 against the unchanged180,000-byte bound. The draft already
submitted a null built-in source; the review mistakenly criticized the server-pinned copy.
The first replay harness lacked a stream mock and failed before planning; that authoring
failure is retained separately. Corrected `reproduce.py … red02` reaches the intended failure.

Acceptance for this continuation: revisions must receive scoped discovery/rule examples and
only current copied probes in full, with explicit hash references to retained older results;
all original records remain complete. Cover zero, one and two revisions, including a changed
probe on the same design and a changed design. Tell review which source normalization the
server performed, preserve exact provenance validation, and verify the reported retained
inputs plus a bounded fresh live path. Do not increase the input bound, silently retry a
provider, replace a model, mutate failed user attempts or claim scientific competence.

The repair is on `fix/agent-revision-context`, based on merged PR33's exact source
(`ce269cd6`). PR33's successful checks did not cover this revision path. This continuation
changes internal prompt projections only; persisted contracts and provider input limits remain
unchanged. Current probes retain every observation, action, event and measure. Repeated rules
and legal schemas use exact shared-input hash references, with values supplied once. Older
candidate probes retain their envelopes, status, sources and digest while original records stay
complete. Revisions scope discovery and examples to the selected environment. Review receives
the fact that the server expanded a null built-in source into immutable pinned provenance.

Final-source offline replay completes both captured cases with five scripted requests each:

| Captured analysis | Initial draft bound | Revision bound | Final review bound |
| --- | ---: | ---: | ---: |
| `8b6c36fe533b4160` | 165,348 | 162,821 | 109,602 |
| `dc58bc3c7b5f4f42` | 165,090 | 162,818 | 109,200 |

These are complete serialized input bounds including instructions, schema and the4,096-byte
margin. The180,000-byte limit is unchanged. Scripted replay is not a new real-model success.
The98-case affected suite passes in15.04s, including zero/one/two revisions with changed
witnesses on the same design and a changed design, exact reconstruction of current probe
results, bounded quote corrections and corrected/still-incompatible capability combinations.
Whole backend/benchmarks/scripts Ruff, globalty, changed-file formatting and diff checks pass.
Full hosted CI remains pending; no whole-suite local pass is claimed for this source.

### Fresh live results and remaining gate

Seven dispatched Haiku4.5 cases used23 requests/$0.706613. A numbered live06 stopped before
sending because disk was below its8MiB preflight. Total own Anthropic diagnosis, including the
prior73 calls, is96 requests/$2.709143 under the announced$3 ceiling. All usage is known;
no participant was sampled. `.tools/agent-revision-limit/live-accounting.json` retains the
individual costs/statuses. All test services were torn down and18143 passed reuse-bind checks.

- Live01 failed after repeating a noncontiguous requirement quotation. Scope feedback now
  supplies an exact whole-question option when it fits, while quotation validation and the
  existing two-scope limit remain strict.
- Live02/03 failed typed validation on zero delivery delay and an overlong title. Live05
  reached two revisions without overflow, then failed on an overlong explanation. Drafting
  now receives the exact canonical JSON Schema bounds in a compact projection, including
  nested fields, instead of relying on provider enforcement or vague brevity instructions.
  Bounds are not relaxed and invalid output is never installed or silently retried.
- Live04 completed with a false capability decline. Scoping now uses its one existing
  correction for a declaration that all capabilities are direct although no environment
  implements their combination. Tests preserve rejection when the conflict is not corrected.
- Final-source live07 still declined by inventing a binding/reconsideration requirement.
  Live08, an explicitly clarified direct-planner variant, still wrongly required artifact
  verification for recorded message-arrival evidence. These are retained content failures.
  Final canonical-bound prompts did not receive a fresh live drafting qualification because
  those runs stopped before drafting.

**Fresh live creation/save/export qualification has not passed.** The reported overflow has
an observed failing and passing replay, but this does not establish reliable generation or
accurate capability interpretation. Earlier successful live cases remain attributed to their
earlier sources. Do not call this continuation a clean Agent E2E or scientific/content gate.
The runner's early `all_calls_settled` label meant all calls completed successfully; failed
provider calls still had known settled usage (`partial=false`). No accounting loss is claimed.

The quote-hint and incompatible-capability regressions were observed red before repair.
The first capability-test setup omitted required research_query and failed before the intended
assertion; corrected red02 proves the actual premature decline. Constraint-prompt tests were
also observed red before repair. Earlier disk-full and harness/mock/type/format failures are
retained separately; none is reclassified as a product success.

The user's idle app was refreshed to PID642941. Exact public study/run/chat hashes, usage and
database inode match before/after; no failed request was replayed. Only this checkout's
rebuildable bytecode caches and superseded visual renders were retired, with inventories.
Closed own SQLite families have lossless archives, full independent readback and restoration
maps; live01's earlier archive stop remains recorded. Original data, source assets, dependencies,
shared caches and other worktrees remain intact. Shared disk reached zero earlier; no historical
floor-preservation claim. Refresh observed46,747,648→50,860,032 shared/unreserved free bytes.

## PR34 hosted CI follow-up

At `b459314d`, full hosted backend testing passed1846 cases and failed the two existing
four-role follow-up regressions. Both reproduce locally: the10,540-byte canonical bound
projection pushes the third follow-up's initial draft above180,000 bytes. That stage has
no current candidate yet, so it previously kept every World's illustrative rule examples.
The latest complete prior proposal now scopes those examples for initial follow-up drafts,
just as the current candidate scopes revision examples. Full prior proposals, immutable
sources and the complete discovery catalog remain available; no evidence or validation
assertion is removed. Both unchanged regressions now pass2/2. The other98 affected cases,
whole Ruff/globalty, changed formatting and diff checks also pass. Hosted CI must qualify
the correction; the earlier full run is still a failure.

Frontend lint,162 unit cases/37 files and build passed. Ubuntu mirror DNS failed at
Chromium system-package installation, before browser tests. A same-head frontend rerun was
accepted after workflow completion; a new correction push starts full CI again. `verify`
failed because its backend/frontend dependencies failed, with container/workflows passing.
No workflow checks or browser assertions were changed.

The idle local app was refreshed from PID642941 to645747. Full public records, usage and
database inode match exactly before/after; no failed user request was replayed. Receipt:
`.tools/agent-revision-limit/ci-b459314/user-refresh/receipt.json`. No new provider spending.
Fresh live Agent content qualification remains NOT PASS as documented above.
