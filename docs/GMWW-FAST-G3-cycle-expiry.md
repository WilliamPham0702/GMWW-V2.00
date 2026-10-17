# GMWW FAST G3.3 — Cycle interaction expiration

Extracted from `RoomDurableObject.applyCycle` without changing effect semantics.
- Original loop is retained in the shared `expireCycleEffects` function.
- Durable Object still persists to the existing `interactions` key.
- Legacy frozen/expelled expiration, same-game guards, status duration and
  existing expired reason codes are preserved.
- The module changes only interaction objects passed in. It performs no
  storage, network, clock or Native/Runtime operations.
- G4.1's full night1 → morning1 → night2/3 real-DO tests continue to
  exercise the refactored application path.
- No data migration, UI change or IPA install required.

Full G4 effects precedence and protection/Yêu Tinh acceptance remains open.
