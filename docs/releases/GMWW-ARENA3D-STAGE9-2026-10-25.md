# GMWW Arena 3D — Giai đoạn 9 (nghiên cứu)

## Thay đổi
- Kế thừa GĐ8 đã nghiệm thu, giữ nguyên nghệ thuật, nghi lễ nhiều mục tiêu và quy tắc Core/GM phân quyền.
- Thêm Stage9 Match Sync Gate: đồng bộ giai đoạn phòng/ván, đêm/ngày, số người chơi/còn sống/online qua public projection của Core.
- Giảm cập nhật trùng và bỏ frame có revision cũ; khi kết nối lại không để HTTP snapshot cũ ghi đè sự kiện WebSocket mới.
- Bảo đảm projection công khai không mang role/faction/target bí mật.
- Gắn chỉ báo trạng thái GĐ9 để theo dõi trên iPhone và trình duyệt; không thay đổi logic 2D hay dữ liệu.
- Kiểm thử chỉ đúng phạm vi Stage9 và phụ thuộc nghi lễ GĐ8, Chrome/WebKit 6/12/20/30 người.
- Cloudflare Worker STAGING riêng `gmww-arena3d-stage9-staging`, PR Draft xếp chồng PR #476, không merge hoặc deploy Production.

## Điều kiện nghiệm thu
- CI liên quan và browser smoke trên STAGING đều SUCCESS.
- Kiểm tra trên iPhone thật: chuyển trạng thái toàn trận, trở lại sau mất mạng/refresh, hiệu ứng phép và FPS/pin/nhiệt.
- Không dùng FPS giả lập CI làm chứng nhận hiệu năng iPhone.

## Kết quả kiểm thử và triển khai (25/10/2026)
- PR #481 Draft: https://github.com/WilliamPham0702/GMWW-V2.00/pull/481
- CI unit/syntax/dry-run: SUCCESS.
- STAGING GĐ9 riêng + browser Chrome/WebKit: SUCCESS — https://github.com/WilliamPham0702/GMWW-V2.00/actions/runs/40150670081
- Worker `gmww-arena3d-stage9-staging` version `6ffa142e-f60e-4d3d-a8c3-7b2d99174ea2`.
- Preview: https://gmww-arena3d-stage9-staging.williampham0702.workers.dev/village/arena-3d/live.html
- Smoke 6/12/20/30 Character: Chrome/WebKit PASS, 46 draw calls.
- FPS Chrome headless ~11, WebKit giả lập ~1: không đại diện FPS/pin/nhiệt iPhone thật.
- Đã sửa bài kiểm thử Stage9 nhận nhầm marker GĐ8; chỉ kiểm thử trực tiếp liên quan.
- **Chưa chứng minh end-to-end đầy đủ một ván Core thực tế từ tạo phòng đến kết thúc và reconnect nhiều client; browser smoke hiện xác minh render/animation và unit sync gate.** Chưa yêu cầu nghiệm thu toàn bộ GĐ9 cho đến khi xác minh kịch bản này.
