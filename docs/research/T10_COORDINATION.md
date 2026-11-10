# T10: three-participant distributed-information coordination

Ticket [#21](https://github.com/jaiamin/ass/issues/21). Implementation in the
assigned isolated checkout on `t3/t10-distributed-information`; starting HEAD and
published accepted base: `5ef3abf5eb714aa2d9e619ddffa189ab9ae6b3f2`.
Linux/path/clean status and ancestry were observed before changes. Accepted T09
repairs `4ed18af` and `84867cc` are ancestors. No additional checkout, descendants,
paid allocation, infrastructure, publication, reset or stash operation.

## Durable plan and acceptance

- [x] Read implement-spec and TDD directly, required specification/ticket/frontier,
  architecture/design/glossary/ADRs and T07/T08/T09 evidence context.
- [x] Freeze independent DEVELOPMENT cases below before implementation. Approved
  seams: public workflow HTTP API; independent World and provider witnesses for
  permissions, timing/completion order, conflict, accounting and restoration.
- [x] Preserve source-stamped inherited T01 before evidence, unchanged failures.
- [x] Vertical API red/green: concrete task and shared-information control;
  declared sequential/phased settlement; addressed logical-time mail; ACL work.
- [x] Independent privacy, competing requests, completion-order, delayed delivery,
  null/alternative behavior, checkpoint and call-free restore/replay oracles.
- [x] Existing design/run inspection and export make assumptions, alternatives,
  conditions, logical timing and trajectory reviewable; browser on 18123.
- [ ] Affected inherited development/regression checks, frontend static/unit/build
  and browser; final whole-backend qualification once on stable executable inputs.
- [ ] Merge latest documented ACCEPTED integration checkpoint, preserve all failed
  attempts, verify complete raw evidence/archive index, commit with normal hooks.
- [ ] Close owned resources and hand exact source/verification status to fresh merger.

## Frozen DEVELOPMENT oracle v1 (before implementation)

These are independent worked examples, not held-out tasks. They are frozen before
the first implementation or new test. Tests are added one public vertical slice
at a time. All choices, scripts, errors and nulls are retained. No live behavioral
or research-competence inference follows from a deterministic provider.

The concrete task has participants `iris`, `moss`, `vale`; finite alternatives
`cedar`, `quartz`, `reed`. Their immutable private value vectors are respectively
**(9, 2, -2), (-3, 8, 1), (0, -4, 7)**. Each can inspect permitted artifacts,
send permitted addressed messages, edit shared draft work at an expected version,
wait, choose any alternative, or abstain. A final choice yields that actor's
declared local value, plus **3** only when all three choose the same alternative.
Abstention/horizon yields **0** for an unchosen actor. No action is prescribed.
The matched shared-information control changes only evidence read access.

| Case | Independent expected consequences |
| --- | --- |
| Distributed / shared control | Distributed schemas, reads, context and metadata expose only own value artifact and shared draft. Shared control exposes all three evidence artifacts. No role label grants access. The alternative set and payoff rule are identical. |
| Alternatives / null | All cedar: **12/0/3**, total **15**. All quartz: **5/11/-1**, total **15**. All reed: **1/4/10**, total **15**. Independent local choices cedar/quartz/reed: **9/8/7**, total **24**, unmatched. All abstain or wait to horizon: **0/0/0**. Success is not defined as cooperation. |
| Sequential timing | Declared order iris,moss,vale; one logical tick per accepted action. Mail iris→moss at t0 with delay 2 is absent from moss at t1 and delivered at t2. Vale never receives its text, IDs or recipient metadata. Provider waiting consumes no logical ticks. |
| Phased timing | All active participants observe one committed phase snapshot. One logical tick elapses only at the barrier. Mail at t0/delay2 is absent throughout phase1 and phase2 decisions; arrives at t2 for phase3. Staged work and choice/memory of other actors stay hidden before settlement. |
| Conflict / completion permutation | At one frozen phase, iris and moss both propose draft v1→v2 with different literal contents. Declared priority moss,vale,iris selects moss, independently of all six proposal-completion permutations. Exactly one write is consumed, versions are v1/v2, iris receives explicit conflict, all other valid operations settle. No retry or extra inference. |
| Topology / ordering | Complete directed and ring topologies are selectable. A missing/self/foreign route is rejected atomically. Directory, turn/conflict and recipient/delivery ordering are reviewable assumptions, independently of role labels and provider response speed. |
| Pending restore | After one/two staged proposals or a sent, not-yet-due message, close/reopen the actual app; no requests occur. State, pending actions/mail, scoped input and remaining limits are preserved. Explicit continuation gives the same terminal trajectory as uninterrupted execution. Verify uses zero requests. |
| Exposure / bounded input | A queued message is not a delivery. An authorized inbox entry is an opportunity; only its presence in a final bounded request plus that request's receipt confirms input. Private mail, compacted results, local reads and descriptive memories cannot manufacture another recipient's exposure. |
| Inherited contracts | Solo artifact reads/writes/stopping, T07/T08 privacy/final bounded bindings, both harnesses, accounting/cancellation, mechanics-only reuse and read-only probes remain protected. Frozen T01 stays exit1/four export-v4 failures; positive current-contract and exact five-run/22-turn parity are separate checks. |

## Decisions and boundaries

Use one narrow installed World at the existing interfaces, not a distributed
platform. Physical provider sampling may remain serial; phased simultaneity means
frozen observations and a barrier with explicit priority, never simultaneous
wall-clock execution. World owns all permissions and consequences. Message text
and document prose are untrusted data. Actor-authored plans remain separate.
No promises/institution/resource workflows (T11/T12), generated mechanics or judge.

Actual final contracts, source hashes, checks, failures, evidence custody and
remaining limits will be recorded below as observed. Raw data: ignored `data/t10/`.
Each check records its exact command, case, exit, complete tracked-source inventory
and binary diff, with one verified compressed source archive per identical tree.
Closed synthetic outputs may be losslessly archived with member/hash verification;
other tickets' files, caches, processes and evidence are outside this task.

## Observations and retained attempts

Initial disk observation: 719 MiB available; concurrent work may change it.
One context-reading command used shell brace expansion under `sh`, causing `wc`
to exit 1 and skip subsequent reads. The required reads were rerun directly;
this was an exploration helper error, not a product check.

Implementation qualification is in progress. No paid requests; live and held-out
gates remain unverified. Root acceptance requires a later fresh merger.

## Implemented scope and contract

Installed `distributed_coordination` rules **1.0.0** reuse the existing World,
artifact ACL/version, participant, immutable revision, request accounting,
checkpoint/replay, library, inspection and export seams. Exactly three actors
have independent consequential choices from immutable local evidence. The bundled
shared-information arm changes only evidence readers. Stop abstains personally;
wait/horizon and disagreeing choices remain intact. No commitments, institutions,
generated runtime or general asynchronous deployment was added.

Logical time advances per sequential settlement or phased barrier. Phased inputs
freeze, read actions retain their proposed version, and declared conflict priority
settles both version and shared-budget contention. Physical provider completion
does not select priority. Mail uses enabled explicit directed routes, route-scoped
IDs, declared delay and route-list/sequence ordering. Only parties see their
mailboxes. Future terminal mail remains pending. Actor-private sources are removed
from another actor's version/history metadata. Mailbox state is deliberately current
state under all memory modes; this is disclosed rather than silently attributed to
episodic memory. Participant schemas/notes/observations do not disclose other local
value artifacts; role labels grant no permissions.

Current branch contracts: **DB8 / export9 / capture1 / comparison1 / libraryv5 /
tool2.0.0 / direct1.0.0**. The new typed parameter/default changes canonical design
and mechanical-source serialization, so DB/export/library change atomically. Old
schemas/formats reject explicitly. No aliases, migration, automatic reset or user
data changes. Controlled rules and solo artifact submission behavior stay intact.
Pydantic AI Sol remains the app Researcher/planner; model participants remain Luna.
Test providers are keyless FunctionModels, never live substitutes presented as evidence.

The UI reuses Conditions/Review, source-linked run trajectory, artifact history and
export. It exposes logical timing/delay, orders, bonus, directed routes, alternatives
and ACLs. JSON Specification edits structural alternatives/bindings/route order.
Switching a solo draft retains its investigator and adds neutral actors up to three;
existing extra unbound profiles are retained until removed. Researcher summaries and
copied probes include choice outcomes with absent financial balances kept null.

## Observed DEVELOPMENT checks and repairs

Every named attempt resolves to `data/t10/checks/<case>/check.json` and `output.log`.
The record contains the exact command, exit, times, HEAD, branch, full source hash,
before/after stability and log hash. `data/t10/sources/<source_sha256>/` contains
the complete tracked-file inventory, binary diff against its recorded HEAD, verified
lossless source archive and verification hash. Identical source trees reuse one archive.
Nothing is inferred from a clean HEAD when the check actually used dirty source.

- Frozen `frozen-before` and `frozen-after`: **exit 1**, six original cases, the
  same four export-v4 failures. `frozen-comparison`: **exit 1**, zero regressions or
  improvements, identical failures. The unchanged runner intentionally keeps exit 1.
- API vertical reds/greens: initial unsupported World (422), unsupported messages,
  competing writes, missing template and missing timing control. Subsequent API and
  browser greens retain all attempts. `terminal-state-red-and-witnesses` caught
  settled terminal proposals still marked pending; the repair clears them.
- Independent World/provider oracles release all **six** completion permutations
  through the actual LanguageModels/accounting boundary. The same frozen phase
  chooses moss, consumes one write and rejects the other contenders. Pending app
  restoration at **1/2/3/6** committed proposals samples nothing on reopen/verify;
  explicit continuation reaches the literal quartz payoff **5/11/-1** in nine calls.
- `bounded-mail-and-independent-witnesses`: **39 pass / 2 helper failures**.
  `bounded-mail-helper-corrected`: **2 pass**. The helper used 2,000 below the
  existing 4,000-character floor and omitted the required nullable read field.
  Correcting it leaves the policy/budget invariant unchanged. At 4,000 the inbox
  opportunity has no confirmed bounded input; at 16,000 exact inbox content and
  a response confirm it. Both reach literal reed payoffs **1/4/10** in 18 calls.
  Ring permissions, source-metadata privacy, frozen reads, allowance contention and
  future terminal mail pass independent literal oracles.
- `choice-exposure-red` caught settled choices without provenance despite later
  observation. `choice-exposure-green`: **3 pass**, including actual shared/local
  value reads. Inclusion points to `/request/prompt/choices/iris` only for later
  moss/vale inputs. Missing and abstaining choice keys are distinguished.
- `affected-backend-final`: Ruff/ty pass; **209 pass / 1 failure**. The inherited
  all-template tool fixture omitted its required nullable artifact read field for
  the new World. `inherited-harness-fixture-green`: **10 pass** after extending
  that fixture, with model assignment/accounting/replay assertions preserved.
- `researcher-outcome-red` caught omitted payoff summaries and copied-probe
  consequences. `researcher-outcome-green`: **1 pass**, literal actual reed and
  copied cedar outcomes, zero probe participant calls and unchanged source records.
- `frontend-final-static-unit-build`: lint, **111 tests / 30 files**, TypeScript
  and production build pass. Mutable TypeScript caches have link count one;
  dependencies were installed normally in this checkout, never copied from peers.
- `solo-switch-browser-red` caught incomplete value bindings from a solo draft.
  `coordination-browser-final`: **4 pass** on 18123, covering that repaired flow,
  timing edits surviving reload/save/review and actual nine-turn mail/choice/replay
  trajectories at 1440 light and 390 dark. Rendered screenshots were inspected.
- `inherited-browser-initial`: **9 pass / 3 stale-current-contract failures**:
  export8 expected instead of9 twice and nine catalogue rows instead of ten.
  `inherited-browser-repaired`: **3 pass**, retaining save/reuse independence,
  stale-draft, cached-data and retry assertions. These are current-contract tests;
  frozen T01 files were never modified.

Earlier static attempts are retained: Ruff's four initial errors, the enum naming
warning and successive dynamic schema-union type errors. The final schema builder
uses the existing typed variant-list/reduce pattern. Exploration/helper errors also
include missing pytest tmp parent, failed patch contexts (no partial source edits),
and a documentation patch expecting a heading below the actual front matter.

## Frozen parity, separately from historical failures

`current-contract-parity-initial` retained unclassified shortened identity labels
and activation-keyed membership, and exited1. Its original helper bytes are kept
under `data/t10/helpers/<sha256>/parity.py`. The corrected audit, not the frozen
runner or scores, maps those exact relational identities and retains every raw
difference and both normalization traces. `current-contract-parity-corrected`
passes **five runs / 22 turns / 22 requests**. Actual complete request payloads
(instructions, bounded prompts, schemas, settings, adapter, prices and input
bindings) compare equal by condition and turn. Observations, actions, checkpoints,
events, metrics and accounting compare equal after explicit provenance/time mapping.
Usage stays **2,200 input / 1,100 output / $0.00077 synthetic cost**, not spending.

The four export comparisons contain **1,761 raw JSON differences**, all classified:
record/response identities, creation/update/request times and latency, derived
design hashes/short source labels, participant implementation source hash,
the new `coordination:null` default and export8→9. Two rejection-description
fields list the additional supported identifier; `artifact` remains rejected.
There are zero unexplained keyed differences. DB7→8 is independently checked in
the two own synthetic databases; export9/capture1/comparison1 are positive current
contract checks. Library5 and both harnesses are independently checked by their
API/development tests. A green parity audit does not turn the frozen exit1 green.

## Remaining qualification and acceptance limits

Final whole-backend, final source/input archive qualification, additional inherited
harness/browser checks, latest documented accepted-base merge, evidence index and
normal-hook commits are still pending at this checkpoint. The integration tip was
last observed as a provisional T15 review, so it was not merged; accepted base
remains `5ef3abf` until documented acceptance changes it.

No paid call or allocation was made. No live participant/Researcher competence,
causal validity, population inference, runtime scaling or final held-out extension
result is established. The held-out task was not opened or tuned. T11/T12 and the
broader research-harness acceptance gate remain outside this ticket. Deterministic
mechanics do not establish live intelligence. A fresh merger must assess adoption.
