# Player Web Ván Mẫu — nạp danh sách Vai Trò dự phòng — 10/11/2026

## Sửa lỗi

- Editor Ván Mẫu lấy danh sách Vai Trò dự phòng từ các cấu hình Ván Mẫu Server đã tải.
- Lỗi tải Artifact không còn làm trống danh sách Vai Trò.
- Hiển thị trạng thái đang tải, lỗi tải và nút thử lại thay vì báo không có Vai Trò trước khi API hoàn tất.

## Phạm vi phát hành

- Worker-only / Player Web.
- Không đổi IPA, Runtime, URL, Durable Object schema hoặc dữ liệu phòng.
- Chạy CI Policy Gate, kiểm thử Ván Mẫu, Worker dry-run và xác minh Production sau khi phát hành.
- Có thể rollback bằng Worker version Production đã hoạt động trước đợt phát hành.
