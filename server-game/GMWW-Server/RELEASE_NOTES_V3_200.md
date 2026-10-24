# GMWW V3.200 — IPA chính thức

Ngày phát hành: 24/10/2026.

## Bản phát hành

- Đóng gói ứng dụng iPhone GMWW từ Runtime V3.200 đã kiểm tra và đưa lên Cloudflare Production; dùng mã nguồn trên main, không sửa luật game hoặc dữ liệu.
- Bao gồm PR #457 / #458: thiết kế lại Lên Giàn tự động/thủ công, thống kê đề cử và phiếu Cứu/Giết, Cấm đề cử/Cấm Vote, Artifact, kết luận và các mục thư viện âm thanh để người dùng upload.
- Bao gồm các bản sửa Runtime V3.198–V3.199 đã phát hành trước đó: quản trị Server, menu GM tại đống lửa, ổn định roster/lá Vai Trò và Seat nguyên đội hình.
- GitHub Actions Build Native GMWW IPA tạo file **GMWW-V3.200.ipa** và **GMWW-V3.200.ipa.sha256** từ Xcode build sạch, xác thực SHA-256 và cấu trúc trước khi cho phép xuất bản.
- GitHub Releases tag `gmww-v3.200` phải chứa đúng 2 tài sản trên; không được đặt nhãn 3.200 cho gói cũ.
- Tải IPA trên GMWW Server chỉ chuyển sang V3.200 sau khi xác minh cả file Release, kích thước và SHA-256, cập nhật `update-system/published-ipa.json` và hoàn tất CI/Production.

## An toàn và rollback

Giữ nguyên tài khoản, phòng chơi, dữ liệu Durable Objects, lịch sử, Runtime OTA V3.200 và số phiên bản Native OTA shell tương thích. Không sửa nguồn 3D; không thay quyền công bố dữ liệu, không hạ phiên bản hoặc tự xoá IPA V3.197. Nếu build/Release thất bại thì vẫn giữ nguyên liên kết IPA cũ tới khi có bằng chứng phát hành mới.

## Ghi chú

Đây là tài liệu riêng nằm cùng mã ứng dụng iOS để kích hoạt **workflow phát hành IPA native đã có**, không thay đổi code hay payload runtime của Server; không tự coi PR merge là đã tải được IPA.
