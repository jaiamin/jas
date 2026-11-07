---
name: "JAS developer workspace"
description: "Experiments, runs and recorded evidence in one calm workspace."
colors:
  background: "#ffffff"
  foreground: "#171717"
  primary: "#171717"
  primary-foreground: "#ffffff"
  muted: "#f5f5f5"
  muted-foreground: "#666666"
  border: "#e5e5e5"
  input: "#d4d4d4"
  ring: "#737373"
  accent: "#f0f0f0"
  accent-foreground: "#171717"
  popover: "#ffffff"
  destructive: "#171717"
  danger-background: "#f5f5f5"
  success: "#525252"
  warning: "#525252"
  warning-background: "#f5f5f5"
  sidebar: "#ffffff"
  sidebar-border: "#e5e5e5"
  chart-1: "#171717"
  chart-2: "#525252"
  chart-3: "#6b6b6b"
  chart-4: "#333333"
  chart-5: "#5c5c5c"
  chart-6: "#404040"
  series-0-background: "#f5f5f5"
  series-1-background: "#f5f5f5"
  series-2-background: "#f5f5f5"
  series-3-background: "#f5f5f5"
  series-4-background: "#f5f5f5"
  series-5-background: "#f5f5f5"
  brand: "#171717"
  selection-background: "#f0f0f0"
  panel: "#fafafa"
  control-background: "#fafafa"
  text-secondary: "#404040"
  text-tertiary: "#6b6b6b"
  dark-background: "#0a0a0a"
  dark-foreground: "#ededed"
  dark-primary: "#ededed"
  dark-primary-foreground: "#0a0a0a"
  dark-muted: "#1a1a1a"
  dark-muted-foreground: "#a3a3a3"
  dark-border: "#292929"
  dark-input: "#404040"
  dark-ring: "#a3a3a3"
  dark-accent: "#242424"
  dark-accent-foreground: "#fafafa"
  dark-popover: "#1a1a1a"
  dark-destructive: "#ededed"
  dark-danger-background: "#1a1a1a"
  dark-success: "#d4d4d4"
  dark-warning: "#b8b8b8"
  dark-warning-background: "#1a1a1a"
  dark-sidebar: "#0a0a0a"
  dark-sidebar-border: "#292929"
  dark-chart-1: "#fafafa"
  dark-chart-2: "#cfcfcf"
  dark-chart-3: "#a3a3a3"
  dark-chart-4: "#e5e5e5"
  dark-chart-5: "#b8b8b8"
  dark-chart-6: "#dedede"
  dark-series-0-background: "#1a1a1a"
  dark-series-1-background: "#1a1a1a"
  dark-series-2-background: "#1a1a1a"
  dark-series-3-background: "#1a1a1a"
  dark-series-4-background: "#1a1a1a"
  dark-series-5-background: "#1a1a1a"
  dark-brand: "#ededed"
  dark-selection-background: "#242424"
  dark-panel: "#141414"
  dark-control-background: "#141414"
  dark-text-secondary: "#c2c2c2"
  dark-text-tertiary: "#999999"
typography:
  wordmark:
    fontFamily: '"Bricolage Grotesque", sans-serif'
    fontSize: "22px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.04em"
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
reference for composition: compact navigation, aligned records, low-contrast chrome and adjacent evidence.
Vercel's black-and-white restraint guides the palette and contrast.
Its marketing layout is not a reference. Preserve JAS's experimental units and provenance.

Domain: experiments, protocols, conditions, seeds, turns, checkpoints, observations,
consequences and replay. The color world is paper-white records, graphite text, charcoal
work surfaces, soft gray separators and grayscale data series. The supplied JAS mark is
the only color exception: its original blue and red details remain confined to the logo.
The signature is linked evidence: immutable revision → run identity → selected turn →
observation/decision/consequence, with comparison retaining the same identities.

Reject oversized dashboard metrics in favor of actual experiment records; a chat-first
landing screen in favor of saved work; nested cards in favor of tables and aligned panels.
Keep Geist for small, dense interface text. Expression comes from organization and precision.

**Key Characteristics:**
- Compact records with aligned identity, status and measurements.
- Achromatic surfaces, neutral selection and data series distinguished by tone and line pattern.
- Linked evidence that preserves revision, run and turn identity.

## Colors

The frontmatter records the actual light tokens and their `dark-` counterparts. Canvas and
sidebar share one neutral ground. Panel, muted and control surfaces differ by small tonal
steps. Text has primary, supporting, secondary and metadata levels.

### Primary

Graphite `primary` and its contrasting foreground define the main action. Neutral `brand`
marks active execution and the selected navigation icon; `selection-background` marks
the current navigation destination. Table selection uses `muted`. Do not introduce a
colored action accent: contrast, typography and spacing carry hierarchy.

### Secondary

The six neutral chart inks identify agents and conditions alongside visible labels.
Comparison lines use distinct solid/dashed patterns, reflected in their legends, so tone
is never the only key. Series backgrounds share the muted surface. Statuses use labeled
icons: check for complete, clock for queued, spinner for running, pause for paused/pausing
and cross for failed. Errors include an alert icon. Destructive and warning tokens stay
neutral; explicit copy, icons and existing confirmations communicate their meaning.

### Logo

`frontend/public/logo.svg` is the master asset for the sidebar and README. The favicon
in `frontend/public/favicon.svg` preserves the same paths with an 8-unit inset on each
edge (`viewBox="-8 -8 144 144"`), making only the browser-tab mark slightly smaller.
Preserve the supplied geometry and red/blue details. Its main ink switches from near-black
to white with the containing surface's color scheme; the favicon follows the browser's
scheme. The expanded sidebar pairs the 24px mark with lowercase `jas`, using a locally
hosted Bricolage Grotesque wordmark at 22px/800, -0.04em tracking and an 8px gap. There
is no subheading. Only the mark remains in the collapsed rail. The collapse control
sits inside the header. In the 48px collapsed rail, hovering or focusing the mark reveals
the expand icon in the same aligned target; the control retains keyboard focus when toggled. Do not substitute a generic experiment icon
for the product logo.

### Neutral

Canvas and sidebar share `background`; `panel` is a separate work surface. `muted` groups
records, `control-background` gently insets fields, and `popover` supports floating choices.
`border` separates records; `input` outlines controls. Foreground, secondary, muted and
tertiary text express hierarchy. The `ring` token identifies keyboard focus.

**The Identity Before Color Rule.** Keep agent, condition and status labels visible;
icons, labels and line patterns carry identity without relying on hue or implying moral rank.

Body, metadata and placeholder text must meet 4.5:1; large text 3:1. Disabled controls retain
their shape and use 50% opacity. Visible focus adds an outline or ring, never color alone.

## Typography

Locally hosted Geist Variable supplies the headline, body, title, label and metadata roles
in the frontmatter. The full source fallback stack is preserved there. Code and JSON use
the code role; run identifiers use platform monospace. Numeric measurements use tabular
figures. Prose has a maximum measure of 75ch.

The lowercase sidebar wordmark alone uses Bricolage Grotesque, bringing a rounded,
playful accent to the restrained interface. Its 800-weight, 24px optical-size WOFF2
contains only `jas` (1.3KB), served from `frontend/public/fonts` with its
[SIL Open Font License](frontend/public/fonts/OFL.txt). Source:
[Bricolage Grotesque](https://github.com/ateliertriay/bricolage), distributed via Google Fonts.

Headlines identify pages, titles identify sections, labels name controls, and metadata
qualifies a record. Supporting captions and count badges sometimes use 11px. Below 600px,
page headlines reduce to 19px. The Agent welcome uses 26px/500 text, reduced to 24px on mobile.

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
the same grids also stack through a container query. Evidence navigation follows the
actual stacked layout.

At 600px and below, page gutters reduce to 16px, headings and toolbars wrap, inputs use
16px text, and the editor save action stays reachable in a fixed bottom bar. Tables scroll
inside their region. Coarse pointers enlarge shared buttons, select triggers, navigation,
tabs and inputs to at least 44px; icon buttons also gain a 44px minimum width.

Agent fills the page below the shell header. A 208px inner history rail sits beside the
conversation; the main application sidebar remains navigation only. At viewport widths
of 1000px and below, history becomes a compact chat picker above the conversation.
The conversation and composer share an 800px measure with 24px internal gutters (12px
composer gutters on mobile). The composer remains below the independently scrolling
transcript. Validate at 390px, 834px, 1280px and 1440px in both themes.

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
| Navigation | Workspace: Experiments and Runs; Tools: Agent and Environments; Settings/theme in footer; creation stays in page actions |
| Buttons | 32px standard, 28px small, 40px large; 13px/500; coarse-pointer controls at least 44px |
| Fields | Shared Field/FieldGroup with visible label, inset control, related helper/error; no bespoke inputs |
| Page tabs | Full-width bottom rule, 40px height, 20px gap, neutral active underline; arrow-key navigation |
| Local tabs | Segmented neutral control for related display options |
| Records | One search/status toolbar, stable column headers, readable two-line identity, contained horizontal scroll |
| Selection | Checkbox selection survives filtering, 2–4 run comparison, explicit clear action |
| Editor | Question → Agents → Conditions → Execution; JSON remains available; persistent execution summary/save |
| Experiment | Question stays visible, revision explicit, Overview / Runs / Protocol; historical revisions remain inspectable |
| Run | Decisions first; environment, interactions and record remain tabs; shared turn rail and adjacent inspector |
| Agent | Single full-page conversation; inner chat history; composer context selector and one icon-only Send; reviewed protocol replies; activity reflects server events |

### Controls and containers

Buttons are compact and medium-weight. Primary is graphite; outline and secondary support
less prominent actions; ghost removes the resting fill; link uses an underline on hover;
destructive uses the failure token. Primary/destructive hover reduces fill opacity to 90%,
secondary to 80%; outline/ghost hover uses the accent surface. Icon-bearing buttons reduce
horizontal padding. Focus is a 3px half-opacity ring, with disabled controls at 50% opacity.

Fields use a visible label, control-surface fill, input border and medium corners. Helpers
sit below the related field; invalid state uses destructive border/ring styling. Placeholder
text uses muted foreground. Composed controls place focus on their rounded InputGroup,
without a second rectangular outline on the textarea. Badges default to the secondary neutral treatment, compact
padding and small corners; statuses retain text labels. Summary panels use the panel
surface, thin border and 20px padding. Tables use a muted header and subtle hover/selection
fill, with a two-line identity cell and aligned measurements.

Navigation uses compact icon/text rows, muted hover chrome and a neutral selected surface;
the active icon uses the foreground tone. Collapsed navigation retains accessible labels
and tooltips. Page tabs use the shared line variant; local alternatives use the segmented
variant. Both retain Radix keyboard and focus behavior.

Use restrained 16px Lucide line icons: flask for Experiments, play for Runs, message
for Agent, boxes for Environments and gear for Settings. The sidebar has no creation
button. Keep the logo's pixel geometry confined to the supplied mark.

### Agent entry points

Agent is the persistent destination for general questions, scoped investigation and
reviewed creation. Use one conversation interface without tabs or an expandable panel.
Past chats live in its inner sidebar, with a New chat icon; resuming a chat restores its
server-stored turns. General, New experiment, experiment and run contexts share one
composer selector. Context belongs to each submitted message; switching it never
relabels earlier evidence. Failed-turn Retry uses that turn's original context.

Experiments keeps one New experiment action. The editor exposes Generate with Agent
beside its heading, carries the current question, and preserves the manual draft. A
reviewed proposal links Back to Agent to resume its originating conversation.

Only experiment/run details show Ask Agent in the header. It navigates into the full
Agent page with that record selected. Other pages use the main navigation entry.
`/design` remains a compatible entry with New experiment selected. Protocol proposals
appear in the conversation with Review protocol, which opens the existing editor.
Saving and execution remain separate explicit actions.

Suggestions are outlined, padded buttons with a small arrow; choosing one fills the
composer without spending. The context menu uses a 420px surface bounded by viewport
width, grouped choices, and a second identity line for runs. The composer has 14px
corners and one circular Send icon. Enter sends; Shift+Enter adds a line; IME composition
never submits prematurely. Omit routine text below the composer and generic page
subtitles. Keep actual research questions, run identity, errors, and material constraints.

Unsent messages are stored per conversation in sessionStorage, including before the
first send. Errors preserve the draft; new chats start separately. General questions use
workspace budget; scoped investigations use experiment budget and frozen evidence.

### Evidence and observations

Desktop evidence is adjacent to the decision list. When the actual layout stacks, selecting
a decision transfers focus to the evidence heading and scrolls it into view; Back to decisions
returns focus to the journal. In adjacent layouts, focus stays on the selected journal row.
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

The mobile navigation Sheet supports Escape and focus return. Agent remains a full page;
its composer stays anchored and activity follows actual server stages.

Protocol browser drafts are recoverable and distinct from immutable saved revisions.
Links preserve query state where relevant. Browser titles follow the current view as
“View | JAS”; saved experiments and runs use their breadcrumb identity once loaded.
Titles update on navigation and browser history. Route content is lazily loaded;
controls use native/Radix semantics. Button feedback is 140ms, disclosure rotation 150ms and sidebar
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
- **Don't** mix different chat histories or use unselected run evidence in a general answer.
- **Don't** invent account controls or treat model self-report as recorded observation.
