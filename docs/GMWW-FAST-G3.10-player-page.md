# GMWW FAST G3.10 — Player Page HTML/CSS and original embedded artwork

The Player Web page module (`src/gmww-members-page.js`) used to hold about **1.5 MB of inline data**, including seven `data:image/*;base64` occurrences (six unique, one duplicated). G3.10 moves *unchanged original media strings* to six dedicated `src/player-page-src/embedded/*.data` files and extracts the remaining page markup into three source fragments:

1. `00-head-and-style.part` — document shell + CSS
2. `10-body-and-roles.part` — Player HTML / role layouts
3. `20-inline-scripts-and-export.part` — initialization, security hooks and the original module export

The original `src/gmww-members-page.js` remains **byte-for-byte identical**, including original MIME strings, base64 bytes, CSS, HTML, inline JavaScript and `gmwwMembersPage(roomCode)` behavior. The duplicate media reference is rebuilt from one unique source file; all seven original placements remain.

Generate changes using:

`node .github/scripts/assemble-player-page.mjs --write`

Verify parity using:

`node .github/scripts/assemble-player-page.mjs --verify`

Every source change is covered by `src/**` CI path rules and strict exact SHA-256/source tests; actual browser/Runtime edits still follow the standard version and OTA safety gates. No game data, original artwork, IPA, Runtime, GM or Player Web network contract changes in this source-only PR. PR #277 remains independent.

This is the last **priority bundled source extraction** scoped to G3. The Worker remains a Durable Object API shell with pure rules/DTOs delegated to the G3.1–G3.7 modules; migration or rewriting existing persistent DO storage is intentionally out of scope.
