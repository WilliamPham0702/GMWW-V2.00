# GMWW Player Web — sửa icon người chơi hiện dấu hỏi

Ngày phát hành: 29/10/2026

## Khắc phục

- Sửa API ảnh nhân vật đang trỏ nhầm tới thư mục `portraits` không tồn tại trong gói Production.
- Chuyển API sang bộ ảnh `originals` đã được đóng gói và đang dùng cho 40 nhân vật GMWW.
- Bổ sung kiểm thử bảo đảm đường dẫn ảnh của cả 40 nhân vật đều trả về tài nguyên thật, ngăn Safari hiển thị biểu tượng ảnh lỗi `?`.

## Phạm vi

- Worker và Player Web.
- Không thay đổi IPA, Runtime OTA, phòng chơi, lịch sử hoặc dữ liệu người chơi.
