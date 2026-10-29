# GMWW V3.274 — khôi phục release gate bằng lịch sử Git đầy đủ (29/10/2026)

- **Phạm vi:** sửa duy nhất checkout `fetch-depth: 2` thành `fetch-depth: 0` ở job deploy-scope nhằm xác nhận commit ancestor bất biến của PR #613. Trước đó checkout nông khiến `git merge-base --is-ancestor` trả exit code 128 dù PR đã merge.
- **CI:** thêm bộ phân loại chính xác bốn đường dẫn CI-only, kiểm thử negative case khi thay đổi runtime, xác thực ancestor PR #613 và required checks SHA phù hợp. Giữ nguyên policy chặn phát hành khi CI thiếu.
- **Runtime OTA:** V3.274, chỉ phát hành sau CI Worker/Artifact/Policy/role proof, đóng gói và manifest SHA-256 thực tế, kiểm chứng Production; gói ZIP thủ công lấy từ release đã xác minh.
- **Bảo toàn:** không sửa mã game, assets, giao diện, 63 Vai Trò, 44 Artifact, dữ liệu, Durable Objects, IPA V3.264. Rollback theo manifest Runtime gần nhất đã xác minh; không downgrade IPA.
