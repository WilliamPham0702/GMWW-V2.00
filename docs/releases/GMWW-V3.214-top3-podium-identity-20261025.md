# GMWW V3.214 — sửa bục Top 3 và đồng bộ đúng Character

Ngày: 25/10/2026. Phạm vi thay đổi: Trang Chủ GM, mục **Top 3 Tỷ Lệ Thắng**.

## Đã sửa
1. Tách Character và **bục 2.5D rắn**, chân Character đứng trên mặt bục, không còn khối hộp trong suốt che chân.
2. Bảng thông tin **Hạng, tên thành viên, tỷ lệ thắng, số trận** nằm hoàn toàn **dưới bục**; thứ tự trái 02 – giữa 01 – phải 03.
3. Sử dụng **gameCharacterId** hiện tại từ API thành viên như Player Web/làng; ảnh đúng frame Idle trong atlas đã kiểm chứng, qua `/api/game-characters/{id}/image?rev=c40-4`. Loại bỏ hình originals cũ và fallback avatarId lịch sử gây sai nhân vật.
4. Giữ hiệu ứng ăn mừng nhẹ, giảm chuyển động khi iPhone bật Reduce Motion; tối ưu layout màn hình hẹp.
5. Đồng bộ số Runtime V3.214, cache busting CSS/JS và cập nhật release notes tiếng Việt.

## Kiểm thử theo đúng phạm vi
- `node --test tests/home-top3-podium-v3211.test.mjs tests/home-top3-podium-identity-v3213.test.mjs`: kiểm tra bố cục Top 3, ánh xạ ba người/Character thật, cập nhật ID khi đổi Character, thống kê gốc.
- `node .github/scripts/assemble-gm-app.mjs --verify`: nguồn GM đúng bộ đóng gói.
- `node .github/scripts/verify-gmww-versions.mjs` và `node --check server-game/current/app.js`: toàn vẹn Runtime.
- CI Worker/Production, SHA-256 manifest OTA, health server theo gate phát hành hiện hành.

## An toàn và rollback
Không chỉnh API game, logic thống kê thắng/thua, Player Web, dữ liệu phòng, Durable Objects, lịch sử hoặc IPA. Nếu giao diện mới lỗi, rollback theo bản Runtime liền trước, giữ nguyên toàn bộ dữ liệu.
