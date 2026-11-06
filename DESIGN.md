---
name: Agent sandbox evaluation workspace
description: A restrained dark research interface for comparing runs and inspecting recorded evidence.
colors:
  ground: '#101215'
  surface: '#171b20'
  raised: '#20262d'
  line: '#303740'
  ink: '#e7e9ed'
  muted: '#adb5c0'
  accent: '#85b8d2'
  accent-ground: '#20333f'
  success: '#8ebca7'
  warning: '#d6b57b'
  danger: '#e0a09b'
  series-lavender: '#bcadcf'
  control-border: '#4b5866'
  sidebar: '#171e25'
  sidebar-line: '#303c48'
  nav-ink: '#bdc8d4'
  nav-selected: '#273948'
  nav-selected-ink: '#d1e4ef'
  action-ink: '#101b23'
  row-hover: '#1b222a'
  status-neutral: '#a6b2c0'
  empty-border: '#42505e'
  error-ink: '#f0c0bc'
  error-ground: '#312325'
  error-line: '#674448'
  chart-line: '#39434e'
  chart-grid: '#29313a'
  map-line: '#465462'
typography:
  title:
    fontFamily: Roboto, sans-serif
    fontSize: 24px
    fontWeight: 550
    lineHeight: 1.3
    letterSpacing: -0.5px
  title-compact:
    fontFamily: Roboto, sans-serif
    fontSize: 22px
    fontWeight: 550
    lineHeight: 1.3
    letterSpacing: -0.5px
  heading:
    fontFamily: Roboto, sans-serif
    fontSize: 16px
    fontWeight: 550
    lineHeight: 1.4
  action:
    fontFamily: Roboto, sans-serif
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.55
  subheading:
    fontFamily: Roboto, sans-serif
    fontSize: 14px
    fontWeight: 550
    lineHeight: 1.55
  body:
    fontFamily: Roboto, sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.55
  detail:
    fontFamily: Roboto, sans-serif
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: Roboto, sans-serif
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.55
  metadata:
    fontFamily: Roboto, sans-serif
    fontSize: 11px
    fontWeight: 400
    lineHeight: 1.55
  button:
    fontFamily: Roboto, sans-serif
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.715
    letterSpacing: 0px
  brand:
    fontFamily: Roboto, sans-serif
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.55
    letterSpacing: -0.2px
  mono:
    fontFamily: ui-monospace, SFMono-Regular, Consolas, monospace
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.6
rounded:
  control: 6px
  field: 4px
spacing:
  '6': 6px
  '8': 8px
  '10': 10px
  '12': 12px
  '14': 14px
  '16': 16px
  '18': 18px
  '20': 20px
  '22': 22px
  '24': 24px
  '28': 28px
  '32': 32px
  '40': 40px
components:
  button-primary:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.action-ink}'
    typography: '{typography.button}'
    rounded: '{rounded.control}'
    padding: 4px 15px
    height: 36px
  button-outline:
    backgroundColor: transparent
    textColor: '{colors.accent}'
    typography: '{typography.button}'
    rounded: '{rounded.control}'
    padding: 4px 16px
    height: 36px
  button-ghost:
    backgroundColor: transparent
    textColor: '{colors.accent}'
    typography: '{typography.button}'
    rounded: '{rounded.control}'
    padding: 4px 16px
    height: 36px
  input:
    backgroundColor: '{colors.ground}'
    textColor: '{colors.ink}'
    rounded: '{rounded.field}'
    padding: 0 12px
    height: 40px
  navigation:
    backgroundColor: transparent
    textColor: '{colors.nav-ink}'
    typography: '{typography.button}'
    rounded: '{rounded.control}'
    padding: 0 12px
    height: 38px
  navigation-selected:
    backgroundColor: '{colors.nav-selected}'
    textColor: '{colors.nav-selected-ink}'
    typography: '{typography.button}'
    rounded: '{rounded.control}'
    padding: 0 12px
    height: 38px
  status:
    backgroundColor: transparent
    textColor: '{colors.ink}'
    typography: '{typography.label}'
  table:
    backgroundColor: transparent
    textColor: '{colors.ink}'
    rounded: '{rounded.control}'
  facility:
    backgroundColor: '{colors.raised}'
    textColor: '{colors.ink}'
    rounded: '{rounded.control}'
    width: 148px
    height: 78px
  facility-selected:
    backgroundColor: '{colors.accent-ground}'
    textColor: '{colors.ink}'
    rounded: '{rounded.control}'
    width: 148px
    height: 78px
  evidence:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    typography: '{typography.mono}'
    rounded: '{rounded.control}'
    padding: 14px
  error:
    backgroundColor: '{colors.error-ground}'
    textColor: '{colors.error-ink}'
    typography: '{typography.detail}'
    rounded: '{rounded.control}'
    padding: 14px 18px
---

# Design System: Agent sandbox evaluation workspace

## Overview

**Creative North Star: "The Research Index"**

The Research Index gives experiment records the clarity of a technical standards manual. Neutral ink grounds, a slate navigation rail, thin rules and aligned columns make dense evidence readable. Ice-blue selection identifies the current route or action; outcome color remains functional.

Use one quiet sans family and direct labels. Prefer continuous work areas and progressively disclosed detail over repeated panels. Maps and charts represent recorded data and remain subordinate to the shared evaluation interface. This is an operating workspace: selected turns, model input, checkpoint state and replay must remain visibly distinct.

**Key Characteristics:**
- Compact, aligned information with restrained hierarchy.
- Flat dark surfaces with thin structural rules.
- Ice-blue selection and explicit semantic outcomes.
- Recorded evidence with clear turn and state labels.
- Responsive task layouts rather than scaled-down desktop views.

## Colors

The palette combines neutral ink and slate with a pale-blue selection color. The frontmatter is the normative source for exact values; names below describe their assignments.

### Primary

- **Ice blue** (`accent`): primary actions, links, active items, the first chart history and selected facility outlines.
- **Blue selection ground** (`accent-ground`): selected facility fill; pair with the accent outline.
- **Deep action ink** (`action-ink`): readable text and agent initials on the pale-blue fill.

### Secondary

- **Quiet sage** (`success`), **muted amber** (`warning`) and **soft coral** (`danger`): completed, paused or degraded, and failed conditions. Running and playback use the accent. Text labels always accompany status dots.
- **Series lavender** (`series-lavender`): a second comparison history. Amber and sage may distinguish additional chart histories; these are data series, not status assertions.
- **Error ink, ground and line** (`error-ink`, `error-ground`, `error-line`): a contained recovery message rather than a full-screen alarm.

### Neutral

- **Neutral ink ground** (`ground`), **slate surface** (`surface`) and **raised slate** (`raised`): workspace, table headers or raw evidence, and menus/dialogs or unselected map nodes.
- **Pale ink** (`ink`) and **muted steel** (`muted`): primary reading and supporting labels.
- **Structural line** (`line`) and **control border** (`control-border`): work-area divisions and outlined controls.
- **Navigation slate** (`sidebar`, `sidebar-line`, `nav-ink`): a distinct rail with readable secondary information. **Selected navigation** (`nav-selected`, `nav-selected-ink`) has its own quiet fill and text.
- **Row hover** (`row-hover`), **neutral status** (`status-neutral`) and **empty border** (`empty-border`): interaction, archived/neutral state and the empty-result boundary.
- **Chart line/grid** (`chart-line`, `chart-grid`) and **map line** (`map-line`): subtle data scaffolding that remains below the data itself.

**The Functional Color Rule.** Use the accent for navigation, selection and actions; use success, warning and danger only for meaningful status or data. Series lavender distinguishes recorded chart histories.

Tonal ramps in the sidecar are derived preview metadata. They do not authorize new interface colors or replace the literal implemented tokens.

## Typography

**Display and body font:** locally served Roboto, falling back to sans-serif. There is no separate decorative display face.

**Code font:** ui-monospace, SFMono-Regular, Consolas, monospace for raw evidence and identifiers. Material Icons are locally served interface assets, not a text face or a replacement for labels.

**Character:** compact, familiar and deliberately quiet. The type scale distinguishes actions, evidence and metadata without adding a second typographic voice.

### Hierarchy

- **Title:** page titles use the title role; the compact title replaces it at the narrow breakpoint.
- **Heading:** section titles and h2 headings share heading. Action names use the same size with the action weight, and subheadings use subheading.
- **Body / detail:** body establishes the page baseline. Dense records use detail-size text; rationale uses its more generous detail line height. Supporting descriptions use the same size with line height (1.65) and a maximum measure (70ch).
- **Label / metadata:** labels carry status, turns and field descriptions; metadata carries secondary table information. Avoid using the smallest role for primary decisions.
- **Button / brand:** sentence-case controls use button; the navigation identity uses brand.
- **Mono:** raw JSON uses mono and a bounded scroll region. Numerical metrics and run facts use tabular figures.

All implemented role values are in the frontmatter. Framework icon sizes and checkbox geometry are not additional text hierarchy roles.

**The Quiet Hierarchy Rule.** Use the page title once, section headings for work areas, and smaller muted labels for supporting metadata. Preserve tabular numerals in comparable values.

## Layout

A compact navigation rail (208px) sits beside a shared workspace. The shell header has a minimum height (52px) and holds a compact breadcrumb. The main page is centered with a maximum width (1600px), base padding (28px 32px 48px), and wider inline padding (48px) from the wide breakpoint (1600px). A single page title and its actions establish hierarchy; use supporting copy only when it explains a decision or state.

The run library integrates search, filters, comparison and refresh into the table's continuous frame. The toolbar has padding (14px 16px) and gaps (10px). Search grows from a minimum width (180px) to a maximum (320px); other filters start at (140px). Keep setup separate from observation: its page has a maximum width (744px) and a two-column form with gaps (20px). Configuration uses two equal columns with gaps (28px 40px). Comparison places its summary table beside metric history (1.1fr / 1fr) with a gap (28px). Environment catalogs present scenarios as aligned table rows under a section heading.

Run analysis uses a flexible chart and outcome column (1.6fr / 1fr, with a 255px minimum secondary column) separated by a gap (28px). Decisions use an evidence table and inspector (1.15fr / 1fr, with a 300px minimum inspector) with a gap (24px). The inspector has a left rule and inset (24px). Facility views use their own data layout (1.7fr / 1fr, minimum 250px secondary column) with a gap (24px), without changing the shared navigation.

At the navigation breakpoint (1100px), use the menu drawer, page padding (24px 28px 40px), and a tighter analysis gap (24px). Destination selection closes an overlay drawer; the desktop rail stays persistent. At the narrow breakpoint (760px), page padding becomes (20px 16px 36px), search takes a whole row, filters wrap, and forms, analysis, decisions, configuration, comparison and environment layouts stack. The inspector moves below with a top rule and inset (25px). Preserve dense table columns inside their own horizontal scroller. Ordinary analysis charts shorten from (300px) to (250px); comparison history retains its dedicated height (340px). The facility map changes to a dedicated narrow composition rather than shrinking its labels.

The spacing scale records reused implementation steps rather than imposing an artificial uniform grid. Related controls stay close; work areas receive larger gaps. Preserve content order and task continuity when stacking.

## Elevation & Depth

The interface is flat by default. Ground, surface, raised tone, and thin borders provide depth; the main table has no shadow and button shadow pseudo-elements are removed. Menus and dialogs use the raised tone while retaining their framework overlay behavior. Do not promote framework overlay shadows into a new decorative shadow vocabulary.

**The Flat Structure Rule.** Separate ordinary work areas with spacing, tonal contrast and thin rules. Do not add shadows to the table, buttons or evidence panels.

The implementation adds no custom motion choreography. Framework controls provide their normal interaction feedback. The reduced-motion media query sets transition and animation duration to zero; new interaction specimens must respect that preference.

## Shapes

Controls, framed tables, raw evidence, errors and facility nodes share gently rounded corners through the control radius. Outlined text fields retain the framework's smaller field radius. Status markers are circles (6px); they remain adjacent to status text. Tables use one continuous outer frame with internal rules. Avoid surrounding every metric or inspector section with another rounded container.

## Components

### Buttons

Primary actions use ice blue with deep action ink, minimum height (36px), inline padding (15px), and the shared control radius. Outlined comparison and secondary actions use a thin control border; ghost actions remain transparent. Controls are sentence case. Preserve framework hover/press feedback and the global visible focus outline (2px accent, offset 3px). Disabled controls have opacity (0.45) and cannot initiate work. Do not substitute a new hover color for every action.

### Inputs / Fields

Use outlined dense fields with the ground fill, pale text, muted labels, a control-border stroke, and the field radius. Dense fields have height (40px). Search has an accessible name, a descriptive placeholder and a clear action. Focus, hover, disabled and validation behavior remain the framework's; the caret and focused primary treatment use the accent. Keep error copy near the setup action.

### Navigation

Rail items have minimum height (38px), inline padding (12px), and compact icons (19px). The selected route uses selected-navigation fill and ink; hover retains framework feedback and keyboard focus remains visible. Mobile navigation closes after a route is chosen. Run work-area tabs use sentence case with a minimum height (42px), and their selected state uses pale ink for the label and underline.

### Status labels

Status is an inline label with a small circular marker, a gap (7px), and the label role. Complete, paused and failed map to their semantic tokens; running and recorded playback use the accent; other states remain neutral. Never rely on the dot alone. This is the system's tag primitive; do not turn it into a decorative pill.

### Data tables

A single rounded frame contains a flat table. Header labels are muted and have a row height (40px). Plain rows have height (42px), detail-size text and padding (10px 16px); library rows use height (56px) and vertical padding (8px). These are base dimensions: wrapped or multiline content may grow the row. Scenario rows retain vertical padding (14px) for descriptions and setup actions. Secondary run context sits below its name with a small gap (2px). Hover uses row-hover. A run's label is an interactive text link, with accent and underline on hover; preserve visible keyboard focus. Selecting at least two runs enables comparison; choosing Compare validates that their environments are compatible. Contained scrolling preserves columns.

### Evidence inspector

Use spacing and rules, not nested cards. Name the decision's own turn and its typed action. Label the selected checkpoint as state after its turn, and label private memory and reconstructed observation accordingly. A separate disclosure exposes exact recorded model input from the decision frame. A decision can be older than the selected checkpoint; both labels must remain visible. Raw evidence uses the evidence surface, shared control radius, padding (14px), and a maximum scroll height (360px). It is read-only. State facts form a compact wrapping row with gaps (16px) and vertical padding (12px). Evidence disclosures use a thin top rule, minimum summary height (40px), and vertical padding (10px).

### Charts and environment containers

Charts plot actual recorded turns with line width (2px), do not animate, and stop at each run's final checkpoint. Multiple-history charts reserve a bottom band for the scrollable legend separately from the Turn axis name. Colors distinguish series without implying a ranking. Facility cards in the SVG are data nodes (148px by 78px) with a thin outline (1.5px), control-radius corners, and selected fill/outline. Integrity uses neutral, warning or danger; agent markers are real occupants. A separate labeled facility selector and agent buttons provide another navigation route. Occupant evidence uses compact ruled rows with vertical padding (8px), a name button, and one supporting health/stamina line (12px), inset (28px) to align with the name after its icon. Maps and charts are drawn data, with no raster assets.

### Empty and error states

An empty library or work area uses a centered dashed frame, minimum height (280px), padding (48px 24px), and a concise route forward. Filtered tables use a compact inline no-results message with a filter-recovery hint. A recoverable error uses the error palette and padding (14px 18px), explains what happened, and states whether the last checkpoint is safe. Distinguish live execution from recorded replay and historical demo records. New run creation starts paused; subsequent execution controls must convey when a real model request can occur.

## Do's and Don'ts

### Do:

- **Do** use the shared neutral palette and the locally served Roboto family for interface text.
- **Do** preserve table alignment, tabular numbers and contained horizontal scrolling for dense records.
- **Do** label a recorded decision with its own turn and label checkpoint state as state after its selected turn.
- **Do** expose saved model input separately from reconstructed post-turn observation and memory.
- **Do** retain visible focus, meaningful disabled states, empty states and recoverable error copy.
- **Do** offer a labeled selector alongside the clickable facility map.

### Don't:

- **Don't** restore the permanent map, setup and inspector arrangement as the platform shell.
- **Don't** repeat summary values across nested cards or turn supporting metadata into competing headings.
- **Don't** use semantic status color as decoration on inactive controls.
- **Don't** fabricate scores, model rankings, telemetry or chart continuation beyond recorded history.
- **Don't** introduce raster backgrounds, decorative gradients, display effects or new icon styles.
