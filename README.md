<img src="frontend/public/logo.svg" width="40" height="40" alt="JAS logo" />

# JAS · Agent Simulation Environment

A local developer workspace for experiments with model-controlled agents. Define a protocol,
run matched trials, follow outcomes back to recorded decisions, compare results and tune
preserved revisions. AI can help design protocols and investigate evidence.

## Run locally

Requires Docker Compose. Configure an OpenAI key for AI design/analysis. Agent decisions
support OpenAI and Anthropic; manual configuration, saved evidence and replay work offline.

```sh
cp .env.example .env
# Set provider keys in .env, then:
docker compose up --build
```

Open **http://localhost:8080**. Experiments is the default view. Data persists in the
named data volume. Set `JAS_PORT` for another port; stop with `docker compose down`.
This is a single-user, unauthenticated application for a trusted local network.

### Existing installations

JAS accepts the previous `ASS_*` configuration names and `ass` command; `JAS_*` values
take precedence. Existing browser drafts, theme and sidebar preferences remain readable.
Without an explicit database URL, an existing `data/ass.sqlite3` is reused; fresh workspaces
use `data/jas.sqlite3`. No database is moved or deleted.

The Compose volume key `ass-data` and export format identifier `ass-study` remain stable
for compatibility. Keep your existing `.env`. If you rename the checkout directory, retain
the existing Compose project name with `docker compose -p YOUR_EXISTING_PROJECT up --build`
so it uses the same volume. Frozen benchmark artifacts retain their original provenance.

## Workflow

1. Open **New experiment** to configure a protocol, choose a template, or select
   **Generate with Agent**. Agent opens with your question and New experiment selected.
2. Review agents, conditions, execution limits and measurements. Saving does not run models.
3. Run the experiment, then open an individual trial. **Decisions** links each turn to its
   observation, action, consequences and notes. **Environment** shows the world; **Record**
   exposes request traces and verifies exact replay without model calls.
4. Select two to four runs to compare, or tune an experiment into an immutable new revision.
   Export preserves all revisions and evidence. Unfinished edits remain browser drafts.

Settings shows provider availability, budget reservations, usage and storage. Normal startup
loads provider keys from the process environment and `.env`; it does not disable keys or
seed example results. Change provider keys and deployment settings through `.env`, then restart. The sidebar supports
collapse, light/dark themes and a mobile drawer. **Agent** is the persistent destination
for general questions, evidence analysis and reviewed creation. **Ask Agent** appears on
experiment and run details and opens the same full-page chat with that record selected.
Past chats live in an inner Agent sidebar; the composer selects General, New experiment,
an experiment, or a run. Proposals open in the protocol editor for review before saving.
General questions use the workspace budget; scoped questions use the experiment budget
and cite inspected evidence. Chat history is stored in the database; unsent messages remain
browser-session drafts. Enter sends and Shift+Enter adds a line.

## Development

Python 3.13+, uv, Node 24+, pnpm 12. Use the committed lockfiles.

```sh
uv sync --frozen
pnpm --dir frontend install --frozen-lockfile
pnpm --dir frontend build
uv run jas --host 0.0.0.0 --port 8080
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

Browser tests create real records and intercept selected AI responses. Use a **keyless,
disposable database**; never point them at user data. This direct factory invocation avoids
loading `.env` and makes no paid requests:

```sh
env -u OPENAI_API_KEY -u ANTHROPIC_API_KEY JAS_DATABASE_URL=sqlite:///data/browser-qa.sqlite3 \
  uv run uvicorn agent_sim.api:create_app --factory --host 127.0.0.1 --port 8082
# In another terminal, after the production frontend build:
pnpm --dir frontend exec playwright install chromium
pnpm --dir frontend test:e2e
```

Set `JAS_TEST_URL` for a different disposable server. CI uses an isolated Docker Compose
project; see [.github/workflows/checks.yml](.github/workflows/checks.yml).

## Repository

- `backend/src/agent_sim/`: API, validated protocols, execution, storage and rule adapters.
- `frontend/src/pages/`: route-level tasks; `components/editor/`: protocol field groups;
  `components/`: shared records, shell, evidence and Agent; `components/ui/`: shadcn.
- `frontend/src/index.css`: canonical theme tokens; `styles/`: scoped interface styles.
- `backend/tests/`, `frontend/src/**/*.test.*`, `frontend/e2e/`: behavior/regression coverage.
- `benchmarks/`: frozen evaluation evidence and reproducible benchmark tooling.

Seven mechanics: public goods, trust exchange, task coordination, institutional oversight,
binding bargaining, private-evidence decisions and renewable resources. Protocols support
2–12 agents, individual models/goals, memory conditions, resource shocks, matched seeds and
bounded spending. There are no substitute models or automatic request retries. Cost is an
estimate using configured rates; unknown usage retains a reservation.

These experiments measure **model behavior under stated rules**, not human psychology or
validated real-world predictions. Natural-language context does not invent new mechanics.

[Design system](DESIGN.md) · [Views and verification](docs/INTERFACE.md) ·
[Architecture](docs/ARCHITECTURE.md) · [Research](docs/RESEARCH.md) ·
[Validation](benchmarks/README.md) · [Results](benchmarks/reports/README.md) · [Domain](GLOSSARY.md)
