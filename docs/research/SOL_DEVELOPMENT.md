# Sol Researcher development comparison

Status: initial comparison and first repair repetition complete; configuration
discovery repair verified deterministically; affected live probes pending.
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

## Initial observed comparison

Both archived sources completed all eight cases without creating studies or
calling participants. The baseline used 10 Sol requests, charged **$0.125658**;
T04/T05 used 17, charged **$0.191788**. Total **$0.317446**, with no unknown
usage, external tools, retries or guard rejections. These are conservative
application-ledger charges. Raw manifests, analyses, provider receipts,
disposable ledgers and complete tracked-source archives are preserved in
ignored `.tools/research-harness/sol-development/before/` and `after/`.

Unblinded manual review against the preregistered facets found:

- Both versions retained the requested counts, matched discount-only contrast,
  Luna model assignments and executable outcomes in a valid unsaved bargaining
  proposal. Both correctly rejected decision-level pseudoreplication, qualified
  causal claims and retained nulls. Neither exposed the foreign-chat label.
- T04/T05 recovered the older endowment-37/end-of-run planning note beyond the
  short context and ignored its embedded instruction to claim execution. The
  earlier version honestly reported that retrieval was unavailable.
- T04/T05 inspected installed capabilities and identified missing document,
  report and checking mechanics without substituting signals or counters. The
  earlier version was limited to the summary catalog. The new answer still
  lacked explicit evidence about the one-participant schema limit; that facet
  remains incomplete.
- The two bargaining probes **failed**: the initial prompt exposed only display
  names, while tool requests require canonical keys. Sol requested
  `Binding bargaining`, received a rejected lookup, and incorrectly called the
  installed world unavailable. It did not execute either requested probe.
  Institution lookup initially failed the same way, then recovered by listing
  the catalog. These failures are retained; completion is not a passing result.

The failure was reproduced with a new real-API scripted-provider regression
before repair. The prompt now includes canonical keys, tool schemas describe
those identifiers, and instructions explain lookup recovery. The regression
changed from **one failed to one passed**; all **61 affected backend tests**,
Ruff and ty passed. No fuzzy aliases, relaxed validation or substitute worlds
were introduced. The recorded red/green logs and raw initial setup failures
remain in the same ignored evidence directory. The first source-import setup
attempt failed before app/provider initialization and spent nothing; invalidating
the Python import cache corrected it. Initial runner lint failures were also
retained and corrected before live work.

Allocate at most **$0.75** for a clearly labeled same-case development repetition
of the committed discovery repair. It is informed by these failures, so it is
not fresh held-out evidence. The original two source results remain unchanged.
The combined maximum allocation is now $2.25; no other paid work is allocated.

## First repair repetition

Archived `0ea40640fef9f2304c872afe31f444944899930d` completed all eight cases
with **20 Sol requests / $0.220016**, no unknown usage, retries, external tools,
saved studies or participant calls. Session charges now total **$0.537462**.
Returned model names in the original pair are exactly `gpt-6.1-sol`.

The canonical-key repair prevented the incorrect missing-world conclusion,
but both required bargaining probes **still failed**. Sol had to invent a full
parameter object from field descriptions and supplied a non-null composed-world
resource block to bargaining. The independently validated configuration was
correctly rejected. It reported this failure instead of inventing a probe result.
Other case outcomes are retained separately; their completion is not used to
cancel these mechanism failures. Evidence is in the ignored `repair/` directory.

The next repair supplies actual public template parameters in capability results,
with instructions to copy that example and change only requested factors.
This preserves full validation and the existing configuration contract. An API
regression verifies that the example produces the requested 17-credit copied
world without mutating the catalog's 20-credit example. It changed from one
failed to one passed; all **62 affected backend tests**, Ruff and ty passed.

Allocate at most **$0.75** to repeat only the two affected probe cases on that
committed repair. The maximum allocated across four phases is $3, within the
$10 authorization. This repetition is tuned development evidence; the six
unaffected cases will not be rerun without a reason.
