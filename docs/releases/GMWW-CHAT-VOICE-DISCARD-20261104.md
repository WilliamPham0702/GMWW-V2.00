# GMWW Chat thoại — Hủy bản ghi trước khi gửi (04/11/2026)

## Phạm vi
- GM và Player Web có nút 🗑️ cạnh nút mic, chỉ xuất hiện khi đang ghi hoặc có bản nháp thoại.
- 🗑️ đang ghi: dừng MediaRecorder, loại bỏ dữ liệu thoại, hủy yêu cầu gửi đang chờ, không POST.
- 🗑️ sau ghi: bỏ bản nháp local, trả lại khung nhập chữ.
- Chặn callback mã hóa âm thanh cũ khôi phục bản nháp đã hủy bằng phiên bản generation; không xóa tin nhắn thoại đã gửi và không đụng dữ liệu Server.
- Không tự gửi thoại: vẫn phải nhấn ↑, không đổi giới hạn 30 giây.

## Quyền micro iOS: phát hiện riêng, chưa thay đổi IPA
- Bản hiện hành gọi `getUserMedia({audio:true})` khi stream không còn và dừng track khi `visibilitychange` chuyển sang hidden hoặc `pagehide`; phát hành V3.294 đã có cơ chế cache tạm 120 giây.
- Native GM dùng `WKWebView` (file URL) trong `server-game/GMWW-Server/GameView.swift`, không thấy triển khai `webView(_:requestMediaCapturePermissionFor:initiatedByFrame:type:decisionHandler:)`. `Info.plist` cũng chưa có `NSMicrophoneUsageDescription`.
- Vì vậy không thể cam kết chấm dứt cửa sổ cấp quyền *qua mỗi lần mở lại IPA* chỉ bằng JavaScript/Runtime OTA. Muốn kiểm soát quyền ổn định hơn cần PR native riêng, thêm khai báo micro và `WKUIDelegate` với chính sách cho phép đúng nguồn tin cậy, rồi phát hành IPA (cần phê duyệt riêng).
- Giữ việc ngắt capture khi ứng dụng vào background để bảo vệ quyền riêng tư, tránh giữ micro mở liên tục.

## Kiểm thử bắt buộc trước merge
- `node --test tests/gmww-chat-voice-discard-20261104.test.mjs tests/gmww-chat-live-meter-fast-send-v3294.test.mjs tests/gmww-chat-voice-send-v3292.test.mjs`
- Required CI trên HEAD cuối, kiểm tra bundle GM/Player.
- Nghiệm thu: ghi → hủy; ghi → dừng → hủy; ghi → gửi ↑ bình thường; gửi lỗi → hủy; kiểm tra không có tin rác trên GM và Player.

## Giới hạn phát hành
Không tự thay đổi IPA, Production, DNS hay dữ liệu; chỉ phát hành sau khi CI SUCCESS và được chỉ đạo. Rollback bằng Runtime/Worker đã xác minh trước đó.
