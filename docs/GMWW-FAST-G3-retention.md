# GMWW FAST G3 — Interaction retention module

This is a behavior-preserving extraction from `src/index.js` to the new pure module `src/gmww-interaction-retention.js`.
No migrations, data-key renames, native changes, Runtime changes or storage writes are introduced.

Contract:
- Keep live `frozen`, `expelled`, `dead`, `status` and `assassin_mark` events through history pruning.
- A confirmed/ended mark (`effectActive=false`) is no longer a protected live effect.
- Preserve historic byte budget and the latest non-live history.
- The Durable Object continues to use the same `interactions` storage key and pruning invocation.
- Historical regression tests call the real exported function, not a dynamically extracted snippet.

Initial local RED on missing module and GREEN with 4 pure-function tests were observed. PR CI must run full Worker and game regression suite, including smoke tests, before merge.
