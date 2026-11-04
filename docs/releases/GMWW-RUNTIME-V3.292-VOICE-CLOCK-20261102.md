# GMWW Runtime V3.292 — sửa đồng hồ lượt và gửi Chat thoại chủ động (02/11/2026)

## Sửa lỗi
- Đồng hồ lượt ban đêm Player Web nhận thời gian còn lại từ projection quyền riêng tư /me, cập nhật theo đồng hồ monotonic; ban ngày vẫn dùng deadline Server. GM ưu tiên deadline Server ngay cả khi không có durationSec.
- Cả GM Server và Player Web: micro bắt đầu ghi âm; bấm micro lần nữa chỉ dừng và lưu nháp, **không gửi**; nhấn nút ↑ để dừng rồi gửi, hoặc gửi nháp đã dừng. Đủ 30 giây tự dừng **không tự gửi**.
- Giữ luồng mic trong chính trang tối đa 120 giây sau khi dừng, tạm tắt audio track khi rảnh; dọn khi trang ẩn, pagehide hoặc rời phòng. Giảm số lần gọi getUserMedia khi chuyển qua các màn hình trong cùng trang. Nếu iOS/WKWebView tải lại trang hoặc thu hồi quyền, yêu cầu quyền hệ điều hành có thể xuất hiện lại, ứng dụng không thể tự cấp quyền thay người dùng.
- Không thay đổi quyền trò chuyện, dữ liệu lịch sử, nội dung thoại backend, giới hạn 30 giây, nội dung riêng tư, URL, dữ liệu phòng, DO migration và IPA.

## Kiểm thử
- Chạy test `tests/gmww-public-turn-clock-v3292.test.mjs`, `tests/gmww-chat-voice-send-v3292.test.mjs`, kiểm chứng ghép nguồn GM/Player, kiểm tra Worker và CI required trên HEAD cuối.
- Sau phát hành cần nghiệm thu trực tiếp trên iPhone: đồng hồ từ 00:30 xuống 00:00 lúc vai hoạt động; mic → dừng không gửi → ↑ gửi; hết 30 giây chỉ giữ nháp; đổi màn rồi trở lại không hỏi quyền trong cùng phiên đang sống.

## Rollback
- Runtime OTA quay lại release V3.291 đã xác minh và khôi phục Worker deployment trước V3.292 qua quy trình phát hành, không xóa phòng/DO/IPA.
- Soát lại trạng thái Chat chữ/thoại, clock Server/Player, quyền riêng tư và reconnect sau rollback.
