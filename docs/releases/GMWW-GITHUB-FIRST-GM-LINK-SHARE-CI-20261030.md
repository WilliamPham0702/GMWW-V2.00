# GĐ3 GMWW — CHUẨN HÓA CI CHO CHIA SẺ LINK PLAYER WEB

Ngày: 30/10/2026. Phạm vi: **chỉ GitHub Actions CI và chính sách chặn deploy ngoài phạm vi**.

## Thay đổi
- Bổ sung bộ chứng minh diff chính xác cho giao diện GM `Chia sẻ link Player Web`: chỉ chấp nhận ba khối HTML/CSS/JS có marker trong `server-game/current/GMWW.html`, so sánh byte khôi phục với bản trước, bắt buộc link mới mặc định vô hiệu khi chưa nghiệm thu DNS/HTTPS.
- Bộ chọn CI phân loại `gm-player-link-share` và `gm-player-link-share-ci` chỉ với tập file cố định. Mọi file/đường dẫn/markup mở rộng chuyển về CI đầy đủ.
- Những workflow icon, Lên Giàn, build IPA và Runtime OTA ứng viên bỏ qua test không liên quan khi phạm vi được chứng minh. Worker syntax/manifest và kiểm thử đặc thù vẫn giữ nguyên.
- Bổ sung unit tests fail-closed trong `CI Policy Gate`; khớp `assemble-gm-app.mjs --verify`.
- Chặn auto-deploy Production từ **chỉ các file CI** thuộc PR này. Chức năng chia sẻ link ở PR #637 tiếp tục riêng; không merge nếu chưa đạt điều kiện nghiệm thu, chưa tự động triển khai game.

## Nghiệm thu
- **Required:** CI Policy Gate SUCCESS trên commit cuối.
- **Focused:** node --test tests/gm-player-share-scope.test.mjs; chỉ UI mới chạy tests/gm-player-web-share-link.test.mjs.
- Không sửa `src/`, `assets/`, `server-game/current/GMWW.html`, `server-game/current/app.js`, `package.json`, `wrangler.jsonc`; không thay đổi IPA/OTA/data/Production.
- Khi thấy SHA mới, phải chạy lại kiểm tra. Nếu check khác thất bại, xác minh có liên quan trước khi merge.

## Rollback
Revert riêng commit squash CI. Không có thay đổi runtime/dữ liệu cần phục hồi.

## Release notes (tiếng Việt)
- Kiểm thử đúng phạm vi chia sẻ link Player Web, tránh bộ test Lên Giàn/icon/IPA không liên quan.
- Bảo vệ CI và Production: chỉ cho phép bỏ qua kiểm thử rộng khi chứng minh được nội dung thay đổi hoàn toàn nằm trong tính năng chia sẻ link.
