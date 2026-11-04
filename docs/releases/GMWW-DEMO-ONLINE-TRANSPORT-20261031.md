# GMWW — DEMO dùng kết nối Online (31/10/2026)

## Phạm vi
- Chuyển **DEMO** sang vận hành phòng `roomMode=online` (realtime/Player Web) khi GM chọn DEMO; giao diện vẫn hiển thị **DEMO**.
- Server buộc `roomMode=online` khi tạo hoặc đổi phòng sang DEMO, dù client cũ gửi `offline`. Cờ `demo=true` tiếp tục điều khiển bot, quyền riêng tư và cách ly thống kê/lịch sử.
- **OFFLINE** và **ONLINE** thông thường, sơ đồ Seat, danh sách người chơi, dữ liệu trận và IPA giữ nguyên. Không chuyển phòng đang chơi hoặc có người sang DEMO.
- Phòng DEMO cũ đang vận hành không bị tự thay đổi; chỉ phòng mới hoặc phòng trống được GM chuyển chế độ mới áp dụng.

## Kiểm thử đúng phạm vi
- Chuyển Offline → Online → DEMO (roomMode online) → Offline; xác nhận phòng/mã không thay đổi, bot tự vận hành giữ `demo=true`.
- Xác nhận Server không chấp nhận đổi DEMO khi phòng có người, assignment hoặc đang chơi.
- Xác nhận Player Web DEMO dùng nhánh hành động DEMO có xác thực, không mở nhầm hành động Online thông thường.
- Xác nhận build GM từ 7 phần khớp `server-game/current/app.js`, Worker cú pháp hợp lệ và CI required checks SUCCESS trước khi merge.

## Phát hành và rollback
- PR chỉ thay đổi logic chọn phương thức kết nối và các bài kiểm thử tương ứng. Không tự thay đổi IPA, Oracle hoặc dữ liệu Production.
- Khi đủ gate phát hành, đóng gói Runtime OTA mới từ HEAD đã nghiệm thu, kiểm tra SHA-256 và cung cấp `.gmwwupdate` qua GitHub Releases. Không tái sử dụng tag phiên bản cũ.
- Rollback bằng cách revert commit PR và triển khai lại bản Runtime/Worker đã xác minh trước đó; không reset hay xóa Durable Objects.
