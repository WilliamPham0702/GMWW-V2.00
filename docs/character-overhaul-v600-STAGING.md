# GMWW Character overhaul V6.00 — DRAFT STAGING

**Status:** NOT COMPLETE. No artwork/GLB accepted yet. Do **not** merge, deploy, or delete old assets.

## Owner scope
- 20 standard characters and **10 muscular characters** in the previously approved GMWW / Character Skin V5.83 art style, **30 total**.
- Preserve the accepted V5.10 16-bone rig and only the agreed core actions: Idle, Walk, Run, Result (celebrate); verify 8 directions.
- Replace all active game characters **and synchronize their avatars** only once the 30 new approved assets are ready.
- Remove legacy character selections from UI and runtime when new set is fully verified. Retain historic release assets for rollback/OTA and retain member identities/history; never delete player data.
- Stop at **draft PR** and request owner permission before updating main.

## Latest main examined
Base commit: `477820783503da6e71b58c2249d183c7e2cbe3f0` (GMWW V3.132).
Existing active inconsistencies found: Worker `GAME_CHARACTER_COUNT=20`; GM member picker `MEMBER_CHARACTER_COUNT=42`; village renderer hashes game IDs back into 20. Existing graphical assets are 42 legacy chibi WebP files, 20 legacy animated walk frames, and the separate Character V5.10 rig. These are NOT the requested new skin assets.

## Deliverables, release gates
1. **ART**: 30 independently inspectable character artwork masters: 20 regular and 10 muscular, user-approved quality, correct GMWW theme. No collage, generic infographics, reused legacy chibi, or upscaled thumbnail substituted.
2. **SKIN**: 30 complete skinned GLB bodies matched to the unchanged V5.10 skeleton, with non-placeholder UV textures. 8-view review sheets showing genuine side and rear details.
3. **ANIMATION**: apply four approved movements on each model with no clipping or ripped vertices.
4. **RUNTIME**: replace game character endpoints, GM picker, Player Web village and profile avatar, and iPhone app display; one canonical 30-record manifest. Add 31..42 legacy-ID compatibility remap without touching member data.
5. **QA**: verify 30 asset SHA256s, GLB skeleton joint names and weights, load/render 8 views x 4 actions, cross-platform smoke, OTA version synchronization, required CI all passing and independent iPhone acceptance.
6. **MAIN GATE**: provide preview URL and evidence; wait for explicit owner approval to merge/deploy.

This PR contains only the inactive roster schema, design direction, legacy slot mapping, and tests. **DO NOT present this PR as finished.** All image/GLB authoring and live integration are outstanding.
