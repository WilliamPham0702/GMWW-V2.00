# GMWW Runtime V3.244 — Căn đều menu tiến trình 6 bước
Ngày: 27/10/2026. Loại phát hành: Runtime OTA. Không cập nhật iOS IPA.

## Thay đổi
- Chỉnh đúng cả hai khai báo grid-template-columns 7 cột cũ thành 6 cột đều nhau.
- Căn giữa biểu tượng và tên của 6 bước: Sảnh Chờ – Tập Hợp – Ván Mẫu – Phân Vai – Phát Vai – Vào Trận.
- Giữ nguyên màu, kính mờ, tương tác, quyền, thứ tự luồng, dữ liệu phòng và lịch sử.
- Làm mới khóa phiên bản stylesheet/app để iPhone nhận CSS mới thay vì cache cũ.

## Kiểm thử và phát hành
- Chỉ kiểm thử bố cục timeline, bundle GM, version integrity, Worker CI và SHA-256 OTA.
- Không yêu cầu Chrome Card, 30 Seat, 3D, IPA build cho lần cập nhật giao diện này.
- Bảo toàn DO, tài khoản, Player Web và dữ liệu ván. Rollback: quay lại Runtime/Worker V3.243, không xóa dữ liệu, không hạ IPA.
- Chỉ phát hành khi CI thực sự bắt buộc SUCCESS. Kiểm chứng Production và checksum sau deploy.
