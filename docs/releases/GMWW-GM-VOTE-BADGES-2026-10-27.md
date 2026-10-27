# GMWW GM — Tinh gọn thông báo và phiếu bình chọn (27/10/2026)

## Nội dung cập nhật
1. **Phù Thủy:** Bỏ bảng nổi **“🐺 VẾT CẮN · PHÙ THỦY”** chiếm sân chơi. Thông tin `nightIntel`, cơ chế Cứu/Giết và nhãn **MỤC TIÊU** trên nhân vật vẫn hoạt động đúng luật.
2. **Đề cử lên giàn:** Số phiếu đề cử trực tiếp đã xác minh từ server hiển thị **màu đỏ** và nảy nhẹ như bóng trên đầu người nhận phiếu. Không thêm vòng lặp JavaScript; dừng hoạt ảnh khi giảm chuyển động hoặc chế độ tối ưu hiệu năng kích hoạt.
3. **Bỏ phiếu:** Biểu tượng **👍 / 👎** trên đầu nhân vật hiển thị tự do, bỏ nền/viền/khung/đổ bóng.
4. Không thay đổi Core, Player Web, tài khoản, phòng, lịch sử, Durable Objects hoặc IPA.

## Kiểm thử đúng phạm vi
- `node --test tests/gm-gallows-vote-markers-ui.test.mjs`
- `node --check server-game/current/app.js`
- Kiểm tra chính xác `app.js` là phép nối của sáu `server-game/src/*.part` (được xác nhận trong test).
- Cần kiểm tra hình ảnh trên iPhone thật: Phù Thủy thấy nhãn MỤC TIÊU, số vote thay đổi realtime, 👍👎 không khung; ưu tiên giảm nhiệt.

## Phát hành và khôi phục
- Chỉ **Đã phê duyệt phát hành 27/10/2026.** Chỉ merge khi kiểm thử bắt buộc đúng phạm vi SUCCESS. Runtime OTA cần xác minh SHA-256 và rollback; bảo toàn IPA, phòng và lịch sử.
- Khi được phê duyệt phát hành, tăng Runtime OTA theo quy định, SHA-256, release notes và lưu bản rollback.
- Rollback mã bằng revert commit/PR; không xóa DO hoặc ghi đè dữ liệu người chơi.
