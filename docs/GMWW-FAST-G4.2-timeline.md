# GMWW FAST G4.2 — Night Timeline consistency

Production Durable Object `getNightRuntime` schedules Bầy Sói only when `n===1`. Two pure projections diverged: `buildNightQueue` inserted it every night and `timelineDisplaySteps` fabricated it when absent from the queue.

The server queue is now authoritative. The early Artifact window and village-wakeup remain once each, and every assigned role/Artifact action is retained. No data, schema, Native, OTA package, or gameplay Durable Object change.

TDD evidence:
- RED `778549746d05ea49b49913d9b93ae484bb07047c` — 941/943 tests passed, two new tests failed as expected.
- First GREEN attempt `d1922def0951ac258accd727ed887b1676c738a4` exposed four historical tests asserting the outdated every-night wolf introduction or fixed array indices.
- The four historical tests are updated to assert the verified real DO contract and locate Artifact steps by `kind`, not by positional index.
- All mandatory CI checks must return SUCCESS on the final commit before merge/deploy.
