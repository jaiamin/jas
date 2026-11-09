---
name: JAS
description: Stock shadcn components for a local agent experiment workspace.
colors:
  light-background: "oklch(1 0 0)"
  light-foreground: "oklch(0.145 0 0)"
  light-card: "oklch(1 0 0)"
  light-primary: "oklch(0.205 0 0)"
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
  dark-primary: "oklch(0.922 0 0)"
  dark-primary-foreground: "oklch(0.205 0 0)"
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
`b2fA`: Nova, Radix, neutral, Geist and Lucide, with the user-requested surface
colors and wordmark below. Preserve the supplied
[`logo.svg`](../frontend/public/logo.svg). The top-left lowercase `jas` wordmark
alone uses the original locally hosted Bricolage Grotesque subset at 22px/800,
without a subtitle. All other interface text follows the preset font.
The compact brand link covers only the logo and wordmark, aligns with navigation
icons, and has no hover fill, underline or movement on activation.
The 20px logo stays centered and uncropped when navigation collapses.

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
Primary actions use the primary/foreground pair; secondary surfaces, muted text,
borders, focus and destructive states use their corresponding semantic tokens.
Keep foreground/background pairs together when composing components.

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

The stock Sidebar supplies workspace navigation: Experiments, Runs, Environments
and Agent. Its footer opens the local workspace menu with Settings and appearance.
Do not invent accounts or organizations. Navigation becomes a Sheet on mobile.

The breadcrumb header is 56px high. Ordinary pages use a centered 1280px maximum
width and 16px, 24px or 32px responsive gutters. Tables scroll within their own
containers. The Agent page fills the remaining viewport, with an independently
scrolling transcript and a composer below it; both use a 768px maximum width.
Its independent conversation Sidebar appears at 1100px and above, with a Sheet
below that breakpoint. Decisions and evidence stack below 1440px.

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
2. Align the stock reexports in `src/components/icons.ts` with the resulting
   `components.json` `iconLibrary`, updating dependencies as needed. The CLI updates
   generated UI imports; it does **not** migrate these semantic app reexports
   automatically. The official `shadcn migrate icons` handles concrete icon imports,
   not this reexport mapping. Keep stock icons without custom drawing or a runtime
   icon resolver.
3. Preserve nonvisual fixes if regeneration overwrites them: Progress bounds and
   custom maximum, Slider thumb labels, Tabs orientation, Breadcrumb current-item
   semantics, Chart style children and stable keys, valid Field/Item/InputGroup
   roles, and narrow lint annotations. Keep chart legend text readable and retain
   distinct line patterns.
   Retain the requested 4px gaps between tabs and sidebar items, centered header
   divider, pure white/black surface tokens, CardFooter card surface, subtle blue
   selection with weaker hover, and dedicated wordmark font unless superseded.
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
  Keep the explicit surface, selection, spacing and wordmark exceptions above
  when applying a preset.
- **Don't** treat snapshot values as constraints on the next preset.
- **Don't** display fabricated activity, private reasoning or unsupported empirical outcomes.
