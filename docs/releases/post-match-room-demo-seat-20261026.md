# GMWW — Sửa lỗi Seat và chế độ DEMO sau khi kết thúc ván (ứng viên)

Ngày: 26/10/2026. Trạng thái: PR kiểm thử, **chưa phát hành Production**.

## Sửa lỗi
- Khi đã công bố kết quả và chọn **Phòng / Thoát**, GM yêu cầu Server RESET cứng phòng, trả thành viên về sảnh chờ, xóa Seat, phân vai và dữ liệu ván trước rồi mới chuyển giao diện. Nếu Server không xác nhận thì không giả vờ rời ván thành công.
- Giữ nguyên **Chơi lại** / **Chọn ván mới** để GM chủ động giữ nguyên nhóm người chơi; không tự xóa Seat khi vẫn muốn tái đấu.
- Chọn lại phòng đồng bộ huy hiệu chế độ từ trạng thái thực trên Server, không dùng giá trị DEMO cũ trong local registry.
- Khi rời DEMO ở phòng **đã kết thúc**, nếu dữ liệu ván cũ còn khóa đổi chế độ, GM tự RESET đúng phòng rồi thử lại Online/Offline. Không làm điều này trong ván đang chạy hay phòng có người chưa kết thúc.
- RESET cứng hoặc RESET sau trận đều xóa lease / clock / plan DEMO cũ; giữ lại bản ghi kết quả `matchCompletion` và lịch sử thành viên.

## Kiểm thử tập trung
- `node --test tests/post-match-room-cleanup.test.mjs tests/forced-end-game.test.mjs tests/match-completion-server.test.mjs tests/v3175-post-create-room-mode.test.mjs`
- `node .github/scripts/assemble-gm-app.mjs --verify`
- Các chốt CI Worker/build liên quan bắt buộc trước khi phát hành.

## Phạm vi, bảo toàn và rollback
- Chỉ sửa `src/index.js`, `server-game/src/30-village-and-setup.part`, `server-game/src/50-roles-and-artifacts.part` và app đã lắp ráp, bổ sung một test hồi quy.
- Không đổi iOS IPA, Character, Core vai trò hay Player Web UI. Không tự xóa phòng, tài khoản, xếp hạng hoặc lịch sử.
- Rollback bằng cách phục hồi bản Production và mã Runtime trước PR; không chạy lệnh xóa toàn bộ Durable Objects.
- Phiên bản Runtime/OTA, SHA-256 và xác minh trên iPhone phải được xác định ở lần phát hành chính thức sau phê duyệt.
