# Player Web Background Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Giảm CPU và request nền của Player Web khi trang bị ẩn, tự đồng bộ lại khi quay lại.

**Architecture:** Dùng Page Visibility API tại các nhịp định kỳ hiện có. Bộ đo FPS quản lý vòng `requestAnimationFrame` theo trạng thái trang; các poll mạng giữ timer nhưng bỏ qua lần chạy khi ẩn để không thay đổi vòng đời hiện tại.

**Tech Stack:** JavaScript ES modules, Node test runner, Cloudflare Worker.

**Spec:** `docs/superpowers/specs/2026-10-29-player-web-background-performance-design.md`

## Global Constraints

- Giữ nguyên giao diện, luật game, dữ liệu, WebSocket, IPA và Runtime OTA.
- Chỉ kiểm thử phạm vi hiệu năng nền Player Web.
- Có release notes tiếng Việt và rollback trước khi phát hành.

## Review Focus

- Trang ẩn trong lúc FPS reporter đang chạy: không còn callback khung hình.
- Trang hiện lại: reporter tiếp tục đúng một vòng khung hình.
- Poll ảnh nền/presence/update: không gọi mạng khi ẩn.
- Bundle Player Web phải khớp hoàn toàn với các source part.
- Không thay đổi hành vi realtime khi trang đang hiển thị.

---

### Task 1: Visibility-aware background work

**Files:**
- Modify: `assets/village/village-performance.mjs`
- Modify: `assets/village/scene-manager.mjs`
- Modify: `src/player-web-src/30-rooms-and-realtime.part`
- Modify: `src/player-web-src/50-privacy-and-runtime.part`
- Regenerate: `src/gmww-members-live.js`
- Test: `tests/player-web-background-performance.test.mjs`

**Interfaces:**
- Consumes: `document.hidden`, `visibilitychange`, existing timers and sync functions.
- Produces: unchanged public interfaces; reduced hidden-page work.

- [x] Write failing visibility tests and confirm the expected failure.
- [x] Implement minimal visibility guards and reporter pause/resume.
- [x] Regenerate the Player Web bundle.
- [x] Run focused tests and JavaScript syntax checks.
- [x] Add Vietnamese release notes and commit on a feature branch.
