# Phòng online do người chơi tạo — PR-A: nền tảng và giới hạn (08/11/2026)

Phạm vi: chỉ chế độ online, chỉ Worker. Không đổi offline, không đổi luồng GM hiện tại (`POST /api/rooms`), không đổi Runtime/IPA.

## Thêm mới
- `POST /api/player-rooms`: người chơi đã đăng nhập (session thành viên) tạo phòng online.
  - Trả `roomCode`, `ownerToken`, `joinUrl`, `websocketUrl`. **Không bao giờ trả `gmToken`.**
  - Body không thể bật demo, offline, hay quyền GM; phòng luôn `roomMode=online`, AutoGM bật.
  - Chỉ lưu hash của `ownerToken` trong phòng (`meta.ownerTokenHash`); quyền set-up của chủ phòng sẽ thêm ở PR-C.
- Giới hạn, kiểm tra nguyên tử trong member store (`blockConcurrencyWhile`):
  - Tối đa **5 phòng người chơi** hoạt động cùng lúc.
  - Mỗi người **1 phòng** hoạt động (trả `OWNER_ALREADY_HAS_ROOM` kèm mã phòng cũ).
  - Tối đa **30 ghế**.
  - Phòng được tính hoạt động nếu chưa `ended/deleted` và có cập nhật trong 30 phút.
- Danh sách phòng công khai chỉ có cờ `playerRoom:true`; tên đăng nhập chủ phòng lưu riêng (`playerroom:<mã>`), không lộ ra danh sách.
- Mã phòng đã tồn tại (kể cả phòng GM) không bao giờ bị ghi đè.

## Không thay đổi
- `POST /api/rooms` (GM Server) giữ nguyên, vẫn trả `gmToken`.
- Phòng GM không có thêm trường mới trong `meta` hay bản ghi danh sách phòng.

## Việc còn lại (PR sau)
- PR-B: phòng trống 30 phút tự xoá (hiện vẫn 72 giờ), dọn `playerroom:`.
- PR-C: chủ phòng set-up, chốt seat, ẩn vai.
- PR-D/E/F: AutoGM mặc định cho phòng người chơi, giao diện Player Web, GM Server vào phòng.
- Khoá `POST /api/rooms` chỉ cho GM cần cập nhật app GM (Runtime OTA) vì app hiện gọi không kèm token.
- Token GM chung đang nằm cứng trong `src/index.js`; nên chuyển sang secret của Cloudflare.

## Kiểm thử
- `tests/player-room-create-20261108.test.mjs` (14 test): chính sách giới hạn, đặt chỗ nguyên tử khi gọi song song, không lộ `gmToken`/chủ phòng, body không nâng quyền, thử lại khi trùng mã, luồng GM không đổi.
