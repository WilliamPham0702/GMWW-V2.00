# GMWW Runtime V3.205 — Lên Giàn / Cờ Đề Cử / Ẩn người chết (24/10/2026)

## Những thay đổi
- **GM – Lên Giàn:** Nút TỰ ĐỘNG/THỦ CÔNG chiếm tối đa khoảng 28% thanh trên; đặt số giây, đồng hồ đếm ngược và Khôi Phục trong cùng một hàng không bị đè nhau trên iPhone.
- **Player Web – Mở Đề Cử:** Bỏ thanh CHỌN NGƯỜI LÊN GIÀN/ĐỀ CỬ và nút cờ riêng góc dưới. Chỉ có **lá cờ hải tặc đỏ không có box** xuất hiện đầu tại đống lửa. Kéo lá cờ đến Character còn sống để đề cử qua Server; cờ có thể kéo tự do. Chạm hai lần vào cờ hoặc bấm Enter/Space để mở danh sách.
- **Lưới đề cử:** Mỗi người còn sống hợp lệ hiển thị một ô **VỊ TRÍ + TÊN**, hai cột; hai nút trên cùng **OK** (chỉ gửi khi đã chọn) và **KHÔI PHỤC** (xóa lựa chọn cục bộ để chọn lại); không tạo phiếu nếu chưa xác nhận. Server vẫn quyết định thời hạn, tư cách người đề cử, danh sách ứng viên và ghi phiếu.
- **GM menu – Character người chết:** Bổ sung nút **☠️ Hiện người chết / Ẩn người chết** vào menu tại đống lửa. Chỉ đổi lớp hiển thị trên GM, có lưu sở thích cục bộ; giữ người chết nguyên trong roster, dữ liệu trận, luật chơi, Player Web. Hồi sinh sẽ hiển thị lại Character đúng trạng thái.

## Kiểm thử liên quan trực tiếp
- Lên Giàn: CSS thanh ngang và các trường, cờ đỏ neo vào đống lửa, kéo thả nhắm Character, chạm đúp mở danh sách, OK/Khôi Phục, lọc người đã chết/bị hạn chế, quyền nhận phiếu ở Server, Ẩn/Hiện GM.
- Bundles GM (sáu source) và Player Web (sáu source) phải trùng bản đóng gói.
- Worker syntax, chốt bảo vệ Runtime V3.205, OTA manifest và SHA-256 trước phát hành.
- Không chạy Card Chrome/Seat hoặc phần game không liên quan như điều kiện chặn PR này.

## An toàn và rollback
- Không thay đổi cấu trúc Durable Objects, phòng, vai trò, Artifact, Seat, Character asset hay Native IPA shell V3.110.
- Không tự xóa dữ liệu; cập nhật Runtime OTA. Chỉ phát hành sau khi CI Lên Giàn + Worker thiết yếu SUCCESS cùng commit main và kiểm chứng manifest, SHA-256, health.
- Rollback về Worker/Runtime trước V3.205 theo quy trình rollback đã có nếu nghiệm thu iPhone không đạt.
