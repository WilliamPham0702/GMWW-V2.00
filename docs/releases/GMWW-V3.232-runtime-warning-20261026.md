# GMWW Runtime V3.232 — khắc phục cảnh báo Runtime giả (26/10/2026)

## Sửa lỗi
- Không tính sự kiện `window.error` do IMG/LINK không tải được mà thiếu thông điệp vào lỗi JavaScript trên iPhone.
- Vẫn ghi nhận lỗi script/JavaScript thực, loại AbortError, gộp thông điệp trùng và loại Promise đã được xử lý muộn.
- Chỉ cảnh báo lỗi trong 15 phút gần nhất; hiện nguyên nhân đã che URL và token, không chuyển log lên Cloudflare.
- SỬA NHANH không xoá lỗi thật để giả tạo trạng thái xanh.
- Giữ nguyên V3.231 icon 80px, toàn bộ gameplay Core, Player Web, phòng, Durable Objects, dữ liệu lịch sử và IPA đã phát hành.

## CI và OTA SHA-256
- Kiểm thử duy nhất liên quan: `tests/gm-runtime-error-diagnostics.test.mjs` (IMG/LINK, thiếu script, AbortError, Promise, trùng, hết hạn, bundle GM).
- Chốt cú pháp app.js/Worker, source 6 phần, phiên bản, OTA manifest từ bytes và SHA-256 thực, kiểm tra tăng version trước deploy.
- Không chạy Chrome Card, Seat, Arena3D, DEMO hoặc IPA cho task này.
- Sau merge, GitHub Actions chỉ được triển khai nếu CI **Check Player Web Worker** SUCCESS tại đúng SHA, các kiểm tra version và bản OTA đạt.

## Rollback V3.231
- Quay lại phiên bản Worker và OTA đã phát hành V3.231 nếu nghiệm thu V3.232 không đạt. Không xoá/cài lại IPA, không reset phòng, không can thiệp DO hoặc lịch sử.
- Xác minh sức khỏe Server/Player Web và SHA-256 Runtime sau khi phát hành trước khi báo hoàn tất.
