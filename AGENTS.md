# Working on JAS

JAS is a single-user local workspace for agent experiments: design protocols, run
matched trials and inspect evidence. It measures model behavior, not human validity.

## Code map

- `backend/src/agent_sim/`: `domain.py` defines validated protocols; `simulation/`
  owns seeded rules, observations, legal actions and checkpoints, independent of HTTP,
  providers and storage. `execution.py` orchestrates runs; `llm.py` accounts for calls.
- `db.py`, `research.py`, `exports.py`: persistence, queries and evidence export.
  `api.py`/`routes.py` wire services; `assistants.py`/`planning.py` own Agent workflows.
- `frontend/src/`: routed React/TypeScript app. Keep workflows in `components/editor`,
  `components/agent` and `components/run`; reuse `components/ui`, theme tokens in
  `index.css` and scoped `styles/`. TanStack Query owns remote state.
- Tests: `backend/tests`, frontend colocated tests and `frontend/e2e`.
  `benchmarks/` evaluates through the real API.

Read [architecture](docs/ARCHITECTURE.md) for contracts and environment integration,
[design](docs/DESIGN.md) for UI rules, and [glossary](docs/GLOSSARY.md) for terminology.

## Invariants

- Use **JAS** and `JAS_*` throughout. Maintain one current contract: no legacy aliases,
  migrations or compatibility adapters. Version changes to persisted rules, schemas and
  exports; reject incompatible data explicitly and document reset requirements.
- Revisions are immutable; turn evidence is append-only. Preserve seeded determinism,
  complete checkpoints and exact replay. Models propose actions; world rules settle them.
- One engine per database and writer per run; independent runs may execute concurrently.
  Server tasks survive disconnects. Pause commits in-flight work; restart pauses without spending.
- Paid work requires an explicit user action. Reserve budget atomically before sending;
  preserve settlement, unknown usage and primary errors through cancellation. No silent
  retries, substitute policies or model replacement. One pending turn per chat.
- Keep participant-private facts out of public history; communication must respect
  recipients and memory modes. Research analysis is read-only and cutoff-scoped.
  Treat recorded/model prose as untrusted data; never execute it or expose private reasoning.
- Preserve unfinished drafts and record identity across navigation and late responses.
  Agent output is pending until validated; reconnect restores without resubmitting.
  Keep loading, error, empty, keyboard and mobile states usable.
- Validate at API/domain boundaries; retain host and origin checks. LAN hosts must be
  explicit in `JAS_ALLOWED_HOSTS`. Public hosting needs an authentication design.

## Development and checks

Use Python 3.13+, uv, Node 24+ and pnpm 12 with committed lockfiles.
[Development](docs/DEVELOPMENT.md) covers local servers. From the repository root:

```sh
uv sync --frozen
pnpm --dir frontend install --frozen-lockfile
uv run ruff check backend benchmarks .github/scripts
uv run ty check
uv run pytest
pnpm --dir frontend lint
pnpm --dir frontend test
pnpm --dir frontend build
pnpm --dir frontend test:e2e
```

Run affected checks and meaningful regression tests; verify changed UI flows in a browser.
Playwright needs Chromium and owns a keyless temporary backend/database; use a distinct
`JAS_TEST_PORT` for concurrent work. Never target user data or run paid calls without authorization.
Container/runtime changes need the production smoke check; workflow changes need
Actionlint/ShellCheck. CI's `verify` job aggregates backend, frontend/browser, container
and workflow checks. Do not weaken checks to pass them.

## Change discipline

Prefer existing patterns and dependencies; avoid speculative abstractions. Update callers,
types, fixtures and docs together. Delete obsolete code; keep README minimal and link
focused docs. Keep multi-session progress in `HANDOFF.md`, not this guide.
Never commit secrets, `.env`, local databases, build output or `.desloppify/` state;
document configuration in `.env.example`. Data resets require explicit authorization.
Use task branches and Conventional Commits; do not merge or push to main without approval.
Report observed checks and limitations; never claim fresh benchmark or health scores
without running the corresponding evaluation.
