# GMWW – Hiệu năng & Chống nóng (PR ứng viên, 27/10/2026)

## Nội dung thay đổi
- Thêm mục **Hiệu năng & Chống nóng** trong **Cài đặt → Giao diện & nhân vật** của GM iPhone.
- Mặc định **Tự động**; chống vòng lặp thừa luôn bật, giảm hiệu ứng khi tải cao bật, tạm nghỉ khi không hoạt động bật. Chỉ lưu thiết bị, không ghi phòng/DO.
- Render scheduler chỉ tạo một lịch requestAnimationFrame/timer; bỏ wake 60Hz không cần thiết. Khi không có chuyển động hoặc rời sân chơi giảm/tạm dừng render.
- Chế độ Tự động phát hiện độ trễ khung hình để giảm hiệu ứng CSS phụ, tự hồi phục khi tải giảm. Không ẩn trạng thái vai trò.
- Chỉ đo độ trễ render, **không đo nhiệt độ iOS** do chưa có cầu nối native.
- Giữ nguyên gameplay, audio, đồng hồ, Player Web, kết nối và IPA.

## Kiểm thử đúng phạm vi
- Node syntax cho controller, GM motion và OTA script; Node test riêng tests/gmww-performance-thermal.test.mjs.
- Đối chiếu GM atlas / shared Web atlas; đóng gói OTA module; assembler GM và Worker compile gate.
- Không kiểm thử Chrome Cards, Seat, DEMO rules, 3D và IPA không liên quan.

## Phát hành và rollback
- **PR Draft; không merge, không Production và không IPA**.
- Khi duyệt: nâng đúng Runtime, release notes tiếng Việt, xác minh OTA SHA-256, có rollback về Runtime trước PR và bảo toàn dữ liệu.
- Rollback bản sửa UI/render từ commit main trước PR; khóa localStorage còn thừa sẽ không tác động dữ liệu người chơi.
