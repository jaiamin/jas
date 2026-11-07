---
name: "ASS — Agent Simulation Environment"
description: "A restrained research workspace for experiments and recorded evidence."
colors:
  background: "#ffffff"
  foreground: "#242321"
  primary: "#ad4d14"
  primary-foreground: "#ffffff"
  muted: "#f5f5f4"
  muted-foreground: "#686661"
  border: "#e5e4e1"
  input: "#918d86"
  ring: "#ad4d14"
  accent: "#fff0e5"
  accent-foreground: "#a4430d"
  popover: "#ffffff"
  destructive: "#a93b3b"
  danger-background: "#fff1ef"
  success: "#516174"
  warning: "#815c13"
  sidebar: "#f7f7f6"
  sidebar-border: "#e5e4e1"
  chart-1: "#ad4d14"
  chart-2: "#4c67b1"
  chart-3: "#836626"
  chart-4: "#a64e78"
  chart-5: "#3c7195"
  chart-6: "#7a5b9c"
  series-0-background: "#fff0e5"
  series-1-background: "#eceff9"
  series-2-background: "#f7f0df"
  series-3-background: "#faeaf1"
  series-4-background: "#e7f1f7"
  series-5-background: "#f1ebf9"
  dark-background: "#171717"
  dark-foreground: "#e9e8e6"
  dark-primary: "#f4a66a"
  dark-primary-foreground: "#28180b"
  dark-muted: "#232323"
  dark-muted-foreground: "#a8a7a4"
  dark-border: "#333332"
  dark-input: "#777570"
  dark-ring: "#f4a66a"
  dark-accent: "#38271b"
  dark-accent-foreground: "#f6b988"
  dark-popover: "#232323"
  dark-destructive: "#efa5a0"
  dark-danger-background: "#3c2525"
  dark-success: "#adbcd0"
  dark-warning: "#e4bf81"
  dark-sidebar: "#1c1c1c"
  dark-sidebar-border: "#333332"
  dark-chart-1: "#f3aa72"
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
typography:
  display:
    fontFamily: "\"Public Sans Variable\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "30px"
    fontWeight: 550
    lineHeight: 1.3
    letterSpacing: "-0.9px"
  headline:
    fontFamily: "\"Public Sans Variable\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "26px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.7px"
  title:
    fontFamily: "\"Public Sans Variable\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "-0.15px"
  subheading:
    fontFamily: "\"Public Sans Variable\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.6
  body:
    fontFamily: "\"Public Sans Variable\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "\"Public Sans Variable\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "12px"
    fontWeight: 550
    lineHeight: 1.6
  detail:
    fontFamily: "\"Public Sans Variable\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.6
  button:
    fontFamily: "\"Public Sans Variable\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "12px"
    fontWeight: 550
    lineHeight: 1.3
  prose:
    fontFamily: "\"Public Sans Variable\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.8
  mono:
    fontFamily: "\"SFMono-Regular\", Consolas, \"Liberation Mono\", monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.6
  navigation:
    fontFamily: "\"Public Sans Variable\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.6
  badge:
    fontFamily: "\"Public Sans Variable\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "11px"
    fontWeight: 450
    lineHeight: 1.6
rounded:
  small: "4px"
  navigation: "5px"
  control: "6px"
  empty: "7px"
  composer: "9px"
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
  "36": "36px"
  "40": "40px"
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
    typography: "{typography.navigation}"
    rounded: "{rounded.navigation}"
    padding: "0 11px"
    height: "37px"
  navigation-selected:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.navigation}"
    padding: "0 11px"
    height: "37px"
  badge:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.small}"
    padding: "2px 7px"
    typography: "{typography.badge}"
  condition-container:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: "16px"
  table:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
  turn-rail:
    textColor: "{colors.foreground}"
    padding: "12px 0"
  question-composer:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.composer}"
---

# Design System: ASS

## Overview

**Creative North Star: "The University Research Service"**

The University Research Service gives experimental work a calm, practical home. Neutral white and charcoal work surfaces, restrained orange selection and fine rules support compact records without making every section a card. Light and dark themes preserve the same hierarchy.

Public Sans carries the interface. Clear labels, aligned numbers and progressively disclosed evidence keep experiments understandable. Charts and environment diagrams are data views; their colors distinguish series and agents without judging them.

**Key Characteristics:**

- Neutral white and charcoal surfaces with orange action and selection.
- Compact tables and continuous ruled work areas.
- Public Sans with restrained weight and size changes.
- A linked turn rail and recorded-evidence inspector.
- Responsive layouts with direct mobile inspection.

## Colors

The palette combines neutral white and charcoal with orange. Frontmatter is normative: unprefixed keys map to light `:root` roles; `dark-` keys map to `.dark` overrides. Component references describe light defaults; live CSS custom properties supply the corresponding theme.

### Primary

- **Burnt orange / soft apricot** (`primary`, `primary-foreground`): primary actions, active tabs, links and turn controls.
- **Orange selection** (`accent`, `accent-foreground`): active navigation and highlighted select items. Table hover/selection mixes accent and background equally.
- **Orange focus** (`ring`): visible keyboard and field focus.

### Secondary

- **Recorded-series colors** (`chart-1`–`chart-6`): orange, blue, ochre, rose, steel blue and violet. Pair them in order with `series-0-background`–`series-5-background` for avatars, condition indices and environment illustrations.
- **Semantic status:** slate `success` for complete, ochre `warning` for paused/pausing, and red `destructive` for failed. Running/queued use primary; errors and destructive actions use `danger-background` fills. Status always includes text.

### Neutral

- **White / charcoal** (`background`) and **charcoal / pale ink** (`foreground`): the principal reading field.
- **Quiet surface** (`muted`) and **supporting ink** (`muted-foreground`): headers, secondary text, subdued regions and hover feedback.
- **Rail surface and rule** (`sidebar`, `sidebar-border`): navigation and execution summaries.
- **Structural rule** (`border`), **field stroke** (`input`) and **menu surface** (`popover`): divisions, form boundaries, select menus and chart tooltips.

**The Orange Accent Rule.** Orange marks action and selection. Keep work surfaces neutral and keep green out of brand, status and data colors.

**The Role Parity Rule.** Replace theme roles together; preserve the same selection, reading and status hierarchy.

**The Series Identity Rule.** Data colors distinguish agents or histories. They do not imply moral rank, quality or success.

## Typography

**Display and Body Font:** Public Sans Variable, locally imported through Fontsource, with the frontmatter platform fallbacks. **Code Font:** SFMono-Regular, Consolas, Liberation Mono, monospace.

Use sentence case, moderate weights and restrained size changes. Monospace belongs to specifications and raw evidence. Numerical facts and turns use tabular figures.

- **Display:** home headline; reduces to (28px) at (900px) and (25px) at (600px).
- **Headline:** page titles; reduces to (23px), tracking (-0.5px), at (600px).
- **Title / Subheading:** section and nested headings.
- **Body / Label / Detail:** main reading, form labels and supporting metadata. Mobile body is (14px); text inputs/textareas become (16px) at (600px).
- **Navigation / Badge:** ordinary rail text and compact context labels; selected navigation uses label weight.
- **Prose:** longer assistant responses, maximum line length (75ch); rises to (16px) on mobile. Supporting descriptions typically stop at (65ch).

## Layout

Desktop uses a fixed rail (224px), context header (56px minimum) and flexible content. Pages center within maximum width (1510px), with padding (31px 36px 64px); at (1600px) and above, inline padding is (48px). The editor pairs its flexible form with an execution summary (265px). Run environment/history and journal/evidence use flexible columns separated by a fine vertical rule.

The frontmatter spacing records the observed rhythm. Controls favor gaps (7–8px); sections use (24–34px). Tables and aligned sections carry most composition.

- **At 1150px and below:** rail (200px), page gutters (26px), editor summary (230px); run history and study overview stack.
- **At 900px and below:** navigation becomes an off-canvas rail (224px) with scrim and menu button; choosing a route closes it. Editor, evidence, comparison and settings stack. Execution summary moves before the form.
- **At 600px and below:** page padding (22px 17px 40px), header (52px minimum), stacked headings/actions/starters and wrapping filters. Tables retain columns through contained horizontal scrolling. The turn scrubber moves to a second row.

At widths (900px) and below, selecting a decision focuses its evidence heading and immediately scrolls the inspector into view with offset (72px). Minimum inspector height `calc(100svh - 72px)` prevents loading content from clamping the jump. **Back to decisions** returns focus and scroll to the journal. Preserve this connection for new evidence surfaces.

## Elevation & Depth

Flat surfaces, tonal contrast and one-pixel rules provide structure. Only the select menu (`0 8px 24px #00000012`) and question composer (`0 3px 15px #00000004`) use soft shadows. Tables, buttons, condition containers and evidence sections have no resting shadow.

**The Quiet Structure Rule.** Use spacing, tonal surfaces and thin rules for ordinary structure. Reserve soft shadows for the question composer and select menu.

Control feedback uses transitions (0.14s). Loading icons rotate (1s, linear, infinite); charts do not animate. Reduced motion sets animations/transitions to (0.01ms), animation iteration to one and scrolling to auto.

## Shapes

Controls, table frames, condition containers and summaries share the control radius. Navigation is slightly tighter; badges and select items use the small radius; the composer is softer. Empty states use the empty radius and dashed field stroke. Status dots are circles (6px); agent avatars are circular. Use thin borders and the established stroke icons, typically (14–16px).

## Components

### Buttons

Sentence case, moderate weight and close icon spacing. Primary, outline, ghost and destructive variants share the control shape. Standard height is (36px); small buttons are (30px), padding (0 10px); icon buttons are (32px square). Primary hover uses brightness (0.95); outline/ghost hover uses muted fill. Disabled opacity is (0.48). Global keyboard focus is a ring (2px), offset (3px). Preserve existing compact paginator controls.

### Inputs / Fields

Background fill, field stroke and control radius. Inputs/select triggers: minimum height (36px), padding (7px 10px), line height (20px). Textareas: padding (10px 12px), line height (1.6), minimum height (70px). Label gap is (7px); descriptions use supporting ink. Focus ring: (2px), offset (1px); disabled input/textarea opacity: (0.5). Select menus use menu fill, a structural border, inset (4px) and accent-highlighted items.

### Chips / Status

Neutral badges use the small radius, badge typography and frontmatter inset. Status variants remove fill/padding and use text (12px) with a labeled dot (6px). Context badges do not imply an interactive filter.

### Cards / Containers

Conditions use one structural border, control radius and inset (16px), reducing to (13px) on mobile. Execution summaries use rail fill and border. Evidence stays open, separated by rules and space. Empty states are centered dashed containers, minimum height (220px), padding (36px 24px), with a concise action when applicable.

### Navigation

Rail links: height (37px), inline padding (11px), icon gap (10px), icon size (16px). Inactive ink is muted; hover uses muted fill and main ink; active routes use accent fill/ink and weight (550). Run tabs have a bottom rule and primary underline (2px), with contained horizontal scrolling. Keep accessible names for theme/navigation controls.

### Data Tables

One rounded frame contains toolbar, scroll region and footer. Headers use muted fill and text (11px / 500); rows use text (12px). Header/cell padding is (10px 15px) / (12px 15px), becoming (9px 12px) / (11px 12px) on mobile. Multiline content determines row height. Record links are moderately weighted with a smaller muted context line. Hover/selection uses the accent/background mix. Keep filters and pagination beside their records.

### Linked Turn Rail & Evidence

Wrapping status facts sit in a ruled strip. The turn rail links the current-turn label, continuous range, step buttons and Latest action before the work-area tabs. The journal and evidence share turn identity. Labeled disclosures distinguish typed actions, saved observation, model self-report and complete post-turn state. Raw JSON uses muted fill, control radius, inset (15px), contained scrolling and maximum height (500px).

Charts use horizontal structural grid lines, supporting axis labels and series strokes (2px); histories retain their recorded points and gaps. Environment diagrams and agent rows share the same series identities.

## Do's and Don'ts

### Do:

- **Do** use Public Sans, shared theme roles and compact control sizes.
- **Do** preserve aligned columns, tabular numbers and contained table scrolling.
- **Do** keep decision turns, typed actions and recorded evidence visibly connected.
- **Do** preserve visible focus and the direct mobile path between decisions and evidence.
- **Do** accompany status colors and dots with explicit labels.

### Don't:

- **Don't** introduce green brand, status or data colors.
- **Don't** turn every section, metric or evidence disclosure into another raised card.
- **Don't** use series colors as judgments about agents or outcomes.
- **Don't** replace readable labels with icon-only status or add a competing display face.
- **Don't** extend charts beyond recorded points or conceal historical failures with decorative success treatments.
