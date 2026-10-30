# CI chia sẻ link Player Web — chưa phát hành

- Nhận diện chính xác ba khối HTML/CSS/JavaScript của tính năng chia sẻ link; nội dung bên ngoài phải giữ nguyên. Đường dẫn lạ, xóa file, marker trùng/lỗi hoặc thay backend không được thu hẹp phạm vi.
- Các job check/build/candidate tiếp tục kiểm thử phạm vi, phiên bản và toàn vẹn bundle; không xây IPA hoặc candidate V3.238 cho thay đổi chia sẻ link.
- Lên Giàn và 5 icon giữ kiểm tra cú pháp/toàn vẹn, không chạy assertion giao diện cũ khi không sửa các chức năng đó.
- Chặn cả deploy-production và GitHub Runtime OTA tự phát hành cho tính năng này và PR CI độc lập. Không đổi IPA, dữ liệu, version, backend hay luật game.
- Rollback: revert PR CI; không có dữ liệu cần khôi phục. Bản sửa này không phải phê duyệt phát hành.

## Bằng chứng lỗi ban đầu
- PR637 fd9d3f1: bộ chọn trả full; test hồi quy mới tái hiện trước sửa.
- Lên Giàn: gallows-hanging-anchor-walk, gallows-hanging-character, v3148-gallows-integrity thất bại.
- 5 icon: hai assertion gm-free-floating-shortcuts-20261025 về battleDayNoticeToggle/dock cũ thất bại.
- Candidate: gmww-v3238-uniform-gm-controls so bundle hiện tại với hợp đồng phiên bản cũ.
- Check/build: step gọi npm test ngoài phạm vi; log đầy đủ chưa lấy được qua connector (Transport closed), không tuyên bố đã xác định từng assertion.
