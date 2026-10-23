# Sửa tiếp PR #436–#438 — 24/10/2026

## Nguyên nhân và thay đổi
- `handleSeatSwapRequests` đã bị xóa khi bỏ đổi ghế cá nhân, nhưng luồng khôi phục phòng và nhận dữ liệu riêng vẫn gọi hàm này.
- ReferenceError làm khôi phục dừng ở danh sách chỉ có chính mình, chưa kết nối WebSocket/poll; nhận Vai Trò và Artifact dừng trước khi gán lá.
- Loại bỏ hai lời gọi cũ trong mã Player Web được phát hành; giữ nguyên GM quản lý vị trí.
- Bổ sung kiểm thử thực thi hai luồng, không giả lập hàm đã bị xóa; bổ sung log lỗi trình duyệt trong CI.

## Kiểm chứng và phát hành
- Hai test hồi quy đã tái hiện FAIL trước sửa và PASS sau sửa.
- Phải chờ Worker CI, Chrome/Edge realtime và Browser CI SUCCESS trước nghiệm thu.
- Không đổi schema, không xóa phòng/dữ liệu, không sửa IPA native. Chưa triển khai Production.
- Rollback: revert commit sửa trên PR này; không có migration cần đảo ngược.
