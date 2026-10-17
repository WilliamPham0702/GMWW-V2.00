# GMWW FAST G4.1 — Real Engine multi-night verification

This patch replaces the previous stand-in `oracle` in the multi-night audit
with the production actor-admission function and two **real**
`RoomDurableObject` method-level integration sequences.

Verified boundaries:
1. A frozen role cannot submit a battle action on Night 1 and creates no receipt.
2. Morning 1 expires only that freeze, not a separate dead actor.
3. Night 2 uses the actual turn cursor and accepts the now-unfrozen role.
4. A dead role remains blocked in Night 2.
5. An explicit `disabled_2n` status remains in Night 2 and expires at Night 3.
6. The same actor then succeeds through the real confirmation method.

These tests use isolated clone-on-read storage and real Durable Object methods,
not Production room data, user data, or external Web requests.

Still outstanding for complete G4: actual end-to-end combat effect
precedence (protection + wolf attack + Yêu Tinh), complete artifacts/roles
across many nights, GM UI Lab acceptance, and physical iPhone OTA. Never
report full G4 acceptance based on this limited scope.
