"""Frontier Colony's optional visualization inside the general evaluation workspace."""

from html import escape

from nicegui import ui

from .colony import EDGES, FACILITIES

NARROW_POSITIONS = {
    "habitat": (170, 65),
    "greenhouse": (85, 205),
    "reactor": (255, 205),
    "quarry": (85, 355),
    "workshop": (255, 355),
}


def draw_map(snapshot, selected, positions, size, choose, variant):
    svg = []
    for a, b in EDGES:
        x1, y1 = positions[a]
        x2, y2 = positions[b]
        if variant == "narrow" and (a, b) == ("habitat", "workshop"):
            svg.append(
                '<path d="M170 65 L170 280 L255 355" fill="none" '
                'stroke="#465462" stroke-width="1.5"/>'
            )
        else:
            svg.append(
                f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" '
                'stroke="#465462" stroke-width="1.5"/>'
            )
    for key, (x, y) in positions.items():
        facility = snapshot["facilities"][key]
        integrity = facility["integrity"]
        color = "#e0a09b" if integrity < 30 else "#d6b57b" if integrity < 65 else "#adb5c0"
        stroke = "#85b8d2" if key == selected else "#465462"
        fill = "#20333f" if key == selected else "#20262d"
        name = escape(FACILITIES[key][0])
        svg.extend(
            [
                f'<g><rect x="{x - 74}" y="{y - 39}" width="148" height="78" rx="6" '
                f'fill="{fill}" stroke="{stroke}" stroke-width="1.5"/>',
                f'<text x="{x}" y="{y - 8}" text-anchor="middle" fill="#e7e9ed" '
                f'font-size="17" font-family="sans-serif">{name}</text>',
                f'<text x="{x}" y="{y + 16}" text-anchor="middle" fill="{color}" '
                f'font-size="13" font-family="sans-serif">{integrity}% '
                f'· Level {facility["level"]}</text>',
            ]
        )
        occupants = [a for a, state in snapshot["settlers"].items() if state["location"] == key]
        for i, agent in enumerate(occupants):
            cx = x - (len(occupants) - 1) * 13 + i * 26
            svg.append(
                f'<circle cx="{cx}" cy="{y + 40}" r="10" fill="#85b8d2" '
                'stroke="#171b20"/><text '
                f'x="{cx}" y="{y + 44}" fill="#101b23" font-size="11" '
                'font-family="sans-serif" text-anchor="middle">'
                f"{escape(agent[0].upper())}</text>"
            )
        svg.append("</g>")

    def click(event):
        for key, (x, y) in positions.items():
            if abs(event.image_x - x) < 76 and abs(event.image_y - y) < 53:
                choose(key)
                return

    ui.interactive_image(size=size, content="".join(svg), on_mouse=click).classes(
        f"colony-map colony-map-{variant}"
    ).props('role="img" aria-label="Colony facilities, connections and agent locations"').on(
        # NiceGUI's transparent sizing image has no alt API; the SVG's wrapper is labeled.
        "vnodeMounted",
        js_handler="({el}) => el.querySelector('img').setAttribute('alt', '')",
    )


def render(snapshot: dict, select):
    def choose(key):
        ui.context.client.storage["facility"] = key
        panel.refresh()

    @ui.refreshable
    def panel():
        selected = ui.context.client.storage.get("facility", "habitat")
        with ui.element("div").classes("colony-layout"):
            positions = {key: (x, y) for key, (_, x, y) in FACILITIES.items()}
            with ui.column().classes("full-width gap-3"):
                draw_map(snapshot, selected, positions, (720, 540), choose, "wide")
                draw_map(snapshot, selected, NARROW_POSITIONS, (340, 430), choose, "narrow")
                ui.label("Select a facility on the map or use the facility selector.").classes(
                    "description"
                )
            with ui.column().classes("facility-inspector"):
                ui.select(
                    {key: f[0] for key, f in FACILITIES.items()},
                    value=selected,
                    label="Facility",
                    on_change=lambda e: choose(e.value),
                ).props("outlined dense")
                facility = snapshot["facilities"][selected]
                with ui.column().classes("gap-2"):
                    ui.label(
                        f"Integrity {facility['integrity']}% · Level {facility['level']} / 3"
                    ).classes("description")
                    resource = {
                        "greenhouse": "Food production",
                        "reactor": "Energy production",
                        "quarry": "Material extraction",
                        "workshop": "Material processing",
                        "habitat": "Rest and recovery",
                    }
                    ui.label(resource[selected]).classes("description")
                ui.label("Agents here").classes("subsection-title").props(
                    'role="heading" aria-level="2"'
                )
                with ui.column().classes("facility-occupants"):
                    occupants = [
                        (a, state)
                        for a, state in snapshot["settlers"].items()
                        if state["location"] == selected
                    ]
                    if not occupants:
                        ui.label("No agents at this facility.").classes("description")
                    for agent, state in occupants:
                        ui.button(
                            agent.capitalize(),
                            icon="person_outline",
                            on_click=lambda a=agent: select(a),
                        ).props("outline no-caps")
                        ui.label(f"Health {state['health']} · Stamina {state['stamina']}").classes(
                            "description"
                        )

    panel()
