# Character 21 V6.05 — 8-direction skinned mesh tech prototype (not approved)

Owner approved **8 view artworks in V6.04**, not the skin/animations; V6.02 was rejected on a real iPhone, V6.03 failed side views.

## V6.05 created locally (not deployed)
- Eight separately alpha-matted, V6.04-approved directional textures: one WebP atlas 1920×1260, original individual direction cutouts. NOT a volumetric 360° model: one direction-selectable camera-facing skinned 2.5D mesh with eight independent index ranges, no yaw rotation of the flat front image.
- GLB with the unchanged V5.10 **16-joint names/order/inverse bind matrices**, unchanged 4 animation clips (`Idle`, `Walk`, `Run`, `Result`), alpha-masked texture and direction metadata. 18,920 vertices, 36,288 triangles in 8 directional surfaces, 1,968,828 bytes compressed. Compact GLB SHA-256 `0afe6ec92d6f3aa483234a148cca33603b97702fd528a0cd4dd81a087219b378`.
- HTML self-contained with downloadable GLB and controls for 8 directions, 4 real clip samplers, auto-rotation, frame diagnostic and fallback image if WebGL fails. No game-data access.
- Structural validation PASS: valid glTF2 header/buffer lengths, eight contiguous index ranges, 16 unchanged joints, exactly 4 named animation clips, normalized vertex weights; trimesh loader reads the GLB.

## Still BLOCKED
- Chromium test environment has WebGL unavailable, so only visual fallback / directions buttons + HTML syntax were tested. No evidence of live WebGL 4-animation rendering on iPhone; **DO NOT CLAIM ANIMATION PASS**.
- Preview worker NOT updated with V6.05 GLB/HTML. The binary is an isolated local artifact only, not present in this PR. A separate safe deployment and physical device test are required.
- The directional planes are skinned billboard geometry, **not** high-quality volumetric sculpture. User must explicitly accept the motion effect before 22–30 can be retargeted.
- Main `gmww-v2-00` Production, Player Web, IPA, OTA assets and old character data remain unchanged. No 22–30 changes or main approval.

## Release gate
Only after actual 8-view skin and 4 animations run on GPU, owner accepts test, binary sources are committed with hashes, and GM/Player Web + IPA/OTA regression all pass, promote to main with owner permission. Until then `readyForMain=false`.
