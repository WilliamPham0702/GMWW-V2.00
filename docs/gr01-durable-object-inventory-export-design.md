# GR01 — Durable Object inventory and export safety design

Status: **design only**, no Production access, no credentials, no live export, no restore.

## Source findings (V3.85)
- Wrangler binds `ROOMS` to SQLite-backed `RoomDurableObject`.
- The Worker uses distinct identities via `memberStore(env)` and `roomStub(env, code)`. Enumerating only the room directory cannot prove that every DO instance has been discovered, especially deleted, expired or orphaned instances.
- `src/index.js` has mutable data families: `member:`, `session:`, `gameTemplate:`, `gameTemplateAsset:`, `gameTemplateAssetRevision:`, `gameTemplateAssetMeta:`, `sharedArtifactMeta:`, `sharedArtifactData:`, `sharedArtifactDataVersion:`, `customAvatar:`, `roomdir:`, `role:`, `roles:`, `artifact:`, `artifactUse:`, `artifactCycle:`, `nightRuntime:`, `roleAsset:`, `roleCatalog:`, `artworkAsset:`, `artworkRef:`, `globalAsset:`, `globalSetting:`, `meta`, `players`, `gameConfig`, and other scalar keys. This list is provisional, not exhaustive.
- Existing health probe reads a sentinel key but does not export any data.
- **Security blocker:** source contains a hard-coded GM synchronization credential. Do not copy its value into reports, logs or fixtures. Treat as exposed, rotate through a separately approved credential migration and move it to secret binding before enabling any backup endpoint.

## Inventory plan
1. Enumerate all storage-key prefixes from source and classify as user data, session, template, artwork, live game, operational, or derived cache.
2. Build an instance manifest from authoritative records, but account for orphaned room instances; confirm Cloudflare-supported discovery options before claiming completeness.
3. Record `instance_type`, opaque `instance_id`, `schema_version`, key count, byte count, record hash, and snapshot timestamp; never put credentials or personal data in audit output.
4. Audit expiry/alarms, concurrent writes, delete/reset paths, and source compatibility with previous runtime versions.
5. Determine actual Cloudflare platform backup/export facilities and quotas; do not assume KV APIs or SQLite file export are available for DO storage.

## Proposed secure export protocol (not implemented)
- Require an independently authenticated, least-privilege admin-only operation; do not reuse the current embedded GM token.
- Obtain consistent per-instance snapshot with bounded write coordination; annotate cross-instance consistency and concurrent changes.
- Paginate or stream bounded encrypted chunks to a private destination, with per-chunk SHA-256 and a signed manifest; never return user records through public GET routes.
- Use immutable backup IDs, strict retention, encryption at rest, audit logs, rate limits, and two-person approval for destructive restore.
- Restore only into isolated staging namespace; verify counts, hashes, relationships, compatibility and user flows. Do not overwrite Production.
- No backup/restore endpoints, Cloudflare permissions, secret rotation or deployment are authorized by this draft.

## Acceptance gates
- Full instance/key inventory validated.
- Threat model and secret rotation plan approved.
- Read-only export tested against an explicitly authorized staging instance.
- Restore rehearsal passes with sanitized data and documented RPO/RTO.
- Separate user approval before any Production access, merge or deploy.
