# FAST G2.2 — generic checksum deltas

Authorized by GM's sequential G2–G4 implementation request. Execute inline.

Build on merged PR #270, main ccafddea. Do not change Native code, Runtime bytes,
version numbers, storage bindings, game schema or user data.

The package producer examines historical package directories and verifies every
file against its manifest SHA-256. Embed at most three complete verified bases
with the current catalog. No version-specific selector is added. The Worker
verifies the base catalog envelope and compares inventories by path and checksum.
Only changed or new files are sent for a known, older, same-shell base. Unknown,
corrupt, incomplete, equal/newer, incompatible or destructive bases receive the
full package. This path has no asset subrequests. Existing unprepared deployment
fallback stays intact. Native still copies active files into staging and verifies
each download before activating; device success remains unproven.

Validation:
- Tests written and observed failing before implementation.
- 915 tests passed; package preparation and Worker dry run passed.
- Actual producer fixture publishes two future versions and verifies the base.
- Real Worker tests cover selective download, corrupt base and unknown base.
- Full packaged Worker uploaded to gmww-fast-full-staging with no storage or
  ASSETS binding; verify real responses and downloaded changed-file checksums.
- Inspect all mandatory CI on the exact PR head before merge. Confirm Production
  deployment and read-only health after merge. Roll back to the prior Worker
  deployment if health regresses; no data migration is involved.

Remaining G2 scope: installed shell evidence, version authority/classification,
full recovery/network fault coverage and iPhone acceptance. G3/G4 remain pending.
