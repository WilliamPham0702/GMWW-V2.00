# GMWW FAST G3.9 — Player Web source modules

The browser Player Web used a single `src/gmww-members-live.js` file holding a ~650 KB JSON-escaped browser script. This G3.9 change creates six ordered, **readable plain-JavaScript authoring fragments** in `src/player-web-src/`:

1. Session boot, local recovery, setup
2. The original 320+ KB WebP Role-card back, in a dedicated source fragment (no replacement or approximation)
3. Village, character profile and Player top menu
4. Room setup, presence and realtime
5. Private cards, Artifacts and gameplay
6. Privacy timers, rendering lifecycle and startup

`src/gmww-members-live.js` remains **bit-for-bit the same** serialized ES module used by the Cloudflare Worker and player browsers. No native shell, data schema, Player Web route, Runtime version or visual behavior change.

To edit sources, modify one `src/player-web-src/*.part` file and regenerate:

`node .github/scripts/assemble-player-web.mjs --write`

To verify before committing:

`node .github/scripts/assemble-player-web.mjs --verify`

CI compares the exact emitted module and decoded script and checks that the Role-back WebP remains present. All Player Web/Worker regression tests and browser CI must succeed before merge. Future *content* edits still require normal version and OTA gates.

The generated module deliberately remains the source consumed by existing tests and serving code; source fragments are build-time units and intentionally are not standalone executable ES modules.
