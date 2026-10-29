# GMWW – Đề xuất cập nhật GM Chat và 3 icon GM (28/10/2026)

**Trạng thái:** PR chờ nghiệm thu CI, chưa merge, chưa phát hành Production/Runtime OTA.

## Nội dung thay đổi
- Đổi nút Chat trên GM Server từ 💬 sang 🦩, không khung; chạm mở/đóng khung Chat đang có. Player Web vẫn dùng 💬.
- Đặt 3 icon GM độc lập ở bên phải menu timeline: ☠️ Giết; ❤️‍🩹 Cứu (hồi sinh người đã chết); 🤐 Cấm chat/Mở chat.
- Dùng kéo icon đến người chơi để thực hiện hoặc chạm icon rồi chọn người từ danh sách; yêu cầu GM xác nhận.
- Luôn có 3 icon trong thời gian vào trận (cả Ngày/Đêm), không phụ thuộc lượt Vai Trò, không hao lượt; tái sử dụng /gm/interaction và /gm/chat/moderate với quyền GM, cập nhật từ Server.
- Cấm chat là công tắc từng người, dùng tiếp để bỏ cấm. Chat vẫn được phân quyền server-side theo luật hiện tại.
- Không thay đổi API Player Web, luật 63 vai/44 Artifact, IPA, dữ liệu và lịch sử.

## Kiểm thử đúng phạm vi
- `node --check server-game/current/app.js`
- `node .github/scripts/assemble-gm-app.mjs --verify`
- `node --test tests/gm-admin-top-chat-20261028.test.mjs`
- CI pull request `Check GM Chat Flamingo and 3 Persistent Actions`.
- Cần GM kiểm tra giao diện kéo/thả trên iPhone thật sau phát hành.

## Phát hành / khôi phục
- Chưa phát hành. Chỉ merge/đẩy Production khi có phê duyệt phát hành và CI bắt buộc SUCCESS.
- Khi phát hành Runtime OTA, tăng version/manifest, kiểm tra SHA-256, ghi release notes tiếng Việt, giữ artifact baseline để rollback.
- Nếu hồi quy, rollback Runtime OTA về bản đã xác minh gần nhất; không đụng dữ liệu phòng, lịch sử, IPA.
