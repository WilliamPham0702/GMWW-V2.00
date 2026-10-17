# GMWW FAST G4.3 — Wolf / Guard / Fairy effect resolution

## Previously observed
GM confirmed wolf bites, Guard protection and Fairy transfers as `effect_notice` interactions. The real Durable Object recorded those notices, but its morning transition did not turn unprotected wolf bites into persistent `dead` state.

## Changes
- Resolve only confirmed events for the current match/night on the real `RoomDurableObject.applyCycle(...,"morning",...)` path.
- The Fairy moves a bite one occupied seat to the left or right, wrapping around the seating circle. A Guard protection on the **final target** blocks the bite, even when the original target was also protected.
- Fairy without any wolf bite has no effect; Guard does not block witch or other death causes. Duplicate morning calls cannot kill the same target twice.
- If the Fairy requested a transfer but positions are missing or duplicated, return `wolfResolution.error=SEAT_ORDER_UNAVAILABLE` and never invent a victim.
- Preserve `interactions` storage key, old game/role data, Native shell, Artwork, Runtime assets, and current SPA behavior.

## TDD
- RED pure tests `d16eed77ff7befdf6735bd05404efe3786b35e67`: 943 old tests passed, expected missing module failure.
- GREEN pure resolver `ba87f3bcbbcb4400dd2c35cf31d40a5bb028ca2f`: Worker CI success.
- RED real DO transition `6a8a01fa9fb4fe720de98a8025edeea0191218af`: 956 tests passed, two correctly failed due to missing death processing.
- Final integration: run full CI on the latest commit and verify staging/Production only after required checks are green.

Scope: Guard–Wolf–Fairy interaction only; broader game-effect dependencies still require audits. Never claim an iPhone OTA success from automated CI alone.
