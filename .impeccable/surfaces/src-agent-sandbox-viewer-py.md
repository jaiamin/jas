---
version: 1
slug: "src-agent-sandbox-viewer-py"
primary_target: "src/agent_sandbox/viewer.py"
related_targets: ["src/agent_sandbox/viewer.css","src/agent_sandbox/sandboxes/colony_panel.py"]
---

# Evaluation workspace

Mode: Operate. Local experimenters browse and compare evaluations, watch live runs,
and inspect decisions. Preserve the shared runner and environment extension contract.

## Direction contract

THESIS: An evidence-first research index. Runs are the entry point; live monitoring is
one click away. Replace the permanent map/setup/inspector arrangement.

OWN-WORLD: Neutral ink ground, slate navigation, pale text and restrained ice-blue
selection. One locally served sans family, compact aligned tables, six-pixel controls.
Semantic amber/red/green describe outcomes; they do not decorate inactive controls.

STORY: Find a run, assess its outcome, inspect the decision that caused a change, or
select comparable runs. New run setup is separate from observation and analysis.

FIRST VIEWPORT: A compact navigation rail and a full-width run table beneath the Runs
heading, one New run action, search/status/environment filters and a comparison action.
Inside a run, one title/control row and a timeline precede tabbed work areas; metrics
and agent decisions lead, while environment-specific visualization has its own view.

FORM: Technical standards manual, grounded candidate 5; seed:cd922f482dd75720.
The signature move links a recorded decision to its exact turn and environment state;
comparison charts align metrics by turn. Code-led implementation.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
