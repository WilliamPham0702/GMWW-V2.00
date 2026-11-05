# Player Web + GM: lá bài mini, thông báo lỗi, nút MỞ ĐỀ CỬ (05/11/2026)

- **Player Web:** lá Vai Trò/Artifact thu nhỏ trong làng luôn hiện mặt lưng đã duyệt; nếu ảnh lá lỗi thì tự quay về mặt lưng, không còn ô "?".
- **Player Web:** lỗi hành động hiển thị tiếng Việt dễ hiểu (vd. "Bạn đã dùng hành động này hoặc chưa đến lượt của bạn."), không lộ mã lỗi `DEMO_ACTION_ALREADY_USED_OR_NOT_YOUR_TURN`.
- **GM Lên Giàn:** chữ **MỞ ĐỀ CỬ** căn giữa nút; icon đặt cố định bên trái, không đẩy chữ lệch.
- Phạm vi: không đổi luật game, DO, dữ liệu. Rollback: revert PR.
