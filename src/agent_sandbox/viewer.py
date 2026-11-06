"""A session-local viewer; all execution still goes through the headless runner."""

import json
from pathlib import Path

from nicegui import ui

from .config import load_scenario
from .runner import Runner
from .sandboxes import get_sandbox
from .store import Store

SERIES_COLORS = ["#a8ce83", "#edc278", "#84bdcf", "#d2a4c2"]


def serve(db_path: str, scenario_dir: str, host: str, port: int):
    paths = sorted(Path(scenario_dir).glob("*.yaml"))
    scenarios = {}
    for path in paths:
        scenarios[str(path)] = load_scenario(path)
    if not scenarios:
        raise ValueError(f"No scenario YAML files in {scenario_dir}")
    default = next(
        (key for key in scenarios if Path(key).stem == "frontier"), next(iter(scenarios))
    )

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

        view = View()

        def stop():
            view.playing = False
            if view.runner:
                view.runner.pause()
            play.set_text("Play")
            play.props("icon=play_arrow")
            if view.run_id:
                update_controls()

        def select_agent(agent_id):
            view.selected = agent_id
            body.refresh()

        def update_controls():
            if not view.run_id:
                return
            record = store.run(view.run_id)
            latest = store.frame(view.run_id)["tick"]
            maximum = record["scenario"]["max_steps"]
            phase = "Replay" if view.replay else record["status"].capitalize()
            position.set_text(f"Turn {view.tick} / {maximum} · {phase}")
            mode.set_text(
                "Saved replay"
                if view.replay
                else (
                    "Paid · capped"
                    if any(a["policy"] == "model" for a in record["scenario"]["agents"])
                    else "Offline demo"
                )
            )
            step.set_enabled(
                not view.busy and (view.tick < latest if view.replay else not view.runner.finished)
            )
            play.set_enabled(
                not view.busy and (view.tick < latest if view.replay else not view.runner.finished)
            )
            for element in (scenario_select, seed, new, saved, paid, resume, scrub):
                element.set_enabled(not view.busy)
            resume.set_enabled(not view.busy and latest < maximum)
            scrub._props["max"] = max(1, latest)
            scrub.set_value(view.tick)
            status.set_text(
                f"Run {view.run_id} · Seed {record['scenario']['seed']} · "
                f"Model calls {record['calls']}/"
                f"{record['scenario']['limits']['max_model_calls']} · "
                f"Tokens charged {record['charged_tokens']}/"
                f"{record['scenario']['limits']['max_total_tokens']}"
            )

        def refresh_saved():
            saved.options = {
                run["id"]: f"{run['scenario']['name']} · {run['tick']} turns · {run['id']}"
                for run in store.runs()
            }
            saved.update()

        def redraw():
            update_controls()
            body.refresh()

        async def advance():
            if view.busy or not view.run_id:
                return
            view.busy = True
            view.error = ""
            update_controls()
            try:
                if view.replay:
                    latest = store.frame(view.run_id)["tick"]
                    if view.tick < latest:
                        view.tick += 1
                    if view.tick == latest:
                        stop()
                else:
                    view.runner.paid = paid.value
                    await view.runner.step()
                    view.tick = view.runner.tick
                    if view.runner.finished:
                        stop()
            except Exception as error:
                stop()
                detail = str(error) if isinstance(error, ValueError) else type(error).__name__
                view.error = (
                    f"Run paused: {detail}. Resume the latest checkpoint to retry, "
                    "or create a new run with revised settings."
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
                play.set_text("Pause")
                play.props("icon=pause")

        async def timer_tick():
            if view.playing and not view.busy:
                await advance()

        def new_run():
            stop()
            try:
                scenario = scenarios[scenario_select.value].model_copy(deep=True)
                scenario.seed = int(seed.value)
                runner = Runner.create(store, scenario, paid=paid.value)
                view.runner, view.run_id = runner, runner.id
                view.tick, view.replay, view.error = 0, False, ""
                view.selected = scenario.agents[0].id
                refresh_saved()
                saved.set_value(runner.id)
                redraw()
            except Exception as error:
                view.error = str(error) if isinstance(error, ValueError) else type(error).__name__
                body.refresh()

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
                view.runner = Runner(store, view.run_id, paid=paid.value)
                view.tick = view.runner.tick
                view.replay, view.error = False, ""
                redraw()
            except Exception as error:
                view.error = str(error)
                body.refresh()

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

        with ui.row().classes("app-header"):
            with ui.row().classes("brand"):
                ui.icon("hub", size="25px").style("color: #b8d9c0")
                ui.label("Agent sandbox").classes("brand-title")
            mode = ui.label("Offline demo").classes("mode")
        with ui.row().classes("setup"):
            scenario_select = (
                ui.select(
                    {key: scenario.name for key, scenario in scenarios.items()},
                    value=default,
                    label="Scenario",
                    on_change=scenario_changed,
                )
                .props("outlined dense")
                .classes("scenario-select")
            )
            seed = (
                ui.number("Seed", value=scenarios[default].seed, min=0, max=2**32 - 1, precision=0)
                .props("outlined dense")
                .classes("seed-input")
            )
            new = ui.button("New run", icon="add", on_click=new_run).props("outline no-caps")
            paid = ui.checkbox("Allow paid calls", value=False)
            paid.tooltip(
                "Required for model policies in YAML. Configured call and token caps apply."
            )
        description = ui.label(scenarios[default].description).classes("setup-note")
        with ui.row().classes("transport"):
            step = ui.button("Step", icon="skip_next", on_click=advance).props("outline no-caps")
            play = ui.button("Play", icon="play_arrow", on_click=toggle).props("no-caps")
            ui.button("Pause", icon="pause", on_click=stop).props("flat no-caps")
            with ui.row().classes("replay-bar"):
                ui.label("Replay turn").classes("muted text-xs")
                scrub = ui.slider(min=0, max=1, value=0, step=1).props(
                    'label aria-label="Replay turn"'
                )
                scrub.on("change", seek)
                scrub.tooltip("Seek saved state without model calls. Resume latest to continue.")
            position = ui.label().classes("position")

        @ui.refreshable
        def body():
            if view.error:
                ui.label(view.error).classes("error-banner")
            if not view.run_id:
                ui.label("Choose a scenario and create a run.").classes("p-6 muted")
                return
            record = store.run(view.run_id)
            scenario = record["scenario"]
            frame = store.frame(view.run_id, view.tick)
            history = store.frames(view.run_id, view.tick)
            profiles = {agent["id"]: agent for agent in scenario["agents"]}
            if view.selected not in profiles:
                view.selected = next(iter(profiles))
            profile = profiles[view.selected]
            with ui.element("div").classes("workspace"):
                with ui.column().classes("main-panel"):
                    metric_keys = list(frame["metrics"])[:3]
                    with ui.row().classes("resources"):
                        for i, key in enumerate(metric_keys):
                            with ui.row().classes("resource"):
                                ui.label(key.replace("_", " ").capitalize()).classes(
                                    "resource-name"
                                )
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
                with ui.column().classes("inspector"):
                    ui.label("Agent inspector").classes("section-title")
                    ui.select(
                        {key: p["name"] for key, p in profiles.items()},
                        value=view.selected,
                        on_change=lambda event: select_agent(event.value),
                        label="Agent",
                    ).props("outlined dense")
                    ui.label(profile["name"]).classes("agent-name")
                    ui.label(
                        f"{profile['policy'].capitalize()} policy"
                        + (
                            f" · {scenario['models'][profile['model']]}"
                            if profile["policy"] == "model"
                            else " · no model calls"
                        )
                    ).classes("muted text-xs")
                    ui.label(profile["goal"]).classes("agent-goal")
                    environment = get_sandbox(scenario["sandbox"]).create()
                    environment.restore(frame["checkpoint"]["environment"])
                    observation = environment.observe(view.selected)
                    own_state = observation.get("self", {})
                    if not isinstance(own_state, dict):
                        own_state = {}
                    with ui.row().classes("agent-state"):
                        for key, value in own_state.items():
                            if key != "id" and isinstance(value, (str, int, float)):
                                with ui.column().classes("gap-1"):
                                    ui.label(key.replace("_", " ").capitalize()).classes(
                                        "detail-label"
                                    )
                                    ui.label(str(value)).classes("detail-body")
                    with ui.column().classes("inspector-divider"):
                        ui.label("Private memory").classes("detail-label")
                        ui.label(
                            frame["checkpoint"]["memory"][view.selected] or "No memories yet."
                        ).classes("detail-body")
                    last = next((f for f in reversed(history) if f["actor"] == view.selected), None)
                    with ui.column().classes("inspector-divider"):
                        ui.label("Last decision").classes("detail-label")
                        if last:
                            ui.label(
                                f"Turn {last['tick']} · {json.dumps(last['decision']['action'])}"
                            ).classes("detail-body")
                            ui.label(last["decision"]["rationale"]).classes("detail-body muted")
                        else:
                            ui.label("This agent has not acted yet.").classes("detail-body muted")
                    # Radio belongs to the colony observation, so other sandboxes simply omit it.
                    inbox = own_state.get("inbox", [])
                    if "inbox" in own_state:
                        with ui.column().classes("inspector-divider"):
                            ui.label("Radio inbox").classes("detail-label")
                            if not inbox:
                                ui.label("No messages received.").classes("detail-body muted")
                            for message in reversed(inbox):
                                with ui.column().classes("radio-entry gap-1"):
                                    ui.label(
                                        f"{message['from'].capitalize()} · Turn {message['turn']}"
                                    ).classes("muted text-xs")
                                    ui.label(message["text"]).classes("detail-body")
                    with ui.expansion("Visible observation", icon="visibility").props("dense"):
                        ui.label(json.dumps(observation, indent=2)).classes("json-detail")
                    if last:
                        with ui.expansion("Decision input", icon="history").props("dense"):
                            ui.label(json.dumps(last["observation"], indent=2)).classes(
                                "json-detail"
                            )

                with ui.column().classes("history-panel"):
                    ui.label("Resource history").classes("section-title")
                    ui.echart(
                        {
                            "backgroundColor": "transparent",
                            "color": SERIES_COLORS,
                            "tooltip": {"trigger": "axis"},
                            "legend": {"textStyle": {"color": "#acbbae"}, "top": 0},
                            "grid": {"left": 40, "right": 15, "top": 40, "bottom": 30},
                            "xAxis": {
                                "type": "category",
                                "name": "Turn",
                                "nameLocation": "middle",
                                "nameGap": 22,
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
                                    "smooth": False,
                                }
                                for key in metric_keys
                            ],
                        }
                    ).classes("resource-chart")
                    ui.label("Event feed").classes("section-title")
                    events = [(f["tick"], event) for f in history for event in f["events"]]
                    with ui.column().classes("event-feed"):
                        if not events:
                            ui.label(
                                "Run initialized. Step or play to see the first decision."
                            ).classes("muted")
                        for tick, event in reversed(events[-60:]):
                            with ui.row().classes("event-row"):
                                ui.label(str(tick)).classes("event-tick")
                                ui.label(event["kind"]).classes(f"event-kind event-{event['kind']}")
                                ui.label(event["text"])

        body()
        with ui.column().classes("run-footer"):
            ui.label("Saved runs & replay").classes("section-title")
            with ui.row().classes("w-full items-center"):
                saved = (
                    ui.select({}, label="Saved run").props("outlined dense").classes("run-picker")
                )
                ui.button("Load replay", icon="history", on_click=load_saved).props(
                    "outline no-caps"
                )
                resume = ui.button("Resume latest", on_click=resume_saved).props("flat no-caps")
            status = ui.label().classes("run-status")
        new_run()
        timer = ui.timer(0.8, timer_tick)

        async def cleanup():
            stop()
            timer.cancel()
            # Wait for an in-flight request before closing its journal connection.
            if view.runner:
                await view.runner.wait_idle()
            store.close()

        client.on_delete(cleanup)

    ui.run(host=host, port=port, title="Agent sandbox", dark=True, reload=False, show=False)
