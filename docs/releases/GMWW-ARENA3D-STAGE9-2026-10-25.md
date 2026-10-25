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
