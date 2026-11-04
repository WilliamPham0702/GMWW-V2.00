# PR690 — Khôi phục phát hành DEMO Online (31/10/2026)

- Nguyên nhân: job checkout `fetch-depth: 2`, không lấy đủ lịch sử kiểm tra commit PR677 và tag `gmww-v3.280`; cổng CI từ chối phát hành nhưng job báo SUCCESS do bước deploy bị SKIPPED.
- Sửa: checkout đầy đủ; phát hành chỉ nếu đúng bảy tệp hồi phục, nguồn DEMO từ PR677 bất biến, Runtime V3.280, assets, IPA, Oracle và dữ liệu bất biến.
- Kiểm thử: 7 bài DEMO/room mode/quyền riêng tư, kiểm tra build GM và Worker dry-run; required CI SUCCESS trên HEAD cuối.
- Triển khai: snapshot phiên bản Worker trước đó; deploy Worker-only và xác minh Production JavaScript/health/version. Tự rollback Worker nếu kiểm tra sau deploy không đạt, không xóa Durable Objects.
- Không tạo lại `.gmwwupdate` V3.280. Phiên bản Runtime mới cần release độc lập, SHA-256 và rollback.
