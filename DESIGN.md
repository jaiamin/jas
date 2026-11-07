---
name: "JAS developer workspace"
description: "Experiments, runs and recorded evidence in one calm workspace."
colors:
  background: "#fcfcfc"
  foreground: "#242424"
  primary: "#242424"
  primary-foreground: "#fafafa"
  muted: "#f2f2f1"
  muted-foreground: "#686865"
  border: "#e4e4e2"
  input: "#d6d6d3"
  ring: "#737373"
  accent: "#ededeb"
  accent-foreground: "#171717"
  popover: "#ffffff"
  destructive: "#a93b3b"
  danger-background: "#fff1ef"
  success: "#525252"
  warning: "#815c13"
  warning-background: "#fff6e6"
  sidebar: "#fcfcfc"
  sidebar-border: "#e4e4e2"
  chart-1: "#c2410c"
  chart-2: "#4c67b1"
  chart-3: "#836626"
  chart-4: "#a64e78"
  chart-5: "#3c7195"
  chart-6: "#7a5b9c"
  series-0-background: "#fff1e8"
  series-1-background: "#eceff9"
  series-2-background: "#f7f0df"
  series-3-background: "#faeaf1"
  series-4-background: "#e7f1f7"
  series-5-background: "#f1ebf9"
  brand: "#a94720"
  selection-background: "#fff0e8"
  panel: "#ffffff"
  control-background: "#f7f7f6"
  text-secondary: "#494947"
  text-tertiary: "#73736f"
  dark-background: "#121213"
  dark-foreground: "#ededed"
  dark-primary: "#ededed"
  dark-primary-foreground: "#202020"
  dark-muted: "#1c1c1e"
  dark-muted-foreground: "#a5a5a2"
  dark-border: "#2c2c2e"
  dark-input: "#424245"
  dark-ring: "#a3a3a3"
  dark-accent: "#272729"
  dark-accent-foreground: "#fafafa"
  dark-popover: "#171717"
  dark-destructive: "#efa5a0"
  dark-danger-background: "#3c2525"
  dark-success: "#d4d4d4"
  dark-warning: "#e4bf81"
  dark-warning-background: "#3b3020"
  dark-sidebar: "#121213"
  dark-sidebar-border: "#2c2c2e"
  dark-chart-1: "#fb923c"
  dark-chart-2: "#abbbef"
  dark-chart-3: "#d9bc79"
  dark-chart-4: "#e2aac4"
  dark-chart-5: "#92c5de"
  dark-chart-6: "#c1afe8"
  dark-series-0-background: "#38271b"
  dark-series-1-background: "#2b3043"
  dark-series-2-background: "#3b3320"
  dark-series-3-background: "#402a35"
  dark-series-4-background: "#24333e"
  dark-series-5-background: "#332c42"
  dark-brand: "#eda27f"
  dark-selection-background: "#30221c"
  dark-panel: "#171719"
  dark-control-background: "#171719"
  dark-text-secondary: "#c1c1be"
  dark-text-tertiary: "#999995"
typography:
  body:
    fontFamily: '"Geist Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  headline:
    fontFamily: '"Geist Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-0.4px"
  title:
    fontFamily: '"Geist Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "-0.15px"
  label:
    fontFamily: '"Geist Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "13px"
    fontWeight: 500
  metadata:
    fontFamily: '"Geist Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "12px"
    fontWeight: 400
  prose:
    fontFamily: '"Geist Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "14px"
    lineHeight: 1.7
  code:
    fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace'
    fontSize: "13px"
rounded:
  sm: "3px"
  md: "5px"
  lg: "8px"
spacing:
  control: "8px"
  field: "16px"
  section: "24px"
  page: "28px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    height: "32px"
    padding: "0 12px"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    height: "32px"
    padding: "0 12px"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    height: "32px"
    padding: "0 12px"
  button-secondary:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    height: "32px"
    padding: "0 12px"
  button-ghost:
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    height: "32px"
    padding: "0 12px"
  button-link:
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    height: "32px"
    padding: "0 12px"
  input:
    backgroundColor: "{colors.control-background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    height: "32px"
    padding: "4px 12px"
  navigation-selected:
    backgroundColor: "{colors.selection-background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    height: "32px"
    padding: "8px"
  badge-secondary:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  summary-panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "20px"
  page-tabs:
    height: "40px"
    textColor: "{colors.muted-foreground}"
  page-tab-active:
    textColor: "{colors.foreground}"
---
# Design System: JAS developer workspace

The canonical visual and interaction specification. Source tokens live in
`frontend/src/index.css`; shared controls live in `frontend/src/components/ui`.
Do not create a second token guide. Route scope and verification: [INTERFACE](docs/INTERFACE.md).

## Overview

**Creative North Star: "Follow the evidence"**

For a developer investigating model behavior, the job is to follow an experiment to a
run, a recorded decision and a defensible comparison. The workspace should feel quiet,
precise and immediately usable. Laminar's actual trace and table screens are the primary
reference: compact navigation, aligned records, low-contrast chrome and adjacent evidence.
Its marketing layout is not a reference. Preserve JAS's experimental units and provenance.

Domain: experiments, protocols, conditions, seeds, turns, checkpoints, observations,
consequences and replay. The color world is paper-white records, graphite text, charcoal
work surfaces, soft gray separators, amber selection and muted ink colors for data series.
The signature is linked evidence: immutable revision → run identity → selected turn →
observation/decision/consequence, with comparison retaining the same identities.

Reject oversized dashboard metrics in favor of actual experiment records; a chat-first
landing screen in favor of saved work; nested cards in favor of tables and aligned panels.
Keep Geist for small, dense interface text. Expression comes from organization and precision.

**Key Characteristics:**
- Compact records with aligned identity, status and measurements.
- Neutral surfaces with warm navigation selection and distinct data-series colors.
- Linked evidence that preserves revision, run and turn identity.

## Colors

The frontmatter records the actual light tokens and their `dark-` counterparts. Canvas and
sidebar share one neutral ground. Panel, muted and control surfaces differ by small tonal
steps. Text has primary, supporting, secondary and metadata levels.

### Primary

Graphite `primary` and its contrasting foreground define the main action. Warm `brand`
marks active execution and the selected navigation icon; `selection-background` marks
the current navigation destination. Table selection uses `muted`, not the brand wash.

### Secondary

The six chart inks and their corresponding series backgrounds identify agents and
conditions. Destructive and warning pairs communicate failures and pauses alongside text;
success remains neutral. These are data and status roles, not extra action accents.

### Neutral

Canvas and sidebar share `background`; `panel` is a separate work surface. `muted` groups
records, `control-background` gently insets fields, and `popover` supports floating choices.
`border` separates records; `input` outlines controls. Foreground, secondary, muted and
tertiary text express hierarchy. The `ring` token identifies keyboard focus.

**The Identity Before Color Rule.** Keep agent, condition and status labels visible;
color supports identity and never implies moral rank.

Body, metadata and placeholder text must meet 4.5:1; large text 3:1. Disabled controls retain
their shape and use 50% opacity. Visible focus adds an outline or ring, never color alone.

## Typography

Locally hosted Geist Variable supplies the headline, body, title, label and metadata roles
in the frontmatter. The full source fallback stack is preserved there. Code and JSON use
the code role; run identifiers use platform monospace. Numeric measurements use tabular
figures. Prose has a maximum measure of 75ch.

Headlines identify pages, titles identify sections, labels name controls, and metadata
qualifies a record. Supporting captions and count badges sometimes use 11px. Below 600px,
page headlines reduce to 19px; the AI design introduction retains the headline size.

**The Quiet Hierarchy Rule.** Use alignment, weight and spacing to distinguish dense
records; reserve the headline role for the page title.

## Layout

The shell uses a 224px sidebar, 48px collapsed rail and a breadcrumb bar at least 52px
high. Pages have 28px gutters, 48px bottom padding and a maximum width of 1800px.
The spacing tokens capture repeated control, field, section and page intervals; local
optical gaps also use 6px, 10px and other intermediate steps rather than a strict grid.

Records use a heading/action row, one search/status toolbar and a contained table region.
The editor puts the current configuration beside a 272px summary with a 32px gap; the
summary narrows to 216px at 1100px. Decision pages place the journal beside its inspector.

### Responsive layout

Below 768px, navigation becomes a titled modal Sheet. At 900px and below,
protocol/editor/evidence columns stack. At available workspace widths of 720px and below,
the same grids also stack through a container query; this includes desktop with the
assistant open. Evidence navigation follows the actual stacked layout.

At 600px and below, page gutters reduce to 16px, headings and toolbars wrap, inputs use
16px text, and the editor save action stays reachable in a fixed bottom bar. Tables scroll
inside their region. Coarse pointers enlarge shared buttons, select triggers, navigation,
tabs and inputs to at least 44px; icon buttons also gain a 44px minimum width.

The assistant is modal below 1100px and nonmodal from 1100px. Its desktop width is 520px,
reserved from the workspace while open; on small screens it fits the viewport. Validate
the principal routes at 390, 768, 1280 and 1440px, with the assistant both open and closed.

## Elevation & Depth

Work surfaces are flat, separated by borders and small tonal differences. Inputs use the
control surface without a shadow. Select menus use the installed medium shadow; Sheets
and dialogs use the large shadow. The mobile editor save bar has a faint upward shadow
to separate its fixed action from scrolling content. Exact shadows live in the sidecar.

**The Flat Work Surface Rule.** Use borders and tone for records and panels; reserve
shadows for overlays and the fixed mobile save action.

## Shapes

The rounded scale in the frontmatter gives badges small corners, controls and summary
panels medium corners, and dialogs large corners. Sheets attach to the viewport edge.
Page tabs have square edges and an underline; status dots are circular. Borders are thin
and quiet. Do not introduce nested decorative card frames around aligned records.

## Components

| Pattern | Contract |
| --- | --- |
| Navigation | Experiments and Runs first; Design with AI and Environments second; Settings/theme in footer |
| Buttons | 32px standard, 28px small, 40px large; 13px/500; coarse-pointer controls at least 44px |
| Fields | Shared Field/FieldGroup with visible label, inset control, related helper/error; no bespoke inputs |
| Page tabs | Full-width bottom rule, 40px height, 20px gap, neutral active underline; arrow-key navigation |
| Local tabs | Segmented neutral control for related display options |
| Records | One search/status toolbar, stable column headers, readable two-line identity, contained horizontal scroll |
| Selection | Checkbox selection survives filtering, 2–4 run comparison, explicit clear action |
| Editor | Question → Agents → Conditions → Execution; JSON remains available; persistent execution summary/save |
| Experiment | Question stays visible, revision explicit, Overview / Runs / Protocol; historical revisions remain inspectable |
| Run | Decisions first; environment, interactions and record remain tabs; shared turn rail and adjacent inspector |
| AI | Dedicated design view plus contextual evidence Sheet; anchored composer; activity reflects server events |

### Controls and containers

Buttons are compact and medium-weight. Primary is graphite; outline and secondary support
less prominent actions; ghost removes the resting fill; link uses an underline on hover;
destructive uses the failure token. Primary/destructive hover reduces fill opacity to 90%,
secondary to 80%; outline/ghost hover uses the accent surface. Icon-bearing buttons reduce
horizontal padding. Focus is a 3px half-opacity ring, with disabled controls at 50% opacity.

Fields use a visible label, control-surface fill, input border and medium corners. Helpers
sit below the related field; invalid state uses destructive border/ring styling. Placeholder
text uses muted foreground. Badges default to the secondary neutral treatment, compact
padding and small corners; statuses retain text labels. Summary panels use the panel
surface, thin border and 20px padding. Tables use a muted header and subtle hover/selection
fill, with a two-line identity cell and aligned measurements.

Navigation uses compact icon/text rows, muted hover chrome and a warm selected surface;
the active icon carries the brand color. Collapsed navigation retains accessible labels
and tooltips. Page tabs use the shared line variant; local alternatives use the segmented
variant. Both retain Radix keyboard and focus behavior.

### Evidence and observations

Desktop evidence is adjacent to the decision list. When the actual layout stacks, selecting
a decision transfers focus to the evidence heading and scrolls it into view; Back to decisions
returns focus to the journal. This applies when an open desktop assistant narrows the workspace.
Inspector loading/errors must not show a different turn's evidence. Selecting a turn never
truncates the journal. Revision, condition, seed and repetition identify a run.

Opening researcher observations or beginning a note pins the displayed turn. Unsaved note
text is held separately for each run and turn while the run page remains mounted. Saving
captures that run/turn identity and clears only the submitted text, preserving edits made
while the request is pending. Observation notes are separate from immutable recorded evidence.

### States and interaction

The same focus, hover, disabled, loading, error and empty grammar applies throughout.
Skeletons approximate record/form structure. Errors state the failed operation and recovery.
Empty lists offer the next useful action; filtered empty states offer clearing filters.
Saving a protocol never starts model calls. Starting execution is explicit. Provider keys
stay server-side; missing configuration links to Settings. No invented account/RBAC states.

Modal Sheets support Escape and focus return. The nonmodal desktop assistant stays open
while the user clicks or focuses the workspace; its explicit close control and Escape
dismiss it. The composer remains anchored and activity follows server events.

Protocol browser drafts are recoverable and distinct from immutable saved revisions.
Links preserve query state where relevant. Route content is lazily loaded; controls use
native/Radix semantics. Button feedback is 140ms, disclosure rotation 150ms and sidebar
collapse 200ms. Sheet motion declares 500ms opening and 300ms closing; the message-scroller
control declares 200ms showing and 400ms hiding. Loading indicators rotate at 1s. Reduced
motion reduces animation/transition durations and disables smooth scrolling. Exact motion
extensions live in the sidecar; transition only the properties needed by the interaction.

## Do's and Don'ts

### Do:

- **Do** lead with saved experiments and carry revision, run and turn identity into evidence and comparison.
- **Do** reuse shared controls, compact tables, visible labels and accessible keyboard behavior.
- **Do** keep evidence navigation tied to the actual layout, including a narrowed desktop workspace.
- **Do** distinguish immutable evidence, researcher observations and recoverable protocol drafts.
- **Do** retain text labels for status and data identity alongside color.

### Don't:

- **Don't** replace experiment records with oversized dashboard metrics or a chat-first landing screen.
- **Don't** use nested decorative cards to separate information already aligned in a table or panel.
- **Don't** show another turn's evidence during loading, or truncate the journal to the selected turn.
- **Don't** move a note to a new turn as live execution advances, or clear newer edits after a save.
- **Don't** dismiss the nonmodal assistant when the workspace receives focus or a click.
- **Don't** invent account controls or treat model self-report as recorded observation.
