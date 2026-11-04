# GMWW Arena 3D — GĐ44: Ván game chế độ 3D trên STAGING (05/11/2026)

Mở lại PR #581 theo yêu cầu chủ dự án. Phạm vi: chỉ STAGING `gmww-arena3d-stage14-staging`, Production và IPA không đổi.

## Yêu cầu
- VÀO LÀNG mở làng 3D cho một ván thật.
- Cả GM và Player chơi trên làng 3D.
- Test bằng link STAGING + Runtime OTA trỏ về STAGING.

## Thay đổi
- Đồng bộ `main` V3.304 vào nhánh (0 file chồng lấn).
- GM Runtime: cầu nối Arena 3D (`30-village-and-setup.part`). Chỉ hoạt động khi iframe 3D cùng origin với `GMWW_SERVER_BASE`; ở Runtime Production iframe khác origin nên không có tác dụng.
  - 3D báo `ready` → GM gửi phòng đang chọn + token qua postMessage tới đúng origin STAGING.
  - Phòng tạo trong 3D → Core xác thực token → GM chọn phòng đó → mở Setup 2D để chia vai/Artifact.
- `live.mjs`: gửi tin cho app GM (file://, origin "null") bằng origin thật của cha; trước đây tin bị rơi.
- Player: Worker STAGING chèn script vào trang Player Web. Khi đã vào phòng, Player tự chuyển sang `/village/arena-3d/player.html?room=…` (một lần mỗi phòng), có nút 🌊 Làng 3D và nút 2D để quay lại. Lá vai/hành động/chat/vote vẫn chạy trong Player Web gắn trong 3D.
- Runtime STAGING: `.github/scripts/build-arena3d-staging-runtime.mjs` tạo gói `GMWW-Runtime-V<x.y.n>.gmwwupdate` với máy chủ STAGING, VÀO LÀNG mở `live.html?coreMode=live`, nhãn "3D · STAGING". Phát hành dạng prerelease `arena3d-staging-runtime-v…` — app không tự đề xuất, chỉ cài tay.
- Test: thêm `tests/arena3d-gm-staging-bridge-20261105.test.mjs`; bỏ 3 test cầu nối của PR #487 cũ; sửa 1 regex Stage6 theo code GĐ37.

## Lưu ý
- Tài khoản thành viên STAGING tách biệt Production: Player cần đăng ký trên link STAGING.
- Khi cài Runtime STAGING, app GM chỉ nói chuyện với STAGING cho tới khi cài lại Runtime Production.

## Rollback
- App GM: cài tay `GMWW-Runtime-V3.304.gmwwupdate` (release `gmww-v3.304`).
- Worker STAGING: quay về version trước trên Cloudflare. Production không tham gia.
