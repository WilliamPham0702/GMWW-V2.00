# GMWW V3.0 — Đồng bộ hiển thị Player Web với Server

## Phạm vi sửa
- Dùng cùng nhãn ★ ĐẾN LƯỢT, MỤC TIÊU và màu viền/hiệu ứng theo cơ chế `battleMarkPlayers` của GM Server; chỉ hiển thị quyền và mục tiêu thuộc phiên người chơi được xác thực.
- Thu nhỏ và căn giữa nhóm icon hành động trên đống lửa, không giới hạn số lượng trong Player Web.
- Phù Thuỷ Online nhận đầy đủ hai bình Cứu/Giết từ đêm đầu, đúng icon do Server cấp. Không thay đổi chính sách DEMO.
- Chỉ hiển thị `revelation.message` khi Tiên Tri Hào Quang soi; không đưa JSON thô ra giao diện.
- Server trả về thông báo vết Sói cắn thông qua API `/me` đã xác thực, chỉ cho đúng Phù Thuỷ trong lượt đang thức; sử dụng nguyên `resolveWolfNight` hiện có. Không đưa vào public room hay WebSocket.
- Giữ thao tác kéo thả và Khôi phục đã nghiệm thu.

## Kiểm thử và phát hành
- Chạy bài test mới `tests/player-web-server-visual-parity-20261101.test.mjs`, hồi quy kéo thả iPhone và kiểm thử tương tác liên quan.
- Required `CI Policy Gate` SUCCESS trên HEAD cuối cùng và Worker CI chính SUCCESS, mới merge vào main.
- Thay đổi Server/Player Web chỉ dùng Worker Production; giữ nguyên Runtime OTA V3.288, không tạo `.gmwwupdate` trùng hoặc thay IPA.
- Sau triển khai xác minh `/api/health`, `/gmww-members-live.js`, Pages `gamemasoi.pages.dev`, SHA commit và khả năng rollback Worker.
- Rollback: triển khai lại Worker version trước phát hành, không reset/xóa Durable Objects, phòng, dữ liệu hoặc URL.

## Giới hạn
Bài test tự động không thay thế nghiệm thu thao tác kéo thả, thông báo riêng và hiệu ứng trực quan trên iPhone thật. Người dùng xác nhận lần cuối trên Production nếu bản phát hành đủ điều kiện.
