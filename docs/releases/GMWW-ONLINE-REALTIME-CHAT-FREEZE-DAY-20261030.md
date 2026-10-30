# GMWW Online — 30/10/2026 (PR kiểm thử, chưa phát hành)

## Changelog tiếng Việt

1. Player Web: ngăn kết nối WebSocket cũ tự tái kết nối chồng với kết nối mới, đồng bộ tức thời qua sự kiện và làm mới khi iPhone quay về trình duyệt. Poll 5 giây chỉ là cơ chế dự phòng.
2. Neo icon hành động lên đúng tâm đống lửa trong làng, xử lý tọa độ iframe khi bị co giãn và khi iframe mới tải.
3. Bỏ avatar/nút tài khoản ở góc trên Player Web; nhấn đúp vào Character của chính người chơi mở menu tài khoản có sẵn, không tạo menu thứ hai.
4. Chat qua kênh được xác thực; khi có tin nhắn của người khác, thanh Chat chớp sáng cho tới khi người chơi mở xem. Tin nhắn đến cập nhật theo WebSocket chat_tick. Không gửi nội dung Chat vào WebSocket công khai.
5. Đóng Băng không cấm Chat; hiệu ứng Đóng Băng tự hết tại sáng hôm sau theo lifecycle Server. Quyền thảo luận/bỏ phiếu trở lại theo luật, trừ cấm vote/chat riêng độc lập.
6. Khi Đóng Băng hoặc bị Đuổi, vẫn **thấy** icon hành động đang đến lượt có dấu hiệu chặn, nhưng không thể thực hiện. Server từ chối yêu cầu bằng quyền hiệu ứng thực tế, kể cả khi bypass giao diện.
7. Menu Server ban ngày: **Đồng Hồ – Thông Cáo Làng – ⚖️ Cán Cân Đại Dương – Chat – Lên Giàn – Khôi phục**. Tận dụng Chat GM xác thực hiện tại (có trả lời tin riêng) và bổ sung ô gửi tin vào Chat Làng chung ban ngày. Chat chung được giới hạn bằng quyền GM ở Server, không gửi nội dung lên WebSocket công khai; làm mới theo sự kiện WebSocket. Hành động Ban ngày dùng icon trực tiếp tại làng như Ban đêm, bỏ ô hành động ngày.

## Phạm vi kiểm thử

- `tests/player-online-realtime-freeze-day-20261030.test.mjs`
- `tests/player-web-top-account-avatar-20261029.test.mjs` (đã chuyển thành test mở tài khoản qua Character)
- `tests/player-lobby-chat-interactions-20261030.test.mjs`
- `tests/player-web-online-actions-20261028.test.mjs`
- `tests/online-chat-authority.test.mjs`
- `tests/gmww-cycle-effect-expiry.test.mjs`
- `tests/gm-admin-top-chat-20261028.test.mjs`
- `node .github/scripts/assemble-player-web.mjs --verify`
- `node .github/scripts/assemble-gm-app.mjs --verify`
- `node --check src/index.js` và `node --check server-game/current/app.js`.

Yêu cầu nghiệm thu thiết bị thực: Safari, Chrome và Edge trên iPhone; đo độ trễ WS thực tế, Chat tin mới/ngắt mạng/reconnect, đóng băng Đêm → Sáng, thao tác icon trúng Character, kiểm tra GM ban ngày. **Chưa xác minh trên iPhone thật. Không tuyên bố CI SUCCESS trước khi kiểm tra check head PR.**

## An toàn và rollback

- Không thay đổi IPA, dữ liệu lịch sử, database schema, Durable Object namespace, cấu hình Production.
- Không tự động merge hoặc deploy. Chỉ phát hành khi required CI đạt SUCCESS, kiểm tra thiết bị xong và có phê duyệt theo AGENTS.md.
- Nếu phát sinh hồi quy sau khi được phê duyệt phát hành: rollback bằng revert commit/PR trong GitHub, deploy Worker/Player Web/GM Runtime từ artifact trước đó; giữ nguyên dữ liệu.
