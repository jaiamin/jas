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

## Working assumptions
The initial audience is a single researcher using a local workspace. Shared accounts,
hosted multi-tenant access and human predictive claims are outside this task.
