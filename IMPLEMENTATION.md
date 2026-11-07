# ASS implementation

## Acceptance and observed status

- [x] Research synthesis, ontology, relational schema and product boundaries recorded.
- [x] Natural-language proposals and provider-free manual editing; validation before saving.
- [x] Three explicit adapters: commons, trust exchange and dependency-based coordination.
- [x] Private facts, messages, memory conditions, commitments, named tasks, resource shocks
      and heterogeneous agent models; immutable condition/seed/repetition matrices.
- [x] Atomic checkpoints, exact replay, browser-independent execution, pause/resume/restart,
      one writer per run, bounded concurrency and atomic spending reservations.
- [x] React workspace with compact tables, evidence inspector, comparisons, annotations,
      read-only AI investigation, preserved revisions, exports and light/dark themes.
- [x] Live OpenAI pilots, a completed 120-turn run and cited run/study investigations.
- [x] Ruff, ty, 36 backend tests, Biome, 3 frontend tests, production build, 5 browser flows,
      Docker build/health/persistence and actionlint pass locally.
- [x] Final Impeccable review, two resolved copy fixes, orange design documentation and
      staged secret scan; light/dark text and control contrast verified.
- [x] Latest frontend and API running together on 8080; task branch committed and draft
      PR opened: https://github.com/jaiamin/ass/pull/3.

## Decisions

Fresh implementation replaces the old Python/NiceGUI prototype; ignored old run databases
remain untouched. New local data is `data/ass.sqlite3`. SQLite WAL and SQLAlchemy relational
identities/indexes serve one process; immutable JSON stores protocol/state payloads. Schema
v2 adds request traces without dropping v1 data. No vector database, hosted infrastructure,
Google login, invented tenant controls or unused provider gateways.

Agent decisions default to GPT-6 Luna; design and investigation use GPT-6.1 Sol. No model
substitution, scripted successful agents, automatic retry or generated-code execution.
New protocols use low OpenAI reasoning effort. Causal decisions within a run remain
sequential; independent runs use three slots. In-flight pause finishes and commits its turn.

A turn is an execution boundary; environment rules determine simultaneous settlement,
paired opportunities, persistent task progress and early completion. Resource schedules
support actual within-run shocks. Free-form context changes the setting, not the mechanics.
False reports do not prove intent; relationship edges do not prove emotion. Human validity
needs independent human data. Enterprise hosting needs governance and scale work together.

## Validation ledger · 2026-11-07

- 19 completed live runs across three adapters; 318 turns reproduced exactly from actions.
- GPT-6 Luna 120-turn run completed with 120 requests, estimated $0.027516.
- Total app ledger: 413 requests, estimated/reserved $1.242269, including unknown usage.
  This is not a provider invoice; the minimal unavailable-model diagnostic is outside it.
- Recorded design benchmark: initial 21/26; latest outputs 25/26 under a changed rubric.
  All attempts retained. Adaptation measurement still fails. This is coverage, not validity.
- Requested GPT-6.1 Luna follow-up: HTTP 404 `model_not_found`; unrun, no substitution.
- 36 full-page desktop/mobile light/dark captures; no document overflow or page exceptions.
- Orange/neutral themes preserve the layout; mobile selection and return paths verified.
- Keyless Docker instance preserves all four test studies across restart.

## Remaining limits and next experiments

No live Anthropic call, human validation, hosted multi-user security or large-load claim.
Bounded investigator reads may require narrower questions. Full checkpoints and whole-run
JSON favor auditability; paginate/compact before large studies. Holdout cases are reserved
and have not been used for prompt tuning. Calibrate durations, inventories, information
acquisition or enforceable contracts one tested adapter at a time; do not turn narrative
plausibility into a result.
