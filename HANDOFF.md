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
- [x] Commit and publish one draft PR.

## Decisions

- Default entry is Experiments; AI design gets a dedicated supporting route.
- Keep `/studies` and existing API contracts. “Experiment” is the UI term for a study.
- Preserve shadcn/Radix, React Query, Vite and the existing Python execution engine.
- Laminar's density, neutral surfaces and adjacent evidence panels guide composition.
  No workspace switcher, accounts, fabricated activity or new backend features.
- `DESIGN.md` is the single design authority. Route inventory/verification lives in
  `docs/INTERFACE.md`; this file holds implementation progress, not duplicate tokens.

## Running application

The user requested the normal application on port 8080 with all available keys loaded.
Started with `.venv/bin/jas --host 0.0.0.0 --port 8080`; provider credentials are inherited
normally from the process environment and loaded from `.env` if present. Both OpenAI and
Anthropic report configured. The application uses its normal configured database.
The user-facing browser tab and service are intentionally left running for testing.
Do not replace this with a keyless or seeded demonstration server.

Automated tests use separate disposable databases. Never point them at user data or share
a database between execution engines. Project tooling: `.venv`, `.tools/bin/uv`, pnpm.

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
  current application screenshots are in docs/INTERFACE.md.

## Verification

153 backend tests, 7 frontend unit tests and 26 Playwright tests passed. Ruff lint/format,
ty, Biome, TypeScript/Vite build, Actionlint, Compose config validation and staged Gitleaks passed.
Manual browser checks included desktop/mobile/tablet, saved observations, exact replay
(24 turns), export contents, keyboard focus and sampled text/placeholder contrast.
No paid model calls; no production deployment or non-Chromium/assistive-technology audit.
Disposable verification services, scratch scripts, the empty temporary user-preview database,
and sample-result screenshots were removed. The normal port-8080 app remains running.
User data was not touched.

## Review handoff

### Monochrome brand refinement

The user requested Vercel-like black/white consistency and supplied a new JAS SVG.
Preserve its geometry and red/blue details as the only color exception. Main logo ink
adapts to the theme; the master serves navigation and README, with a padded favicon
derivative. The user clarified that only the favicon should be smaller. Remove the sidebar
subheading. Keep all workflows and the real port-8080 service intact.

- [x] Apply neutral shared tokens, adaptive logo and sidebar wordmark.
- [x] Preserve status and comparison readability through icons and line patterns.
- [x] Verify both themes, responsive layouts, focus, errors and comparison charts.
- [x] Refresh canonical docs/screenshots; pass 7 unit tests, 28 Playwright tests,
  Biome and TypeScript/Vite build. Token contrast exceeds 4.5:1 in both themes.
- [x] Commit and push the refinement to the existing draft PR.
- [x] Follow-up: browser title uses the current view name followed by ` | JAS`;
  route changes, browser history, reload and loaded experiment identity pass two
  focused browser tests. Live port-8080 title checks, Biome and build also pass.

Draft PR: https://github.com/jaiamin/ass/pull/4

Implementation, cleanup and local verification are complete. No requested implementation
work remains. The PR is ready for human review; it has not been merged. The repository
rename is left to the user.
