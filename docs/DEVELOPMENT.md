# Development

Use Python 3.13+, uv, Node 24+ and pnpm 12 with the committed lockfiles.

```sh
uv sync --frozen
pnpm --dir frontend install --frozen-lockfile
pnpm --dir frontend build
uv run jas --workspace ./data --port 8080 --no-browser
```

For frontend development, start the API on 8081 and Vite in another terminal:

```sh
uv run jas --workspace ./data --port 8081 --no-browser
pnpm --dir frontend dev
```

Vite proxies `/api` to 8081. Never run two engines against one database. Give each
checkout its own workspace, database and service/test ports.

## Verification

```sh
uv run ruff check backend benchmarks .github/scripts
uv run ruff format --check backend benchmarks .github/scripts
uv run ty check
uv run pytest
pnpm --dir frontend lint
pnpm --dir frontend test
pnpm --dir frontend build
pnpm --dir frontend test:e2e
JAS_TEST_PORT=8095 pnpm --dir frontend test:e2e --config playwright.gallery.config.ts
```

`pnpm --dir frontend format` formats frontend source; `uv run ruff format` formats
Python. Install the browser with `pnpm --dir frontend exec playwright install chromium`.
The main browser suite owns a temporary keyless backend/database on 8094. The gallery
suite owns a separate temporary model-free gallery with labelled scripted records.
Both shut down after testing. Use distinct `JAS_TEST_PORT` values for concurrent
work. Their output directories are separate. `JAS_TEST_URL` may target only an
explicit disposable backend; browser tests create records, never use user data.

Dedicated deterministic participant trials use the same server with explicit
opt-in fixture providers. Examples:

```sh
JAS_TEST_PORT=18115 pnpm --dir frontend test:harness
JAS_TEST_PORT=18123 pnpm --dir frontend test:e2e --config playwright.coordination.config.ts
JAS_TEST_PORT=18125 pnpm --dir frontend test:e2e --config playwright.extension.config.ts
```

These tests exercise mechanics and request accounting, not live intelligence.
Paid evaluations need separately authorized budgets; retain every attempt and
unknown reservation. [Benchmarks](../benchmarks/README.md) describes those gates.
CI's `verify` job requires backend, browser/frontend, container and workflow checks.
A GitHub account billing block must be fixed by the account owner; do not treat
jobs that failed to start as successful verification.

Container changes require the production smoke checks in [hosting](DEPLOYMENT.md).
Workflow edits also require Actionlint/ShellCheck. Test the installed wheel from
an unrelated working directory, with a fresh explicit workspace and no model calls.

## Build a release wheel

```sh
pnpm --dir frontend build
uv build --wheel
```

The Hatch build hook includes `frontend/dist` as `agent_sim/static` and refuses a
wheel without it. Both `jas` and `jaslab` launch the bundled app. The source
fallback is for editable development only. Package publication is a separate
release action; the application version does not imply every proposed v0.2
product feature is implemented.

## Configuration and data

Keys may be entered in Settings or supplied through `.env`/environment defaults;
see [.env.example](../.env.example). CLI startup loads `.env` from the current
directory. Saved provider settings take precedence. Keys are stored in an
owner-only `<database-stem>.settings.json` beside SQLite, never returned by the
settings API or included in exports/public records. A blank key field keeps the
saved key. Provider/model/budget changes require idle work.

Arbitrary `provider:model` IDs are accepted. Known prices are editable; unknown
prices stay unknown and require an experiment or workspace token ceiling. Atomic
reservations include input and maximum output before sending. Cancellation,
timeout and unknown usage preserve reservations; price edits never backfill old
requests. Dollar caps apply to priced calls. Assistant/planner models are chosen
in Settings; planner web research starts disabled.

Data backup contains SQLite snapshots, publication receipts/lineage, local
environments, extensions and configuration, excluding keys. It includes private
conversations/evidence.
Stop JAS before restoring into a separate workspace and preserve existing files.
The installed CLI uses platform app data unless `--workspace` or `JAS_WORKSPACE`
is set; an existing checkout `data/jas.sqlite3` remains in place.

`JAS_ALLOWED_HOSTS` is a comma-separated list without ports, defaulting to
`localhost,127.0.0.1,[::1]`. Non-loopback hosting requires owner authentication;
`JAS_REQUIRE_AUTH=1` also protects deployments behind a proxy with loopback Host.
The host/origin protections remain enabled for local use. The gallery has its own
origin and GitHub publishing identity; see [publishing](PUBLISHING.md).

## Evidence contracts

Current private contracts: database16, `jas-study` export20, environment library10
and definition2, research-operation2, capture1/comparison1/tool2.0/direct1.0.
Incompatible persisted rules/schemas are rejected explicitly. There are no
migrations, compatibility adapters or automatic resets; preserve old workspaces
separately. Removing data requires an explicit user decision. Public format v1
has its own [retained viewer/verifier policy](PUBLISHING.md#public-record-compatibility).

Private export buttons download `jas-<experiment-id>.json`. The `shared-values-v1`
representation stores identical values once; `reference_key` names the reserved
property, and objects containing only that property refer into `shared_values`.
Resolve those recursively; JSON Schema `$ref` remains literal. Removing the
representation metadata after resolution recovers the exact expanded export20.

`GET /api/studies/{id}/export?download=true` downloads the compact representation;
the endpoint without `download` returns expanded JSON. Both capture one snapshot
without model calls. Private exports include provider traces, conversations and
agent-private observations; they are evidence bundles, not workspace imports or
safe public publication payloads. The Assistant's Download frozen evidence uses
`GET /api/analyses/{id}?download=true` and preserves captured cutoffs.

## Code map

- `backend/src/agent_sim/`: domain, execution, accounting, persistence and API.
  `simulation/` owns deterministic rules independent of HTTP/providers/storage.
- `providers.py`, `settings_routes.py`, `workspace_data.py`: local configuration,
  settings and backup. `commands.py` uses the same services as the app.
- `public_records.py`, `publishing.py`, `gallery*.py`: explicit public boundary,
  local client/keychain, independent gallery and immutable object storage.
- `frontend/src/`: routed React app. Workflow components live under `editor`,
  `agent`, `run`, `experiment` and `settings`; stock controls live under `ui`.
  TanStack Query owns remote state; `index.css` owns tokens.
- `backend/tests`, colocated frontend tests and `frontend/e2e`: regression checks.
  `benchmarks/` is excluded from production images.

[Architecture](ARCHITECTURE.md) · [Design](DESIGN.md) · [Glossary](GLOSSARY.md)
