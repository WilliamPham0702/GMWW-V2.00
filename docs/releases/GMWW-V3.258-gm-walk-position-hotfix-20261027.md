# GMWW Runtime V3.258 — Hotfix nhân vật đi bộ ra đống lửa (PR #570)

**Lỗi:** iPhone hiển thị "ĐẾN LƯỢT" trên Yêu Tinh nhưng nhân vật không di chuyển khỏi ghế; chỉ xoay mặt.

**Khắc phục:** không còn animate `transform` của token đang được giao diện 2D dùng để căn vị trí. Dịch chuyển thật bằng CSS `translate` cộng thêm, độc lập với `transform` gốc. Đi bộ từ mọi góc đến một vị trí trống bên ngoài vòng lửa, quay mặt vào lửa khi đứng chờ, sau khi hết lượt hoặc hết giờ chạy về đúng Seat. Khi kết thúc xóa độ dịch chuyển; không thay đổi tọa độ server.

**Mặc định:** phím Đi bộ trên GM bật theo key riêng `GMWW_GM_FIRE_WALK_V2`, không kế thừa thiết lập tắt Bay/Chạy cũ. Có thể tắt để giảm chuyển động trên iPhone.

**Tối ưu nhiệt:** dùng hai hoạt ảnh GPU ngắn chỉ khi bắt đầu/kết thúc lượt, không thêm animation loop; character atlas giữ tiết kiệm pin, ≤15 FPS trên GM và dừng vẽ khi đứng. Tuân thủ iOS Reduce Motion/ẩn app.

**Tương thích:** Runtime OTA nâng từ V3.257 lên V3.258, giữ native shell V3.257 và IPA đã phát hành; giữ nguyên tính năng cập nhật thủ công V3.257, tất cả tính năng GM/Player Web, Room/DO, lịch sử. Không migration.

**Kiểm thử:** mô phỏng Yêu Tinh: khung hình phải thực sự đổi tọa độ so với Seat; đứng giữ độ dịch chuyển; kết thúc chạy về 0; 4 góc. Kiểm tra source bundle, Worker CI đúng phạm vi, manifest OTA & SHA-256 trước khi xác nhận phát hành. Nghiệm thu nhiệt/di chuyển thực tế trên iPhone sau Production.

**Rollback:** quay về commit Production V3.257 và catalog/manifest SHA phù hợp nếu chưa cài OTA; nếu máy đã cài V3.258, phát hành Runtime khôi phục có version lớn hơn, không downgrade; bảo toàn dữ liệu và IPA.
