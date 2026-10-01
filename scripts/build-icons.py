"""
Regenerate the Chiliad icon set in public/ from the master brand mark.

The master mark lives at assets/chiliad-logo.jpg and is the single source of
truth for every icon the app ships: the sidebar/tab brand mark, the Apple touch
icon, the PWA raster sizes, and the multi-size .ico.

This is a deliberately *optional*, developer-run script rather than a build
step. Icons are committed assets, like favicons are in most projects: a build
that regenerates them would need a working image toolchain on every clean
clone and every CI run, and would silently overwrite hand-placed brand assets.
Run `npm run icons` after changing the master mark.

Requires Pillow: `pip install pillow`
"""

from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover - developer feedback only
    raise SystemExit(
        "Pillow is required to regenerate icons.\n"
        "Install it with:  pip install pillow\n"
        "The generated icons are committed, so this is only needed when the "
        "master mark at assets/chiliad-logo.jpg changes."
    )

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
SOURCE = ROOT / "assets" / "chiliad-logo.jpg"
PUBLIC = ROOT / "public"

# Resampling filter chosen for downscaling: Lanczos keeps the mark's edges clean
# at 16px, where a nearest-neighbour reduction visibly aliases.
RESAMPLE = Image.LANCZOS


def emit(name: str, size: int) -> Image.Image:
    """Write one square PNG of the given size and return it for reuse."""
    image = master.convert("RGBA").resize((size, size), RESAMPLE)
    path = PUBLIC / name
    image.save(path, "PNG", optimize=True)
    print(f"wrote public/{name} ({path.stat().st_size} bytes, {size}x{size})")
    return image


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"Master mark not found: {SOURCE}")

    PUBLIC.mkdir(parents=True, exist_ok=True)

    global master
    master = Image.open(SOURCE)
    # Flatten onto white so the JPEG's chroma subsampling cannot leave a dark
    # halo when it is written out as PNG.
    master = Image.alpha_composite(
        Image.new("RGBA", master.size, (255, 255, 255, 255)), master.convert("RGBA")
    )

    # Sidebar and browser tab. The largest square doubles as the source for the
    # ICO so a tab icon and the touch icon are the same artwork.
    brand = emit("chiliad-logo.png", 512)

    # Apple masks the touch icon to a rounded square, so the mark is inset.
    padded = brand.copy()
    inset = int(512 * 0.06)
    padded.paste((0, 0, 0, 0), (0, 0, 512, 512))
    padded = Image.alpha_composite(
        Image.new("RGBA", (512, 512), (0, 0, 0, 0)),
        _inset(brand, inset),
    )
    padded.resize((180, 180), RESAMPLE).save(PUBLIC / "apple-touch-icon.png", "PNG", optimize=True)
    print(f"wrote public/apple-touch-icon.png ({(PUBLIC / 'apple-touch-icon.png').stat().st_size} bytes, 180x180)")

    for size in (192, 512):
        emit(f"pwa-{size}x{size}.png", size)

    # A multi-size .ico: PNG-compressed entries, which every browser and every
    # Windows since Vista reads.
    brand.save(
        PUBLIC / "favicon.ico",
        "ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
    )
    print(f"wrote public/favicon.ico ({(PUBLIC / 'favicon.ico').stat().st_size} bytes, 16/32/48)")


def _inset(image: Image.Image, amount: int) -> Image.Image:
    """Place `image` on a transparent canvas, inset by `amount` per side."""
    canvas = Image.new("RGBA", image.size, (0, 0, 0, 0))
    canvas.paste(image, (amount, amount))
    return canvas


if __name__ == "__main__":
    main()
