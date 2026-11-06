"""The colony's optional NiceGUI panel. Never imported by headless execution."""

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
    width, height = size
    svg = [
        '<defs><pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">'
        '<circle cx="1" cy="1" r="1" fill="#34423f"/></pattern></defs>',
        f'<rect width="{width}" height="{height}" fill="url(#grid)"/>',
    ]
    for a, b in EDGES:
        x1, y1 = positions[a]
        x2, y2 = positions[b]
        if variant == "narrow" and (a, b) == ("habitat", "workshop"):
            # Route this connection through the central gap, clear of the reactor.
            svg.append(
                '<path d="M170 65 L170 280 L255 355" fill="none" '
                'stroke="#43534d" stroke-width="2"/>'
            )
            continue
        svg.append(
            f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#43534d" stroke-width="2"/>'
        )
    for key, (x, y) in positions.items():
        name = FACILITIES[key][0]
        facility = snapshot["facilities"][key]
        integrity = facility["integrity"]
        color = "#e99180" if integrity < 30 else "#edc278" if integrity < 65 else "#b8d9c0"
        stroke = "#b8d9c0" if key == selected else "#46574f"
        svg.extend(
            [
                f'<g><rect x="{x - 74}" y="{y - 42}" width="148" height="84" '
                f'rx="6" fill="#202e29" stroke="{stroke}" stroke-width="2"/>',
                f'<text x="{x}" y="{y - 10}" text-anchor="middle" fill="#ecf1e9" '
                f'font-size="17" font-family="sans-serif">{name}</text>',
                f'<text x="{x}" y="{y + 14}" text-anchor="middle" fill="{color}" '
                f'font-size="13" font-family="sans-serif">{integrity}% integrity '
                f"· L{facility['level']}</text>",
            ]
        )
        occupants = [
            agent for agent, state in snapshot["settlers"].items() if state["location"] == key
        ]
        for i, agent in enumerate(occupants):
            cx = x - (len(occupants) - 1) * 13 + i * 26
            svg.append(
                f'<circle cx="{cx}" cy="{y + 43}" r="10" fill="#b8d9c0" stroke="#17231e"/>'
                f'<text x="{cx}" y="{y + 47}" fill="#17231e" font-size="11" '
                'font-family="sans-serif" text-anchor="middle">'
                f"{escape(agent[0].upper())}</text>"
            )
        svg.append("</g>")

    def click(event):
        for key, (x, y) in positions.items():
            if abs(event.image_x - x) < 76 and abs(event.image_y - y) < 54:
                choose(key)
                return

    ui.interactive_image(size=size, content="".join(svg), on_mouse=click).classes(
        f"colony-map colony-map-{variant} w-full"
    ).props('role="img" aria-label="Colony facilities and connecting paths"')


def render(snapshot: dict, select):
    def choose(key):
        ui.context.client.storage["facility"] = key
        occupants = [
            agent for agent, state in snapshot["settlers"].items() if state["location"] == key
        ]
        if occupants:
            select(occupants[0])
        else:
            panel.refresh()

    @ui.refreshable
    def panel():
        selected = ui.context.client.storage.get("facility", "habitat")
        ui.label("Colony map").classes("section-title")
        with ui.row().classes("map-caption"):
            ui.label("Click a facility to inspect it")
            ui.label("5 facilities · 6 settlers")
        positions = {key: (x, y) for key, (_, x, y) in FACILITIES.items()}
        draw_map(snapshot, selected, positions, (720, 540), choose, "wide")
        draw_map(snapshot, selected, NARROW_POSITIONS, (340, 430), choose, "narrow")
        # Native buttons provide keyboard access to the same map selection.
        with ui.row().classes("facility-buttons"):
            for key, (name, _, _) in FACILITIES.items():
                ui.button(name, on_click=lambda key=key: choose(key)).props(
                    "flat dense no-caps"
                ).classes("selected-facility" if key == selected else "")
        facility = snapshot["facilities"][selected]
        with ui.row().classes("facility-detail"):
            ui.label(FACILITIES[selected][0]).classes("font-medium")
            ui.label(f"Integrity {facility['integrity']}% · Upgrade level {facility['level']}/3")
        with ui.row().classes("gap-2"):
            for agent, state in snapshot["settlers"].items():
                if state["location"] == selected:
                    ui.button(
                        f"Inspect {agent.capitalize()}", on_click=lambda a=agent: select(a)
                    ).props("flat dense no-caps icon=person_outline")
        if not any(s["location"] == selected for s in snapshot["settlers"].values()):
            ui.label("No settlers at this facility.").classes("muted text-sm")

    panel()
