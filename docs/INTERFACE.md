# Interface redesign

Replace the inconsistent composition with a compact shadcn application. Preserve all experiment, replay, evidence, export, budget and revision behavior. Neutral light/dark surfaces, restrained orange, sharp corners. No account theatre, decorative metrics or invented agent activity.

## Evidence

Reviewed official documentation and product screenshots on 2026-11-07:

- [Langfuse trace UI](https://langfuse.com/docs/observability/overview): compact record toolbar, trace list and contextual evidence inspector. The live demo requires an account; public screenshots were used.
- [Braintrust comparisons](https://docs.braintrust.dev/evaluate/compare-experiments): checkbox selection, aligned metric tables, persistent comparison context.
- [Linear views](https://linear.app/docs/custom-views): one contextual toolbar, dense records, details revealed alongside work.
- [Vercel projects](https://vercel.com/docs/projects/managing-projects): concise creation controls and clear separation of work and settings. Public screenshot is an older project layout, not evidence of the current authenticated dashboard.
- [LangSmith threads](https://docs.langchain.com/langsmith/threads): conversation context with inspectable evidence, separate from execution traces.
- [shadcn dashboard](https://ui.shadcn.com/view/new-york-v4/dashboard-01), [sidebar](https://ui.shadcn.com/docs/components/radix/sidebar), [chat scrolling](https://ui.shadcn.com/docs/components/radix/message-scroller): standard primitives, collapsible navigation, anchored conversations.

Baseline audit: Home puts seven templates above saved work; headers repeat context; list rows and toolbar controls have mismatched sizing; long protocol prose crowds comparison tables; the editor is an unbounded form; analysis has document-like Q&A without an anchored composer. Environment illustrations add height without helping selection. Compare gives half the viewport to a horizontally clipped table.

## Direction

- Shared compact collapsible navigation, 48px breadcrumb bar, 20–24px content gutters. One page title/action row; no duplicate section introductions.
- Home: question composer, compact starter choices, recent work in the first viewport. Drafts and AI history stay discoverable.
- Lists/catalog: common filter toolbar, 44–52px records, aligned numeric values, useful pagination only.
- Experiment: full-width comparison, concise protocol disclosure and shared tabs. Preserve uncertainty and provenance in contextual detail.
- Editor: task tabs for question, agents, conditions and execution; sticky execution summary/save. Advanced settings progressively disclosed.
- Run: compact replay toolbar, consistent tabs; environment and evidence remain the working surfaces. Keep mobile return-to-journal navigation.
- Agent: a contextual Sheet opened from the header, nonmodal on desktop and full-screen on mobile. Explicit design/experiment/run selection, shadcn Message/Bubble/MessageScroller, anchored composer, real evidence activity, follow-up context and linked turns. Retain Pydantic AI and bounded evidence gathering; attachments wait for a defined ingestion workflow.
- Avoid new large frameworks. Reuse existing API/query/data flow; no database migration or paid calls for this redesign.

## Acceptance / progress

- [x] Read-only audit of every route and competitor references.
- [x] Shared components, shell, tables and themes rebuilt.
- [x] Home, experiments, editor, experiment detail, runs, run detail, compare, environments and settings follow the same grammar.
- [x] Planner and investigator activity accurately reflects server state; failed requests are retryable; saved evidence remains accessible.
- [x] Browser flows: create/tune/drafts, filters/comparison, replay/inspection, chat pending/complete/failure, theme/navigation.
- [x] Desktop 1280/1440, tablet and mobile; long copy, empty/error/loading, keyboard and contrast checks.
- [x] Lint, types, unit tests, build, backend regressions and browser suite pass.
- [x] Fresh Impeccable review, synchronized design docs, clean handoff and server on 8080.

Final verification: 147 backend tests, five frontend unit tests and 20 keyless browser workflows passed, along with Ruff, ty, Biome and production build. Docker build/health and browser entry smoke passed. The finish reviewer inspected all 19 recaptures and returned `ship` for the four scored fixes: revision identity, mobile menu bounds, concurrent evidence and synchronized design documentation. No paid model calls were made.
