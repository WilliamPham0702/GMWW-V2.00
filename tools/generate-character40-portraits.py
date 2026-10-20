#!/usr/bin/env python3
"""Build the exact idle sprites for all 40 Player Web avatar thumbnails.

The chosen profile image must depict the same atlas actor used by the village.
This script changes no original art, atlas, motion metadata or saved identity.
"""
import argparse
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets" / "characters" / "gmww40"
FRAME_INDEX = 8  # First Idle frame in the 48-frame engine, see runtime.js.


def build_and_verify():
    catalog = json.loads((ASSETS / "catalog.json").read_text(encoding="utf-8"))
    rows = catalog.get("characters")
    if not isinstance(rows, list) or len(rows) != 40:
        raise RuntimeError("Character catalog must contain exactly 40 rows")

    output = ASSETS / "portraits"
    output.mkdir(parents=True, exist_ok=True)
    expected = set()
    total_bytes = 0

    for index, row in enumerate(rows, 1):
        ident = f"character-{index:02d}"
        if row.get("id") != ident or len(row.get("frames") or []) != 48:
            raise RuntimeError(f"Invalid character ID / frame count at {ident}")
        expected.add(ident + ".webp")
        frame = row["frames"][FRAME_INDEX]
        if not (isinstance(frame, list) and len(frame) == 4):
            raise RuntimeError(f"Invalid Idle frame for {ident}")
        x, y, width, height = frame
        if not all(isinstance(v, int) for v in frame) or width <= 0 or height <= 0:
            raise RuntimeError(f"Invalid atlas crop rectangle for {ident}")

        atlas_path = ASSETS / row["atlas"]
        with Image.open(atlas_path) as atlas:
            atlas_rgba = atlas.convert("RGBA")
        if x < 0 or y < 0 or x + width > atlas_rgba.width or y + height > atlas_rgba.height:
            raise RuntimeError(f"Crop outside atlas for {ident}")

        exact_frame = atlas_rgba.crop((x, y, x + width, y + height))
        visible_bbox = exact_frame.getchannel("A").getbbox()
        if visible_bbox is None:
            raise RuntimeError(f"Avatar crop empty for {ident}")

        # The atlas frame has variable transparent margins and is drawn
        # bottom-aligned in the live village. UI thumbnail needs the actual
        # visible actor CENTERED, not its unequal atlas cell margins.
        actor = exact_frame.crop(visible_bbox)
        aw, ah = actor.size
        if aw > 256 or ah > 256:
            raise RuntimeError(f"Character exceeds safe centered thumbnail: {ident} {actor.size}")
        icon = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
        icon.paste(actor, ((256 - aw) // 2, (256 - ah) // 2))
        if icon.getpixel((0, 0))[3] != 0 or icon.getpixel((255, 255))[3] != 0:
            raise RuntimeError(f"Transparent portrait corners required for {ident}")
        bounds = icon.getchannel("A").getbbox()
        if bounds is None or abs(bounds[0] + bounds[2] - 256) > 1 or abs(bounds[1] + bounds[3] - 256) > 1:
            raise RuntimeError(f"Avatar must be visually centered: {ident}")

        target = output / (ident + ".webp")
        icon.save(target, "WEBP", lossless=True, method=5, exact=True)
        with Image.open(target) as saved:
            saved_rgba = saved.convert("RGBA")
        if saved_rgba.size != icon.size or saved_rgba.tobytes() != icon.tobytes():
            raise RuntimeError(f"Avatar pixels differ from atlas-derived Idle frame for {ident}")
        total_bytes += target.stat().st_size

    generated = {item.name for item in output.glob("character-*.webp")}
    if generated != expected:
        raise RuntimeError(f"Wrong avatar preview inventory: extra={generated-expected}, missing={expected-generated}")

    print(f"PASS: 40 lossless avatar portraits exactly match atlas Idle frame {FRAME_INDEX}; "
          f"total bytes: {total_bytes}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--verify", action="store_true",
                        help="Verify decoded pixel equality and the complete file inventory")
    parser.parse_args()
    build_and_verify()
