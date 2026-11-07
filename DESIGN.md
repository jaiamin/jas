---
name: "JAS developer workspace"
description: "Experiments, runs and recorded evidence in one calm workspace."
colors:
  background: "#ffffff"
  foreground: "#20242c"
  primary: "#0866d9"
  primary-foreground: "#ffffff"
  muted: "#f4f6f8"
  muted-foreground: "#626a78"
  border: "#e3e6eb"
  input: "#d5dbe3"
  ring: "#2879df"
  accent: "#f0f3f7"
  accent-foreground: "#20242c"
  popover: "#ffffff"
  destructive: "#b42318"
  danger-background: "#fef3f2"
  success: "#347254"
  warning: "#825b18"
  warning-background: "#fef8ed"
  sidebar: "#ffffff"
  sidebar-border: "#e3e6eb"
  chart-1: "#0866d9"
  chart-2: "#526178"
  chart-3: "#606f83"
  chart-4: "#344154"
  chart-5: "#596b83"
  chart-6: "#49566a"
  series-0-background: "#edf3fb"
  series-1-background: "#f1f3f6"
  series-2-background: "#f1f3f6"
  series-3-background: "#f1f3f6"
  series-4-background: "#f1f3f6"
  series-5-background: "#f1f3f6"
  brand: "#0866d9"
  selection-background: "#e7f0ff"
  selection-foreground: "#075bb8"
  canvas: "#f7f8fa"
  panel: "#f7f8fa"
  control-background: "#ffffff"
  text-secondary: "#4c5564"
  text-tertiary: "#646e7e"
  dark-background: "#15191f"
  dark-foreground: "#eef0f3"
  dark-primary: "#8cbcff"
  dark-primary-foreground: "#10213a"
  dark-muted: "#20262e"
  dark-muted-foreground: "#a4adba"
  dark-border: "#303740"
  dark-input: "#424c59"
  dark-ring: "#78adf5"
  dark-accent: "#252e3a"
  dark-accent-foreground: "#eef0f3"
  dark-popover: "#20262e"
  dark-destructive: "#ffb4ab"
  dark-danger-background: "#352624"
  dark-success: "#a4c4ae"
  dark-warning: "#e1c28f"
  dark-warning-background: "#342c20"
  dark-sidebar: "#15191f"
  dark-sidebar-border: "#303740"
  dark-chart-1: "#8cbcff"
  dark-chart-2: "#c1cbd9"
  dark-chart-3: "#9caabd"
  dark-chart-4: "#e1e6ee"
  dark-chart-5: "#adbacb"
  dark-chart-6: "#cdd5e0"
  dark-series-0-background: "#21334c"
  dark-series-1-background: "#252d38"
  dark-series-2-background: "#252d38"
  dark-series-3-background: "#252d38"
  dark-series-4-background: "#252d38"
  dark-series-5-background: "#252d38"
  dark-brand: "#8cbcff"
  dark-selection-background: "#20334f"
  dark-selection-foreground: "#b1d1ff"
  dark-canvas: "#11161d"
  dark-panel: "#1c222a"
  dark-control-background: "#191f27"
  dark-text-secondary: "#c1c9d5"
  dark-text-tertiary: "#9ba7b8"
typography:
  wordmark:
    fontFamily: '"Bricolage Grotesque", sans-serif'
    fontSize: "22px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.04em"
  body:
    fontFamily: '"Inter Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  headline:
    fontFamily: '"Inter Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-0.4px"
  title:
    fontFamily: '"Inter Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "-0.15px"
  label:
    fontFamily: '"Inter Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "13px"
    fontWeight: 500
  metadata:
    fontFamily: '"Inter Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "12px"
    fontWeight: 400
  prose:
    fontFamily: '"Inter Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "14px"
    lineHeight: 1.7
  code:
    fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace'
    fontSize: "13px"
rounded:
  sm: "4px"
  md: "6px"
  lg: "10px"
spacing:
  control: "8px"
  field: "16px"
  section: "24px"
  page: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 12px"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 12px"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 12px"
  button-secondary:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 12px"
  button-ghost:
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 12px"
  button-link:
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 12px"
  input:
    backgroundColor: "{colors.control-background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "4px 12px"
  navigation-selected:
    backgroundColor: "{colors.selection-background}"
    textColor: "{colors.selection-foreground}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "8px"
  badge-secondary:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  summary-panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.foreground}"
    rounded: "8px"
    padding: "20px"
  page-tabs:
    height: "40px"
    textColor: "{colors.muted-foreground}"
  page-tab-active:
    textColor: "{colors.primary}"
---
# Design system

`frontend/src/index.css` owns source tokens; the frontmatter records them for design
tools. Shared controls live in `frontend/src/components/ui`, scoped layouts in
`frontend/src/styles`. [INTERFACE](docs/INTERFACE.md) describes route contracts.

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
records. `/design` and legacy assistant links redirect into this same conversation flow.

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
