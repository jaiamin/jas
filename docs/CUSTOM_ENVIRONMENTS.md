# Custom environments

JAS can now compose resource economies from tested mechanics and save any supported setup
as an editable, deletable workspace record. This is a bounded composition engine, not an
arbitrary simulator or a promise that model-generated experiments are always optimal.

## Workflow

1. In Agent, describe the behavior, enforced rights, information and consequences you need.
   The planner may use an existing world, compose resource mechanics, or explain missing ones.
2. Review the proposed protocol. The Conditions editor exposes resources, access, visibility,
   needs and incentives. Check experiment runs without model calls and highlights limits.
3. Save custom environment to reuse the rules, roles, conditions and execution settings.
   Environments lists these records separately from built-in templates. Edit & reuse updates
   a record; Delete requires confirmation. Updates reject stale revisions instead of silently
   overwriting newer edits.
4. Create experiment saves an independent immutable revision. Explicitly run it when ready.
   Editing/deleting the reusable environment cannot alter its experiments or evidence.

Custom environments are stored beside the SQLite workspace in `<database-stem>.environments/`.
Back up that directory with the database. Browser-only reusable setups have been removed;
there is no legacy importer. Existing saved experiments and their embedded evidence are retained.

## Resource primitives, rules 1.0.0

Each of one to four resources specifies:

| Mechanic | Enforced behavior |
| --- | --- |
| Stock and capacity | Initial finite shared inventory; allocations/extraction deduct actual units. |
| Controllers | Empty permits everyone to extract. Otherwise only listed participants can allocate shared stock. |
| Allocation | One selected recipient, including self, or equal division of a requested total among everyone. |
| Action limit | Maximum total request per turn. Excess demand receives only the remaining stock; no negative inventory. |
| Personal transfers | Optional integer transfers of personally held inventory to another participant. |
| Need | Uniform units consumed from each participant's inventory at every round end. Fractions are permitted after equal division. |
| Utility | Consumed units earn value, unmet units incur a penalty, and terminal personal inventory earns its specified value. Utility is not spendable stock. |
| Replenishment | Fixed units added after consumption in nonterminal rounds, capped by shared carrying capacity. |
| Stock visibility | Current shared stock is public or visible only to its controllers. Hidden is null, not zero. |
| Allocation visibility | Public receipts and current inventories, or party-only receipts and own inventory. |
| Turn order | Seeded order; optionally controllers before other participants. One action per agent per round across all resources. |

Participants receive the applicable visibility rules and utility formula. Hidden initial stock
is not supplied by the engine; planners are instructed not to put it in public context or
private participant instructions. Private records cannot prevent inference from own receipts,
messages or deliberately disclosed information. Public allocations and current inventories
are a declared information bundle; studying either alone needs an additional mechanic.
Synthetic-signal reports are not stock reports or a verification mechanism. Promises and
forecasts are unsupported in this world.

## Shortage example

The custom-resource template has four agents, one allocation controller, 18 units of food,
no replenishment and one unit of need per agent in each of six rounds. At least six units of
need must go unmet even under ideal sharing. The example compares public receipts/inventories
with party-only receipts while keeping stock public and holding permissions and incentives fixed.
This isolates that specified information bundle. It does not cover every meaning of transparency.

For an independent exact oracle, correctness tests use 12 units over three rounds. Equal
allocations of four units per round meet everyone's needs and yield total utility 24. Allocating
all 12 units to the controller yields controller utility 15, others -9 each, and total utility -12.
Both strategies are legal; the engine and scoring distinguish them without presuming intent.
Keeping the same actions while changing visibility preserves physical outcomes but changes
participant information. Model trials must discover whether choices actually respond.

The investigator receives cutoff-scoped stock, personal inventory, consumption and unmet-need
accounting, separately from utility balances. The run Environment view labels researcher-only
access and shows each resource's ledger. Study exports contain complete composed rules,
checkpoints, actual observations, actions and events for replay.

## Verification and limits

Independent tests cover exact strategy outcomes, stock conservation across access/visibility/
need/replenishment/seed combinations, action atomicity, permission enforcement, privacy,
multiple resources, deterministic checkpoint restoration and exact replay. The broader protocol
matrix also varies memory, channels, agent counts and horizon. API tests edit/delete a library
record and then execute/replay its unchanged experiment. Browser flows cover resource edits,
creation, reuse, deletion and retained evidence at desktop and mobile sizes.

The supported composition deliberately excludes per-person needs, arbitrary allocation vectors,
production recipes, loans/collateral, external tools and generated Python execution. One action
per round can constrain multi-resource coordination; the planner and preflight disclose it.
New mechanics need independent expected outcomes and additional engine work. Syntactic validity
and deterministic correctness do not establish question fidelity, realistic populations,
statistical power, human validity or truthful generated interpretations.

Planner diagnostics use six public development questions, each repeated twice: the original
shortage request with an explicit operational scope, hidden stock, private receipts, two-resource
transfers, unsupported individual needs/allocation vectors, and unsupported production/tools.
The first batch passed 9/12 attempts. Its failures exposed outcome labels mistaken for missing
mechanics, disabled controls mistaken for unsupported transfers, and equal extraction rights
mistaken for unequal allocation power. The corrected planner passed 12/12 on the same cases.
These are development results, not held-out generalization or an insight-quality score.

Four additional model runs compare public/party-only allocation information across matched
seeds 7/19: four agents, four rounds, 12 food units and 16 required units per run. All 64
decisions completed, and all runs passed independent conservation, need, utility, nonnegativity
and exact replay checks. In all four runs, the three noncontrollers consumed no food. This
small diagnostic does not establish that transparency improves cooperation or predicts a
population effect. It also does not certify participant optimality or narrative accuracy.

All paid diagnostics use only `openai:gpt-6-luna` and the existing $75 aggregate ledger.
Each planner batch has an additional $2 ceiling; participant and verbatim-question checks
have separate additional $1 ceilings. Actual costs and source fingerprints are recorded in
HANDOFF.md. Local manifests, exact source archives, attempts and sanitized provider traces
live in `data/quality/composition-model-development/`, `composition-model-final/`,
`composition-model-raw-question/` and `composition-participants/`. Historical benchmark reports
and frozen families remain unchanged. A line wrap after the final planner batch preserved
every backend AST and string value; its provenance file records both source byte hashes.

Reproduce the keyless correctness checks with:

```sh
uv run pytest backend/tests/test_composed.py backend/tests/test_environment_library.py backend/tests/test_assistants.py
pnpm --dir frontend test
JAS_TEST_PORT=8197 pnpm --dir frontend test:e2e -- composition.spec.ts
```

Paid diagnostics are not part of these commands. Their saved designs, seeds, expectations
and full turn exports allow inspection and deterministic replay without additional model calls.
