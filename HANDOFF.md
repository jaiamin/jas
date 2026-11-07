# ASS handoff

Branch: `feat/empirical-research-platform`; draft PR https://github.com/jaiamin/ass/pull/3.
React/TypeScript frontend and Python/FastAPI backend. Read README, PRODUCT, IMPLEMENTATION;
architecture/research in docs/, terminology in GLOSSARY, visual tokens in DESIGN.

Main app: http://localhost:8080; CLI `.venv/bin/ass --host 0.0.0.0 --port 8080`.
Data: `data/ass.sqlite3`, schema v2. Never run two engines against it. Existing ignored
prototype databases are retained. Provider credentials stay in .env/environment; never print
or commit them. Docker uses a separate persistent volume. Native uv crashes on this sandbox
kernel; `.tools/uv-0.13.7.data/scripts/uv` works. Python environment is `.venv`.

Current change: neutral/sharp Geist UI, orange selections, footer settings/theme, contextual
breadcrumbs, progressive editor and recoverable browser drafts. Planner scopes size/duration,
optionally researches public methods, drafts, validates and critiques before human review.
AI proposal provenance survives revisions/exports. No provider retries or substitute models.

Verification: 41 backend tests, 5 frontend tests, 9 keyless browser workflows, lint/types/build;
Docker build/health and restart retained all 15 QA studies. Final design review scored all three material fixes resolved; docs/tokens match source.
Current captures in .impeccable/review/final are ignored; verdict in neutral-verdict.md.
The staged secret scan passed. Disposable QA and owned browser tabs are closed; 8080 stays up.
Prior 19 live runs replayed 318 turns. New AI-proposed two-agent run completed 24 turns and
replayed exactly; proposal export verified. benchmarks/planner-smoke.json preserves five
planner attempts, including timeout and capability-decline failures, then their explicit tests.
New live ledger $0.427889 estimated/reserved; previous app ledger about $1.26, below authorized $25.
GPT-6.1 Luna remains unavailable (404); agent default is GPT-6 Luna, planner/investigator Sol.

Limits: trusted single-user deployment, three explicit adapters, no human validity, live Anthropic
or large-load claim. Holdouts remain reserved. Add one independently tested environment
mechanism at a time. A plausible narrative or revised coverage rubric is not scientific validity.
