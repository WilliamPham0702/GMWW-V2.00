# GMWW — PR #434: Build IPA kiểm thử sau V3.196 (23/10/2026)

**Đồng bộ với PR #433 đã merge:** lỗi `fake-indexeddb` và phân loại Native/Runtime đã được khắc phục trong mã nguồn V3.196. PR #434 không ghi đè sửa lỗi đó.

## Bổ sung trong PR #434
- Workflow `Build Native GMWW IPA` chạy trên pull request, cài `npm ci` theo lockfile và tạo artifact IPA kiểm thử.
- Bước phát hành `gh release` bị khóa chỉ chạy trên sự kiện push vào `main`. PR này không tạo bản phát hành chính thức.
- IPA test unsigned (`CODE_SIGNING_ALLOWED=NO`); không thể cài trực tiếp trên iPhone thông thường nếu chưa ký bằng chứng chỉ/provisioning hợp lệ.
- Thêm kiểm thử hồi quy đảm bảo phân loại Native/Runtime V3.196 không bị thay đổi, kiểm thử dependencies và giới hạn phát hành PR.

## Nghiệm thu
- Yêu cầu CI Worker/Node/Character và build macOS IPA SUCCESS; kiểm tra bản `GMWW-V3.196` trong artifact GitHub Actions của PR.
- Nếu cần nghiệm thu iPhone thật: ký IPA thử nghiệm theo quy trình được chủ dự án phê duyệt, kiểm tra DEMO chạy >30 giây, Pause/Resume, thoát và app sang nền, Auto-Lock được khôi phục.
- **Không merge hoặc triển khai Production nếu chưa có phê duyệt mới.** Không thay đổi game, cơ sở dữ liệu, phòng chơi, seat, Player Web hay metadata bản chính thức.

## Rollback
Đóng PR hoặc revert commit bổ sung workflow; mã V3.196 trên main, Release hiện tại, phòng chơi, dữ liệu, Cloudflare và Player Web không thay đổi bởi PR này.
