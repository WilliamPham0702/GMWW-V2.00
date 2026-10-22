# GMWW — Night rule & audio correction (proposed V3.181)

Status: **feature branch / pending CI and iPhone GM acceptance**. No Production deployment, runtime, IPA or saved room data changed by this branch.

## Changes
- Restore confirmed private scan results to GM for **Tiên Tri**, **Tiên Tri Hào Quang** and **Nhà Tinh Thần Học**. Actual chosen targets are sent in `revealTargetIds`; previously the server intersected them with the actor-only confirmation target.
- Tiên Tri Hào Quang reads a target's **functions**, not its identity/role. Display and spoken result use function descriptions.
- Apply `nightImmune` from **private assigned role card**, not public assignment summary. Direct/transferred Sói Cắn and Phù Thủy kill potion do not kill an immune target; actions remain consumed. Explicit `false` on custom cards overrides legacy role defaults.
- Repair Old Witch bundled-audio availability detection; preserve user-uploaded audio mappings/IDs and handle WebKit playback fallback and callbacks.
- Dawn audio uses discrete ordered parts: `audio_system_morning_deaths_intro` + `audio_system_morning_number_N` + `audio_system_morning_dead_noun`. Missing uploaded parts speak via vi-VN speech synthesis where available.

## Test matrix / acceptance
1. Seer checks normal Wolf, Alpha Wolf, Village member: result popup and result audio in GM; none of this private information on Player Web.
2. Aura Seer checks role with multiple functions and no active functions; GM display/audio announce *functions*, not name/role ID.
3. Spiritualist checks same/different factions; GM popup and audio deliver results.
4. Direct Wolf attack, transferred Wolf bite, Witch kill potion on `nightImmune:true`: target survives; control `nightImmune:false` still dies. Role flags from player assignment, not mocked UI.
5. Play Old Witch wake cue repeatedly; confirm bundled clip and any uploaded file override on iPhone.
6. Dawn with 1, 2, 5 and >5 deaths: three audios in correct order without overlap. Reopening village history should not replay audio unexpectedly.
7. Check all Library audio entries; records whose uploaded file is missing cannot be reconstructed by source code and require a new GM upload. Test GM iPhone/WKWebView + Player Web, including mute and background/resume.
8. Verify full repository CI, security of private assignments, no existing match reset, and rollback.

## Release gate
Open PR and run CI. **Merge/deploy only after all required checks SUCCESS and explicit owner acceptance.**
