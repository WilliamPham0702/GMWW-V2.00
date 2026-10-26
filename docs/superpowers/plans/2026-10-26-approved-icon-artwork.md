# Approved icon artwork Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans; implement inline.

**Goal:** Deploy the approved illustrated icons, complete the existing catalog, preserve working interactions.
**Architecture:** Preserve catalog IDs and custom images. Package 49 individual 512px transparent WebP images in versioned v3 paths, plus one rotation image for the existing single Yêu Tinh control. No Core changes.
**Tech Stack:** Existing JS runtime, Pillow asset sizing, GitHub CI, existing Worker OTA pipeline.
**Spec:** User-approved 19 individual images in conversation, request to finish full set and deploy; existing 49-entry catalog is authoritative.

## Global Constraints
- Existing 80px battle image / 92px hit area and entrance placement stay unchanged.
- 19 approved source pictures must be used, no redraw from SVG.
- Preserve user custom images, mappings, rooms, DO, history, IPA.
- Only icon tests and required release integrity gates. Routing changes in separate PR per AGENTS.md.
- Vietnamese release notes, previous deployment rollback; verify live bytes/SHA.

## Review Focus
- Cached V5 catalog and custom uploads must survive the new URL mapping.
- Each image must be distinct, transparent, and fully visible at game size.
- Yêu Tinh remains one draggable control invoking the same direction UI.
- Unknown gameplay changes must not qualify for asset-only CI.
- Production must serve the exact packaged pictures, and OTA must include every one.

## Tasks
- [ ] Add fail-closed artwork scope with positive and adversarial tests; separate CI PR, no deployment.
- [ ] Generate missing 30 images plus rotation, preserve original 19; size and record source/output hashes.
- [ ] Test old URL bug before replacing the picture resolver. Change only picture URLs and rotation visual; version metadata and notes.
- [ ] Run icon/catalog/drag tests, image alpha and 80px visual checks, assembly/version/build checks.
- [ ] PR, required CI SUCCESS, merge, existing Production deploy, live OTA/image SHA verification.
