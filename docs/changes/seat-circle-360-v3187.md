# GMWW — Seat Circle 360° (proposed, not released)

Status: **Awaiting CI + physical iPhone / Player Web acceptance. No production deploy.**

## Changes
- Use **one continuous 360-degree circle** centered on the GP2 bonfire for all room sizes 6–30.
- 2.5D perspective renders the physical circle as an ellipse; one ring, no internal tier or rectangular/diamond layout.
- Seat Mẫu presets are **6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30** (step 2).
- Seat IDs remain **1..N** within each room (never odd-number-only IDs). Rooms already storing an odd seatCount remain valid and display a circle.
- Existing room layouts saved as `circle`, `ellipse`, `diamond`, or `rectangle` use circular rendering without reassignment.
- The same `assets/village/village-layout.js` is imported by Cloudflare Worker / Player Web and bundled as `village-layout.js` into the GM IPA.
- Increase ring radius gradually as seatCount increases without changing Character size.
- Update GM Seat Mẫu panel hint and script cache keys to avoid old browser assets.

## Acceptance gates (not yet certified)
1. CI, Node tests, dry-run worker build must be SUCCESS.
2. Inspect 6, 8, 12, 18, 24, 30 with real Character models and role/name/Artifact/status labels on iPhone portrait and Player Web.
3. In particular, 24–30 seats must not lose touch targets or unreadably overlap; use an appropriate viewing solution before acceptance if needed.
4. Verify GM/Player Web seat-coordinate parity, bonfire GM anchor, empty seats, drag-swap, locked seating, offline fallback and unchanged room data.
5. Validate OTA SHA-256 / rollback compatibility and issue separate runtime notes before shipping.
6. Production merge/deploy only after user acceptance.
