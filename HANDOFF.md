# JAS workspace redesign

Branch: `t3/developer-workspace-redesign`, isolated Linux Docker Sandbox.
Draft PR: https://github.com/jaiamin/ass/pull/4

## Objective and acceptance

Build a calm developer workspace around experiment → run → recorded decision → comparison.
Laminar's actual product screens guide evidence composition. The supplied Clay application
screenshot now guides white/slate surfaces, restrained blue, fine dividers and Inter typography.
Preserve seven environments, immutable revisions, budgets, execution controls, observations,
replay, exports, provider traces and evidence boundaries.

- [x] Inventory routes, tasks, contracts, repeated patterns and important states.
- [x] Establish canonical `DESIGN.md` and apply shared shadcn patterns across all views.
- [x] Rename product branding to JAS while preserving supported legacy interfaces.
- [x] Keep the supplied logo and approved 22px/800 lowercase Bricolage wordmark.
- [x] Replace the assistant panel and creation tabs with one full-page Agent surface.
- [x] Persist independent chats in an inner history rail, with a compact mobile picker.
- [x] Keep the composer at the bottom and four connected suggestions in the middle.
- [x] Tailor examples to General, creation, and the selected protocol or recorded run.
- [x] Stream provider prose with real stage activity, Markdown formatting and reduced motion.
- [x] Preserve validation, evidence cutoffs, usage accounting and spending limits while streaming.
- [x] Simplify redundant copy/actions and remove superseded fonts, components and styles.
- [x] Verify responsive workflows, refresh screenshots and synchronize documentation.

## Product decisions

Experiments is the default view. Its New experiment action opens the manual editor;
Generate with Agent preserves the manual draft and opens a separate creation chat.
Proposals require review before saving. Saving never starts model calls.

Agent handles general questions, scoped investigation and creation in one conversation
interface. Its selector lists General, New experiment, saved experiments and runs.
Each submitted turn retains its original context; Retry preserves that context. Ask Agent
links appear on experiment/run details. Past chats stay inside Agent.

Four examples per context fill the composer without sending. General teaches methods;
creation offers controlled studies; scoped examples use actual questions, treatments,
measures, environment and run identity. Unstarted work gets setup questions. In-progress
recorded turns count as evidence even before a run completes, with revision boundaries.

Provider prose streams into pending Analysis output through the existing validated model
path. SSE sends only the active turn; polling/reload recovers an interrupted connection
without another model request. Schema/citation/protocol checks gate completion. Failures
remove partial prose and preserve provider usage. Never expose private model reasoning.
Thinking, reading, research, drafting and review indicators reflect actual server stages.

The main sidebar has no creation action. Its collapse control stays inside; hovering or
focusing the collapsed mark reveals expansion. Only the favicon has extra logo padding.
Use Lucide at 1.75 stroke. The user rejected the retro pixel icon alternative.

## Sources of truth and compatibility

`DESIGN.md` owns visual rules, `docs/INTERFACE.md` owns route/state verification, and
`docs/ARCHITECTURE.md` owns implementation contracts. README covers setup/public usage.
Keep shared shadcn/Radix controls, React Query and the existing Python engine.

Schema v3 additively stores chat identity without changing evidence or usage. Legacy API
routes, CLI/config aliases, browser state, database selection, volume identity and frozen
export/benchmark formats remain supported. The user will rename the repository; do not
change its remote or rewrite published history.

## Running application

The real app is intentionally left running on **8080**, with its normal database and
inherited environment/.env credentials. Command:

```sh
.venv/bin/jas --host 0.0.0.0 --port 8080
```

Both providers report configured without exposing keys. No seeded results or keyless user
mode. The active process was restarted as PID 57143 for the streaming backend. Browser
verification does not mutate user records or make paid calls. Tests use separate disposable
databases; never share one database between engines. Local tools: `.venv`, `.tools/bin/uv`, pnpm.

## Validation and limits

165 backend tests, 11 frontend unit tests and 37 Playwright tests passed. Focused evidence
and streaming/comparison captures passed after the full suite. Ruff lint/format, ty, Biome,
TypeScript and the production build passed. Impeccable typography detection returned no
findings. Earlier Actionlint and Compose validation still applies to unchanged configuration.

42 normal-app route/theme/viewport captures at 390px, 834px and 1440px showed no page
overflow. Expanded/collapsed navigation, popup sizing, keyboard focus and reduced-motion
activity were verified. All 47 sampled text/surface pairs meet 4.5:1 in both themes.
Evidence/comparison/streaming captures use explicit controlled test responses; normal-app
captures contain no sample experiment results. Prior verification covered saved observations,
exports, immutable revisions and exact 24-turn replay.

No paid-provider run, non-Chromium audit, full screen-reader audit or production deployment.
Publication state and final head are recorded in Git and the linked draft PR. Do not merge.
