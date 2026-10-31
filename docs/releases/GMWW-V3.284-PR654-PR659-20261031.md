# GMWW RUNTIME V3.284 — TÍCH HỢP PR #654 VÀ #659 (ỨNG VIÊN)
Ngày: 31/10/2026
Trạng thái: Chỉ nhánh ứng viên, chưa triển khai Production.

## Nội dung
- Kế thừa source Audio V3.283 của PR #654: file Tên/Full độc lập, Play, Thay thế, Gắn Audio, xác nhận Xóa/Thùng rác và sửa nút không hoạt động trên iPhone.
- Bổ sung PR #659: trạng thái LỆCH PHIÊN BẢN khi Runtime > Server, không báo ĐÃ ĐỒNG BỘ giả, từ chối OTA hạ cấp và kiểm tra đồng bộ ba thành phần.
- Kế thừa PR #649 và các thay đổi trên main, không sửa IPA/native, Oracle, dữ liệu, luật chơi.
- Version đồng nhất Worker, GM, HTML, package: V3.284.

## Gates phát hành bắt buộc
- Xác minh mã nguồn và package từ HEAD cuối, SHA-256 đầy đủ.
- Browser/Worker/Audio/OTA/Update Manager test tại HEAD; chỉ release khi required CI SUCCESS.
- Nghiệm thu Preview iPhone thật Safari, Chrome, Edge: Audio và Cập Nhật Hệ Thống trước khi merge và release.
- Không nâng Production Server tự động nếu Worker/Player chưa xác minh tương thích.

## Rollback
- Không dùng V3.280 để hạ Runtime V3.283. Nếu phát sinh lỗi, xây Runtime bản số cao hơn giữ dữ liệu với source V3.283 đã kiểm chứng, verify bằng SHA-256.
- Luôn giữ artifact V3.283, các bản Production cũ và bản sao lưu; không hủy dữ liệu hay lịch sử.
