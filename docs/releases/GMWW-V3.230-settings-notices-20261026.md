# GMWW Runtime V3.230 — Thông báo hệ thống cho 16 công cụ (26/10/2026)

## Sửa giao diện
- **Cài đặt → 02 Kiểm tra & bảo trì**: bảng **Thông báo hệ thống** duy nhất, nằm bên dưới toàn bộ lưới **16 nút công cụ** (tùy chọn tự kiểm tra 2 phút không được tính là nút).
- Đưa dòng thông báo **TỐI ƯU DO** và **HEALTHY CHECK** vào bảng chung. Không còn trạng thái chen vào lưới tạo ô lệch.
- Các công cụ Kiểm tra, Dọn Cache, Cloudflare, Vận hành, Server và Chẩn đoán đưa tiến trình/kết quả về cùng hộp; phần thông tin kỹ thuật chuyên sâu ở các panel bên dưới vẫn được giữ nguyên.
- Bảng kính mờ theo theme Biển; mới nhất trên cùng, trạng thái đang chạy/đạt/cảnh báo/lỗi, thời gian theo thiết bị; tối đa 12 dòng cuộn, nút Xóa lịch sử tạm thời (không xóa dữ liệu Server, phòng, game).
- Toàn bộ thông báo chỉ lưu trong bộ nhớ phiên GM; không tăng lượt ghi Durable Objects, không gửi thông tin riêng tư qua API mới.

## Phạm vi kiểm thử
- 16 nút tồn tại, bảng thông báo nằm ngoài lưới; loại bỏ các status inline gây tràn.
- Thông báo mới nhất lên đầu, trạng thái có style riêng, giới hạn lịch sử, Xóa, escape bằng textContent; không sửa dữ liệu gameplay.
- Đảm bảo bundle GM ghép từ source; kiểm tra phiên bản Worker/Runtime và cú pháp JS/CSS/HTML liên quan.
- Không kiểm thử Chrome Card, Seat, IPA, Arena3D, hoặc role/gameplay ngoài phạm vi.

## Rollback
- Có thể rollback Worker và OTA về V3.229 đã phát hành với SHA-256; không xóa hoặc thay đổi dữ liệu DO.
