# GMWW Runtime V3.260 — hotfix nhân vật đến lượt đi bộ ra đống lửa

- **Nguyên nhân:** hoạt ảnh CSS transform ghi đè định vị token theo layout 2D iPhone, nên nhân vật chỉ quay mặt chứ không rời ghế.
- **Sửa:** dùng CSS translate độc lập để Walk từ Seat tới vị trí trống quanh đống lửa; khi đến nơi Idle hướng về lửa, kết thúc lượt Run về đúng Seat và xoá offset.
- **Giữ nguyên:** Core, Player Web, 6–30 Seat, Room/DO, tài khoản, lịch sử, Native IPA V3.257 và cập nhật Runtime thủ công.
- **Tiết kiệm pin:** không thêm requestAnimationFrame hay setInterval; tôn trọng giảm chuyển động và dừng animation khi không hoạt động. Tính năng đi bộ mặc định bật độc lập cài đặt Bay/Chạy cũ.
- **Kiểm thử trước merge:** tests/gm-fire-walk-position.test.mjs; gm-turn-motion-lowheat.test.mjs; assemble-gm-app.mjs --verify; cú pháp app.js, version, Worker CI đúng phạm vi. Kiểm tra OTA manifest SHA-256 sau deploy.
- **Nghiệm thu iPhone thực:** kiểm tra bốn góc, đến đứng quanh lửa, không bước vào lửa, quay đúng mặt, hết lượt chạy về đúng ghế.
- **Rollback:** nếu chưa cập nhật OTA, phục hồi bản Production V3.259; nếu đã cài V3.260 phải phát hành Runtime sửa khôi phục với số version cao hơn, không downgrade. Không chạm dữ liệu.
