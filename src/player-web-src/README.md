# src/player-web-src — mã nguồn Player Web

`src/gmww-members-live.js` = nối tất cả file `.part` dưới đây theo thứ tự (nhóm theo số đầu tên thư mục,
trong nhóm theo số đầu tên file), đóng gói thành một chuỗi. Danh sách nhóm nằm ở `.github/scripts/source-groups.mjs`.

| Nhóm | Việc |
| --- | --- |
| `00-bootstrap-and-session/` | DOM + viewport, state và lưu phiên |
| `10-role-card-artwork/` | Ảnh mặt sau lá vai (nhúng sẵn) |
| `20-village-and-profile/` | Menu trên + timeline, HUD làng, di chuyển sảnh, thiết lập phòng, API + đăng nhập, hồ sơ, avatar, danh sách phòng |
| `30-rooms-and-realtime/` | Vào/rời phòng, hiệu ứng vai + tương tác, kẻ trộm / say rượu, trạng thái phòng + treo cổ, WebSocket, lá vai + bảo vật, DEMO |
| `35-online-chat/` | Box chat, âm thanh thông báo, tin thoại, hành động online, kéo thả lá bài |
| `36-gm-observer/` | Thanh GM0702 |
| `37-player-rooms/` | Phòng do người chơi tạo: API chủ phòng, các trang phòng/chỗ ngồi, ván mẫu + bộ bài, dock và gắn giao diện |
| `40-cards-and-game/` | Lá vai, trình bày, âm thanh |
| `50-privacy-and-runtime/` | Che lá vai, kết quả ván, tự vào lại phòng, cập nhật web, khởi động |

Quy tắc:

- Sửa mã trong file `.part`, rồi chạy `node .github/scripts/assemble-player-web.mjs --write`
  (`--verify` để kiểm tra nguồn và bản đóng gói khớp nhau từng byte).
- Tất cả file dùng chung một phạm vi (một IIFE), nên thứ tự file là thứ tự chạy.
- Test đọc mã một nhóm bằng `playerWebSource('35-online-chat')` từ `.github/scripts/source-groups.mjs`.
