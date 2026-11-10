# Player Web: Ván Mẫu đầy đủ — 10/11/2026

## Thay đổi

- Thay màn hình “Tạo ván” rút gọn bằng bộ thiết kế Ván Mẫu tương ứng với GM Server.
- Hỗ trợ Vai Trò, số lượng, thứ tự, thời gian riêng từng vai, thời gian thảo luận/Lên Giàn/Sói/Artifact, Auto GM và bộ Artifact.
- Cho phép chọn, sửa và xóa Ván Mẫu do người chơi tạo; mẫu GM chỉ được chọn, không bị sửa hoặc xóa từ Player Web.
- Khi chọn mẫu, Worker nạp tham chiếu artwork Artifact dùng chung. Máy chủ trộn Vai Trò và Artifact kín; chủ phòng không thấy phân phối cá nhân.
- Giữ nguyên URL, IPA, Runtime, dữ liệu Production và cấu trúc Durable Object; không có migration.

## Kiểm thử và phát hành

- Chạy test Player Room, cấu hình Ván Mẫu, phân phát Artifact kín và kiểm tra source bundle theo đúng phạm vi.
- Bắt buộc `CI Policy Gate` SUCCESS trên HEAD cuối cùng trước khi merge/phát hành.
- Phát hành Worker-only; xác minh HTTP health và JavaScript Player Web sau deploy.
- Rollback bằng cách khôi phục Worker deployment trước đó; giữ nguyên cấu hình và dữ liệu phòng.
