# GMWW Arena 3D — GĐ46: Player chọn hành động và mục tiêu trực tiếp trên nhân vật 3D (05/11/2026)

PR #581 (Draft). Phạm vi: chỉ STAGING `gmww-arena3d-stage14-staging`. Production, IPA, Player Web gốc và dữ liệu không đổi.

## Mục tiêu
Từng bước thay cơ chế "mở iframe rồi thao tác trong Player Web" bằng thao tác ngay trên làng 3D, nhưng **Core vẫn là nguồn duy nhất** về luật, quyền và kết quả.

## Thay đổi
- `assets/village/arena-3d/player-bridge.js` (mới, chỉ chạy khi nằm trong khung Player Web của STAGING): chuyển tiếp menu hành động của chính người chơi và lệnh "chọn hành động / chọn mục tiêu / hủy" vào luồng Player Web có sẵn (`gmwwOnlinePickAction` → `gmwwOnlineTarget` → `POST /action`). Chỉ gửi: key, tên, số mục tiêu, cờ noSelf/blocked, danh sách người chơi công khai và dòng thông báo. Không gửi credential, role, phe hay dữ liệu lá bài. Chỉ nhận tin từ đúng khung cha, cùng origin.
- `stage46-direct-actions.mjs` (mới): hàm thuần kiểm tra và làm sạch tin nhắn, quy tắc chạm mục tiêu (không chọn trùng, tôn trọng noSelf, chỉ người chơi có trong danh sách Core).
- `player-actions.mjs` (mới): module duy nhất của Player 3D được nói chuyện với khung Player Web. `player.mjs` vẫn chỉ-đọc, không có `postMessage`.
- `player.html` / `player.mjs`: thanh hành động ở đáy màn hình; khi đang chọn hành động, chạm một nhân vật (dùng `field.pick`) để chọn mục tiêu. Khung Player Web được tải ẩn ngay khi vào phòng để cầu hoạt động; nút "Lá Vai / Hành động" vẫn mở đầy đủ như cũ (vote, chat, lá bài, Lên Giàn vẫn dùng đường cũ).
- `src/arena3d-player-entry.mjs`: chèn thêm thẻ script cầu (cùng điều kiện STAGING như entry hiện có).

## Không thay đổi
Luật game, kết quả đêm/ngày, vote, Lên Giàn, audio, phân quyền, Production Player Web (`src/player-web-src`).

## Kiểm thử (đã chạy, PASS)
- `tests/arena3d-stage46-direct-actions.test.mjs`: 10/10 — làm sạch tin nhắn, không rò dữ liệu riêng, chặn tin sai origin/sai nguồn, quy tắc mục tiêu, script cầu chạy trong môi trường giả lập, `player.mjs` vẫn không có `postMessage`.
- Cập nhật `tests/arena3d-gm-staging-bridge-20261105.test.mjs`: chọn script entry theo id vì trang nay có thêm thẻ cầu.
- Hai test bảo vệ nguyên tắc "Player render chỉ-đọc" (`arena3d-player-public`, `arena3d-stage39-main-first`) giữ nguyên và PASS.

## CHƯA kiểm chứng
- Chưa chạy trên trình duyệt thật hay STAGING (môi trường làm việc không truy cập được STAGING). Cần xác nhận: (1) Player Web trong khung ẩn vẫn nhận hành động đúng, (2) chính sách CSP của trang không chặn script cầu, (3) chạm nhân vật trên iPhone chọn đúng mục tiêu, (4) các lá có chọn hướng/dấu hiệu (Chuyển Cắn, Sát Thủ) vẫn dùng hộp thoại cũ của Player Web.
- Chưa kiểm từng lá trong 107 lá; mới chứng minh đường truyền chung.
- Chưa đo hiệu năng iPhone khi khung Player Web chạy ẩn.

## Ảnh hưởng Production
Không. Chỉ STAGING; chưa phát hành Runtime mới.

## Rollback
Quay Worker STAGING về version trước trên Cloudflare, hoặc revert commit GĐ46 trên nhánh `feature/arena3d-g39-main-first-candidate`. Production không tham gia.
