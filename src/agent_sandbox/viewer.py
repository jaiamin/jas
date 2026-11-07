"""A read-only evaluation library and focused controls for the shared runner."""

import json
from pathlib import Path

from nicegui import app, ui

from .analysis import AnalysisService
from .config import load_scenario
from .execution import RunService
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
    store = Store(db_path)
    runs = RunService(store)
    analyst = AnalysisService(store)

    async def shutdown():
        await runs.close()
        await analyst.close()
        store.close()

    app.on_shutdown(shutdown)

    @ui.page("/")
    def page(
        run: str = "", tab: str = "overview", turn: str = "", section: str = "runs", agent: str = ""
    ):
        ui.dark_mode().enable()
        ui.colors(primary="#85b8d2", secondary="#bcadcf", positive="#8ebca7", warning="#d6b57b")
        ui.add_css(Path(__file__).with_name("viewer.css").read_text())
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
            draft = None
            library_update = None
            signature = None
            decision_pagination = {"rowsPerPage": 10, "page": 1}
            library_pagination = {"rowsPerPage": 15, "page": 1}
            question = ""
            ask_button = None
            url_route = None

        view = View()

        def stop():
            # Stops recorded playback only. Navigation never controls a live run.
            view.playing = False

        def navigate(section):
            stop()
            ui.run_javascript(f"if (window.innerWidth <= 1100) getElement({drawer.id}).hide()")
            view.section, view.error = section, ""
            render.refresh()

        def open_run(run_id):
            stop()
            record = store.run(run_id)
            legacy = any(a.get("policy") == "demo" for a in record["scenario"]["agents"])
            view.run_id = run_id
            view.runner = None if legacy else runs.get(run_id).runner
            view.tick = store.latest_tick(run_id)
            view.selected = record["scenario"]["agents"][0]["id"]
            view.section, view.tab, view.error = "run", "overview", ""
            view.replay = legacy or record["status"] == "complete"
            view.metric, view.actor_filter = "", "all"
            view.decision_pagination = {"rowsPerPage": 10, "page": 1}
            view.question = ""
            view.signature = None
            render.refresh()

        def new_setup(path=None):
            stop()
            view.draft = None
            if path:
                view.scenario = path
            view.section, view.error = "new", ""
            render.refresh()

        def start_run(single_step=False):
            try:
                runs.start(view.run_id, single_step=single_step)
                view.runner = runs.get(view.run_id).runner
                view.tick, view.replay, view.error = view.runner.tick, False, ""
            except ValueError as error:
                view.error = str(error)
            refresh_run()

        def pause_run():
            runs.pause(view.run_id)
            run_header.refresh()

        def variation():
            view.draft = runs.get(view.run_id).runner.scenario.model_copy(deep=True)
            view.scenario = next(
                (
                    path
                    for path, candidate in scenarios.items()
                    if candidate.name == view.draft.name
                ),
                default,
            )
            view.section, view.error = "new", ""
            stop()
            render.refresh()

        def select_turn(tick, *, decision=False):
            stop()
            view.tick, view.replay = int(tick), True
            if decision:
                frame = store.frame(view.run_id, view.tick)
                if frame["actor"]:
                    view.selected = frame["actor"]
                view.tab = "decisions"
            refresh_run()

        def select_agent(agent):
            stop()
            view.replay = True
            view.selected, view.tab = agent, "decisions"
            refresh_run()

        def freeze_inspection():
            stop()
            if not view.replay:
                view.replay = True
                run_header.refresh()
                update_url()

        def toggle():
            if view.playing:
                stop()
            else:
                view.playing = True
                view.replay = True
                latest = store.latest_tick(view.run_id)
                if view.replay and view.tick == latest:
                    view.tick = 0
            run_header.refresh()

        def latest_turn():
            stop()
            view.tick = store.latest_tick(view.run_id)
            view.replay = view.runner is None or view.runner.finished
            refresh_run()

        def refresh_run():
            if view.section != "run":
                return
            record = store.run(view.run_id)
            frame = store.frame(view.run_id, view.tick)
            run_header.refresh()
            run_content.refresh(record, frame, store.history(view.run_id, view.tick))
            update_url()

        def timer_tick():
            if view.section == "runs" and view.library_update:
                view.library_update()
            if view.section != "run" or not view.run_id:
                return
            if view.tab == "ask" and view.ask_button and not view.ask_button.is_deleted:
                view.ask_button.set_enabled(not analyst.busy(view.run_id))
            record = store.run(view.run_id)
            latest = store.latest_tick(view.run_id)
            refreshed = False
            if view.playing:
                view.tick = min(view.tick + 1, latest)
                if view.tick == latest:
                    stop()
                refresh_run()
                refreshed = True
            elif not view.replay and view.tick != latest:
                view.tick = latest
                if view.tab != "ask":
                    refresh_run()
                else:
                    run_header.refresh()
                refreshed = True
            analyses = store.analyses(view.run_id)
            signature = (
                latest,
                record["status"],
                record["calls"],
                record["error"],
                runs.active(view.run_id),
                tuple((row["id"], row["status"]) for row in analyses),
            )
            if signature != view.signature:
                previous = view.signature
                view.signature = signature
                if previous is not None and not refreshed:
                    run_header.refresh()
                if view.tab == "ask" and previous and previous[-1] != signature[-1]:
                    ask_thread.refresh()

        def update_url():
            from urllib.parse import urlencode

            query = {"section": view.section}
            if view.section == "run":
                query = {"run": view.run_id, "tab": view.tab}
                if view.tab == "decisions":
                    query["agent"] = view.selected
                if view.replay:
                    query["turn"] = view.tick
            route = (view.section, view.run_id, view.tab if view.section == "run" else "")
            method = "pushState" if view.url_route and view.url_route != route else "replaceState"
            view.url_route = route
            ui.run_javascript(f"history.{method}(null, '', '?' + {json.dumps(urlencode(query))})")

        def export_run():
            data = {"run": store.run(view.run_id), "frames": store.frames(view.run_id)}
            ui.download(json.dumps(data, indent=2).encode(), f"run-{view.run_id}.json")

        def decision_pagination_changed(event):
            defaults = {"page": 1, "rowsPerPage": 10, "sortBy": None, "descending": False}
            changed = any(
                view.decision_pagination.get(key, default) != event.value.get(key, default)
                for key, default in defaults.items()
            )
            view.decision_pagination = event.value
            if changed:
                freeze_inspection()

        def verify_run():
            try:
                count = verify(store, view.run_id)
                ui.notify(f"Verified {count} recorded turns.", type="positive")
            except ValueError as error:
                view.error = str(error)
                render.refresh()

        with (
            ui.left_drawer(top_corner=True)
            .props("width=208 breakpoint=1100")
            .classes("sidebar") as drawer
        ):
            with ui.column().classes("sidebar-inner"):
                ui.label("Agent sandbox").classes("brand")
                with ui.column().classes("nav-items"):
                    runs_nav = ui.button(
                        "Runs", icon="view_list", color=None, on_click=lambda: navigate("runs")
                    )
                    env_nav = ui.button(
                        "Environments",
                        icon="account_tree",
                        color=None,
                        on_click=lambda: navigate("environments"),
                    )
                    for button in (runs_nav, env_nav):
                        button.props("flat no-caps").classes("nav-item")

        with ui.header().classes("shell-header"):
            with ui.row():
                ui.button(icon="menu", on_click=drawer.toggle).props(
                    'flat round dense aria-label="Toggle navigation"'
                ).classes("menu-toggle")
                with ui.element("nav").classes("breadcrumbs").props('aria-label="Breadcrumb"'):
                    breadcrumb_root = (
                        ui.button("Runs", color=None, on_click=lambda: navigate("runs"))
                        .props("flat dense no-caps")
                        .classes("breadcrumb-root")
                    )
                    breadcrumb_separator = ui.icon("chevron_right").classes("breadcrumb-separator")
                    shell_path = ui.label().classes("shell-path").props('aria-current="page"')

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
            heading("Runs", new_button=True)
            if not rows:
                empty_state(
                    "No runs yet",
                    "Create a run from a scenario to begin.",
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
                table.pagination = {**table.pagination, "page": 1}
                view.library_pagination = table.pagination
                compare_button.set_enabled(False)
                compare_button.set_text("Compare")

            def compare_selected():
                selected = [r for r in records if r["id"] in view.selected_runs]
                try:
                    comparison_metrics(selected)
                except ValueError as error:
                    ui.notify(str(error), type="warning")
                    return
                view.section = "compare"
                render.refresh()

            with ui.element("div").classes("table-frame library-frame"):
                with ui.row().classes("filters"):
                    search = ui.input(placeholder="Search runs, models, seeds…", value=view.search)
                    search.props('outlined dense clearable aria-label="Search runs"').classes(
                        "search-field"
                    )
                    search.on_value_change(
                        lambda e: (setattr(view, "search", e.value or ""), apply_filters())
                    )
                    statuses = {
                        "all": "All statuses",
                        **{
                            status: status
                            for status in ("Running", "Paused", "Complete", "Failed", "Archived")
                        },
                    }
                    ui.select(
                        statuses,
                        value=view.status_filter,
                        label="Status",
                        on_change=lambda e: (
                            setattr(view, "status_filter", e.value),
                            apply_filters(),
                        ),
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
                        ui.button(
                            f"Compare ({len(view.selected_runs)})"
                            if view.selected_runs
                            else "Compare",
                            icon="compare_arrows",
                            on_click=compare_selected,
                        )
                        .props("outline no-caps")
                        .classes("selection-action")
                    )
                    compare_button.set_enabled(len(view.selected_runs) >= 2)
                    compare_button.tooltip("Select at least two runs from the same environment")
                    ui.button(icon="refresh", color=None, on_click=render.refresh).props(
                        'flat dense aria-label="Refresh runs"'
                    ).classes("toolbar-refresh").tooltip("Refresh runs")
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
                        pagination=view.library_pagination,
                        on_pagination_change=lambda e: setattr(view, "library_pagination", e.value),
                        on_select=lambda e: (
                            setattr(view, "selected_runs", [r["id"] for r in e.selection]),
                            compare_button.set_enabled(len(e.selection) >= 2),
                            compare_button.set_text(
                                f"Compare ({len(e.selection)})" if e.selection else "Compare"
                            ),
                        ),
                    )
                    .props("flat")
                    .classes("data-table run-table")
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

            def update_records():
                nonlocal records, rows
                records = store.runs()
                rows = [run_row(record) for record in records]
                filtered = filter_rows()
                if table.rows != filtered:
                    table.rows = filtered
                    table.update()

            view.library_update = update_records

        def setup():
            heading("New run")
            scenario = view.draft or scenarios[view.scenario]

            def scenario_changed(event):
                view.scenario = event.value
                view.draft = None
                render.refresh()

            with ui.element("div").classes("setup-form"):
                ui.select(
                    {p: s.name for p, s in scenarios.items()},
                    value=view.scenario,
                    label="Scenario",
                    on_change=scenario_changed,
                ).props("outlined dense").classes("form-wide")
                run_name = (
                    ui.input("Run name", value=scenario.name)
                    .props("outlined dense maxlength=100")
                    .classes("form-wide")
                )
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
                    .props("outlined dense")
                    .classes("form-wide")
                )
                seed = ui.number(
                    "Seed", value=scenario.seed, min=0, max=2**32 - 1, precision=0
                ).props("outlined dense")
                turns = ui.number(
                    "Maximum turns", value=scenario.max_steps, min=1, max=100000, precision=0
                ).props("outlined dense")
                with ui.column().classes("setup-summary form-wide gap-2"):
                    ui.label(f"{title(scenario.sandbox)} · {len(scenario.agents)} agents").classes(
                        "text-sm"
                    )
                    ui.label("Ends at the turn limit or when no agents can act.").classes(
                        "description"
                    )
                with ui.expansion("Advanced settings").classes("form-wide"):
                    with ui.row().classes("advanced-fields"):
                        output_limit = (
                            ui.number(
                                "Response tokens / request",
                                value=scenario.limits.max_output_tokens,
                                min=64,
                                max=16000,
                                precision=0,
                            )
                            .props("outlined dense")
                            .tooltip("Includes the model's thinking tokens.")
                        )
                        timeout = ui.number(
                            "Request timeout (seconds)",
                            value=scenario.limits.timeout_seconds,
                            min=1,
                            max=300,
                        ).props("outlined dense")
                    ui.label(
                        "Additional environment settings are defined in the scenario YAML."
                    ).classes("description q-mt-md")
                goals = {}
                with ui.expansion("Agent goals").classes("form-wide"):
                    for agent in scenario.agents:
                        goals[agent.id] = (
                            ui.textarea(agent.name, value=agent.goal)
                            .props("outlined dense autogrow maxlength=1000")
                            .classes("full-width q-mb-md")
                        )

            def create():
                try:
                    resolved = scenario.model_copy(deep=True)
                    resolved.name = run_name.value
                    resolved.seed, resolved.max_steps = int(seed.value), int(turns.value)
                    resolved.limits.max_model_calls = resolved.max_steps
                    resolved.limits.max_output_tokens = int(output_limit.value)
                    resolved.limits.timeout_seconds = float(timeout.value)
                    for agent in resolved.agents:
                        agent.goal = goals[agent.id].value
                    if model.value != "profiles":
                        for agent in resolved.agents:
                            agent.model = model.value
                    runner = Runner.create(store, resolved)
                    view.run_id = runner.id
                    view.runner = runs.get(runner.id).runner
                    view.tick, view.replay, view.selected = 0, False, resolved.agents[0].id
                    view.section, view.tab, view.error, view.metric = "run", "overview", "", ""
                    view.actor_filter = "all"
                    render.refresh()
                except (ValueError, TypeError, OverflowError) as error:
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
                ui.label("Starts paused. Play continues on the server when you leave.").classes(
                    "description"
                )

        def environments_page():
            heading("Environments")
            for sandbox in dict.fromkeys(s.sandbox for s in scenarios.values()):
                matching = [(path, s) for path, s in scenarios.items() if s.sandbox == sandbox]
                with ui.column().classes("environment-entry gap-0"):
                    with ui.row().classes("section-row"):
                        ui.label(title(sandbox)).classes("section-title").props(
                            'role="heading" aria-level="2"'
                        )
                        ui.label(f"{len(matching)} scenarios").classes("muted text-xs")
                    with ui.element("div").classes("table-frame"):
                        table = (
                            ui.table(
                                columns=columns(
                                    ("name", "Scenario"),
                                    ("model", "Model"),
                                    ("agents", "Agents"),
                                    ("turns", "Turn limit"),
                                )
                                + [{"name": "action", "label": "", "field": "path"}],
                                rows=[
                                    {
                                        "path": path,
                                        "name": scenario.name,
                                        "description": scenario.description,
                                        "model": run_models(scenario.model_dump()),
                                        "agents": len(scenario.agents),
                                        "turns": scenario.max_steps,
                                    }
                                    for path, scenario in matching
                                ],
                                row_key="path",
                                pagination={"rowsPerPage": 0},
                            )
                            .props("flat hide-bottom")
                            .classes("data-table scenario-table")
                        )
                        table.add_slot(
                            "body-cell-name",
                            """
                            <q-td :props="props">
                            <span class="scenario-name">{{ props.row.name }}</span>
                            <span class="table-subtext scenario-description">
                            {{ props.row.description }}</span></q-td>""",
                        )
                        table.add_slot(
                            "body-cell-action",
                            """
                            <q-td :props="props"><q-btn outline no-caps label="Use scenario"
                            @click="$parent.$emit('use', props.row.path)" /></q-td>""",
                        )
                        table.on("use", lambda e: new_setup(e.args))

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
            with ui.element("div").classes("comparison-layout"):
                with ui.element("div").classes("table-frame comparison-summary"):
                    ui.table(
                        columns=comparison_columns,
                        rows=rows,
                        row_key="metric",
                        pagination={"rowsPerPage": 0},
                    ).props("flat hide-bottom").classes("data-table comparison-table")
                with ui.column().classes("comparison-chart full-width gap-0"):
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
                    else:
                        empty_state(
                            "No shared metrics",
                            "These recorded versions have no metric names in common.",
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
                ).props("outlined dense").classes("full-width").on("popup-show", freeze_inspection)
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
                with ui.expansion("Goal and model").on("before-show", freeze_inspection):
                    ui.label(profile["goal"]).classes("detail-body")
                    ui.label(
                        "Historical demo"
                        if profile.get("policy") == "demo"
                        else scenario["models"][profile["model"]]
                    ).classes("description q-mt-md")
                with ui.expansion(f"Private memory after turn {view.tick}").on(
                    "before-show", freeze_inspection
                ):
                    ui.label(
                        frame["checkpoint"]["memory"].get(view.selected)
                        or "No memory recorded at this turn."
                    ).classes("detail-body")
                if "inbox" in state:
                    with ui.expansion(f"Radio inbox ({len(state['inbox'])})").on(
                        "before-show", freeze_inspection
                    ):
                        if not state["inbox"]:
                            ui.label("No received messages.").classes("description")
                        for message in reversed(state["inbox"]):
                            ui.label(f"{message['from']} · Turn {message['turn']}").classes(
                                "detail-label"
                            )
                            ui.label(message["text"]).classes("detail-body q-mb-md")
                with ui.expansion(f"Environment observation after turn {view.tick}").on(
                    "before-show", freeze_inspection
                ):
                    ui.label(json.dumps(observation, indent=2)).classes("json-detail")
                if last:
                    with ui.expansion(f"Recorded model input · turn {last['tick']}").on(
                        "before-show", freeze_inspection
                    ):
                        ui.label(
                            "Exact input saved before this decision, including the agent's "
                            "then-current memory."
                        ).classes("description q-mb-md")
                        recorded = store.frame(view.run_id, last["tick"])["observation"]
                        ui.label(json.dumps(recorded, indent=2)).classes("json-detail")
                    with ui.expansion("Raw decision").on("before-show", freeze_inspection):
                        ui.label(json.dumps(last["decision"], indent=2)).classes("json-detail")

        @ui.refreshable
        def ask_thread():
            rows = store.analyses(view.run_id)
            if not rows:
                ui.label("Ask about cooperation, choices, or what changed the outcome.").classes(
                    "description ask-empty"
                )
            for row in rows:
                with ui.column().classes("conversation-entry full-width"):
                    ui.label(row["question"]).classes("question-text")
                    ui.label(f"Evidence through turn {row['through_tick']}").classes("detail-label")
                    if row["status"] == "pending":
                        with ui.row().classes("items-center gap-3"):
                            ui.spinner(size="18px")
                            ui.label("Reading recorded evidence…").classes("description").props(
                                'role="status"'
                            )
                    elif row["status"] == "failed":
                        ui.label(row["error"]).classes("form-error").props('role="alert"')
                        ui.button(
                            "Retry question",
                            on_click=lambda q=row["question"]: retry_question(q),
                        ).props("flat dense no-caps").set_enabled(not analyst.busy(view.run_id))
                    else:
                        ui.markdown(row["answer"]).classes("answer-text full-width")
                        if row["citations"]:
                            with ui.row().classes("citation-links"):
                                ui.label("Evidence").classes("detail-label")
                                for tick in row["citations"]:
                                    ui.button(
                                        f"Turn {tick}",
                                        on_click=lambda t=tick: select_turn(t, decision=True),
                                    ).props("flat dense no-caps").classes("turn-link")
                    if row["input_tokens"] or row["output_tokens"]:
                        ui.label(
                            f"{row['input_tokens'] + row['output_tokens']:,} analysis tokens"
                        ).classes("detail-label").tooltip(
                            "Analysis usage is separate from simulation requests and cost."
                        )

        def retry_question(question):
            try:
                analyst.ask(view.run_id, question)
                ask_thread.refresh()
            except ValueError as error:
                ui.notify(str(error), type="warning")

        def ask_page():
            with ui.column().classes("ask-workspace full-width"):
                with ui.row().classes("section-row"):
                    ui.label("Ask about this run").classes("section-title").props(
                        'role="heading" aria-level="2"'
                    )
                    ui.label("GPT-6.1 Sol").classes("description")
                ask_thread()
                question = (
                    ui.textarea(
                        placeholder="Were any agents selfish? Who had the best strategy?",
                        value=view.question,
                        on_change=lambda e: setattr(view, "question", e.value or ""),
                    )
                    .props('outlined autogrow maxlength=4000 aria-label="Ask about this run"')
                    .classes("full-width question-input")
                )

                def submit():
                    try:
                        analyst.ask(view.run_id, question.value or "", selected_turn=view.tick)
                        question.set_value("")
                        ask_error.set_text("")
                        ask_thread.refresh()
                        ask_button.set_enabled(False)
                    except ValueError as error:
                        ask_error.set_text(str(error))

                with ui.row().classes("ask-actions"):
                    ask_button = (
                        ui.button("Ask", icon="arrow_upward", color=None, on_click=submit)
                        .props("unelevated no-caps")
                        .classes("primary-action")
                    )
                    view.ask_button = ask_button
                    ask_button.set_enabled(not analyst.busy(view.run_id))
                    ui.label("Uses recorded evidence through the latest saved turn.").classes(
                        "description"
                    )
                ask_error = ui.label().classes("form-error").props('role="alert"')

        @ui.refreshable
        def run_content(record, frame, history):
            scenario = record["scenario"]
            if view.tab == "ask":
                ask_page()
            elif view.tab == "overview":
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
                                    refresh_run(),
                                ),
                            ).props("outlined dense").classes("metric-picker").on(
                                "popup-show", freeze_inspection
                            )
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
                        metric_table(frame["metrics"], history[0]["metrics"])
                with ui.row().classes("section-row section-space"):
                    ui.label("Recent activity").classes("section-title").props(
                        'role="heading" aria-level="2"'
                    )
                    ui.button(
                        "All decisions",
                        on_click=lambda: (setattr(view, "tab", "decisions"), refresh_run()),
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
                                    setattr(
                                        view, "decision_pagination", {"rowsPerPage": 10, "page": 1}
                                    ),
                                    refresh_run(),
                                ),
                            ).props("outlined dense").classes("metric-picker").on(
                                "popup-show", freeze_inspection
                            )
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
                                        pagination=view.decision_pagination,
                                        on_pagination_change=decision_pagination_changed,
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
                with ui.element("div").classes("config-layout"):
                    with ui.column().classes("config-section gap-0"):
                        ui.label("Run configuration").classes("section-title section-label").props(
                            'role="heading" aria-level="2"'
                        )
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
                    with ui.column().classes("config-section gap-0"):
                        ui.label("Limits and usage").classes("section-title section-label").props(
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
                    with ui.column().classes("config-section gap-0"):
                        ui.label("Environment parameters").classes(
                            "section-title section-label"
                        ).props('role="heading" aria-level="2"')
                        key_values([(title(k), v) for k, v in scenario["parameters"].items()])
                    with ui.column().classes("config-section gap-0"):
                        ui.label("Run data").classes("section-title section-label").props(
                            'role="heading" aria-level="2"'
                        )
                        with ui.expansion("Resolved scenario JSON").on(
                            "before-show", freeze_inspection
                        ):
                            ui.label(json.dumps(scenario, indent=2)).classes("json-detail")
                        if record["metadata"]:
                            with ui.expansion("Experiment metadata").on(
                                "before-show", freeze_inspection
                            ):
                                ui.label(json.dumps(record["metadata"], indent=2)).classes(
                                    "json-detail"
                                )
                        ui.button("Verify replay", icon="fact_check", on_click=verify_run).props(
                            "outline no-caps"
                        ).classes("q-mt-md")

        @ui.refreshable
        def run_header():
            record = store.run(view.run_id)
            scenario = record["scenario"]
            latest = store.latest_tick(view.run_id)
            legacy = any(a.get("policy") == "demo" for a in scenario["agents"])
            active = runs.active(view.run_id)
            if not legacy:
                view.runner = runs.get(view.run_id).runner
            complete = record["status"] == "complete" or (view.runner and view.runner.finished)
            pausing = active and not view.runner.playing
            with ui.row().classes("page-heading run-heading"):
                with ui.column():
                    ui.label(scenario["name"]).classes("page-title").props(
                        'role="heading" aria-level="1"'
                    )
                    with ui.element("div").classes("run-subtitle"):
                        status = (
                            "Pausing"
                            if pausing
                            else "Running"
                            if active
                            else title(record["status"])
                        )
                        ui.label(status).classes(f"status status-{status.lower()}")
                        ui.label(run_models(scenario))
                        ui.label(f"Seed {scenario['seed']}")
                with ui.row().classes("run-actions"):
                    if active:
                        ui.button(
                            "Finishing turn…" if pausing else "Pause",
                            icon="pause",
                            color=None,
                            on_click=pause_run,
                        ).props("unelevated no-caps").classes("primary-action").set_enabled(
                            not pausing
                        )
                    elif not complete and not legacy:
                        ui.button(
                            "Play",
                            icon="play_arrow",
                            color=None,
                            on_click=lambda: start_run(),
                        ).props("unelevated no-caps").classes("primary-action").tooltip(
                            "Continues on the server when you leave this page."
                        )
                        ui.button("Step", icon="skip_next", on_click=lambda: start_run(True)).props(
                            "outline no-caps"
                        ).tooltip("Request one new model decision.")
                    if not legacy:
                        ui.button("New variation", icon="content_copy", on_click=variation).props(
                            "outline no-caps"
                        ).tooltip("Copy these settings into a new paused run.")
                    ui.button(icon="download", on_click=export_run).props(
                        'flat round aria-label="Export run JSON"'
                    ).tooltip("Export run JSON")
            with ui.element("div").classes("run-facts"):
                for label, value in [
                    ("Turns", f"{latest} / {scenario['max_steps']}"),
                    ("Requests", f"{record['calls']} / {scenario['limits']['max_model_calls']}"),
                    ("Tokens", f"{record['input_tokens'] + record['output_tokens']:,}"),
                    ("Est. cost", cost_label(record)),
                ]:
                    with ui.element("span") as fact:
                        ui.label(label).classes("fact-label")
                        ui.label(value).classes("fact-value")
                    if label == "Est. cost":
                        fact.tooltip(COST_NOTE)
                if active:
                    actor = view.runner.environment.next_agent()
                    profile = next((a for a in scenario["agents"] if a["id"] == actor), None)
                    text = ("Finishing " if pausing else "Requesting for ") + (
                        profile["name"] if profile else "current turn"
                    )
                else:
                    text = (
                        "Recorded evidence"
                        if view.replay or complete or legacy
                        else "Ready for a model decision"
                    )
                ui.label(text).classes("request-indicator").props('role="status"')
            with ui.element("div").classes("timeline"):
                ui.label(f"Viewing turn {view.tick}").classes("timeline-label")
                with ui.element("div").classes("timeline-scrubber"):
                    ui.button(
                        icon="chevron_left",
                        on_click=lambda: select_turn(max(0, view.tick - 1)),
                    ).props('flat dense round aria-label="Previous turn"').set_enabled(
                        view.tick > 0
                    )
                    slider = ui.slider(min=0, max=max(1, latest), value=view.tick, step=1).props(
                        'label aria-label="Recorded turn"'
                    )
                    slider.set_enabled(latest > 0 and not view.playing)
                    slider.on("change", lambda e: select_turn(int(e.args)))
                    ui.button(
                        icon="chevron_right",
                        on_click=lambda: select_turn(min(latest, view.tick + 1)),
                    ).props('flat dense round aria-label="Next turn"').set_enabled(
                        view.tick < latest
                    )
                with ui.row().classes("timeline-actions"):
                    ui.button(
                        "Pause replay" if view.playing else "Replay",
                        icon="pause" if view.playing else "replay",
                        on_click=toggle,
                    ).props("flat dense no-caps").set_enabled(latest > 0)
                    if view.replay and not legacy and not complete:
                        ui.button("Live", icon="sensors", on_click=latest_turn).props(
                            "outline dense no-caps"
                        ).tooltip("Follow the latest saved turn.")
                    elif view.tick < latest:
                        ui.button("Latest", on_click=latest_turn).props("flat dense no-caps")
            if view.error or record["error"]:
                with ui.column().classes("error-banner gap-1").props('role="alert"'):
                    error = view.error or record["error"]
                    if error == "CancelledError":
                        error = (
                            "The previous request was interrupted. "
                            "Press Play to retry the saved turn."
                        )
                    ui.label(error)
                    if record["status"] == "failed":
                        ui.label(
                            f"Checkpoint saved at turn {latest}. "
                            "Play retries; New variation changes settings."
                        )
            with ui.tabs(
                value=view.tab,
                on_change=lambda e: (setattr(view, "tab", e.value), refresh_run()),
            ).classes("run-tabs"):
                for key in ("overview", "environment", "decisions", "ask", "configuration"):
                    ui.tab(
                        key,
                        label={"ask": "Ask AI", "configuration": "Settings"}.get(
                            key, key.capitalize()
                        ),
                    )

        def run_page():
            record = store.run(view.run_id)
            run_header()
            run_content(
                record, store.frame(view.run_id, view.tick), store.history(view.run_id, view.tick)
            )

        @ui.refreshable
        def render():
            view.library_update = None
            runs_nav.classes(
                add="active" if view.section != "environments" else "",
                remove="active" if view.section == "environments" else "",
            )
            env_nav.classes(
                add="active" if view.section == "environments" else "",
                remove="active" if view.section != "environments" else "",
            )
            shell_path.set_text(
                {
                    "runs": "",
                    "run": view.run_id,
                    "new": "New run",
                    "environments": "Environments",
                    "compare": "Compare runs",
                }[view.section]
            )
            breadcrumb_root.set_visibility(view.section != "environments")
            breadcrumb_separator.set_visibility(view.section not in ("runs", "environments"))
            shell_path.set_visibility(view.section != "runs")
            with ui.column().classes("page" + (" setup-page" if view.section == "new" else "")):
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
            update_url()

        if section in ("runs", "environments", "new"):
            view.section = section
        if run:
            try:
                record = store.run(run)
                view.run_id, view.section = run, "run"
                legacy = any(a.get("policy") == "demo" for a in record["scenario"]["agents"])
                view.runner = None if legacy else runs.get(run).runner
                latest = store.latest_tick(run)
                view.tick = max(0, min(latest, int(turn))) if turn else latest
                view.replay = bool(turn) or legacy or record["status"] == "complete"
                view.selected = record["scenario"]["agents"][0]["id"]
                if tab in ("overview", "environment", "decisions", "ask", "configuration"):
                    view.tab = tab
                if view.tab == "decisions":
                    actor = store.frame(run, view.tick)["actor"] if turn else None
                    ids = {profile["id"] for profile in record["scenario"]["agents"]}
                    view.selected = agent if agent in ids else actor or view.selected
            except ValueError:
                view.section = "runs"
                ui.notify("That run or turn is unavailable.", type="warning")
        render()
        ui.run_javascript("window.addEventListener('popstate', () => location.reload())")
        timer = ui.timer(0.5, timer_tick)

        def cleanup():
            timer.cancel()

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
