# GMWW Runtime V3.235 — đồng bộ giao diện kính mờ (26/10/2026)

- Chuẩn hóa các box/menu trong mục Chơi, khi vào trận, Thông cáo, chọn mục tiêu và Lên Giàn theo thanh Tập Hợp đã duyệt: chiều cao nhất quán, bo góc, viền biển sáng, nền kính mờ bán trong suốt. Giữ nguyên Character, Seat và bản đồ.
- **Đêm:** Đồng hồ – Hành động – Khôi phục. **Ngày:** Đồng hồ – Báo – Hành động – Lên Giàn – Khôi phục. Các nút Ngày dùng chữ thay vì biểu tượng emoji; đồng hồ giữ số đếm ngược và thao tác vuốt chỉnh thời gian.
- 🌈 thống kê phe tách ra icon nổi tự do như 🐦‍🔥, kéo thả và lưu vị trí local trên thiết bị GM; không nổi khi Đêm.
- Nút Cài đặt **CLOUDFLARE** chỉ còn một dòng và giữ cùng kích thước các box khác, không đổi chức năng quản trị.
- Chỉ UI Runtime GM. Không thay đổi Core, Player Web, IPA, Durable Objects, dữ liệu phòng hay luật vote.

## Kiểm thử và phát hành
- Kiểm thử đúng phạm vi CSS/HTML/phase dock/drag và nút Cài đặt; kiểm tra nguyên vẹn sáu module, phiên bản và OTA SHA-256.
- Chưa xác nhận Production. Chỉ merge/triển khai khi CI bắt buộc thành công, kiểm tra deploy và OTA thật.

## Rollback
- Khôi phục Worker/OTA về V3.234; không thay đổi IPA, không xóa DO/dữ liệu phòng hoặc lịch sử.
