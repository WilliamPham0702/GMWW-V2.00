# GMWW Runtime V3.294 — Sóng ghi âm realtime và gửi Chat thoại nhanh hơn

Ngày 03/11/2026. Phạm vi: giao diện Chat thoại GM + Player Web và lưu/đọc tin thoại trong Durable Object. Không chỉnh IPA, tài khoản, DNS, phòng, trạng thái người chơi hoặc chính sách quyền riêng tư.

## Thay đổi
- Thay 12 thanh sóng minh họa bằng 12 thanh phản ánh **tín hiệu thật từ microphone** qua Web Audio AnalyserNode, cập nhật theo biên độ âm thanh trong lúc MediaRecorder đang ghi. Không kết nối micro ra loa. Đóng AudioContext khi kết thúc hoặc rời trang.
- Mã hóa bản ghi mục tiêu khoảng 40 kbps nếu trình duyệt hỗ trợ, tự quay về MediaRecorder mặc định khi cấu hình không khả dụng. Giữ giới hạn ghi âm tối đa 30 giây.
- Server ghi các chunk voice độc lập theo nhóm tối đa 6 công việc đồng thời, chỉ ghi metadata khi mọi chunk đã hoàn tất; nhận thoại đọc chunk song song và ráp đúng thứ tự.
- Phản hồi "Đang gửi thoại…" ngay khi nhấn mũi tên ↑, không tự gửi khi chạm micro hay hết 30 giây. Chỉ hiển thị "Đã gửi" sau khi Server xác nhận.
- Hỗ trợ giữ bản nháp để thử gửi lại khi Server không nhận. Không tự động upload bản ghi hoặc dùng dịch vụ audio tính phí.

## Kiểm thử
- Chạy `tests/gmww-chat-live-meter-fast-send-v3294.test.mjs`, `tests/gmww-chat-voice-send-v3292.test.mjs`, `tests/gmww-chat-voice-gm-broadcast-20261102.test.mjs`, `tests/online-chat-authority.test.mjs`.
- Kiểm tra ghép mã nguồn GM + Player, npm test, kiểm tra Worker, CI required trên HEAD cuối.
- Nghiệm thu bằng iPhone + Player Web sau khi phát hành: nói nhỏ/to quan sát sóng có phản ứng; nhấn ↑ nhận báo gửi; đối phương nhận phát lại được; thử cùng phòng, tin GM và Chat nhóm đêm. Đo thời gian thực tế trên thiết bị để xác nhận mức cải thiện, không cam kết số giây khi chưa đo.

## Rollback
- Giữ bản V3.293 và GitHub Release SHA-256; nếu có lỗi Runtime mới, rollback Worker Production về deployment được xác minh trước khi phát hành, Runtime theo quy trình cập nhật an toàn. Không xóa dữ liệu, không tự hạ phiên bản iPhone đã cài.
