# GMWW FAST G3.7 — Public Room and status contract

Extracted unmodified `roomUiStage`, `STATUS_DEFS`, `activeStatusRows`, `statusTagsFor` and `publicRoom` from the giant Cloudflare Worker into the public Room contract module.

- Status filters remain isolated by match and owner, preserve active/inactive semantics and the GM-defined visibility flags.
- Room DTO is still a finite allowlist excluding credentials, session tokens, password hashes and player storage. Seats remain 1–30 and the mode and cycle DTO are unchanged.
- The real DO Engine harness imports the same status definitions used in production; legacy tests now read the actual module.
- No storage migration, gameplay change, native IPA change, Runtime version bump or PR #277 artwork integration.

RED: `002bb0b73e2a1d0ca1584a958eecbdc0bf5f7d85` (993/994 passing; only missing new module). CI required for GREEN, Worker integration and Production before marking complete.
