# ASS implementation

## Current acceptance

- [x] React/TypeScript/shadcn frontend; Python/FastAPI with uv, Ruff, ty and pytest.
- [x] Sharp neutral Geist interface, orange selection, light/dark, compact tables,
      breadcrumb navigation and footer settings/theme.
- [x] Progressive AI/manual editor, browser drafts and incomplete-specification recovery.
- [x] Planner scopes size/duration, optionally researches, drafts, validates and critiques;
      proposal provenance survives revisions and exports. No provider retries/substitution.
- [x] Three explicit mechanics: commons, trust exchange and task coordination; private
      information, commitments, memory conditions, resource schedules and heterogeneous agents.
- [x] Immutable matrices, atomic checkpoints, exact replay, browser-independent execution,
      pause/resume, one writer per run, bounded concurrency and spending reservations.
- [x] Live design/research diagnostics and an AI-proposed 24-turn run with exact replay.
- [x] Final review scored recovery, prose measure and documentation fixes resolved;
      source/token documentation synchronized and staged secret scan clean.
- [x] 41 backend tests, 5 frontend tests, 9 browser workflows, lint/types/build; Docker
      restart preserved 15 QA studies; disposable QA stopped and app healthy on 8080.

## Decisions

Trusted single-user local application; no accounts, hosted infrastructure, arbitrary
model-authored code or unsupported simulation claims. A turn is an execution boundary;
adapter mechanics govern settlement and completion. AI proposes inspectable data.
SQLite WAL/SQLAlchemy store relational identities with immutable JSON protocol/state payloads.
Schema v2 preserves existing data. One Compose service serves the frontend and API together.
Model decisions default to GPT-6 Luna; planning/investigation use GPT-6.1 Sol. Requested
GPT-6.1 Luna returned 404 and was not substituted. Add an explicit adapter for new mechanics.

## Evidence and limits

Previous validation: 19 live runs, 318 replayed turns; 120-turn GPT-6 Luna run cost about $0.028.
New smoke tests: two reviewed protocols (4-agent scarcity, 2-agent sourced trust), unsupported
prediction declined, one completed 24-turn run and exact replay. Failures remain recorded.
New estimated/reserved cost $0.427889; prior app ledger about $1.26, well below authorized $25.
Coverage results in benchmarks/ predate the planner changes and are not a realism score.
No live Anthropic call, human calibration, independent research-quality or large-load claim.
Human validity needs consented reference data, held-out scenarios and independent coding.
