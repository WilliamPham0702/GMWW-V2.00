# GMWW GP2 — candidate artwork v1, 2026-10-22

**State: QA BLOCKED — DO NOT DEPLOY.** Production and approved background files remain unchanged.

## Candidate output (external review package in ChatGPT session, not uploaded to this GitHub branch)
- `gmww-gp2-day-candidate-v1.webp` — 864×1536; SHA-256 `8261161479fca935a920385aa039b64616dccdcf46bf866c67f83523f9a37a94`
- `gmww-gp2-night-candidate-v1.webp` — 864×1536; SHA-256 `d0723956e3035091c7eb0e27951ca97e2cddd10d82265ff9eb34e0c73d23f25d`
- Standalone scenes have no HTML, character art, user labels, game UI, or controls.
- Day/night images use matching framing and independently painted night lighting. They are generated test assets, not user-approved master artwork.

## Concrete QA outcome
The **30-seat picture overlay** exposed that outer columns and rear/near rows intersect cottages, stalls, fences, and landscaping. The current engine's `GP2.fire=(50,64)` also **does not match** the painted candidate's approximate fire anchor `(52,53.9)`. It would be wrong to claim GM control is correctly anchored if these were published now.

Therefore the assets are **not enabled in CSS**, and no app, Worker, IPA or Player Web production data is changed. The branch must not merge in this state.

## Required remediation before art approval and integration
1. Increase traversable paving or revise 30-seat layout while preserving original Character width/height, and ensure no Character overlaps scenery or another Character on small iPhones.
2. Bind scene-specific geometry in one shared coordinate contract: image aspect, fire anchor, walkable polygons, occlusion props, spawn and navigation, plus day/night same physical map.
3. Produce screenshot proof with 30 real Character sprites (not colored diagnostic boxes), and execute interactive tap/drag and route QA on iPhone + Player Web.
4. Verify proper Day/Night asset packaging into GM Server and Player Web, no popup preview in IPA, preserve published-custom backgrounds, keep rollback.
5. Run **all CI checks to SUCCESS**, then obtain explicit user acceptance of final artwork before Ready PR / merge / Production.

## QA caveat
A separate review package includes `GP2-Review-iPhone.html`, 30 numbered *diagnostic placeholders*, and a `scene-gp2-candidate.json` manifest for coordinate calibration. The numbered boxes are **not game sprites** and must not be portrayed as final 30-Character coverage.
