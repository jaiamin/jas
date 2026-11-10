# Research harness implementation progress

Status: **active**. The user invoked `implement-spec` after reviewing the
20-ticket breakdown. This authorizes implementation of that graph; previously
accepted product and testing-seam decisions are not reopened.

- Parent: [spec #11](https://github.com/jaiamin/ass/issues/11).
- Integration branch: `integration/research-harness`, created from `7cb3279`.
- Integration draft PR: [#32](https://github.com/jaiamin/ass/pull/32).
- Contracts and acceptance: [spec](RESEARCH_HARNESS_SPEC.md),
  [ticket bodies](RESEARCH_HARNESS_TICKETS.md), [design plan](RESEARCH_HARNESS_PLAN.md).
- GitHub publication verified all 20 bodies, labels, parent relationships and
  33 native blocking edges. Parent content, labels and state were preserved.

## Delivery and evaluation rules

Implement the ready frontier in isolated per-ticket branches/worktrees using
fresh-context agents and TDD at the already approved public workflow API seam;
World and provider/accounting seams supplement independent invariants. Merge
one accepted slice at a time with a fresh merger agent. Keep the existing UI
and public workflows usable. Checks must not be weakened to make a slice pass.

Each slice records its exact source/case identities, relevant inherited
regressions, independent new behavior checks and a before/after development
comparison. Retain all attempts, errors and null results. A failing prerequisite
blocks adoption even if an aggregate score improves. Deterministic checks do
not establish live intelligence. Freeze independent held-out cases after
development; do not tune on failures and silently rescore them as fresh evidence.

The app Researcher remains Pydantic AI with `openai:gpt-6.1-sol`; model
participants remain `openai:gpt-6-luna`. Keep provider/model, participant harness,
world mechanics and study factors separate. Initial range: 1–12 active agents.

## Acceptance gates

- [x] Existing workflow baseline is reproducible, with retained failures (T01
  integrated at `bf3b76e`; deterministic correctness evidence only).
- [ ] Authoritative worlds, privacy, copied probes, exact replay and generated
  execution isolation independently pass the required checks.
- [ ] Both participant harnesses and discretionary planning, retrieval,
  investigation and verification are usable and accounted for.
- [ ] Research competence and failure-aware, exposure-aware, baseline-supported
  claim validity are assessed separately.
- [ ] Four study families pass their relevant deterministic and separately
  authorized live evaluations, with operating limits and uncertainty reported.
- [ ] At least one fresh held-out genuinely new mechanic passes independent
  acceptance, privacy and replay checks through admitted execution.
- [ ] Integration review and required project checks pass; PR is reviewable and
  disposable worktrees/services are cleaned up.

## Task graph and checkpoints

Statuses reflect accepted integration work, not automatic GitHub closure. Issues
remain open until the tracker resolves them through draft PR #32. No
default-branch merge, auto-merge or history rewrite is authorized.

| Ticket | Issue and behavior | Blocked by | Status | Integrated commit |
| --- | --- | --- | --- | --- |
| T01 | [#12](https://github.com/jaiamin/ass/issues/12) Reproduce the current experiment workflow and freeze a regression baseline | None | Integrated | `bf3b76e` |
| T02 | [#13](https://github.com/jaiamin/ass/issues/13) Inspect and qualify an isolated environment-extension candidate | T01 | Review ready | — |
| T03 | [#14](https://github.com/jaiamin/ass/issues/14) Reuse environment mechanics without importing an experiment | T01 | Ready | — |
| T04 | [#15](https://github.com/jaiamin/ass/issues/15) Select and run a bounded participant harness on an existing world | T01 | Queued | — |
| T05 | [#16](https://github.com/jaiamin/ass/issues/16) Let the Researcher answer with real capabilities and isolated probes | T01 | Queued | — |
| T06 | [#17](https://github.com/jaiamin/ass/issues/17) Show failure-aware estimates and honest small-sample uncertainty | T01 | Ready | — |
| T07 | [#18](https://github.com/jaiamin/ass/issues/18) Trace treatment opportunity, delivery and observation | T01 | Ready | — |
| T08 | [#19](https://github.com/jaiamin/ass/issues/19) Give participants source-linked memory, plans and accessible verification | T04 | Waiting | — |
| T09 | [#20](https://github.com/jaiamin/ass/issues/20) Run a solo evidence-seeking task in a persistent artifact world | T03, T04 | Waiting | — |
| T10 | [#21](https://github.com/jaiamin/ass/issues/21) Observe three-agent coordination with explicit phase and delivery semantics | T07, T09 | Waiting | — |
| T11 | [#22](https://github.com/jaiamin/ass/issues/22) Study four-agent reliance and feasible commitment breaches | T10 | Waiting | — |
| T12 | [#23](https://github.com/jaiamin/ass/issues/23) Run a small institutional workflow with atomic work/resource effects | T10 | Waiting | — |
| T13 | [#24](https://github.com/jaiamin/ass/issues/24) Have the Researcher produce a reviewable artifact-world experiment | T05, T09 | Waiting | — |
| T14 | [#25](https://github.com/jaiamin/ass/issues/25) Run one explicitly budgeted end-to-end investigation | T06, T13 | Waiting | — |
| T15 | [#26](https://github.com/jaiamin/ass/issues/26) Compare actual reference policies and participant-harness ablations | T06, T08 | Waiting | — |
| T16 | [#27](https://github.com/jaiamin/ass/issues/27) Admit a verified extension as a runnable versioned environment | T02, T09 | Waiting | — |
| T17 | [#28](https://github.com/jaiamin/ass/issues/28) Have the Researcher generate and validate a genuinely new mechanic | T13, T16 | Waiting | — |
| T18 | [#29](https://github.com/jaiamin/ass/issues/29) Inspect a declared fallible adjudication and replay its consequences | T09 | Waiting | — |
| T19 | [#30](https://github.com/jaiamin/ass/issues/30) Assess evidence-supported claims and reanalyze through read-only lenses | T06, T07 | Waiting | — |
| T20 | [#31](https://github.com/jaiamin/ass/issues/31) Demonstrate the small-population generalization milestone | T11, T12, T14, T15, T17, T18, T19 | Waiting | — |

## Preserved drafts and spending

T01 evidence: [baseline report and inherited comparison procedure](research/T01_BASELINE.md).
Source `d5527c0b4cb57cb63f8d39cb74d335396042e711` on
`t3/t01-research-baseline` was integrated with no-ff merge
`bf3b76eb626db625b4476a8d436e67e2cfc95df9`. It adds only development fixtures,
keyless evaluation/test tooling and documentation; production source and
historical suites remain byte-unchanged from `b02536c`.

The ticket-branch evidence records 935 backend tests, 106 frontend tests,
frontend lint/build and all 165 keyless browser tests passing. Runtime setup
and initial new-runner failures are retained and classified in the report.
At the clean integration merge, the merger observed **76 focused backend tests**
passing across baseline, API, exports, execution, lifecycle and streaming,
plus Ruff and ty checks. Its fresh real API baseline passed all six cases with
22 scripted responses and 98 HTTP operations; comparison with the preserved
qualified-after report had no regressions, improvements or before/after
failures. Source stability passed. The unchanged UI suite was inherited without
a redundant merger rerun. No paid trial or live competence claim is made.

All raw ticket artifacts were copied without overwrites from the T01 worktree's
`data/research-baseline/` into the integration checkout's ignored
`.tools/research-harness/evidence/T01/`: **159 files, 13,343,424 bytes**.
Every copied SHA-256 matches the source, which stayed stable during copying.
The per-file verification record is
`.tools/research-harness/evidence/T01-copy-verification.json`; its canonical
file-manifest SHA-256 is
`dde18508e88dfa92571455a789f72589b2f3bde5dabd5d5059a0a35126b28388`.
Fresh integration logs, source archive, attempts and comparison are separately
preserved in `.tools/research-harness/evidence/T01-integration/`.
The source worktree remains intact. Keep these ignored evidence directories
when cleaning up ticket worktrees.

The incomplete pre-spec changes to the assistant and research tools are preserved
in local Git stash `f771128ba1c9295262a4073df40cc25647b1370f` (including the
untracked research-tools file). They are excluded from the baseline and have
not been represented as implemented capabilities. Do not drop the stash or
apply it wholesale over newer work; inspect it only when the relevant ticket
needs prior art.

Fresh paid calls so far: **none**. The session-wide Sol benchmark cap is **$10**.
Implementer agents must remain keyless unless given a specific coordinated trial
allocation. Luna participant trials need an explicit separate allowance; prepare
the concrete manifest and estimate after deterministic qualification. Until
those trials run, the live milestone remains unverified.

## Next actions

1. Implement T02/#13, T04/#15 and T05/#16 in isolated fresh-context worktrees;
   T03/#14, T06/#17 and T07/#18 remain ready for available slots.
2. Review and merge each accepted slice sequentially, then refresh/link draft
   PR #32; qualification failure gates generated execution, not trusted worlds.
3. Preserve source-stamped inherited and new-behavior evidence for each slice;
   keep live and held-out gates unverified until their required trials run.

## T02 implementation evidence (awaiting integration)

The assigned ticket branch `t3/candidate-containment-review` implements immutable
candidate reviews and the environment review UI. Import-free Wasm containment
passed all 26 independent development checks in both development and the actual
non-root production image, including the actual four-second worker deadline.
Experiment execution remains disabled pending T16 world admission. See the
[T02 evidence report](research/T02_CONTAINMENT.md) for source identities, retained
failures/repairs, paired keyless baseline, observed checks and ignored artifacts.
Implementation source is `74daeeb`; the browser response-wait repair is `b28f5b3`.
No paid calls, tracker changes, pushes or new PRs. Other ticket statuses are unchanged.
