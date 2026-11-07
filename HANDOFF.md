# ASS handoff

Branch: `feat/empirical-research-platform`. Fresh React/TypeScript and Python local platform;
old NiceGUI source removed, ignored old databases retained. Read README, PRODUCT and
IMPLEMENTATION first. Architecture/research details live in docs/; ontology in GLOSSARY.
Draft PR: https://github.com/jaiamin/ass/pull/3. Main implementation checkpoint: `aede6bd`.

Data: `data/ass.sqlite3`, schema v2. Never run two engines against this database. Native uv
crashes on this sandbox kernel; `.tools/uv-0.13.7.data/scripts/uv` works. Project environment
is `.venv`. CLI: `.venv/bin/ass --host 0.0.0.0 --port 8080`. Docker uses its own volume.
Provider keys remain in the existing environment/.env and must never be printed or committed.

Verified: 36 Python tests, 3 frontend unit tests, 5 keyless browser workflows, lint/types/build,
Docker health and persistence, 19 live completed runs with 318 exact replayed turns.
Live ledger estimated/reserved $1.242269 of the authorized $25 maximum; no further paid
requests needed. Benchmarks/results.json preserves attempts and limitations. GPT-6.1 Luna
is unavailable (HTTP404); requested follow-up is not silently replaced by GPT-6 Luna.

Final visual evidence is `.impeccable/review/final/` (ignored). This is a code-led Operate
surface; `.impeccable/surfaces/frontend.md` holds its direction. Orange accent, neutral
white/charcoal themes and no green were the user's final design steering. Detector ran
once with no findings. Fresh review covered all 40 required captures; both copy fixes
were scored resolved. DESIGN.md and the token sidecar match the shipped source. Reviewer
and documenter used the skill's degraded contracts in fresh native agent handoffs.

The new frontend/API is running on8080; disposable QA instances on8082 are stopped after
verification. The outgoing Git index passed Gitleaks. Superseded design artifacts, old
prototype bytecode, temporary install files, duplicate ignore configuration and unused UI
code/styles were removed. The generated seed behind the earlier workspace-scan finding was
discarded; the current design seed and final review evidence remain. Cleanup preserves the
rendered UI exactly at desktop/mobile in both themes. All local checks passed; the preceding
implementation head also passed GitHub CI.
No merges/default-branch pushes. Future work should begin with
reserved holdout scenarios and duration/inventory/contract mechanics supported by explicit
rules and independent validation, not arbitrary model-authored consequences.
