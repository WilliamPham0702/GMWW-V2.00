# GMWW – PLAYER WEB KHÓA MÀN HÌNH (PR #631)
29/10/2026 – V3.275 – Worker/Player Web only.

## Thay đổi
- Khóa Player Web theo chiều cao và điểm lệch `visualViewport` trên Safari/Chrome/Edge iPhone. Không cuộn trang chơi.
- Cảnh làng nhúng theo 100% iframe thay vì `100svh`; đổi CSS cache key.
- Khung Chat, ô nhập và icon hành động giới hạn trong màn hình; chỉ lịch sử tin nhắn được cuộn.
- Trang đăng nhập, tài khoản và danh sách phòng được phép cuộn phần nội dung của chính trang đó.

## Kiểm thử và phát hành
- Kiểm thử đúng phạm vi về chiều cao, bàn phím, chat, Player Web Online, đăng nhập, đóng gói JS.
- Workflow riêng phát hành chỉ khi commit merge đúng PR #631, mọi thay đổi thuộc whitelist, dry-run/build và kiểm thử scoped đều thành công.
- Chỉ cập nhật Worker + assets. Giữ nguyên IPA, Runtime OTA, phòng, dữ liệu Durable Objects.

## Rollback
- Cloudflare Workers → gmww-v2-00 → Deployments → rollback về phiên bản trước PR #631.
- Không xóa/phục hồi dữ liệu người chơi hoặc phòng.
- Chỉ xác nhận nghiệm thu Safari/Chrome/Edge trên iPhone sau khi thực sự kiểm tra thiết bị.
