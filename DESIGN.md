---
name: "ASS — Agent Simulation Environment"
description: "A compact neutral workspace for experiments and recorded evidence."
colors:
  background: "#ffffff"
  foreground: "#171717"
  primary: "#171717"
  primary-foreground: "#fafafa"
  muted: "#f5f5f5"
  muted-foreground: "#646464"
  border: "#e5e5e5"
  input: "#949494"
  ring: "#737373"
  accent: "#efefef"
  accent-foreground: "#171717"
  popover: "#ffffff"
  destructive: "#a93b3b"
  danger-background: "#fff1ef"
  success: "#525252"
  warning: "#815c13"
  sidebar: "#fafafa"
  sidebar-border: "#e5e5e5"
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
  brand: "#c2410c"
  dark-background: "#0a0a0a"
  dark-foreground: "#fafafa"
  dark-primary: "#fafafa"
  dark-primary-foreground: "#171717"
  dark-muted: "#1c1c1c"
  dark-muted-foreground: "#a1a1a1"
  dark-border: "#292929"
  dark-input: "#666666"
  dark-ring: "#a3a3a3"
  dark-accent: "#242424"
  dark-accent-foreground: "#fafafa"
  dark-popover: "#171717"
  dark-destructive: "#efa5a0"
  dark-danger-background: "#3c2525"
  dark-success: "#d4d4d4"
  dark-warning: "#e4bf81"
  dark-sidebar: "#101010"
  dark-sidebar-border: "#292929"
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
  dark-brand: "#fb923c"
typography:
  headline:
    fontFamily: "\"Geist Variable\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.6px"
  title:
    fontFamily: "\"Geist Variable\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "-0.15px"
  subheading:
    fontFamily: "\"Geist Variable\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.6
  body:
    fontFamily: "\"Geist Variable\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.6
  body-mobile:
    fontFamily: "\"Geist Variable\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "\"Geist Variable\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.6
  detail:
    fontFamily: "\"Geist Variable\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.6
  button:
    fontFamily: "\"Geist Variable\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.3
  badge:
    fontFamily: "\"Geist Variable\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "12px"
    fontWeight: 450
    lineHeight: 1.6
  prose:
    fontFamily: "\"Geist Variable\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.8
  mono:
    fontFamily: "\"SFMono-Regular\", Consolas, \"Liberation Mono\", monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  small: "1px"
  control: "2px"
spacing:
  "4": "4px"
  "6": "6px"
  "7": "7px"
  "8": "8px"
  "10": "10px"
  "12": "12px"
  "14": "14px"
  "16": "16px"
  "18": "18px"
  "20": "20px"
  "24": "24px"
  "26": "26px"
  "28": "28px"
  "30": "30px"
  "32": "32px"
  "34": "34px"
  "40": "40px"
  "42": "42px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "0 13px"
    height: "36px"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "0 13px"
    height: "36px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted-foreground}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "0 13px"
    height: "36px"
  button-destructive:
    backgroundColor: "{colors.danger-background}"
    textColor: "{colors.destructive}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "0 13px"
    height: "36px"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "7px 10px"
  navigation:
    backgroundColor: "transparent"
    textColor: "{colors.muted-foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "34px"
  navigation-selected:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "34px"
  badge:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.muted-foreground}"
    typography: "{typography.badge}"
    rounded: "{rounded.small}"
    padding: "2px 7px"
  execution-summary:
    backgroundColor: "{colors.sidebar}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: "20px"
  table:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
  question-composer:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
---

# Design System: ASS

## Overview

**Creative North Star: "A useful experiment workspace"**

ASS uses a compact, utilitarian shadcn interface: white and black work surfaces, monochrome actions, Geist and sharp corners. Thin rules and aligned records carry the hierarchy; orange appears in small identity, active-state and live-status details.

The shell stays quiet while the question, protocol and recorded evidence do the work. Progressive disclosure keeps configuration manageable. Light and dark themes preserve the same roles and density.

**Key Characteristics:**

- Neutral surfaces and monochrome primary actions.
- Restrained orange markers; no green brand, status or data colors.
- Geist, compact typography and sharp corners.
- Ruled tables, progressive forms and linked evidence.
- Sidebar footer controls and a modal mobile drawer.

## Colors

The normative frontmatter preserves source custom-property names: unprefixed keys are light `:root` roles; `dark-` keys are `.dark` overrides. Components reference light defaults; live CSS properties supply the current theme.

### Primary

- **Monochrome action** (`primary`, `primary-foreground`): dark buttons with pale text in light mode; pale buttons with dark text in dark mode. Links, native ranges, checkboxes and text selection also use these roles.
- **Restrained orange** (`brand`): the square identity mark, active navigation icon, tab underline, active-run count and running/queued status. Orange is separate from primary action fill.
- **Neutral selection** (`accent`, `accent-foreground`): active rail background/text and highlighted select items. Row hover/selection mixes accent and background equally.

### Secondary

- **Data series** (`chart-1`–`chart-6`): orange, blue, ochre, rose, steel blue and violet. Pair in order with `series-0-background`–`series-5-background` for avatars, condition indices and diagrams.
- **Status roles:** neutral `success` for complete, ochre `warning` for paused/pausing, and red `destructive` for failed. Errors and destructive actions use `danger-background`. Every status retains its text label.

### Neutral

- **Reading field** (`background`, `foreground`): white/near-black in light mode; near-black/pale ink in dark mode.
- **Quiet surface** (`muted`, `muted-foreground`): table headers, hover feedback and supporting text.
- **Shell surface** (`sidebar`, `sidebar-border`): navigation, drawer and execution summary.
- **Boundaries** (`border`, `input`): structural rules and stronger field strokes. **Focus** (`ring`) remains neutral. **Popover** supplies select menus and chart tooltips.

**The Neutral Base Rule.** Keep surfaces, primary actions and focus rings neutral. Use orange for the established small identity and active-state markers.

**The Series Identity Rule.** Series colors distinguish agents and histories; they do not imply moral rank or success. Keep green out of brand, status and data colors.

## Typography

**Interface Font:** Geist Variable, locally loaded through Fontsource, with the frontmatter platform fallbacks. **Code Font:** SFMono-Regular, Consolas, Liberation Mono, monospace. Use sentence case, moderate weights and tabular figures for numerical facts.

- **Headline:** page and home titles; mobile reduces to (23px), tracking (-0.5px), at (600px).
- **Title / Subheading:** section and nested headings.
- **Body / Label:** interface reading and labels. Mobile body is (14px); text inputs/textareas become (16px) at (600px).
- **Detail / Badge:** supporting metadata, headers and context tags.
- **Prose:** longer assistant responses, maximum measure (75ch), rising to (16px) on mobile. Expanded AI design-note paragraphs use maximum measure (72ch); form controls and structured data retain their working width. Field descriptions typically stop at (65ch).

## Layout

The desktop shell uses a fixed rail (224px), breadcrumb header (48px minimum) and flexible work area. Pages center within maximum width (1510px), padding (28px 32px 56px); inline padding becomes (48px) at (1600px). Left-aligned headings, the full-width question input group, ruled starter rows and compact records establish the spatial grammar.

Use the recorded spacing steps; controls favor gaps (7–8px), while section separations use (24–34px). The editor pairs a flexible form with a sticky execution summary (265px) and gap (40px). Evidence and comparison use flexible columns, fine rules and clear alignment.

- **At 1150px and below:** rail (200px), page padding (26px 26px 50px), editor summary (230px), editor gap (25px). Run history and study overview stack.
- **At 900px and below:** the sidebar becomes a modal sheet of width `min(280px, 85vw)`; the content offset disappears. Editor, journal/evidence, comparison and settings stack. The execution summary moves before the form.
- **At 600px and below:** page padding (22px 17px 40px), header inline padding (12px), stacked headings/actions and wrapping table filters. Starter title/description stack. Tables and tabs retain contained horizontal scrolling. The turn scrubber occupies a second row.

On narrow screens, selecting a decision focuses its evidence heading and scrolls the inspector into view with offset (72px). Minimum inspector height `calc(100svh - 72px)` prevents loading content from clamping the jump. **Back to decisions** returns focus and scroll to the journal.

## Elevation & Depth

The interface is flat: one-pixel rules and tonal contrast separate work areas. Only the floating select menu uses a soft shadow (`0 8px 24px #00000012`). The composer, buttons, tables, execution summary and evidence have no resting shadow. The mobile sheet uses a scrim (`#0006`) rather than decorative elevation.

**The Flat Structure Rule.** Use rules, spacing and tonal contrast for ordinary structure. Only the select menu receives the implemented soft shadow.

Control and starter feedback uses short transitions (0.14s). Loading icons rotate (1s, linear, infinite); charts do not animate. Reduced motion sets animations/transitions to (0.01ms), iteration to one and scrolling to auto.

## Shapes

Rectangular controls, frames and summaries use sharp control corners (2px). Tags, indices, select items and small progress tracks use the smaller step (1px). The composer’s internal textarea is square. Status dots (6px) and circular agent avatars retain their semantic shapes. Icons use the established Lucide stroke language, generally (14–16px); the small orange identity mark is a square (9px).

## Components

### Buttons

Primary, outline, ghost and destructive variants share Geist (13px / 500), the control radius and icon gap (7px). Standard height is (36px), padding (0 13px); small and icon buttons are (32px), with small padding (0 10px). Primary hover uses brightness (0.95); outline/ghost hover uses muted fill. Disabled opacity is (0.48). Keyboard focus uses a neutral ring (2px), offset (3px). Paginator controls retain their smaller dimensions.

### Inputs / Fields

Fields use background fill, input stroke and sharp corners. Inputs/select triggers: minimum height (36px), padding (7px 10px), line height (20px). Textareas: minimum height (70px), padding (10px 12px), line height (1.6). Label gap is (7px). Field focus uses the neutral ring (2px), offset (1px); disabled opacity is (0.5). Select menus have inset (4px), a structural border and neutral-highlighted items.

The question composer is an input group: a bordered wrapper owns focus, the textarea has no inner border, and the footer pairs supporting text with the lower-right action. Its textarea uses (15px), minimum height (112px), padding (18px 18px 8px); mobile uses (16px) and padding (14px). Group focus has offset (2px).

### Navigation

The sidebar header aligns the identity with the breadcrumb header. Route links are (34px) high with inline padding (10px), gap (10px) and icons (16px). Selected links use neutral accent fill and weight (500); only their icon becomes orange. Settings and the appearance icon stay in the ruled footer. Breadcrumbs show the route hierarchy, truncating long segments within (32ch).

Mobile navigation uses the shared modal Sheet, with an accessible title/description, close button, focus containment, Escape dismissal and focus return to its trigger. Choosing a route closes it. Run tabs use an orange underline (2px) with neutral active text.

### Chips / Status

Context badges use the small radius, badge typography and inset (2px 7px). Status removes fill/padding and uses text (13px) with a dot (6px). Color supports the label; a badge does not imply an interactive filter.

### Containers & Progressive Editor

The execution summary uses rail fill/border and inset (20px), reducing to (16px) on mobile. Other editor structure is open and ruled. Agent and condition summary rows disclose their fields on demand; optional hypotheses, scenario context, replication, measurements and model settings use labeled disclosures. Empty states use a simple solid frame, minimum height (180px), padding (32px 24px) and a concise action where applicable.

### Data Tables

One sharp frame contains toolbar, scrolling records and footer. Headers use muted fill and text (12px / 500); rows use text (13px). Header/cell padding is (10px 15px) / (12px 15px), becoming (9px 12px) / (11px 12px) on mobile. Multiline content determines row height. Record links use weight (500) with smaller muted context. Hover/selection uses the neutral accent/background mix.

### Linked Turn Rail & Evidence

A ruled fact strip precedes the current-turn label, continuous range, step buttons and Latest action. Journal selection and evidence share turn identity. Labeled disclosures separate saved observation, typed action, model self-report and complete post-turn state. Raw JSON uses muted fill, sharp corners, inset (15px), contained scrolling and maximum height (500px). Charts use horizontal structural grid lines and recorded-series strokes (2px), preserving gaps and endpoints.

## Do's and Don'ts

### Do:

- **Do** use shared semantic theme roles, Geist and the sharp radius scale.
- **Do** preserve compact alignment, tabular numbers and contained table scrolling.
- **Do** keep settings and appearance in the sidebar footer.
- **Do** preserve progressive disclosure, readable prose and direct turn-to-evidence navigation.

### Don't:

- **Don't** introduce green brand, status or data colors.
- **Don't** turn primary actions orange or replace the neutral focus ring with a brand treatment.
- **Don't** add workspace/account decoration, nested raised cards or oversized corner rounding.
- **Don't** constrain structured controls to the paragraph measure or leave expanded AI paragraphs at full editor width.
