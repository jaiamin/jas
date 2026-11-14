# JAS handoff

MVP redesign implementation follows [the acceptance matrix](docs/MVP_REDESIGN_PLAN.md).
v0.2 features are excluded. Product and architecture decisions live in docs/adr/;
setup, testing, publishing and hosting each have focused guides in docs/.

The runner and provider keys stay local. The separate public gallery has no model
execution service. Preserve the existing Railway service/volume; no redeploy or
provisioning is part of this review. The local app is to remain on port 8080.

Local verification: 1,969 backend tests, 146 frontend tests and 201 browser tests
passed. Final affected checks add 33 backend cases, 19 viewer/workspace browser
cases, nine starter/catalogue cases and two anonymous gallery phone/theme cases.
Ruff, formatting, ty, frontend lint/build and Actionlint/ShellCheck pass. The final
wheel serves its bundled UI/recordings from an unrelated working directory with
zero model calls. Private-hosting and separate-gallery container smokes pass.
The README includes an actual 20-second scripted replay capture.

Backend/browser regression logs and retained live evaluation evidence are kept in
the ignored task workspace. Internal research
reports and the previous detailed handoff were byte-checked into a private local
archive before removal from the current public tree; Git history is intact.

Local review uses `data/workspace` on port 8080. No existing workspace was reset,
no Railway resources changed, and no launch-corpus model calls were made.
Inside the sandbox, start with `.venv/bin/jas --workspace ./data/workspace
--host 0.0.0.0 --port 8080 --no-browser` so the host's existing loopback port
mapping reaches the app. Keep the localhost Host/origin protections enabled.

Reply-cost follow-up: Copy/cost spacing is 4px; the popup shows recorded models,
tokens and the estimate to microdollar precision, without its normal footer paragraph.
Footer estimates use at most three decimal places; positive costs below $0.001
show `<$0.001`, while a genuine zero remains `$0.00`. Popup precision is unchanged.
Settlement now uses recorded SDK cache pricing for bundled prices, preserves custom
prices, and retains reservations when provider usage is missing. Two existing local
receipts were corrected from their saved SDK costs with a private backup/correction
log in `.tools/workspace-backups`; request/response evidence was byte-checked unchanged.
No provider calls were made. Follow-up verification passed 60 backend tests, all 149
frontend tests, lint/build, Ruff/format and ty, plus desktop/light and 320px/dark browser
checks and Escape focus restoration. The additional full backend run was interrupted
by SIGTERM at 32%; it did not finish and is not a fresh full-suite pass.
The first Markdown block no longer adds its own top margin: browser measurements
now show the same 11px block gap after Activity for heading- and paragraph-led replies
(previously 27px versus 11px). All frontend tests/lint/build passed again afterward.

External launch gates: registry publication, live GitHub/S3/keychain integration,
actual cross-machine publish/fork, provider terms, genuine launch corpus and the
specified outside-user checks. Hosted CI previously could not start because of
GitHub billing limits; local checks do not resolve that account-level block.

Composer/dropdown follow-up: removed the spending caption beneath the plain
Assistant composer, preserving Home guidance/estimates and operational errors.
Shared option menus now align to the trigger's left edge; selected text aligns
left with symmetric 10px padding and truncates before the caret. Searchable
record filters use matching trigger spacing. Frontend lint, 149 unit tests and
build pass. All 54 affected browser cases were verified (52 in the initial run,
then the two filter cases after correcting the new test's hidden-trigger lookup).
Manual checks on port 8080 verified compact filters and full-width Settings/editor
selects at 320px without horizontal overflow, with 11px from caret to outer edge.
The existing local server remains on 0.0.0.0:8080; no model calls or deployment.

Sidebar follow-up: usage appears only in the expanded sidebar; collapsed loading,
unavailable and usage states are hidden, leaving a direct Settings link. Navigation
icons stay outlined when selected. The 5px expanded meter uses up to three decimals
for dollar usage, `<$0.001` for tiny nonzero charges and two decimals for the ceiling;
tooltips retain up to six decimals. Token counts and accounting are unchanged, and
uncapped meters have no percentage value. Obsolete ring code was removed. Lint/build
and four affected browser cases pass, covering collapse/expand in both themes,
zero/threshold/precise-dollar display and token/uncapped fallback. Unit/backend suites
were not repeated. The existing local app remains on 0.0.0.0:8080; no deployment.
Sidebar toggle spacing: both states retain a 28px control and 14px glyph. The
expanded control now ends 6px before the divider; collapsed alignment is preserved.
Lint/build and two desktop/narrow navigation browser cases pass; full suites were not rerun.


Workspace interface refinement: [the UI acceptance plan](docs/UI_REDESIGN_PLAN.md)
records the latest user-approved changes. Home has four original illustrated
Experiment ideas with equal cells and 16px horizontal padding; Get started and its
onboarding-only writes are removed. Gallery sits below Home and contains Browse /
My published; Assistant and Community are removed from the left navigation.

The outlined Assistant toggle precedes the theme control, with equal 10px padding
and matching vertical centers. It is absent on Home and the focused Assistant
page; Home has no top-right history control. The 440px right pane starts below the
global header, pushes wide-page content, and fills the main area below 1280px.
Its dropdown uses a darker history icon and the current chat name / New chat.
Only New chat and Close remain at right; Open in Assistant is inside history.
The welcome has the supplied JAS logo, suggestions have no boxed background, and
the composer stays at the bottom. Shared Add context always remains available;
individual experiment/run pages select their displayed revision/cutoff by default.
Selection is clearable and remembered without modifying page filters.

Chat/draft slots survive closing, navigation, reload and late acceptance. Focusing
an accepted pending submission reconnects that chat without another POST. A late
response cannot replace a newer chat/draft. Usage retains its accounting and
precision; its fixed-width text is clipped by the footer during expansion instead
of squeezing/wrapping. All sidebar icons remain outlined.

Final verification: frontend lint/build, all 149 unit tests and all 83 affected
browser cases passed, including desktop/phone, light/dark, exact scope, manual
context, history, streaming/recovery, drafts, pending handoff and measured padding /
usage animation. Manual inspection verified the final pane on the running 8080
app. Backend tests were not repeated because backend code is unchanged. No model
calls or deployment were made; preserve data/workspace and the existing 8080 server.
