# GMWW V3.293 — khôi phục chốt CI hậu merge PR #761 (03/11/2026)

## Nguyên nhân
PR #761 đã merge V3.293 và 40/40 PR workflows đạt. Main push không nhận diện được phạm vi postmerge; chạy 1.443+ kiểm thử gồm 3D V3.223 cũ không liên quan, gây lỗi/runner bị dừng trước chốt phát hành.

## Khắc phục
- Chỉ cập nhật 4 file CI, test và tài liệu, không sửa logic game.
- Chứng minh PR #761 merge commit `0faac8e1dfe4d75dc4ea2a7cc63844fb14fcb6fa` nằm trong lịch sử.
- Chứng minh mã `src/`, `server-game/`, `assets/`, `package*.json`, `wrangler.jsonc`, `update-system/` không thay đổi kể từ commit nghiệm thu.
- Chỉ cho phép scope 4 file chính xác, bất kỳ file lạ / xóa / nhân đôi / native đều quay về full CI.
- Kiểm thử Online, Sát Thủ, realtime, ⭐🔥, bảo mật hành động, bản build GM/Player, Worker dry-run, phiên bản; giữ nguyên required gate.

**Không thay đổi Worker, Player Web, Runtime hay dữ liệu**; không thay đổi Cloudflare A/B, DNS, IPA, Oracle hoặc URL.

## Phát hành và rollback
Sau khi required CI SUCCESS trên main, chỉ dùng luồng phát hành GitHub-first hiện có; Runtime V3.293 phải có .gmwwupdate + SHA-256 + release notes. Chỉ xác nhận Production sau smoke và giữ bản Worker/Runtime V3.291 để rollback nếu cần. Không giả định file đã được phát hành.
