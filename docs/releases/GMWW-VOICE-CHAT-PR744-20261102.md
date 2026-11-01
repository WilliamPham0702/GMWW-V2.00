# GMWW — Tin nhắn thoại 30 giây (PR #744)
Ngày chuẩn bị: 02/11/2026. **Trạng thái: CHƯA PHÁT HÀNH.**

## Phạm vi
- Player Web và giao diện GM: ghi tối đa 30 giây, nghe thử, hủy/gửi và mở nghe thủ công trong Chat.
- Ghi âm cục bộ bằng MediaRecorder (MP4/AAC hoặc WebM/Ogg nếu được trình duyệt hỗ trợ); không dùng ElevenLabs, không gọi API chuyển giọng nói và không thêm dịch vụ lưu trữ.
- HTTP API xác thực bằng session thành viên hoặc GM bearer; từng lần đọc byte âm thanh đều kiểm lại quyền Chat của kênh hiện thời. Không phát clip qua WebSocket và không ghi payload âm thanh vào lịch sử Chat dạng public DTO.
- Byte âm thanh được lưu ở key `onlineChatVoice:<uuid>` của room Durable Object (SQLite-backed storage). Tin Chat chỉ lưu `{voice:{durationMs,mime}}`; không chứa base64/URL public.
- Giới hạn 512 KiB/clip; tối đa 80 clip còn hiệu lực/phòng. Khi hết hạn 72 giờ, API từ chối phát và lần tải thoại tiếp theo dọn những clip hết hạn (lazy GC; **không có cam kết xóa vật lý đúng mốc thời gian nếu phòng không còn hoạt động**).
- Khi quá hạn mức hoặc microphone lỗi, Chat chữ và gameplay vẫn dùng được.

## Kiểm thử bắt buộc
- `tests/voice-chat-do-20261102.test.mjs`: bytes hợp lệ/giả, 30s, 512KiB, chống payload không giới hạn, DO lưu riêng, người dùng không có quyền, đổi kênh bí mật, hết hạn, GM auth.
- Worker dry-run, source/bundle verify, required CI Policy Gate/V3 Release Gate SUCCESS trên cùng commit SHA.
- Nghiệm thu thiết bị thật: iPhone Safari/Chrome/Edge; microphone permission, recording indicator, dừng tự động 30s, nghe thử, cancel, gửi, nhận, tải nghe và Chat chữ fallback; thử giữa hai người; GM riêng; chết/đuổi/đóng băng, đêm và nhóm bí mật; reconnect/mất mạng.
- Kiểm tra URL `gamemasoi.pages.dev` vẫn giữ nguyên, không thay DNS/IPA và dữ liệu Production.
- Bản GM Runtime thật đã đổi: **không merge/phát hành khi chưa có bản OTA tăng phiên bản, .gmwwupdate, SHA-256, release notes và kiểm tra rollback**.

## Rollback
Trước triển khai, lưu commit/phiên bản Production đang chạy. Nếu sức khỏe Worker, quyền riêng tư hoặc audio lỗi: trả Worker về commit Production trước PR; giữ nguyên DO và tin nhắn có sẵn, không xóa data, không đổi IPA/URL. Nếu đã phát hành GM Runtime OTA, dùng lại Runtime ổn định trước đó qua cơ chế cập nhật/rollback đã được xác minh. Không phát hành chỉ vì mã nguồn đã merge.
