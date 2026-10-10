# Character V5.40 — Original GMWW artwork source recovered

Date: 2026-10-10. User requirement: **wear the original GMWW Skin, not a new replacement design**.

The original V4.17 conversation artifact **GMWW_Character_V417_HD_Artwork_Draft_4of8.zip** has been located and opened in the current working session. It contains real transparent RGBA PNG files at 1024 × 1536 px, with the following SHA-256 hashes independently checked against `assets/characters/v4/artwork-v416-manifest.json`:

| Character | View | SHA-256 | Available |
|---|---|---|---|
| Chàng Biển / character-01 | front | `fefe16599c584265e14354a4e6cd679dff375a1e10f219264561bb31860594f3` | YES |
| Chàng Biển / character-01 | right | `04427d846a8db6ea6cae3792e131d0287ef5993b7d93fa6ca7b14d3c05c15f15` | YES |
| Chàng Biển / character-01 | back | `9635b7db6a5a0ae143e47489962008224c5192e81802558db654814aa751245e` | YES |
| Nàng Biển / character-02 | front | `d5279fa1d42f740a76e7e8c4ab20d182714f5f05e638a29af667fa6f89bee7b1` | YES |

These exact 4 images were exported to a **standalone review ZIP with SHA-256 manifest and gallery**, available in the conversation artifact `GMWW_Original_Skin_V5_Reference.zip`. They have **not** been uploaded to GitHub/Cloudflare by this documentation PR. Do not infer binary asset availability from this Markdown file.

## Critical artistic correction

The original Chàng Biển is **navy blue hair, vivid blue-and-gold flower-pattern Hawaiian shirt, ivory shorts, flower/pearl accessories, sandals, and draped blue scarf**. Original Nàng Biển is **platinum blonde, straw sunhat with blue floral ribbons, pearl/blue-white dress**. V5.30 merely imports V4.14 palette tokens and is **NOT** equivalent to the approved detailed V4.17 artwork. A color-only adapter does not satisfy the user's skin request.

## Remaining tasks before real Skin is worn by V5.10 rig

1. Import **original binary artwork files** into the repository using a binary-capable channel, preserving SHA-256 and transparency. Do not substitute fabricated artwork.
2. Create missing Chàng Biển **left** view and Nàng Biển **left/right/back** views consistent with original artwork.
3. Create actual segmented 17-layer skin textures per view (hair_back, head, hair_front, torso, pelvis, left/right arms/hands, thighs/shins/feet), rig to V5.10 16-bone SkinnedMesh. The current 4 PNGs are *full-body flat artwork*, not 17 independent body-part textures.
4. Preview original skin vs 3D rig on iPhone, validate 9 actions, 8 directions, seated posture and 30 actors, then request owner approval.
5. Only after owner approval, implement a feature-flagged live-game switch with WebP fallback; do not modify existing rooms/IPA prematurely.

## Deployment state

Cloudflare run #38045787431 **FAILED** after first two Runtime Home assets due to a 404. PR #192 merged as commit `1d4714c3a725370babcff92d6036450cdda2d0ad` to log the precise failed artwork path; this does **not** fix the 404 itself. Do not claim V5.30 Production success without a successful new deploy and file checks.
