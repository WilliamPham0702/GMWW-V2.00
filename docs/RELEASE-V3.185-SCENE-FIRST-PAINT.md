# GMWW Runtime V3.185 — First paint & khôi phục mặc định
**Ngày:** 22/10/2026  
**Loại:** Runtime OTA; giữ nguyên IPA và trạng thái Game.

## Sửa lỗi
- Khôi phục mặc định dùng cùng đường PUT xác thực đang hoạt động với nút ÁP DỤNG; không phụ thuộc yêu cầu POST riêng rồi GET lại để xác nhận.
- GM và Player Web đợi cấu hình Server và giải mã ảnh Ngày/Đêm trước khi hiển thị làng lần đầu: không lóe nền mặc định, không lóe màn xanh rồi mới thay ảnh.
- Ảnh tùy chỉnh là nền trực tiếp của stage và playWorld; bỏ lớp ảnh ::after, giữ Character/Seat/đống lửa và vùng kéo thả hiện có.
- Tắt các mảng đảo/trời/nước trang trí gốc khi đã áp dụng ảnh tùy chỉnh; hình nền mặc định chỉ hiện khi Server xác nhận reset.
- Không xóa dữ liệu thành viên, phòng, ván, Vai Trò, Artifact. Revision nội bộ tiếp tục đồng bộ bộ nhớ đệm.

## Gate
Chỉ merge và triển khai Production khi CI (Worker, seat 6–30, Character, WebKit/iPhone, GR01) SUCCESS; kiểm tra trên IPA và Player Web: reset, thay Ngày, thay Đêm, tải lần đầu, bật lại phòng, chuyển Ngày/Đêm, bảo toàn seat và dữ liệu.
