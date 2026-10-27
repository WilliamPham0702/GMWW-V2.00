# GMWW — Hiệu ứng đến lượt bay lên / mục tiêu chạy tại chỗ (27/10/2026)

**Trạng thái:** PR #562 đã được phê duyệt phát hành Runtime OTA V3.253. Chỉ đánh dấu phát hành sau khi Production và SHA-256 được xác nhận.

## Nội dung cập nhật
- Trong lượt Đêm, nhân vật thuộc nhóm được gọi thực hiện chức năng bay lên một chiều cao nhân vật. Ban Ngày, nhân vật của hành động GM đang chọn được áp dụng hiệu ứng tương tự.
- Người được chọn làm mục tiêu chạy tại chỗ từ bộ ảnh nhân vật hiện có. Kết thúc/chuyển lượt/bỏ mục tiêu: trở lại tư thế đứng; tọa độ Seat và luật game không đổi.
- Nút **Bay/Chạy** trong menu GM bật/tắt hiệu ứng, lưu cục bộ trên thiết bị GM. Không truyền trạng thái hiệu ứng qua Room DTO, không thêm hiệu ứng lên Player Web.
- Chống nóng: chỉ nhân vật mục tiêu mới phát khung hình chạy (tối đa 15fps), nhân vật còn lại tạm dừng bộ vẽ Canvas; khi tất cả đều đứng yên, vòng requestAnimationFrame dừng hoàn toàn. Không tạo mới timer hoặc poll; vẽ lại khi có thay đổi hoặc atlas tải xong.
- Khi Safari ẩn tab, iOS yêu cầu giảm chuyển động, nhân vật chết/đóng băng/bị đuổi hoặc bật tắt nút: dừng hiệu ứng tương ứng.

## Kiểm thử đúng phạm vi
- Lệnh: `node --check server-game/current/app.js`, `node --check server-game/current/gmww-shared-motion.js`, `node --test tests/gm-turn-motion-lowheat.test.mjs`, `node .github/scripts/assemble-gm-app.mjs --verify`.
- Chỉ kiểm thử GM Character, lượt/mục tiêu, cài đặt hiển thị và tiết kiệm khung hình; giữ các chốt cú pháp/Worker bắt buộc.
- **Không kiểm thử** Chrome lá bài, Seat 30, OTA và IPA nếu không bị tác động. FPS/nhiệt độ thực tế chỉ xác nhận bằng máy iPhone thật.

## Rollback
Revert riêng các commit của PR này, giữ nguyên main/Production và dữ liệu Room/DO. Nút **Bay/Chạy** còn cho phép tắt hiệu ứng lập tức trên GM khi đã phát hành.
