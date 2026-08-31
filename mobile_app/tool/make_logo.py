"""Generate every launcher icon from the supplied brand logo.

The mark is no longer drawn here. `assets/brand/logo.png` is the Badaga
Matrimony medallion — supplied as artwork, cropped square to its gold ring and
cut out of the cream sheet it arrived on, so it can sit on any ground without
carrying a pale rectangle around with it.

Because the medallion is circular and self-contained it is used full bleed: at
48px a disc that fills the tile reads, where the same disc shrunk inside a
coloured square does not. The ground behind it is the ring's own blue, so a
launcher that masks to a circle, a squircle or a teardrop only ever cuts blue.

Run it from the `mobile_app` directory whenever the logo changes:

    python tool/make_logo.py

Requires Pillow. It rewrites the Android mipmaps, the iOS AppIcon set, the web
icons and `assets/brand/app-icon-512.png` in place, so `git diff --stat` after a
run tells you exactly which platforms moved.
"""

from __future__ import annotations

import json
import os

from PIL import Image, ImageChops, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ------------------------------- palette ---------------------------------
# Sampled from the medallion's own ring rather than invented, so the ground and
# the artwork cannot drift apart if the logo is ever re-cut.
BLUE = (0x00, 0x18, 0x54)

LOGO = os.path.join("assets", "brand", "logo.png")

# ------------------------------- drawing ---------------------------------
# How much of the tile the medallion covers. Full bleed on the square icons;
# on the adaptive foreground it is sized to fill the circle a launcher actually
# shows (72 of 108) rather than the smaller guaranteed-safe 66, since clipping a
# few pixels of outer rim costs nothing and a floating disc looks like a mistake.
FULL_BLEED = 0.995
ADAPTIVE_COVER = 76 / 108

# Everything is composed at this size and resampled down, so a 20 px iOS icon
# gets the same edge as the 1024 px one instead of a separately-aliased one.
SUPER = 1024

IOS = ("ios", "Runner", "Assets.xcassets", "AppIcon.appiconset")

# The corner radius of a legacy square launcher icon, as a fraction of the side.
CORNER = 0.22

# A maskable web icon is guaranteed only its middle 80%.
MASKABLE_INSET = 0.10


def logo(size: int) -> Image.Image:
    """The medallion, square and transparent outside its ring."""
    art = Image.open(os.path.join(ROOT, LOGO)).convert("RGBA")
    return art.resize((size, size), Image.LANCZOS)


def field(size: int) -> Image.Image:
    """The flat ring blue the medallion sits on."""
    return Image.new("RGBA", (size, size), BLUE + (255,))


def scene(size: int, cover: float = FULL_BLEED, ground: bool = True) -> Image.Image:
    """Ground plus medallion, centred."""
    base = field(size) if ground else Image.new("RGBA", (size, size), (0, 0, 0, 0))
    side = round(size * cover)
    mark = logo(side)
    base.paste(mark, ((size - side) // 2,) * 2, mark)
    return base


def cover_mark(size: int, cover: float) -> Image.Image:
    """The medallion alone at `cover` of the canvas, on transparency.

    Used for the adaptive foreground, which the launcher parallaxes over the
    background layer and then masks — so this must carry no ground of its own.
    """
    return scene(size, cover=cover, ground=False)


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
    # Multiply rather than replace: the medallion already carries its own alpha
    # and overwriting it would square off the artwork inside the corner mask.
    image.putalpha(ImageChops.multiply(image.split()[3], _mask(size, circle=shape == "round")))
    return image


def write(image: Image.Image, *parts: str, opaque: bool = False) -> None:
    path = os.path.join(ROOT, *parts)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if opaque:
        # An iOS app icon with an alpha channel is rejected at submission.
        flat = Image.new("RGB", image.size, BLUE)
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
        write(field(adaptive), *res, "ic_launcher_background.png")
        write(cover_mark(adaptive, ADAPTIVE_COVER), *res, "ic_launcher_foreground.png")

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
        # Ground to the edge, medallion inside the guaranteed-visible middle.
        maskable = field(size)
        maskable.alpha_composite(cover_mark(size, 1 - 2 * MASKABLE_INSET))
        write(maskable, "web", "icons", f"Icon-maskable-{size}.png")
    write(tile(16), "web", "favicon.png")


if __name__ == "__main__":
    main()
