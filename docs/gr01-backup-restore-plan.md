# GR01 — Isolated backup/restore preparation (NOT PRODUCTION READY)

Baseline: main V3.85, 435759ea41badbaaa0152f620f5c9bfacfd93db3.

## Scope
This branch adds a pure Node.js, in-memory fixture laboratory only. It does NOT connect to Cloudflare, does NOT export actual Durable Objects, does NOT modify Production, and does NOT claim a verified disaster-recovery solution.

## Verified storage families from src/index.js
member:, session:, gameTemplate:, gameTemplateAsset:, gameTemplateAssetRevision:, sharedArtifactMeta:, sharedArtifactData:, sharedArtifactDataVersion:, customAvatar:, meta, players. More families and Durable Object identities require enumeration before real backup.

## Gates before any real backup
1. Inventory every Durable Object namespace and identity, including member directory and individual room instances.
2. Confirm supported Cloudflare data export path, authentication, pagination, consistency, size limits and secrets handling.
3. Establish encryption at rest, least-privilege credentials, restricted retention, audit trail and secure destination.
4. Design consistent snapshot boundaries while rooms are active; never silently reset or delete sessions.
5. Build a separate staging restore adapter with schema versioning, dry run, collision rejection, checksums and recovery evidence.
6. Rehearse on sanitized fixtures, then an authorized isolated copy, comparing record counts and data relations.
7. Obtain separate explicit approval before accessing real Production storage, merging or deploying.

## Fixture laboratory
Run `node --test tests/gr01-backup-restore-isolated.test.mjs`.
The `restoreToEmptyMap` API intentionally rejects nonempty targets. This is not a Cloudflare restore implementation.

## Rollback
No deployment is performed. Rollback for this work is deleting the isolated branch after review. Production data is unaffected.
