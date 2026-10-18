# GMWW V6.01 — Approved outfits 21–30, preview technical retarget

**Owner-approved scope:** Visual costume designs 21–30 only, accepted after the "trang phục bị cắt xén" correction. Do not interpret this as approval of 3D/GLB skins, motion, or main deployment.

**Local technical artifact produced for review, not yet in this PR:** 10 individual PNGs, 10 matching 512x512 RGBA avatar WEBPs, and 10 GLBs with the `V5.83` unchanged skinned geometry and `V5.10` 16-joint order, each retaining `Idle/Walk/Run/Result` clips and animation bytes. A local PNG/model checksum audit passed; actual WebGL iPhone behavior has NOT been verified. GLB rear and side textures are inferred from the front; visible geometry may not match approved rear art. Source image crops are lower resolution and include companions/effects; no false quality claim.

**Critical staging limitation:** The actual generated binary assets are not committed in the repository; they are in the provided technical ZIP. The live `/api/game-characters` endpoints, Player Web and GM server still use the historical 42/20 character assets. Deployment is intentionally blocked.

**Next gates**: upload and checksum 90 complete art/avatar/GLB files from actual assets into this branch; visually inspect clipping for all 30 in GM/Player Web; verify GPU 8 directions × 4 actions per character, no tearing; iPhone/IPA regression; only then ask the owner for a separate main merge/deploy approval.

**Production:** unchanged. **Draft PR:** #306. **Latest base synchronized:** main V3.137.
