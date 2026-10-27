# GMWW GM — Đi bộ ra đống lửa và chạy về (2026-10-27)
- Bỏ hoàn toàn hiệu ứng Bay/Chạy cũ; GM đến lượt đi bộ tới vị trí theo hướng ngồi quanh vành đống lửa, không đứng lên lửa; hết giờ, chuyển lượt hoặc quay lại sẽ chạy về Seat cũ.
- Hỗ trợ mọi hướng, kể cả bốn góc; tối đa 16 vị trí quanh vòng lửa, tránh chồng nhân vật khi có nhiều người cùng lượt.
- Compositor WAAPI 1 lần khi đi ra, 1 lần khi về; giữ atlas Walk/Run có sẵn. Không tạo requestAnimationFrame hoặc timer mới; đứng yên tạm dừng rig để tiết kiệm pin.
- Chỉ render ở GM; Player Web, Room DTO/Seat, Core gameplay, dữ liệu và IPA không đổi.
- Nút menu GM đổi nhãn thành **Đi bộ**, tôn trọng chế độ Giảm chuyển động iOS và trạng thái ẩn màn hình.
- Kiểm thử phù hợp GM walk/return, hết giờ, hoạt ảnh, phiên bản gộp mô-đun, và rollback: revert commit; nếu đã phát hành OTA phải dùng phiên bản khôi phục tăng số, không rollback dữ liệu.
- Ứng viên Runtime OTA V3.256 trên nền V3.255; chỉ xác nhận phát hành khi Production CI, OTA SHA-256 và HTTP đạt.
