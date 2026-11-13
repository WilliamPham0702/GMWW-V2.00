# Chơi nhanh trên Player Web

- Chủ phòng đăng nhập, mở phòng Online, gửi mã hoặc link và bấm Bắt đầu.
- Phòng chờ hiển thị bộ vai thu gọn theo Ván Mẫu mặc định đúng số người, gồm chủ phòng.
- Chơi nhanh dùng lại xếp ghế, phát vai riêng và Auto GM. Chủ phòng có thể tạm dừng hoặc đưa nhóm về cùng phòng để chơi lại.
- GM đánh dấu mẫu qua trường `quickPlayDefault` trong API lưu Ván Mẫu. Mỗi số người có một mẫu mặc định được bảo vệ khỏi tự dọn. Cần kiểm tra bộ vai, tài nguyên lá bài và chạy thử trọn ván trước khi bật mẫu trên Production.

Rollback về bản Worker đã xác minh trước PR. Tắt mẫu mặc định bằng `quickPlayDefault: false` qua API lưu mẫu nếu cần ngừng dùng một mẫu.

Đánh dấu mẫu mặc định trên Production: chạy workflow **Quick Play Defaults** (bật `apply`). Mỗi số người lấy Ván Mẫu GM mới nhất có tổng vai đúng số người, bật Auto chuyển lượt và đủ ảnh thẻ vai; revision giữ nguyên.
