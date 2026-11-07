# ASS handoff

Branch `feat/empirical-research-platform`; draft PR https://github.com/jaiamin/ass/pull/3.
Read README for setup, docs/ARCHITECTURE.md for boundaries, GLOSSARY.md for terminology,
DESIGN.md for current visual tokens and docs/INTERFACE.md for the redesign evidence.

## Running

Main app: http://localhost:8080. Start with
`.venv/bin/ass --host 0.0.0.0 --port 8080` or `docker compose up --build`.
The local app uses `data/ass.sqlite3`; five user studies and 32 runs are preserved.
Never run two engines against one database. Credentials remain in .env/environment.
Python uses .venv. Native uv crashes on this sandbox kernel;
`.tools/uv-0.13.7.data/scripts/uv` works. Disposable UI QA services and browser are closed;
main 8080 remains running. Evaluation workers have finished.

## Implemented

React/TypeScript/shadcn; Python/FastAPI; SQLite WAL, immutable protocol revisions,
atomic checkpoints and explicit request reservations. Seven deterministic rule systems:
commons, trust exchange, coordination, institution, bargaining, information and renewable
resource. Independent communication channels, private observations and memory treatments.
Planner scopes, optionally researches, drafts, validates and reviews. Production planner
and investigator default to Sol; participants default to Luna. No model substitutions.

Every view now shares source shadcn controls, compact collapsible navigation, neutral
light/dark themes and restrained orange. Centered Home composer, progressive editor task
tabs, recoverable drafts, full-width comparison and linked replay/evidence. The contextual
assistant has explicit experiment/run selection, real evidence activity, bounded follow-up
context and an anchored composer; desktop content reflows beside it. Run identities include
immutable revision numbers. Attachments await an ingestion workflow.

## Verification

Current interface: 147 backend tests, Ruff, ty, frontend Biome/five unit tests/production
build and 20 keyless browser workflows pass. Nineteen captures cover 1280/1440px desktop,
tablet and mobile. Final Docker build, health and browser entry smoke pass. No paid model
calls during this redesign; investigator/planner states use controlled test responses.
Design documentation and the tracked token sidecar match current source. Impeccable
returned `ship` for all four scored finish-review fixes; no regressions were observed.

Earlier frozen application c5db913: 221/230 strict live GPT-6 Luna cases passed;
206 supported cases completed both conditions, 413 runs and 5,190 exactly replayed turns.
All 20 capability cases passed. All 464 recorded attempts remain in compressed reports;
see benchmarks/reports/README.md and EVALUATION.md. Evaluation estimated/reserved usage
was $3.677626; earlier task about $1.69, total about $5.36. Do not delete/reset ignored
`data/evaluation.sqlite3` or run overlapping benchmark processes. Suite v5 offline rescore
224/230 is post-audit evidence, not independent improvement. Nine strict failures remain.
The current UI and investigator changes postdate that frozen evaluation.

## Limits

Trusted single-user deployment; no live Anthropic or large-scale-load validation. Human
realism, psychological motives and causal validity are unestablished. There were no live
sanctions, appeals or bargaining exits in the frozen suite. Add independently tested
mechanics and calibrated reference protocols before broader claims. PRODUCT.md has
pre-existing schema drift; preserved outside this interface task.
