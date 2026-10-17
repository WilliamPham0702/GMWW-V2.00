# GMWW FAST G4.2 — Night Timeline consistency

The production Durable Object's `getNightRuntime` already includes `wolf-introduction` only when `night===1`. Two pure helper projections had diverged: `buildNightQueue` inserted it every night; `timelineDisplaySteps` fabricated it even if absent in the server queue.

This change makes the stored/server queue authoritative for the opening step. The early Artifact window and final village-wakeup step remain one each; role ordering, player state, history, Native IPA, Runtime files and saved room data are unchanged.

TDD: RED commit `778549746d05ea49b49913d9b93ae484bb07047c` failed exactly two intended regressions, with 941/943 tests passing. GREEN commit fixes only the two projections. This PR must pass every required check before any merge/deployment.
