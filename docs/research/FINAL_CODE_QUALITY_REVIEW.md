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

## Observed defect and repair

**Run and experiment controls carried state across record navigation.** Start a
control request on one record, then navigate to another record while the request
is pending. The second record's Run button becomes disabled. A late error can
also appear on the wrong record. Independent rendered-UI tests reproduced the
disabled button for both routes before repair.

Give each existing TanStack mutation a key containing its record identity.
The installed version and upstream source document that a changed mutation key
detaches the observer from the previous request; the original request continues
and retains its original callbacks. No new component, state mirror or wrapper
is needed. Observation drafts keep their existing ownership and lifetime.

The focused run, experiment and observation tests passed 9 cases. The first
run-test attempt failed because its browser-environment fixture lacked
ResizeObserver; the corrected fixture then exposed the genuine product red.
An initial TypeScript check rejected an unsupported test-query option; removing
that option preserves the same accessible-name assertion and the next forced
check passed. Both failures remain in the current compact records.
The final lint also caught whitespace left by that test-only type correction;
normal formatting and the subsequent full lint passed. It changed no assertions
or application bytes after the unit/build/browser checks.

Current records: `.tools/research-harness/current/control-*`,
`record-control-navigation-*` and `experiment-control-navigation-*`. These are
fresh source-stamped checks, not historical before/after evidence.

All 118 frontend units across 33 files, lint over 228 files, forced TypeScript
and an empty-output-directory Vite build passed. The keyless browser check used
fresh API-created records, delayed control responses and client-side history
navigation. Both the 390px run and 1440px experiment views retained enabled
controls on the second record and excluded the first record's late error. Both
used the app's explicit dark setting; changing the browser's preferred theme
did not replace that saved setting. No console errors or document-width overflow
were observed. The owned tab/service are closed and the lock released.

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
