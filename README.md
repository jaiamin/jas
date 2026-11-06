# Agent sandbox

A small Python sandbox for running and inspecting agent experiments. The headless runner
and NiceGUI viewer use the same rules, policies, controls and SQLite journal.
Frontier Colony is the first environment; the runner knows nothing about colony mechanics.

## Start

Python 3.11+:

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -e '.[viewer,dev]'
sandbox run                         # offline, seeded, 120 turns
sandbox view                        # http://localhost:8080
```

Run commands from the repository root. Install `pip install -e .` for the headless CLI
without NiceGUI; `.[viewer]` adds the viewer and `.[dev]` adds pytest and Ruff.
No frontend build, database server, accounts, telemetry, or model calls are needed for the demo.

If this runs inside a Docker Sandbox, expose the viewer from your **host** with
`sbx ports <sandbox-name> --publish 8080:8080` and open `http://localhost:8080` there.
The viewer binds to `0.0.0.0`; it is a local research tool with no authentication.

## Headless workflow

```bash
sandbox validate scenarios/frontier.yaml
sandbox --db runs.sqlite3 run scenarios/frontier.yaml --steps 24
sandbox runs
sandbox resume RUN_ID --steps 12
sandbox replay RUN_ID --tick 18       # full saved frame as JSON
sandbox replay RUN_ID --verify        # execute recorded actions, no policies or model calls
sandbox validate experiments/resilience.yaml --experiment
sandbox experiment experiments/resilience.yaml > results.json
pytest -q
ruff check src tests
```

`--db` and `--verbose` precede the subcommand. Commands print JSON to stdout and progress/errors
to stderr. Ctrl+C pauses at the last committed checkpoint. `resume` continues the **same** run;
its original scenario and budgets are immutable. Use a new run to change configuration.
Use one active writer per run; multiple independent runs can share the database.

## Models and spending

Only OpenAI and Anthropic are accepted. Their SDKs read `OPENAI_API_KEY` and
`ANTHROPIC_API_KEY` from the existing environment, including keys passed into the sandbox.
Keys never go in YAML or SQLite. There is no automatic provider fallback.
Model identifiers are explicit and editable in YAML; the supplied names are examples,
not a promise about model availability in your account.

```bash
# Explicit paid opt-in; at most 12 model requests for this short run.
sandbox run scenarios/frontier_models.yaml --paid

# Offline baseline plus two model coordinators, capped at four requests in total.
sandbox experiment experiments/providers.yaml --paid
```

The viewer defaults to the offline Frontier scenario. To use models, select
“Frontier Colony · paid models”, check **Allow paid calls**, then **New run**.
Selecting a paid scenario alone never sends a request. Step or Play executes the calls.
Resuming a paid run also requires opt-in. Saved replay always works offline, without keys.

Each decision uses PydanticAI's typed `Decision[SandboxAction]` output. No tools,
conversation history, SDK retries, output retries, or hidden second requests are enabled.
The run stores a call reservation **before** sending. Invalid output, timeouts and interrupted
requests remain charged against the cap; they never silently become demo actions.

`limits` sets the maximum calls, per-call input/output tokens, total tokens and timeout.
Before each call, a conservative UTF-8 byte estimate of the input, schema and instructions
must fit the input cap. The entire configured input + output allowance is reserved against
the total token budget; a successful response settles to provider-reported usage.
Unknown usage keeps the full reservation. PydanticAI checks reported token usage and the
provider receives the output limit. These are request/token caps, **not a dollar guarantee**;
provider tokenization/accounting and pricing remain external. Reaching a cap stops the run
at its last checkpoint. Experiment caps apply in addition to per-run caps.

## Viewer

The dark workspace prioritizes inspecting one run:

- Scenario and seed selection; Step, Play and Pause operate one atomic turn at a time.
- Clickable colony map with keyboard-accessible facility buttons and settler selection.
- Agent goals, private memory, last action and rationale, radio inbox, and exact decision input.
- Resource history and a turn-indexed event feed, including rejected actions and storms.
- Saved-run selection and a turn slider. Replay reads saved frames, with no model calls.
- **Resume latest** exits replay and restores the newest checkpoint. It does not branch from
  an earlier frame. Pause lets an in-flight request finish and prevents the next turn.

Each browser tab owns its own live run. Checkpoints remain available after closing the tab.
The viewer is optional and no environment imports NiceGUI during headless execution.

## Frontier Colony rules

Six settlers share food, energy and materials across five connected facilities:
Habitat, Greenhouse, Reactor, Quarry and Workshop. The graph is fixed; settlers move one
connection per action. Round-robin selection skips settlers with zero health.

| Action | Python-enforced outcome |
| --- | --- |
| Move | Adjacent facility only; costs 3 stamina. |
| Work | Costs 12 stamina. Greenhouse produces food, reactor energy, quarry materials. Greenhouse/quarry consume 1 energy. Workshop converts 2 energy to 3 materials. Habitat has no production. |
| Rest | Recovers 35 stamina at the habitat, 25 elsewhere, up to 100. |
| Repair | Costs 3 materials and 8 stamina; restores 20 facility integrity, up to 100. |
| Build | Upgrades the current facility, up to level 3; costs `8 + 4 × level` materials, 2 energy and 15 stamina. Production upgrades improve greenhouse/reactor/quarry yield. |

Every six turns, the colony consumes the scenario's food and energy allowances. Shortages
reduce settler health by 8; a supplied cycle restores 2 health for surviving settlers.
Seeded storms damage facilities. Integrity below 30 halves production; zero prevents work.
Invalid actions consume a turn and produce a rejection event without granting their effects.
Radio can accompany any physical action, including a rejected one.

Settlers see shared resources, public facility conditions, their own state, colocated
settlers and their own radio inbox. They cannot read another settler's memory or inbox.
The researcher can inspect all agents in the viewer. Memory is an 800-character private note
replaced after each decision. Radio is limited to 240 characters, with the last 12 received
messages retained per agent. Observations include the rules, so both demo and model policies
operate from the same information.

## Configuration and experiments

YAML is loaded with `safe_load` and validated by Pydantic with unknown fields rejected.
Environment parameters are validated against the selected sandbox's parameter model.
See `scenarios/` for complete offline and paid examples.

A scenario defines `sandbox`, `name`, `seed`, `max_steps`, `parameters`, `agents`, `models`
and `limits`. Profiles define an id, name, goal, `demo`/`model` policy and optional model alias.
Model aliases resolve only to `openai:MODEL` or `anthropic:MODEL`.

An experiment defines a scenario path **relative to the experiment YAML**, conditions, seeds,
repetitions, requested metrics and a total call cap. Optional `max_steps` bounds all its runs.
Conditions merge environment parameters, select a shared policy/model, optionally override
individual profiles' goal/policy/model, and can replace per-run limits. All expanded scenarios
and metric names are checked before the first run or paid call. Each condition runs against
the same seed list. Repetitions deliberately reuse the seed: the environment stays controlled
while model decisions can differ. Offline repetitions are identical by design.
Execution is sequential; output includes every run id, selected final metrics and condition
means. The experiment label, condition, repetition and metrics are also saved with each run.
If execution fails, completed runs stay in SQLite; there is no automatic experiment restart.

## Adding a sandbox

Start with a single environment module and Pydantic parameter/action models. Implement the
`Sandbox` protocol in [sandbox.py](src/agent_sandbox/sandbox.py):

```python
class YourSandbox:
    action_type = YourAction

    def initialize(self, parameters: dict, agent_ids: list[str], seed: int) -> None: ...
    def observe(self, agent_id: str) -> dict: ...
    def next_agent(self) -> str | None: ...  # None means terminal
    def step(self, agent_id: str, action: YourAction) -> list[Event]: ...
    def metrics(self) -> dict[str, float]: ...
    def snapshot(self) -> dict: ...
    def restore(self, snapshot: dict) -> None: ...
```

Snapshots and observations must be JSON-serializable, finite, and detached from mutable state.
Snapshot **everything** affecting future outcomes, including RNG state, turn order, inboxes
and environment parameters. Use an instance-local seeded RNG, never wall-clock time or global
randomness. `step` must enforce legality and outcomes; typed output alone is not rule validation.
Keep visibility in `observe`, scheduling in `next_agent`, and domain metrics in `metrics`.
The runner stores private memory separately; it supplies policies with `{environment, profile, memory}`.

Register one `SandboxSpec` in `sandboxes.SANDBOXES`:

```python
SANDBOXES['your_sandbox'] = SandboxSpec(
    parameters=YourParameters,
    create=YourSandbox,
    demo=your_demo,  # (observation, agent_index) -> YourAction
    panel=None,     # optional (snapshot, select_agent) -> None
)
```

Add a YAML scenario naming `your_sandbox`. The runner, CLI, budgets, checkpoints, experiments
and replay need no changes. Without a panel, the viewer shows the environment snapshot and
generic agent inspection. If desired, add a panel in a separate module, lazily importing NiceGUI
there. The panel may inspect the researcher's complete snapshot; it cannot change simulation state.

[test_runner.py](tests/test_runner.py) includes a tiny counter environment exercising this
contract independently of colony concepts. Tests also verify full seeded trajectories across
resume, exact replay, local visibility, invalid actions, strict YAML and typed mock-model budgets.

## Saved data and replay

SQLite has two tables: `runs` stores the resolved scenario, metadata, status, errors and
usage; `frames` stores each observation, validated decision, events, metrics and full checkpoint.
Frame zero is initialization. Every subsequent frame commits atomically; failed steps restore
the previous state. Both the database schema and checkpoints carry a version.
Copy the SQLite database while the app is stopped, or use SQLite's backup API while it runs.

Replay displays stored frames, so it does not depend on model determinism or provider access.
`replay --verify` additionally re-executes the recorded actions against environment code and
compares every checkpoint, event and metric, including RNG state. It reports drift when rules
change. Model randomness is not seeded; recorded decisions are the source of exact replay.
This project intentionally has no plugin loader, workflow engine, distributed scheduler,
ORM, vector memory, or background job service.
