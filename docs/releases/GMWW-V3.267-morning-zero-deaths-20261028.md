# GMWW Runtime OTA V3.267 — Bỏ thông báo số người chết khi không có ca tử vong

Ngày 28/10/2026.

## Nội dung cập nhật
- Vào Ban Ngày vẫn phát “Làng ơi dậy đi”.
- Nếu **không có người chết**, bỏ hoàn toàn cả chuỗi “Đêm qua làng chúng ta có” → số người chết → “người chết”; tránh phát nửa câu rồi đợi file âm thanh số 0.
- Nếu **có người chết**, giữ đúng chuỗi công bố theo số ca tử vong thực tế.
- Không thay đổi thông báo bị đuổi, bị đóng băng, được bảo vệ, hồi sinh và các tác động khác.

## Kiểm thử đúng phạm vi
- Test Audio sáng với 0, 1, 2 người chết, tác động không chết và trường hợp được cứu; xác minh bundle GM bảy phần và Worker CI bắt buộc.
- Chỉ phát hành Runtime OTA V3.267 sau SUCCESS, kèm SHA-256 và xác minh Production.
- Bảo toàn IPA V3.264, Player Web, luật, dữ liệu phòng, lịch sử và Durable Objects.
- Rollback Runtime V3.266 nếu xảy ra sự cố.
