# GMWW V3.259 – khắc phục bước xác minh Production ngày 27/10/2026

- PR #565 và phát hành V3.259 đã merge. Worker V3.259 đã được triển khai, manifest và checksum CSS/JS/HTML trên máy chủ đã đạt.
- Bước kiểm tra Character40 còn mã kỳ vọng IPA shell **V3.110** từ bản cũ; khi Runtime hiện tại dùng IPA V3.257, kiểm tra dừng dù bytes Production đúng.
- Cập nhật phép kiểm: đối chiếu `shellVersion`, `minimumShellVersion` và IPA manifest với `MARKETING_VERSION` thực tế của dự án iOS, không thay đổi mã IPA, runtime, Player Web hay dữ liệu.
- Kiểm thử đúng phạm vi: syntax verifier, test hai hợp đồng IPA/Game, nguồn GM, Worker, CI cùng SHA; kiểm tra lại live 40 Character, SHA-256 OTA Production và phát hành gói cập nhật thủ công.
- Rollback an toàn về V3.258 tại Cloudflare/Runtime nếu xác minh lại không đạt; bảo toàn tài khoản, phòng, lịch sử, Durable Objects và IPA V3.257.
