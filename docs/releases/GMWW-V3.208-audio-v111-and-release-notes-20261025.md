# GMWW Runtime V3.208 — Âm thanh Vai Trò / Ban Ngày / Thông cáo Làng

Ngày: 25/10/2026. Phạm vi: GM Runtime, danh mục Audio, thông cáo, luật hiển thị kết quả soi, manifest OTA.

## Nội dung
1. Luồng gọi vai trò: giữ phát theo lượt cả vai trò gộp và Artifact, bổ sung phát lúc chọn hành động ban ngày; xác nhận phải dựa trên kết quả Server, tiếng xác nhận vẫn dùng slot Hệ thống sẵn có.
2. Tiên Tri: hiển thị **Người bạn soi là Sói / Người bạn soi không phải là Sói**; quy tắc Sói Trùm vẫn giữ ngoại lệ.
3. Nhà Tinh Thần Học: chỉ phát **Cùng phe / Khác phe**, tuyệt đối không đọc vai trò mục tiêu sau đó.
4. Tiên Tri Hào Quang: audio **Người bạn soi là** rồi nối **Tên** trích từ audio gọi vai trò. Thư viện Vai Trò có nút Tên; chạm đúp chỉnh mốc bắt đầu/kết thúc qua sóng âm, có nghe thử, lưu trên metadata audio hiện có (không nhân bản file).
5. Thư viện hiển thị danh sách vai trò chưa gắn audio dựa trên file cục bộ / URL hiện diện trên máy GM, đồng thời có ô upload clip hệ thống mới.
6. Thông cáo: Thiếu Nữ chết nêu lý do được Server xác định; tác động xấu chỉ có chữ đỏ, hành động gây hại nổi bật bằng hộp đỏ. Sát Thủ công bố người bị chọn, sau câu trả lời có audio đúng/sai theo kết quả.
7. Audio Ban Ngày: kích hoạt cue vai trò hoặc Artifact khi GM chọn hành động, giữ các clip Đề cử/Bỏ phiếu/Thông cáo đã khai báo.
8. Ghi chú phát hành V3.208 tồn tại ở mục Có gì mới sau khi cập nhật (thay thế khi có bản mới).

## Giới hạn nguồn dữ liệu
- Không có IPA V1.11 độc lập đã xác minh trong Library; mã nguồn/âm thanh V1 đã tồn tại trong repo nhưng không thể chứng minh toàn bộ file V1.11 còn đủ.
- Nguồn URL/file audio do GM tải trên thiết bị được giữ nguyên; thiếu clip phải do GM bổ sung. Danh sách thiếu được tính theo dữ liệu thiết bị, không giả định link trống trên máy thật.
- Các thay đổi hiển thị role-only/audio soi chỉ dành cho GM; không gửi thông tin vai trò cho Player Web.

## Phát hành và khôi phục
- Phiên bản Runtime V3.208, giữ IPA shell V3.110; chỉ chạy kiểm tra cú pháp, toàn vẹn gói và các điều kiện an toàn bắt buộc từ pipeline. Không thực hiện bộ test chức năng mở rộng theo yêu cầu chủ dự án.
- Không thay schema Durable Object, phòng, thành viên, lịch sử, Seat, Character.
- Phải xác nhận status CI tối thiểu bắt buộc, OTA manifest và SHA-256 khi deploy thật. Rollback Worker Production qua Cloudflare deployment trước đó nếu gặp lỗi; không xóa dữ liệu.
