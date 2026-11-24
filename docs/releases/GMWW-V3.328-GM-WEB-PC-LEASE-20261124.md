# GMWW Runtime V3.328 — GM Server trên web (PC) + khóa điều khiển theo thiết bị

Ngày: 24/11/2026.

- Worker: thêm `/gm-server/` phục vụ đúng gói Runtime đã phát hành (`/updates/runtime/V<bản>/`), kèm PWA (manifest + service worker; không cache `/api/`). PC mở `https://gmww-v2-00.williampham0702.workers.dev/gm-server/` → Cài đặt ứng dụng.
- Worker: mở route công khai `POST /api/gm/rooms/<mã>/device-lease` (PR #956 chỉ có trong DO); CORS cho phép header `x-gmww-device`.
- GM Server (Runtime): mọi lệnh phòng gửi `x-gmww-device` (mã ngẫu nhiên lưu local). Thiết bị ghi thành công giữ khóa 60 giây, tự gia hạn khi app đang mở; ẩn app thì khóa tự hết. Thiết bị khác bị chặn thấy chip "🔒 <thiết bị> đang điều khiển · Giành quyền"; thiết bị đang giữ thấy "🎮 Bạn đang điều khiển · Nhả".
- Không đổi luật chơi, dữ liệu, Durable Objects, URL, IPA. Token GM giữ nguyên như IPA.
- Rollback: cài lại Runtime V3.327; Worker rollback về bản trước.
