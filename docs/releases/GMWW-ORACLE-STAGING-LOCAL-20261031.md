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
