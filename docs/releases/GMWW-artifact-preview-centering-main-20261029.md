# GMWW — Căn giữa ảnh Artifact, bảo vệ lá Vai Trò (29/10/2026)

## Vấn đề
Mặt Player Web của một số Artifact, điển hình Kim Cương Phủ Nhận, có lề đen bên trái lớn hơn bên phải khiến viền artwork lệch khung. CSS hiện đã đặt ảnh giữa nhưng không thể xử lý lề trống có sẵn bên trong file ảnh.

## Sửa
- Chỉ trong Thư viện → Mặt Player Web, khi đang xem Artifact: phân tích mẫu canvas nhỏ để phát hiện **lề tối bất cân xứng**, chỉ dịch chuyển ngang cho ảnh có độ tin cậy đủ cao, không dùng scaleX/scaleY làm méo ảnh.
- Đảm bảo **Vai Trò không áp dụng biến đổi**; đổi lá, đổi Artifact/Vai Trò hoặc ảnh lỗi sẽ dọn transform cũ.
- Giữ nguyên tên, luật, audio, dữ liệu gốc của hình, IndexedDB, IPA, Player Web và trạng thái ván.
- Giới hạn cắt lề để tránh mất chi tiết hình; không can thiệp vào ảnh có lề cân đối hoặc không nhận dạng đủ rõ.

## Kiểm thử đúng phạm vi
- `node --test tests/artifact-preview-horizontal-centering-20261029.test.mjs` (8 ca)
- `node --check server-game/current/app.js`
- `node .github/scripts/assemble-gm-app.mjs --verify`
- `node .github/scripts/verify-gmww-versions.mjs`

## Phát hành & rollback
- Runtime OTA V3.274; chỉ merge khi các required checks liên quan SUCCESS.
- Gate phát hành xác minh đúng commit main đã đạt CI Player Web Worker, căn giữa Artifact, Vai Trò và CI Policy.
- Đóng gói cập nhật thủ công; manifest SHA-256 phải khớp bytes đã phát hành, xác minh health và OTA thực tế.
- Giữ nguyên IPA V3.264. Rollback về Runtime V3.273 hoặc revert commit theo quy trình OTA an toàn; không tác động dữ liệu/lịch sử.
