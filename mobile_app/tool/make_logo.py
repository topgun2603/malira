"""Generate every launcher icon from the palette tokens.

The drawing is the same one `lib/src/ui/common/app_logo.dart` paints at runtime:
a navy-to-hill-blue field with a nameplate on it — a saffron rule, a heavy N,
a cream rule — the way a broadsheet rules off its masthead.

It used to be a landscape: ridgelines under a low sun. That is the exact recipe
for the Material `image` glyph, and on a home screen it read as a photo
gallery rather than as this newspaper. A horizon is what does it, so there is
no horizon here. The constants below are copied from `_LogoPainter`, and the
colours from `lib/src/core/theme/palette.dart` — which are themselves the sRGB
conversions of the OKLCH tokens in `web-admin/src/app/globals.css`. Nothing
here invents a colour.

Run it from the `mobile_app` directory after any palette change:

    python tool/make_logo.py

Requires Pillow. It rewrites the Android mipmaps, the iOS AppIcon set, the web
icons and `assets/brand/app-icon-512.png` in place, so `git diff --stat` after a
run tells you exactly which platforms moved.
"""

from __future__ import annotations

import json
import os

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ------------------------------- palette ---------------------------------
# Palette.lightRail, Palette.lightNews, Palette.lightSaffron.
RAIL = (0x13, 0x25, 0x3F)
NEWS = (0x14, 0x58, 0x92)
SAFFRON = (0xDD, 0x87, 0x2B)
# Palette.lightBackground — the paper the desk prints on.
CREAM = (0xFA, 0xF8, 0xF2)

# ------------------------------- drawing ---------------------------------
# Identical to _LogoPainter in app_logo.dart. Every value is a fraction of the
# icon's side, so one set of numbers serves 16px and 1024px alike.
#
# centre-y, thickness, colour. Equal weights: at 48px an unequal pair reads as
# one rule and a smudge.
RULES = (
    (0.245, 0.048, SAFFRON),
    (0.755, 0.048, CREAM),
)
RULE_HALF_WIDTH = 0.30

# The N, measured by its ink box rather than its em box — a cap-height letter
# sits low in its em, and centring the em would hang it below the rules.
GLYPH = "N"
GLYPH_HEIGHT = 0.42
GLYPH_CENTRE = 0.50
FONT = os.path.join("assets", "fonts", "Geist-Bold.ttf")

# Everything is rendered at this size and resampled down, so a 20 px iOS icon
# gets the same curve as the 1024 px one instead of a separately-aliased one.
SUPER = 1024

IOS = ("ios", "Runner", "Assets.xcassets", "AppIcon.appiconset")

# The corner radius of a legacy square launcher icon, as a fraction of the side.
# Matches `AppLogo`'s ClipRRect, which uses size * 0.22.
CORNER = 0.22

# Adaptive icons are 108dp with only the middle 66dp guaranteed visible; a
# launcher may mask to a circle and parallax the layers apart. 21/108 each side.
SAFE_INSET = 21 / 108

# A maskable web icon is guaranteed only its middle 80%.
MASKABLE_INSET = 0.10


def _lerp(a, b, t):
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def field(size: int) -> Image.Image:
    """The navy-to-blue ground, top-left to bottom-right."""
    image = Image.new("RGB", (size, size))
    pixels = image.load()
    span = 2 * (size - 1)
    row_cache = {}
    for y in range(size):
        for x in range(size):
            t = (x + y) / span
            key = round(t * 2048)
            colour = row_cache.get(key)
            if colour is None:
                colour = row_cache[key] = _lerp(RAIL, NEWS, key / 2048)
            pixels[x, y] = colour
    return image


def mark(size: int) -> Image.Image:
    """The nameplate — two rules and the N — on transparency."""
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)

    for centre, thickness, colour in RULES:
        half = thickness * size / 2
        draw.rounded_rectangle(
            (
                size * (0.5 - RULE_HALF_WIDTH),
                centre * size - half,
                size * (0.5 + RULE_HALF_WIDTH),
                centre * size + half,
            ),
            # Fully rounded ends. A square-cut rule at 48px picks up a stair-step
            # on the corners that a round one does not.
            radius=half,
            fill=colour + (255,),
        )

    path = os.path.join(ROOT, FONT)
    # Size the face so the letter's *ink* is GLYPH_HEIGHT tall, whatever the
    # font's internal metrics happen to be.
    probe = ImageFont.truetype(path, 400)
    box = probe.getbbox(GLYPH)
    font = ImageFont.truetype(path, round(400 * (GLYPH_HEIGHT * size) / (box[3] - box[1])))

    box = font.getbbox(GLYPH)
    width, height = box[2] - box[0], box[3] - box[1]
    draw.text(
        (size / 2 - width / 2 - box[0], GLYPH_CENTRE * size - height / 2 - box[1]),
        GLYPH,
        font=font,
        fill=CREAM + (255,),
    )

    return layer


def scene(size: int) -> Image.Image:
    """The full-bleed icon: field, then the nameplate on top of it."""
    base = field(size).convert("RGBA")
    return Image.alpha_composite(base, mark(size))


def inset_mark(size: int, inset: float) -> Image.Image:
    """The mark alone, scaled into the centre of a transparent canvas."""
    side = round(size * (1 - 2 * inset))
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    layer.paste(mark(SUPER).resize((side, side), Image.LANCZOS), (round(size * inset),) * 2)
    return layer


def _mask(size: int, circle: bool) -> Image.Image:
    mask = Image.new("L", (SUPER, SUPER), 0)
    draw = ImageDraw.Draw(mask)
    if circle:
        draw.ellipse((0, 0, SUPER - 1, SUPER - 1), fill=255)
    else:
        draw.rounded_rectangle((0, 0, SUPER - 1, SUPER - 1), radius=SUPER * CORNER, fill=255)
    return mask.resize((size, size), Image.LANCZOS)


def tile(size: int, shape: str = "rounded") -> Image.Image:
    """A full-bleed icon at `size`, cornered as `shape` asks."""
    image = scene(SUPER).resize((size, size), Image.LANCZOS)
    if shape == "square":
        return image
    image.putalpha(_mask(size, circle=shape == "round"))
    return image


def write(image: Image.Image, *parts: str, opaque: bool = False) -> None:
    path = os.path.join(ROOT, *parts)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if opaque:
        # An iOS app icon with an alpha channel is rejected at submission.
        flat = Image.new("RGB", image.size, RAIL)
        flat.paste(image, mask=image.split()[3] if image.mode == "RGBA" else None)
        image = flat
    image.save(path)
    print(f"  {os.path.relpath(path, ROOT).replace(os.sep, '/'):<64} {image.size[0]}px")


def main() -> None:
    print("assets")
    write(tile(512), "assets", "brand", "app-icon-512.png")

    print("android")
    # 48dp legacy icon, 108dp adaptive layers, at each density bucket.
    for bucket, dp in (("mdpi", 1), ("hdpi", 1.5), ("xhdpi", 2), ("xxhdpi", 3), ("xxxhdpi", 4)):
        res = ("android", "app", "src", "main", "res", f"mipmap-{bucket}")
        legacy, adaptive = round(48 * dp), round(108 * dp)
        write(tile(legacy), *res, "ic_launcher.png")
        write(tile(legacy, "round"), *res, "ic_launcher_round.png")
        write(field(adaptive).convert("RGBA"), *res, "ic_launcher_background.png")
        write(inset_mark(adaptive, SAFE_INSET), *res, "ic_launcher_foreground.png")

    print("ios")
    with open(os.path.join(ROOT, *IOS, "Contents.json"), encoding="utf-8") as handle:
        contents = json.load(handle)
    # The same filename appears under both idioms; render each one once.
    for name in sorted({entry["filename"] for entry in contents["images"]}):
        points, scale = name.removeprefix("Icon-App-").removesuffix(".png").split("@")
        size = round(float(points.split("x")[0]) * int(scale.rstrip("x")))
        # Square: iOS applies its own superellipse mask.
        write(tile(size, "square"), *IOS, name, opaque=True)

    print("web")
    write(tile(192), "web", "icons", "Icon-192.png")
    write(tile(512), "web", "icons", "Icon-512.png")
    for size in (192, 512):
        # Full-bleed ground, mark pulled into the guaranteed-visible middle.
        maskable = field(size).convert("RGBA")
        maskable.alpha_composite(inset_mark(size, MASKABLE_INSET))
        write(maskable, "web", "icons", f"Icon-maskable-{size}.png")
    write(tile(16), "web", "favicon.png")


if __name__ == "__main__":
    main()
