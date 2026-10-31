# GMWW – Tin nhắn thoại Player Web, ưu tiên gói miễn phí (31/10/2026)

## Phạm vi triển khai
- Player Web Online: nút micro trong Chat, chạm để ghi, chạm lần nữa để gửi, hủy bằng ✕; phát lại khi người nhận chủ động nhấn ▶.
- Hỗ trợ MediaRecorder Safari iOS (MP4/AAC), Chrome/Edge (WebM/Opus), Ogg/Opus nếu trình duyệt có. Không dùng LiveKit, dịch vụ TTS, STT, ElevenLabs, đăng ký dịch vụ mới hoặc thêm Cloudflare binding.
- Tái sử dụng session và quyền Chat đang chạy trên Durable Object. Kênh Làng/nhóm bí mật/riêng GM dùng chính sách phân quyền Server hiện có; toàn bộ nội dung âm thanh chỉ tải qua API đã xác thực, không vào public room_state/WebSocket; chat_tick không có nội dung.
- API riêng cho GM đã xác thực có thể đọc âm thanh ở các kênh giám sát. Giao diện GM tiếp nhận nút phát cần nhánh Runtime UI riêng để không tự sửa IPA hoặc phát hành lại Runtime cũ.

## Chặn chi phí và rủi ro
- Mỗi clip **20 giây**, tối đa **240 KiB**; loại MIME và magic bytes được kiểm tra Server, giới hạn tải lên và nhịp gửi.
- Toàn phòng lưu tối đa **32 clip còn được giữ**, tự loại clip cũ khi có tin thoại mới; clip hết thời hạn **24 giờ** không được tải lại. Không cam kết xóa vật lý đúng thời điểm nếu không có tương tác; dung lượng lưu tuyệt đối được chặn bằng số clip toàn phòng.
- Mic chỉ bật khi người dùng chạm; luôn dừng MediaStream track sau ghi/hủy; không tự phát tin âm thanh. Từ chối ghi khi trình duyệt/HTTPS không có MediaRecorder và quyền micro.
- Một số người dùng tắt hoặc từ chối microphone vẫn chat chữ bình thường.
- Cloudflare Free có hạn mức tổng cho Worker/DO; khi đã dùng hết có thể chặn yêu cầu, không có bảo đảm miễn phí vô hạn.

## Release/rollback
- Worker/Player Web only; không sửa GM Runtime, Native IPA, Oracle, Durable Objects schema hoặc dữ liệu lịch sử.
- CI phải xác minh source/bundle, payload/permissions/quota và Worker dry-run; required CI SUCCESS trên HEAD cuối trước merge, ưu tiên Worker deploy phù hợp.
- Không tạo .gmwwupdate chỉ chứa Runtime cũ, không ghi đè V3.285. Rollback bằng chuyển Worker deployment về phiên bản trước PR nếu xảy ra lỗi; chat chữ phải tiếp tục chạy được.
- Nghiệm thu bắt buộc: iPhone Safari, Chrome, Edge; mic allow/deny; gửi/nghe kênh ngày, nhóm ban đêm, DM GM; dead/expelled/frozen không gửi kênh Làng nhưng gửi GM; reconnect; playback không rò kênh.

## CI-LITE PR #712 — khôi phục sau lỗi bộ test legacy
- Lần đầu `Check Player Web Worker` thất bại vì bộ chọn mặc định `full` chạy 1.355 bài test cũ không liên quan; trong đó một fixture test tin thoại quá ngắn đã được sửa.
- Bộ chọn `player-voice-notes-712` chỉ nhận danh sách tệp chính xác và kiểm tra lại auth, giới hạn dữ liệu, bundle, chat quyền riêng tư, syntax Worker, Wrangler dry-run. Có thêm tệp hoặc thay đổi ngoài phạm vi sẽ quay về `full`.
- Không bỏ qua required `CI Policy Gate` hoặc `CI Stability Gate`; không merge nếu các check bắt buộc không SUCCESS.
- Đây là bản thử trên PR/Preview, không được phát hành Production trước nghiệm thu trên iPhone thật.
