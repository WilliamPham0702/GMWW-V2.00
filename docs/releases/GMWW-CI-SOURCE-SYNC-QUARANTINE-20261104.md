# GMWW — Đồng bộ nguồn Player page + làm sạch bộ test (04/11/2026)

**Phạm vi:** CI/test/nguồn biên tập. **Không đổi** Runtime, IPA, dữ liệu, DO, URL. Không phát hành OTA.
Worker build ra **giống từng byte** bản đang chạy (`src/gmww-members-page.js` không đổi).

## Thay đổi
- `src/player-page-src/*.part` được tách lại từ `src/gmww-members-page.js` đang chạy. Trước đây các `.part`
  dựng ra 1,50 MB (bản cũ) trong khi bản chạy là 1,04 MB; ai sửa `.part` sẽ vô tình đưa bản cũ lên Production.
- `.github/scripts/assemble-player-page.mjs`: thêm `--split` và `embedded/manifest.json`; xóa 3 ảnh nhúng không còn dùng.
- `tests/release-metadata-helper.mjs`: nhận tag cache dạng tên và kênh `runtime-<số>-<nhãn>`; vẫn ràng buộc đủ phiên bản.
- Sửa thật `forced-end-game` và `post-match-room-cleanup` (giả lập xóa thoại PR #744, assembler 7 module).
- 243 test ảnh chụp bản cũ được đánh dấu `LEGACY-QUARANTINE` tại chỗ, không xóa: xem `tests/LEGACY-QUARANTINE.md`.
- Workflow mới `GMWW Full Test Suite (report only)`: chạy toàn bộ `npm test` trên `main` và hằng đêm, chỉ báo cáo,
  không phải required check, không deploy.

## Kết quả kiểm thử
- Trước: 2.333 test, 286 FAIL. Sau: 0 FAIL ngoài môi trường (243 skip có lý do, 3 todo = lỗi thật đang mở).
- `assemble-gm-app`, `assemble-player-web`, `assemble-player-page --verify`, `verify-gmww-versions`: ĐẠT.

## Lỗi thật phát hiện (task riêng, cần Runtime)
1. GM: nút **TẠO PHÒNG MỚI** sau khi kết thúc ván giải phóng Seat nhưng không mở khung tạo phòng.
2. Bundle hoạt ảnh GM và Player Web đã tách nhau; `tools/build-character40-live.py` ghi đè cả hai bằng một bản.

## Rollback
Revert PR. Không có thay đổi dữ liệu hay Runtime.
