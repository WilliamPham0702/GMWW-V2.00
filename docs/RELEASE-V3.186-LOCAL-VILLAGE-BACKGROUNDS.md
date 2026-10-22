# GMWW Runtime V3.186 — Ảnh nền lưu trên thiết bị

Ngày: 22/10/2026. Runtime OTA và Player Web; không thay IPA shell.

- Lưu dữ liệu ảnh Ngày/Đêm và cấu hình đã xác nhận vào IndexedDB riêng, một bản ghi nguyên tử cho mỗi server.
- Khởi động khôi phục và giải mã ảnh local trước khi đồng bộ server. Không chờ mạng để hiển thị ảnh đã lưu; chuyển Ngày/Đêm dùng cùng cặp local.
- Kiểm tra cấu hình ngầm; không tải lại ảnh khi đường dẫn phiên bản không đổi. Cặp ảnh mới chỉ thay cặp cũ sau khi tải và giải mã thành công.
- Khôi phục mặc định lưu cả trạng thái mặc định, tránh tái hiện ảnh tùy chỉnh cũ khi mở lại.
- Không lưu lịch sử ảnh tăng dần. Không sửa seat, nhân vật, luật, audio, dữ liệu thành viên/phòng/ván hoặc IPA.
- Lần đầu sau cập nhật cần kết nối để lấy cặp ảnh hiện có và lưu local; không cần import lại. Xóa dữ liệu ứng dụng/trình duyệt sẽ xóa bản local.
- Nếu thiết bị không cho lưu local, GM báo lỗi lưu thay vì báo hoàn thành.

Kiểm thử: bộ kiểm thử Node gồm tải ảnh, lưu/đọc IndexedDB, mở lại offline, chuyển ngày/đêm offline, giữ cặp cũ khi tải lỗi, khôi phục mặc định và tính đồng nhất GM/Player. Worker dry-run, phiên bản và nguồn GM được kiểm tra trước PR. Chưa thay thế nghiệm thu trên iPhone thật.

Rollback: giữ nguyên dữ liệu server; hoàn nguyên thay đổi runtime bằng bản phát hành tiến phiên bản theo gate hiện có. Kho local mới tách biệt, runtime cũ bỏ qua; không xóa kho thành viên/phòng/ván. Chỉ merge khi mọi CI bắt buộc thành công; deployment chạy pipeline SHA-256 và OTA hiện có.
