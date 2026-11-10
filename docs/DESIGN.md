---
name: JAS
description: Stock shadcn components for a local agent experiment workspace.
colors:
  light-background: "oklch(1 0 0)"
  light-foreground: "oklch(0.145 0 0)"
  light-card: "oklch(1 0 0)"
  light-primary: "oklch(0.546 0.245 262.881)"
  light-primary-foreground: "oklch(0.985 0 0)"
  light-muted: "oklch(0.97 0 0)"
  light-muted-foreground: "oklch(0.556 0 0)"
  light-accent: "oklch(0.932 0.032 255.585)"
  light-accent-foreground: "oklch(0.424 0.199 265.638)"
  light-border: "oklch(0.922 0 0)"
  light-destructive: "oklch(0.577 0.245 27.325)"
  dark-background: "oklch(0.21 0 0)"
  dark-foreground: "oklch(0.985 0 0)"
  dark-card: "oklch(0.245 0 0)"
  dark-primary: "oklch(0.546 0.245 262.881)"
  dark-primary-foreground: "oklch(0.985 0 0)"
  dark-muted: "oklch(0.3 0 0)"
  dark-muted-foreground: "oklch(0.76 0 0)"
  dark-accent: "oklch(0.282 0.091 267.935)"
  dark-accent-foreground: "oklch(0.882 0.059 254.128)"
  dark-border: "oklch(1 0 0 / 16%)"
  dark-destructive: "oklch(0.704 0.191 22.216)"
  chart-1: "oklch(0.87 0 0)"
  chart-2: "oklch(0.556 0 0)"
  chart-3: "oklch(0.439 0 0)"
  chart-4: "oklch(0.371 0 0)"
  chart-5: "oklch(0.269 0 0)"
typography:
  headline:
    fontFamily: '"Geist Variable", sans-serif'
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.333333
  title:
    fontFamily: '"Geist Variable", sans-serif'
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.375
  body:
    fontFamily: '"Geist Variable", sans-serif'
    fontSize: "0.875rem"
    lineHeight: 1.428571
  label:
    fontFamily: '"Geist Variable", sans-serif'
    fontSize: "0.75rem"
    lineHeight: 1.333333
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
spacing:
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "6": "24px"
  "8": "32px"
---

# Design System: JAS

## Overview

JAS composes stock shadcn components and preset styling. The foundation uses
Nova, Radix, neutral, Geist and Lucide, with the user-requested surfaces,
blue actions/selection and wordmark below. Preserve the supplied
[`logo.svg`](../frontend/public/logo.svg). The top-left lowercase `jas` wordmark
alone uses the original locally hosted Bricolage Grotesque subset at 22px/800,
without a subtitle. All other interface text follows the preset font.
The compact brand link covers only the logo and wordmark, aligns with navigation
icons, and has no hover fill, underline or movement on activation.
The 20px logo stays vertically centered and uncropped, retaining its horizontal
position throughout navigation collapse and expansion.

[`components.json`](../frontend/components.json) owns preset configuration;
[`index.css`](../frontend/src/index.css) owns theme colors, chart colors, fonts and
radius mappings. [`components/ui`](../frontend/src/components/ui) owns generated
component styles. The frontmatter above is a snapshot of reused values, not a
second token authority. Refresh it after changing presets. The ignored
`.impeccable/design.json` records supplemental metadata without copying components.

**Key characteristics:** stock controls, semantic theme tokens, compact data views,
responsive navigation and explicit workflow states.

## Colors

Light mode uses white surfaces. Dark mode uses a neutral graphite canvas and
sidebar (oklch(0.21 0 0), approximately #181818), raised cards and menus
(oklch(0.245 0 0), approximately #202020), and muted/secondary surfaces
(oklch(0.3 0 0), approximately #2e2e2e). The composer surround, skeletons and hover
states share the muted token. Muted text uses oklch(0.76 0 0); borders and inputs
use 16% and 20% white respectively. Sidebar borders/rings inherit the shared
border/ring tokens. Keep foreground/background pairs together in every view.
Selection uses a subtle blue accent. Hover uses half-strength accent, while the
selected item keeps its full accent on hover. Both are shared semantic tokens.
Send and New experiment use the primary Button variant. Primary actions use a
shared blue primary token with a light foreground in both themes; secondary surfaces, muted text,
borders, focus and destructive states use their corresponding semantic tokens.
Keep foreground/background pairs together when composing components.
Shared cursor rules give enabled actions, links, labels and portalled menu/select
items a pointer. Text entry keeps its text cursor; disabled controls are excluded.
Focus decoration follows input modality throughout the app, including portals:
pointer clicks do not add rings; keyboard navigation retains the preset focus
indicators. Typing into a pointer-focused text field does not turn the ring on.
`useInputModality` tracks this once at the root; shared `focus-visible` and
`has-focus-visible` Tailwind variants gate focus styles in `index.css`.
The base layer also suppresses native outlines while pointer modality is active;
Radix focus restoration can otherwise leave a browser outline on clicked tabs.
Keyboard mode restores native and preset indicators without changing selection,
validation rings or normal control borders.
InputGroup, Field and CodeBlock use the latter for their enclosing surface.
Keep these small variant substitutions when regenerating those primitives from
a preset; validation and selected-state styling remain independent of focus.

Charts use the five chart tokens. Keep legend text in the foreground color so it
remains readable independently of each series color. Labels and distinct line
patterns identify series; status text and icons supplement color in tables.
Dark chart tokens use neutral lightness steps 0.87, 0.77, 0.69, 0.61 and 0.53
so the darkest series remains visible against raised chart surfaces.

## Typography

Geist Variable supplies interface text and headings. The shared type ramp uses
small metadata, regular interface text, medium card titles and semibold page
headings. Page headings can grow to 30px on wider screens. Code and identifiers
use the default monospace utility; measurements use tabular figures. Font changes
belong to the preset and its stylesheet, except the dedicated brand wordmark.

## Layout

Selected sidebar text retains the same size and weight as unselected text.
The stock Sidebar starts with an untitled Home/Agent group above Workspace
(Experiments, Runs, Environments). The compact brand link returns to Home. Its
footer has a direct Settings link beneath the full-width divider, followed by the
local workspace menu with Settings and appearance. Its Avatar is 28px with the same subtle blue background/foreground token pair as
sidebar selection in both themes, centered
within the collapsed rail with the label and menu chevron hidden.
A stock SidebarSeparator with 16px expanded and 12px collapsed edge insets aligns with the navigation icons
between primary and workspace groups. The separator above the local-workspace
footer spans the full sidebar width. The navigation section separator stays
visible at the same vertical position in the collapsed rail, with equal side
insets. The full-width footer divider and continuous divider under the top bars
remain. Footer button
heights stay 32px for Settings and 48px for the workspace menu in both states, so
their vertical positions and padding do not change when labels disappear. Navigation glyphs are 15px; the sidebar toggle glyph is 14px in its unchanged 28px target. Selected sidebar icons fill,
with the requested exceptions: Agent keeps the stock Lucide Target outlined,
House fills only
its door, Layers2 fills only its upper layer, Settings fills only its center circle,
and FlaskConical fills only its liquid. The flask fill stays at the icon boundary;
conversation rows are text-only. Do not invent accounts or organizations.
Navigation becomes a Sheet on mobile.

The global controls and desktop brand headers share `--workspace-header-height` (52px),
with one continuous bottom divider. The global bar stays at the viewport top
inside a viewport-height shell, outside every page scroller. The document never
scrolls; page content owns vertical scrolling with contained overscroll, stable scrollbar
gutters and 16px scroll-target padding. Path navigation resets the page scroller.
The editor’s section tabs stick directly below the global header. Agent retains
its existing independent scrollers. The global bar has no title or breadcrumb;
theme toggle precedes the GitHub brand link at right. These glyphs use the stock 16px size;
the outer icon edge matches the navigation glyphs’ 16px edge inset. Settings uses
the stock gear glyph in both navigation and the local workspace menu. Desktop collapse sits on the
right of the brand row and overlays the stationary logo on hover when collapsed.
Only visible keyboard focus also reveals the control; pointer focus must not keep
it visible after hover ends. Hover is tracked on the control rather than the
shrinking header; opacity changes immediately and the logo is hidden beneath the
overlay, so neither a lingering button nor the logo bleeds through. Mobile retains an Open menu button and close/focus
restoration. The static browser title is always `JAS`, including initial load and record views;
there is no route/catalog title derivation. Contextual Ask
Agent actions live with experiment/run actions, and runs link to their experiment.
Agent viewport height uses the same token. Ordinary pages use a centered 1280px maximum
width and 16px, 24px or 32px responsive gutters. Tables scroll within their own
containers. The Agent page fills the remaining viewport, with an independently
scrolling transcript and a composer below it; both use a 768px maximum width.
The shared Home/Agent textarea starts at three rows with 15px text and 23px
line height (88px including padding), grows to 192px, then scrolls internally
while keeping its action row visible.
Agent uses a faint muted canvas (`bg-muted/50`) with a plain composer on its
background surface. The new-chat heading has a decorative primary-colored Target
at left (30px, 34px on larger screens), with an 8px gap and centered alignment.
Its stationary outline has a short outer scanning arc, followed by a gentle inner
ring contraction and a brief center highlight. Its primary blue mixes 15%
foreground for readable detail in either theme. Native browser animations finish
within two seconds; each scan then rests for a varied 2.4–4.4 seconds. Motion and
its scheduler stop offscreen/in hidden tabs; reduced motion shows the static
outline. AgentTarget owns the shared animation and cleanup. Its welcome instance
is decorative and never delays the composer; pending replies reuse the motion
until they complete or stop. At the upper right, a 32px stock outline history button
with the standard rounded corners sits beside the stock 32px New button when a
saved conversation is selected. The base new-chat view shows only History. History uses a
stock Popover and ScrollArea in every viewport, with local skeleton rows, empty
state and retry; it fetches on open and keeps cached rows during refresh. Static
new-chat content never waits for record queries. Context-option skeletons stay in
the selector; scoped suggestion placeholders match question buttons. A saved chat
uses transcript-shaped skeletons while its initial turns load, leaving History
and New available. Downloading the lazy Agent module uses only a small spinner,
not a page of fake database content. Long
labels truncate inside the popup beside a stock chat-bubble icon and relative
last-message time (`now`, `5m`, `2h`, `3d`, then a calendar date). Hovering exposes
the full local timestamp and the accessible label retains the expanded recency.
The popup uses a small muted heading, full-width separator and compact stock
small Button rows with regular-weight labels and muted 14px chat glyphs. Icons
and times align with heading content edges, with a 6px icon-to-title gap; pending
spinners precede the right-aligned time rather than displacing it. Rows and their
skeletons are 26px tall with centered content; the hover surface extends 6px past
the content on each side. The heading and divider remain outside the scrolling
list, which caps at 20rem or the available popup height. There is no conversation rail or separate mobile
history Sheet. New chats group the main heading, plain composer and suggestions
in that order, without a subtitle, slightly above center. The heading and composer
occupy the middle grid row, with remaining space split 1:2 above/below them.
Suggestions sit in the lower row so changing context cannot move or resize the
composer. Keep “What can we explore?” unchanged across selections. Empty space shrinks to zero on short screens;
content remains scrollable without translated or clipped headings. The plain Agent composer omits Home’s gray
Card surround and manual-editor footer. Saved chats retain the streaming
MessageScroller and bottom composer, with two initial textarea rows (Home/new chat keep three).
Saved-chat headers show the first question capped at 80 characters including an explicit
ellipsis; the full question stays in the hover title. The header stays centered on
desktop, truncates safely on mobile, and never renames during streaming or follow-up
turns. History keeps its compact list title. No extra title-generation request is made. The browser
title remains JAS. Loading the title uses a local skeleton only.

Assistant replies use a blue Target with no repeated Agent label or response cost.
Reply Markdown fills the shared transcript column in both streaming and completed
states; do not add a second prose-width cap or shrink-to-fit bubble inside it.
The Target and text-only activity dropdown share one aligned header row. The expanded
activity guide begins under the Target’s center, with step text aligned to its label. Activity
stages and details have no decorative icons or completion checkmarks. While pending,
the Target reuses the welcome scan/focus/rest animation; completion or failure
settles it to the regular blue Lucide Target.
One stock TraceCollapsible presents the current public stage and recorded scope,
research sources, examined evidence and mechanical checks. It starts closed and opens only on request.
Live activity opened by the user stays open across completion
or failure so it never hides content being read; saved replies start collapsed.
Recorded steps show their running/stopped state. Scope, sources, inspected evidence,
mechanical checks, review feedback, public draft notes and limitations use compact
nested Trace disclosures when those results exist. Mechanical checks reuse the shared
check evidence directly, without another Alert/card or outer vertical margins. Completed general replies label it
“Activity,” without a completion announcement. The server appends public stage names
on transitions and when writing begins, deduplicating consecutive repeats and
preserving them through completion/failure. SSE and saved queries expose the same
stages after reconnect/reload. Never expose private provider reasoning. Public design
rationale is labeled “Draft notes (before checks)” and remains separate from the answer. A failed request marks its last observed stage as stopped. Markdown renderers
remain stable between partial and validated output. Fenced code uses stock CodeBlock
with per-block copy and on-demand Shiki languages; replies have a stock copy control
below them, with its glyph aligned to the prose and a compact gap; reserve footer
height during streaming. A 4px assistant-item inset keeps the copy hover surface inside
the scroller item’s paint boundary. Leave at least 24px between the final reply footer
and composer at the scroll end. Keep transcript top padding compact. Its 12px stock fade
overlaps the composer top by 12px, avoiding a faded gap above the input. Preserve citations,
limitations and captured evidence cutoffs.

Supported proposals show a short summary written by the existing review call after
mechanical checks, using 1–3 sentences (at most 600 characters). Draft explanations
never stream into the main reply or substitute for that summary. Without a recorded
post-check summary, the card remains the concise presentation and notes stay in activity.
The general Agent’s public acknowledgement persists as an introduction when it hands
off to planning, through live events, completion, failure and reload. Keep its Markdown
node mounted while switching from the streamed acknowledgement to that introduction.
Unsupported requests keep their direct capability explanation. No extra summary request
or model-generated intermediate reasoning is needed.

The generated protocol Card uses a title/question, a compact content-width definition
list (Agents, Conditions, Planned runs), using 24px horizontal gaps, muted labels
and clear numeric values,
and a blue Review protocol action followed by “Ready for review. Nothing has run.”
Leave 16px extra space above and below the card and a 1px horizontal inset so its
stock ring remains inside the message’s paint boundary. Use 12px vertical footer
padding and an 8px gap to keep the review area compact. Its footer places the action first
on desktop and stacks a full-width action above the safety note on mobile.
Scope, sources and checks live in activity rather than competing with the card.
The pending editor view shares the same reply component. Add context keeps visually
balanced hover padding around its leading plus and trailing label.
Decisions and evidence stack below 1440px.

Home’s experiment ideas, drafts, active runs and recent experiments share a centered
58rem maximum-width content column below the composer. Keep their edges aligned.

Home uses a full-width composer section with a living 18-unit pixel grid, the
explicit decorative exception requested for this surface. A single local ecosystem
replaces the old ripple: up to 48 red/blue foragers seek eight or fewer renewable
resource islands, leave fading paths, and pause for purple encounters. Harvests
and encounters seed at most eight expanding, fading cell blooms. Depleted patches
send agents onward so activity travels across the field. A fresh seed varies each
visit; no application data, model calls, packages or external requests are involved.
Logo red (#ff5757), blue (#4d8dff), and their purple blend remain scoped to Home;
controls retain preset tokens. Filled-cell opacity stays at or below 48%.
Fade only the grid horizontally across the outer 14% on each side, with softer
intermediate stops. Keep the central 72% fully visible, square corners and the
bottom section divider unchanged; the heading and composer are outside the mask.
The SVG fits whole rows and columns without cropped cells, capped at 144 × 24
cells. Only internal grid lines are drawn; header and section separators provide
the perimeter without doubled edges. Fills meet boundaries without inset gaps.
Advance the world once every 700ms, with 650ms fill/opacity transitions. Only
changed SVG attributes update; simulation frames do not rerender React. Stop the
timer when offscreen, hidden or reduced motion is requested, holding this same
world in place. There is one renderer and no retained ripple or alternate scene.
A slight 3px backdrop blur and feathered surface tint sit directly behind the
heading’s text span; the heading stays opaque and the remaining grid stays sharp.
The tint uses 12% of the surface color. The blur mask falls continuously through
100/80/35/0% opacity, with no opaque plateau or abrupt edge.
It never captures input and has no visible
pause control.
The Home composer has a 672px maximum width and 88px minimum text-entry height.
Heading top spacing is 80px on mobile and 96px on desktop. A 3:2 grid split
places three fifths of the composer within the backdrop and two fifths below its
bottom edge; the opaque surface keeps the grid out of the text field. A stock
`shadow-lg` gives the composer's gray backing Card a compact blended shadow along its sides and
bottom, separating it from the animated grid.
Every unscoped entry point uses the same server intent routing: Agent answers a
question or creates a validated experiment proposal from the prompt, without a
manual creation mode. Home has no selector. Agent has an optional experiment/run
selector, defaulting to a borderless “Add context” control, solely for selecting
existing evidence. Keep one leading icon (plus, experiment or run), without a
redundant chevron. Selected evidence has an adjacent small ghost × Button
(14px glyph, 24px target) to clear it. A shared stock FieldSet groups the picker
and clear action within one muted hover surface, with a 2px gap and 4px trailing
padding after the clear target. The × uses muted-foreground, brightening to
foreground on hover. Neither button adds a second hover background;
clearing preserves the draft and returns keyboard focus to the selector. The
stock Popover + Command picker has a focused search field above grouped
experiments/runs. Only results scroll (up to 18rem or the available viewport);
search stays visible. There is no general/“Ask anything” option or explanatory
banner: an empty selection already means Agent handles the prompt normally.
The group divider is inset to align with group labels and row icons.
Checked rows indicate current context; selecting the checked row again clears
it and closes the popup. Keyboard search, selection and Escape retain stock
behavior. Run rows show their experiment plus condition, seed and repetition;
revision appears when greater than one. IDs stay in search/accessible identity
and hover titles. Loading skeletons, no matches and no saved context stay local.
Explicitly scoped links and resumed chats preserve the selected evidence identity.
Agent offers four compact stock outline Button shortcuts beneath the composer:
Design an experiment, Review a setup, Understand results and Learn the basics.
Use action-specific Lucide icons, a consistent 32px height and one centered row
where space permits, wrapping on smaller viewports. Selected experiments/runs
offer concise setup/evidence actions without implying unrecorded results.
Shortcuts fill and focus the draft without sending. Keep them visible and usable
after selection, while drafting and when restoring an unsent draft. Selecting a
different shortcut replaces the draft and returns focus to it. Four local
skeletons match the shortcut layout; protocol errors/retry remain visible even
while drafting. Home keeps four illustrated experiment suggestions that fill the
draft without submitting. Under the Experiment ideas heading,
they share one rounded ItemGroup border with Separator dividers: aligned illustrations,
15px semibold titles with 19px line height and 13px descriptions with 18px line height in one row of
four on wide screens. Descriptions use foreground/60, matching record timestamps.
Spell out “and” in suggestion titles rather than using ampersands.
Use concrete experiment questions covering communication/cooperation, memory/
reciprocity, oversight/sanctions and resource survival. Descriptions name the
intervention and measured comparison, without implying outcomes are guaranteed.
Place illustrations above the text in columns, with a consistent 6px gap between each
title and description and no reserved title height. Keep descriptions to one
short sentence explaining the comparison.
Use 16px padding on all sides. On narrower screens, stack rows with illustrations to the
left of their titles. Stock ghost Buttons keep the
whole section of each suggestion keyboard-accessible, with illustration, title and description.
Buttons sit directly between dividers without transparent border insets, so the
hover fill meets every edge and follows the group’s clipped outer corners. An explicit send creates one chat
and opens that saved conversation.
A late response leaves subsequent navigation intact.
The shared Home/Agent composer keeps its resting border and shadow when its
textarea is focused; do not add an outer focus border or ring. Other form inputs
retain the stock shadcn focus treatment during keyboard navigation.
Use a shared muted-gray Card backing with 8px padding, stock radius and an outer
shadow-lg. The inner input keeps its stock input border and background surface;
the shadow belongs to the backing, not the inner field. A compact CardFooter
reads “Shape an experiment with Agent, or start from scratch →”, with a slightly
bold link opening /new. Keep prose and link in one inline sentence with a normal
space after “or” and matching text baselines. Underline only the link text at a 2px offset,
and place the centered arrow 2px after it with a 2.25px stroke. Supporting text
uses foreground/65 for legibility. Navigation preserves the unsent message and never sends it.
Use 14px side insets for text and visible context icons, retaining the original 8px
top and bottom insets and 23px text line height for a compact vertical rhythm. The textarea still starts
with three lines, grows to its existing cap, then scrolls internally.
The footer has 8px side insets. The context trigger adds 6px internally to align
its icon with the text; Send retains matching 8px right and bottom insets. All
footer controls share a vertical center, without a resting context border.

The four decorative suggestion illustrations are explicitly approved exceptions
to preset icons: [3dicons](https://3dicons.co/), Dynamic (the slight-angle view)
for the chat bubble, notebook, magnifying glass and money bag. All use
regular Color, shown in a 36px box. Trim transparent margins and preserve aspect
ratios; align visible artwork with the text's left edge in columns and center it
vertically beside the text on narrow screens. Sources are [Chat Bubble](https://3dicons.co/icons/eec43d-chat-bubble),
[Notebook](https://3dicons.co/icons/628100-notebook), [Zoom](https://3dicons.co/icons/b4a0af-zoom)
and [Money Bag](https://3dicons.co/icons/36f0c6-money-bag). The free collections use CC0;
the supplied license accompanies the local files in
`frontend/public/illustrations/suggestions/LICENSE.txt`. Transparent WebP
exports with a 120px longest edge provide 3× resolution without a package or external image requests.
Empty alt text keeps them decorative; button text provides the accessible name.
These images remain fixed when applying presets; functional UI icons continue
to use the preset icon library.

Below suggestions, show up to three active runs only when underway and four
experiments ordered by creation time.
Place the primary New action beside Recent experiments, including its empty
state. Put the stock gray-outlined View all action
immediately after New in the same header. Both actions remain available while
the list is collapsed.
Drafts and Recent experiments are initially expanded stock Collapsibles.
Their 14px heading triggers are larger than the 12px Experiment ideas heading; each
has a full-width Separator below it and a chevron immediately after its text.
Heading triggers, dividers and row content share the section’s horizontal edges;
remove redundant horizontal Item/trigger padding and transparent row borders.
Only the text/chevron button toggles the section; its background stays transparent
on hover and while expanded. New remains available when collapsed; the heading divider hides with its content.
Show Drafts immediately above Recent experiments only when drafts exist or need
recovery, with up to three most recently edited drafts. Both record lists use
stock Items separated by horizontal rules, without a rule after the final item.
Draft and recent experiment rows use a subtle muted/50 hover background across
the full row, including its action, with square corners. Preserve keyboard focus
rings and link cursors. Both lists use 14px experiment and action icons; the
left icon has a 7px inset matching the right icon within its unchanged 28px
button target. Center the left icon with the single-line title, overriding
ItemMedia’s multiline-description top alignment. Both lists use symmetric
12px row padding; no extra gap follows the heading divider before the first row.
Keep only 6px between the header row and its divider. List titles use regular
weight beneath the medium-weight section headings.
Home sections use 32px gaps and a slightly smaller bottom inset.
The shared DraftList uses compact clickable Item xs rows with titles and
last-edited times on the title row, immediately before the delete action with
a shared 10px gap in both record lists. Draft edit ages and recent experiment creation ages read
Just now, minutes/hours ago or days ago; older entries show a short date (with
year when needed). Update ages every minute while mounted and retain the exact
timestamp in the native time tooltip, labeled Edited or Created respectively.
Recent experiment rows show the icon, title and creation age, without status or
run counts. A separate stock three-dot DropdownMenu shows the exact Created
timestamp as non-actionable metadata. Keep the row link and menu trigger separate;
use the same foreground/60 color for timestamps, trash and three-dot buttons,
slightly darker than the default muted gray in both themes.
Action buttons use the stock ghost hover/expanded background over the row's
weaker muted/50 hover, giving each action a distinct stronger surface. Inset
their button bounds 4px from the right row edge so that hover does not meet the
end of the divider; keep their visible icon size and hit area unchanged.
The API exposes no experiment edit time.
Delete stays visible for mouse, keyboard
and touch users. Use Untitled experiment when
unnamed. Home confirms deletion in a stock AlertDialog;
failed storage writes retain the draft and show a recoverable dialog error.
Home hides the section after its final draft is deleted. Offer View all drafts
when more exist, expanding the remaining drafts inline on Home, with Show fewer drafts
to return to the compact list. Keep drafts off the Experiments page. Link unreadable
drafts directly to their editor recovery screen.
Keep creation actions out of the composer/Experiment ideas area. The empty message uses regular muted
EmptyDescription text rather than a title. Full record lists remain on their
dedicated destinations.

Experiments and Runs share one list heading: a muted rounded-square icon beside
the title (filled Play or flask liquid, matching navigation), using a borderless 36px
background (`muted-foreground/15`) and an 18px glyph, with search at the right
(stacked below on mobile). Search fields have no placeholder text and retain their
accessible labels. Only Experiments includes a primary New action; start runs from
an experiment detail page. Keep the header inset, but let both tables reach the full content width
without side gutters or an enclosing border. Inset the outer header/data cells and
filter controls to match the page heading, including skeleton rows. Reserve a 32px
name gutter for selection on both lists (also on narrow screens); keep dividers full-width.
Left-align headers and data, retain tabular numerals, and label both primary columns Name. Keep rows on one line:
Environment and Revision have their own Experiments columns; Seed, Revision and
Repetition have their own Runs columns. Do not stack metadata under record names.
Use full catalogue environment names. Page titles use semibold weight at 22px on desktop and 20px on mobile; record
names use regular weight. Table column headings use the small text scale. Keep star
glyphs aligned with their column heading while retaining the full icon-button target.
Stars use a light 1.5px stroke and the normal data color, including when filled.
A compact star column with a visible Favorite heading follows
each name. A stock TabsList above the filter row switches All/Favorites, with a subtle
input-color border, 28px overall height matching the filters, and 10px horizontal
padding inside each item. Selected items use the page background and foreground
through local semantic accent aliases, keeping this toggle neutral in both themes. Search,
status and scope apply within that view; Clear filters keeps the chosen view.
Experiments filters by Environment; Runs filters by Experiment, with searchable full labels
from the catalogue or loaded run identities. Each stock ButtonGroup joins a medium-weight
filter name to its regular-weight selected value/chevron with one dividing border (Environment | All,
Experiment | All, Status | All). Use 13px filter text and a compact 28px control height, with 12px outside padding
above and below the filter row. Use identical control sizing/spacing and reset popup search
on reopening. Disable only filters whose remote options are still loading.
Use a full-width Separator between the view control and status filters, and another
between filters and the table. Keep both control rows compact. Store
favorites as browser preferences under separate study/run keys, synchronize changes
from other tabs, and preserve the previous state with a retryable alert if storage
fails. Empty favorite views offer View all. Favorites follow record identity across
revisions and are independent of run-comparison selection.
Only initial record fetches use full-row skeletons. Render list page structure eagerly
so route-module loading does not substitute a whole-page/title skeleton. Column labels,
view/status controls, search and New render immediately. Disable a scope filter only
until its own options arrive: Environment depends on the catalogue; Experiment depends
on runs. Loaded experiments remain usable while catalogue names load, with placeholders
only in Environment cells. Empty lists do not wait for the catalogue. Stop placeholders
on errors and show the retryable error; unresolved environment names say Unavailable.
Match placeholder shapes to the icon/name, metadata, favorite and action cells and keep
the same 45px row height. Hide decorative placeholders from assistive technology, mark
the data body busy, and provide one loading announcement. Cached rows, selections and
pagination remain mounted during refreshes and refresh failures; show the error alongside
them rather than reverting to skeletons. Stock Table row separators provide
one line per boundary, including below the final row; do not add a second divider around the table or pagination.
The two pages share the filter-state contract and row-loading skeletons while retaining their
own columns. Omit record totals below the tables and render pagination only when
there is more than one page. Compose stock Pagination, ButtonGroup and two outline
icon-sm Buttons at the bottom right. A muted regular-weight “Page X of Y” indicator
sits beside the connected previous/next arrows, with tabular numbers and polite
page-change announcements. Use the same compact layout on desktop and mobile,
accessible button names, and real disabled buttons at either end. Omit numbered
page buttons, ellipses, first/last controls and page-size selectors.
Reset to the first page when search, scope, status or All/Favorites changes. Created dates
use the normal data color in both tables; Runs includes its recorded creation time.
Runs link to their exact experiment revision and keep comparison
selections across filtering. Keep comparison and experiment-selection checkboxes in the name
gutter, without a separate selection column or layout shift. Unchecked boxes reveal on row
hover or keyboard focus; selected boxes and touch-device boxes stay visible. Use a readable
muted-foreground/50 outline without changing the primary selected state. Bound the hit area to
the gutter so it cannot intercept name links. A matching checkbox beside Name selects
the current filtered page, preserving selections on other pages and outside the filter.
The header checkbox follows the same hover/focus/touch behavior and stays visible for
full or partial page selections; disable it while loading or when no rows match.
Both lists show a compact 28px stock ButtonGroup only while rows are selected:
a muted count joined to an outline clear icon button with a Clear selection tooltip
and accessible name. Clearing returns focus to the header checkbox. Keep Compare
beside it on Runs. Selection is
independent of comparison: Compare accepts two through four runs and is disabled
with an explicit limit above four selections. A final Actions column uses bordered stock ellipsis buttons and
DropdownMenu. Experiments offers Open, Edit as new revision, Duplicate, Export evidence,
and confirmed Delete. Copy drafts use a separate source identity and save a new experiment;
editing preserves immutable revisions. Runs offers Inspect, Open exact parent revision, and
Export experiment evidence, with no per-trial edit/delete that would break the matched matrix.
Use AlertDialog for experiment deletion, retain errors for retry, disable repeated submission
and cancellation during the transaction, and return focus on cancellation. Do not delete local
drafts; after source deletion, open their saved content with an explicit recovery notice
and save as a new experiment. Loading affects database rows only, leaving search,
the heading and New available. Empty states have only their title and relevant action,
without descriptive subtitles: Clear filters for no matches, View all for empty Favorites,
and a single New creation action in the page heading for an empty database. Embedded experiment runs use the same controlled table/search contract.

Home renders its heading, animation, composer, Experiment ideas and creation/navigation
buttons immediately. Drafts are read synchronously from local browser storage;
omit their section when none exist, without a loading placeholder. Only the initial
Recent experiments request uses row-sized stock Skeletons, with one accessible
loading status. Keep New and View all visible even while loading or empty. Cached
rows remain visible during polling; an empty message appears only after a successful
empty response. In progress appears only when active runs are known to exist. Keep
the composer editable while provider availability loads, but disable Send until
that check succeeds.

## Elevation & Depth

Use shared theme tokens for surfaces, including the requested white/graphite
colors. Keep the preset's borders, rings, shadows and motion. Cards and overlays
retain their generated treatments except CardFooter uses the card surface token;
app layout utilities introduce no custom effects or elevation tokens.

## Shapes

The current preset starts from a 10px radius and derives the radius scale shown
above. Buttons, inputs, cards and badges retain their stock shapes and size APIs.
A future preset may change them; do not preserve current dimensions through
visual overrides.

## Components

Compose installed components and documented variants. Buttons and inputs use the
preset's compact defaults and focus/disabled/invalid states. Field supplies labels
and validation context; Badge supplies statuses; Table supplies record lists.
Skeleton, Spinner, Empty and Alert supply loading, empty and error states.

The experiment editor uses freely navigable section tabs and a focused form
column, with its execution summary in Review. Settings uses three
Cards. Agent uses MessageScroller, Message, Bubble and Trace. Trace content shows
public server stages, scope and sources, never private model reasoning. Completed
protocol proposals appear in a Card for review before saving or running. Preserve
draft identity, pending output, evidence scope and recoverable errors when
changing presentation. Saving a protocol never executes it.

### Experiment editor

Use the compact page-heading geometry shared by record lists: a 36px muted,
rounded-square flask surface and the same title scale. The editor is at most
1024px wide, with a centered 768px form column. Question, Agents, Conditions,
Run plan and Review are revisitable sections, rather than a progress indicator
claiming earlier steps are valid. Specification exposes the full JSON contract
for advanced editing. Stock line Tabs scroll horizontally on narrow screens;
their selected underline and full-width Separator share one baseline. Preserve
these layout adjustments when regenerating Tabs from a preset.

Question covers the name, research question and environment, with hypothesis and
scenario context disclosed separately. Agents and conditions use compact stock
Accordions; adding an item opens it and focuses its name. Communication appears
before its dependent channel controls. Show private signals only for environments
that implement them. Optional condition notes, profile overrides, model settings
and limitations stay behind disclosures. Run plan keeps seeds, repetitions,
rounds, spending ceiling and measurements visible. Task and resource fields
stack on phones instead of squeezing several unlabeled columns together.

Each form section offers Back/Continue. Review consolidates the question,
participants, condition models and run plan with section-specific Edit actions,
mechanical checking and one primary Create/Save action. Specification retains
Check/Create for direct contract editing. Saving a reusable environment is a
single-line item in Experiment options, rather than a competing primary action.
Agent proposals open on Review. Saving never launches paid model work.

Reusable environments save only mechanics/configuration examples. Choosing a library or
built-in environment starts an independent neutral experiment; explicit experiment templates
remain separate. The existing Conditions layout adds a stock disclosure for selecting an
example and binding mechanic roles to current agents. Review identifies the pinned source
revision/rules; Specification retains its complete definition/hash. Preserve a recovered
draft's embedded revision, including after library deletion, and reject stale updates visibly.

Conditions separate the participant harness from its model and world parameters.
Direct action is the default. Tool using reveals request/operation limits, permitted
reads, four capability policy selectors (including explicit Disabled choices),
context characters and memory-result limits using existing Field/Select/Checkbox
patterns. Use remains optional. Review lists the pinned
harness version, effort, tools and capability policies; private goals, roles and profile overrides are
declared study factors. The run Record tab lists participant activation attempts,
including failures before a turn commits. Disclosures expose actual operations,
results, source/cutoff receipts, selected capabilities, stop reasons and complete
identity. Mark plans/notes as participant self-reports and source checks as text
checks, with no privileged outcome prediction. The existing model-request inspector
retains every inference, including unknown usage. Keep the default journal and
current appearance, semantic tokens, mobile layout and keyboard disclosures.

Keep section content mounted when inactive so input DOM and disclosures retain
their state. Validated JSON resets the affected uncontrolled fields to the new
specification. Initialize the form only after loading and validating the current
local draft; a cached empty query must not erase edits on fast back navigation.
Validation failures retain the original JSON and recovery actions. Pending
mutations lock their submitted snapshot. Static heading, actions and navigation
retain their geometry during loading, with unavailable controls disabled; only
configuration fetched from the catalogue, saved
protocol or draft validation receives Skeleton placeholders.

Research: [Carbon forms](https://carbondesignsystem.com/patterns/forms-pattern/),
[Carbon tabs](https://carbondesignsystem.com/components/tabs/usage/),
[Carbon progress indicators](https://carbondesignsystem.com/components/progress-indicator/usage/),
[GOV.UK check answers](https://design-system.service.gov.uk/patterns/check-answers/),
[GitHub repository creation](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository)
and [React state structure](https://react.dev/learn/choosing-the-state-structure).

### Stock components and customizations

This is a shadcn-based interface, not a byte-for-byte unmodified registry copy.
`src/components/ui` owns the shared shadcn primitives, including the small
accessibility and correctness patches listed below. Checkbox outlines use 90% of
the preset input color for a subtly softer edge; record selection uses the
shared stronger outline documented above. Workflow components compose
those primitives; they do not maintain a second set of controls. Button text is
selectable app-wide, including plain labels and button-styled links. Explicit
text spans and disabled native dragging make selection reliable; a shared capture
handler blocks activation only for a pointer selection drag. Keep content prose selectable and preserve
normal click/keyboard interaction. Layout and requested compact spacing live in
those compositions, semantic theme tokens live
in `src/index.css`, and app glyphs pass through `src/components/icons.tsx`.

The deliberate visual exceptions are the JAS logo/wordmark, Home ecosystem and
heading fade, the shared Target scan/focus/rest animation, CC0 3dicons suggestion images, partial selected navigation glyphs,
white/graphite surfaces, blue selection, and composer sizing, backing and focus
appearance. They are not all controlled by a preset. A preset changes the shared
foundation; review these documented exceptions and the icon boundary rather than
assuming the CLI can reconcile every app-specific choice automatically.

### Applying a preset

From the repository root:

```sh
cd frontend
pnpm dlx shadcn@latest apply --preset <code>
```

1. Review generated components, dependencies, `components.json` and `index.css`.
   Use the preset's fonts, colors, icons and component styles throughout the app.
2. Align the stock reexports in `src/components/icons.tsx` with the resulting
   `components.json` `iconLibrary`, updating dependencies as needed. The CLI updates
   generated UI imports; it does **not** migrate these semantic app reexports
   automatically. The official `shadcn migrate icons` handles concrete icon imports,
   not this reexport mapping. Keep stock glyphs and the explicitly requested partial house/layers/settings/flask fills
   together at this boundary; update these small compositions with a new library.
   The GitHub brand mark is a CC0 Simple Icons asset, distinct from preset UI glyphs.
   Avoid a runtime icon resolver.
3. Preserve nonvisual fixes if regeneration overwrites them: Progress bounds and
   custom maximum, selectable Button labels/link text and their drag guard, softer Checkbox outline, Slider
   thumb labels, Tabs orientation, Breadcrumb current-item semantics, Chart style children and stable keys, valid Field/Item/InputGroup
   roles, CodeBlock keyboard scrolling and source-position key annotations,
   SidebarSeparator horizontal width respecting its edge insets,
   InputGroup disabled styling scoped to its input control (a disabled
   submit button must not dim an editable composer), and narrow lint annotations. Keep chart legend text readable and retain
   distinct line patterns.
   Retain 4px tab gaps and 3px sidebar-item gaps, the continuous header
   divider, white/graphite surface tokens, CardFooter card surface, subtle blue
   selection with weaker hover, filled selected sidebar icons, blue primary
   actions, and dedicated wordmark font
   unless superseded. The wordmark retains the foreground color.
4. Keep app behavior outside regeneratable helpers: domain formatters live in
   `src/lib/format.ts`; `src/lib/utils.ts` only exports `cn`. Workspace persistence
   lives in `workspace-provider.tsx`; app breakpoints use `hooks/use-compact.ts`,
   separate from the generated `hooks/use-mobile.ts`.
5. Run frontend lint, unit tests, build and keyless browser tests with a distinct
   `JAS_TEST_PORT`; see [Development](DEVELOPMENT.md). Check both themes, keyboard
   focus, narrow layouts, conversation history and draft/proposal flows. Refresh
   this snapshot from the resulting code.

## Do's and Don'ts

- **Do** use stock shadcn components, supported variants and semantic theme tokens.
- **Do** use layout utilities to compose screens and preserve usable mobile states.
- **Do** verify readable text, visible focus and non-color status/series cues in both themes.
- **Do** keep loading, error, empty and retry states explicit without discarding drafts.
- **Don't** add custom stylesheets, visual variants or copied component implementations.
  Keep the explicit Home decoration, partial icon fills, surface, selection, spacing and wordmark exceptions above
  when applying a preset.
- **Don't** treat snapshot values as constraints on the next preset.
- **Don't** display fabricated activity, private reasoning or unsupported empirical outcomes.

Mobile navigation places the brand and close control in the same header row,
using the shared header height; shrinking the browser must not stack them.
Keyboard order follows the row from brand to close. Main navigation menus use
3px gaps between items; section-title and footer spacing retain their prior values.

## Environments catalogue

Environments uses one quiet list for choosing world rules. Use the shared
RecordListHeading with the Layers2 page icon on the same muted rounded-square
surface as Experiments and Runs: 36px surface, 18px glyph, 12px icon/title gap,
20px mobile / 22px desktop title. Environment grid artwork in the list stays bare.
Preserve a blank accessible search field and the neutral bordered Built-in / Custom
tabs. Omit New here: its experiment-editor destination is misleading for a catalogue.
Experiments keeps its New action; environment-specific configuration remains available
in each detail panel, including the composed-resource builder.
A separator beneath the tabs continues directly into the list; do not add cards,
repeat Details footers or leave an extra gap before the first row.

Built-ins compose stock Item/ItemGroup and Separators. Each row is a native React
Router link to `?environment=<key>`, with a decorative 40px mark, medium 14px name,
regular muted description and a small trailing chevron. Use 12px horizontal row
insets, 16px vertical padding and 12px between mark and text. Center marks against
the whole name/description block, including wrapped phone copy. Keep text fully
visible and selectable; rows have square corners and a subtle stock hover surface.
Keep the resource-composition builder last so existing mechanics lead the scan.
Custom uses matching row spacing and mark alignment, with linked reusable setup
names, environment/revision metadata and its existing bordered actions menu.

`EnvironmentMark` is authored brand SVG with no backing square, Avatar, border,
shadow or rounded clipping. Its fixed 9×9 patterns represent pooling, reciprocal
transfers, dependencies, authority, bargaining, signals, replenishment and resource
composition. Preserve four SVG units of clear space on every side of the ink.
Only three paths use semantic muted foreground and primary fills. No runtime
randomness, animation, generated assets or requests. Colors follow presets;
functional preset icons remain separate at the shared icon boundary.

Details retain the URL-addressable stock Sheet: full width on phones, at most
32rem on desktop. Place the bare mark beside the title in a compact header, then
the description. Keep title and footer actions fixed while the body scrolls.
Preserve original observations, enforced mechanics, control/measurement accordions
and rule version. Show the composition explanation only for that environment.
Configure experiment opens a neutral experiment from its mechanics; Design with Agent passes the existing
environment-specific request and uses the shared Target icon.

Native links support opening details in another tab as well as normal navigation.
Back closes the Sheet; Escape/Close removes only the environment parameter and
restores focus to the initiating row or the heading for a direct link. Invalid
links have a Browse environments recovery action. Custom query/deletion ownership
remains local; edit/reuse and confirmed deletion preserve saved experiment rules
and evidence. Keep data-local skeletons, usable static controls, independent
queries, cached collections during refresh errors, retries, explicit empty states
and clear-search recovery. Remove obsolete Card compositions completely.

Research informing this structure: [Carbon contained lists](https://carbondesignsystem.com/components/contained-list/usage/)
for related content, optional linked rows and aligned separators;
[Atlassian spacing](https://atlassian.design/foundations/spacing/) for a consistent
scale and the relationship between internal text spacing and inter-item spacing.
These guide composition; stock shadcn primitives and JAS tokens remain authoritative.

The Environments heading marks the shared Layers2 glyph with `data-partial-fill="layers"`,
reusing the sidebar selection rule to fill only its top layer. Keep the lower
layer as an outline.

Candidates extends the same Environments tabs without restyling installed rules.
Show current containment status, an explicit keyless check, a locally retained
specification and immutable review history. Disable executable validation until
local qualification passes. A passed candidate still says Needs world review;
experiment execution stays disabled. Keep public checks and pinned artifact
provenance inspectable, errors recoverable, drafts intact, and late responses
from changing the selected review or navigation. Compose existing stock fields,
buttons and separators; retain mobile/theme/keyboard behavior.

### Treatment exposure

Run Record and experiment Overview compose a compact disclosure for assigned
configuration, eligible recipients, available observations and confirmed input.
Use the existing Table, Disclosure, Alert/Empty/Skeleton and semantic tokens;
keep counts labeled included/eligible with unknown capture distinct from zero.
Source links open immutable revision, turn and model-request evidence. Detailed
observations, candidate input bindings and cutoff membership stay behind keyboard
operable disclosures. Retain cached evidence and a local retry on refresh errors;
polling cannot replace another selected record. Phone tables scroll internally.
Inclusion is not attention/belief/intent, and exposure-conditioned filtering is
post-treatment selection rather than an automatic causal estimate.

### Three-participant coordination

Keep coordination on the existing Conditions, Review and run Environment surfaces.
Timing, logical delay, activation/conflict priority and directed routes use stock
fields; structural alternatives/bindings remain editable in Specification. Disclose
directory and ordering assumptions beside the controls and in run inspection.
Researcher-scoped choices/values and addressed mail use compact tables, with null
or unchosen outcomes named explicitly. Keep settlements, conflicts and artifact
versions source-linked behind disclosures. Preserve internal table scrolling,
keyboard controls and phone/light/dark behavior. Agreement is optional; the UI
must not turn the agreement measure into a success label.
