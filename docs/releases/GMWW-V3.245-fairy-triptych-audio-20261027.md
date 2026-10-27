# GMWW Runtime V3.245 — Yêu Tinh một icon ba nhánh + Audio hành động

- Thay icon Yêu Tinh xoay cũ bằng **đúng hình liền ba nhánh biển xanh–vàng kim được duyệt**, một WebP nền trong suốt; không tách icon hoặc thêm hộp nền.
- Chạm vùng trái = dịch vết cắn trái; vùng giữa = Không dịch; vùng phải = dịch vết cắn phải. Kéo icon chỉ đổi vị trí, không thực hiện.
- Không bấm lựa chọn thì không tự chuyển vết cắn. Chạm một lần gửi action_transfer_bite hướng left/none/right lên Server; phía Server kiểm tra actor và hướng.
- Chạm icon hành động phát audio đã gán. Audio xác nhận sau Server ACK, undo và luật Core giữ nguyên.
- Phạm vi: iCon GM, audio, Yêu Tinh, bảo mật payload. Không đổi IPA, Player Web, Durable Objects/phòng/lịch sử.
- Kiểm thử: cùng ảnh và SHA-256 ở static/OTA, ba vùng chạm, audio và xác nhận Server, build GM/Worker, OTA SHA-256. Rollback V3.244.
