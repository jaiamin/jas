"""A read-only evaluation library and focused controls for the shared runner."""

import json
from pathlib import Path

from nicegui import ui

from .config import load_scenario
from .presentation import (
    chart_options,
    comparison_metrics,
    cost_label,
    model_label,
    run_models,
    run_row,
    title,
)
from .replay import verify
from .runner import Runner
from .sandboxes import get_sandbox
from .store import Store

COST_NOTE = (
    "Whole-run estimate at standard USD list prices, before credits or cache discounts. "
    "Unknown pending/failed usage is excluded and marked partial. Mixed or unpriced models "
    "have no estimate."
)


def columns(*items):
    return [
        {"name": key, "field": key, "label": label, "align": "left", "sortable": True}
        for key, label in items
    ]


def key_values(values):
    with ui.column().classes("key-values gap-0"):
        for key, value in values:
            with ui.element("div").classes("key-value"):
                ui.label(key)
                ui.label(str(value))


def empty_state(heading, description):
    with ui.element("div").classes("empty-state"):
        ui.label(heading).classes("section-title").props('role="heading" aria-level="2"')
        ui.label(description).classes("description")


def metric_table(current, initial):
    with ui.element("table").classes("metric-table"):
        with ui.element("thead"):
            with ui.element("tr"):
                for label in ("Metric", "Current", "Change"):
                    with ui.element("th").props('scope="col"'):
                        ui.label(label)
        with ui.element("tbody"):
            for key, value in current.items():
                delta = value - initial.get(key, value)
                with ui.element("tr"):
                    with ui.element("td"):
                        ui.label(title(key))
                    with ui.element("td"):
                        ui.label(f"{value:g}")
                    with ui.element("td"):
                        ui.label(f"{delta:+g}" if delta else "—")


def serve(db_path: str, scenario_dir: str, host: str, port: int):
    scenarios = {str(p): load_scenario(p) for p in sorted(Path(scenario_dir).glob("*.yaml"))}
    if not scenarios:
        raise ValueError(f"No scenario YAML files in {scenario_dir}")
    default = next((p for p in scenarios if Path(p).stem == "frontier"), next(iter(scenarios)))

    @ui.page("/")
    def page():
        ui.dark_mode().enable()
        ui.colors(primary="#85b8d2", secondary="#bcadcf", positive="#8ebca7", warning="#d6b57b")
        ui.add_css(Path(__file__).with_name("viewer.css").read_text())
        store = Store(db_path)
        client = ui.context.client

        class View:
            section = "runs"
            run_id = ""
            runner: Runner | None = None
            tick = 0
            selected = ""
            playing = False
            busy = False
            replay = True
            pause_requested = False
            error = ""
            tab = "overview"
            metric = ""
            comparison_metric = ""
            selected_runs = []
            search = ""
            status_filter = "all"
            environment_filter = "all"
            scenario = default
            actor_filter = "all"

        view = View()

        def stop():
            view.playing = False
            view.pause_requested = view.busy
            if view.runner:
                view.runner.pause()

        def navigate(section):
            stop()
            ui.run_javascript(f"if (window.innerWidth <= 1100) getElement({drawer.id}).hide()")
            view.section, view.error = section, ""
            render.refresh()

        def open_run(run_id):
            if view.busy:
                ui.notify("Pause and wait for the current request before changing runs.")
                return
            stop()
            record = store.run(run_id)
            view.run_id, view.runner = run_id, None
            view.tick = store.frame(run_id)["tick"]
            view.selected = record["scenario"]["agents"][0]["id"]
            view.section, view.replay, view.tab, view.error = "run", True, "overview", ""
            view.metric, view.actor_filter = "", "all"
            render.refresh()

        def new_setup(path=None):
            if view.busy:
                ui.notify("Wait for the current request to finish before creating a run.")
                return
            stop()
            if path:
                view.scenario = path
            view.section, view.error = "new", ""
            render.refresh()

        def resume():
            try:
                view.runner = Runner(store, view.run_id)
                view.tick, view.replay, view.error = view.runner.tick, False, ""
            except ValueError as error:
                view.error = str(error)
            render.refresh()

        def select_turn(tick, *, decision=False):
            if view.busy:
                return
            stop()
            view.tick, view.replay = int(tick), True
            if decision:
                frame = store.frame(view.run_id, view.tick)
                if frame["actor"]:
                    view.selected = frame["actor"]
                view.tab = "decisions"
            render.refresh()

        def select_agent(agent):
            view.selected, view.tab = agent, "decisions"
            render.refresh()

        def toggle():
            if view.playing:
                stop()
            else:
                view.playing = True
                if view.runner and not view.replay:
                    view.runner.playing = True
                latest = store.frame(view.run_id)["tick"]
                if view.replay and view.tick == latest:
                    view.tick = 0
            render.refresh()

        async def advance():
            if view.busy or not view.run_id:
                return
            view.busy, view.error = True, ""
            view.pause_requested = False
            render.refresh()
            try:
                if view.replay:
                    latest = store.frame(view.run_id)["tick"]
                    view.tick = min(view.tick + 1, latest)
                    if view.tick == latest:
                        stop()
                else:
                    await view.runner.step()
                    view.tick = view.runner.tick
                    if view.runner.finished:
                        stop()
            except Exception as error:
                stop()
                detail = str(error) if isinstance(error, ValueError) else type(error).__name__
                view.error = f"Stopped at turn {view.tick}: {detail.rstrip('.')}."
            finally:
                view.busy = False
                render.refresh()

        async def timer_tick():
            if view.playing and not view.busy:
                await advance()

        def export_run():
            data = {"run": store.run(view.run_id), "frames": store.frames(view.run_id)}
            ui.download(json.dumps(data, indent=2).encode(), f"run-{view.run_id}.json")

        def verify_run():
            try:
                count = verify(store, view.run_id)
                ui.notify(f"Verified {count} recorded turns.", type="positive")
            except ValueError as error:
                view.error = str(error)
                render.refresh()

        with (
            ui.left_drawer(top_corner=True)
            .props("width=196 breakpoint=1100")
            .classes("sidebar") as drawer
        ):
            with ui.column().classes("sidebar-inner"):
                with ui.column().classes("gap-0"):
                    ui.label("Agent sandbox").classes("brand")
                    ui.label("Evaluation workspace").classes("brand-caption")
                with ui.column().classes("nav-items"):
                    runs_nav = ui.button(
                        "Runs", icon="view_list", on_click=lambda: navigate("runs")
                    )
                    env_nav = ui.button(
                        "Environments",
                        icon="account_tree",
                        on_click=lambda: navigate("environments"),
                    )
                    for button in (runs_nav, env_nav):
                        button.props("flat no-caps").classes("nav-item")
                with ui.column().classes("sidebar-footer gap-1"):
                    ui.label("Local workspace")
                    ui.label("SQLite checkpoints · v0.1").classes("text-xs")

        with ui.header().classes("shell-header"):
            with ui.row():
                ui.button(icon="menu", on_click=drawer.toggle).props(
                    'flat round dense aria-label="Toggle navigation"'
                ).classes("menu-toggle")
                shell_path = ui.label("Workspace / Runs").classes("shell-path")
                ui.label("Agent evaluation").classes("shell-meta")

        def heading(text, description=None, *, new_button=False):
            with ui.row().classes("page-heading"):
                with ui.column():
                    ui.label(text).classes("page-title").props('role="heading" aria-level="1"')
                    if description:
                        ui.label(description).classes("description")
                if new_button:
                    ui.button(
                        "New run", icon="add", color=None, on_click=lambda: new_setup()
                    ).props("unelevated no-caps").classes("primary-action")

        def library():
            records = store.runs()
            rows = [run_row(record) for record in records]
            if view.status_filter not in {row["status"] for row in rows}:
                view.status_filter = "all"
            if view.environment_filter not in {row["environment"] for row in rows}:
                view.environment_filter = "all"
            heading(
                "Runs", "Explore evaluations, compare outcomes, or continue a run.", new_button=True
            )
            if not rows:
                empty_state(
                    "Your first evaluation starts here",
                    "Create a run from a scenario. "
                    "It starts paused, ready for you to step through or play.",
                )
                return

            def filter_rows():
                query = view.search.strip().lower()
                return [
                    row
                    for row in rows
                    if (not query or query in " ".join(str(v) for v in row.values()).lower())
                    and (view.status_filter == "all" or row["status"] == view.status_filter)
                    and (
                        view.environment_filter == "all"
                        or row["environment"] == view.environment_filter
                    )
                ]

            def apply_filters():
                view.selected_runs = []
                table.selected = []
                table.update_rows(filter_rows())
                compare_button.set_enabled(False)
                count.set_text(f"{len(filter_rows())} of {len(rows)} runs")

            def compare_selected():
                selected = [r for r in records if r["id"] in view.selected_runs]
                try:
                    comparison_metrics(selected)
                except ValueError as error:
                    ui.notify(str(error), type="warning")
                    return
                view.section = "compare"
                render.refresh()

            with ui.row().classes("filters"):
                search = ui.input(placeholder="Search runs, models, seeds…", value=view.search)
                search.props('outlined dense clearable aria-label="Search runs"').classes(
                    "search-field"
                )
                search.on_value_change(
                    lambda e: (setattr(view, "search", e.value or ""), apply_filters())
                )
                statuses = {"all": "All statuses", **{r["status"]: r["status"] for r in rows}}
                ui.select(
                    statuses,
                    value=view.status_filter,
                    label="Status",
                    on_change=lambda e: (setattr(view, "status_filter", e.value), apply_filters()),
                ).props("outlined dense").classes("filter-field")
                environments = {
                    "all": "All environments",
                    **{r["environment"]: r["environment"] for r in rows},
                }
                ui.select(
                    environments,
                    value=view.environment_filter,
                    label="Environment",
                    on_change=lambda e: (
                        setattr(view, "environment_filter", e.value),
                        apply_filters(),
                    ),
                ).props("outlined dense").classes("filter-field")
                compare_button = (
                    ui.button("Compare runs", icon="compare_arrows", on_click=compare_selected)
                    .props("outline no-caps")
                    .classes("selection-action")
                )
                compare_button.set_enabled(len(view.selected_runs) >= 2)
            with ui.row().classes("section-row"):
                count = ui.label(f"{len(filter_rows())} of {len(rows)} runs").classes(
                    "muted text-xs"
                )
                ui.button("Refresh", icon="refresh", on_click=render.refresh).props(
                    "flat dense no-caps"
                )
            with ui.element("div").classes("table-frame"):
                table = (
                    ui.table(
                        columns=columns(
                            ("name", "Run"),
                            ("status", "Status"),
                            ("model", "Model"),
                            ("tick", "Turns"),
                            ("seed", "Seed"),
                            ("cost", "Est. cost"),
                            ("created", "Created · UTC"),
                        ),
                        rows=filter_rows(),
                        row_key="id",
                        selection="multiple",
                        pagination=15,
                        on_select=lambda e: (
                            setattr(view, "selected_runs", [r["id"] for r in e.selection]),
                            compare_button.set_enabled(len(e.selection) >= 2),
                        ),
                    )
                    .props("flat")
                    .classes("data-table")
                )
                table.selected = [row for row in rows if row["id"] in view.selected_runs]
                table.add_slot(
                    "no-data",
                    '<div class="description q-pa-md">No matching runs. Adjust your filters.</div>',
                )
                table.add_slot(
                    "header-selection",
                    '<q-checkbox v-model="props.selected" aria-label="Select all visible runs" />',
                )
                table.add_slot(
                    "body-selection",
                    '<q-checkbox v-model="props.selected" '
                    ":aria-label=\"'Select ' + props.row.name + ' ' + props.row.id\" />",
                )
                table.add_slot(
                    "body-cell-name",
                    """
                    <q-td :props="props"><button type="button" class="run-link"
                      @click="$parent.$emit('open', props.row.id)">{{ props.row.name }}</button>
                      <span class="table-subtext">{{ props.row.id }}</span></q-td>""",
                )
                table.add_slot(
                    "body-cell-status",
                    """
                    <q-td :props="props"><span
                    :class="'status status-' + props.row.status.toLowerCase()">
                    {{ props.row.status }}</span></q-td>""",
                )
                table.add_slot(
                    "body-cell-tick",
                    """
                    <q-td :props="props" class="numeric">
                    {{ props.row.tick }} / {{ props.row.max_steps }}</q-td>""",
                )
                table.add_slot(
                    "body-cell-cost",
                    """
                    <q-td :props="props" class="numeric">{{ props.row.cost_label }}</q-td>""",
                )
                table.on("open", lambda e: open_run(e.args))
            ui.label("Select two or more runs from the same environment to compare.").classes(
                "description q-mt-md"
            )

        def setup():
            heading("New run", "Choose the scenario and model. Review the setup before starting.")
            scenario = scenarios[view.scenario]

            def scenario_changed(event):
                view.scenario = event.value
                render.refresh()

            with ui.element("div").classes("setup-form"):
                ui.select(
                    {p: s.name for p, s in scenarios.items()},
                    value=view.scenario,
                    label="Scenario",
                    on_change=scenario_changed,
                ).props("outlined").classes("form-wide")
                ui.label(scenario.description).classes("description form-wide")
                assignments = {a.model for a in scenario.agents}
                default_model = next(iter(assignments)) if len(assignments) == 1 else "profiles"
                model = (
                    ui.select(
                        {
                            "profiles": "Keep per-agent assignments",
                            **{
                                key: f"{model_label(value)} · "
                                + {"openai": "OpenAI", "anthropic": "Anthropic"}[
                                    value.split(":")[0]
                                ]
                                for key, value in scenario.models.items()
                            },
                        },
                        value=default_model,
                        label="Model",
                    )
                    .props("outlined")
                    .classes("form-wide")
                )
                seed = ui.number(
                    "Seed", value=scenario.seed, min=0, max=2**32 - 1, precision=0
                ).props("outlined")
                turns = ui.number(
                    "Maximum turns", value=scenario.max_steps, min=1, max=100000, precision=0
                ).props("outlined")
                with ui.column().classes("setup-summary form-wide gap-2"):
                    ui.label(f"{title(scenario.sandbox)} · {len(scenario.agents)} agents").classes(
                        "text-sm"
                    )
                    ui.label(
                        "One model request per turn. The run ends at the turn limit or when "
                        "the environment has no agents left to act."
                    ).classes("description")
                with ui.expansion("Advanced settings").classes("form-wide"):
                    key_values(
                        [
                            ("Input tokens / request", f"{scenario.limits.max_input_tokens:,}"),
                            ("Output tokens / request", f"{scenario.limits.max_output_tokens:,}"),
                            ("Total token limit", scenario.limits.max_total_tokens or "No limit"),
                            ("Request timeout", f"{scenario.limits.timeout_seconds:g} seconds"),
                        ]
                    )
                    ui.label(
                        "Additional settings and agent goals are defined in the scenario YAML."
                    ).classes("description q-mt-md")

            def create():
                try:
                    resolved = scenario.model_copy(deep=True)
                    resolved.seed, resolved.max_steps = int(seed.value), int(turns.value)
                    resolved.limits.max_model_calls = resolved.max_steps
                    if model.value != "profiles":
                        for agent in resolved.agents:
                            agent.model = model.value
                    runner = Runner.create(store, resolved)
                    view.run_id, view.runner = runner.id, runner
                    view.tick, view.replay, view.selected = 0, False, resolved.agents[0].id
                    view.section, view.tab, view.error, view.metric = "run", "overview", "", ""
                    view.actor_filter = "all"
                    render.refresh()
                except (ValueError, TypeError) as error:
                    setup_error.set_text(
                        str(error)
                        if isinstance(error, ValueError)
                        else "Enter a valid seed and turn limit."
                    )

            setup_error = ui.label().classes("form-error").props('role="alert"')
            with ui.row().classes("form-actions"):
                ui.button("Create run", icon="add", color=None, on_click=create).props(
                    "unelevated no-caps"
                ).classes("primary-action")
                ui.button("Cancel", on_click=lambda: navigate("runs")).props("flat no-caps")
                ui.label(
                    "Starts paused. Model requests begin when you press Step or Play."
                ).classes("description")

        def environments_page():
            heading(
                "Environments", "Scenario definitions available in this workspace.", new_button=True
            )
            for sandbox in dict.fromkeys(s.sandbox for s in scenarios.values()):
                matching = [(path, s) for path, s in scenarios.items() if s.sandbox == sandbox]
                with ui.column().classes("environment-entry gap-1"):
                    ui.label(title(sandbox)).classes("section-title").props(
                        'role="heading" aria-level="2"'
                    )
                    ui.label(
                        f"{len(matching)} scenarios · "
                        + (
                            "Interactive environment view"
                            if get_sandbox(sandbox).panel
                            else "State inspection"
                        )
                    ).classes("description")
                    for path, scenario in matching:
                        with ui.element("div").classes("scenario-entry"):
                            with ui.column():
                                ui.label(scenario.name).classes("subsection-title").props(
                                    'role="heading" aria-level="3"'
                                )
                                ui.label(scenario.description).classes("description")
                                ui.label(
                                    f"{len(scenario.agents)} agents · {scenario.max_steps} turns · "
                                    f"{run_models(scenario.model_dump())}"
                                ).classes("description")
                            ui.button("Use scenario", on_click=lambda p=path: new_setup(p)).props(
                                "outline no-caps"
                            )

        def compare_page():
            records = [r for r in store.runs() if r["id"] in view.selected_runs]
            metrics = comparison_metrics(records)
            heading(
                "Compare runs", f"{len(records)} runs · {title(records[0]['scenario']['sandbox'])}"
            )
            comparison_columns = columns(
                ("metric", "Metric"), *[(r["id"], r["id"]) for r in records]
            )
            rows = [
                {"metric": "Scenario", **{r["id"]: r["scenario"]["name"] for r in records}},
                {"metric": "Model", **{r["id"]: run_models(r["scenario"]) for r in records}},
                {"metric": "Seed", **{r["id"]: str(r["scenario"]["seed"]) for r in records}},
                {"metric": "Turns", **{r["id"]: str(r["tick"]) for r in records}},
                {"metric": "Est. cost", **{r["id"]: cost_label(r) for r in records}},
                *[
                    {"metric": title(key), **{r["id"]: f"{r['metrics'][key]:g}" for r in records}}
                    for key in metrics
                ],
            ]
            with ui.element("div").classes("table-frame comparison-summary"):
                ui.table(columns=comparison_columns, rows=rows, row_key="metric").props(
                    "flat"
                ).classes("data-table")
            if metrics:
                if view.comparison_metric not in metrics:
                    view.comparison_metric = metrics[0]
                with ui.row().classes("section-row"):
                    ui.label("Metric history").classes("section-title").props(
                        'role="heading" aria-level="2"'
                    )
                    ui.select(
                        {key: title(key) for key in metrics},
                        value=view.comparison_metric,
                        label="Metric",
                        on_change=lambda e: (
                            setattr(view, "comparison_metric", e.value),
                            render.refresh(),
                        ),
                    ).props("outlined dense").classes("metric-picker")
                histories = [(r["id"], store.history(r["id"])) for r in records]
                ui.echart(chart_options(histories, view.comparison_metric)).classes(
                    "analysis-chart"
                )
                ui.label(
                    "Histories align by recorded turn. Shorter runs end at their last checkpoint."
                ).classes("description")
            else:
                empty_state(
                    "No shared metrics", "These recorded versions have no metric names in common."
                )

        def inspector(record, frame, history):
            scenario = record["scenario"]
            profiles = {a["id"]: a for a in scenario["agents"]}
            profile = profiles[view.selected]
            with ui.column().classes("inspector full-width gap-0"):
                ui.label("Agent evidence").classes("section-title").props(
                    'role="heading" aria-level="2"'
                ).classes("inspector-title")
                ui.select(
                    {key: p["name"] for key, p in profiles.items()},
                    value=view.selected,
                    label="Agent",
                    on_change=lambda e: select_agent(e.value),
                ).props("outlined dense").classes("full-width")
                last = next(
                    (
                        f
                        for f in reversed(history)
                        if f["actor"] == view.selected and f["tick"] <= view.tick
                    ),
                    None,
                )
                environment = get_sandbox(scenario["sandbox"]).create()
                environment.restore(frame["checkpoint"]["environment"])
                observation = environment.observe(view.selected)
                state = observation.get("self", {})
                if not isinstance(state, dict):
                    state = {}
                if last:
                    action = last["decision"]["action"]
                    with ui.column().classes("detail-section"):
                        ui.label(f"Decision at turn {last['tick']}").classes("detail-label")
                        ui.label(
                            title(str(action.get("kind", "Action")))
                            + (f" → {title(action['target'])}" if action.get("target") else "")
                        ).classes("action-title")
                        ui.label(last["decision"].get("rationale", "")).classes("detail-body")
                        if action.get("message"):
                            ui.label(f"Radio: {action['message']}").classes("detail-body muted")
                else:
                    ui.label("No decision from this agent at this turn.").classes(
                        "description q-my-lg"
                    )
                ui.label(f"State after turn {view.tick}").classes("detail-label q-mt-lg")
                with ui.element("div").classes("agent-state"):
                    for key, value in state.items():
                        if key != "id" and isinstance(value, (str, int, float)):
                            with ui.column().classes("gap-1"):
                                ui.label(title(key)).classes("detail-label")
                                ui.label(str(value)).classes("numeric")
                with ui.expansion("Goal and model"):
                    ui.label(profile["goal"]).classes("detail-body")
                    ui.label(
                        "Historical demo"
                        if profile.get("policy") == "demo"
                        else scenario["models"][profile["model"]]
                    ).classes("description q-mt-md")
                with ui.expansion(f"Private memory after turn {view.tick}"):
                    ui.label(
                        frame["checkpoint"]["memory"].get(view.selected)
                        or "No memory recorded at this turn."
                    ).classes("detail-body")
                if "inbox" in state:
                    with ui.expansion(f"Radio inbox ({len(state['inbox'])})"):
                        if not state["inbox"]:
                            ui.label("No received messages.").classes("description")
                        for message in reversed(state["inbox"]):
                            ui.label(f"{message['from']} · Turn {message['turn']}").classes(
                                "detail-label"
                            )
                            ui.label(message["text"]).classes("detail-body q-mb-md")
                with ui.expansion(f"Environment observation after turn {view.tick}"):
                    ui.label(json.dumps(observation, indent=2)).classes("json-detail")
                if last:
                    with ui.expansion(f"Recorded model input · turn {last['tick']}"):
                        ui.label(
                            "Exact input saved before this decision, including the agent's "
                            "then-current memory."
                        ).classes("description q-mb-md")
                        recorded = store.frame(view.run_id, last["tick"])["observation"]
                        ui.label(json.dumps(recorded, indent=2)).classes("json-detail")
                    with ui.expansion("Raw decision"):
                        ui.label(json.dumps(last["decision"], indent=2)).classes("json-detail")

        def run_content(record, frame, history):
            scenario = record["scenario"]
            if view.tab == "overview":
                keys = list(frame["metrics"])
                if view.metric not in keys:
                    view.metric = keys[0] if keys else ""
                with ui.element("div").classes("overview-grid"):
                    with ui.column().classes("full-width gap-0"):
                        with ui.row().classes("section-row"):
                            ui.label("Metric history").classes("section-title").props(
                                'role="heading" aria-level="2"'
                            )
                            ui.select(
                                {key: title(key) for key in keys},
                                value=view.metric,
                                label="Metric",
                                on_change=lambda e: (
                                    setattr(view, "metric", e.value),
                                    render.refresh(),
                                ),
                            ).props("outlined dense").classes("metric-picker")
                        if len(history) > 1:
                            ui.echart(
                                chart_options([(scenario["name"], history)], view.metric)
                            ).classes("analysis-chart")
                        else:
                            ui.label("History appears after the first completed turn.").classes(
                                "chart-empty"
                            )
                    with ui.column().classes("full-width gap-0"):
                        with ui.row().classes("section-row"):
                            ui.label("Outcomes").classes("section-title").props(
                                'role="heading" aria-level="2"'
                            )
                            ui.label(f"At turn {view.tick}").classes("muted text-xs")
                        metric_table(frame["metrics"], history[0]["metrics"])
                with ui.row().classes("section-row section-space"):
                    ui.label("Recent activity").classes("section-title").props(
                        'role="heading" aria-level="2"'
                    )
                    ui.button(
                        "All decisions",
                        on_click=lambda: (setattr(view, "tab", "decisions"), render.refresh()),
                    ).props("flat dense no-caps")
                events = [(f["tick"], event) for f in history for event in f["events"]]
                if not events:
                    ui.label(
                        "No activity yet. Step through one decision or press Play to begin."
                    ).classes("description")
                for tick, event in reversed(events[-12:]):
                    with ui.element("div").classes("activity-row full-width"):
                        ui.button(
                            f"T{tick}", on_click=lambda t=tick: select_turn(t, decision=True)
                        ).props("flat dense no-caps").classes("turn-link")
                        ui.label(title(event["kind"])).classes(f"event-kind event-{event['kind']}")
                        ui.label(event["text"])
            elif view.tab == "environment":
                spec = get_sandbox(scenario["sandbox"])
                if spec.panel:
                    spec.panel(frame["checkpoint"]["environment"], select_agent)
                else:
                    ui.label("Environment state").classes("section-title").props(
                        'role="heading" aria-level="2"'
                    ).classes("q-mb-md")
                    ui.label(json.dumps(frame["checkpoint"]["environment"], indent=2)).classes(
                        "json-detail"
                    )
            elif view.tab == "decisions":
                all_history = store.history(view.run_id)
                profiles = {a["id"]: a for a in scenario["agents"]}
                with ui.element("div").classes("decision-layout"):
                    with ui.column().classes("full-width gap-0"):
                        with ui.row().classes("section-row"):
                            ui.label("Decision log").classes("section-title").props(
                                'role="heading" aria-level="2"'
                            )
                            ui.select(
                                {
                                    "all": "All agents",
                                    **{k: p["name"] for k, p in profiles.items()},
                                },
                                value=view.actor_filter,
                                label="Filter agent",
                                on_change=lambda e: (
                                    setattr(view, "actor_filter", e.value),
                                    render.refresh(),
                                ),
                            ).props("outlined dense").classes("metric-picker")
                        rows = [
                            {
                                "tick": f["tick"],
                                "agent": profiles[f["actor"]]["name"],
                                "action": title(str(f["decision"]["action"].get("kind", "Action"))),
                                "outcome": "Rejected"
                                if any(e["kind"] == "rejected" for e in f["events"])
                                else "Applied",
                            }
                            for f in reversed(all_history)
                            if f["actor"]
                            and (view.actor_filter == "all" or f["actor"] == view.actor_filter)
                        ]
                        if rows:
                            with ui.element("div").classes("table-frame"):
                                table = (
                                    ui.table(
                                        columns=columns(
                                            ("tick", "Turn"),
                                            ("agent", "Agent"),
                                            ("action", "Action"),
                                            ("outcome", "Outcome"),
                                        ),
                                        rows=rows,
                                        row_key="tick",
                                        pagination=10,
                                    )
                                    .props("flat")
                                    .classes("data-table")
                                )
                                table.add_slot(
                                    "body-cell-tick",
                                    """
                                    <q-td :props="props"><button type="button" class="turn-link"
                                    @click="$parent.$emit('inspect', props.row.tick)">
                                    Turn {{ props.row.tick }}</button></q-td>""",
                                )
                                table.on("inspect", lambda e: select_turn(e.args, decision=True))
                        else:
                            empty_state(
                                "No decisions yet",
                                "Completed decisions appear here. "
                                "Select a turn to inspect its evidence.",
                            )
                    inspector(record, frame, all_history)
            else:
                with ui.column().classes("config-layout gap-0"):
                    ui.label("Run configuration").classes("section-title").props(
                        'role="heading" aria-level="2"'
                    ).classes("q-mb-md")
                    key_values(
                        [
                            ("Environment", title(scenario["sandbox"])),
                            ("Scenario", scenario["name"]),
                            ("Model", run_models(scenario)),
                            ("Seed", scenario["seed"]),
                            ("Maximum turns", scenario["max_steps"]),
                            ("Run ID", view.run_id),
                            ("Created · UTC", record["created"][:19].replace("T", " ")),
                        ]
                    )
                    with ui.column().classes("config-section gap-3"):
                        ui.label("Limits and usage").classes("section-title").props(
                            'role="heading" aria-level="2"'
                        )
                        limits = scenario["limits"]
                        key_values(
                            [
                                ("Requests", f"{record['calls']} / {limits['max_model_calls']}"),
                                ("Input tokens", f"{record['input_tokens']:,}"),
                                ("Output tokens", f"{record['output_tokens']:,}"),
                                ("Accounted tokens", f"{record['charged_tokens']:,}"),
                                ("Total token limit", limits.get("max_total_tokens") or "No limit"),
                                ("Input tokens / request", limits["max_input_tokens"]),
                                ("Output tokens / request", limits["max_output_tokens"]),
                                ("Timeout", f"{limits['timeout_seconds']:g} seconds"),
                            ]
                        )
                    with ui.column().classes("config-section gap-3"):
                        ui.label("Environment parameters").classes("section-title").props(
                            'role="heading" aria-level="2"'
                        )
                        key_values([(title(k), v) for k, v in scenario["parameters"].items()])
                    with ui.expansion("Resolved scenario JSON").classes("q-mt-lg"):
                        ui.label(json.dumps(scenario, indent=2)).classes("json-detail")
                    if record["metadata"]:
                        with ui.expansion("Experiment metadata"):
                            ui.label(json.dumps(record["metadata"], indent=2)).classes(
                                "json-detail"
                            )
                    with ui.row().classes("q-mt-lg gap-3"):
                        ui.button("Verify replay", icon="fact_check", on_click=verify_run).props(
                            "outline no-caps"
                        )
                        ui.button("Export JSON", icon="download", on_click=export_run).props(
                            "outline no-caps"
                        )

        def run_page():
            record = store.run(view.run_id)
            scenario = record["scenario"]
            frame = store.frame(view.run_id, view.tick)
            history = store.history(view.run_id, view.tick)
            latest = store.frame(view.run_id)["tick"]
            legacy = any(a.get("policy") == "demo" for a in scenario["agents"])
            complete = record["status"] == "complete"
            with ui.row().classes("page-heading run-heading"):
                with ui.column():
                    ui.label(scenario["name"]).classes("page-title").props(
                        'role="heading" aria-level="1"'
                    )
                    with ui.element("div").classes("run-subtitle"):
                        status = "Playing" if view.playing else title(record["status"])
                        ui.label(status).classes(f"status status-{status.lower()}")
                        ui.label(run_models(scenario))
                        ui.label(f"Seed {scenario['seed']}")
                        ui.label(view.run_id).classes("mono")
                with ui.row().classes("run-actions"):
                    if view.replay and not complete and not legacy:
                        ui.button(
                            "Resume run", icon="play_arrow", color=None, on_click=resume
                        ).props("unelevated no-caps").classes("primary-action").set_enabled(
                            not view.busy
                        )
                    else:
                        play = (
                            ui.button(
                                "Pause" if view.playing else "Replay" if view.replay else "Play",
                                icon="pause" if view.playing else "play_arrow",
                                color=None,
                                on_click=toggle,
                            )
                            .props("unelevated no-caps")
                            .classes("primary-action")
                        )
                        play.set_enabled(
                            view.playing
                            or (
                                not view.busy
                                and (latest > 0 if view.replay else not view.runner.finished)
                            )
                        )
                    step = ui.button("Step", icon="skip_next", on_click=advance).props(
                        "outline no-caps"
                    )
                    step.set_enabled(
                        not view.busy
                        and not view.playing
                        and (view.tick < latest if view.replay else not view.runner.finished)
                    )
                    if view.busy:
                        step.props("loading")
                    ui.button(icon="download", on_click=export_run).props(
                        'flat round aria-label="Export run JSON"'
                    ).tooltip("Export run JSON")
            with ui.element("div").classes("run-facts"):
                for label, value in [
                    ("Requests", f"{record['calls']} / {scenario['limits']['max_model_calls']}"),
                    ("Tokens", f"{record['input_tokens'] + record['output_tokens']:,}"),
                    ("Est. cost", cost_label(record)),
                ]:
                    with ui.element("span") as fact:
                        ui.label(label).classes("fact-label")
                        ui.label(value).classes("fact-value")
                    if label == "Est. cost":
                        fact.tooltip(COST_NOTE)
                if view.busy and not view.replay:
                    actor = view.runner.environment.next_agent()
                    profile = next(a for a in scenario["agents"] if a["id"] == actor)
                    text = "Pausing after " if view.pause_requested else "Requesting for "
                    ui.label(text + profile["name"]).classes("request-indicator").props(
                        'role="status"'
                    )
                else:
                    ui.label(
                        "Recorded playback" if view.replay else "Live model decisions"
                    ).classes("request-indicator")
            with ui.element("div").classes("timeline"):
                ui.label(f"Turn {view.tick} / {scenario['max_steps']}").classes("timeline-label")
                slider = ui.slider(min=0, max=max(1, latest), value=view.tick, step=1).props(
                    'label aria-label="Replay turn"'
                )
                slider.set_enabled(latest > 0 and not view.busy and not view.playing)
                slider.on("change", lambda e: select_turn(e.args))
                if view.tick != latest:
                    ui.button("Latest", on_click=lambda: select_turn(latest)).props(
                        "flat dense no-caps"
                    )
            if view.error or record["error"]:
                with ui.column().classes("error-banner gap-1").props('role="alert"'):
                    ui.label(view.error or f"Stopped at turn {latest}: {record['error']}.")
                    ui.label(
                        "The last checkpoint is safe. Check the model or limits in Configuration, "
                        "then resume to retry."
                    )
            with ui.tabs(
                value=view.tab,
                on_change=lambda e: (setattr(view, "tab", e.value), render.refresh()),
            ).classes("run-tabs"):
                for key in ("overview", "environment", "decisions", "configuration"):
                    ui.tab(key, label=key.capitalize())
            run_content(record, frame, history)

        @ui.refreshable
        def render():
            runs_nav.classes(
                add="active" if view.section != "environments" else "",
                remove="active" if view.section == "environments" else "",
            )
            env_nav.classes(
                add="active" if view.section == "environments" else "",
                remove="active" if view.section != "environments" else "",
            )
            shell_path.set_text(
                "Workspace / "
                + {
                    "runs": "Runs",
                    "run": "Runs / Inspect",
                    "new": "New run",
                    "environments": "Environments",
                    "compare": "Compare runs",
                }[view.section]
            )
            with ui.column().classes("page" + (" setup-page" if view.section == "new" else "")):
                if view.section in ("run", "compare", "new"):
                    ui.button("Runs", icon="arrow_back", on_click=lambda: navigate("runs")).props(
                        "flat dense no-caps"
                    ).classes("q-mb-lg")
                if view.section == "runs":
                    library()
                elif view.section == "new":
                    setup()
                elif view.section == "environments":
                    environments_page()
                elif view.section == "compare":
                    compare_page()
                else:
                    run_page()

        render()
        timer = ui.timer(0.5, timer_tick)

        async def cleanup():
            stop()
            timer.cancel()
            if view.runner:
                await view.runner.wait_idle()
            store.close()

        client.on_delete(cleanup)

    ui.run(
        host=host,
        port=port,
        title="Agent sandbox · Evaluations",
        dark=True,
        language="en-US",
        reload=False,
        show=False,
    )
