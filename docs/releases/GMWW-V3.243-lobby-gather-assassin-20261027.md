# GMWW Runtime V3.243 — PR #541
Ngày phát hành dự kiến: 27/10/2026. Loại: RUNTIME (OTA), **không thay đổi IPA**.

## Nội dung
1. Bỏ bước Tạo phòng khỏi timeline GM, chuyển Sảnh Chờ → Tập Hợp trực tiếp.
2. Giữ Room/Durable Object ẩn, khôi phục phòng chờ hợp lệ hoặc tạo phòng tự động nếu chưa có. Không xóa room cũ, không đổi cấu trúc lưu trữ và lịch sử ván.
3. Đưa nút Offline → Online → Demo vào menu Tập Hợp; bấm luân phiên, xác nhận với Server và giữ an toàn Demo/phòng đang chơi.
4. Menu Sát Thủ hiển thị 👍 / 👎 / OK cùng hàng; giữ nguyên luật chọn và xác nhận.

## Chốt phát hành
- CI mục tiêu: Check GM Lobby Gather and Assassin và Check Player Web Worker, cùng SHA merge, đều SUCCESS.
- Dựng và xác minh bundle GM; cú pháp Worker/Runtime và toàn vẹn manifest SHA-256 từng file trước/sau triển khai.
- Bảo toàn tài khoản, phòng, ván cũ, lịch sử và dữ liệu Durable Object. Không sửa Player Web, iOS native, IPA hay Arena 3D.
- Không ép chạy lại kiểm thử không liên quan: Chrome Card, Seat 30, UI 3D, native IPA.

## Rollback
- Khôi phục deployment Workers/Runtime trước PR #541 bằng Cloudflare Versions & Deployments nếu xác minh Production không đạt.
- Kiểm tra endpoint /api/health, /api/update/manifest và SHA-256 runtime files sau rollback.
- Không xóa hoặc reset namespace Durable Objects hay dữ liệu người chơi.
- Native IPA hiện hữu tiếp tục sử dụng như trước.
