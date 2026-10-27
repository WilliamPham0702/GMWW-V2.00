# GMWW Runtime V3.251 — thu nhỏ mây Cloudflare, đồng bộ chiều cao ô bảo trì

Ngày 27/10/2026.

## Cập nhật
- Cài đặt → Kiểm tra & bảo trì: **16 ô công cụ** có chiều cao bằng nhau 82px; biểu tượng ☁ của Cloudflare thu nhỏ còn 17px và nhãn gọn hơn, không làm box này cao hơn box bên trái.
- Bảo toàn nguyên trạng **16 công cụ** và toàn bộ event handlers, thông báo hệ thống, quản lý Cloudflare, Tối ưu DO, Dọn rác, Healthy Check, v.v.
- Giữ nguyên toàn bộ thay đổi V3.250 đưa luật vào cài đặt các lá Vai Trò; không thay đổi gameplay, tài khoản, phòng, lịch sử, DO, Player Web, Native IPA.
- Runtime OTA V3.251 có kiểm SHA-256, rollback V3.250 nếu phát hành có sự cố. Không đổi IPA shell V3.110.

## Kiểm thử đúng phạm vi
- test 16 tool button IDs + sự kiện, CSS chiều cao, UI Cloudflare, nguyên trạng cài đặt lá V3.250.
- Hồi quy operations center, Cloudflare UI schema, kiểm cú pháp Worker/GM, assemble app, OTA và CI cùng SHA.
