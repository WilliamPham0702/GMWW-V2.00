# GMWW V3.192 – Approved village Day/Night scene (staging)

> **Not deployed.** This branch records the exact approved-artwork handoff and the release gates. Production must continue using its existing assets until BOTH binary files and iPhone validations exist in Git.

## Images to add
| Asset path | Size | SHA-256 |
|---|---:|---|
| `assets/backgrounds/gmww-village-day-v3192.webp` | 239950 B | `69da3d24a13157e7b9e693a1ce8fc1d6e99c0f7534fc72004ab68d5a67031486` |
| `assets/backgrounds/gmww-village-night-v3192.webp` | 213608 B | `c4f7c4af586f3df60d523905692c97683fcb4dfa1cbbdf3be71c4f1dc17e26cb` |

Image dimensions: **941 × 1672 WebP**. The exact files are in the conversation handoff `GMWW_V3192_Lang_Ngay_Dem_30Seat_Review.zip`. Do not substitute previously generated images.

## Integration after image upload
1. Keep background separate from UI overlays; do not rasterize controls because Player Web/GM buttons must remain clickable.
2. Update Player Web's static day/night fallbacks in `assets/village/village-art.css` to these versioned local assets. Preserve `.custom-scene` priority and indexedDB/local-cache behavior.
3. Update GM's `server-game/current/style.css` battle-scene fallback only. Preserve user-published custom scenes and settings; avoid changing the unrelated home hero.
4. Ensure GM's locally packaged fallback URLs resolve through Worker assets or the OTA bundler; don't introduce network reload loops.
5. Preserve original Seat layout, Character assets/scale, gestures, room records, phase, and action HUD.
6. The shared coordinate contract is `GMWW_VILLAGE_LAYOUT.fire = {x:50,y:64}`. **Image fire artwork appears ~x50%, y62%**; calibrate fire-image anchors independently in GM for both frames and verify the overlay, don't move the global Seat center.
7. Run WebKit iPhone layout checks for 6, 12, 20, 30. Preserve the user's preference of a single 360° circle. **30 seats at unchanged current Character footprint may overlap on a narrow iPhone viewport**; do not falsely mark that scenario PASS without a real collision/zoom test.

## Release gates
- Exact SHA-256 binary check, both images readable.
- GM/Web same revision on Day/Night transition and browser reopen. No blue intermediate frame.
- iPhone WebKit and Player Web checks SUCCESS; room 30, Character, backup, and Worker CI SUCCESS.
- Release notes for runtime/server/Player Web changes.
- Production rollout only after all CI SUCCESS and deploy verification; keep rollback to the previous Worker version and original fallback images.

## Current blocker
The approved full-resolution image binaries have not yet been committed or published from this environment. Do not merge or deploy an incomplete image-only feature.
