# Design system

`frontend/src/index.css` owns the theme tokens. Shared controls live in
`frontend/src/components/ui`; scoped layouts live in `frontend/src/styles`.

## Visual language

Use white and neutral work surfaces, graphite text and restrained blue for actions,
links, selection and focus. Borders and tonal steps separate records; reserve shadows
for overlays, the composer and the fixed mobile save action. Avoid nested card frames.
Status color always accompanies text/icons. Charts retain labels and distinct line
patterns, mirrored in legends; hue never implies moral rank.

Inter Variable supplies interface text; code and identifiers use monospace, measurements
tabular figures. Prose is at most 75ch. The sidebar wordmark alone uses locally hosted
Bricolage Grotesque at 22px/800 with -0.04em tracking. Its subset font and SIL license live
in `frontend/public/fonts`. [Bricolage source](https://github.com/ateliertriay/bricolage).

`frontend/public/logo.svg` is the master asset. Preserve its supplied geometry and
red/blue details. The favicon uses the same paths with an 8-unit inset. Pair the 24px
sidebar mark with lowercase `jas` and an 8px gap; collapsed navigation shows only the
mark, revealing the expand control on hover/focus without losing keyboard focus.

## Layout and controls

The shell has a 240px sidebar, 52px collapsed rail and at least 56px breadcrumb bar.
Pages use 32px gutters, 48px bottom padding and a 1600px maximum width. Records share a
heading/action row, one filter toolbar and a contained table region. Page tabs use the
line variant; related local choices use the segmented variant.

Use installed shadcn controls, visible Field/FieldGroup labels and Lucide line icons.
Buttons are 36px standard, 32px small/icon and 40px large. Input groups own their rounded
focus ring; avoid a second rectangular textarea outline. Follow the token corner scale.

Below 768px navigation becomes a titled modal Sheet. Editor/evidence columns stack at
900px viewport width or 720px available workspace width; evidence focus/return follows
the rendered layout. At 600px, gutters reduce to 16px, fields use 16px text and the save
action stays reachable in a fixed bottom bar. Tables scroll within their container.
Coarse-pointer targets are at least 44px. Check 390px, 834px, 1280px and 1440px in both themes.

## Workflow contracts

| Surface | Contract |
| --- | --- |
| Navigation | Experiments, Runs; divider; Agent, Environments; Settings/theme in footer. Creation stays in page actions. |
| Records | Stable identity, status, measurements and contained scroll; run selection survives filters and supports 2–4 comparisons. |
| Editor | Question → Agents → Conditions → Execution, with JSON available and a persistent summary/save. Draft identity follows its source; server validation gates revisions. |
| Experiment | Question and revision stay visible; Overview, Runs and Protocol preserve historical identity. Saving never executes. |
| Run | Decisions first, then Environment, Interactions and Record. Shared turn rail, complete journal and adjacent/stacked evidence inspector. |
| Agent | Full-page conversation, inner history rail and context selector; one Send action; reviewed proposals open in the editor. |

Agent keeps an 800px conversation/composer measure and a 216px inner history rail;
at 1000px the rail becomes a chat picker. The composer stays below the independently
scrolling transcript. Before the first message, the heading and four suggestions occupy
the middle; they never displace the composer. Suggestions fill a draft without spending
or inventing results. Use 24px internal gutters and 12px composer gutters on mobile.

Experiment/run headers link Ask Agent to the selected record. The editor's Generate with
Agent carries the question and preserves the draft; reviewed proposals link Back to Agent.
Context belongs to each submitted message. Retry keeps that message's original context,
and changing context never relabels prior evidence. General answers exclude unselected run
records. All assistant entry points use `/agent`.

Streaming prose is pending content until schema, citation and protocol checks complete.
Activity reflects server stages; never fabricate progress or expose private model reasoning.
Disconnecting restores persisted work through polling/reload without resubmitting it.

Keep the journal intact when inspecting an earlier turn. Evidence must match the selected
turn while loading. Notes remain attached to their turn through live polling/navigation;
a save must not clear newer edits. Distinguish observation, enforced consequence and model
self-report. Never invent accounts, permissions or empirical outcomes.

## Accessibility and states

Body/metadata/placeholders meet 4.5:1 contrast; large text meets 3:1. Focus is visible,
disabled controls retain their shape, and text/icons supplement color. Preserve keyboard
navigation, Sheet focus trap/Escape/return and reduced-motion activity.

Every query needs loading, empty, error and local retry states. Preserve successful sibling
queries and unsaved drafts after failure. Browser-storage and provider availability failures
remain explicit and recoverable. Protocol validation locks the submitted snapshot until
its response. Confirm consequential changes with the installed dialog pattern.
