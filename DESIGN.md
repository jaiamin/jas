---
name: Agent sandbox
description: A compact dark workspace for inspecting agent simulations.
colors:
  ground: "#121916"
  surface: "#19211d"
  raised: "#243029"
  divider: "#344139"
  text: "#ecf1e9"
  secondary-text: "#acbbae"
  selection: "#b8d9c0"
  control-border: "#617766"
  map-ground: "#15201b"
  goal-text: "#c4d0c1"
  error-text: "#f1c4ad"
  error-ground: "#352b23"
  error-border: "#796049"
  food: "#a8ce83"
  energy: "#edc278"
  materials: "#84bdcf"
typography:
  body:
    fontFamily: "Roboto, sans-serif"
    fontSize: "13px"
  title:
    fontFamily: "Roboto, sans-serif"
    fontSize: "20px"
    fontWeight: 600
  detail:
    fontFamily: "Roboto, sans-serif"
    fontSize: "12px"
  section:
    fontFamily: "Roboto, sans-serif"
    fontSize: "14px"
    fontWeight: 600
  brand:
    fontFamily: "Roboto, sans-serif"
    fontSize: "17px"
  agent:
    fontFamily: "Roboto, sans-serif"
    fontSize: "19px"
  resource:
    fontFamily: "Roboto, sans-serif"
    fontSize: "15px"
  metadata:
    fontFamily: "Roboto, sans-serif"
    fontSize: "11px"
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

The user's dark workspace uses a muted field-notebook palette: forest ground `#121916`,
surface `#19211d`, raised surface `#243029`, divider `#344139`, text `#ecf1e9`, secondary
text `#acbbae`, selection `#b8d9c0`. Data uses food `#a8ce83`, energy `#edc278`, and
materials `#84bdcf`; amber marks degraded conditions. Facility connections and settler
markers are the single visual signature, and always represent actual state.

## Typography

Use NiceGUI's locally served Roboto, a 13px body, 12px detail text, 14px section labels,
and a restrained 20px run title. Numerals in run status and resources are tabular.
Spacing follows 4/8/12/16/24/28px. Reuse the framework font to keep assets and dependencies minimal.

## Layout

Borders divide three work areas: a 248px setup/saved-runs sidebar, a flexible map and history
area, and a 310px agent inspector. The header belongs to the active run: title/status,
Step and Play/Pause, model request status, usage, and the replay timeline. Events and Resources
share tabs below the map. Below 1100px, a menu button opens the setup drawer. Below 760px,
use the compact map and place the inspector below history. Keep run controls fixed.

## Components

Keep keyboard-accessible facility buttons alongside the clickable map. Show empty histories,
disabled terminal controls, request-in-flight controls, errors and replay state explicitly.
No external fonts or images are needed. UI tokens live in `src/agent_sandbox/viewer.css`.

## Do's and Don'ts

Avoid nested cards, decorative gradients, display effects or artificial telemetry.
Button labels describe real operations. Distinguish model execution from recorded replay. Never imply historical demo records came
from a model. New run creates a paused checkpoint; Step and Play send real API requests.
