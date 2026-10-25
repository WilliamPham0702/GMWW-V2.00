# GMWW Runtime OTA V3.222 — 5 icon nổi, PR #501 (25/10/2026)

**Loại cập nhật:** Runtime OTA + Player Web, không cập nhật IPA, không đổi gameplay/Core, Durable Objects, dữ liệu phòng hoặc tài nguyên Cloudflare.

## Thay đổi
1. 🚩 **Player Web / Đề cử:** cờ đỏ emoji 48×48px, không khung, giữ chế độ hút Character, OK/Khôi phục.
2. 🐦‍🔥 **DEMO:** thay 📗, độc lập không dính thanh dưới; kéo thả tự do, mặc định thu gọn, mở lịch sử khi chạm.
3. 🌈 **Thống kê phe:** thay ⚖️, kéo thả; chạm mở bảng quân số sống/tổng từ dữ liệu trận, cập nhật qua GM Server.
4. 🏖️ **Thông cáo Làng:** thay nút cũ, nổi tự do, không đổi nội dung thông cáo/audio.
5. ⛱️ **Lên Giàn:** thay nút cũ, nổi tự do; giữ đề cử/bỏ phiếu, xác nhận, khôi phục và Server.

Tọa độ icon GM lưu riêng trên máy, không thay state hoặc game rule. V3.222 dựa trên main V3.221, **giữ nguyên mọi sửa Top 3 / xếp hạng**.

## Chốt phát hành bắt buộc
- GitHub PR #501 có CI chuyên biệt SUCCESS (Node + WebKit mô phỏng iPhone + Player Web + GM bundle).
- CI Worker main & workflow 5 icon cùng **một SHA** SUCCESS. Mọi thay đổi ngoài whitelist yêu cầu full CI.
- Cú pháp, phiên bản Worker/GM/package/lock khớp 3.222, app.js = đúng 6 source module GM.
- Quy trình Production chuẩn prepare-update-channel.mjs runtime tạo manifest V3.222 với SHA-256 từng file và verify-gmww-versions.mjs xác minh tăng phiên bản.
- Sau deploy, kiểm tra Worker /api/health, OTA /api/update/manifest, checksum, Player Web trên Production.
- **Không tự động đổi Native shell hoặc IPA**.

## Rollback V3.221
Rollback sang Worker/Runtime Production V3.221 đã triển khai trước khi nâng cấp. Khôi phục Worker deployment version từ Cloudflare và asset/manifest OTA tương ứng; **không xóa hay reset DO, không thay dữ liệu/phòng chơi**. Với code, revert PR #501 và commit release sau nếu cần. Khóa localStorage gmww_battle_free_icons_v1 chỉ chứa vị trí icon, an toàn giữ nguyên.

**Đường dẫn phục vụ kiểm tra:** https://gmww-v2-00.williampham0702.workers.dev/api/health
