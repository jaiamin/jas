# Interface

The application uses compact shadcn controls, neutral light/dark surfaces, restrained
orange and sharp corners. [DESIGN.md](../DESIGN.md) defines the current visual tokens.
Experiment, replay, evidence, export, budget and revision behavior share the same shell.

## Evidence

Reviewed official documentation and product screenshots on 2026-11-07:

- [Langfuse trace UI](https://langfuse.com/docs/observability/overview): compact record toolbar, trace list and contextual evidence inspector. The live demo requires an account; public screenshots were used.
- [Braintrust comparisons](https://docs.braintrust.dev/evaluate/compare-experiments): checkbox selection, aligned metric tables, persistent comparison context.
- [Linear views](https://linear.app/docs/custom-views): one contextual toolbar, dense records, details revealed alongside work.
- [Vercel projects](https://vercel.com/docs/projects/managing-projects): concise creation controls and clear separation of work and settings. Public screenshot is an older project layout, not evidence of the current authenticated dashboard.
- [LangSmith threads](https://docs.langchain.com/langsmith/threads): conversation context with inspectable evidence, separate from execution traces.
- [shadcn dashboard](https://ui.shadcn.com/view/new-york-v4/dashboard-01), [sidebar](https://ui.shadcn.com/docs/components/radix/sidebar), [chat scrolling](https://ui.shadcn.com/docs/components/radix/message-scroller): standard primitives, collapsible navigation, anchored conversations.

## Interaction contracts

- Shared compact collapsible navigation, 48px breadcrumb bar, 20–24px content gutters. One page title/action row; no duplicate section introductions.
- Home: question composer, compact starter choices, recent work in the first viewport. Drafts and AI history stay discoverable.
- Lists/catalog: common filter toolbar, 44–52px records, aligned numeric values, useful pagination only.
- Experiment: full-width comparison, concise protocol disclosure and shared tabs. Preserve uncertainty and provenance in contextual detail.
- Editor: task tabs for question, agents, conditions and execution; sticky execution summary/save. Advanced settings progressively disclosed.
- Run: compact replay toolbar, consistent tabs; environment and evidence remain the working surfaces. Keep mobile return-to-journal navigation.
- Agent: a contextual Sheet opened from the header, nonmodal on desktop and full-screen on mobile. Explicit design/experiment/run selection, shadcn Message/Bubble/MessageScroller, anchored composer, real evidence activity, follow-up context and linked turns. Retain Pydantic AI and bounded evidence gathering; attachments wait for a defined ingestion workflow.

## Verification

The keyless Playwright suite in `frontend/e2e` covers create/tune/drafts,
filters/comparison, replay/inspection, assistant pending/complete/failure states,
themes and navigation. It owns a fresh keyless backend and temporary storage as described in
[README.md](../README.md#development). Historical screenshot reviews and completed
redesign checklists are available in Git history.
