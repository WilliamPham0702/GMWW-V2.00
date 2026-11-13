# src/worker — Worker GMWW tách theo tầng

`src/index.js` chỉ còn là điểm vào: giữ hằng số phiên bản/cấu hình (công cụ phát hành đọc tại đó),
nạp chúng vào `config.js`, rồi export `RoomDurableObject` và router.

| Thư mục | Tầng | Nội dung |
| --- | --- | --- |
| `http/` | Giao tiếp | `router.js` (bảng định tuyến `fetch`), các hàm API của người chơi / GM, trang Player Web, JSON + CORS, giới hạn tần suất |
| `room/` | Điều hành ván | Các nhóm phương thức của `RoomDurableObject`, mỗi file một việc (thành viên, phòng người chơi, treo cổ, timeline đêm, chu kỳ, bảo vật, chat…) |
| `support/` | Hạ tầng | Băm mật khẩu, mã phòng, ảnh, nhân vật, âm thanh thông báo |
| `../gmww-*-rules.js` | Luật game | Hàm thuần, không đụng HTTP hay storage (đã có từ trước, giữ nguyên chỗ) |

Quy ước:

- `room/room-durable-object.js` khai báo lớp và ghép các nhóm bằng `installRoomMethods` (`room/compose.js`).
  Thêm nhóm mới: tạo `room/<tên>.js` export `class Room<Tên>Methods { ... }` rồi thêm vào danh sách ở file đó.
- Module trong `room/`, `http/`, `support/` lấy hằng số từ `config.js`, không import ngược `src/index.js`.
- Test và script CI cần đọc "toàn bộ mã Worker" thì dùng `.github/scripts/worker-source.mjs`
  (`workerSource()` gộp lại thành một module, `workerModuleSource(name)` lấy một file).
