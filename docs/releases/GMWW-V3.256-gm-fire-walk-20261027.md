# GMWW Runtime V3.256 — GM đi bộ ra đống lửa, chạy về chỗ cũ

**Nội dung cập nhật**
- Bỏ hoàn toàn hiệu ứng bay lên theo lượt V3.253.
- Vai trò hoạt động đi bộ từ mọi vị trí Seat, kể cả 4 góc, đến điểm trống quanh vành ngoài đống lửa. Không xuyên qua/lên giữa lửa. Nhiều vai trò được phân bổ điểm trống riêng.
- Đứng yên trong thời gian hành động; hết thời gian hoặc chuyển lượt chạy bộ về đúng vị trí cũ bằng atlas Walk/Run có sẵn. Khi về đến chỗ ngồi, atlas Idle ngừng vẽ liên tục.
- Nút Menu GM đổi thành **Đi bộ**; giữ hiệu ứng mục tiêu chạy tại chỗ và chế độ giảm nóng.
- Animation dùng WAAPI GPU compositor theo hai chặng, không tạo timer/rAF mới; atlas giới hạn 15 FPS, tôn trọng iOS Reduce Motion/ẩn tab.
- Không thay đổi Player Web, Core, Room/Seat, ảnh/nội dung Artifact, Durable Objects, dữ liệu/tài khoản/phòng/lịch sử, hay IPA shell V3.110.
- CI chỉ chạy kiểm tra hành trình 4 góc/8 vai, animation đi/đứng/chạy, timeout, đồng bộ module, Worker, OTA và SHA-256.
- Rollback: bản Production V3.255 tại `5700420ae0c03717765bb1afc2ae923bec194a0a`. Khôi phục Worker và catalog/manifest đúng checksum, không can thiệp DO hoặc lịch sử. iPhone đã nâng OTA phải nhận một bản khôi phục có số Runtime cao hơn V3.256 vì chống downgrade.
