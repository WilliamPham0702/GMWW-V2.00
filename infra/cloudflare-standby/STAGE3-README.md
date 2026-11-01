# GMWW Dual Cloudflare — Giai đoạn 3 / Cloudflare B synthetic STAGING

## Mục tiêu và ranh giới
- Tạo một Worker **chỉ để thử endpoint /health bằng dữ liệu giả**, trên tài khoản Cloudflare B Free độc lập.
- Cloudflare A vẫn là Production duy nhất. Không cập nhật DNS, URL, OTA, IPA, Durable Objects, dữ liệu phòng hay failover.
- Worker STAGING này **không import** src/index.js, không dùng khóa GM, không có đăng nhập, chat, WebSocket hoặc lưu trữ.
- Các chức năng trên phải được kiểm thử ở STAGING thực sau khi hoàn tất cách ly bí mật quản trị và xem xét riêng; **không coi health PASS là game parity PASS**.
- Không cấu hình token, account_id hoặc tài khoản sản xuất trong repository. Không auto deploy B; CI chỉ chạy test và dry run.
- Bắt buộc xác minh Cloudflare account ID bằng cách đọc kết nối thực, bảo đảm account B khác account A, trước khi deploy thủ công vào B. Không dùng A làm fallback khi không thấy B.
- Mức miễn phí phải được xác minh tại thời điểm deploy; không kích hoạt Workers Paid, Durable Objects backend khác hoặc dịch vụ trả phí.
- Nếu chưa có quyền Cloudflare B, dừng ở PR Draft. Merge chỉ khi required CI SUCCESS trên HEAD cuối cùng; không có phát hành Production/Runtime cho thay đổi này.

## Kiểm thử
- `node --test infra/cloudflare-standby/b-staging-worker.test.mjs`
- `node --test infra/cloudflare-standby/*.test.mjs`
- `node --test tests/dual-cloudflare-release-guard.test.mjs`
- Sau khi có tài khoản B: kiểm tra đúng B bằng GET /accounts, chạy dry run cấu hình staging, rồi mới xem xét deploy vào B; không thử nghiệm trên A.

## Rủi ro đã nhận diện
Worker GMWW hiện tại có giá trị khóa quản trị GM được nhúng trong mã nguồn; vì vậy không deploy nguyên production Worker vào tài khoản B cho đến khi có thiết kế tách secret riêng và kiểm thử xác thực.
