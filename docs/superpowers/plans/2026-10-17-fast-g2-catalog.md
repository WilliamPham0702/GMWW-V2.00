# FAST G2 catalog implementation plan

> Execute inline using superpowers:executing-plans. This independently reviewable increment precedes other G2 work.

**Goal:** Serve a build-verified OTA manifest without asset subrequests.
**Architecture:** Package producer creates a hashed catalog; Worker selector validates it and existing route handles absent/invalid catalogs.
**Tech Stack:** Node.js, Cloudflare Workers, existing Swift updater.
**Spec:** docs/superpowers/specs/2026-10-17-fast-g2-design.md

## Global constraints
- No Native, runtime version, storage schema or Production data changes.
- Schema 1 and exact production URLs; no deletions.
- CI and isolated staging required before Production.

## Review focus
- Stale catalog: version and shell mismatch returns null.
- Modified manifest: catalog digest mismatch returns null.
- Unsafe path or external URL: reject before serving.
- Missing core assets or duplicates: reject before serving.
- Missing catalog: preserve existing fallback.

## Task 1 — producer and selector
- [ ] Write tests for valid future release, tampered hash, stale version/shell, duplicate paths, traversal, missing core files and foreign origins.
- [ ] Run tests red; add buildReleaseCatalog(manifest, readFile) and selectBuildVerifiedManifest(catalog, version, shell).
- [ ] Producer independently checks every local file SHA and required core set; selector verifies the catalog digest and metadata.
- [ ] Generate src/gmww-release-catalog.js after preparation; import it into Worker and try selector before external asset checks.
- [ ] Run focused tests, all npm tests, version verification and Worker dry run.
- [ ] Create PR; inspect CI and staging package before merge/deploy.
