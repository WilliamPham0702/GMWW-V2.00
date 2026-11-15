# GMWW — Quick Play dùng kho Audio GitHub chung (15/11/2026)

## Phạm vi
- Ván Mẫu mới của GM Server/Player lưu **tham chiếu cố định** `gmww-audio-v1` (không nhúng MP3). Khi chọn Ván Mẫu, phòng ghi nhận đúng phiên bản kho. Các Ván Mẫu cũ được gán tham chiếu cùng phiên bản khi chọn, không ghi đè dữ liệu đã lưu.
- Ở lượt hoạt động thực tế, Room tiếp tục dùng cơ chế `announcementCue` và `Auto GM` hiện có; ưu tiên clip đã upload riêng cho phòng, chỉ sử dụng GitHub nếu thiếu.
- Manifest phải trỏ chính xác tới GitHub Releases của repo `WilliamPham0702/GMWW-V2.00`, đúng phiên bản và tên file SHA-256. Worker proxy cùng domain và kiểm tra lại SHA-256 đầy đủ trước khi phát đến Player Web. Chỉ người có session/thuộc phòng và chỉ clip của lượt hiện tại mới được nghe.
- Nếu chưa xuất bản `gmww-audio-v1/manifest.json` hoặc file không đủ/không hợp lệ, cơ chế hiện tại tiếp tục chạy; **không bật đường dẫn âm thanh giả** và không tự tạo TTS.
- Đếm ngược 30 giây có thể lấy clip từ kho chung khi phiên bản đã có; không phải phụ thuộc GM Server đang mở.

## Nghiệm thu bắt buộc
1. **74 MP3 độc lập + manifest + checksums** phải thật sự nằm trên GitHub Release `gmww-audio-v1`, có URL GET 200, MIME âm thanh, khớp SHA-256 và giải mã được trên iPhone.
2. Kiểm tra Ván Mẫu có Bầy Sói/Sói Tuyết/Bảo Vệ và vòng Đêm→Ngày→Đề cử→Lên Giàn→Kết quả; Clip lặp/đổi lượt, tắt màn hình/reconnect, iOS audio unlock.
3. Kiểm tra không lộ Vai Trò bí mật hoặc clip của lượt khác; các clip **chưa có trong 74 file** phải được báo thiếu, không coi là đã hoàn thành.
4. Required CI SUCCESS trên SHA cuối, Production smoke PASS, xác minh Worker version SHA/rollback. Không thay IPA, Runtime OTA, DNS, URL, dữ liệu thật.

**Rollback:** khôi phục ngay Worker version Production trước phát hành; không di chuyển/xoá gói âm thanh hoặc sửa DO Production. Quay về hành vi phát clip của phòng cũ. Rollback sau CI mà không phải cập nhật IPA.

**Trạng thái:** file trên Github Release nháp `gmww-audio-import-v1` chưa xác nhận; API GitHub tại thời điểm kiểm tra báo 0 assets. **Không merge/deploy PR này cho đến khi có bộ file thực trên GitHub và CI PASS.**
