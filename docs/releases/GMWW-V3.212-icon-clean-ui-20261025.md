# GMWW Runtime V3.212 — Giao diện Thư viện ICON (25/10/2026)

- Bỏ dòng mã tiếng Anh `actionId` và các dòng hướng dẫn chọn mục tiêu/kéo thả khỏi **từng thẻ** trong Thư viện Icon.
- Mỗi thẻ chỉ còn hình PNG, tên hành động và nút **Sửa/Xoá**. Thanh tìm kiếm vẫn tra cứu được cả tên lẫn actionId ẩn; phần gán actionId trong màn hình Sửa được giữ nguyên để quản trị.
- Giữ toàn bộ 19 icon đã nghiệm thu, toàn bộ ánh xạ và chức năng kiểm kê Role/Artifact. Không chỉnh sửa game Core, Player Web, cơ chế chốt, hay dữ liệu phòng.
- Giữ IPA native shell V3.110, OTA Runtime V3.212, release notes tiếng Việt, SHA-256 theo manifest và rollback về V3.211.

**Kiểm thử đúng phạm vi:** cú pháp action-icon-library.js, `tests/action-icon-card-clean.test.mjs`, đối chiếu module GM, đồng bộ số phiên bản, bản đóng gói OTA có đủ script và 19 PNG. Không chạy bài test Seat, Card, DEMO hoặc Native IPA ngoài phạm vi.
