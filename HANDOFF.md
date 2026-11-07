# JAS workspace redesign

Branch: `t3/developer-workspace-redesign` in an isolated Linux Docker Sandbox.
Draft PR: https://github.com/jaiamin/ass/pull/4

## Objective and acceptance

Build a calm developer workspace around experiment → run → recorded decision →
comparison. Laminar's actual product screens informed density and evidence navigation;
the user's later direction established monochrome surfaces and the supplied JAS mark.
Preserve all seven environments, immutable revisions, budgets, execution controls,
annotations, replay, exports, provider traces and evidence boundaries.

- [x] Inventory routes, user tasks, data contracts, repeated patterns and states.
- [x] Establish canonical `DESIGN.md`; verify a complete workflow before extending it.
- [x] Apply shared patterns across all views, responsive layouts and important states.
- [x] Rename product branding to JAS while preserving supported legacy interfaces.
- [x] Replace the assistant panel and creation tabs with one Agent conversation surface.
- [x] Add persistent, independent chats with an inner history rail and context selector.
- [x] Simplify shell, suggestions, composer focus, context menu and redundant text.
- [x] Add editor generation entry with manual-draft preservation and proposal return.
- [x] Remove superseded components and styles; synchronize documentation/screenshots.
- [x] Pass relevant checks and inspect current application screenshots.

## Current decisions

- Experiments is the default destination. Its single New experiment action opens the
  manual editor; Generate with Agent there opens a separate creation chat with the
  current question. Proposals require review before saving, and saving never runs models.
- Agent handles general questions, scoped investigation and creation in one interface.
  Past chats live inside Agent, with a compact picker on smaller screens. The composer
  selects General, New experiment, an experiment or a run; Enter sends, Shift+Enter
  adds a line. Ask Agent links appear on experiment/run details.
- Conversation identity lives on Analysis rows. Schema v3 additively migrates existing
  history without changing evidence or usage. Legacy API and route entry points remain
  supported. Scoped history stays inside its selected chat, purpose and evidence cutoff.
- The global sidebar shows only the supplied logo. Its collapse control stays inside;
  the collapsed logo reveals expansion on hover/focus. Lucide icons remain after the
  user rejected the retro icon alternative. Only the favicon has additional logo padding.
- Use shadcn/Radix, React Query, Vite and the existing Python execution engine.
  `DESIGN.md` owns visual rules, `docs/INTERFACE.md` owns route/state verification, and
  `docs/ARCHITECTURE.md` owns implementation contracts.
- JAS branding preserves legacy configuration, installed CLI alias, browser storage,
  database selection, volume identity and frozen export/benchmark formats. The user
  will rename the repository; do not change its remote.

## Running application

The user requested the real application on port 8080 with available credentials loaded.
Start with `.venv/bin/jas --host 0.0.0.0 --port 8080`; normal startup inherits provider
keys and loads `.env` if present. Both OpenAI and Anthropic reported configured without
exposing credentials. The service uses the normal configured database and is intentionally
left running for the user. Do not replace it with keyless or seeded demonstration data.

Automated tests use separate disposable databases. Never point them at user data or share
a database between execution engines. Local tools: `.venv`, `.tools/bin/uv`, and pnpm.

## Verification and limits

160 backend tests, 7 frontend unit tests and 34 Playwright tests passed. The latest editor
generation/return changes also passed 11 focused Agent/navigation tests. Ruff lint/format,
ty, Biome, TypeScript and the Vite production build passed. Earlier Actionlint and Compose
configuration checks passed; this follow-up does not change those files.

Current normal-app captures cover 42 route/theme/viewport combinations at 390px, 834px
and 1440px with no overflow, page exceptions or POST requests. Screenshots include the
Agent, context popup, mobile chat, collapsed shell, experiment list, editor and settings.
Meaningful browser regressions cover drafts, retries, citations, provider failures,
keyboard focus and proposal handoff. Earlier evidence checks verified saved observations,
exports, historical revisions and exact 24-turn replay using controlled responses.

No paid provider calls, production deployment, non-Chromium audit or full screen-reader
audit. Normal application data was not modified by visual verification. Publication and
the final head are recorded in Git and the linked draft PR.
