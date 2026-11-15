# Custom environments

JAS can now compose resource economies from tested mechanics and save any supported setup
as an editable, deletable workspace record. This is a bounded composition engine, not an
arbitrary simulator or a promise that model-generated experiments are always optimal.

## Workflow

1. In Agent, describe the behavior, enforced rights, information and consequences you need.
   The planner may use an existing world, compose resource mechanics, or explain missing ones.
2. Review the proposed protocol. The Conditions editor exposes resources, access, visibility,
   needs and incentives. Check experiment runs without model calls and highlights limits.
3. Save custom environment to extract mechanical configuration examples. Questions,
   participant identities/models/harnesses, condition arms, memory, replication and analysis
   are excluded. Mechanical roles such as controllers remain unbound until an experiment
   assigns its participants. Environments lists these records separately from built-in choices. Edit & reuse updates
   a record; Delete requires confirmation. Updates reject stale revisions instead of silently
   overwriting newer edits.
4. Create experiment saves an independent immutable revision. Explicitly run it when ready.
   Editing/deleting the reusable environment cannot alter its experiments or evidence.

Reuse starts a neutral experiment with one baseline condition. Choose a question and population
independently; Conditions → Configuration examples applies another example with explicit role
bindings. Review shows the source revision and installed rule version. Specification/export
retain the full source definition and hash alongside the experiment's concrete rules. Library
examples are provenance, not live links or assertions that the configured conditions are identical.
Explicit built-in experiment templates remain available as a separate starting point.

Drafts retain their original source revision when the library changes, so stale updates fail
visibly instead of overwriting a newer entry. A draft remains recoverable after library deletion;
Save as new custom environment creates a separate library identity when needed.

Use **Hypothesis & analysis plan** for observable choice definitions, recorded fields,
formulas, denominators and comparison rules. Additional calculations belong there rather
than among registered metric identifiers. This plan is researcher-facing and is not sent
to participants. A written formula does not install a new automatically computed metric;
verify derived analyses against the recorded evidence.

Custom environments are stored beside the SQLite workspace in `<database-stem>.environments/`.
Back up that directory with the database. Format `jas-environment-v10` contains `definition` (version2,
world/rule version, name/description and configuration examples), plus ID, optimistic revision,
updated timestamp and definition hash. Examples contain mechanics parameters, optional tasks
and unbound roles. Create/update accept `{definition, revision}`; selection and extraction use
`POST /api/design/use-environment` and `POST /api/design/environment`.
Unsupported library/definition/rule versions and content hashes fail explicitly.
Database schema16 and export20 retain workflow rules and independently admitted
finite packages. Other persisted versions reject
explicitly. Preserve incompatible data separately when starting a fresh workspace;
see the [storage contract](ARCHITECTURE.md#storage).

The `reviewed_finite` backend profile additionally requires an actual immutable
external contract, explicit role bindings, static actor-private facts and a
matching independent executable admission. Its full finite transition table is
a declared prerequisite, not evidence of independently understood intent. It
does not replace the richer installed Worlds. See [extension review](EXTENSIONS.md)
for bounds and the current implementation/qualification scope.

## Artifact investigation, rules 2.0.0

Reusable artifact mechanics describe objects, structured initial contents, owner and
read/write ACL roles, a finite write allowance and content/source requirements.
They contain no investigator, role prose, model, harness or memory policy. Applying
an example creates one participant when only one binding is required; it never adds
a fabricated partner. Additional participants can be configured up to the overall
limit of 12. Study revisions retain the full source definition and concrete bound
parameters even if the library entry is later changed or deleted.

Immutable evidence fields are the reference for deterministic checks. Each accepted
write appends a version with exact source/version references and expected-version
conflict checking. Read, write, check, submit and stop remain executable permissions;
role names and model claims grant none. Sources and content are bounded data, never
code. Undeclared submission is an enforced content/source result. An explicitly
declared, versioned fallible pickup-note adjudicator can affect only submission
status after hard-fact and ACL validation; its explanation is not an enforced fact. A
recorded citation alone is not proof of reading; inspect delivered read receipts.
Generated execution uses separate admission and execution contracts. Three-person
coordination has its own installed World below.

## Distributed information, rules 1.0.0

The built-in template supplies a distributed-evidence task and a shared-information
control for three participants. Each participant has immutable local values for
cedar, quartz and reed, can read permitted evidence, draft shared work, send addressed
mail, wait, choose any alternative or stop personally. The all-match bonus is an
explicit incentive; no participant must cooperate and no outcome is labeled success.

Conditions expose sequential/phased timing, logical delay, activation/conflict orders,
message-route checkboxes, bonus, artifact contents and ACLs. The Specification editor
also edits alternatives, actor/value bindings and route ordering. Exactly three
participants are required. Switching from a smaller draft adds neutral participants
while retaining existing ones; additional unbound profiles must be removed before
saving. Configuration examples extract/rebind all three mechanical roles, orders,
routes and information bindings independently of participant names/goals/harnesses.

Phased inputs freeze until the barrier; physical inference may be serial. Equal-time
delivery follows the declared route order. Mailboxes persist across memory modes;
queued mail is private to its author until delivery. Terminal runs retain future mail
without flushing it. The run view is researcher-scoped: inspect choices/values,
pending proposals, delivery times, conflicts, artifact versions and source links.
Recorded-input inclusion requires a real request receipt; replay/restore do not sample.

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

Visibility changes information, not allocation rights or the utility formula. A fixed sole
controller has no enforced sanction, election or loss-of-authority consequence for retaining
resources. The experiment can test whether model choices respond to disclosure under those
rules; it cannot establish the effect of accountability institutions. Different controllers
for different resources can introduce reciprocal dependence. Sanctions or authority removal
require additional mechanics and should not be invented through role instructions.

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
Preflight consequence hashes include event disclosure metadata: a witness difference is not
itself a change in physical allocation or utility. Inspect the explicit accounting and trials.

The supported composition deliberately excludes per-person needs, arbitrary allocation vectors,
production recipes, loans/collateral, external tools and generated Python execution. One action
per round can constrain multi-resource coordination; the planner and preflight disclose it.
New mechanics need independent expected outcomes and additional engine work. Syntactic validity
and deterministic correctness do not establish question fidelity, realistic populations,
statistical power, human validity or truthful generated interpretations.

Preflight reports early resource exhaustion and passive agents when their controls
cannot support the proposed interaction. A declared factorial comparison must cover
its executable factor grid; duplicate arms and missing cells remain inspectable.
These mechanical checks do not certify question fidelity or a model's interpretation.
Historical paid diagnostics remain in Git history and private evidence archives;
use [benchmark instructions](../benchmarks/README.md) for fresh evaluations.

Reproduce the keyless correctness checks with:

```sh
uv run pytest backend/tests/test_composed.py backend/tests/test_environment_library.py backend/tests/test_validity.py backend/tests/test_planning.py backend/tests/test_assistants.py
pnpm --dir frontend test
JAS_TEST_PORT=8197 pnpm --dir frontend exec playwright test e2e/composition.spec.ts
```

Paid diagnostics are not part of these commands. Their saved designs, seeds, expectations
and full turn exports allow inspection and deterministic replay without additional model calls.
