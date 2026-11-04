# GMWW Runtime V3.302 — Đồng bộ realtime GM ↔ Player Web + 4 lỗi Player Web

Ngày: 04/11/2026 · Phạm vi: Worker (Player Web + phát audio) và Runtime GM (OTA). Không đổi IPA, DO schema, URL, dữ liệu.

## Lỗi đã sửa
1. Icon hành động hiện dưới đáy màn hình thay vì tại đống lửa làng.
2. Kéo icon hành động bị trễ, giật trên iPhone.
3. Chỉ vai đang đến lượt nghe audio; người chơi khác không nghe.
4. Đồng hồ, khung chat thu gọn và nút Khôi phục lệch chiều cao; bỏ icon ↶, chỉ giữ chữ "Khôi phục".
5. Player Web đã sang ban ngày nhưng GM Server vẫn đứng ở lượt đầu, lát sau mới giật qua.

## Nguyên nhân gốc
1. Rule CSS `!important` cũ ghim `#gmwwOnlineDock` xuống đáy, đè vị trí đống lửa do `gmwwOnlinePlaceAtFire` tính.
2. Mỗi `pointermove` đọc layout trong iframe làng (hit-test + tâm người chơi) và icon kéo có `transition left/top 90ms`.
3. Audio lượt chỉ có `audioUrl` sau khi GM tải lên; người chơi chỉ biết ở lần poll `/me` tiếp theo, và mỗi lượt tạo `Audio()` mới nên iOS chặn tự phát nếu người đó chưa chạm màn hình (vai đang hành động thì vừa chạm).
4. Cột nút 38px trong khi khung chat thu gọn cao hơn; nút Khôi phục có icon + chữ 8.5px.
5. Khi chuyển app trên iPhone, socket GM chết im lặng; GM không đồng bộ khi quay lại và chỉ poll khi socket báo đóng (backoff tới 10 giây).

## Thay đổi
- Worker: GM tải audio lượt thành công → broadcast `announcement_ready` cho mọi người chơi.
- Player Web: phát audio lượt qua WebAudio đã mở khóa (fallback HTMLAudio); bỏ ghim đáy, icon nằm tại đống lửa và tự đặt lại khi xoay/đổi kích thước; kéo bằng `transform` 1 lần/khung hình, cache vị trí người chơi 350ms; footer 3 ô cao 44px, nút chỉ chữ "Khôi phục".
- Runtime GM V3.302: quay lại app (visibility/pageshow/focus/online) → nối lại socket + đồng bộ ngay; watchdog đồng bộ nếu 8 giây không có tin hoặc lượt đã hết giờ trên Server mà chưa nhận lượt mới.

- Audio tự phát: ngoài chạm menu, chạm vào cảnh làng (iframe) cũng mở khóa âm thanh; quay lại trang/app thì tự bật lại bộ phát và phát tiếp audio lượt đang chờ. Người chơi muốn tắt thì dùng nút 🔊/🔇 trong khung chat.

## Rollback
- Worker: rollback phiên bản trước trên Cloudflare (gmww-v2-00).
- Runtime: khôi phục V3.301 từ GitHub Releases; không xóa dữ liệu.
