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
