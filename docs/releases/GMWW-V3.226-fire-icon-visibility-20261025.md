# GMWW Runtime V3.226 — Sửa icon bị che phía sau màn hình làng

Ngày 25/10/2026.

## Lỗi và nguyên nhân đã xác minh
- Bộ icon hành động được tạo bên dưới `document.body` ở lớp `z-index: 125`, trong khi trang Làng GM toàn màn hình `#start.play-page.active` có `z-index: 1000`.
- Trên iPhone, dù actionId đã được ánh xạ và icon được tạo, chúng bị trang làng phủ kín; GM không nhìn thấy để kéo thả.

## Đã sửa
- Nâng lớp hiển thị `.battle-fire-icon-dock` lên `z-index: 1200` (cao hơn làng), giữ lớp ghost kéo thả cao hơn dock và thuộc tính [hidden].
- Giữ 49 hình icon, ánh xạ Vai Trò và Artifact, bật/tắt Icon trong menu GM.
- Giữ thao tác `pointerdown/move/up`, snap người chơi, chọn nhiều mục tiêu và gọi xác nhận hành động Core. Khôi phục tiếp tục dùng cơ chế hiện hành; không sửa Core.
- Bump Runtime, HTML cache-busting và manifest OTA lên V3.226. Không phát hành IPA.

## Kiểm thử và điều kiện phát hành
- `node --test tests/gmww-action-icon-stacking.test.mjs tests/gmww-action-icons-in-battle.test.mjs`.
- `node .github/scripts/assemble-gm-app.mjs --verify` và `node .github/scripts/verify-gmww-versions.mjs`.
- CI Worker cùng SHA, OTP/OTA manifest, SHA-256 và kiểm tra file `style.css` thực tế trên Production.
- Không chạy test Card Chrome, Seat, DEMO, IPA hoặc gameplay không liên quan.

## Rollback
Khôi phục Worker/Runtime OTA V3.225 theo bản lưu/chốt SHA-256, không xoá Durable Objects, phòng, ván, tài khoản hoặc IPA.

**Giới hạn:** chưa thể xác nhận thao tác trực tiếp trên iPhone vật lý bằng pipeline; người dùng nghiệm thu hiển thị/kéo thả sau khi OTA được phát hành.
