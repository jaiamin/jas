# Development

Python 3.13+, uv, Node 24+ and pnpm 12. Use the committed lockfiles.

```sh
uv sync --frozen
pnpm --dir frontend install --frozen-lockfile
pnpm --dir frontend build
uv run jas --port 8080
```

For frontend development, start the API on 8081 and Vite in a second terminal:

```sh
uv run jas --host 127.0.0.1 --port 8081
pnpm --dir frontend dev
```

Vite proxies `/api` to 8081. Never run two engines against the same database. Assign each
independent checkout a distinct database and port through `JAS_DATABASE_URL` and `--port`.

```sh
uv run ruff check backend benchmarks
uv run ty check
uv run pytest
pnpm --dir frontend lint
pnpm --dir frontend test
pnpm --dir frontend build
```

`pnpm --dir frontend format` formats frontend source. Backend formatting uses
`uv run ruff format backend benchmarks`.

The keyless Playwright suite owns a temporary database and backend on port 8094,
waits for health readiness, and shuts it down after the run. It bypasses `.env` and
clears provider keys, so no paid requests are made:

```sh
pnpm --dir frontend exec playwright install chromium
pnpm --dir frontend test:e2e
```

Use `JAS_TEST_PORT` to choose another local port, or `JAS_TEST_URL` only for an
explicit disposable server. Browser tests create real records; never point them at
user data. CI uses the same owned-backend flow in
[.github/workflows/checks.yml](../.github/workflows/checks.yml).

## Configuration and data

Copy `.env.example` to `.env` and set provider keys for live model requests. The CLI
loads `.env` at startup; restart after changes. Manual configuration and saved evidence
work without keys. Settings reports provider availability, storage, budget and usage.
`JAS_PORT` changes the Compose port; `docker compose down` stops the app without deleting
its data volume.

JAS accepts the previous `ASS_*` configuration names and `ass` command; `JAS_*` values
take precedence. Existing browser drafts, theme and sidebar preferences remain readable.
Without an explicit database URL, an existing `data/ass.sqlite3` is reused; fresh workspaces
use `data/jas.sqlite3`. No database is moved or deleted.

The Compose volume key `ass-data` and export format identifier `ass-study` remain stable
for compatibility. Keep your existing `.env`. If you rename the checkout directory, retain
the existing Compose project name with `docker compose -p YOUR_EXISTING_PROJECT up --build`
so it uses the same volume. Frozen benchmark artifacts retain their original provenance.

## Project map

- `backend/src/agent_sim/`: API, protocols, execution and storage; `simulation/` owns rules.
- `frontend/src/`: routed React app; `components/editor`, `components/agent` and
  `components/run` own their workflows; `components/ui` contains shared controls.
- `frontend/src/index.css`: theme tokens; `styles/`: scoped layouts.
- `backend/tests`, `frontend/src/**/*.test.*`, `frontend/e2e`: regression tests.
- `benchmarks/`: evaluation tooling and frozen evidence, omitted from production images.

[Architecture](ARCHITECTURE.md) · [Design](DESIGN.md) · [Vocabulary](GLOSSARY.md)

The browser suite uses Chromium and controlled provider responses. It does not validate
paid providers, screen-reader coverage, hosted deployment or human predictive accuracy.
