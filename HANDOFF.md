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

Assistant/header follow-up (November 14): the fixed 440px pane now extends beside
and aligns with the global 52px header. Opening/closing uses the left navigation's
200ms linear width transition, with reduced-motion support, fixed inner width,
inert closed content and explicit-close focus restoration. Opening remains manual
after navigation, Back and reload; remembered chat/draft identities remain intact.
The toolbar uses a four-corner Maximize focus link before SquarePen New chat and
PanelRightClose, with aligned 16px glyphs, 28px controls and 2px action gaps. History
titles cap/truncate with ellipsis while retaining full accessible names. The welcome
uses the Assistant Target, a 6px text gap and the same leading edge as suggestions
and composer text. The left navigation is 240px wide and its 16px panel icon changes
direction with open/collapsed state. Removed dividers below JAS and above usage;
retained the navigation divider. Usage now has a 57px soft-gray bordered surface,
12px padding, a clearer label and quiet hover, without changing precision or usage.

Chat history now offers confirmed deletion with busy/error/retry states, clearing
only matching remembered identities after success. The new transactional endpoint
rejects live/pending chats, unsettled calls and proposals referenced by saved
revisions. Costs, tokens, unknown reservations and experiment/run accounting links
remain intact; deleted turns' raw prompts/responses are cleared. Context capture
rechecks chat identity before accepting a turn, preventing deleted-chat resurrection.
No schema change or user data deletion was performed during verification.

Verification: 82 backend tests, all 150 frontend unit tests, Ruff/format, ty,
lint/build and 87 affected browser cases verified across runs. Final pane/navigation
checks passed all 28 cases; four additional usage checks passed after the last
visual adjustment. The design detector reported no findings. Manual desktop/light
and phone/dark checks found no overflow or console errors. The local 8080 process
was refreshed after confirming no active runs/pending chats; health is 200 and
its workspace is preserved. No paid calls, deployment or Railway changes.

Experiment-ideas/composer spacing follow-up: restored the original group's zero
gap so cells meet their dividers instead of inheriting 16px ItemGroup gaps. The
four original illustrations/copy remain, equal-width desktop text fills each cell,
and both horizontal insets measure exactly 16px. The user's proposed right-padding
reduction was withdrawn; symmetric padding is retained. Shared composer text now
has 12px top padding (previously 8px), with its existing side/bottom insets and
height/growth behavior. Lint/build and all 10 targeted desktop/phone, light/dark
browser checks passed; these now measure actual divider adjacency and text insets,
not only declared button padding. Manual Home inspection on 8080 confirmed the
final geometry; the design detector reported no findings. Backend/unit suites were
not rerun for these layout-only edits. No deployment or paid calls.

Ideas/usage follow-up: the user approved keeping communication and memory while
making the other two Home ideas concrete work comparisons. The magnifier now
offers source-access/report accuracy; the money bag offers shared material
budgets/work completion. Visible copy and drafted prompts agree, preserve
controlled comparisons, matched seeds and the $3 pilot ceiling, and never start
runs on selection. Four equal cells and symmetric 16px padding remain intact.
Usage now has 14px bottom padding (12px top/sides), with its outer edges exactly
aligned to the navigation divider's 16px insets. Its condensed tooltip retains
precise totals, reservations, unknown costs and priced usage; an uncapped ceiling
is named explicitly. The collapsed rail is slightly wider, from 48px to 52px.

Verification: lint/build, six suggestion unit tests and 13 affected browser cases
passed, including desktop/phone, light/dark, all four draft selections, exact
Usage/divider geometry, precise costs, collapsed visibility and stable expansion.
Rendered desktop/light and phone/dark screenshots were inspected. The mechanical
source detector reported no findings; parsed-page checks were not run. Backend
and full frontend suites were not repeated for this copy/layout-only change.
The existing 0.0.0.0:8080 app serves the rebuilt assets and health returned 200.
No provider calls, user-data changes, Railway changes or deployment.

Chat/environment refinement: the full-screen new-chat view again centers its
welcome, composer and suggestions; the pane and saved conversations remain
bottom-composed. Shared confirmed deletion now lives in the toolbar before New
chat, outside History, and both actions are hidden on new chats. Full-screen
toolbar insets and 4px gaps align Trash with theme and New chat with GitHub;
pane controls retain 2px gaps. Confirmation, failure/retry, pending protection,
identity cleanup and focus restoration remain intact. Copy response has no
tooltip and sits 2px from cost. Removed call-count/spending captions from Home
and Assistant while retaining Home guidance, errors and server spending limits.
Both chat views have no fade or outer composer top spacing; internal text padding
remains, with at least 24px transcript clearance after the final reply footer.
Usage outer edges match selected navigation backgrounds, with 10px inner side padding.

Environment rows use fixed 64px phone / 80px desktop artwork columns and scale
the marks against the text block within those limits. This prevents cyclic
artwork/text sizing and overlapping phone rows. Metadata uses small bordered
background-surface tags with 6px rounding; counts, example costs, unknown costs,
custom versions and existing actions remain. Loading placeholders match the
column layout. Long custom environment labels retain full text with visible
truncation. Quick-builder and detail-header artwork sizes are unchanged.

Verification: frontend lint/build and all 151 unit tests pass. The final 13
Assistant cases cover no-fade/no-gap geometry, streaming/copy, pane/full-screen
handoff, deletion recovery and composer growth. All 11 Environment cases pass,
including 320px/390px/1600px, both themes, row containment, metadata, navigation,
custom reuse and loading/error recovery. Three final placeholder/truncation
browser rechecks pass. Rendered Assistant and Environment screenshots were inspected.
Earlier affected browser runs also verified toolbar alignment, Usage edges and
15 repeated draft handoffs. Backend checks were not repeated: no backend code
changed. The existing 8080 app serves the rebuilt assets; preserve its process
and data/workspace. No provider calls, user-data deletion or deployment.

Documentation/Learn and compact Assistant follow-up: the global header now has
an outlined Docs link immediately before Assistant, also available on Home and
the focused chat page. Learn contains Docs, JAS MCP and Examples. External links
open new tabs with ArrowUpRight; collapsed tooltips and mobile closing are retained.
Examples lists the existing six scripted recordings in quiet separated rows with
Watch and Use example actions. The shared viewer returns to Examples; missing
starter recovery points there. Home's four illustrated ideas remain intact.
The right pane's welcome heading is now 18px with a 22px Target and 24px below
suggestions. Focused chat sizing and outer composer spacing are unchanged.

Prepared eight concise Mintlify pages under docs/site, with Geist, JAS colors and
favicon, local installation, experiment/evidence/provider/publishing guides, CLI
reference and an explicit JAS MCP Coming soon page. JAS has no workspace MCP
implementation. docs/INSTALLATION.md now describes Learn → Examples accurately.
The configured public site is https://jas.mintlify.site; its existing content is
still Mintlify's starter. The requested Mintlify MCP registration and OAuth login
succeeded, but this running session exposes no Mintlify tools and gateway search
finds none. Direct initialization returned Cloudflare 403 and was not retried.
The web editor and maintained CLI lack their separate site-editing sign-in.
No new site, hosting source or deployment was provisioned. Public publication is
still blocked: upload docs/site through authenticated editing access or configure
it as the existing site's Git source. The configured /integrations/jas-mcp public
link will require that publication before the new page is available. Do not claim
that local docs edits updated the public site. See docs/DOCUMENTATION_PLAN.md.

Verification: frontend lint/build, all 151 unit tests and all 39 affected browser
cases pass in the final run. Checks cover 320px/390px/desktop layouts, both themes,
header alignment, Learn links, collapsed navigation, Examples loading/error/retry/
empty states, viewer/editor reuse without paid calls, exact Assistant sizes and
suggestion spacing, chat handoffs/history/deletion and existing navigation/usage.
Rendered Examples and Assistant screenshots were inspected. Mintlify 4.3.34
validation and broken-link checks pass; local desktop/light and phone/dark pages
were inspected, including JAS MCP. Backend tests were not repeated because no
backend code changed. The user app on 0.0.0.0:8080 remains healthy and serves the
rebuilt assets. Preserve its process and data/workspace. No paid calls, workspace
data deletion, app deployment or Railway changes.

Examples reference refinement: replaced the separated list with grouped stock
Cards under Work & evidence and Cooperation & decisions. Short titles/questions
and Watch/Use actions lead each card; a lower inset, clipped protocol preview
uses actual conditions, participant counts, seeds, rounds and stable condition
colors. No invented results, image assets or additional fetches. Container queries
give one/ two/three columns and respond to the Assistant reducing content width.
Loading placeholders match the grid; cached-data/error/retry/empty behavior stays.
The top Docs control is text-only; sidebar external-link arrows remain. Compact
Assistant welcome has no icon, retains its 18px heading/alignment and now has
40px below suggestions. Focused welcome and message/header icons are unchanged.

Verification: frontend lint/build, all 151 unit tests and all 21 affected browser
cases pass. The final six Learn rechecks additionally verify three-to-two-column
reflow beside the open Assistant and back, in both themes. Screenshots inspected
for desktop/phone Examples and Assistant. Watching/reusing stays keyless; no paid
calls were sent. Backend checks were not repeated for these frontend-only changes.
The existing 8080 app serves rebuilt assets and health is 200. No deployment,
Railway change or user-data deletion. The earlier Mintlify publication blocker
remains; this refinement does not change the public site.
