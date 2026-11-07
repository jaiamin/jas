---
name: "ASS — Agent Simulation Environment"
description: "A minimal shadcn workspace for experiments and recorded evidence."
colors:
  background: "#ffffff"
  foreground: "#171717"
  primary: "#171717"
  primary-foreground: "#fafafa"
  muted: "#f5f5f5"
  muted-foreground: "#646464"
  border: "#e5e5e5"
  input: "#dedede"
  ring: "#737373"
  accent: "#efefef"
  accent-foreground: "#171717"
  popover: "#ffffff"
  destructive: "#a93b3b"
  danger-background: "#fff1ef"
  success: "#525252"
  warning: "#815c13"
  warning-background: "#fff6e6"
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
  dark-input: "#383838"
  dark-ring: "#a3a3a3"
  dark-accent: "#242424"
  dark-accent-foreground: "#fafafa"
  dark-popover: "#171717"
  dark-destructive: "#efa5a0"
  dark-danger-background: "#3c2525"
  dark-success: "#d4d4d4"
  dark-warning: "#e4bf81"
  dark-warning-background: "#3b3020"
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
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.4px"
  home-headline:
    fontFamily: "\"Geist Variable\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.4px"
  title:
    fontFamily: "\"Geist Variable\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "-0.15px"
  subheading:
    fontFamily: "\"Geist Variable\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: "\"Geist Variable\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "\"Geist Variable\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.5
  detail:
    fontFamily: "\"Geist Variable\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
  badge:
    fontFamily: "\"Geist Variable\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "16px"
  prose:
    fontFamily: "\"Geist Variable\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.7
  mono:
    fontFamily: "\"SFMono-Regular\", Consolas, \"Liberation Mono\", monospace"
    fontSize: "13px"
rounded:
  sm: "2px"
  md: "3px"
  lg: "4px"
spacing:
  "4": "4px"
  "6": "6px"
  "8": "8px"
  "12": "12px"
  "16": "16px"
  "20": "20px"
  "24": "24px"
  "32": "32px"
  "40": "40px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "32px"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "32px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "32px"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "#ffffff"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "32px"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "4px 12px"
    height: "32px"
  navigation:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "8px"
    height: "32px"
  badge:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.foreground}"
    typography: "{typography.badge}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  execution-summary:
    backgroundColor: "{colors.sidebar}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "20px"
  question-composer:
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
  tabs:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.lg}"
    padding: "3px"
    height: "36px"
---
# Design System: ASS

## Overview

**Creative North Star: "A useful experiment workspace"**

ASS uses a minimal, compact shadcn interface: neutral work surfaces, monochrome actions, Geist and sharp corners. Thin rules, modest type and aligned records establish hierarchy. Orange appears in small identity, active-navigation and live-status details.

Task tabs and progressive disclosure keep configuration manageable. A shared assistant Sheet supports experiment design and recorded evidence. Light and dark themes preserve the same roles and density.

**Key Characteristics:**

- Neutral surfaces and monochrome primary actions.
- Restrained orange markers; no green brand, status or data colors.
- Compact Geist typography and sharp corners.
- Standard shadcn controls, task tabs and progressive disclosure.
- Collapsible navigation and a shared research-assistant Sheet.

## Colors

The frontmatter preserves semantic names from `frontend/src/index.css`: unprefixed keys are light defaults; `dark-` keys are theme overrides. Live CSS custom properties supply the active theme. Tailwind secondary and card roles alias muted and background respectively.

### Primary

- **Monochrome action** (`primary`, `primary-foreground`): dark actions with pale text in light mode; reversed in dark mode. Text selection also uses these roles.
- **Restrained orange** (`brand`): identity icon, active route icon, active-run count, assistant wordmark and running/queued status. It is separate from primary action fill.

### Secondary

- **Data series** (`chart-1`–`chart-6`): orange, blue, ochre, rose, steel blue and violet. Pair in order with `series-0-background`–`series-5-background` for agents and condition indices.
- **Status:** neutral `success` for complete, ochre `warning` for paused/pausing, and red `destructive` for failure. Warning and danger backgrounds support exceptional states. Retain text labels.

### Neutral

- **Reading field** (`background`, `foreground`): work surfaces and text.
- **Quiet surface** (`muted`, `muted-foreground`): supporting text, inactive tabs, badges and row feedback.
- **Selection** (`accent`, `accent-foreground`): active navigation and highlighted menu items.
- **Shell** (`sidebar`, `sidebar-border`): navigation, summary and evidence-inspector surfaces.
- **Boundaries** (`border`, `input`): structural rules and field strokes. **Focus** (`ring`) stays neutral; **popover** supplies floating menu surfaces.

**The Neutral Base Rule.** Keep surfaces, primary actions and focus rings neutral. Use orange for the established small identity and live-state markers.

**The Series Identity Rule.** Series colors distinguish agents and histories; they do not imply rank or success. Keep green out of brand, status and data colors.

## Typography

**Interface Font:** locally loaded Geist Variable with platform sans-serif fallbacks. **Code Font:** SFMono-Regular, Consolas, Liberation Mono, monospace. Use sentence case, moderate weights and tabular figures for numerical facts.

- **Headline:** page titles; Home uses its larger headline role. At the mobile breakpoint these reduce to (19px) and (22px).
- **Title / Subheading:** section and nested headings.
- **Body / Label:** interface reading and control labels. Compact metadata uses detail and badge roles; sidebar group labels and secondary table context use (11px).
- **Prose:** assistant responses and expanded design-note paragraphs, maximum measure (75ch). Field descriptions use (65ch). Structured forms and data retain their working width.

The frontmatter owns desktop values. At the mobile breakpoint, input/select compatibility classes use (16px); grouped composer text retains its component size. See `frontend/src/index.css` and source primitives for local overrides.

## Layout

The desktop shell has an expanded sidebar (200px), collapsed icon rail (48px) and header (48px). Pages center within maximum width (1600px), padding (20px 24px 40px). Home centers its composer and starter buttons within (800px); recent experiments use the wider page area. Favor control gaps (6–8px), field groups (16px) and section separation (20–32px).

The editor pairs a flexible form with sticky summary (248px), gap (32px), top offset (72px). At viewport widths up to (1100px), summary width becomes (216px), gap (20px), and run history stacks. At (900px), editor, decision/evidence, interactions and protocol columns stack; the summary becomes a compact section below the form.

The assistant is a right Sheet, width `min(520px, 100vw)`. At viewport widths (1100px) and above it is non-modal and the workspace reserves (520px) on the right. Below that threshold it is modal; at (600px) and below it fills the width. Independently, the named workspace container stacks editor, run, decision, interactions, protocol and settings grids when available width is (720px) or less. Headings and filters wrap.

Navigation becomes a modal Sheet below (768px), width (288px). At (600px) and below, page padding becomes (18px 16px 32px), headings/actions wrap, filters stack, and tabs/tables retain contained scrolling. Editor save actions become a fixed bottom bar with extra page clearance; the turn scrubber moves to a second row.

On narrow screens, selecting a decision focuses and scrolls to its evidence inspector, which keeps viewport-height clearance and scroll offset (72px). **Back to decisions** restores focus and scroll to the journal.

## Elevation & Depth

Ordinary work surfaces are flat. Rules, spacing and tonal contrast carry structure; buttons, fields, tables, summary and Home composer have no resting shadow. Standard shadcn tabs use a small active shadow; select menus and Sheets retain primitive elevation. Modal Sheets use a half-opacity black scrim. The mobile editor save bar has a subtle upward shadow. Exact extensions live in `.impeccable/design.json`; source is `frontend/src/components/ui/` and `frontend/src/index.css`.

**The Flat Structure Rule.** Separate ordinary work areas with spacing, rules and tonal contrast. Reserve elevation for the implemented floating primitives and mobile save bar.

Control feedback uses short standard transitions; sidebar collapse uses (200ms), disclosure indicators (150ms), and loading icons rotate continuously (1s). Sheets retain source open/close timing. Reduced motion cuts animation/transition duration to (0.01ms), limits iteration to one and restores automatic scrolling.

## Shapes

Use the frontmatter sharp radius scale: small badges and menu items, medium controls and summaries, large tab containers and empty-state wrappers. Base radius matches the medium step. Composer interiors are square within the wrapper. Status dots remain circular (6px); avatars and condition indices use sharp corners. Use the established Lucide stroke icons, generally (15–16px) for navigation and controls.

## Components

### Buttons

Use shared source variants: default, outline, secondary, ghost, link and destructive. Standard and icon buttons are (32px) high; small buttons (28px), extra-small (24px), large (40px). Text-only default horizontal inset is (12px), reducing to (10px) with a direct icon. Default hover softens primary fill; outline/ghost hover uses neutral accent. Destructive uses solid destructive fill with white text. Disabled opacity is (0.5); focus uses a neutral three-pixel ring at half opacity.

### Inputs / Fields

Inputs and selects share standard control height, input border and medium radius. Input inset is (4px 12px); textarea inset (8px 12px), minimum height (64px). Label gap is (6px). Focus shifts the border to ring with a three-pixel half-opacity ring; invalid fields use destructive feedback. Disabled opacity is (0.5). Dark fields use input fill at (30%) opacity.

Home uses the source InputGroup: wrapper-owned border and focus, an unframed textarea, and a footer hint with primary action. The textarea uses (15px), minimum height (84px), inset (16px 16px 8px), and vertical resizing. Starter suggestions are small outline buttons that wrap below it.

### Navigation & Tabs

The source Sidebar provides desktop collapse and a modal mobile drawer. Route links have height (32px), inset (8px), icons (15px). Active routes use neutral accent fill, medium weight and an orange icon. Recent experiments sit under a quiet group label; settings and appearance remain in the footer. Breadcrumbs truncate long route names.

Use source segmented Tabs for editor tasks and run views: muted track, background-colored active trigger, neutral text and standard active shadow. Keep horizontal overflow contained. Sheets retain accessible titles, descriptions, Escape dismissal and focus handling. Choosing a mobile route closes its drawer.

### Chips / Status

Badges use small corners, medium badge weight and muted default fill. Status removes badge fill, border and padding; a small colored dot accompanies its text label. A badge does not imply an interactive filter.

### Containers & Progressive Editor

The execution summary uses sidebar fill and inset (20px), reducing to (14px) on narrow screens. Editor structure remains open. Agent and condition summaries disclose their fields; optional configuration uses labeled disclosures. Empty states center a concise message and relevant action, minimum height (180px), inset (32px 20px), without an extra raised card.

### Data Tables & Evidence

Table headers use sidebar fill, muted type and inset (8px 12px); cells use inset (10px 12px) and thin row rules. Mobile reduces horizontal inset to (10px). Row hover/selection uses muted fill. Record links use medium weight with smaller context; numerical values use tabular figures.

The linked turn rail combines current-turn identity, continuous scrubber, step controls and Latest. Journal and evidence share the selected turn. Labeled disclosures distinguish saved observation, typed action, model self-report and complete post-turn state. Prose/JSON retain contained scrolling; recorded charts preserve gaps and endpoints.

## Do's and Don'ts

### Do:

- **Do** use shared semantic theme roles, Geist and the sharp radius scale.
- **Do** compose controls from the source shadcn primitives.
- **Do** preserve compact alignment, tabular numbers and contained table scrolling.
- **Do** keep settings and appearance in the sidebar footer.
- **Do** preserve task tabs, progressive disclosure, readable prose and linked evidence.
- **Do** adapt to available workspace width when the assistant is open.

### Don't:

- **Don't** introduce green brand, status or data colors.
- **Don't** turn primary actions orange or replace neutral focus feedback with a brand treatment.
- **Don't** add workspace/account decoration, nested raised cards or oversized corner rounding.
- **Don't** replace the standard task tabs with custom orange-underlined navigation.
- **Don't** constrain structured controls to paragraph measure or stretch design-note paragraphs across the editor.
