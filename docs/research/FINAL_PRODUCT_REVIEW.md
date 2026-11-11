# JAS product review

JAS is a single-user local workspace for designing experiments, running matched
trials and inspecting recorded agent behavior. The implementation is qualified
for bounded deterministic DEVELOPMENT. Live/held-out competence, T20 and judge
accuracy remain open; model weights were not trained by these application changes.

## Current behavior

Agent supports discussion, pending experiment proposals, independently reviewed
finite mechanic generation and explicitly budgeted investigations. Saving a
proposal does not authorize participant execution. Custom mechanics remain
separate from participant identities, harnesses, conditions and analysis choices.

The interface uses stock controls, shared theme tokens and progressive disclosure.
Overview leads with progress/results; detailed evidence stays inspectable without
filling the default view. Drafts and pending operations retain identity through
navigation/reconnect. Record playback selects saved checkpoints with GET-only
requests and stops on manual navigation, errors or hidden pages.

World rules settle permissions, resources, logical timing and consequences.
Models propose actions. Participant-private observations/tools remain scoped;
analysis is read-only and cutoff-bound. Raw judge rulings are shown separately
from the limited consequence the declared world mechanism can enforce.

The current contract is DB15/export18/library10/definition2,
research-operation2/generation-event-v2. Incompatible records reject explicitly;
there are no old-rule readers, migrations or automatic resets. Revisions remain
immutable, evidence append-only and provider costs atomically reserved/settled.
Worker or scratch lifecycle failures revoke containment until fresh qualification.

## Observed verification

The complete local repair qualification at commit `885f3846` records:

| Check | Observed result |
| --- | --- |
| Complete backend | 1831 passed; zero failures, errors or skips;568.25s |
| Frontend units | 169 passed across38 files |
| Complete default browser suite | 182 passed in one uninterrupted run;429.97s |
| Affected scripted browser trials | 20 passed across harness/artifact/exposure, capability context, reference policies and reliance |
| Static/build | Whole Ruff/global types, frontend lint/forced TypeScript and fresh build pass |
| Build equality | All54 rebuilt assets equal the assets served by the preview |
| Hooks | Normal Gitleaks commit hook passes |
| Preview refresh | Same database inode, public/conversation hashes and recorded usage |

Commands, source stamps, raw-log/JUnit hashes and adverse attempts remain in the
[verification record](MERGE_READINESS_VERIFICATION.json). Local default browser
tracing was disabled to fit shared disk; no cases/assertions were disabled.
Hosted CI retains normal failure tracing and verifies backend, frontend/browser,
production container and workflow checks on each published revision. Current PR
checks, rather than an earlier result, determine merge readiness.

Earlier production/native checks established non-root/keyless startup, restart
requalification, exact saved state/export and call-free replay at their stated
sources. They are historical observations, not additional current-source suite
counts. One middleware traceback during the passing draft reload/navigation case
remains disclosed in the repair record; its triggering request was not captured.

The cleanup follow-up retires49 superseded documents and two unused frontend
modules, updates current guides and verifies all116 local Markdown links and
anchors. Independent Standards and Spec reviews pass. Hosted CI on `885f3846`
exposed late-notice transcript overlap; that and a reproduced disconnected-asset
middleware error are repaired. Final scoped checks pass51 API/lifecycle cases,
169 frontend units and51 affected browser cases, plus eight controlled scrolling
repetitions, lint/types/build. The browser run records no backend tracebacks.
Final assets are served on8080 with the same user database, conversation and
recorded usage. The verification record attributes these checks separately from
the earlier complete suites; current hosted CI remains the merge gate.

## Measured runtime

[Benchmark samples](FINAL_RUNTIME_RESULTS.json) retain every successful version2
attempt and all raw timings. The unchanged benchmark uses4/24/240 non-model turns,
exact replay/export,20 warm endpoint reads and a four-worker mixed-read case.
These measurements are from a shared Linux/arm64 VM and establish platform
behavior under those workloads, not model latency or general service capacity.
They were not rerun by the later containment or unused-code/document cleanup.

| 240-turn measurement | Original attempt02 | Final attempt06 |
| --- | ---: | ---: |
| Observed completion |4149.31ms|2914.84ms|
| Sequential run p95 |168.95ms|111.59ms|
| Mixed health p95 |290.02ms|4.65ms|
| Mixed run p95 |295.60ms|327.18ms|
| Mixed experiment p95 |335.88ms|160.68ms|
| Peak server RSS |390832KiB|321440KiB|

Concurrent run reads remain slower than the original measurement. Health latency,
completion time and memory improved after observed request-loop blocking and
snapshot inconsistency were repaired. No caching, silent retry or alternative
contract was introduced to obtain those results.

## Remaining limits and retained history

Frozen T01 remains failed on four historical export-v4 checks. Its source/cases
were not retuned. Fresh current-contract5-run/22-turn/22-request qualification
checks full inputs, integer ledgers, checkpoint prefixes, privacy/cutoffs and
zero-call replay separately; no deleted BEFORE comparator is reconstructed.
The [literal oracle](T12_CURRENT_CONTRACT_ORACLE.md) is retained unchanged.

Live researcher/participant quality, held-out new-mechanic generation and
judgment accuracy require independent frozen cases and explicitly authorized
spending under the [accepted specification](../RESEARCH_HARNESS_SPEC.md).
Deterministic provider stand-ins do not satisfy those gates. Human predictive
validity and public hosting require their own evidence and security design.

Superseded task plans, reviews and research scratch reports are consolidated in
[the historical summary](RESEARCH_HARNESS_COMPACT_REPORT.md); their exact source
history remains in Git. Retired raw captures cannot be reread from a summary.
Current guides are indexed in [Documentation](../README.md).

The user preview remains at http://localhost:8080. Its current database, saved
conversation and recorded usage are user data and remain preserved. Tests use
separate keyless workspaces and make no external model calls.
