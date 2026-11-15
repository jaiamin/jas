"""Small, deterministic PNG cards from publication data, without browser execution."""

from io import BytesIO
from pathlib import Path
from textwrap import wrap

from PIL import Image, ImageDraw, ImageFont


def social_card(record: dict) -> bytes:
    canvas = Image.new("RGB", (1200, 630), "#f7fafc")
    draw = ImageDraw.Draw(canvas)
    fonts = Path(__file__).parent / "static" / "fonts"
    fallback = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
    font_file = next(fonts.glob("*.ttf"), fallback)

    def font(size: int):
        return (
            ImageFont.truetype(str(font_file), size)
            if font_file.exists()
            else ImageFont.load_default(size=size)
        )

    # The same muted sky and touching ivory pixels as Home, kept deliberately static.
    draw.rectangle((0, 0, 1200, 76), fill="#c2d7e9")
    for x, y, width in ((70, 25, 160), (440, 10, 220), (950, 30, 190)):
        draw.rectangle((x, y, x + width, y + 28), fill="#fffdf3")
        draw.rectangle((x + 28, y - 14, x + width - 28, y), fill="#fffdf3")
    metadata = record["description"]
    draw.text((52, 108), "jas", font=font(28), fill="#2563eb")
    for index, line in enumerate(wrap(metadata["title"], 42)[:2]):
        draw.text((52, 161 + index * 53), line, font=font(42), fill="#15212e")
    for index, line in enumerate(wrap(metadata["finding"], 80)[:3]):
        draw.text((52, 284 + index * 34), line, font=font(24), fill="#475569")
    experiment = record["experiment"]
    primary = experiment["headline"]["metric"]
    cells = experiment["headline"]["cells"]
    values = [c["metrics"].get(primary) for c in cells if c["metrics"].get(primary) is not None]
    colors = ("#0072b2", "#d55e00", "#009e73", "#cc79a7", "#e69f00", "#56b4e9")
    if values:
        low, high = min(0, min(values)), max(values)
        for i, condition in enumerate(experiment["design"]["conditions"][:6]):
            x = 85 + i * 178
            draw.text((x - 25, 552), condition["name"][:17], font=font(15), fill="#475569")
            seeds: dict[int, list[float]] = {}
            for cell in cells:
                if (
                    cell["condition_key"] == condition["key"]
                    and cell["metrics"].get(primary) is not None
                ):
                    seeds.setdefault(cell["seed"], []).append(cell["metrics"][primary])
            for j, points in enumerate(seeds.values()):
                y = 522 - (sum(points) / len(points) - low) / max(high - low, 0.001) * 115
                offset = (j % 5 - 2) * 9
                draw.ellipse((x + offset - 4, y - 4, x + offset + 4, y + 4), fill=colors[i])
    draw.text(
        (52, 594), "Controlled, replayable experiments on AI agents.", font=font(17), fill="#475569"
    )
    output = BytesIO()
    canvas.save(output, format="PNG", optimize=True)
    return output.getvalue()
