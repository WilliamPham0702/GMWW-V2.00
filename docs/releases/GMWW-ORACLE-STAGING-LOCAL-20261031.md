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
