# GMWW Runtime V3.207 — Sửa quyền Cắn của Sói Tuyết (24/10/2026)

## Thay đổi
- Đồng bộ điều kiện xác định Sói khác còn sống trong giao diện GM với dữ liệu roleCard của Server.
- Chuẩn hóa loginId và trạng thái chết khi kiểm tra quyền Cắn của Sói Tuyết.
- Sói Tuyết là Sói duy nhất còn sống có quyền Cắn; vẫn giữ chức năng Đóng Băng theo giới hạn riêng.
- Không thay đổi luật của các vai trò khác, dữ liệu ván, IPA hay Player Web.

## Kiểm thử trước phát hành
- Chỉ chạy kiểm thử Sói Tuyết đơn độc, còn Sói khác sống, Sói khác đã chết, Đóng Băng và Cắn, cùng kiểm tra bản dựng Runtime/Worker.
- Phát hành chỉ khi CI liên quan SUCCESS, manifest OTA/SHA-256 hợp lệ.

## Rollback
- Giữ bản Worker V3.206 và dữ liệu Durable Objects; nếu lỗi, khôi phục phiên bản Worker trước đó, không xóa dữ liệu.
