# V3.187 Seat Circle 360° — CI hotfix (pending release)
Status: PR only; **not merged or deployed**.

## Fix
- Make six canonical GM source parts and generated `server-game/current/app.js` identical again.
- Restore shared circular 6–30 seat geometry after older algorithm reappeared in current main.
- Seat Mẫu lists only even sizes 6, 8, ..., 30; assigned Seat IDs remain consecutive and untouched.
- Legacy diamond, rectangle and ellipse room settings render circularly without rewriting persisted room/player records.
- Update GM / Player Web cache keys and obsolete three-shape regression tests, preserving true safety assertions for viewport/perimeter/seat identity.

## Release conditions
CI **SUCCESS**, physical iPhone 6/12/18/24/30 seat rendering and touch inspection, Player Web coordinate parity, drag-swap, locked Seat ID, no overlap of characters/labels, release notes, data preservation, rollback. No production action until verified and accepted by owner.
