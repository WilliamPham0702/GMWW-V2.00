# Sửa cuộn và cập nhật Thiết kế Ván Mẫu

- Vẫn lấy trạng thái phòng mỗi 4 giây nhưng không dựng lại editor đang mở: giữ con trỏ, bàn phím, ô đang nhập và cuộn.
- Thay đổi vai/số lượng giữ cuộn dọc, ngang và mục mở rộng. Phòng mất quyền/đóng hoặc vào trận vẫn cập nhật bình thường.
- Kiểm thử callback polling thật hai lần trên Chromium/WebKit, ba kích thước iPhone/iPad; tái hiện bản cũ và xác nhận luồng lưu/chọn mẫu.
- Worker-only; giữ IPA/Runtime/URL/dữ liệu. CI SUCCESS trước phát hành, snapshot và rollback qua V3.
