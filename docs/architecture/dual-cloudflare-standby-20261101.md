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


## Giai đoạn 1 — Storage adapter và khôi phục **dữ liệu giả** (01/11/2026)
- \`infra/cloudflare-standby/storage-adapter.mjs\`: SQLite *local test* độc lập \`synthetic-A.sqlite\`/\`synthetic-B.sqlite\`; không kết nối tài khoản Cloudflare và không phải Durable Object adapter Production. Node 22 \`node:sqlite\`, WAL + synchronous FULL, transaction rollback, CAS revision và chống bản snapshot cũ/khác SHA/version.
- Điều kiện mở kho: \`GMWW_CF_STANDBY_FIXTURE_ONLY=1\`, lựa chọn fixtureOnly rõ ràng, thư mục private có marker \`.gmww-cloudflare-standby-only\`; chặn symlink, account sai, đường dẫn nguy hiểm. Chỉ lưu schema public synthetic của \`fixture-contract.mjs\`; không cho nhập token, session, role hoặc Artifact.
- Checkpoint A→B có chữ ký HMAC/sha256, ràng buộc source A/target B. Export chỉ từ A; B chỉ khôi phục nếu đã ký và mọi ván đã kết thúc/chưa bắt đầu, WebSocket=0. **Dry-run mặc định**, cần cờ xác nhận fixture riêng mới ghi. Kiểm tra cả khi đóng/mở SQLite; xung đột/trùng/stale revision bị chặn.
- \`reconcileSyntheticStores\` chỉ xác minh fixture checksum và báo \`productionSwitchAllowed=false\`, không phải xác nhận khôi phục đủ state thật.
- CI: \`node --test infra/cloudflare-standby/*.test.mjs\` cùng test chống tự phát hành; không tạo Cloudflare B, không xuất/nhập dữ liệu Production, không đổi URL/IPA/Runtime.
- Sau CI, vẫn thiếu **real two-account DO-compatible adapter**, private rooms/history/undo migration, login/session, WSS replay thật, rollback và xác nhận GM. Các mục này cần quyền triển khai tài khoản B ở giai đoạn 2 được phê duyệt riêng.


## Giai đoạn 4A → 4B (03/11/2026) — kiểm toán và dry-run chỉ dữ liệu giả

**Trạng thái:** CHƯA SẴN SÀNG failover Production. Không có cơ chế đồng bộ dữ liệu thật, không đổi Production A/B, DNS, IPA, Runtime, chi phí hoặc URL. Giai đoạn 4C bị khóa cho đến khi có phê duyệt riêng.

### Tài sản đã kiểm kê (đọc API metadata, không đọc dữ liệu người dùng)
- Cloudflare A: Worker `gmww-v2-00` với binding `ROOMS` (SQLite Durable Object), Pages `gamemasoi` dùng service binding `GMWW_SERVER→gmww-v2-00`; KV marker GR01 hiện có. Không phát hiện D1 độc lập qua API account.
- Cloudflare B: Worker `gmww-b-staging-synthetic`, binding `STAGE3_SYNTHETIC_ROOM`; chưa có Worker game parity, Pages, KV hoặc D1. Gói lưu trữ R2 **không xác minh được** do API trả 403, không được diễn giải là không tồn tại.
- Code Production có khóa quản trị đồng bộ dạng hằng số trực tiếp; **P0 security**: không thêm giá trị bí mật vào PR/log, không tự đổi auth đang sử dụng. Cần PR chuyển secrets + dry-run tương thích + xoay/thu hồi khóa dưới phê duyệt bảo mật/Production riêng. Xem lại lịch sử công khai sau xoay khóa.
- GR01 đã chứng minh per-object PITR và khôi phục fixture ở STAGING; controller đang bind tới DO GR01 lab, chưa phải nguồn Production. PITR không phải backup độc lập xuyên tài khoản. Chưa có export lossless/restore đầy đủ member, session, room, rule state, Artifact, chat, history, asset, undo.
- A Pages `gamemasoi.pages.dev` hiện định tuyến qua service binding của A; không chứng minh được tự động giữ nguyên hostname khi chuyển sang tài khoản B. Chưa có thiết kế active/standby routing được nghiệm thu.
- Hai tài khoản đều dùng Cloudflare: phương án này không chứng minh được khả năng chống sự cố toàn bộ Cloudflare.

### Bằng chứng 4B (synthetic local SQLite, không phải live backup)
- `stage4-readiness.mjs` đánh giá riêng **khả năng dry-run synthetic**: cặp nguồn/đích cố định, commit/schema đồng nhất, checkpoint ký, checksum trước-sau, kiểm thử khôi phục, room ở trạng thái không hoạt động và WebSocket=0.
- `stage4-readiness.test.mjs` chạy A-local → checkpoint ký → B-local dry-run (không ghi) → ghi sau xác nhận chỉ với fixture → đối chiếu digest; test từ chối kết nối người chơi, ván đang chạy, checkpoint lỗi, lệch version, dữ liệu thật.
- Bất kể các test PASS, kết quả luôn `productionSwitchAllowed=false`, `failoverReady=false`, `realBackupVerified=false`; **không được suy diễn sang Game Production**.
- Các bài E2E live GM/Player/Login/Room/Chat/WebSocket/Reconnect từ PR #754 xác nhận **B synthetic endpoint**, không kiểm tra dữ liệu thật hoặc chuyển traffic.

### Cổng phê duyệt và thứ tự phải giữ
1. **4A bảo mật (Production-change HOLD):** Tách khóa quản trị khỏi mã nguồn; cấp riêng Cloudflare A, xoay và thu hồi khóa cũ; kiểm thử phiên GM/Player và CI. Chỉ thực hiện khi có phê duyệt Production/bảo mật riêng và rollback chính xác.
2. **4A backup thiết kế:** Định danh mọi DO instance và key family; kế hoạch checkpoint nhất quán khi nhiều room đang hoạt động; mã hóa/HMAC, quản lý khóa, kiểm tra bí mật, quyền đọc-only tối thiểu, bảo toàn lịch sử/undo. Chưa thu thập dữ liệu thật.
3. **4B tiếp theo (chỉ synthetic):** Khi có thiết kế tương thích mã nguồn game trên B, kiểm thử export/import thật giữa **hai DO thử nghiệm** cùng SHA và schema, session token A phải bị vô hiệu trên B, Login/Chat/WS/Reconnect phải PASS. Chưa triển khai game vào B.
4. **4C (cần phê duyệt riêng):** Chỉ sau 4A/4B có thể bàn kiểm thử bản sao dữ liệu thật với mã hóa, riêng tư và quyền phê duyệt cụ thể. Không tự động copy Production.
5. **5 Failover (cần phê duyệt riêng):** Chặn cutover trong ván đang chơi/WebSocket còn nối; GM phê duyệt; đối soát checkpoint trước-sau, giữ A bất biến, DNS/URL, khả năng rollback, hạn mức Free/chi phí.
6. **RPO/RTO:** Chưa có số đo thực nghiệm, tuyệt đối không hứa mất dữ liệu = 0 hoặc chuyển đổi tức thời.

### Rollback
Trong giai đoạn này không có deploy, quyền dữ liệu hay release: revert riêng commit tài liệu/test/module nếu cần. Không rollback/xóa bất cứ dữ liệu Production.
