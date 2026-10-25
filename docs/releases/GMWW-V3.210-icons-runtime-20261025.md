# GMWW Runtime V3.210 – Bộ Icon hành động (25/10/2026)

## Thay đổi
- Thêm 19 icon hành động PNG nền trong suốt 1024 × 1024, có 19 tệp SVG độc lập, thuộc bộ chủ đề Biển đã nghiệm thu ngày 25/10/2026; không sử dụng ảnh cắt từ sprite tổng hoặc icon iPhone.
- Trang **Thư viện → ICON** hiển thị ảnh thật: tìm kiếm, thêm/sửa/xoá, tải ảnh riêng, khôi phục, gán actionId và kiểm kê các hành động Artifact lưu trên thiết bị GM.
- Gán icon cho 26 hành động Vai Trò mặc định, tận dụng icon chung với những hành động tương tự; riêng Yêu Tinh có hai hướng độc lập. Hành động chọn nhiều mục tiêu, chọn hướng và chọn lá bài được phân loại đúng.
- Đóng gói `action-icon-library.js` và 19 ảnh PNG vào Runtime OTA V3.210, kê khai SHA-256 cho toàn bộ file, giữ IPA native shell 3.110.
- Giữ nguyên mọi cập nhật Runtime V3.209 trước đó (Audio, Lên Giàn, Core, đồng bộ); không chỉnh sửa bất kỳ dữ liệu phòng/ván/DO nào.

## Giới hạn đã công bố
- Đây là phát hành tài nguyên và Thư viện Icon, **không** kích hoạt cơ chế kéo thả ở đống lửa, chốt mục tiêu và công tắc Bật/Tắt trong menu GM.
- Artifact thực được nhập động, không tự gán icon cho Artifact chưa xác minh từ danh mục.

## Kiểm thử và bảo vệ phát hành
- Bắt buộc: `node --test tests/action-icon-library.test.mjs`, `node .github/scripts/assemble-gm-app.mjs --verify`, `node .github/scripts/verify-gmww-versions.mjs`, `node --check` mã đóng gói OTA.
- Bắt buộc khi phát hành: `prepare-update-channel.mjs runtime` và xác minh manifest SHA-256 Runtime V3.210; bản trên Server phải có đầy đủ 19 PNG.
- Kiểm tra các file tài nguyên, không tự chạy Chrome Card/Seat/DEMO/IPA ngoài phạm vi.

## Rollback
- Nếu Runtime V3.210 không đạt: khôi phục bản Worker/OTA V3.209 có checksum đã xác minh, không xoá dữ liệu Durable Objects, phòng hoặc hồ sơ.
- Không đổi Native IPA, không tăng minimum shell; iPhone hiện tại nhận cập nhật Runtime OTA.
