# GMWW FAST G3.8 — GM UI source modules

The GM app historically lived only in `server-game/current/app.js` (a 523 KB compiled script). G3.8 splits the **authoring source** into six ordered functional pieces under `server-game/src/`:

1. Core setup, state and library
2. Library tools and Settings
3. Member management and roster
4. Village scene and room setup
5. Battle controls and Timeline
6. Roles, Artifacts and final runtime hooks

The existing shipped `server-game/current/app.js` stays **bit-for-bit identical** after this extraction; it remains the executable single-file bundle so current GM IPA, Web and OTA continue to load unchanged. The pieces are ordered JS fragments and are intentionally not standalone ES modules (the original closure and shared private state are preserved).

For edits, update the appropriate `server-game/src/*.part` file and run:

`node .github/scripts/assemble-gm-app.mjs --write`

Before committing, verify with:

`node .github/scripts/assemble-gm-app.mjs --verify`

Regression tests compare exact bytes and SHA-256; CI watches the new source folder and will reject any source drift from the checked-in packaged script. Any *real* packaged Runtime change must still advance Runtime version and pass G2 safety gates. This PR changes neither Runtime content nor saved data, Native IPA, Character artwork or Player Web. PR #277 remains independent.
