# Server-owned DEMO — V3.174

User-approved outcome: DEMO runs in its existing isolated RoomDurableObject. IPA/GM Web are observers and controllers. Preserve V3.172 room mode, first-half GM intervention, audio/haptic, actual timeline, existing game APIs, completion choices, member isolation and native shell.

Design: persist demoLease with engine=server (no heartbeat expiry), scoped match, speed and explicit paused/winner/error state. Reuse existing configured role/Artifact cards and pure battle-controls rules; all actions go through existing gmBattleAction/gmDayAction/playerGallows/gmGallows/advanceNightRuntime/applyCycle handlers. A persisted per-turn plan selects only legal actors/targets, optional Witch save, schedules actions in the second half, honors manual receipts/quotas. Alarm chooses minimum next Demo event, normal Auto and room expiry. Serialize alarms with mutations; transaction includes effects, receipts, plan progress and next alarm, broadcast only after commit. Winner pauses for GM completion, never writes member stats. Bound automatic steps and elapsed run duration. No schema migration or native IPA rebuild.

Implementation and verification:
1. Add failing server tests for no-heartbeat execution, half-time actions, speed/pause, retries, manual receipts, night/day/gallows/winner and safety stops.
2. Implement src/gmww-demo-runner.js and integrate control/state, scheduling, atomic alarm, lifecycle cleanup in src/index.js. Server-owned control removes browser-owner lock while retaining auth.
3. Replace browser mutation loop with state projection and read-only polling, retaining observer/target/glow, feedback and GM controls. Closing/leaving the viewer must not stop server; explicit pause does.
4. Verify unit suite, assembly, bundle; local workerd test with no GM clients and >15 seconds no heartbeat, pause/resume/speed, manual actions, game winner and existing-account snapshots. iPhone WebKit checks observer and control only, asserts no frontend gameplay POSTs.
5. Bump runtime V3.174, commit/push PR; only merge after all applicable CI succeeds. Verify deployment SHA, health, OTA hashes and old runtime rollback route.

Review focus: duplicate alarms; GM action before/after midpoint; pause/resume reload; expired old browser lease; room end/reset/replay; no-target/policy rejection; server resource bounds. Changes remain limited to DEMO scheduling and client projection, shared game law unchanged.
