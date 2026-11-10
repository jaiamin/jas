# Whole-product quality review

This review is in progress. It accompanies the user's request to finish JAS,
simplify its interface, review frontend and backend, benchmark actual behavior,
and leave a fresh workspace running on port 8080. The accepted application base
is `fdfb5f7a`; T12, T17 and T18 remain separate, unaccepted implementations.

## Method and scope

Use the installed Ponytail audit and Impeccable workflows alongside the existing
JAS design system. Desloppify is not installed; no Desloppify score is claimed.
Expected load is one local user, 1–12 active experiment participants, bounded
provider concurrency and independent concurrent runs. This is not a public,
authenticated multi-user service.

Review the actual public workflows, persistence, provider accounting and worker
boundaries. Prefer concrete failing cases and small fixes over scanner-score
changes or new abstractions. Existing immutable revisions, exact replay,
private observations, explicit spending and one current contract remain binding.
The historical raw evidence was retired with user authorization; use the fresh
current-contract qualification gate in the compact report.

## Navigation audit correction

**The first diagnosis overstated a product defect.** Isolated Run and Experiment
tests reproduced pending controls carrying into a second record, but omitted the
actual workspace shell. `WorkspaceShell` already keys its content and error
boundary by `location.pathname`, remounting each record page. That existing
behavior isolates controls and late errors in the application.

Commit `dd48bf31` added two redundant mutation keys on the strength of those
incomplete fixtures. They are removed. The two new tests now render through the
actual `WorkspaceProvider` and `WorkspaceShell` route, retain delayed requests
and late-error assertions, and check the existing protection without a product
repair. The isolated failures remain recorded as test results; they are not
whole-app red→green evidence.

The initial run fixture also lacked ResizeObserver. A later TypeScript check
rejected an unsupported test-query option, and lint caught its whitespace.
Those failures remain recorded with the corrected diagnosis.

Current records: `.tools/research-harness/current/control-*`,
`record-control-navigation-*` and `experiment-control-navigation-*`. These are
fresh source-stamped checks, not historical before/after evidence.

Before this correction, all 118 frontend units across 33 files, lint over 228
files, forced TypeScript and an empty-output-directory Vite build passed. These
results apply to the redundant-key source. The keyless browser check used
fresh API-created records, delayed control responses and client-side history
navigation. Both the 390px run and 1440px experiment views retained enabled
controls on the second record and excluded the first record's late error. Both
used the app's explicit dark setting; changing the browser's preferred theme
did not replace that saved setting. No console errors or document-width overflow
were observed. This browser result did not establish a pre-existing defect:
the original shell already supplied the tested isolation. The owned tab/service
are closed and the lock released.

Corrected-source qualification passes 13 focused Run/Experiment/shell tests,
lint over 228 files, forced TypeScript and a fresh empty-output-directory Vite
build. Each check recorded unchanged source
`2eff28ca345239dedc5f09b9c4ca6a43acc5d73560546df19a573faa2d39a6a7`.
Rendered checks pass at 390px/light for Run and 1440px/dark for Experiment:
the first control is held pending, client-side navigation opens the second
record with enabled controls, and the old late error stays absent. No console
errors or document overflow were observed. These verify existing shell behavior.
Records are `current/control-shell-*`. The owned tab and server are closed.
The supervisor's plain post-shutdown bind check failed on the recently closed
TCP port; a separate listener check and reuse-address bind passed. That helper
failure is retained and does not change the browser result.

## Experiment overview hierarchy

The default Overview now leads with results, an active-run state or the honest
"No results yet" state. Full comparison, uncertainty, effort and exposure remain
available in a stock, initially closed **Comparison & evidence** disclosure.
The main Run/Pause action stays in the heading. This is an intentional usability
refinement, not a red→green bug claim.

At unchanged source
`43d7dac4b94a890bf7d838001e6596dea5f7e2b84969717734b479fbe6999582`,
all 118 frontend units/33 files, lint228, forced TypeScript and clean Vite build
pass. Four uncertainty browser cases cover390/1440px and both themes, including
keyboard access, missingness, effects, export and immutable revisions. Two
reference-policy and three exposure browser cases pass with their original
behavior assertions retained. Manual default-view inspection passes at1440px
light and390px dark: the primary action and empty state are visible, disclosures
start closed, no console errors or mobile document overflow are observed.
These use a fresh keyless workspace; no provider calls occurred. The owned
tab/server18228 are closed, port reuse is verified and flock is released.
Records are `current/study-overview-*`.

## Analysis acceptance cutoff race

The backend witness uses the already approved public HTTP seam with real
Engine/storage and keyless scripted providers. It schedules exposure capture
after an analysis accepts turn1 but after the next separately requested step
commits turn2. Predeclared outcome: the analysis cutoff, exposure through-turn,
evidence index and lens stay at1; the later activation/request stays outside
that frozen membership. The run itself reaches2 with exactly two participant
requests (200input/100output tokens,70 synthetic microdollars). Export retains
the same analysis snapshot. A scheduling barrier calls the real public exposure
reader unchanged; it supplies no synthetic database or exposure results. This
first execution failed: the accepted cutoff was1 but exposure through-turn was2.
The retained red is `current/analysis-capture-red-01`, source98146146.

The repair always carries the accepted cutoff into the exposure reader. Current
capture still includes in-flight input when that cutoff is current; historical
capture excludes later activations. The same concurrency witness then passes.
A second public HTTP case passes on first observation: a participant request
already in flight is retained as unknown delivery, and later settlement leaves
the accepted analysis/export snapshot unchanged. It is a preservation check,
not a second repaired defect. Persisted/export contracts are unchanged.

After formatting,31 claim-support cases and68 exposure/context/assistant cases
pass in two segmented jobs, together with affected Ruff and global ty. These99
cases include both new HTTP witnesses. Each recorded unchanged source
`31ee798ac87a91a342925d75e7a9a391cc66c5963c6303d7eb6f1f5ef563680a`.
Records are `current/analysis-capture-*`; actual spending is zero. No global
atomic-snapshot or complete-repository verdict follows from this narrow fix.

## Remaining review

- Browser verification of the remaining ticket workflows and both app themes.
- Independent integration reviews for T12, T17 and T18.
- Full Agent, manual experiment, browsing and interaction-viewing usability pass
  on desktop/mobile and both themes.
- Final provider/accounting/privacy/replay and containment review on combined
  source, followed by meaningful current-source measurements.
- Compact final verdict, obsolete-data cleanup and verified port-8080 launch.

No complete-repository, live-competence or final-production verdict is claimed
at this intermediate boundary.
