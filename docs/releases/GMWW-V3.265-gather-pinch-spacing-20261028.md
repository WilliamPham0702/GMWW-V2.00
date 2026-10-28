# GMWW Runtime OTA V3.265 – Chụm/banh vòng ghế trong Tập hợp

- Bỏ thanh trượt giãn cách, sử dụng cử chỉ hai ngón trên vùng sân chơi; 50%–300%, cập nhật giá trị trực tiếp trong khi thao tác.
- Giữ nguyên chọn ghế, đổi chỗ, kéo cả vòng, SEAT, khóa/Chốt vị trí; nút 🔄 chuyển lên cùng hàng Chế độ.
- Ở mức lớn, vòng ghế có thể rộng hơn khung nhìn: kéo vòng ghế một ngón để lần lượt tiếp cận vị trí ngoài màn hình.
- Preview chỉ cập nhật vị trí CSS, tránh liên tục tái tạo nhân vật; ghi một lần lên Worker khi thả tay; giữ Player Web dùng cùng phép tính tọa độ.
- Không đổi IPA Native V3.264, âm thanh, luật, dữ liệu người chơi, phòng và lịch sử.
- Kiểm tra: Node focused gesture/layout, GM assembler, Node syntax, version guards, CI bắt buộc đúng phạm vi, SHA-256 manifest Production.
- Rollback: sử dụng cơ chế rollback Runtime OTA về V3.264 (không hạ cấp database, không đổi IPA).
