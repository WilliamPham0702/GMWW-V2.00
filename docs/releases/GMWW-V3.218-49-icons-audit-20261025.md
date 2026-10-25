# GMWW Runtime V3.218 — Bộ 49 Icon theo kiểm kê thực tế

Ngày 25/10/2026. Kế thừa toàn bộ Runtime V3.217; không thay đổi Gameplay, phòng, Player Web hay IPA.

- Tích hợp 10 PNG/SVG riêng biệt 1024×1024, số 40–49: Phiếu Con Quạ; Cắn Chuyển Hóa; Chọn Hình Tượng; Xem Artifact; Đổi Artifact; Công Khai Vai Trò; Sao Chép Chức Năng; Hủy Artifact; Buộc Quay Mặt; Sáng Tạo Artifact.
- Tổng 49 icon chủ đề Biển, ảnh không cắt từ sprite và không sử dụng icon hệ thống iPhone.
- Kiểm kê người dùng: 63 Vai Trò, 44 Artifact, 36 dòng, 34 actionId duy nhất; các mã dùng chung giữa Vai Trò và Artifact không tạo icon thừa. Đã gán đủ các mã trong danh sách bằng 39 icon cũ và 10 icon mới phù hợp.
- Chuyển đổi thư viện cục bộ V4→V5, bảo toàn icon tự tạo/đã chỉnh sửa ngoài những mã hành động đã xác minh; với hành động không có mục tiêu sử dụng đích loại none.
- Tài nguyên OTA có manifest SHA-256 toàn bộ PNG/SVG. Runtime V3.218 trên IPA shell V3.110, không cần cài IPA mới.

**Kiểm thử liên quan:** node --test tests/action-icon-library.test.mjs tests/action-icon-card-clean.test.mjs; kiểm tra bundle GM và phiên bản; OTA SHA-256. Không chạy Seat, Card Chrome, Demo hoặc Gameplay không liên quan.

**Rollback:** hoàn nguyên Worker/OTA V3.217 bằng checksum đã xác minh, giữ nguyên dữ liệu phòng và nội dung người chơi.
