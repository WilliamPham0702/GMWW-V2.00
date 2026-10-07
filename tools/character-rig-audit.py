#!/usr/bin/env python3
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
IDS = ("01","02","03")

def audit(cid: str):
    path = ROOT / "assets" / "characters" / "walk-v263" / f"character-{cid}" / "frame-01.webp"
    if not path.exists():
        raise SystemExit(f"MISSING_ASSET:{path}")
    with Image.open(path) as src:
        im = src.convert("RGBA")
        w, h = im.size
        alpha = im.getchannel("A")
        bbox = alpha.getbbox()
        if not bbox:
            raise SystemExit(f"EMPTY_ALPHA:character-{cid}")
        x0,y0,x1,y1 = bbox
        bw,bh = x1-x0,y1-y0
        visible = sum(1 for a in alpha.getdata() if a > 12)
        coverage = visible / float(w*h)
        metrics = {
            "id": f"character-{cid}",
            "width": w,
            "height": h,
            "bbox": [x0,y0,x1,y1],
            "bboxNorm": [round(x0/w,4),round(y0/h,4),round(x1/w,4),round(y1/h,4)],
            "visibleWidthRatio": round(bw/w,4),
            "visibleHeightRatio": round(bh/h,4),
            "centerX": round(((x0+x1)/2)/w,4),
            "coverage": round(coverage,4),
        }
        if bh/h < 0.45:
            raise SystemExit(f"CHARACTER_TOO_SHORT:{cid}:{bh/h:.3f}")
        if bw/w < 0.12:
            raise SystemExit(f"CHARACTER_TOO_NARROW:{cid}:{bw/w:.3f}")
        return metrics

rows=[audit(cid) for cid in IDS]
print("CHARACTER_RIG_AUDIT="+json.dumps(rows,separators=(",",":")))
