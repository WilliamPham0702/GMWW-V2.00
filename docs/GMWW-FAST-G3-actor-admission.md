# GMWW FAST G3.2 / G4 — Actor action eligibility

Production DO `gmBattleAction` uses one pure policy module for action admission.
This preserves existing blocking rules, with actual in-DO tests, instead of a
separate stand-in oracle.

Behavior intentionally unchanged:
- Active frozen, expelled, dead and configured `status.blocks===true` block actor
- Ended, other-game, other-player or nonblocking effects do not block
- A rejected action has no receipt, quota consumption or effect write
- Unblocking allows the same actor to proceed through regular validations
- No persistent format, key, Runtime asset, IPA or Native migration

G4 audit acceptance is **not complete**: future work must validate complete
night-to-morning sequences and effect precedence, including protection and
Yêu Tinh, against the actual DO entry point and iPhone staging.
