# GMWW Runtime V3.253 — Bay/Chạy GM chống nóng iPhone

**Cập nhật:** Nhân vật đang đến lượt bay lên đúng một chiều cao nhân vật và trở về ghế sau lượt. Người được chọn làm mục tiêu chạy tại chỗ, không di chuyển Seat. Nút Bay/Chạy trong Menu GM bật/tắt trên chính thiết bị GM; Player Web không nhận hiệu ứng.

**Tiết kiệm năng lượng:** đóng băng khung vẽ khi các nhân vật đứng yên, dừng vòng requestAnimationFrame khi không còn đối tượng chạy; mục tiêu chạy giới hạn tốc độ vẽ 15 FPS; tránh tạo vòng timer/poll mới, dừng khi ẩn màn hình hoặc bật iOS Giảm chuyển động. Tối ưu mã nguồn không đồng nghĩa đảm bảo thiết bị không nóng; cần nghiệm thu trên iPhone thực.

**Tính tương thích:** phát hành Runtime OTA V3.253 từ nền V3.252 và giữ tất cả tính năng UI, Rule, phòng, lịch sử, Worker Durable Objects; không thay IPA hoặc native shell V3.110.

**Kiểm thử chốt:** chỉ test Bay/Chạy, mô-đun GM, nguồn runtime, cú pháp và Worker, phiên bản manifest, SHA-256 OTA. Bỏ qua Chrome Card/Seat/IPA không liên quan.

**Rollback:** phục hồi Worker/OTA tại commit Production V3.252 và release catalog/manifest đúng checksum, không thay đổi dữ liệu DO. Thiết bị đã lên V3.253 phải dùng bản khôi phục có số phiên bản mới hơn để tuân thủ chống downgrade OTA. Có thể tắt hiệu ứng tức thời từ nút Bay/Chạy.
