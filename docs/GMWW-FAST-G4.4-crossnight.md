# GMWW FAST G4.4 — Real Durable Object multiple-night effect regression

The established isolated-memory Durable Object harness runs real production `RoomDurableObject.applyCycle`, `resolveWolfNight` and `expireCycleEffects`. This change adds three regression cases:

1. Night 1 Guard protects a wolf-bite target; the same target is bitten on night 2 without a new protection and dies exactly once. The death persists into night 3.
2. Fairy redirects a bite with duplicated Seat indices; the engine refuses to invent a destination and does not remove an unrelated existing death.
3. Old interactions from another match cannot kill or protect members in the current match.

No game/Runtime/IPA/assets/native version, room storage schema or Production data changes. This validates the existing G4.3 rule code rather than adding a new oracle. Do not merge unless full CI and integration checks pass; a passing test still does not prove iPhone OTA activation.
