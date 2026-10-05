# GMWW Update Manager V1

Prepared on top of V2.72 without touching main.

Release classification:
- SERVER_ONLY: Worker/API/Player Web only; deploy production, no IPA.
- RUNTIME: GM web runtime/data/assets only; publish runtime update, no IPA.
- NATIVE: Swift/Xcode/Info.plist/entitlements/native resources; build and publish a new IPA.

The native shell is responsible for:
1. checking /api/update/manifest;
2. staging runtime files in Application Support;
3. verifying SHA-256 for every file;
4. switching active runtime only after all files verify;
5. rolling back to bundled runtime if launch fails;
6. downloading an IPA and presenting the iOS Share Sheet so the user can save it.

Player Web is responsible for:
- checking webVersion on boot, visibility changes and a light interval;
- showing “Có cập nhật mới trên Player Web — vui lòng tải lại trang”;
- never force-reloading during active gameplay.

This branch is preparation-only. Do not merge until the parallel IPA work has finished and the newest main IPA build is verified.
