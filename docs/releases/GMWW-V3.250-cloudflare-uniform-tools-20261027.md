# GMWW Runtime V3.250 — đồng đều ô Cloudflare trong 16 công cụ bảo trì
Ngày: 27/10/2026

## Cập nhật
- Cài đặt → Kiểm tra & bảo trì: 16 nút có cùng chiều cao 82px; biểu tượng mây Cloudflare giảm xuống 17px; nhãn Cloudflare đặt gọn đúng ô.
- Giữ nguyên toàn bộ 16 ID/chức năng, sự kiện xử lý, box thông báo hệ thống và Cloudflare/DO/Server maintenance.
- Không thay đổi gameplay Core, Player Web, Durable Objects, phòng, lịch sử, dữ liệu cá nhân hay IPA.
- Runtime OTA V3.250 với checksum SHA-256; rollback Runtime/Worker V3.249 khi cần (không hạ cấp dữ liệu).

## Kiểm thử liên quan
- tests/gmww-v3250-cloudflare-tools.test.mjs
- tests/gm-operations-center.test.mjs
- tests/cloudflare-status-ui-schema.test.mjs
- Worker syntax, Runtime version synchronization, GM app source reproducibility, same-SHA CI, OTA integrity và Production health.
