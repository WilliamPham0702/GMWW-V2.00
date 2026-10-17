# GMWW FAST Giai đoạn 3 — G3.6: Seat, movement, identity and public Player DTOs

A cohesive Server/Player Web refactor. The Cloudflare Worker previously contained scattered, stateful and pure helpers for identity, geometry, Seat claims, movement, and public player views.

## Extracted contracts
- `gmww-player-identity-rules.js`: unchanged user login normalization, legacy 20-character default, 42 explicit character IDs, deterministic selection, character scale.
- `gmww-village-player-state.js`: authoritative village coordinate clamping, single-ring Seat indexing, duplicate Seat claims, user setup completion, movement reset, autonomous village activity, seated/moving roster projection, and public Player Web DTO.
- Keep the exact 70-second `ROOM_PLAYER_TTL`, GM Seat reservations and payload privacy.
- The production Worker now imports the functions; no storage namespace, schema migration, client asset, Runtime, Native IPA, Artifact or role rule change.
- Isolated Character V5.62 and Trạng Thái V1 PR #277 are untouched.

## Validation
The seven new tests exercise unchanged source behavior and privacy. Required: full `npm test`, Worker syntax/check, Worker local smoke/DO regression, all triggered CI workflows. Merge/deploy only after mandatory SUCCESS, then verify Cloudflare Worker, manifest and SHA-256. Production success does not prove iPhone OTA activation.
