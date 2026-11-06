"""A session-local research workspace over the same headless runner and journal."""

import json
from pathlib import Path

from nicegui import ui

from .config import load_scenario
from .costs import estimate_cost
from .runner import Runner
from .sandboxes import get_sandbox
from .store import Store

SERIES_COLORS = ["#a8ce83", "#edc278", "#84bdcf", "#d2a4c2"]


def serve(db_path: str, scenario_dir: str, host: str, port: int):
    scenarios = {str(p): load_scenario(p) for p in sorted(Path(scenario_dir).glob("*.yaml"))}
    if not scenarios:
        raise ValueError(f"No scenario YAML files in {scenario_dir}")
    default = next((p for p in scenarios if Path(p).stem == "frontier"), next(iter(scenarios)))

    @ui.page("/")
    def page():
        ui.dark_mode().enable()
        ui.colors(primary="#b8d9c0", secondary="#84bdcf", positive="#a8ce83", warning="#edc278")
        ui.add_css(Path(__file__).with_name("viewer.css").read_text())
        store = Store(db_path)
        client = ui.context.client

        class View:
            runner: Runner | None = None
            run_id = ""
            tick = 0
            selected = ""
            playing = False
            busy = False
            replay = False
            error = ""
            tab = "Events"
            pause_requested = False
            request_actor = ""

        view = View()

        def stop():
            if view.busy:
                view.pause_requested = True
            view.playing = False
            if view.runner:
                view.runner.pause()
            update_controls()

        def select_agent(agent_id):
            view.selected = agent_id
            body.refresh()

        def refresh_saved():
            saved.options = {
                r["id"]: f"{r['scenario']['name']} · {r['tick']} turns · {r['id']}"
                for r in store.runs()
            }
            saved.update()

        def update_controls():
            play.set_text("Pause" if view.playing else "Play")
            play.props(f"icon={'pause' if view.playing else 'play_arrow'}")
            record = store.run(view.run_id) if view.run_id else None
            latest = store.frame(view.run_id)["tick"] if record else 0
            can_advance = bool(record) and (
                view.tick < latest
                if view.replay
                else bool(view.runner and not view.runner.finished)
            )
            step.set_enabled(can_advance and not view.busy and not view.playing)
            # Pause remains available while a request is in flight.
            play.set_enabled(view.playing or (can_advance and not view.busy))
            for element in (scenario_select, seed, model_select, new, saved, load):
                element.set_enabled(not view.busy and not view.playing)
            legacy = bool(
                record and any(a.get("policy") == "demo" for a in record["scenario"]["agents"])
            )
            resume.set_enabled(bool(record) and view.replay and not legacy and not view.busy)
            scrub.set_enabled(bool(record) and latest > 0 and not view.busy)
            scrub._props["max"] = max(1, latest)
            scrub.set_value(view.tick)
            if not record:
                title.set_text("Create a run")
                position.set_text("Ready")
                request.set_text("Step or Play sends model requests.")
                return
            scenario = record["scenario"]
            title.set_text(scenario["name"])
            phase = (
                "Replay"
                if view.replay
                else "Playing"
                if view.playing
                else record["status"].capitalize()
            )
            position.set_text(f"{phase} · Turn {view.tick} / {scenario['max_steps']}")
            identity.set_text(f"{view.run_id} · Seed {scenario['seed']}")
            limits = scenario["limits"]
            token_cap = limits.get("max_total_tokens")
            estimate = estimate_cost(record)
            cost_text = (
                f"Est. cost ${estimate:.4f}" if estimate is not None else "Est. cost unavailable"
            )
            if estimate is not None and record["charged_tokens"] > (
                record["input_tokens"] + record["output_tokens"]
            ):
                cost_text += " (partial)"
            budget.set_text(
                f"Requests {record['calls']:,} / {limits['max_model_calls']:,}"
                f"   ·   Tokens accounted {record['charged_tokens']:,}"
                + (f" / {token_cap:,}" if token_cap is not None else " · No total token cap")
                + f"   ·   {cost_text}"
            )
            if view.replay:
                request.set_text(
                    "Historical demo · replay only"
                    if legacy
                    else "Recorded replay · no model calls"
                )
            elif view.busy:
                profile = next(a for a in scenario["agents"] if a["id"] == view.request_actor)
                request.set_text(
                    f"{profile['name']} → {scenario['models'][profile['model']]}"
                    + (" · pausing after this request" if view.pause_requested else " · requesting")
                )
            else:
                models = list(
                    dict.fromkeys(scenario["models"][a["model"]] for a in scenario["agents"])
                )
                request.set_text(" · ".join(models))
            if view.busy and not view.replay:
                step.props("loading")
            else:
                step.props(remove="loading")

        def redraw():
            update_controls()
            error_area.refresh()
            body.refresh()

        async def advance():
            if view.busy or not view.run_id:
                return
            if not view.replay:
                view.request_actor = view.runner.environment.next_agent()
            view.busy, view.error = True, ""
            view.pause_requested = False
            update_controls()
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
                detail = detail.rstrip(".")
                view.error = (
                    f"Run paused: {detail}. Check the model or limits, "
                    "then press Step to retry or create a new run."
                )
            finally:
                view.busy = False
                refresh_saved()
                redraw()

        def toggle():
            if view.playing:
                stop()
            else:
                view.playing = True
                if view.runner and not view.replay:
                    view.runner.playing = True
                update_controls()

        async def timer_tick():
            if view.playing and not view.busy:
                await advance()

        def new_run():
            stop()
            try:
                scenario = scenarios[scenario_select.value].model_copy(deep=True)
                scenario.seed = int(seed.value)
                if model_select.value != "profiles":
                    for profile in scenario.agents:
                        profile.model = model_select.value
                runner = Runner.create(store, scenario)
                view.runner, view.run_id = runner, runner.id
                view.tick, view.replay, view.error = 0, False, ""
                view.selected = scenario.agents[0].id
                refresh_saved()
                saved.set_value(runner.id)
                redraw()
            except Exception as error:
                view.error = str(error) if isinstance(error, ValueError) else type(error).__name__
                error_area.refresh()

        def load_saved():
            if not saved.value:
                return
            stop()
            view.run_id, view.runner = saved.value, None
            view.tick, view.replay, view.error = 0, True, ""
            view.selected = store.run(view.run_id)["scenario"]["agents"][0]["id"]
            redraw()

        def resume_saved():
            stop()
            try:
                view.runner = Runner(store, view.run_id)
                view.tick = view.runner.tick
                view.replay, view.error = False, ""
                redraw()
            except ValueError as error:
                view.error = str(error)
                error_area.refresh()

        def seek(event):
            if view.busy:
                return
            stop()
            view.tick, view.replay = int(event.args), True
            redraw()

        def scenario_changed():
            scenario = scenarios[scenario_select.value]
            seed.set_value(scenario.seed)
            description.set_text(scenario.description)
            model_select.options = {
                "profiles": "Scenario assignments",
                **{k: v for k, v in scenario.models.items()},
            }
            model_select.set_value("profiles")
            model_select.update()

        with (
            ui.left_drawer(top_corner=True)
            .props("width=248 breakpoint=1100 bordered")
            .classes("sidebar") as drawer
        ):
            with ui.row().classes("sidebar-brand"):
                ui.icon("hub", size="21px")
                ui.label("Agent sandbox").classes("brand-title")
            ui.label("Run setup").classes("section-title")
            scenario_select = (
                ui.select(
                    {key: s.name for key, s in scenarios.items()},
                    value=default,
                    label="Scenario",
                    on_change=scenario_changed,
                )
                .props("outlined dense")
                .classes("w-full")
            )
            description = ui.label(scenarios[default].description).classes("setup-note")
            model_select = (
                ui.select(
                    {"profiles": "Scenario assignments", **scenarios[default].models},
                    value="profiles",
                    label="Model for new run",
                )
                .props("outlined dense")
                .classes("w-full")
            )
            seed = (
                ui.number(
                    "Environment seed",
                    value=scenarios[default].seed,
                    min=0,
                    max=2**32 - 1,
                    precision=0,
                )
                .props("outlined dense")
                .classes("w-full")
            )
            new = (
                ui.button("New run", icon="add", on_click=new_run)
                .props("no-caps unelevated text-color=dark")
                .classes("w-full")
            )
            ui.label("Step and Play use real models. YAML sets run limits.").classes(
                "setup-note"
            )
            ui.separator().classes("my-3")
            ui.label("Saved runs").classes("section-title")
            saved = (
                ui.select({}, label="Choose a run")
                .props("outlined dense options-dense")
                .classes("w-full")
            )
            load = (
                ui.button("Open replay", icon="history", on_click=load_saved)
                .props("outline no-caps")
                .classes("w-full")
            )
            ui.label("Replay reads recorded decisions without API calls.").classes("setup-note")

        with ui.header().classes("app-header"):
            with ui.row().classes("heading-row"):
                ui.button(icon="menu", on_click=drawer.toggle).props(
                    'flat round dense aria-label="Toggle run setup"'
                ).classes("menu-toggle")
                title = ui.label("Create a run").classes("run-title")
                position = ui.label("Ready").classes("position")
            with ui.row().classes("transport"):
                step = ui.button("Step", icon="skip_next", on_click=advance).props(
                    "outline no-caps"
                )
                play = ui.button("Play", icon="play_arrow", on_click=toggle).props(
                    "no-caps unelevated text-color=dark"
                )
                request = ui.label("Step or Play sends model requests.").classes("request-status")
            with ui.row().classes("usage-row"):
                identity = ui.label().classes("run-identity")
                budget = ui.label().classes("budget")
                budget.tooltip(
                    "Estimated whole-run USD cost at standard list prices, before credits or "
                    "cache discounts. Pending/failed requests with unknown usage are excluded. "
                    "Mixed or unpriced models have no estimate."
                )
            with ui.row().classes("replay-bar"):
                ui.label("Timeline").classes("muted text-xs")
                scrub = ui.slider(min=0, max=1, value=0, step=1).props(
                    'label aria-label="Replay turn"'
                )
                scrub.on("change", seek)
                scrub.tooltip("Inspect a recorded turn without model calls")
                resume = ui.button("Resume latest", on_click=resume_saved).props(
                    "flat dense no-caps"
                )

        @ui.refreshable
        def error_area():
            if view.error:
                ui.label(view.error).classes("error-banner").props('role="alert"')

        error_area()

        @ui.refreshable
        def body():
            if not view.run_id:
                with ui.column().classes("empty-workspace"):
                    ui.label("Start an experiment").classes("run-title")
                    ui.label(
                        "Choose a scenario and model in Run setup, then create a run. "
                        "Nothing is sent until you press Step or Play."
                    ).classes("muted")
                return
            record = store.run(view.run_id)
            scenario = record["scenario"]
            frame = store.frame(view.run_id, view.tick)
            history = store.frames(view.run_id, view.tick)
            profiles = {a["id"]: a for a in scenario["agents"]}
            if view.selected not in profiles:
                view.selected = next(iter(profiles))
            profile = profiles[view.selected]
            metric_keys = list(frame["metrics"])[:3]
            with ui.element("div").classes("workspace"):
                with ui.column().classes("main-panel"):
                    with ui.row().classes("resources"):
                        for i, key in enumerate(metric_keys):
                            with ui.row().classes("resource"):
                                ui.label(key.replace("_", " ").capitalize()).classes("muted")
                                ui.label(f"{frame['metrics'][key]:g}").style(
                                    f"color: {SERIES_COLORS[i]}"
                                )
                    spec = get_sandbox(scenario["sandbox"])
                    if spec.panel:
                        spec.panel(frame["checkpoint"]["environment"], select_agent)
                    else:
                        ui.label("Environment state").classes("section-title")
                        ui.code(
                            json.dumps(frame["checkpoint"]["environment"], indent=2),
                            language="json",
                        )
                    with ui.tabs(
                        value=view.tab, on_change=lambda e: setattr(view, "tab", e.value)
                    ).classes("history-tabs") as tabs:
                        events_tab = ui.tab("Events")
                        resources_tab = ui.tab("Resources")
                    with ui.tab_panels(tabs, value=view.tab).classes("history-panels"):
                        with ui.tab_panel(events_tab):
                            events = [(f["tick"], event) for f in history for event in f["events"]]
                            with ui.column().classes("event-feed"):
                                if not events:
                                    ui.label(
                                        "No decisions yet. Step to request the first agent action."
                                    ).classes("muted empty-feed")
                                for tick, event in reversed(events[-60:]):
                                    with ui.row().classes("event-row"):
                                        ui.label(str(tick)).classes("event-tick")
                                        ui.label(event["kind"]).classes(
                                            f"event-kind event-{event['kind']}"
                                        )
                                        ui.label(event["text"])
                        with ui.tab_panel(resources_tab):
                            ui.echart(
                                {
                                    "backgroundColor": "transparent",
                                    "color": SERIES_COLORS,
                                    "tooltip": {"trigger": "axis"},
                                    "legend": {"textStyle": {"color": "#acbbae"}, "top": 0},
                                    "grid": {"left": 40, "right": 15, "top": 35, "bottom": 25},
                                    "xAxis": {
                                        "type": "category",
                                        "data": [f["tick"] for f in history],
                                        "axisLabel": {"color": "#acbbae"},
                                    },
                                    "yAxis": {
                                        "type": "value",
                                        "axisLabel": {"color": "#acbbae"},
                                        "splitLine": {"lineStyle": {"color": "#35463b"}},
                                    },
                                    "series": [
                                        {
                                            "name": key.capitalize(),
                                            "type": "line",
                                            "showSymbol": False,
                                            "data": [f["metrics"][key] for f in history],
                                        }
                                        for key in metric_keys
                                    ],
                                }
                            ).classes("resource-chart")
                with ui.column().classes("inspector"):
                    ui.label("Agent inspector").classes("section-title")
                    ui.select(
                        {key: p["name"] for key, p in profiles.items()},
                        value=view.selected,
                        on_change=lambda e: select_agent(e.value),
                        label="Agent",
                    ).props("outlined dense").classes("w-full")
                    ui.label(profile["name"]).classes("agent-name")
                    model = (
                        "Historical demo · recorded decisions"
                        if profile.get("policy") == "demo"
                        else scenario["models"][profile["model"]]
                    )
                    ui.label(model).classes("model-name")
                    ui.label(profile["goal"]).classes("agent-goal")
                    environment = spec.create()
                    environment.restore(frame["checkpoint"]["environment"])
                    observation = environment.observe(view.selected)
                    own_state = observation.get("self", {})
                    if not isinstance(own_state, dict):
                        own_state = {}
                    with ui.row().classes("agent-state"):
                        for key, value in own_state.items():
                            if key != "id" and isinstance(value, (str, int, float)):
                                with ui.column().classes("gap-0"):
                                    ui.label(key.replace("_", " ").capitalize()).classes(
                                        "detail-label"
                                    )
                                    ui.label(str(value).capitalize()).classes("detail-body")
                    last = next((f for f in reversed(history) if f["actor"] == view.selected), None)
                    with ui.column().classes("inspector-section"):
                        ui.label("Last decision").classes("detail-label")
                        if last:
                            action = last["decision"]["action"]
                            heading = str(action.get("kind", "Action")).capitalize()
                            if action.get("target"):
                                heading += f" → {action['target'].capitalize()}"
                            ui.label(f"{heading} · Turn {last['tick']}").classes("decision-title")
                            ui.label(last["decision"]["rationale"]).classes("detail-body")
                            if action.get("message"):
                                ui.label(f"Radio: {action['message']}").classes("detail-body muted")
                        else:
                            ui.label("Waiting for this agent’s first turn.").classes(
                                "detail-body muted"
                            )
                    with ui.column().classes("inspector-section"):
                        ui.label("Private memory").classes("detail-label")
                        ui.label(
                            frame["checkpoint"]["memory"][view.selected]
                            or "No memory recorded yet."
                        ).classes("detail-body")
                    if "inbox" in own_state:
                        with ui.expansion(
                            f"Radio inbox · {len(own_state['inbox'])}", icon="chat_bubble_outline"
                        ).props("dense"):
                            if not own_state["inbox"]:
                                ui.label("No messages received.").classes("detail-body muted")
                            for message in reversed(own_state["inbox"]):
                                with ui.column().classes("radio-entry gap-1"):
                                    ui.label(
                                        f"{message['from'].capitalize()} · Turn {message['turn']}"
                                    ).classes("muted text-xs")
                                    ui.label(message["text"]).classes("detail-body")
                    with ui.expansion("Visible observation", icon="visibility").props("dense"):
                        ui.label(json.dumps(observation, indent=2)).classes("json-detail")
                    if last:
                        with ui.expansion("Decision record", icon="data_object").props("dense"):
                            ui.label(
                                json.dumps(
                                    {"input": last["observation"], "decision": last["decision"]},
                                    indent=2,
                                )
                            ).classes("json-detail")

        body()
        refresh_saved()
        existing = store.runs()
        if existing:
            saved.set_value(existing[0]["id"])
            load_saved()
        else:
            update_controls()
        timer = ui.timer(0.5, timer_tick)

        async def cleanup():
            stop()
            timer.cancel()
            if view.runner:
                await view.runner.wait_idle()
            store.close()

        client.on_delete(cleanup)

    ui.run(host=host, port=port, title="Agent sandbox", dark=True, reload=False, show=False)
