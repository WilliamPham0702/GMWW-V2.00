# GMWW Dual Cloudflare Free — Giai đoạn 1 (01/11/2026)
## Phạm vi đã phê duyệt
- Cloudflare A vẫn là **Production duy nhất**. B là STAGING/standby chưa được tạo và chưa được kết nối.
- Không tạo tài khoản B; không tạo hoặc deploy Worker, Pages, Durable Objects, KV, D1 hay R2; không thay đổi secrets hoặc DNS.
- Không sửa src/, package.json, wrangler.jsonc, Runtime OTA, IPA, link hoặc dữ liệu Production.
- CI chỉ chạy bằng dữ liệu **synthetic**; không có token, role cards, session thật hoặc dữ liệu phòng thật.
- Một source commit GitHub để build hai account về sau; **không** sao chép namespace Durable Objects giữa hai account (không được hỗ trợ).
- Mỗi account có Durable Objects/SQLite **riêng**, phải thiết kế export/import dữ liệu *có kiểm soát*, mã hóa và audit; không giả định data tự đồng bộ.
## Mục tiêu nghiệm thu trước khi B được bật
1. Immutable signed checkpoint (schema, engine SHA, revision, checksum, HMAC/authenticated transport), giới hạn truy cập, chống rollback/replay.
2. Import trên môi trường B riêng; kiểm tra toàn bộ trạng thái private/server, version, người chơi, phòng, Artifact và dữ liệu đăng nhập bằng fixture. Không chuyển thẳng token A sang B.
3. Thử đăng nhập/session, WebSocket, chat, reconnect, GM/Player Web với test accounts không chứa dữ liệu Production; dựng hai backend thực.
4. Xác minh phòng không ở giữa ván, **không còn kết nối WebSocket**, đồng thuận GM, tính toàn vẹn trước và sau cutover; luôn giữ A read-only/checkpoint và đường rollback.
5. Giai đoạn 1 luôn giữ productionSwitchAllowed=false; không có route, switch, credential hay deployment Production. Không gọi simulation pass là live failover success.
## Thành quả PR mở đầu
- `infra/cloudflare-standby/fixture-contract.mjs`: schema/canonical SHA-256 + HMAC cho trạng thái phòng synthetic được whitelist, lỗi schema/tamper bị loại. Không chứa private data; chưa phải storage adapter thực.
- `evaluateStandbyFixture`: chốt **FAIL CLOSED** cho ván đang chạy, socket còn kết nối, lệch revision/commit/checksum, chưa nghiệm thu login+WS; bất kể PASS đều không cho phép chuyển server.
- `.github/workflows/check-cloudflare-standby.yml` kiểm thử độc lập; mã game Production không import file STAGING.
- Quy tắc release-scope chỉ bỏ qua deploy/Runtime khi **tất cả đường dẫn thay đổi** thuộc allowlist STAGING nhỏ; có src/ hoặc assets/ phải quay lại chốt phát hành hiện có.
## Lưu ý giới hạn
- Hai tài khoản vẫn chung Cloudflare, không xử lý được sự cố Cloudflare toàn hệ thống.
- Link `gamemasoi.pages.dev` không tự di chuyển sang account khác; chỉ thí điểm link STAGING riêng khi được phê duyệt.
- Miễn phí phụ thuộc hạn mức hiện hành, không dùng account B để né hạn mức hợp đồng.
- Giai đoạn 2, tạo account B, cấu hình credentials, đóng/mở lưu lượng, xuất dữ liệu thật đều cần phê duyệt riêng.
