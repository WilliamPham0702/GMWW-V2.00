# GMWW Runtime V3.220 — Sửa icon Vai Trò & Artifact trong trận

Ngày 25/10/2026 · **Ứng viên OTA, chờ nghiệm thu iPhone — chưa phát hành Production**.

## Sửa lỗi trực tiếp
- Hiển thị icon hành động hợp lệ tại đống lửa dựa trên `actionId` và thư viện 49 icon của GM; luôn hiển thị trong lúc đồng bộ tạm thời (vô hiệu thao tác để tránh gửi lệnh trùng).
- Căn khay icon vào đống lửa bằng tọa độ màn hình thực, giới hạn trong khung iPhone khi xoay/zoom/di chuyển bản đồ; không tự dịch chuyển nhân vật hoặc đống lửa.
- Khi Thư viện Icon khởi tạo muộn hoặc GM sửa/gán ảnh, màn hình trận cập nhật ngay qua sự kiện cục bộ.
- Khi chức năng mới chưa có icon riêng, dùng tạm icon Đánh dấu đã có trong GMWW, gắn nhãn `icon chung`; **không tạo actionId hoặc đoán luật**.
- Giữ cơ chế kéo thả trên iPhone Safari, phát hiện mục tiêu ngay tại thời điểm thả ngay cả khi không có sự kiện pointermove cuối; nháy sáng mục tiêu được hút.
- Thực thi lựa chọn và chốt hoàn toàn qua `battlePickTargetWithAudio`, `battleConfirm` và Core đang vận hành; hành động nhiều mục tiêu chỉ chốt sau khi chọn đủ, những hành động đặc biệt đi qua menu hiện có.
- Giữ nguyên nút **ICON: BẬT/TẮT** trong menu GM và nút **Khôi phục** (undo token do Server cấp).

## Phạm vi và bảo vệ dữ liệu
- Chỉ GM Runtime: `server-game/src/40-battle-and-timeline.part`, `server-game/current/app.js`, `action-icon-library.js`, CSS và URL tải lại tài nguyên.
- Không thay đổi Core, gameplay, dữ liệu Durable Objects, Player Web, role rules, artifact rules hay IPA. Native shell không đổi.
- Bản phát hành Runtime V3.220 dùng OTA SHA-256, kiểm tra phiên bản tăng và giữ bản V3.219 để rollback.

## Kiểm thử trong CI
- `node --test tests/battle-fire-action-icons.test.mjs tests/action-icon-library.test.mjs`.
- `node --check server-game/current/app.js`, `node --check server-game/current/action-icon-library.js`.
- `node .github/scripts/assemble-gm-app.mjs --verify`, `node .github/scripts/verify-gmww-versions.mjs`.
- Chốt OTA: `prepare-update-channel.mjs runtime`, `verify-prepared-runtime.mjs 3.220` và SHA-256.
- Không mở test Chrome Card, 30 ghế, Demo, luật vai khác hoặc Native IPA ngoài phạm vi.

## Nghiệm thu còn cần
Kiểm tra trên iPhone thật: icon đúng xuất hiện ở đống lửa khi đến lượt Vai Trò/Artifact, kéo thả và chốt đúng mục tiêu, nhiều mục tiêu, nút Bật/Tắt, Khôi phục, xoay màn hình và lúc mất/kết nối lại mạng. Test mô phỏng iPhone/viewport trong CI không thay thế nghiệm thu iPhone thật.

## Rollback
Khôi phục Worker/OTA V3.219 theo checksum của bản đang chạy; không xóa phòng, người chơi, lá bài hoặc trạng thái ván.
