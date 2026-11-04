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


## Giai đoạn 3 mở rộng: probe Synthetic E2E (PR mới, chưa deploy)
- Bổ sung Worker *độc lập với Production code* để mô phỏng đăng nhập GM/Player, session, tạo phòng, join, Chat, WebSocket ping/pong, gửi nhận và reconnect.
- Test fixture bắt buộc header \`x-gmww-b-fixture-key\` từ secret Cloudflare B tên \`GMWW_B_SYNTHETIC_ADMIN_KEY\`. Tuyệt đối không sử dụng mã quản trị Production, token A, hay hardcode secret vào GitHub.
- Durable Object \`Stage3SyntheticState\` dùng SQLite trên Workers Free B, chỉ lưu token, room và Chat giả ngắn hạn; không nối Durable Object/KV/DB của A, không định tuyến DNS, không failover và không sử dụng dữ liệu người chơi thật.
- URL vẫn là subdomain \`gmww-b-staging-synthetic.<subdomain-B>.workers.dev\`; host Production và hostname giả mạo phải bị 403. Thử nghiệm HTTP/WS qua \`/qa/*\`, mặc định fail-closed nếu chưa cấu hình secret hoặc binding.
- Khóa phiên thử nghiệm sống tối đa 15 phút; WebSocket yêu cầu vé dùng một lần, hết hạn 30 giây; giới hạn số phòng, phiên và tin nhắn. Chỉ GM synthetic có quyền xoá toàn bộ fixture B qua POST \`/qa/reset\` với \`{"fixtureOnly":true}\`.
- Trạng thái \`/health\` cố định \`loginSessionVerified:false\` và \`websocketVerified:false\`, chỉ chuyển báo cáo nghiệm thu sau khi kiểm thử thực tế trên Cloudflare B; không dùng để suy luận tương đương Production.
- \`node --test infra/cloudflare-standby/*.test.mjs\` và \`wrangler deploy --dry-run --config infra/cloudflare-standby/wrangler-b-staging.jsonc\` phải PASS trong required CI. Không merge hoặc deploy B nếu required CI chưa SUCCESS ở HEAD cuối cùng.
- Trước triển khai xác minh B vẫn thuộc gói Free; không nâng gói hoặc phát sinh dịch vụ trả phí. Nếu Billing API không cấp quyền đọc, phải kiểm chứng bằng phương pháp được phép trước khi triển khai.
- Rollback B: lựa chọn lại Worker version/deployment trước khi thay đổi E2E, loại bỏ quyền truy cập các tuyến \`/qa/*\`; không được chạm A, IPA, Runtime, DNS hoặc dữ liệu thật.
- Release note tiếng Việt, SHA-256 gói nếu phát hành; không phát hành Runtime OTA trong PR này.

**Phạm vi đã kiểm thử bằng CI chỉ là synthetic contract/local harness.** Để đánh dấu PASS thực tế còn cần kiểm thử hai client trên B cho WebSocket broadcast/reconnect và token isolation.
