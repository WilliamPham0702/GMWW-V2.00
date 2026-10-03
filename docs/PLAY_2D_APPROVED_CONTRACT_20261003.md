# GMWW Tab Chơi 2D — approved implementation contract (2026-10-03)

Status: design specification committed; **NOT** implemented, built, deployed, or IPA-verified. Source branch baseline inspected: feature/approved-roles-v243-20261003 (server-game/current/app.js declares VERSION 2.44). Do not assume it matches the user's V2.45 IPA until verified.

## Non-negotiable safeguards
- Archive current IPA before major overhaul; verify actual V2.45 source/build and do not overwrite parallel branches.
- Keep existing IDs, localStorage/IndexedDB, artwork/theme/audio, Bundle ID, gameplay logic and deployed backend contracts; rename only visible UI text.
- User-facing language: Vietnamese. Theme: tropical ocean blue/turquoise/cyan/white/gold, use existing approved art rather than regenerating.
- Replace user-visible “Lá Bài” with “Vai Trò” across navigation, library, headings, buttons, messages and accessibility labels; preserve data keys and migration.
- Remove room locking as a barrier to returning players. Use status Đang Chơi and a Player Web “Đang Vào Trận” re-entry action with server identity/session verification; restore correct room, game, phase, role and artifact.

## Scene architecture
- 2D scene renderer separate from gameplay engine and server authority. Day tropical seaside village plaza, night seaside moonlit village; 12-player positions should be responsive to actual roster, not hardcoded.
- Scene layers: environment; player sprites/name/status; HUD timer/phase/voice/roster; contextual controls; action panels; overlays. Mobile-first one-hand controls, responsive orientation, reduced-motion and performance fallbacks.
- GM and Player Web share scene design language but not permissions. Do not leak hidden identities, role/faction, private chats, or target selection to unauthorized viewers.
- Night 1 begins with Bầy Sói nhìn mặt, then early calls Tráng Gương, Đá Hoán Đổi, Mắt Tiên Tri, Bùa Hộ Mệnh, then configured night sequence; no repeated pack reveal later.

## Role / Artifact interactive stack
- Two distinct cards rendered in a shared fanned stack, offset enough to tap either lower card; tapping lower brings it to front without changing underlying game state.
- First delivery: Role in front. Once opened, automatically acknowledge Role viewed and bring Artifact to front if present. Center card name and faction.
- One-use Artifact: after valid consumption, move behind Role, show Đã sử dụng / reason, disable use; GM or valid game action may reopen only through engine-authorized state change.
- Artifact is public interactive gameplay: display eligible player targets and action boxes on Player Web; Role interactions depend on room mode and action config.
- Distribute Roles and Artifacts together; use latest starred Artifact pool at issuance; support duplicates when types insufficient, max one Artifact per player; GM preview, reroll, swap, edit. Preserve Artifact assignments on Role-only reroll.
- Global server-authoritative Artifact cap: 3 valid uses across ALL players per Day–Night cycle. Atomic admission when concurrent, 0/3–3/3 UI, reset at new cycle. Exact accounting for canceled/blocked activations requires product confirmation.

## Acceptance tests
1. Old data/themes/role identifiers survive update.
2. Rejoining during active game never fails because room is “locked”; unauthorized newcomers still blocked.
3. Both cards tappable in overlap on small iPhone; initial/viewed/consumed/reopened transitions correct.
4. Role-only reroll preserves Artifact; changed issued Role is withdrawn and reissued with fresh viewed status.
5. Day/night 2D scenes render 4, 8, 12 players without overlap, maintain privacy and accessible touch targets.
6. Night 1 early-call ordering and once-used skip behavior; 3/3 server limit survives concurrency/reconnect.
7. End game returns all roster members into same waiting room, ready=true, including offline rejoin.
8. Verify source tests, build, GitHub Actions, Cloudflare and actual IPA before any release claim.

## Pending product decisions
- Snapshot/recheck latest starred pool at issuance versus preview generated at assignment.
- Whether enabled Artifact always fills every player with duplicates.
- Exact offline Player Web connectivity model.
- Whether blocked or canceled activation consumes one of the 3 global uses.
- No-death night summary auto-advance or GM confirmation.
