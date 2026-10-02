# GMWW V2 — Village art direction (approved concept, 2026-10-02)

The approved visual reference is the generated Vietnamese daytime/nighttime collage from the user's conversation. The exact look must be reproduced with **separate original production layers**, NOT a flattened screenshot used as a real interactive game. A screenshot-only click demo may be used for visual review and must be labelled as such.

## Approved style
- Bright premium anime/chibi fantasy village with coastal scenery; central circular stone plaza and glowing campfire; warm saturated daylight, blue moonlit night with amber window lights.
- Chibi characters seated around the fire, small name/unique seat badges, optional microphone indicators only during day; **no public role-revealing outfit/status** unless public by game rule.
- Dark navy translucent fantasy UI, subtle gold trim, turquoise cyan highlights, large readable Vietnamese labels, clear touch targets.
- Day: simultaneous voice and public text chat, phase clock, player list, vote panel. Night: voice entirely off; private text chat only for server-authorized wake groups; legal role action overlays; sleepers see waiting only.
- Preserve the same village geometry between day and night to avoid avatar jumping.

## Production asset manifest (pending)
| Asset | Target | Status |
| --- | --- | --- |
| village-day background (no baked UI/avatars/text) | 2048x1152 or larger, WebP | pending |
| village-night background matching geometry | 2048x1152 or larger, WebP | pending |
| plaza/campfire animation layers | alpha WebP/PNG spritesheet | pending |
| house, windows, lantern glow, clouds, moon, foliage | independent layers | pending |
| 30-account avatar mapping, fallback portraits | id-based, authorized catalog | pending |
| UI 9-slice frames, buttons, icon atlas | scalable vector/texture | pending |
| responsive layout + 30-player overlap/zoom testing | iPhone and Android | pending |
| accessibility, reduced motion, battery/performance | real device | pending |

## Implementation gates
1. Generate isolated clean layers; do not crop screenshots containing text or characters as production backgrounds.
2. Optimize artwork and keep attribution/source mapping; use consistent color grading and visual regression against the approved concept.
3. Renderer decision after device benchmarks: DOM/CSS prototype exists; PixiJS optional and not yet integrated.
4. Build against the latest GitHub main in an isolated branch; no live Worker or IPA changes until approval.
5. Gameplay/role/Artifact logic is out of scope for this art task and being handled in parallel.
