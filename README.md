# ASS · Agent Simulation Environment

A local workspace for agent experiments. Ask a question or write a protocol; run matched
trials, watch decisions, inspect evidence, compare outcomes and tune preserved revisions.

**Requires:** Docker Compose and an OpenAI key for AI design/analysis. Agent decisions
support OpenAI and Anthropic. Manual configuration, saved evidence and replay work offline.

```sh
cp .env.example .env # set provider keys
docker compose up --build
```

Open **http://localhost:8080**. Data persists in the `ass-data` Docker volume.
Set `ASS_PORT` for a different port. Stop with `docker compose down`.
The app is single-user and unauthenticated; use it on a trusted local network.

## Development

Python 3.13+, uv, Node 24+, pnpm 12.

```sh
uv sync --frozen
pnpm --dir frontend install --frozen-lockfile
pnpm --dir frontend build
uv run ass --host 0.0.0.0 --port 8080
```

For frontend development, run the API on 8081 and `pnpm --dir frontend dev`.

```sh
uv run ruff check backend benchmarks
uv run ty check
uv run pytest
pnpm --dir frontend lint
pnpm --dir frontend test
pnpm --dir frontend build
```

Browser tests start a keyless backend on port 8094 with a fresh temporary database,
then stop it and remove its data. Build the frontend first. Set `ASS_TEST_PORT`
for a different local port, or `ASS_TEST_URL` to use an explicitly supplied
disposable instance instead.

```sh
pnpm --dir frontend exec playwright install chromium
pnpm --dir frontend test:e2e
```

## Scope

Seven mechanics: public goods, trust exchange, task coordination, institutional oversight,
binding bargaining, private-evidence decisions and renewable resources. Protocols support 2–12 agents, per-agent models/goals, memory conditions,
resource shocks, matched seeds and bounded spending. AI scopes, optionally researches, drafts and critiques proposals before your review.
Unfinished edits stay as browser drafts; saving does not start execution. There are no substitute models or automatic request retries.

Each turn records its observation, decision, consequences and checkpoint. Exports include
all revisions, evidence and request traces. Replay verifies recorded actions without calling
models. Cost is an estimate using configured rates; unknown usage retains a reservation.

These experiments measure **model behavior under stated rules**, not human psychology or
validated real-world predictions. Natural-language context does not invent new mechanics.

[Architecture](docs/ARCHITECTURE.md) · [Research](docs/RESEARCH.md) ·
[Validation](benchmarks/README.md) · [Results](benchmarks/reports/README.md) · [Domain](GLOSSARY.md)
