# Research harness implementation progress

Status: **active**. The user invoked `implement-spec` after reviewing the
20-ticket breakdown. This authorizes implementation of that graph; previously
accepted product and testing-seam decisions are not reopened.

- Parent: [spec #11](https://github.com/jaiamin/ass/issues/11).
- Integration branch: `integration/research-harness`, created from `7cb3279`.
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

- [ ] Existing workflow baseline is reproducible, with retained failures.
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
remain open until the tracker resolves them through the integration PR. A draft
PR will be created after the first implementation merge; no default-branch
merge, auto-merge or history rewrite is authorized.

| Ticket | Issue and behavior | Blocked by | Status | Integrated commit |
| --- | --- | --- | --- | --- |
| T01 | [#12](https://github.com/jaiamin/ass/issues/12) Reproduce the current experiment workflow and freeze a regression baseline | None | Queued | — |
| T02 | [#13](https://github.com/jaiamin/ass/issues/13) Inspect and qualify an isolated environment-extension candidate | T01 | Waiting | — |
| T03 | [#14](https://github.com/jaiamin/ass/issues/14) Reuse environment mechanics without importing an experiment | T01 | Waiting | — |
| T04 | [#15](https://github.com/jaiamin/ass/issues/15) Select and run a bounded participant harness on an existing world | T01 | Waiting | — |
| T05 | [#16](https://github.com/jaiamin/ass/issues/16) Let the Researcher answer with real capabilities and isolated probes | T01 | Waiting | — |
| T06 | [#17](https://github.com/jaiamin/ass/issues/17) Show failure-aware estimates and honest small-sample uncertainty | T01 | Waiting | — |
| T07 | [#18](https://github.com/jaiamin/ass/issues/18) Trace treatment opportunity, delivery and observation | T01 | Waiting | — |
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

1. Implement and verify T01/#12 from the committed baseline.
2. Merge its accepted checkpoint and open the integration draft PR.
3. Start the newly ready frontier, respecting runtime qualification before
   generated-code execution and one writer per branch.
