# GMWW FAST G3.5 — Private Role & Artifact Card Contract

This is a behavior-preserving **Worker-only** refactor, with production functions lifted verbatim:
- `sanitizePlayerRoleCard` and `mergePlayerRoleCard`: honor role title, actions, faction, objective, function usage mode/count, presentation flags, artwork aliases and version.
- `sanitizePlayerArtifactCard`: honor Artifact actions, targetCount/noSelf/allowDead, one-use, explicit priorityFirst and default priority for predefined Artifact names.
- `privateRole` and `privateArtifact`: keep exactly the established private payload fields; no unrelated member password or GM credentials.

Source of truth: `src/gmww-private-card-contract.js`. `src/index.js` imports functions instead of owning copies.

- Zero Durable Object storage key changes, no schema migration.
- No Runtime/IPA/Native or Player Web browser HTML edit; release classification remains server-only.
- TDD RED on commit `f2c2c6493481332633f71c09906f4df3fcb2c732`: 971/972 existing checks passed, the missing module failed.
- G3.4 room/game configuration extracted in PR #286; separate PR #277 Status art remains isolated.
- Mandatory CI, browser and Worker checks must be green before merge/deploy.
