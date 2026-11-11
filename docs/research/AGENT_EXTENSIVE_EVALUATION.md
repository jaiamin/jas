# Agent live evaluation — 2026-11-11

The observed long-follow-up failure is repaired. Sol produced useful proposals across
short and detailed development prompts; Haiku remains less reliable for complex drafting.
This is source-attributed development evaluation, not a held-out competence benchmark.
Baseline: `9bc78b13a0c777b3f6a84598d1742d23b649ceab` (five hosted checks passed).
Final production-source map SHA256: `5064173cc05aedbc4d7f0215b0cf15c9f40de490d05293196e1ed2c2ef7c81d9` (sorted compact JSON of backend
Python relative paths and per-file SHA256; exact live map retained locally).

## Scope and acceptance

The user authorized up to **$10 additional** API spending, separate from the previous
$2.709143. The frozen [core matrix](../../benchmarks/agent-live-development.json) and
[variants](../../benchmarks/agent-live-variants.json) cover explanations, delayed
coordination, exact bargaining parameters and revisions, solo artifacts, renewable
resources, unsupported mechanics, permissions, inference, trust/memory, information
access, six-worker workflow, commitment timing and twelve-agent multi-turn drafting.

All live work used isolated databases and explicitly selected models. No silent model
substitution, automatic provider retry, input-limit increase or weaker validation was
introduced. Successful proposals were independently checked, saved and exported through
public HTTP without participant calls. Separate explicit lifecycle tests sampled participants.
Failed user requests were never automatically replayed.

Acceptance separates workflow gates from semantic quality. A completed but incorrect
protocol or false decline is a failure. These prompts were public and repeatedly used
during repairs; there is no claim about arbitrary prompts, human validity, intelligence,
model-weight improvement, live adjudicator accuracy or generalization.

## Repairs

- Generated text now has clearer field-specific guidance within existing schema limits.
  Validation failures identify allowlisted fields and limits without echoing rejected text;
  the original failure, response and charge remain recorded.
- Invalid or requirement-incompatible World selections no longer hide other available
  mechanics during correction. Bargaining's pie/discount is accurately described as
  negotiation configuration, and artifact diagnostics name the supported environments.
- Long revision prompts losslessly share repeated complete protocols and catalog parameter
  bases within each request, with explicit full-field overrides. Stored/public evidence,
  immutable sources and configured input limits are unchanged.
- General answers receive exact response fields and installed capabilities. Planner
  handoffs are concise; delay guidance states actual choice finality, mail timing,
  possible waiting and terminal payoff rules instead of suggesting repeated games.

## Observed batches

Each row retains its own production-source map and exact request evidence under
`.tools/agent-extensive/<attempt>/`. Rows span successive source versions and must not
be pooled into a final-source success rate. A gate includes completion and requested
constraints, plus validation/save/export for designs; it does not replace semantic review.

| Attempt | Workflow gates | Settled USD | Boundary |
| --- | ---: | ---: | --- |
| baseline-sol | 8/10 | 1.205092 | Original failures retained |
| baseline-haiku | 7/10 | 0.659614 | Includes semantically wrong completed delay proposal |
| repaired-sol | 10/10 | 1.281354 | Core prompts after initial repairs |
| repaired-haiku | 6/10 | 0.788121 | False declines, wrong World and invalid outputs remain |
| variants-sol | 7/9 | 1.345874 | Last two follow-ups hit input limits |
| final-variants-sol | 2/4 | 0.585758 | Evaluator workspace reservation cap stopped later work |
| final-sol | 9/10 | 1.245898 | Detailed final case stopped by evaluator disk guard |
| final-large-sol | 3/4 | 0.739892 | Third follow-up overflow retained |
| final-large02-sol | 1/2 | 0.393450 | Disk guard interrupted next case; remainder unrun |
| final-large03-sol | 3/4 | 0.740056 | Third follow-up still overflowed |
| final-resumed-sol | 1/1 | 0.242398 | Same closed chat restored; explicit new follow-up passed |
| live-lifecycle | Lifecycle/reopen PASS | 0.108390 | Incremental usage only; imported spending excluded |
| final-detailed-sol | 1/1 | 0.206868 | Fresh detailed delay prompt at final production source |

Actual additional spending closed at **$9.542765 across 230 requests**, below the $10 grant; all usage
is known and settled, with no pending paid requests. Unused $0.457235 is unspent.
The final detailed prompt separately passed validation/save/export and semantic review:
delivery delay was the sole condition difference, with actual irreversible-choice
and message-opportunity rules. It closes the earlier disk-stopped coverage gap,
without relabeling that earlier interrupted batch as a clean 10/10.

The final resumed follow-up preserved twelve agents, two arms, seeds 17/83/241,
one repetition, a $1 protocol ceiling, models, profiles, conditions, immutable source
and inference settings while changing the horizon to twelve rounds. It used four real
Sol requests, validated/saved/exported, and did not sample participants. Full serialized
request bound was 179,006 against the unchanged 180,000 allowance: this is a repaired
observed case, not proof that arbitrary larger evidence cannot reach the limit.

## Meaning, not just completion

Manual review of the successful Sol core proposals checked mechanics, active contrasts,
requested numeric parameters, source pinning, denominators and inference limits.
The original delay instance's 27 possible terminal choice vectors were independently
enumerated: maximum settled payoff 27 matched the proposed formula. It correctly used
one irreversible choice per actor/run, allowed waiting and distinguished arrival from
attention. An earlier repaired instance had a different maximum (30); these are separate
source-attributed results.

Reviewed variants correctly distinguished notes from history, roles from permissions,
actual disclosure from unrelated feedback capabilities, material/dependency/handoff
rules in a six-worker workflow, and infeasible commitment windows. These are narrow
manual judgments, not blinded ratings or a claim that every generated sentence is sound.
Haiku's earlier completed delay proposal incorrectly suggested repeated choices and
guaranteed late arrivals; its other drafting failures remain explicit rather than being
converted to quality passes. Sol is the better-supported drafting choice in this sample.

## Actual lifecycle and browser

A separate two-round bargaining smoke completed four real Haiku participant decisions.
A separately billed two-call Sol analysis remained frozen at turn 1 while the run advanced
to turn 4. Its answer correctly described the recorded offer, unchanged zero balances,
no captured acceptance and the difference between self-reported intent and observed action;
its citation pointed to turn 1. Save/export and four-turn replay added no provider calls.
An earlier separate fixture run also completed four Haiku decisions before its analysis
reservation was refused. Runtime spending includes all eight participant decisions and
two settled analysis requests; the refused analysis is retained separately.

The actual Agent/editor browser flow restored a pending request, showed its completion,
opened Review protocol, ran mechanical checks and saved a twelve-agent proposal into six
ready zero-turn runs. Desktop/light and phone/dark DOM diagnostics had no observed console
errors; phone document width remained 390 pixels. This was functional browser verification,
not a screenshot-based visual quality score. The proposal's own spending limit was not
execution authorization; the test explicitly saved it and did not start those runs.

After graceful shutdown, a second server lifetime rejected every provider invocation.
Full public studies/chats/run/export/usage matched exactly and replay still made zero
calls. Both server processes were reaped and the owned browser tab closed. One immediate
non-reuse socket bind reported EADDRINUSE; the second server bound successfully and final
SO_REUSEADDR bind passed. No universal socket-visibility claim is made.

The user's local app on port 8080 was then refreshed only after two identical idle
public snapshots and exact launcher/database identity checks. Full public record hashes,
usage and database inode were unchanged. No failed chat was replayed.

## Verification and adverse attempts

- 802 affected backend cases pass at final production source; an additional focused
  catalog reconstruction assertion also passes. Whole Ruff, global ty, changed Python
  formatting and diff checks pass. No frontend source changed; existing assets were reused.
- Fresh independent Standards and Spec reviews passed for the final protocol/catalog
  sharing implementation. Earlier reviews are separately attributed, not substituted.
- Oversized generated text, invalid-World recovery and repeated large revisions have
  public-seam regressions, including independent exact shared-value reconstruction.
- Fixture failures remain retained: wrong API field/shape, mixed-purpose request counting,
  capability spelling and a too-small evaluator study reservation. The successful existing
  lifecycle was qualified read-only after fixing the mixed-purpose assertion; it was not
  paid-rerun merely to obtain a green report.
- Disk/cap refusals and interrupted batches remain failures/unrun work at their original
  sources. Lossless compaction touched only closed owned outputs, with full gzip readback
  and restoration maps. One reclamation guard stopped before deletion; its failure remains.
  Earlier helper hashes are retained; exact later helper versions are archived separately.

## Cleanup and limits

README now concentrates purpose, design/run/evidence flow, setup, providers and honest
product boundaries; the handoff records current state instead of duplicating historical
chronology. Architecture and benchmark indexes link the current contracts and this report.
No obsolete compatibility implementation was found: required incompatible-data rejection,
UI error boundaries and explicit uncertain fallback policies are retained. No dependencies,
compatibility aliases, migrations or automatic resets were added. Historical evidence and
its restoration maps remain useful and were preserved.

The supported conclusion is improved app/harness reliability and observed design quality
for the exercised prompts. Budget and input limits still apply. Smaller-model drafting
remains fallible, and this evaluation does not certify all workflows or general competence.
