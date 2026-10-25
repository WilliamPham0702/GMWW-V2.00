# GMWW Runtime V3.211 — Bảng vinh danh Top 3 dạng bục 2.5D

Ngày: 25/10/2026. Phạm vi: giao diện Trang Chủ GM Server, khu vực Top 3 Tỷ Lệ Thắng.

## Nội dung cập nhật
- Thay ba thẻ Top 3 phẳng bằng sân khấu ba bục 2.5D vàng (hạng 1), bạc (hạng 2), đồng (hạng 3). Giữ bố trí trái 02 – giữa 01 – phải 03.
- Từng người thắng đứng trên bục bằng chính Character đã gán trong Thành Viên (ảnh nguyên thân WebP thuộc thư viện game), kích thước hiển thị khoảng gấp ba ảnh đại diện trước đó. Nếu file nguyên thân không tải được sẽ dùng portrait hiện có; không mất thống kê.
- Character tự nhún, lắc nhẹ qua hai phía theo nhịp ăn mừng. Hiệu ứng CSS transform không dùng canvas/WebGL; tắt hiệu ứng nếu thiết bị chọn Reduce Motion.
- Giữ tên, tỷ lệ thắng, số ván đã chơi và đường dẫn Xếp hạng. Kết quả được tải từ API thành viên hiện tại, tuyệt đối không dùng tên hoặc tỷ lệ thắng cố định từ ảnh minh họa.
- Đổi mã Runtime/GM cùng cache-busting asset sang V3.211, không nâng Native Shell IPA.

## Không thay đổi
- Logic tính thắng/thua, tài khoản, phòng chơi, lưu trữ DO, GM gameplay, Player Web, Arena 3D, lịch sử, tài nguyên và IPA.
- Bản minh họa thiết kế chỉ là concept, không gắn ảnh chụp làm giao diện động.

## Kiểm thử đúng phạm vi
- `node --check server-game/current/app.js`
- `node --test tests/home-top3-podium-v3211.test.mjs`
- `node .github/scripts/verify-gmww-versions.mjs`
- CI phát hành/OTA: kiểm tra chính xác SHA và điều kiện hiện có trước Production. Không đánh dấu PASS nếu chưa có kết quả.

## Phát hành, kiểm tra và rollback
- Chỉ merge khi các CI bắt buộc đạt SUCCESS và bản được phát hành có chứng từ SHA-256/manifest OTA đúng phiên bản.
- Sau deploy kiểm tra /api/health, tài nguyên GM app.js/style.css và giao diện Top 3 với dữ liệu thành viên thật.
- Nếu phát sinh sự cố, rollback Worker/Runtime về release Production liền trước thông qua quy trình rollback hiện hành, giữ nguyên dữ liệu phòng, thành viên và lịch sử. Không xóa tài nguyên Cloudflare.
