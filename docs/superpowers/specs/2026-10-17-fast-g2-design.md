# FAST G2 — build-verified OTA catalog

Authorization: GM requested sequential implementation of FAST G2–G4 on 2026-10-17, with staging and passing mandatory CI before Production.

Baseline: main f812fdf, Production health V3.121. Current source shell is 3.110; this is not evidence of the installed device shell. The Swift updater restricts downloads to the Production hostname, copies the active runtime into a staging directory, checks each SHA-256, and activates only after downloads complete. Do not change Native in this increment.

The manifest endpoint currently reads a versioned manifest then verifies ten assets for every request, falling back to latest.json and repeating verification. The inspected request returned 200; the historical intermittent 503 is not yet reproduced. Remove this runtime dependency for prepared deployments by embedding the manifest whose files were hashed during packaging in the same Worker bundle. Validate all metadata and the digest of the embedded manifest before using it. The old path remains a fail-closed compatibility fallback for builds without a catalog.

Catalog packages remain schema 1 and retain existing paths, URLs, versions, shell requirements, and delete: []. No game schema, namespace, role, Artifact, artwork, audio, or user data changes. This server-only increment must not force a new runtime version.

Later independent increments: generic checksum-based deltas using a trusted base catalog; release classification and version authority; architecture module extraction; multi-night/realtime Lab. Do not claim G2 complete until these and staging fault tests are proven. Device OTA acceptance requires evidence from an iPhone.
