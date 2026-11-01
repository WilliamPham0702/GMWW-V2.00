# GMWW — Sửa lỗi thiếu ảnh Sói Thường khi chọn Ván Mẫu (02/11/2026)

- **Triệu chứng:** iPhone báo “Server không tìm thấy artwork gốc của role_wolf” khi chọn Ván Mẫu AUTO 3 người.
- **Nguyên nhân:** Worker dùng phiên bản V3.289 làm thư mục chứa ảnh gốc, nhưng asset gốc đang được đóng gói bất biến tại V3.119 (không có thư mục V3.289).
- **Thay đổi:** API xem trước lá Vai Trò và API đóng gói Ván Mẫu cùng ưu tiên đường dẫn hiện hành, và chỉ khi 404 mới đọc đúng artwork cùng roleId từ gói V3.119. Không dùng ảnh khác vai, không dùng ảnh lưu cũ. Không che lỗi 503.
- **Kiểm thử:** Unit cho hiện hành, fallback 404, 404 thật, 503; xác thực ba WebP gốc cần cho AUTO 3; kiểm thử route GET + đóng gói.
- **Phát hành:** Worker-only sau khi required CI SUCCESS. Không tạo Runtime OTA trùng nội dung; không thay IPA, Pages URL, DNS, DO hoặc dữ liệu thật.
- **Rollback:** Quay về Worker commit trước PR nếu smoke API hoặc chọn Ván Mẫu không đạt, giữ nguyên DO và assets.
