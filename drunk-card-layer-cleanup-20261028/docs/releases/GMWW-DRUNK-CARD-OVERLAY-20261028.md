# GMWW — Sửa RULE Say Rượu: hiển thị lá và dọn trạng thái (28/10/2026)

## Nội dung cập nhật
- Dùng đúng artwork mặt lưng **Vai Trò** hiện hành cho GM và Player Web. Các lá bốc chỉ hiện dạng lá bài, không khung ngoài, tiêu đề, số thứ tự hay nút Hoàn tất.
- Player Web: chạm trực tiếp lá úp để bốc; chỉ trong lượt Say Rượu đêm 3 thuộc ván đang chạy. Dùng lớp hiển thị của màn hình game, không che dưới các popup. Sau khi chọn, trở về cơ chế nhận Vai Trò mới vốn có.
- GM: hiển thị bộ lá tại `#playShell` (màn hình trận), tránh tạo bảng nổi trực tiếp trên `body`; tự ẩn khi ra Trang Chủ, hết lượt hoặc khi ván kết thúc.
- Khi hoàn thành ván, chơi lại hoặc RESET phòng: chỉ xóa `drunkDeck:...` tạm theo ván, không xóa tài khoản, lịch sử xếp hạng, Vai Trò/Artifact hay dữ liệu Durable Objects khác. Tránh lá của ván cũ xuất hiện trở lại.
- Không đổi luật Say Rượu chỉ bốc một lá, chuyển phe/chức năng và luật Nhà Tinh Thần Học soi người bị Đuổi. Không chỉnh thứ tự xếp hạng đã chốt ở PR #505: nhiều ván hơn xếp trước, số ván bằng nhau mới xét tỷ lệ thắng.

## Kiểm thử đúng phạm vi
- `node --test tests/drunk-card-overlay-match-cleanup-20261028.test.mjs tests/drunk-draw-spiritualist-expelled-20261027.test.mjs tests/member-ranking-games-first-v3221.test.mjs`
- `node .github/scripts/assemble-player-web.mjs --verify`
- `node .github/scripts/assemble-gm-app.mjs --verify`
- `node --check src/index.js && node --check server-game/current/app.js`
- Cần CI của Worker và quy trình phát hành Runtime/OTA đúng phiên bản trước khi merge và triển khai Production.

**Trạng thái:** PR sửa lỗi, không công bố Production cho đến khi CI/OTA SHA-256 và rollback được xác minh. Không thay đổi IPA.

## Phát hành V3.260
- Runtime V3.260, giữ IPA shell V3.257; mặt lưng role-card-back.webp được đóng gói vào OTA và bản cập nhật thủ công.
- Phải xác minh SHA-256 OTA, health Production, ảnh lá trên Web và bản Runtime cài được; rollback V3.259; không được xóa lịch sử, thay luật xếp hạng.
