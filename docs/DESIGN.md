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
  dark-background: "oklch(0 0 0)"
  dark-foreground: "oklch(0.985 0 0)"
  dark-card: "oklch(0 0 0)"
  dark-primary: "oklch(0.546 0.245 262.881)"
  dark-primary-foreground: "oklch(0.985 0 0)"
  dark-muted: "oklch(0.269 0 0)"
  dark-muted-foreground: "oklch(0.708 0 0)"
  dark-accent: "oklch(0.282 0.091 267.935)"
  dark-accent-foreground: "oklch(0.882 0.059 254.128)"
  dark-border: "oklch(1 0 0 / 10%)"
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

JAS uses default stock shadcn components and preset styling. The current preset is
`b2fA`: Nova, Radix, neutral, Geist and Lucide, with the user-requested surfaces,
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

Page, sidebar, card and overlay surfaces use pure white in light mode and pure
black in dark mode, as explicitly requested. These shared theme tokens apply to
both navigation sidebars and every view.
Selection uses a subtle blue accent. Hover uses half-strength accent, while the
selected item keeps its full accent on hover. Both are shared semantic tokens.
Send and New experiment use the primary Button variant. Primary actions use a
shared blue primary token with a light foreground in both themes; secondary surfaces, muted text,
borders, focus and destructive states use their corresponding semantic tokens.
Keep foreground/background pairs together when composing components.
Shared cursor rules give enabled actions, links, labels and portalled menu/select
items a pointer. Text entry keeps its text cursor; disabled controls are excluded.

Charts use the five chart tokens. Keep legend text in the foreground color so it
remains readable independently of each series color. Labels and distinct line
patterns identify series; status text and icons supplement color in tables.

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
A stock SidebarSeparator with 16px edge insets aligns with the navigation icons
between primary and workspace groups. The separator above the local-workspace
footer spans the full sidebar width. Only the navigation section separator hides in the collapsed rail. The full-width
footer divider and continuous divider under the top bars remain. Footer button
heights stay 32px for Settings and 48px for the workspace menu in both states, so
their vertical positions and padding do not change when labels disappear. Navigation glyphs and collapse control are 15px. Selected sidebar icons fill,
with the requested exceptions: the stock Bot stays outlined, House fills only
its door, Layers2 fills only its upper layer, Settings fills only its center circle,
and FlaskConical fills only its liquid. The flask fill stays at the icon boundary;
conversation rows are text-only. Do not invent accounts or organizations.
Navigation becomes a Sheet on mobile.

The global controls and desktop brand headers share `--workspace-header-height` (52px),
with one continuous bottom divider. The global bar has no title or breadcrumb;
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
The Agent header pairs its name with the stock outlined Bot. No duplicate creation/browse
buttons appear in the introduction. Its independent text-only conversation Sidebar appears at 1100px and above, with a Sheet
below that breakpoint. Decisions and evidence stack below 1440px.

Home uses a full-width composer section with a faint animated pixel grid, the
explicit decorative exception requested for this surface. The grid follows the
foreground token, never captures input, and remains static with reduced motion.
The Home composer has a 672px maximum width and 88px minimum text-entry height.
Heading top spacing is 80px on mobile and 96px on desktop. A 3:2 grid split
places three fifths of the composer within the backdrop and two fifths below its
bottom edge; the opaque surface keeps the grid out of the text field. A stock
`shadow-lg` gives the composer soft depth along its sides and bottom.
Home has no context selector: its general prompt lets Agent answer or create a
validated experiment proposal. Scope selection stays on Agent. Five experiment
suggestions fill the draft without submitting. Under the Suggestions heading,
they share one rounded ItemGroup border with Separator dividers: equal columns
on wide screens, stacked rows on smaller screens. Stock ghost Buttons keep the
whole section of each suggestion keyboard-accessible, with icon, title and description. An explicit send creates one chat
and opens that saved conversation.
A late response leaves subsequent navigation intact.

Below suggestions, show up to three active runs only when underway, one latest
local editor draft when present, and four experiments ordered by creation time.
Keep the manual New experiment action available even in the empty state. Full
record lists and draft management remain on their dedicated destinations.

## Elevation & Depth

Use shared theme tokens for surfaces, including the requested pure white/black
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

Editors group fields in Accordions with an execution summary. Settings uses three
Cards. Agent uses MessageScroller, Message, Bubble and Trace. Trace content shows
public server stages, scope and sources, never private model reasoning. Completed
protocol proposals appear in a Card for review before saving or running. Preserve
draft identity, pending output, evidence scope and recoverable errors when
changing presentation. Saving a protocol never executes it.

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
   custom maximum, Slider thumb labels, Tabs orientation, Breadcrumb current-item
   semantics, Chart style children and stable keys, valid Field/Item/InputGroup
   roles, SidebarSeparator horizontal width respecting its edge insets,
   InputGroup disabled styling scoped to its input control (a disabled
   submit button must not dim an editable composer), and narrow lint annotations. Keep chart legend text readable and retain
   distinct line patterns.
   Retain the requested 4px gaps between tabs and sidebar items, continuous header
   divider, pure white/black surface tokens, CardFooter card surface, subtle blue
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
