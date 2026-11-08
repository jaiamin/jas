# JAS handoff: experiment validity

## Completed task and acceptance

The user authorized a general experiment-validity gate after reviewing the weak shortage
experiment. Implement question fidelity, deterministic incentive/treatment checks, visible
preflight findings, and exposure-aware analysis. Improve the existing workflow at any supported
scale without promising arbitrary simulations or forcing interesting/non-null outcomes.

Acceptance criteria:
- Essential requested constructs map to declared supported mechanics; missing capabilities
  cannot be disguised as supported proxies. Preserve original question through review.
- Shared deterministic preflight runs without provider calls, checks changed active factors,
  incentive pitfalls, and relevant legal treatment witnesses; bounded work at max design size.
- Planning receives computed evidence; manual design/run flows display the same findings.
- Analysis reports missing treatment opportunities/ceiling effects before causal narratives.
- Regression coverage for the shortage failure plus valid hidden, delayed, memory and model
  interventions; avoid blanket rejection of pilots/null results.
- Verify backend/frontend/lint/types/build and affected browser flows. Keep app on 8080 usable.
- Do not change old frozen cases, scoring, checkpoint or historical results; clearly label
  new production changes as subsequent to published scores. Keep benchmarks concise.

Progress: inspected planner/domain/research/execution and diagnosed saved study
cb2fad05b89c4cc2. All 144 decisions replay; flipping visibility changes zero observations or
schemas on its recorded paths. Worker work 108/108; sanction/appeal 0. Institution rule text
omits active visibility. Planner returned supported=true and critique issues=[].
Primary-source research and decisions are recorded in docs/EXPERIMENT_VALIDITY.md.
Implemented shared capability/construct checks, bounded scripted preflight, save/run gates,
actual sanction-visibility observation (institution rules 4.1.0), exposure-aware analysis,
editor/proposal/overview findings, historical read-only access and mixed-rule export v4.
336 protocol combinations + 55 payoff oracles and regression tests added. Backend 735 tests,
frontend 69 unit tests, all 68 browser tests, lint/types/build passed. Full deterministic gate:
288 executable cases, 576 arms, 5,208 invariant checks, no failures; privacy/memory, scripted
communication and visibility witnesses passed. Source: data/quality/validity-gate-repaired.
Pre-validity development baseline: 54/60 accepted (two-repeat 30-question set); strict first
iteration: 46/60, catching unsupported substitutes but falsely rejecting 14 supported requests.
Diagnosed invented capability IDs, formatting quotes and reporting constraints mapped as world
requirements. Fixed with enumerated capabilities, explicit scope instructions, normalized
quotations and one recorded correction step. Final failed review persistence also fixed.
Corrected mapper: 59/60, $0.228114, 140 calls, one false critique demanding duplicate comparator
quotations despite implemented history/notes arms. Review now judges material executable
contrasts; coordination warns about public state, private reward and greedy completion;
two-agent sanction visibility warns when no wider disclosure audience exists. Supplemental
explicit-count/isolation audit is data/quality/audit-validity.py (does not change raw scores).
Final planner: 60/60 (32 supported, 28 unsupported), 137 calls/$0.222692; source 4d552c0,
fingerprint 22eefac5b0eb38500e1b9698074d7a7ba2dc4767f03a8d8f62c071a42026616c.
All 32 accepted protocols passed the supplemental count/isolation audit. Total planner
diagnostics cost $0.815804. Historical frozen cases and scores remain unchanged.
Fresh analysis diagnostics use only existing DEVELOPMENT study 5db1a4843c2a4d23 (independent
oversight, two 48-turn runs; 48 work/0 wait/0 sanctions). Three questions x two repetitions.
Initial six responses had correct counts/limits but weak follow-up advice and null-stock
interpretation: data/quality/validity-analysis ($0.035939). Added capabilities/active-controls
catalog and explicit engineering/audience distinctions; second six responses:
data/quality/validity-analysis-final ($0.013842). One qualitative example still reversed
condition labels despite correct aggregates. Added direct per-run condition key/name to
reduce opaque ID lookup. Do NOT call six completions a universal insight-quality pass.
Final source gate: data/quality/validity-analysis-labeled-gate, 5,208 checks passed.
Final labeled-index analysis retest: data/quality/validity-analysis-labeled, all six complete,
16 calls/$0.027713. Both count audits exact (0 sanctions/48 work/0 wait), valid citations and
caveats. One transparency repetition 0 still contradicts the actual condition allocation
comparison, then describes it correctly later. Keep this narrative failure explicit; do not
claim a universal insight-quality score or continue tuning against these familiar traces.
All diagnostics and source hashes are in data/quality/validity-comparison.json. Total new
spend $0.893298; aggregate 27,277 Luna-only calls/$14.501455, 11 earlier unknowns retained,
no pending calls; sum of provider charges equals the ledger. Cap remains $75.
Planner/world source unchanged after the 60/60 checkpoint; only assistants.py subsequently
changed for capability catalog and direct condition labels. Backend 735 tests passed;
frontend 69/browser 68 plus lint/types/build and production smoke passed. Final docs/PR
are published; final CI status is on PR #7. User-requested 8080 stays running.
Do not reopen old held-out model cases or tune against published held-out scores.

## Workspace and publication

Linux isolated Docker Sandbox, /home/agent/workspace, branch feat/experiment-validity.
PR #6 was already merged externally. New task branch starts at origin/main, with only the
subsequent experiment-validity changes; draft PR https://github.com/jaiamin/ass/pull/7.
Never merge/main-push or
rewrite history. No new subagents. User is testing: preserve existing local database and runs.
Current preview is exec session 85891, PID 86472 on 8080, dedicated database
`data/quality/manual-preview.sqlite3`; refresh/restart this owned service when needed.
Health, SPA, saved experiment detail and v4 export all returned 200 after restart.
System uv crashes; use installed `.venv` or `.tools/uv-0.13.7.data/scripts/uv`.

## Evidence and evaluation boundary

Historical evidence commit a2ce6ba940398ca12b2c8baba25787e0d43f5c10; full local archive at
`data/quality/archive-a2ce6ba/benchmarks`. Read-only shortage diagnosis is in
`data/quality/shortage-review/REVIEW.md` and its saved export/script. No provider calls spent
on that review. Existing aggregate evaluation ledger `data/quality/aggregate.sqlite3` must
never reset. Historical checkpoint: 26,688 Luna calls/$13.608157, including 11 unknowns.
Current aggregate: $14.501455 charged/reserved of $75.
Any paid verification must use only openai:gpt-6-luna and the same aggregate cap/ledger.
Prefer deterministic tests first. Never rerun/tune against the published held-out suite.

Published checkpoint: source 7f2a136a2d71124fc5b962fb0fde3f5b5bd77de35453e7a63f04d22a2a69997a;
suite c05f3f353bcd6be3aeba94b145517e7b2e935907bbe1914b09d3f1bac4d3a8ff. Historical results:
planner 206/240, participants 96/96, analysis 96/96; 302 backend/66 frontend/65 browser tests.
These are not new-source scores. New regressions belong in correctness/development tests.
Public provider traces must omit reasoning/signatures. Never bypass secret scanning.
