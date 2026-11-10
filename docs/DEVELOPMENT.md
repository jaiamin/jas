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

CI runs backend checks, frontend/browser tests, workflow lint and a production Docker
smoke test in parallel; `verify` requires all four to pass. Installs use frozen lockfiles
and caches. Actions are pinned, with weekly Dependabot updates. Failed runs retain test
reports, browser traces and container logs for seven days. The Docker smoke test uses
a fresh keyless volume and checks health, SPA routes/assets and non-root execution.

## Configuration and data

Copy `.env.example` to `.env` and set provider keys for live model requests. The CLI
loads `.env` at startup; restart after changes. Manual configuration and saved evidence
work without keys. Settings reports provider availability, storage, budget and usage.
`JAS_PORT` changes the Compose port; `docker compose down` stops the app without deleting
its data volume.

Configuration uses `JAS_*`; the command is `jas`. The default database is
`data/jas.sqlite3`, Compose stores it in `jas-data`, and exports use `jas-study` v6.
This WIP uses only the current schema and rules; incompatible workspaces must be reset.

T04 introduces database schema **5** for durable participant activations and
per-request links. Schema 4 databases are explicitly rejected; preserve their
data and use a separate fresh workspace for the current contract. There is no
migration, compatibility reader or automatic reset. Do not delete/reset existing
data without authorization.
Reusable setup files use `jas-environment-v2` because their embedded protocol now
pins the participant harness. Old v1 files are explicitly rejected; preserve
them separately. No file conversion or deletion happens automatically.

The dedicated participant-policy browser trial installs a deterministic external
provider in the test server only. It exercises real configuration, immutable
revision saves, execution, accounting, inspection and replay in both themes:

```sh
JAS_TEST_PORT=18115 pnpm --dir frontend test:harness
uv run python -m benchmarks.participant_harness_trial --output data/t04/development
```

The ordinary `test:e2e` server keeps providers unavailable for its inherited
keyless regressions. Neither test server loads `.env` or permits paid requests.
The trial runner retains source/case/harness hashes, all attempts and complete
exports. Its scripted choices establish mechanics, not participant intelligence.

T08 adds selectable planning, retrieval, investigation and accessible verification
policies to **tool-using harness 2.0.0**. Direct action remains 1.0.0. Unsupported
tool-using 1.0.0 designs are explicitly rejected: preserve their source/data/exports
for inspection with that contract; no migration, compatibility reader or automatic
reset is performed. The database stays schema 5 and study exports remain v6.
New runs must pin the current harness. Each capability can be explicitly disabled;
there is no substitute policy. The same activation request/operation budgets apply.

The neutral DEVELOPMENT runner and dedicated keyless UI flow exercise actual
capabilities, source receipts, private plans, pause/reload/resume and replay:

```sh
uv run python -m benchmarks.participant_context_trial --output data/t08/development
JAS_TEST_PORT=18119 pnpm --dir frontend exec playwright test --config playwright.context.config.ts
```

Use a new output path for each trial. These external-provider stand-ins make no
paid calls and do not establish intelligence. Keep `data/t08/` evidence; see the
[T08 acceptance report](research/T08_PARTICIPANT_CONTEXT.md).

`JAS_ALLOWED_HOSTS` lists accepted hostnames/IPs without ports (comma-separated).
Defaults: `localhost,127.0.0.1,[::1]`. Add the explicit LAN/proxy host before using a
non-local URL; keep localhost entries for health checks. Restart after configuration changes.

## Project map

- `backend/src/agent_sim/`: API, protocols, execution and storage; `simulation/` owns rules.
- `frontend/src/`: routed React app; `components/editor`, `components/agent` and
  `components/run` own their workflows; `components/ui` contains shared controls.
- `frontend/src/index.css`: preset theme, font and chart tokens. App layouts compose
  stock `components/ui`; app icons share `components/icons.ts`. See
  [applying a preset](DESIGN.md#applying-a-preset), including icon-library changes.
- `backend/tests`, `frontend/src/**/*.test.*`, `frontend/e2e`: regression tests.
- `benchmarks/`: evaluation cases, rubric and runner, omitted from production images.

[Architecture](ARCHITECTURE.md) · [Design](DESIGN.md) · [Vocabulary](GLOSSARY.md)

The browser suite uses Chromium and controlled provider responses. It does not validate
paid providers, screen-reader coverage, hosted deployment or human predictive accuracy.

`JAS_PLANNER_MODEL` selects protocol design; `JAS_ASSISTANT_MODEL` selects general and
scoped evidence answers. Both default to `openai:gpt-6.1-sol`. `JAS_CONCURRENT_REQUESTS`
controls the shared provider pool (1–32, default 4), independently of
`JAS_CONCURRENT_RUNS` (1–16, default 3). Compose forwards these settings. A larger request
pool can increase rate-limit failures; it does not give participants more information.

Reusable custom environments are versioned files beside the configured SQLite database in
`<database-stem>.environments/`; keep that directory when backing up a workspace. The app
retains complete environment rules inside each immutable experiment, so library deletion
never deletes run evidence. See [custom environments](CUSTOM_ENVIRONMENTS.md).

Extension candidate validation uses pinned Wasmtime in a bounded import-free
worker. It needs no Docker socket or host policy changes. Run local containment
from Environments → Candidates or `POST /api/extensions/qualify`; every restart
requires fresh qualification. The production smoke also qualifies the actual
non-root image and exercises candidate denial/limits. See [extensions](EXTENSIONS.md)
for the narrow contract, threat model, limits and review storage.
