from pathlib import Path
import json
import re
import shutil
import sys

root = Path(__file__).resolve().parents[1]
src = root / "prototype/character40"
out = root / "assets/characters/gmww40"
gm = root / "server-game/current/gmww-shared-motion.js"
player = out / "runtime.js"
verify = "--verify" in sys.argv

catalog = json.loads((src / "catalog.json").read_text(encoding="utf-8"))
data = json.dumps({c["id"]: c for c in catalog["characters"]}, separators=(",", ":"))
pattern = re.compile(r"(?m)^const CATALOG=.*;$")
variants = {}
for path, required in (
    (player, ("syncMotionLoop", "hasActiveMotion")),
    (gm, ("GMWW_PERFORMANCE", "_gmwwLowPower")),
):
    # The optimized Player Web and GM controllers intentionally differ.
    # Never regenerate either from the unoptimized legacy shared adapter.
    current = path.read_text(encoding="utf-8")
    if any(marker not in current for marker in required):
        raise RuntimeError(f"Renderer safeguards missing from {path}")
    updated, n = pattern.subn(lambda _: "const CATALOG=" + data + ";", current)
    if n != 1 or "GMWW_SHARED_MOTION=Object.freeze" not in updated:
        raise RuntimeError(f"Cannot safely update Character-40 catalog in {path}")
    variants[path] = (current, updated)

if variants[player][0] == variants[gm][0]:
    raise RuntimeError("GM and Player Web renderer variants must remain independently optimized")

if verify:
    for path, (current, updated) in variants.items():
        if current != updated:
            raise RuntimeError(f"Catalog in {path} differs from reviewed source; regenerate and review")
    print("PASS: independently optimized Character-40 renderers and catalog preserved")
    sys.exit(0)

out.mkdir(parents=True, exist_ok=True)
for folder in ("originals", "atlases"):
    shutil.copytree(src / folder, out / folder, dirs_exist_ok=True)
(out / "catalog.json").write_text(json.dumps(catalog, separators=(",", ":")), encoding="utf-8")
for path, (_, updated) in variants.items():
    path.write_text(updated, encoding="utf-8")
print("Updated Character-40 catalog without overwriting optimized renderer adapters")
