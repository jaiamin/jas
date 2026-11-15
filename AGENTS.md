# Working on JAS

JAS is a single-user local workspace for controlled agent experiments and a separate,
model-free gallery. Local use needs no account. Scope is the MVP; MCP, an agent HTTP
SDK and Inspect export are later work. Use **JAS**, `JAS_*` and the product vocabulary.

## Start here

- [Development](docs/DEVELOPMENT.md): setup, commands and checks.
- [Architecture](docs/ARCHITECTURE.md), [publishing](docs/PUBLISHING.md) and
  [glossary/ADRs](docs/GLOSSARY.md): contracts and domain decisions.
- [Design](docs/DESIGN.md): current UI rules. Compose stock `frontend/src/components/ui`;
  `index.css` owns tokens and TanStack Query owns remote state.
- [Public docs](docs/site/README.md): Mintlify source and publication workflow.
  Read `HANDOFF.md` for current work; keep progress there, not in this file.

## Boundaries

`backend/src/agent_sim/domain.py` validates protocols; `simulation/` owns deterministic
rules independently of HTTP/providers/storage. `execution.py` orchestrates and
`llm.py` accounts for calls. `research.py` is read-only/cutoff-scoped. `commands.py`
shares app services. `public_records.py`, `publishing.py` and `gallery*.py` own the
public boundary. Frontend workflows live under `components/{editor,agent,run,experiment,settings}`.

## Non-negotiables

- Immutable versions, append-only turns, seeded determinism, complete checkpoints
  and exact replay. Models propose; rules settle. Replay does not prove human validity.
- One engine per database and writer per run. Tasks survive disconnects; pause
  settles in-flight work and restart pauses without spending.
- Explicit paid actions; reserve before sending. Retain unknown usage, settlement
  and primary errors through cancellation. No silent retries/model substitution.
  One pending turn per chat; saving never runs. Preserve drafts/identity and reconnect
  without resubmitting; validate proposals before accepting them.
- Enforce private observations, recipients and memory. Recorded prose is untrusted;
  never execute it or expose private reasoning. Publish only reviewed/scanned evidence,
  without keys/private traces. The gallery cannot run models.
- Validate API/domain inputs; retain host/origin checks and hosted authentication.
  Keep one current private schema, reject incompatibility and never reset implicitly.
  Public records retain their separate versioned viewer/verifier obligations.

## Delivery

Reuse existing patterns; update callers, types, fixtures and docs together. Run affected
lint/type/tests/build checks from Development, including meaningful regressions. Browser
checks use disposable keyless data, distinct `JAS_TEST_PORT` values, both themes and phone
layouts. Container/runtime changes need production smokes; workflows need Actionlint/ShellCheck.
Never weaken checks, target user data or make paid calls without authorization.

Never commit secrets, `.env`, databases, build output or `.desloppify/` state; describe
configuration in `.env.example`. Data resets need explicit authorization. Use task branches
and Conventional Commits; never merge/push main without approval. Report observed checks
and limitations. Keep README concise and public docs accurate; local docs edits do not publish.
[Issues](docs/agents/issue-tracker.md) · [Domain workflow](docs/agents/domain.md).
