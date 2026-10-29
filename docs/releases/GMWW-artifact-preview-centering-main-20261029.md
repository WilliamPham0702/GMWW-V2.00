# GMWW — Căn giữa ảnh Artifact, bảo vệ lá Vai Trò (29/10/2026)

## Vấn đề
Mặt Player Web của một số Artifact, điển hình Kim Cương Phủ Nhận, có lề đen bên trái lớn hơn bên phải khiến viền artwork lệch khung. CSS hiện đã đặt ảnh giữa nhưng không thể xử lý lề trống có sẵn bên trong file ảnh.

## Sửa
- Chỉ trong Thư viện → Mặt Player Web, khi đang xem Artifact: phân tích mẫu canvas nhỏ để phát hiện **lề tối bất cân xứng**, đặt transform ngang cho ảnh có độ tin cậy đủ cao.
- Đảm bảo **Vai Trò không áp dụng biến đổi**; đổi lá, đổi Artifact/Vai Trò hoặc ảnh lỗi sẽ dọn transform cũ.
- Giữ nguyên tên, luật, audio, dữ liệu gốc của hình, IndexedDB, IPA, Player Web và trạng thái ván.
- Giới hạn cắt lề để tránh mất chi tiết hình; không can thiệp vào ảnh có lề cân đối hoặc không nhận dạng đủ rõ.

## Kiểm thử đúng phạm vi
- `node --test tests/artifact-preview-horizontal-centering-20261029.test.mjs` (7 ca)
- `node --check server-game/current/app.js`
- `node .github/scripts/assemble-gm-app.mjs --verify`
- `node .github/scripts/verify-gmww-versions.mjs`

## Phát hành & rollback
Chỉ merge, phát hành Runtime OTA khi mọi required CI liên quan đều SUCCESS, phiên bản OTA/manifest SHA-256 được tạo và xác minh. Không đổi IPA. Rollback bằng revert commit và OTA manifest cuối cùng đã xác minh; không tác động dữ liệu/lịch sử.
