# GMWW Runtime V3.206 — Cờ đề cử hút mục tiêu và khôi phục (24/10/2026)

## Thay đổi
- **Cờ hải tặc đỏ lớn hơn:** chiều hiển thị co giãn 72–100px theo kích thước màn hình; phần lá cờ được mở rộng, tăng tương phản.
- **Snap/hít lên người chơi hợp lệ:** Trong lúc kéo cờ, tìm Character hợp lệ gần nhất trong vùng bán kính theo kích thước Character; cờ tự hút vào tâm Character. Mục tiêu được viền vàng + phát sáng đỏ/vàng + tên nổi bật để nhìn rõ đang chọn ai. Không hút vào GM, người đã chết, bản thân hoặc người không đủ quyền tham gia đề cử.
- **Thả cờ là chọn tạm:** KHÔNG gửi phiếu xuống Server khi nhả tay; hiển thị OK/Khôi Phục cạnh cờ. Có thể tiếp tục kéo cờ tới người khác trước khi xác nhận.
- **OK:** Gửi đề cử qua Player Web có xác thực. Player Web kiểm tra lại trạng thái giai đoạn, người đề cử/ứng viên, và mục tiêu phải đúng ID đã chọn tạm. Server giữ quyền quyết định phiếu duy nhất.
- **Khôi Phục:** Xóa mục tiêu chọn tạm, trả cờ về đống lửa, không xóa phiếu nào đã được Server ghi nhận. Chọn từ danh sách bằng nhấn đúp cũng tiếp tục có OK/Khôi Phục, đồng bộ trạng thái chọn giữa danh sách và cờ.
- Nếu hết lượt, người chơi chết hoặc mất quyền, tắt highlight và các nút, không gửi phiếu.
- Không thay đổi Seat, Card, Character nguồn, luật vai trò, Durable Objects, IPA hoặc dữ liệu trận.

## Kiểm thử đúng phạm vi
- Kiểm thử logic vùng hút chọn người hợp lệ gần nhất và không hút người không đủ điều kiện.
- Kiểm tra có highlight rõ, chỉ gửi đề cử ở OK, Khôi Phục trả cờ về đống lửa, double tap danh sách vẫn có thể xác nhận.
- GM và Player Web compiled tương ứng source, Worker kiểm tra cú pháp, bảo vệ OTA phiên bản V3.206 và checksum SHA-256 khi phát hành.
- Không dùng bài kiểm thử Card Chrome, Seat, hoặc tác vụ không liên quan để chặn Runtime V3.206.

## An toàn / rollback
- Không thay đổi cấu trúc hoặc xóa dữ liệu.
- Chỉ phát hành khi CI Lên Giàn + Worker thiết yếu SUCCESS trên cùng main SHA, phiên bản OTA hợp lệ, SHA-256 và Production health SUCCESS.
- Nếu nghiệm thu không đạt, rollback Worker/Runtime về V3.205, dữ liệu trận giữ nguyên.
