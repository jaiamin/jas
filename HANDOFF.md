# Developer workspace redesign

Branch: `t3/developer-workspace-redesign`. This checkout is an isolated Linux sandbox.

## Objective and acceptance

Replace the previous interface with a cohesive, minimalist developer workspace, using
Laminar's actual table and trace UI as the primary reference. The user confirmed the main
workflow: experiment → run → recorded decision → comparison. AI design is supporting.
Preserve all seven environments, immutable revisions, budgets, execution controls,
annotations, replay, exports, provider traces, and assistant evidence boundaries.

- [x] Inventory all routes, user tasks, data contracts, repeated patterns and states.
- [x] Inspect Laminar's public product screenshots and the running baseline.
- [x] Define canonical `DESIGN.md`; implement shell and one end-to-end workflow.
- [x] Visually verify the representative workflow before extending remaining views.
- [x] Apply shared patterns to every route, responsive layout and important state.
- [x] Remove only verified obsolete code/docs; update setup and product documentation.
- [x] Pass frontend/backend checks and meaningful browser regressions.
- [x] Capture representative screenshots and complete independent design review.
- [ ] Commit and publish one draft PR.

## Decisions

- Default entry is Experiments; AI design gets a dedicated supporting route.
- Keep `/studies` and existing API contracts. “Experiment” is the UI term for a study.
- Preserve shadcn/Radix, React Query, Vite and the existing Python execution engine.
- Laminar's density, neutral surfaces and adjacent evidence panels guide composition.
  No workspace switcher, accounts, fabricated activity or new backend features.
- `DESIGN.md` is the single design authority. Route inventory/verification lives in
  `docs/INTERFACE.md`; this file holds implementation progress, not duplicate tokens.

## Local verification environment

Project-local Python `.venv`; uv at `.tools/bin/uv`; pnpm at
`/home/agent/.local/bin/pnpm`. Dependency installation and baseline production build pass.
Keyless QA API: port 8082, `data/redesign-qa.sqlite3`. Preview fixture uses a separate
`data/redesign-preview.sqlite3` and port 8083. Never share a database between engines.
Existing `data/ass.sqlite3` and `data/evaluation.sqlite3`, if present, are user data.
Do not delete or use them for verification. No paid model requests are authorized.

## Completed implementation

- Replaced the chat-first entry with experiment records, a compact shell and linked evidence.
- Extracted shell, table patterns, AI composer, protocol field groups and execution records;
  split scoped styles from tokens; removed the old Home view, dead selectors and redundant Slot dependency.
- Fixed journal truncation, assistant-induced draft resets, run/turn note identity and stacked
  evidence focus/return, including a docked assistant that remains open during inspection.
- Renamed product branding to JAS across application, API, CLI, configuration and docs.
  Legacy configuration, browser storage, database names, volume identity and export format
  remain compatible. The repository name/remote is unchanged at the user's request.
- Canonical DESIGN.md and machine metadata synchronized by the documenter. Independent
  Impeccable review scored both material findings resolved. Detailed checks and representative
  offline-fixture screenshots are in docs/INTERFACE.md.

## Verification

153 backend tests, 7 frontend unit tests and 26 Playwright tests passed. Ruff lint/format,
ty, Biome, TypeScript/Vite build, Actionlint, Compose config validation and staged Gitleaks passed.
Manual browser checks included desktop/mobile/tablet, saved observations, exact replay
(24 turns), export contents, keyboard focus and sampled text/placeholder contrast.
No paid model calls; no production deployment or non-Chromium/assistive-technology audit.
Task browser and disposable services are closed; task-generated databases and scratch scripts
were removed after verification. User data was not touched.

## Next

Publish the verified task branch as one draft PR. Keep user databases untouched.
