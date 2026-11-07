# ASS handoff

Branch `feat/empirical-research-platform`; draft PR https://github.com/jaiamin/ass/pull/3.
Read README for setup, docs/ARCHITECTURE.md for boundaries, GLOSSARY.md for terminology,
DESIGN.md for visual tokens and benchmarks/reports/README.md for observed results.
EVALUATION.md records the completed evaluation plan. Superseded IMPLEMENTATION.md removed.

## Running

Main app: http://localhost:8080. Start with
`.venv/bin/ass --host 0.0.0.0 --port 8080` or `docker compose up --build`.
Current app uses `data/ass.sqlite3`; four user studies preserved. Never run two engines
against the same database. Credentials stay in .env/environment; never print them.
Python uses .venv. Native uv crashes on this sandbox kernel;
`.tools/uv-0.13.7.data/scripts/uv` works. QA Compose project and owned browser tab closed;
main 8080 remains running. Evaluation workers have finished.

## Implemented

React/TypeScript/shadcn; Python/FastAPI; SQLite WAL, immutable protocol revisions,
atomic checkpoints and explicit request reservations. Neutral sharp Geist UI, orange
selection, light/dark, compact tables and progressive configuration with browser drafts.
Seven deterministic rule systems: commons, trust exchange, coordination, institution,
bargaining, information and renewable resource. Independent communication channels;
episodic, notes, history and no-history memory controls; depleted initial stocks.
Planner scopes, optionally researches, drafts, validates and reviews. Production planner
and investigator default to Sol; participant default Luna. Evaluation uses GPT-6 Luna
for both planner and participants, without external search. No retries or substitutions.

## Evidence

Frozen application source c5db913: 221/230 strict live cases passed; 206 supported cases
completed both conditions; 413 completed runs, 5,190 exactly replayed turns. All 20
capability cases passed. All 464 recorded attempts, including 234 developmental attempts,
are in compressed reports with manifests. Raw DB/Inspect logs remain ignored in data/.
Evaluation ledger $3.677626 estimated/reserved; earlier task about $1.69, total about $5.36.
Do not delete/reset data/evaluation.sqlite3 or run overlapping benchmark processes.

Current benchmark v5 corrects five metric criteria and the generated task_count prompt.
Offline rescore 224/230 is post-audit, not an independent improvement. No application
runtime changes followed the frozen suite. The older history/holdout.json remains reserved.
147 backend tests, Ruff, ty, frontend Biome/five tests/build, 17 Docker browser workflows,
Docker health/build/restart persistence pass. CI passed frozen source. Nineteen existing
runs replayed 318 turns with zero model requests. Both bounded Impeccable reviews: ship.

## Limits

Trusted single-user deployment; no live Anthropic or large-scale-load claim. Nine primary
strict failures remain recorded. There were no live sanctions, appeals or bargaining exits;
deterministic transition coverage does not establish behavioral efficacy. Work currently
pays more than waiting. Human realism, psychological motives, enterprise demand and causal
validity are unestablished. Add independently tested mechanics and calibrated reference
protocols before broader claims. PRODUCT.md has pre-existing schema drift; preserved here.
