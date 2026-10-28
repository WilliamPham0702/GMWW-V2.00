# Player Web Online trên nền Làng — 28/10/2026 (Ứng viên)

## Đã triển khai trên nhánh riêng
- Giữ nguyên màn hình làng đang chơi, không tự mở trang lá bài khi phát Vai Trò. Mở lá đầy đủ khi chọn lá mini.
- Khi phòng Online chạy, hiển thị lá Vai Trò và Artifact của chính người chơi ở phía trên, dưới menu Timeline, kích thước bề ngang tối đa 25% lá chuẩn.
- Chat 💬 không hộp nền, nằm ở giữa menu dưới. Chạm mở; chạm ngoài hoặc 30 giây không tương tác đóng. Khung Chat thu gọn có vùng xem lịch sử cuộn.
- Timeline của Player Web sử dụng phase và audioCue lấy qua API riêng /me, không tiết lộ chủ nhân các lượt bí mật. Thông báo audio hiện dùng giọng đọc Player Web, không giả định đã phát đúng file audio gốc từ GM.
- Nhãn Vai Trò của chính người chơi luôn hiện trên nhân vật trong ván. Đồng đội cùng một nhóm Vai Trò được phép thấy nhau chỉ khi đang cùng lượt có từ hai thành viên hợp lệ, Server cấp riêng qua /me; không chuyển quyền riêng tư qua public WebSocket.
- Menu trên và icon Chat ẩn khi không có tương tác sau 30 giây, chạm vào làng mở lại.

## Chưa đạt / Không phát hành
- Icon hành động Online dạng kéo thả giống GM cần cơ chế cấp action offer và thực thi Server xác thực riêng cho từng Vai Trò; phần executor 107 lá còn ở PR #584.
- Timeline chưa dựng đầy đủ mọi ô/hành động của GM và audio vẫn là announcement cue + TTS, chưa đạt đồng bộ byte audio gốc.
- Chưa kiểm thử thiết bị iPhone thật, chưa xác nhận CI và chưa phát hành Production/OTA.
- Không thay đổi IPA hay xoá dữ liệu/phòng lịch sử.

## Kiểm thử đúng phạm vi
```bash
node --test tests/player-web-online-village-20261028.test.mjs tests/online-chat-authority.test.mjs
node .github/scripts/assemble-player-web.mjs --verify
node --check src/index.js
node --check src/gmww-members-live.js
```

Rollback: revert PR sau khi merge (nếu đủ điều kiện). Production Runtime V3.271, OTA và IPA hiện hành giữ nguyên cho tới khi có bản phát hành đạt kiểm chứng.
