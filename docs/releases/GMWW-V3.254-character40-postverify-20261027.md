# GMWW Runtime V3.254 — Sửa chốt xác minh Production (27/10/2026)

Bản Runtime V3.254 đã được Cloudflare Production quảng bá với OTA SHA-256 và giữ nguyên IPA.

Thay đổi **duy nhất ở CI/phép xác minh**: kiểm SHA-256 controller Player Web với tệp Player Web, controller GM iPhone với tệp GM. Hai controller khác nhau theo thiết kế chống nóng V3.253–V3.254; không ép chúng phải trùng byte.

Giữ nguyên toàn bộ Runtime OTA V3.254, server worker, Core, giao diện, luật, tài khoản, phòng, lịch sử, IPA; không đổi dữ liệu hay số phiên bản. Dùng chốt CI riêng cho script và verify Production đầy đủ sau merge.

Rollback: hoàn nguyên chính sách xác minh nếu cần, hoặc rollback Runtime V3.254 về V3.253 theo manifest trước đó. Không xóa Durable Objects.
