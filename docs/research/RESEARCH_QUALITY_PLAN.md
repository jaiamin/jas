# Research quality implementation

Baseline: `5f2523e5` (tree identical to merged main). Owner: ROOT.
The original 24-run experiment and `data/jas.sqlite3` are read-only throughout.
New live validation has a hard aggregate $20 ceiling, including failed calls.

## Acceptance criteria

1. **Executable analysis:** a versioned, optional research plan names computed
   outcomes or explicitly manual outcomes. Calculations expose scope, denominator,
   missingness, source and limitations. Research metadata never enters participant input.
2. **Design review:** scientific diagnostics remain separate from mechanical
   admission; identify unchanged seed scenarios, incentive/deadline limitations,
   absent controls and unsupported analysis without claiming to certify science.
3. **Findings:** a provider-free results brief answers what completed, what changed,
   effort, uncertainty and the next discriminating test. Paid interpretation remains explicit.
4. **Variation:** inspect effective initial scenarios and expose seed/order/role
   assumptions; support deliberate matched variation without relabeling repeats.
5. **Controls:** expose existing executable reference policies and ablations alongside
   their measured costs and declared effort, adding only concrete missing controls.
6. **Finding validation:** exact calculations have independent literal tests; interpretive
   support remains distinct. Include held-out development cases without generality claims.
7. **Inference:** explicitly declare target/task/sample/matching/exclusion assumptions;
   withhold unjustified confidence intervals and never silently exclude failures.
8. **Mechanics:** make required trade-offs executable or visibly unavailable. Do not
   replace missing mechanisms with prose or change old experimental meaning.
9. **Efficiency:** explicitly opt into any waiting policy; measure request and latency
   costs. Bound independent-run/provider concurrency and preserve within-run causality,
   pause/restart, atomic budgets and all committed evidence.
10. **Completion UX:** distinguish natural completion, horizon, failure and interruption;
    explain actual turns versus the maximum. Retain usable phone/theme/keyboard states.

## Stages

- [x] Research primary methods and inspect existing contracts, calculations and UI.
- [x] Freeze design decisions and independent test oracles before implementation.
- [x] Implement research contracts/calculations/design diagnostics and regression tests.
- [x] Implement authoring/results/completion UI using existing stock components.
- [x] Implement and benchmark bounded performance improvements and explicit controls.
- [x] Run backend/static/frontend/browser/replay and bounded live validation; fix findings.
- [x] Review the final diff, remove obsolete code/docs, document results and limitations.

## Decisions and constraints

- Existing comparison/missingness/claim-support modules are authoritative; do not
  create a second statistical engine or claim semantic certification.
- Optional research metadata is versioned independently of World mechanics.
  Original revisions/checkpoints/exports are never rewritten or reset.
- Research reporting uses deterministic calculations first. No automatic paid
  summaries, resampling, provider retries, model substitution or increased budgets.
- Current concurrency defaults are three independent runs and four provider requests.
  Changing defaults requires measured evidence, not a guessed larger number.
- Preserve port8080/user data; validation uses fresh owned databases and distinct ports.
- Use the existing Python environment directly if uv remains unusable. Install frontend
  dependencies normally and locally; respect shared disk/lock ownership.

## Progress

2026-11-12: task branch created; original pilot audit reviewed. The existing engine
already has failure-aware matched comparisons, numerical assertion checks, reference
policies, ablations, bounded concurrency and exact replay. Main gaps are connecting
research commitments to computed outputs and surfacing scientific limitations/results.

## Methods and implementation decisions

The original pilot is an audit reference, never a retest target: 24 trajectories,
all choosing the same joint optimum, with identical initial states under six seed
labels. Extra delay mostly added waits and provider requests. This motivated
separating payoff sensitivity, information access and inference cost.

Primary methods consulted before implementation:

- [ODD update (Grimm et al., 2020)](https://www.jasss.org/23/2/7.html): explicit
  model purpose, rationale and reproducibility. Consequence: scientific diagnostics
  disclose fitness limitations separately from executable mechanical admission.
- [Lazic (2010), pseudoreplication](https://pmc.ncbi.nlm.nih.gov/articles/PMC2817684/):
  identify the experimental unit; measurements within one unit do not increase n.
  Consequence: whole trajectories/scenarios are declared units, repetitions retain
  seed matching, and descriptive plans withhold population intervals.
- [Melting Pot (Leibo et al., 2021)](https://arxiv.org/abs/2107.06857): generalization
  across social scenarios and partners needs separate evaluation. Consequence:
  development cases test mechanics/calculations, never certify agent generality.

The research contract is version1 and optional. Existing designs receive descriptive
registered metrics and a conspicuous undeclared-plan warning; they are not silently
preregistered. Unsupported concepts require a manual coding procedure. All terminal
outcomes expose their formula, eligible/planned denominator, exact run/turn scope
and missingness; failed/unfinished attempts remain in effort and the planned matrix.
Request/cost outcomes include participant and judge calls, exclude Researcher calls,
and withhold a final cost when usage is pending or unknown. Numerical agreement
never certifies interpretive prose. Export19 includes the findings in the same
SQLite read snapshot as the rest of the evidence; DB15/library10 remain unchanged.

Actual coordination scenarios replace only the declared immutable value tables,
matched across conditions for each seed. The authoring UI can rotate alternative
labels; that counterbalances which named alternative pays best, not names, roles,
action order or population sampling. Existing condition order/profile overrides
remain the mechanism for explicitly designing those contrasts. Scenario metadata
has a separately checked version1; existing World transition rules are unchanged.

An actor-only local-value reference reads the first permitted immutable table and
chooses that table's local maximum. This simple order-sensitive control is not an
own-payoff optimum when multiple tables are shared. Scientific review executes
the same policy under the declared ACLs and horizon before comparing its payoff
with the joint optimum. It never reads researcher-only optimum data or calls a provider.
Regret independently enumerates feasible joint choices including abstention. Waiting
still has no World payoff cost; the review makes that visible and recommends horizon
sensitivity. A new payoff mechanism requires the existing explicit reviewed-contract
and admission flow, not a natural-language promise of a cost.

The optional event-wait harness is a declared policy change, never a silent speedup.
It repeats only a model-chosen wait when actionable input is unchanged, wakes on
input change or the last round and after a bounded own-turn count. Clock, memory,
own outbox and prior-action history alone do not wake it. Every wait still commits
a normal World turn and a source-linked zero-request activation, and replays exactly.
Ordinary direct-action and tool-using policies retain their semantics.

Performance defaults remain three runs/four provider requests. Deterministic delayed
provider tests measure actual peaks under (runs, requests) caps (1,4), (3,2), (3,4),
with observed peaks 1,2,3, causal turn order and replay. Bounded schema caches store
legal identifiers/types, never private payloads; ACL-isolation tests guard the keys.
A local 300-schema CPU microbenchmark measured 0.206528s before versus 0.001221s
after caching; this is not provider latency or an end-to-end throughput claim.

UI direction: keep the existing quiet research workbench, stock fields/disclosures,
semantic tokens, typography and borders. Findings lead with observed outcomes;
uncertainty, all-attempt effort, formulas and pinned evidence remain one disclosure
away. Authoring sits beside the hypothesis and run matrix. Completion names the
actual number of turns, maximum and stop reason; “complete” is never a competence
score. Run/study detail and findings polling is active-only; idle detail queries refetch
on focus or explicit action. The existing workspace-wide run-status poll remains.

## Verification history

- New contract/calculation/scenario/wait/control/concurrency tests pass, including
  public HTTP revision/reopen and concurrent-commit export snapshot checks.
- Existing affected backend groups, whole Ruff/types, frontend units and build have
  passed at their recorded sources; complete final checks are recorded below.
- Initial import/fixture/static failures remain under `.tools/research-quality/`;
  they are not mislabeled product reds. Original pilot evidence remains untouched.
- Fresh authoring/findings/recovery browser flows pass3 cases in desktop light and
  phone dark after an incorrect exact-text locator was retained/corrected. The broad browser pass retained184/187 passing cases. Two genuine saved-revision
  cache failures were fixed; the third failure expected idle polling contrary to
  the new focus/action refresh policy. All seven affected repair/new-flow cases
  then passed. This is not a fresh187/187 full-suite claim.
- Live stages01/02 are retained FAILED: all16 actual trajectories completed and
  replayed, but three interpretation attempts hit the unchanged input-size limit.
  Offline exact-copy reproductions isolated duplicated wire evidence; compact local
  references and recursive sharing preserve the original frozen evidence. Stage03
  passes the remaining exact interpretation and a new small draft.
- One aggregate restored ledger settles94 requests,575731 input/26044 output tokens,
  $1.153843 total, partial=false, against the authorized $20 ceiling. Never sum the
  cumulative stage totals as independent spends. All three live servers were reaped
  and port18145 reuse checked. No automatic provider retry/substitution occurred.
- First task pair (bonus3) already favored local-only choice: joint regret0 in all
  arms. The second pair (bonus5) has local-reference regret5/1; Luna still selected
  the same local alternatives. Those choices preserve individual incentives even
  though the joint optimum is higher. No messages were sent, so assigned delays
  did not test delayed-message receipt. No live event-wait savings were elicited.
- Manual review of final Sol answers found exact recorded outcome/effort tables,
  individual-versus-joint incentives, private-information/exposure and finite-horizon
  limits, and a concrete ACL contrast proposal. Structured numerical claims were
  checked; attached prose remains unassessed by the platform. These development
  cases establish neither semantic certification nor general model competence.
- No new waiting-cost World or general semantic judge is claimed. Those remain
  explicit limits rather than pretend mechanisms or scientific certification.

## Independent review and prospective confirmation

Fresh Standards and Spec reviews found two defects after the first checkpoint:
a literal artifact shaped like an internal analysis reference could be replaced,
and the scientific local-reference diagnostic assumed actors selected their own
payoff table even when ACLs exposed an earlier table. Exact-wire references now
use a declared property absent from every original dictionary; decoding preserves
literal evidence. The diagnostic executes the actual first-readable-table policy
under the actual horizon/ACLs. Focused independent regressions pass109 cases.

Backend broad attempts01/02 remain FAILED, with5 failures each and1077/1131
passing cases respectively. Final03 passed all1883 cases in569.13s; stale
export fixtures advance only the explicit contract metadata to export19. No
checks, old evidence or incompatible-data rejection tests were removed.

The prospective [confirmation declaration](../../benchmarks/research-quality-confirmation.json)
freezes the already implemented production hashes before opening new outputs.
Two fresh cases cover manual constructs and invalid sampling/incentive inferences;
each runs once without tuning or rescoring. They are held back from implementation,
not an independent hidden population benchmark. The old sensitive interpretation
is separately labeled a regression retest, not counted as fresh confirmation.
All calls restore the same cumulative ledger and stay within the original $20 cap.

## Final observed validation

- Full backend:1883 passed. The subsequent formatter preserved the AST of all130
  Python files; one additional test-only non-null assertion fixed two type errors,
  and all27 research-quality tests then passed again. Whole Ruff/globalty and
  affected formatting checks pass. Earlier static failures remain retained.
- Frontend:168 units/39 files passed; the final test-helper lint relocation was
  followed by9 editor passes. Lint247, forced TypeScript and private Vite build pass.
  Broad browser184/187 and all7 affected repair/new-flow cases pass at their
  attributed sources; no fresh187/187 all-green rerun is claimed.
- Prospective confirmation:both new cases completed once and met the frozen rubric
  in manual review. The old sensitive interpretation also completed with its exact
  prior question. No further model/source tuning followed these answers.
- Live04 remains FAILED at its final recorder assertion: it wrongly required a
  study-wide charge to stay unchanged after explicit paid study analysis. Separate
  offline verification proves all16 run rows, revisions, turns, activations, events
  and measurements unchanged; all8 new requests are research-only. Existing request
  rows are unchanged, and both study/workspace charge deltas equal the new ledger
  entries exactly. The first offline helper also retained a strict-host400 setup
  failure before corrected localhost verification. Offline completion02 passes
  export19/findings equality and8 exact zero-call replays; no paid retry occurred.
- One aggregate ledger settles102 requests,782142 input/33251 output tokens and
  **$1.638735**, partial=false, below the original$20 ceiling. Live01/02 failures
  and live04 recorder failure remain failures, with lossless closed-DB maps.
- Native keyless runtime passes4/24/240 turns, exact replay/export and20 warm reads.
  The240-turn case completed in3003.24ms, replayed in316.57ms and exported in363.57ms.
  Four-worker mixed p95:health3.93ms, run285.72ms, experiment143.05ms; peak server
  RSS318432KiB. These single-VM measurements exclude provider latency and establish
  neither population capacity nor a reliable before/after speedup. Three-run/four-
  request defaults remain unchanged. Large full-evidence run reads remain the
  slowest inspection path. Server exited-15 and port18147 was released.

Evidence is under `.tools/research-quality/`; source-frozen confirmation cases are
tracked beside the public development declaration. No original user data or
historical failed evidence was removed. Current docs use export19; old contract
readers, aliases and reset paths were not added. Independent final recheck and
safe8080 refresh are complete; hosted CI remains the merge gate.

## Closing review and running app

- **Standards: PASS** at `f6ffa4fe`, no blocking breaches. The sole P3 finding was
  an outdated architecture paragraph listing only three scripted controls; it now
  documents the fourth control and each environment restriction.
- **Spec: PASS** at `f6ffa4fe`, no blocking gaps against criteria1–10. The reviewer
  independently inspected confirmation outputs, literal-wire/ACL/horizon repairs,
  original declaration digest and formatting-only source equality.
- Normal Gitleaks initially flagged an API source filename beside a SHA256 in the
  confirmation manifest. Independent hashing proved a non-secret source digest.
  The manifest now uses explicit path/sha256 rows with identical cases/hashes and
  the original declaration digest; original bytes remain retained. Normal hooks
  pass with no exemption, disabled rule or bypass.
- Guarded8080 refresh passed at `f6ffa4fe`:64runs/8chats/2studies, database inode,
  every persisted row and usage unchanged. Read-only desktop1280/phone390 checks
  show the original24-run findings, no console errors or horizontal overflow.
  The owned tab is closed. App8080 stays running as requested; test ports are free.
- Final-state01 retained an overly strict asset-directory equality failure: the
  private test build contains14 historical, unserved chunks. Final-state02 verifies
  every clean served asset equals its qualified private-build bytes and production
  ASTs still match the confirmation freeze. No historical evidence was deleted.

Remaining research limits are substantive: no new waiting-cost World mechanic,
independent prose certification, human predictive validation or model generality
claim. Live cases did not elicit delayed-message receipt or event-wait savings.
The frozen historical T01 still fails its four old export-v4 checks; current
export19 qualifications are separate and never relabel that history.

## Hosted CI follow-up

The first container job at38b37145 built and booted the non-root image and passed
health/assets/containment checks, then failed the production smoke's stale literal
export18 assertion. The real public API reproduction observed export19 and the
same assertion red; updating that one current-contract expectation to19 passes
with zero provider calls. Smoke-script Ruff passes. No production contract or
compatibility path changed; the corrected hosted job remains the merge gate.
