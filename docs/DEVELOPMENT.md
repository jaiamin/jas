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
`data/jas.sqlite3`; Compose stores it in `jas-data`.
Private hosted deployments use the same image; see [hosting](DEPLOYMENT.md) for
Railway volume permissions, authentication and environment separation.
The sole current contract is database16, `jas-study` export20,
`jas-environment-v10`/definition2 and research-operation2.
Incompatible databases, library records and rule checkpoints are rejected on
inspection, export, execution and replay. There are no migrations, compatibility
readers or automatic resets. Start with a fresh database when changing contracts;
removing existing data requires an explicit user decision. Database16 removes
the retired autonomous-investigation and mechanic-generation storage. Preserve
schema15 workspaces separately; they are not upgraded or reset automatically.
Capture1/comparison1/tool2.0/direct1.0 remain current.

### Evidence downloads

Export buttons save a plain `jas-<experiment-id>.json` file. The `shared-values-v1`
representation stores repeated observations, rules, schemas and other identical
values once. Every unique value remains in the file: checkpoints, provider traces,
integer ledgers, failures, analyses and provenance are preserved. No archive utility,
network lookup or JAS installation is required to inspect it.

Start with the readable `overview` and `reading_guide`. `reference_key` identifies a
reserved property absent from the source evidence. An object containing only that
property references `shared_values[its value]`; resolve recursively. Other objects,
including JSON Schema `$ref` fields, remain literal data. Removing `representation`,
`reading_guide`, `overview`, `reference_key` and `shared_values` after resolution
recovers the exact full export20 content. These references change representation,
not evidence meaning or persisted versions.

`GET /api/studies/{id}/export?download=true` returns the portable representation;
`GET /api/studies/{id}/export` returns expanded JSON for API callers. Both capture
one database snapshot without provider calls. File size still grows with unique
evidence. For AI review, inspect the overview and relevant sections; a complete
experiment need not fit one model context. Exports may contain private participant
observations and recorded prompts, so share them deliberately.

Study exports are evidence bundles, not importable workspaces: there is no study-import
endpoint. Reusing saved environment definitions is a separate workflow.

The Agent's **Download frozen evidence** action uses this same plain JSON representation
at `/api/analyses/{id}?download=true`. It preserves that analysis record and its captured
cutoffs even after a run advances. The ordinary analysis endpoint remains expanded JSON
for the app; downloading never reruns analysis or contacts a model.

T12's keyless browser witnesses use the opt-in DEVELOPMENT-only workflow provider,
fresh owned data and the already installed headless shell. Set `JAS_TEST_PORT`,
`JAS_TEST_DATA_DIR`, `PLAYWRIGHT_BROWSERS_PATH`, `T12_BROWSER_EXECUTABLE` and
`T12_BROWSER_OUTPUT`, then run `pnpm --dir frontend exec playwright test --config
playwright.workflow.config.ts -g '<one case name>'`. The cases separately cover
editor draft/save recovery, actual contention/pause/handoff/replay, and tool failure
with explicit recovery. They do not establish live participant competence.

The schema retains durable participant activations, per-request links and pinned
environment sources. Reusable mechanics exclude participant harness settings;
each experiment pins those separately.

The keyless T10 browser trial uses an opt-in deterministic test provider and an
isolated temporary database. Use a private dependency tree/cache and distinct port:

```sh
JAS_TEST_PORT=18123 pnpm --dir frontend exec playwright test --config playwright.coordination.config.ts
uv run pytest backend/tests/test_distributed_coordination.py
```

These checks establish mechanics, UI, input accounting and replay, not live intelligence.

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

The **tool-using harness 2.0.0** has selectable planning, retrieval, investigation
and accessible verification policies. Direct action remains 1.0.0. New runs pin
the current harness; incompatible versions are rejected. Each capability can be explicitly disabled;
there is no substitute policy. The same activation request/operation budgets apply.
See [extension admission](EXTENSIONS.md) for executable package boundaries.

The neutral DEVELOPMENT runner and dedicated keyless UI flow exercise actual
capabilities, source receipts, private plans, pause/reload/resume and replay:

```sh
uv run python -m benchmarks.participant_context_trial --output data/t08/development
JAS_TEST_PORT=18119 pnpm --dir frontend exec playwright test --config playwright.context.config.ts
```

Use a new output path for each trial. These external-provider stand-ins make no
paid calls and do not establish intelligence. See the
[compact development history](research/RESEARCH_HARNESS_COMPACT_REPORT.md).

Scripted controls (harness 1.0.0) are independent of model identity,
plus declared memory/tool/request ablations. Model conditions remain Luna. The
neutral DEVELOPMENT cases allow null contrasts, request-limit failure and a
simpler-policy win; external-provider stand-ins test mechanics only:

```sh
uv run python -m benchmarks.reference_policy_trial --output data/t15/development-UNIQUE
JAS_TEST_PORT=18121 pnpm --dir frontend exec playwright test --config playwright.reference.config.ts
```

Use distinct attempt/output paths. The scripted conditions themselves construct no
provider and send zero requests. Compare actual effort as well as configured
envelopes; no confidence interval or independent support is inferred from these
small fixed-seed examples. These runners use the current contracts documented
above. The [compact history](research/RESEARCH_HARNESS_COMPACT_REPORT.md)
summarizes earlier source-scoped outcomes and unchanged frozen T01 failures.

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
retains concrete rules and a complete source definition/revision/hash inside each selected
experiment, so library deletion
never deletes run evidence. See [custom environments](CUSTOM_ENVIRONMENTS.md).

Extension candidate validation uses pinned Wasmtime in a bounded import-free
worker. It needs no Docker socket or host policy changes. Run local containment
from Environments → Candidates or `POST /api/extensions/qualify`; every restart
requires fresh qualification. The production smoke also qualifies the actual
non-root image and exercises candidate denial/limits. See [extensions](EXTENSIONS.md)
for the narrow contract, threat model, limits and review storage.

## Artifact investigation development checks

The installed `artifact_workspace` template has one investigator, permitted evidence,
writable work and a sealed object. Configure initial contents, access and write limits
in Conditions; edit structural references in the protocol JSON. The run's Environment
view shows versions/source links and enforced submission outcomes. The recorded-turn
slider is playback; Verify reapplies consequences/authorized read receipts with no
model requests. Restart restores and pauses; Run or Step explicitly samples again.

```sh
uv run pytest backend/tests/test_artifact_workspace.py backend/tests/test_artifact_lifecycle.py
JAS_TEST_PORT=18120 pnpm --dir frontend exec playwright test --config playwright.harness.config.ts artifact-world.trial.ts
```

The dedicated trial uses only an opt-in external-provider stand-in. Success, wrong
submission, stale-write rejection/recovery, both harnesses and mobile/draft behavior
are development mechanics checks. They do not establish live intelligence or
held-out generalization. See the [compact history](research/RESEARCH_HARNESS_COMPACT_REPORT.md).


T16's finite extension browser trial runs with an explicit keyless provider stand-in
in a separate temporary workspace, so its synthetic requests cannot contaminate
zero-call browser controls:

```sh
JAS_TEST_PORT=18125 pnpm --dir frontend test:e2e --config playwright.extension.config.ts
```

This checks admission, reusable mechanics, normal Review/save/run and exact replay;
it does not run generation or live participant intelligence.
