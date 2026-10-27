# V3.257 — Cập nhật thủ công

Bốn nút Tự Động / Thủ Công / Tải IPA / Đồng bộ Web cùng một hàng trên iPhone.
Thủ Công mở Tệp, xác minh toàn bộ gói .gmwwupdate trước khi xin xác nhận cài.
Gói chứa manifest và bytes nhị phân đọc từng file (không nạp toàn bộ gói vào RAM), không tải lại file qua mạng. Kiểm tra đường dẫn,
file trùng/thiếu, SHA-256, phiên bản IPA tối thiểu và giới hạn dung lượng.
Cần IPA mới có native document picker một lần; IPA cũ hiển thị hướng dẫn nâng cấp.
Không đổi dữ liệu phòng, tài khoản, Core hoặc lịch sử.

Mỗi lần phát hành tạo gói từ chính bytes OTA đã kiểm tra, lưu artifact và đính kèm
GitHub Release sau xác minh Production. File .sha256 đi kèm kiểm tra tải xuống.
SHA-256 là kiểm tra toàn vẹn, không phải chữ ký nhà phát hành: chỉ cài gói GMWW tin cậy.

Cài vào thư mục mới, chỉ chuyển con trỏ active sau thành công. Giữ con trỏ Runtime
trước đó để rollback; khi không có Runtime trước thì dùng bản trong IPA.
Nếu phát hành lỗi: khôi phục deployment Worker trước và Runtime trước; không xóa DO.

Kiểm thử: đóng gói round-trip, bytes hỏng, thiếu entrypoint, đường dẫn không an toàn,
bố cục bốn nút; cú pháp/assemble/version; Xcode build bắt buộc trước phát hành IPA.
