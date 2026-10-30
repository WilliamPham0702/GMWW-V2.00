# GMWW RUNTIME V3.277.1 — CHIA SẺ LINK PLAYER WEB (PR #637)

## Phạm vi
- GM Server / IPA Runtime: bổ sung mục **Chia sẻ link Player Web** trong Cài đặt.
- Link Cloudflare cũ hoạt động và là lựa chọn mặc định; hỗ trợ **Sao chép**, bảng chia sẻ iOS, lưu lựa chọn trên thiết bị.
- Khi Clipboard API bị iOS từ chối, tự chuyển sang cơ chế sao chép dự phòng.
- Link mới **bị khóa**, chỉ mở trong bản phát hành khác sau khi xác minh sở hữu domain, DNS, HTTPS/TLS, WebSocket, đăng nhập và reconnect.
- Không đổi IPA, Oracle, Cloudflare Worker Production, Durable Object hoặc dữ liệu phòng.
- Phát hành thủ công qua GitHub Releases; **không phát hành Worker/Player Web** với patch này.

## Nghiệm thu bắt buộc
- Đồng bộ version trong package, lock, Worker source, GM source, GM app.js, GMWW.html.
- Source GM bundle phải chính xác; kiểm thử chia sẻ link và chính sách khóa hostname.
- CI required check SUCCESS; GitHub Actions đóng gói .gmwwupdate, verify từng file và toàn gói, xác thực SHA-256.
- Branch main CI và đúng source SHA mới cho phép publish GitHub Runtime; không ghi đè tag với checksum khác.
- Production deploy workflow phải phân loại **đúng bộ file** thành GitHub-only; nếu có file lạ thì fail closed, tuyệt đối không tự deploy.

## Kiểm thử bổ sung sau phát hành
- Mở GMWW trên iPhone, vào **Cài đặt → Cập nhật & đồng bộ → THỦ CÔNG**, chọn file V3.277.1.
- Đối chiếu Runtime V3.277.1, mở Cài đặt GM → Chia sẻ link Player Web, thử Copy/Share với Cloudflare cũ và kiểm tra link mới không khả dụng.
- Kiểm tra phiên chơi, phòng, tài khoản và Player Web cũ vẫn bình thường. Trình duyệt WebKit mô phỏng được CI kiểm, thiết bị iPhone thật cần nghiệm thu.

## Rollback
- Có thể chọn lại gói Runtime V3.277 có SHA-256 đã phát hành; không thay đổi IPA và dữ liệu. Không xóa phòng hay lịch sử.
