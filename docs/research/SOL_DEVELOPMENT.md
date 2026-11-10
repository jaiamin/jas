# Sol Researcher development comparison

Status: protocol frozen before fresh calls; execution and semantic review pending.
This is development evidence, not held-out validation or an intelligence score.

Compare accepted pre-T05 `c546c857348cb433163d52f99efc07f790a17288` with
accepted T04/T05 `7eea89f128b34c83ea95cb156d1f0df8468b4421`, using the same
[eight-case protocol](../../benchmarks/researcher-development-cases.json), one
attempt per case and the application HTTP workflow. Only Sol Researcher requests
are permitted. Preserve actual model IDs, settings, operations, errors, source
archives, all terminal analyses and separate ledgers. No retries, provider/model
replacement, paid web tools or participant inference are permitted.

The two sources intentionally use separate schema-4/schema-5 disposable databases.
Each ledger has a fixed $0.75 ceiling; the combined allocation is **$1.50** of
the user's **$10 total** fresh Sol allowance. Unknown usage stays conservatively
charged. No other agent has a paid allocation. This reserves $8.50 for later
iterations; actual charges and remaining allowance will be recorded after the
trial. Existing user databases and historical evaluation ledgers are not used.

Official OpenAI documentation was fetched before trials on 2026-11-10:
[model](https://developers.openai.com/api/docs/models/gpt-6.1-sol) and
[pricing](https://developers.openai.com/api/docs/pricing). Both list
`gpt-6.1-sol` at standard input/output $2/$10 per million tokens, matching the
app's reviewed rates. Cached inputs are conservatively charged at full input
price by this ledger. These charges are estimates, not an independently checked
provider invoice. Raw official pages/text are retained in ignored
`.tools/research-harness/sol-development/docs/`.

Assess the frozen semantic facets against final answers and actual evidence;
tool execution is a separate mechanism check, not a substitute for correct
claims. Independently recompute simple balances and action rejection, verify
source invariance and scope boundaries, and inspect proposal factors. Do not
give credit merely for requesting a tool, citing a source or mentioning a
keyword. An honest unsupported/unknown answer can be safe while failing a
retrieval capability. Keep these dimensions separate. A single trial per case
cannot estimate reliability or show broad generalization. Any repaired cases
or harnesses need new version identities, retained old results and explicit
development attribution.
