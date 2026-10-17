# GMWW FAST — G3.4: Room and game configuration module

## Scope
- Extract the **original unchanged implementations** of `sanitizeGameConfig`, `normalizeRoomMode`, `normalizeSeatMoveMode` and `normalizeSeatCount` out of the Cloudflare Worker monolith.
- The Worker imports these four pure functions from `src/gmww-room-config-rules.js`. No change to route handling, Durable Object bindings, stored schema, saved template fields, default duration or mode normalization.
- Preserve GM Player Web behavior, role IDs, Artifact enable/disable fields, and 1–30 seats.
- No new runtime scripts, IPA shell edits, artwork, manifest or version bump. This is a **server-only** refactor.
- Keep PR #277 visual status changes independent; do not merge other branches as part of this task.

## Verification
- TDD RED CI: the first commit `e59c853e8e5af2482b44e494024b70ea61f2c1d9` failed only the missing-module regression (965/966 passed).
- New behavior tests import and execute production implementations against default template fields, legacy nested role aliases, explicit Artifact-off, per-role timing, movement/room modes and seat limit normalization.
- Merge/deploy only on complete required CI SUCCESS. Validate Cloudflare Worker health + OTA manifest afterward. iPhone activation is not established by a server-only refactor.
