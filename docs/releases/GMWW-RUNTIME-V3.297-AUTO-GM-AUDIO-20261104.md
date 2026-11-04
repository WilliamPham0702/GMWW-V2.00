# GMWW Runtime V3.297 – P0 Auto GM Audio

Ngày: 04/11/2026

## Điểm mới
- Giải quyết Audio Auto GM lúc phát lúc không trên iPhone. Khi GM bật Auto GM, ứng dụng mở khóa một kênh WebAudio dùng xuyên suốt các lượt gọi vai.
- Mỗi lần chuyển vai, Audio được chọn dựa trên lượt đã xác nhận của Server; có thử lại khi phát thất bại, không phát lại vai cũ.
- Giảm rủi ro ngắt audio giữa thông cáo buổi sáng, Đề cử, Chốt đề cử, Bỏ phiếu và công bố phán quyết.
- Audio còn 30 giây và hết giờ sử dụng chung hàng đợi thông báo.
- Giữ nguyên thời lượng Ván Mẫu và các audio GM tự cài đặt.

## Điều kiện bắt buộc
- Chỉ merge khi toàn bộ required CI SUCCESS trên HEAD cuối cùng, gồm Check Player Web Worker, Check P0 Auto GM Audio Continuity (focused), Check GM audio role/day/vote, V3 release gate và CI policy.
- Không phát hành bằng cách ghi đè file V3.296. Tạo phiên bản mới V3.297, đóng gói GitHub-first .gmwwupdate, kèm SHA-256 tính từ bytes thật.
- Kiểm thử iPhone thực tế trước khi xác nhận Audio đạt: tối thiểu 5 vai liên tiếp và đủ vòng Đêm → Ngày → Đề cử → Bỏ phiếu → Đêm tiếp. CI không thay thế được nghe âm thanh thiết bị.

## Phạm vi và rollback
- Worker/GM Runtime: V3.297.
- IPA: giữ nguyên V3.264 shell, không đóng gói/cài IPA mới.
- Bảo toàn URL, Cloudflare A/B, dữ liệu thật và lịch sử.
- Khi phát hiện lỗi, rollback file GM Runtime về V3.296 đã công bố; rollback Worker về deployment trước khi phát hành. Không xóa hay ghi lại dữ liệu.
- Không hợp nhất PR #777 cùng lúc; giải quyết code xung đột qua PR riêng và kiểm thử lần lượt.
