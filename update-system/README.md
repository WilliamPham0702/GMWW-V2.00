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


## IPA packaging policy

GMWW now separates three delivery paths:

- **SERVER_ONLY / RUNTIME**: normal fixes, UI, gameplay logic, artwork, character and Player Web changes. Deploy and publish runtime only. No Xcode build.
- **FAST RUNTIME SNAPSHOT IPA**: for a quick installable test package, reuse the verified native shell release and overlay the tested runtime files. The native executable and Info.plist must remain byte-identical to the baseline. Snapshot artifacts are never published to the official in-app IPA channel.
- **NATIVE**: only Swift/Xcode/Info.plist/entitlements/native-resource changes. Run the full Xcode workflow, require runtime version = native shell version, then publish the official IPA release.

The old `server-game/BUILD_IPA_REQUEST` push trigger is retired. Full native builds run by explicit `workflow_dispatch` or when native Xcode/app-shell paths change. Runtime-only releases do not trigger the native workflow and must not bump Xcode metadata merely to satisfy IPA packaging.
