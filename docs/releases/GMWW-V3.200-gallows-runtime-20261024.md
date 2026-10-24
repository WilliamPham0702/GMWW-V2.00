# GMWW Runtime V3.200 — Phát hành Lên Giàn 24/10/2026

**Trạng thái:** Ứng viên Runtime OTA sau PR #457; chỉ phát hành khi CI phiên bản, Worker, trình duyệt, SHA-256 thành công.

## Nội dung thay đổi
- **PR #457:** Bảng Lên Giàn có giao diện rộng bằng menu trên, thu gọn chọn TỰ ĐỘNG / GM THỦ CÔNG, thống kê người còn sống theo số lần được đề cử giảm dần.
- Tính số phiếu đề cử và tỷ lệ theo người đủ quyền, số Cứu / Giết, cấm đề cử, cấm vote và Artifact cấm vote. Server quyết định kết quả.
- Tự động đồng bộ đề cử / bỏ phiếu với Player Web qua luồng gallows_updated hiện có, thủ công cho GM quyết định kết luận.
- Hiển thị 3 mục âm thanh có thể tải lên Thư viện: audio_system_gallows_vote_result, audio_system_gallows_result_dead, audio_system_gallows_result_saved; không tự tạo âm thanh giả.
- Kết luận theo Core Server, giữ lịch sử và xác nhận Khôi phục phù hợp. Dùng chung Online / Offline / DEMO.
- Tổng hợp công việc từ PR #455, #456, #457 vào Runtime V3.200 sau V3.199; không thay dữ liệu ván, phòng, Durable Objects, IPA native hay những phần nghiên cứu 3D.

## Phát hành và rollback
- Bump đồng bộ phiên bản Worker, HTML, app.js, package/package-lock và cache-bust; shell OTA giữ V3.110.
- CI ứng viên đóng gói files / sha256 / manifest V3.200, so sánh bản Production V3.199; cấm phát lại với cùng số phiên bản khi byte thay đổi.
- Sau deploy, xác minh /api/health, /api/update/manifest, IPA OTA và Player Web; nghiệm thu thực tế trên iPhone là bước cuối.
- Khi có lỗi: rollback Worker về deployment V3.199 và bảo toàn Durable Object; không sửa bytes của V3.200 đã được công bố.
