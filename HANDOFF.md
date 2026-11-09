# JAS handoff

## Previous task: experiment validity (historical)

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

## Previous task publication

Linux isolated Docker Sandbox, /home/agent/workspace. Previous branch: feat/experiment-validity.
PR #6 was already merged externally. New task branch starts at origin/main, with only the
subsequent experiment-validity changes; draft PR https://github.com/jaiamin/ass/pull/7.
Never merge/main-push or
rewrite history. No new subagents. User is testing: preserve existing local database and runs.
System uv crashes; use installed `.venv` or `.tools/uv-0.13.7.data/scripts/uv`.

## Evidence and evaluation boundary

Historical evidence commit a2ce6ba940398ca12b2c8baba25787e0d43f5c10; full local archive at
`data/quality/archive-a2ce6ba/benchmarks`. Read-only shortage diagnosis is in
`data/quality/shortage-review/REVIEW.md` and its saved export/script. No provider calls spent
on that review. Existing aggregate evaluation ledger `data/quality/aggregate.sqlite3` must
never reset. Historical checkpoint: 26,688 Luna calls/$13.608157, including 11 unknowns.
Aggregate at start of composition task: $14.501455 charged/reserved of $75.
Any paid verification must use only openai:gpt-6-luna and the same aggregate cap/ledger.
Prefer deterministic tests first. Never rerun/tune against the published held-out suite.

Published checkpoint: source 7f2a136a2d71124fc5b962fb0fde3f5b5bd77de35453e7a63f04d22a2a69997a;
suite c05f3f353bcd6be3aeba94b145517e7b2e935907bbe1914b09d3f1bac4d3a8ff. Historical results:
planner 206/240, participants 96/96, analysis 96/96; 302 backend/66 frontend/65 browser tests.
These are not new-source scores. New regressions belong in correctness/development tests.
Public provider traces must omit reasoning/signatures. Never bypass secret scanning.

## Previous task: custom environment composition

Branch `feat/environment-composition`, based on PR #7 at aa2aee0; never merge either PR.
PR #7 is unwatched; do not relink/watch/list it. Draft PR: https://github.com/jaiamin/ass/pull/8 (base feat/experiment-validity). Code checkpoint cf7c8a1; linked in T3, unmerged.
User approved autonomous composition, editable/deletable custom environments and testing.
Implementation commits: f4ca72d, d83495b, 12f9d6b, 2c9e6e0, e17e54a, 939eab8; subsequent passive-audience warning is covered below.

Completed acceptance criteria:
- Typed finite stocks, controlled/shared access, transfers, consumption, replenishment,
  incentives and separate stock/allocation visibility; deterministic enforcement and privacy.
- Planner composition with construct checks and critique; no generated executable code.
- Server-side custom-library CRUD, optimistic revisions, atomic writes and immutable study
  snapshots; removing/editing a library record cannot change saved runs or evidence.
- Resource editing/reuse, researcher ledgers and clearer researcher-only analysis-plan input.
  Removed obsolete browser-only setup storage; no compatibility importer or data reset.
- Independent sharing/hoarding utility oracles; 96 conservation/replay combinations,
  capacity overflow/no terminal replenishment, invalid-action atomicity, hidden-stock/schema
  privacy, 12-agent/four-resource/100-round restoration, cutoff-scoped accounting, API lifecycle
  and desktop/mobile browser lifecycle. Analysis-plan privacy checked at provider boundary.
- Computed condition-grid coverage and typed factorial declaration. Duplicate nonbaseline
  arms and missing cells trigger bounded repair or rejection; declared intent is rechecked on
  save/run. Perfectly coupled settings form one bundle. Partial comparisons/replication remain
  valid with warnings. Exact earlier failed model proposal now deterministically caught.
- Passive disclosure audiences are now explicitly warned about when their only legal action is
  wait and communication/transfers are off. Other response paths suppress the warning; no
  blanket rejection of intentional allocator/norm-response studies.

Final observed checks: 920 backend tests; latest targeted desktop/mobile browser flow2/2.
Fresh frontend unit70/70, lint/build passed; before factorial changes the full browser suite
passed70/70. Ruff/ty passed. Latest production image passed non-root/keyless
health/SPA/assets and custom-library CRUD; owned smoke container removed. No model calls in
correctness/browser/container checks. Workflow unchanged. No benchmark files changed.

Development history (Luna-only, no frozen families or published scores changed):
- Six scoped questions x2: 9/12, 38 calls/$0.087151; corrected mapper 12/12,
  32 calls/$0.072582. Exposed outcome-as-proxy and disabled-control/permission confusion.
- Verbatim shortage question x2: 1/2, 6 calls/$0.015264. Corrected a false interpretation
  of simulated real scarcity as requiring physical-world calibration.
- Seven questions x2 after scope fix: 11/14, 55 calls/$0.136028. Two reviews exhausted
  4096 tokens; one protocol never specified precise cooperation/withholding calculations.
- Review limit8192 and explicit analysis-plan formulas: 13/14, 40 calls/$0.100023;
  both verbatim trials passed. Remaining failure called a mechanic directly supported while
  labeling its capability unavailable. Deterministic regressions cover repair/fail-closed.
- Scope guard uses the existing one-correction limit; no provider retry or larger loop.
  Focused multi-resource/verbatim/unsupported production x2: 5/6, 20 calls/$0.050102.
  One failed after three revisions: stock could vanish in one action despite repeated-allocation
  claims. Added early-exhaustion warning; one-shot designs remain valid.
- Following verbatim x2: 1/2, 10 calls/$0.028624. Accepted incomplete factorial had duplicate
  nonbaseline cell. Do not rescore as success. New computed-grid regression catches this3/4.
- Final factorial guard x2: 2/2 declared mechanical checks, 12 calls/$0.036109. Exact evaluated
  source939eab8, hash7cee110a0414319146c9cbe1c579d3a2a7283bfc6d8fdf1f78e420ed2c114b3e.
  Manual interpretation audit found one passive-audience protocol despite that mechanical pass.
  Added deterministic warning afterward; no new paid score for that source change. No held-out
  generalization or insight-quality score. Keep every prior failure.
- Matched participant check: 4/4 runs, 64/64 decisions; conservation, needs, nonnegativity,
  utility and replay passed. $0.019598. All noncontrollers consumed zero in every run;
  this is not evidence that transparency improves cooperation or participant optimality.

Every phase has exact source archive/hash, manifest, attempts and sanitized provider traces
in data/quality/composition-*/. A line-wrap-only provenance file belongs to the earlier12/12
checkpoint; later semantic edits are separately evaluated. Final reconciliation: aggregate $15.046936; task $0.545481/277 calls. All new calls Luna-only;
no pending or new unknowns, earlier11 unknown reservations retained. Two known-charge review
truncation failures retained. Sum of provider charges equals ledger; ceiling restored75.
Updated local summary: data/quality/composition-results.json.

Latest owned preview: session43417, PID109011, 0.0.0.0:8080, preserved database
`data/quality/manual-preview.sqlite3`; final source loaded; health, catalog, library, SPA and both new preflight outputs verified.
Leave this requested preview running. Disposable browser/backend/container services closed.

Publication: all task commits secret-scanned, task branch pushed and draft PR8 linked.
CI queued/in progress on first read, no comments/reviews. Next: handle CI via T3 watch;
watch/end while pending and unwatch before final handoff. No more paid trials required. No unrun final14-case, held-out or insight-
quality claim. Never merge/main-push. Final code archive/manifest is data/quality/composition-final-code;
its hash is recorded separately from the last model-evaluated source in composition-results.json.
Limits: bounded resource primitives, uniform needs, one action per agent/round; no arbitrary
Python, recipes, collateral, sanctions or authority removal. Public records/inventories are
bundled. Model choices and interpretations are fallible; the earlier condition-label analysis
error is not certified fixed. No new generalization/insight-quality score. Full grid coverage
cannot certify intended factors, semantic claims, causal isolation or statistical power.

## PR #7 CI repair (2026-11-08)

Current task is the focused repair of https://github.com/jaiamin/ass/pull/7 on
`feat/experiment-validity`; earlier composition publication instructions above are historical.
No PR review comments were present. Run 42534047116 failed only the suggestions browser
test; `verify` failed because it aggregates the frontend result.

Root cause: saved experiment/run suggestions were clickable before their full protocol
loaded, inserting generic prompts without condition names. Suggestions now wait for the
protocol and reuse the existing loading/error/retry controls. The browser regression holds
the experiment response, fails then holds the run response on retry, verifies draft retention
and exact condition names, and checks that no chat is submitted. The delayed experiment
case failed before the fix; the expanded targeted regression passes afterward.

Frontend lint, 70 unit tests, production build and all 70 browser tests passed. Gitleaks
found no leaks in the repair diff. Playwright shut down its owned keyless backend.
No backend/runtime/workflow changes or paid calls. Do not merge. Push this focused repair
and watch PR #7 checks; no new PR is needed.

Sandbox tooling: system `/usr/bin/uv` aborts on 16 KiB pages. The ignored project-local
`.tools/pr7-uv/bin/uv` (same version 0.13.7) successfully ran `sync --frozen`.


## Current task: stock shadcn application redesign

Branch: `t3/shadcn-app-redesign`. Pulled `origin/main` with `--ff-only`; already current.
User explicitly requests replacing all custom visual components/styles with stock shadcn,
minimal SaaS navigation (no recent experiments), improved layouts, preset-controlled icons, and neutral
black dark mode. This supersedes the earlier custom visual direction. Preserve behavior,
records, draft recovery, immutable revisions, spending controls, and privacy. No paid calls.

Acceptance criteria and coverage:
- [x] Upstream stock Radix shadcn components and neutral theme, no CSS overrides of primitives.
- [x] Standard collapsible Sidebar: Workspace (Experiments, Runs, Environments), Agent,
  Settings/theme footer. Responsive Sheet, keyboard access, breadcrumbs, active links.
- [x] Experiments: empty/populated/search/filter/pagination/draft recovery; Runs and selection.
- [x] Editor: question, profiles, conditions/mechanics/composition, execution, JSON,
  proposal review, save summary, validation, drafts, saved environment actions.
- [x] Experiment: overview/results/effects, revisions, runs, protocol, controls/export.
- [x] Run: decisions/evidence/notes, environment/state, interactions, record/replay/export.
- [x] Compare: compatible/incompatible data, chart, metrics, conditions, responsive tables.
- [x] Environments: catalog/controls/measurement descriptions, custom library CRUD/confirmation.
- [x] Agent: empty suggestions/context, history, composer, messages, activity/streaming,
  errors/reconnect, citations, proposals. Use stock MessageScroller/Message/Bubble/Trace.
- [x] Settings: provider configuration, pricing, usage/storage and spending information.
- [x] Global loading/error/not-found, light/dark, mobile/desktop and keyboard states.
- [x] Frontend lint, unit tests, build, complete keyless browser suite and visual review.
- [x] Update design/product/development documentation.
- [x] Commit, secret scan, push task branch and create draft PR #9; unmerged.

Decisions: keep Radix and Lucide, adopt current stock shadcn Nova/neutral; use Tailwind only
for page layout and prose. Domain components compose stock controls. Do not fabricate a
user account menu in a single-user local product. Keep existing logo as a brand asset.

Implementation: all routed views compose current stock Nova/Radix/neutral/Geist/Lucide
components. Removed seven custom stylesheets and unused font assets. Main navigation has
no recent records; Local workspace footer exposes Settings/appearance. Agent history has
its own responsive Sidebar/Sheet; MessageScroller/Message/Bubble/Trace handle chat and
public stages, and completed proposals use Card. Simplified tables, editor, settings,
world/evidence and chart layouts. No compatibility paths or backend changes.

Preset: CLI `preset resolve --json` returns `b2fA`, no fallbacks. Full `apply --preset`
confirmed against current official CLI/docs. Generated UI stays separate from app
compositions, formatters (`lib/format.ts`) and workspace state. `lib/utils.ts` only
exports cn. `components/icons.ts` is one stock app icon boundary: align its reexports
with a new preset's iconLibrary; CLI does not automatically migrate these reexports.
See docs/DESIGN.md for exact workflow and small nonvisual upstream accessibility fixes.

Verification: frontend lint, 70/70 unit tests and production build passed. Fresh complete
keyless Playwright suite on 8198 passed 76/76, including 17-view desktop/mobile light/dark
matrix and public planning stages/proposal flow. Independent visual review found chart
legend contrast; fixed with theme foreground labels while retaining dash patterns.
Both targeted comparison browser checks passed, with explicit label-color regression;
reviewer scored that sole finding resolved, disposition ship. Final lint/unit/build passed
again after that fix. Detector returned []; source audit found no hand-built controls or
icon drawings outside generated UI, no route-level raw color overrides, and no unused
production modules or app icon exports. No paid providers tested or called.

Captures and logs: ignored `.tools/shadcn-redesign/final-captures`, `final-review`,
`e2e-final.txt`, `legend-final.txt`. Earlier diagnostic runs used a reused temporary DB;
only the fresh successful suite above is the final full result. Test servers 8197/8198
stopped. No owned browser tabs remain.

User-requested app stays running on 0.0.0.0:8080: exec session 13109, PID 143037,
`.venv/bin/jas --host 0.0.0.0 --port 8080`, default local `data/jas.sqlite3`.
Port was free; this checkout had no existing database or .env. Health, current index,
entry assets and main routes returned HTTP 200. Do not stop this requested preview.

Publication: implementation commit `2b9f67c`, task branch pushed, draft PR
https://github.com/jaiamin/ass/pull/9 created and linked in T3. Staged diff and commit
hook secret scans found no leaks. PR remains draft/unmerged; no merge or main push.
No further implementation work remains. Keep the requested port 8080 app running.


## Refinement checkpoint: sidebar, surfaces and drafts

User refinements are implemented on the same task branch and draft PR #9. Shared
tokens now make page/card/sidebar/overlay surfaces white in light mode and black
in dark mode, with subtle blue selection and weaker hover. Tabs/sidebar items have
4px separation. Restored Workspace/Assistant sidebar labels. Only the compact
logo/wordmark link navigates home, without hover fill; original Bricolage font is
limited to the lowercase wordmark, and the 20px logo stays uncropped on collapse.
Header divider is vertically centered and collapse-button left gutter matches its
12px gap to the divider. Empty experiment actions share a row on mobile/desktop;
removed redundant generic subtitles. Drafts now use stock outlined Item rows with
truncated title, edited timestamp and separate discard action. Preset exceptions
are documented centrally in docs/DESIGN.md.

Observed verification: frontend lint, 70 unit tests, production build and 10 targeted
keyless browser checks passed after refinements. Additional live-browser geometry
and visual checks passed in both themes at 390/1440px, including logo, header
spacing, hover/selection, draft overflow and empty actions. Earlier full redesign
suite passed 76/76; it was not repeated for these focused refinements. No backend
changes or paid calls. Port 8080 returns HTTP 200 and remains running in session
13109; user is actively using its database and provider configuration. Do not reset
data, replace credentials or stop the requested preview.

Brand-link follow-up: aligned the expanded logo with navigation icons (both x=16px),
removed the link underline and disabled the Button press translation only on this
brand link. Logo and wordmark remain one compact home link, with no hover fill.
Collapsed logo remains 20px and fully contained. Frontend lint/build passed; live
browser verified hover decoration, alignment, zero movement while held active,
home navigation and collapsed containment. Owned browser closed; 8080 stays live.
