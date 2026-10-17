# GMWW Character V5.70 — Hybrid-final / one iPhone preview

Status: **WORK IN PROGRESS — NOT DEPLOYED / NOT PRODUCTION SKIN**.

## Source of truth
Approved full-body Ocean Boy illustration, created in this ChatGPT conversation (transparent PNG, 1086×1448). It has been preserved as an image asset in the connected design workspace, but **the original image bytes are not yet committed to this repository**. Any renderer missing the actual approved pixels must fail validation rather than claim faithful full skin.

## Non-negotiable contract
- Exactly ONE HTML preview and ONE unified character, **not** alternatives A/B/C/D.
- Keep the already working 16-bone `V510_BONES` rig untouched.
- Only Idle, Walk, Run, Result; eight directions. Legacy animation APIs remain compatible with older game versions.
- Isolated read-only Cloudflare Character Preview Worker. No Player Web, IPA, rooms, main Production or OTA integration until the GM accepts actual iPhone screenshots/video.
- The user specifically rejected procedural spheres as the primary character skin and static screenshots posing as WebGL.

## Combined renderer construction
1. **2.5D art-bearing layers:** accurately extracted reference pixels on curved/deformable meshes for facial expressions, bangs, flower, jewelry, pearl strings, coat trim. No full-body billboard or simply splitting screenshot into independent rectangular moving pieces.
2. **Art-authored clothing meshes + UV:** shirt, sleeves, shorts, shoes, trims and accessories get tailor-shaped topology, non-overlapping UV, true source pixels where visible and skinned blending across shoulders, elbows, pelvis and knees.
3. **Whole 3D base body:** unified head/neck/torso/limb proportions under the clothing and the shared 16-bone rig, anatomically aligned garment openings, bind-pose integrity. V5.63's procedural sphere costume must not be called approved skin.
4. **Eight-view corrections:** direction-aware order/visibility of hair and decor and pose-space corrective offsets that remain plausible at oblique and rear views; unsupported sides/back flagged as inferred, not approved artwork.

## QA / acceptance gates
- Render original-front reference alongside a *live, animated* front WebGL frame for inspection (reference image is NOT the animated model).
- Screenshot comparisons at eight angles with saved artifacts.
- On actual iPhone: all four controls respond; FPS shown; no transparent missing texture, flat dummy planes, separated arms, texture stretching, seam tearing, z-fighting or dangling jewelry clipping.
- Assert all skinned mesh vertices have normalized weights and valid indexes [0,15]; actual source image hash must be in test fixtures; zero fallback to synthetic art when source missing.
- Verify independent HTML + module bundle + all texture bytes SHA-256 after deploy.
- Report clearly **NOT PRODUCTION SKIN** while side/back reference is missing.
- Keep PR unmerged until build gates and human visual QA succeed.

## Work sequencing (one deliverable, not four previews)
1. Import exact approved PNG into repo (lossless source plus optimized runtime texture).
2. Make silhouette-aligned UV-geometry by garment/face/hair regions; derive front colors from approved art.
3. Bind all parts to existing 16 bones with 2.5D/3D hybrid and eight view corrections.
4. Create the ONE `test-skin-v570.html` entry using existing Safari bundling and independent Worker.
5. Validate rendered frames/CI then deploy ONLY the isolated Character Preview.
6. Wait for GM visual approval before any live-game integration.

## Accuracy disclosure
A front-only illustration cannot determine hidden geometry/materials. Even a refined live 3D model cannot honestly be promised 100% exact at all eight directions without side/back references.
