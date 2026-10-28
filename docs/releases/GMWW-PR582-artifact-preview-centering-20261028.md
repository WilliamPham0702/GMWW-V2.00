# GMWW — Sửa lỗi căn giữa artwork Artifact (PR #582)

Ngày: 28/10/2026

## Nội dung thay đổi
- Căn chỉnh hiển thị ảnh Artifact có vùng lề tối lệch trái hoặc phải trên Thư viện → Mặt Player Web.
- Phát hiện vùng trống bằng ảnh mẫu nhỏ; chỉ áp dụng hiệu chỉnh khi xác nhận rõ ràng, giới hạn mức cắt để tránh mất chi tiết.
- Mở lá khác hoặc đổi sang Vai Trò sẽ đặt lại hiệu chỉnh; không giữ vị trí của lá trước.
- Không sửa hoặc ghi đè artwork gốc, không tác động tên, mô tả, luật, audio, lịch sử, dữ liệu phòng hay Player Web.

## Kiểm thử
- `node --test tests/artifact-preview-horizontal-centering-20261028.test.mjs` (5 trường hợp)
- `node --check server-game/current/app.js`
- `node .github/scripts/assemble-gm-app.mjs --verify`

## Phát hành và khôi phục
- PR kiểm tra giao diện GM; chưa phát hành Runtime OTA và chưa thay đổi IPA.
- Khi phát hành cần tăng phiên bản Runtime, tạo manifest SHA-256 từ đúng bytes đã build, kiểm tra Production và chuẩn bị gói rollback.
- Nếu hình ảnh bị cắt ở lá có nền tối thật, có thể tắt phần hiệu chỉnh bằng cách hoàn tác commit của PR #582; ảnh gốc không bị thay đổi.
