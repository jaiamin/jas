---
name: Agent sandbox
description: A compact dark workspace for inspecting agent simulations.
colors:
  ground: "#121c18"
  surface: "#19251f"
  raised: "#223129"
  divider: "#35463b"
  text: "#ecf1e9"
  secondary-text: "#acbbae"
  selection: "#b8d9c0"
  food: "#a8ce83"
  energy: "#edc278"
  materials: "#84bdcf"
typography:
  body:
    fontFamily: "Roboto, sans-serif"
    fontSize: "14px"
  title:
    fontFamily: "Roboto, sans-serif"
    fontSize: "21px"
    fontWeight: 600
rounded:
  control: "5px"
  map: "6px"
spacing:
  small: "8px"
  medium: "16px"
  large: "24px"
---

# Viewer design

## Overview

An operating workspace for watching and inspecting one simulation. Keep standard controls,
an uninterrupted map and event history, and a consistent right-hand agent inspector.
On narrow screens the inspector follows the map; run controls remain sticky.

## Colors

The user's dark workspace uses a muted field-notebook palette: forest ground `#121c18`,
surface `#19251f`, raised surface `#223129`, divider `#35463b`, text `#ecf1e9`, secondary
text `#acbbae`, selection `#b8d9c0`. Data uses food `#a8ce83`, energy `#edc278`, and
materials `#84bdcf`; amber marks degraded conditions. Facility connections and settler
markers are the single visual signature, and always represent actual state.

## Typography

Use NiceGUI's locally served Roboto, a 14px body, 13px detail text, 16px section labels,
and a restrained 21px application title. Numerals in run status and resources are tabular.
Spacing follows 4/8/12/16/24/28px. Reuse the framework font to keep assets and dependencies minimal.

## Layout

Borders divide work areas. Keep the map and event history in the main area, with agent details
on the right. Below 900px, place the inspector directly after the map, ahead of history.
Below 480px, use the compact map coordinates so facility labels remain readable.
Run controls stay sticky.

## Components

Keep keyboard-accessible facility buttons alongside the clickable map. Show empty histories,
disabled terminal controls, request-in-flight controls, errors and replay state explicitly.
No external fonts or images are needed. UI tokens live in `src/agent_sandbox/viewer.css`.

## Do's and Don'ts

Avoid nested cards, decorative gradients, display effects or artificial telemetry.
Button labels describe real operations. Keep paid opt-in, saved replay and live execution distinct.
