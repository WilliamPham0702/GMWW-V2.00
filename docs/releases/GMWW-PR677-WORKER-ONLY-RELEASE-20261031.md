# GMWW — PR #677 Worker-only DEMO Online (31/10/2026)

- Mục tiêu: triển khai thay đổi DEMO dùng Online transport của PR #677, đã merge tại `97e4d328366548983aa8009ab4be646f972c4085`.
- Cổng an toàn: đúng SHA main, GitHub required CI SUCCESS, Worker/GM source bất biến từ PR #677, assets và phiên bản Runtime V3.280 bất biến.
- Test DEMO room mode, bot isolation, quyền riêng tư, phòng đang chơi và Worker dry-run.
- Snapshot Cloudflare deployment hiện tại; triển khai Worker-only rồi xác minh HTTP health và Worker version mới.
- Tự rollback về phiên bản Worker cũ nếu sau deploy xác minh thất bại. Giữ nguyên Durable Objects, phòng, lịch sử, IPA và Oracle.
- **Không tạo Runtime V3.280 mới hoặc bản sao .gmwwupdate.** Khi phát hành Runtime chính thức sau này phải tăng version, đính kèm SHA-256, release notes tiếng Việt và rollback.
- Chỉ thông báo phát hành thành công sau khi có bằng chứng Workflow và Cloudflare Production.
