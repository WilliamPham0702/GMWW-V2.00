# GMWW Runtime V3.234 — Menu Đêm/Ngày và danh sách Lên Giàn (26/10/2026)

## Giao diện điều chỉnh
- Khi **vừa vào trận và Ban Đêm**, thanh dưới giữ đúng ba mục: **Đồng hồ (đếm ngược) – Box Hành động – Khôi phục**. Nút Khôi phục chỉ khả dụng khi Server có hành động để hoàn tác.
- **Chỉ khi chuyển sang Ban Ngày**, thanh dưới đổi thành **Đồng hồ – 🏖️ Thông cáo – Hành động – ⛱️ Lên Giàn – 🌈 Thống kê phe**. Ẩn Khôi phục trong giao diện ban ngày, không xóa logic hoàn tác.
- **Trang Lên Giàn:** vùng danh sách hiển thị tối đa **5 người** (5 dòng × 39px = 195px), người thứ 6 trở đi xem bằng cuộn dọc. Giữ toàn bộ danh sách, thứ tự đề cử, thao tác cấm chọn/vote, GM chọn người, kết quả và đồng bộ.

## Kiểm thử và phát hành
- Chỉ kiểm thử Đêm → Ngày → Đêm, số lượng/nội dung dock, trạng thái Khôi phục, danh sách Lên Giàn 5 người và cuộn, cú pháp/bundle, version guard, OTA manifest/SHA-256 và Worker.
- Không chạy kiểm thử ngoài phạm vi như Chrome Player Card, Seat, DEMO, Arena 3D, Native IPA.
- Giữ nguyên gameplay Core, phòng, lịch sử, Player Web, Durable Objects và native IPA. Chỉ thay GM Runtime.

## Rollback
- Nếu lỗi sau cập nhật, rollback Runtime V3.233 và deployment Cloudflare trước đó. Không xóa dữ liệu Durable Objects hoặc thay IPA.
