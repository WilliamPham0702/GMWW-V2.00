# GMWW Runtime V3.297 — Gọi người Online & Tập hợp tuần tự

Ngày: 04/11/2026. Loại: Runtime OTA (không thay IPA).

## Có gì mới
- ONLINE: GỌI NGƯỜI mở danh sách để GM tự chọn và xác nhận; **không còn tự thêm toàn bộ thành viên đang Online**. Danh sách mặc định lọc thành viên Online.
- TẬP HỢP: bốn bước sáng lần lượt **Gọi người → Seat Mẫu → Ngẫu nhiên/Thủ công → Chốt vị trí**. Ngẫu nhiên và Thủ công là hai tùy chọn ở cùng một bước.
- Chốt vị trí chỉ mở khi mọi thành viên đã có Seat. Khi thay đổi danh sách thành viên, GM chọn lại Seat Mẫu. Bước trước vẫn có thể sửa khi chưa khóa.
- Luồng dưới cùng và menu phụ cũng dùng cùng điều kiện; không thể chốt tắt trước khi hoàn tất.

## Kiểm thử phát hành
- `tests/online-gather-wizard-20261104.test.mjs`: lựa chọn người, thứ tự mở nút, hai cách xếp chung bước, và đồng bộ app từ source modules.
- Required CI trên HEAD cuối phải SUCCESS trước merge; xác minh Worker/Runtime Production và checksum SHA-256 của file .gmwwupdate sau phát hành.
- Không đổi IPA, dữ liệu thực, lịch sử hoặc URL.

## Rollback
- Giữ Runtime OTA V3.296 và bản phát hành GitHub tương ứng. Khi V3.297 lỗi, dùng gói V3.296 đã xác minh SHA-256 và khôi phục Worker/Runtime theo quy trình phát hành trước đó.
- Không xóa hay ghi đè phòng, tài khoản, phiên chơi hoặc dữ liệu lưu trữ trong thao tác rollback.
