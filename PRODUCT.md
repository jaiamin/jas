# JAS

<!-- impeccable:product-schema 1 -->

## Platform
web

## Users and purpose
Anyone designing, managing and interpreting experiments on model-controlled agents.
Create a protocol, choose/configure an environment, run controlled comparisons, inspect
agent decisions and consequences, and use evidence to plan the next experiment.

## Capabilities and constraints
Python-enforced environments, private observations, retained memory, matched runs,
immutable protocol revisions, spending reservations and exact replay. Agent proposes
reviewed protocols and interprets selected evidence with citations. Saving never runs.
Synthetic observations do not establish human validity, intent or model weight updates.
Installed environment mechanics are code-backed; parameters are editable in protocols.

## Design direction
Use default stock shadcn components and support changing the complete preset, including
fonts, colors and icons. Keep preset configuration and generated components authoritative;
see [Design](docs/DESIGN.md) for the workflow and app icon alignment step. Experiments and
environments remain core destinations; Agent helps design and interpret them. Preserve the
supplied JAS logo as a brand asset. Support both themes, mobile and keyboard navigation.
Keep the original Bricolage Grotesque font only for the top-left lowercase wordmark,
without a subtitle. Dark mode uses a graphite canvas/sidebar, raised gray cards
and menus, distinct muted surfaces and readable secondary text. Light mode uses
white surfaces. Primary actions use theme blue; selection uses a
subtle blue accent with a weaker hover state. Avoid redundant descriptive subtitles. Home starts with the shared
Agent composer for questions or experiment design and four experiment ideas. Keep
Home/Agent together above Workspace navigation; surface unfinished work and active
runs conditionally, with full experiment/run lists in their existing destinations.
Home uses a static neutral canvas with the shared light/dark theme tokens and a
thin gray divider below the composer. The title has no background tint or blur.
Keep the composer in its existing position and preserve everything below it.
Agent starts
with a centered heading and plain composer, suggestions below, and a recent-chat
popup beside New at the upper right. Keep history loading local to that popup.

## Working assumptions
The initial audience is a single researcher using a local workspace. Shared accounts,
hosted multi-tenant access and human predictive claims are outside this task.
