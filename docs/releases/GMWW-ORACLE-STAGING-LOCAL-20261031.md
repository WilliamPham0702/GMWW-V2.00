# GMWW — Oracle STAGING: bootstrap local tách dữ liệu (31/10/2026)

## Thay đổi
- Thêm lệnh vận hành engine hiện tại bằng Wrangler/workerd LOCAL-ONLY, giới hạn 127.0.0.1 và dùng SQLite Durable Object giả lập trong thư mục riêng.
- Chặn chạy khi có Cloudflare deploy credentials, kiểm tra đường dẫn storage để tránh ghi đè dữ liệu cũ.
- Thêm bài kiểm thử cú pháp, trạng thái local-only và chặn Worker/Runtime tự phát hành.

## Giới hạn
- **Chưa cấp/tác động Oracle VM**, chưa triển khai web Oracle, không kết nối dữ liệu Production và chưa có failover.
- Local Wrangler không thay thế máy chủ Production chịu tải. Chỉ nghiệm thu logic trước khi xây native Oracle state adapter và chuyển đổi an toàn.
- Giữ nguyên IPA, link cũ, Cloudflare Production, dữ liệu và lịch sử.

## Rollback
- Không thay đổi Production. Đóng tiến trình local STAGING, giữ bản sao dữ liệu thử nghiệm trong thư mục riêng; revert các file bootstrap GitHub nếu cần. Tuyệt đối không xóa dữ liệu game thật.

## Nghiệm thu hợp đồng thực tế trên LOCAL workerd (31/10 — đợt bổ sung)
- Script `infra/oracle-staging/probe-local.mjs` chạy **chỉ khi** có đủ `GMWW_ORACLE_STAGING=1`, `GMWW_ORACLE_PROBE_ONLY=1`, thư mục dữ liệu có marker riêng; mọi HTTP/WS chỉ gọi `127.0.0.1`.
- CI tạo tài khoản và phòng giả, xác minh đăng nhập/token, đọc phiên, vào phòng, WebSocket room_state/ping-pong; dừng Workerd, khởi động lại trên đúng kho SQLite giả, đăng nhập/kết nối lại và kiểm chứng phòng vẫn tồn tại.
- Không đụng dữ liệu khách hàng, không gọi Production, không truyền bí mật Cloudflare, không chuyển Server đang chơi; kho test tự xóa sau kiểm thử.
- `/readyz` ở Node bootstrap vẫn 503; chưa được coi là Oracle VM Production hoặc Dual Server failover thật. Còn phải kiểm tra chuyển dữ liệu có kiểm soát, TLS, quyền truy cập, phân quyền, WS reconnect trên Oracle VM và đối soát trạng thái hai backend.
- CI workflow tăng timeout giới hạn để đủ khởi động workerd; Runtime OTA bỏ qua commit chỉ chứa đúng nhóm script/test/workflow STAGING, không tạo file update không cần thiết.
- Rollback: revert PR bổ sung; giữ nguyên Prod/Pages/IPA/Runtime, không có migration thật.

## Đối soát snapshot STAGING sau restart (bổ sung)
- Khi kiểm thử trên Workerd LOCAL, chỉ trích xuất projection công khai và ổn định: mã phòng, tên phòng, số ghế, pha/trạng thái, danh sách participantId đã sắp xếp; không lấy session token, GM token, lá Vai Trò hay Artifact riêng.
- Snapshot fixture xác thực SHA-256 và khóa nguồn bằng `GITHUB_SHA`, phiên bản engine, room code. Sau restart so sánh digest trước/sau; lệch dữ liệu phải **FAIL** CI, không hợp thức hoá failover.
- Kho `GMWW_ORACLE_FIXTURE_ONLY=1` chỉ dùng thư mục STAGING có marker riêng, tự dọn sau kiểm thử. **Không phải** bản sao đầy đủ Durable Objects, không thay thế quy trình backup/migration hay đối soát private room state.
- Oracle Node bootstrap vẫn trả 503; chưa chuyển backend. Rollback: revert thay đổi STAGING-only, không động đến Production/IPA/Runtime/Pages/dữ liệu.


## Kiểm thử phân quyền và lưu phiên sau restart (31/10)
- Chỉ trong fixture STAGING localhost: kiểm thử token đăng nhập đã cấp **vẫn hợp lệ sau khi khởi động lại** Workerd với cùng kho SQLite, không chỉ đăng nhập mới.
- Token giả lưu tạm trong thư mục test có marker, mode 0600, không xuất log hoặc snapshot; CI xoá sau bài kiểm thử.
- Bắt buộc từ chối token giả, truy vấn private room state không đăng nhập, chat không đăng nhập; room_state WebSocket không được rò rỉ GM token/hash mật khẩu hoặc quyền riêng.
- Bài test sử dụng Worker engine chung, **không thay đổi quy tắc login Production**. Chưa xác minh Oracle VM thật, TLS, domain, backup, hay đối soát dữ liệu bí mật của hai backend. Node bootstrap vẫn `/readyz=503`, không bật failover.
- Rollback: revert thay đổi chỉ trong STAGING/CI, không tác động Room/Production, IPA, Pages, Runtime.


## Cổng đối soát từ xa Cloudflare ↔ Oracle STAGING (read-only, chưa nghiệm thu VM)
- `infra/oracle-staging/verify-two-backends.mjs` là preflight **chỉ GET** trên hai URL HTTPS khác nhau. Kiểm tra /api/health (project, engine/server version), từ chối /api/members/me chưa đăng nhập; Oracle phải trả /healthz nhận diện STAGING và /readyz=503, không nhận game traffic thật.
- Mặc định khóa; chỉ chạy khi đã có endpoint Oracle được triển khai/kiểm soát hợp lệ và `GMWW_ORACLE_REMOTE_READONLY=1`, `GMWW_ORACLE_STAGING_URL`, `GMWW_CLOUDFLARE_PROD_URL`. Không dùng token, tài khoản, phòng hay dữ liệu Production cho kiểm thử này.
- **Không đồng nghĩa với đồng bộ dữ liệu:** thành công chỉ chứng minh hợp đồng HTTP đọc được và một phần bảo vệ phiên. Chưa xác minh cùng commit nguồn trên VM, sao chép Durable Objects/SQLite có checksum, login/session và WebSocket trên VM thực, quyền truy cập và TLS, đối soát dữ liệu private từng phòng. `productionSwitchAllowed=false` luôn luôn.
- Mọi mismatch hoặc redirect/HTML hay thiếu endpoint phải FAIL; CI chỉ kiểm tra unit bằng mock, không giả vờ đã kết nối Oracle VM. Cần staging host và quyền truy cập trước khi chạy nghiệm thu remote.
- Rollback: revert PR chỉ chứa STAGING/tests/CI/release notes. Không triển khai Worker/Pages, không tạo Runtime/IPA, không sửa Oracle Production hoặc dữ liệu.
