# GMWW Runtime OTA V3.268 — Bảng Ván Mẫu hít menu dưới

- Bước 3: Chọn Ván Mẫu mặc định thu gọn sát thanh menu dưới thay vì thành popup chặn toàn sân.
- Vuốt phần tiêu đề để tách, kéo sát lại menu dưới để hít; vị trí lưu trong localStorage theo từng máy, không ghi Server.
- Nút mũi tên thu gọn bảng còn tiêu đề, nhấn lại để mở; menu dưới vẫn tương tác được.
- Chế độ chỉnh sửa Ván Mẫu ở Thư viện vẫn là hộp thoại độc lập.
- Kiểm thử: DOM, đường đóng/mở, dock, restore và CI đúng phạm vi; bản Runtime mới giữ IPA Native V3.264.
- Rollback sang Runtime V3.265 khi phát hiện lỗi; không thay đổi dữ liệu, vai trò, Artifact hay lịch sử.
