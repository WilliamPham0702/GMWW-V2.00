# GR01 backup / PITR acceptance report — 2026-10-11

## Scope and explicit non-goals

- GR01 currently proves isolated Cloudflare SQLite Durable Object export/restore and PITR recovery on **fixture-only** objects. No Production content was exported or restored.
- Production's `RoomDurableObject` gains only a **secret-guarded, read-only internal PITR bookmark** action at `POST /__gr01/pitr/bookmark`. If `GR01_INTERNAL_PITR_TOKEN` is unset or invalid, it returns 404. It is not exposed as a public Player or GM endpoint.
- The optional `tools/gr01-pitr-controller-worker.mjs` is a **separate Worker implementation**, not automatically bundled into the GMWW Worker. It only captures Cloudflare recovery bookmarks into a private KV namespace; it has NO Production restore operation.
- This is **NOT an independent, full-history backup of Production user data**. Cloudflare PITR supports a rolling ~30-day window, requires a usable bookmark, and cannot serve as an offline or cross-account copy.

## Evidence actually obtained

1. Base PR #216 merged at commit `28b91b802f0bea82572338025dc7e171e451dd74`.
2. All **24 isolated Node tests PASS** on the hardening branch. Include lossless JSON validation, checksum, unexpected type rejection, atomic transaction rollback, concurrent snapshot mutation, controller authorization, corrupted-manifest detection, forbidden restore.
3. Cloudflare fixture-only Worker `gmww-gr01-backup-lab` tested live: 6 keys including **30 players, 63 roles, 44 artifacts**, two isolated Durable Object instances, round-trip digests equal, overwrite refused. A separate HTTP call after `ctx.abort()` confirmed native SQLite DO PITR bookmark rewind and identical SHA-256.
4. The staging test URL was disabled after verification. The staging Worker is on a dedicated SQLite Durable Object namespace, never GMWW Production `ROOMS`.
5. Production `/api/health` and `/api/health/deep` returned healthy V3.85 before hardening release.
6. Cloudflare admin API enumerated **18 instances with stored data** in the main `gmww-v2-00_RoomDurableObject` namespace on 2026-10-11. This is a time-limited inventory, not an export.
7. Accessing the internal SQLite `_cf_KV` table through the remote Cloudflare SQL admin query returns `SQLITE_AUTH`, so this query is **not** a production-backup path.

## Remaining release blockers for a full Production backup product

- **R2 is not enabled** on this account (Cloudflare API error `10042`). R2 activation and a private bucket are prerequisites to independent encrypted payload archives.
- The backup controller has passed unit tests, but its **live authentication and cross-Worker KV manifest flow were not fully verified**. An isolated staging controller Worker was uploaded but is not authorized for data capture, and it must not be promoted as ready.
- No current authenticated, full-instance per-key export exists on Production. Neither native PITR bookmarks nor the sample JSON adapters prove comprehensive external backup of accounts, sessions, artwork, templates, assets or active match data.
- App-level storage may contain values not representable by JSON. The GR01 Node backup format deliberately **rejects**, not silently corrupts, Date, typed arrays, Map, binary, NaN, undefined and cyclic structures. Production data format audit is still required.
- Per-object bookmarks cannot provide an atomic timestamp across the namespace. Concurrent sessions must be respected; Production restore needs separate change approval, operator lock and a rehearsed incident runbook.

## Non-destructive operating rules

1. Never invoke a destructive PITR restore on Production during ordinary backup or deployment. The GMWW Worker deliberately has no restore handler.
2. Keep Cloudflare staging and Production storage namespaces distinct. Never reuse fixture Worker bindings for game data.
3. Never log or share GM sync credentials, newly created service credentials, member records or unredacted backup payloads.
4. When a private R2 destination and Secret management are provisioned, complete authenticated staging capture/verify, point-in-time checks, encryption/key-escrow and cross-instance inventory before enabling Production backup.
5. Do not mark **full Production backup / disaster recovery** as completed on the strength of fixture-only testing.

## Reproducible isolated checks

```sh
node --test tests/gr01-*.test.mjs
node --check src/index.js
node --check tools/gr01-pitr-controller-worker.mjs
```

The branch introduces an independent `GR01 Backup Integrity` GitHub workflow. Only merge after the existing Player Web validation is green; deploy only via the existing verified Production workflow.
