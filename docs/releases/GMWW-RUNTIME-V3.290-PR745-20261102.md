# GMWW Runtime V3.290 — Thông cáo Làng, trạng thái và giảm nhiệt iPhone

## Bao gồm PR #745
- Đồng bộ trạng thái **Đã Chết / Bị Đuổi / Bị Đánh Dấu** trên Player Web từ Server sau khi công bố, giữ bí mật ban đêm.
- Thông cáo Làng đỏ trong chat, thông báo Sát Thủ chọn đúng/sai theo Server đã xử lý. Người chơi màu riêng, GM đỏ.
- Chat ban ngày cao gấp ba ban đêm; thao tác nhấn ngoài để đóng và tự ẩn giữ nguyên.
- Nhân vật đứng yên trong ván, renderer Atlas ngừng vòng lặp vẽ khi không còn chuyển động; vẫn di chuyển trong Sảnh chờ.
- Runtime và Worker cùng phiên bản **V3.290**. Không đổi IPA V3.264, URL, luật chơi hoặc dữ liệu Durable Objects.

## Phát hành và an toàn
- Chỉ merge khi required CI Policy Gate, V3 Release Gate, Player Web, bảo mật và Worker/OTA đều SUCCESS trên HEAD cuối cùng.
- Kho GitHub Releases phải có `GMWW-Runtime-V3.290.gmwwupdate` và file `.gmwwupdate.sha256` đúng bytes, không ghi đè phiên bản V3.289.
- Sau deploy xác minh Server Worker, Player Web, OTA metadata và link Pages; mọi công đoạn thất bại dừng phát hành.

## Rollback
- Khôi phục Runtime V3.289 và Worker deployment được xác minh trước PR #745; không xóa/reset phòng, data, DO, Releases hoặc IPA.
