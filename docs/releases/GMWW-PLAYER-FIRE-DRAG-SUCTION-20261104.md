# GMWW Player Web — Icon hành động đúng đống lửa, kéo theo tay + hút vào, nổi bật ↶ Khôi phục

Ngày: 04/11/2026 · Phạm vi: Player Web / Worker-only (không đổi Runtime GM, IPA, DO, dữ liệu, URL)

## Lỗi
- Player Web đặt icon hành động tại mốc GP2 (50,64) thay vì vị trí đống lửa GM đã đánh dấu trên ảnh nền → lệch so với GM Server.
- Nhấn/kéo icon: icon gốc đứng yên ở đống lửa, chỉ một bản sao đi theo tay.
- Nút ↶ khôi phục ở menu dưới mờ, khó nhận biết.

## Sửa
- Iframe làng: `.fire` dùng `fireAnchors` đã xuất bản (marker → tâm ảnh → mốc GP2), cùng quy tắc `villageFirePosition()` GM. Cache key `fire3301` / `3301-fire`.
- Kéo: icon rời đống lửa và đi theo ngón tay; gần người chơi hợp lệ thì hút vào + hiệu ứng thu vào khi thả; thả trượt/hủy → bay về đống lửa. Quyền hành động vẫn do Server xác thực.
- Nút ↶ có nhãn "Khôi phục", viền vàng, nhấp nháy khi có thể khôi phục.

## Rollback
- Worker rollback về phiên bản trước trên Cloudflare (gmww-v2-00).
