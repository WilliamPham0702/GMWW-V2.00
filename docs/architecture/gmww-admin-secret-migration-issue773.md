# GMWW P0 — khóa quản trị bằng Cloudflare Secret (Issue #773)

## Phạm vi PR
- Worker và Durable Object chỉ xác thực quyền quản trị qua `env.GMWW_ADMIN_SYNC_TOKEN` (Cloudflare secret_text), **không còn giá trị cố định trong Worker source**.
- Thiếu/khóa quá ngắn/khóa sai => từ chối (fail-closed). Giữ `gmTokenHash` cho từng phòng, member session, xử lý DEMO nội bộ theo cùng cơ chế.
- Kiểm thử đơn vị lỗi khóa/thiếu secret/giả mạo và kiểm tra không còn hằng token cũ trong `src/index.js`.
- Không sửa player, IPA, Runtime, DNS, data, Cloudflare A/B; PR chỉ xây dựng và kiểm thử.

## P0 BLOCKER trước khi merge / deploy
**KHÔNG MERGE/DEPLOY** dù CI SUCCESS nếu chưa xử lý tương thích client và chuẩn bị rollback.

Kiểm toán 03/11/2026: `server-game/current/app.js` trong Runtime GM đang nhúng **chính khóa quản trị cũ** dưới tên `GMWW_GM_AUTH`. Một số API Worker vẫn dựa vào giá trị này từ iPhone. Thay ngay bằng secret mới sẽ làm hỏng các tác vụ GM trên Runtime hiện tại. Nạp lại khóa cũ vào Cloudflare Secret chỉ tránh hardcode ở Worker, **không khắc phục khóa bị lộ qua Runtime**. Vì chủ dự án yêu cầu **không đổi IPA hoặc Runtime**, chưa thể xoay/thanh lý khóa cũ mà giữ nguyên mọi tác vụ GM.

## Gate cho lần phát hành A
1. Required CI SUCCESS trên HEAD đúng phiên bản, kiểm thử bảo mật độc lập và production smoke preview, không log khóa.
2. Thiết kế, kiểm thử giao thức quyền GM an toàn thay thế credential dùng chung trong client, có cơ chế tương thích/phiên phục vụ Runtime hiện có; chỉ thực thi khi chủ dự án phê duyệt thay đổi client nếu thực sự bắt buộc.
3. Provision secret trong Cloudflare A *trước* khi thay Worker, qua kho secrets có quyền tối thiểu. Không lưu/chia sẻ secret trên GitHub, ChatGPT hoặc log.
4. Lưu Worker version đang chạy, triển khai có canary/rollback. Kiểm tra login GM, room, chat, WS/reconnect, admin APIs, Demo, Player Web bằng tài khoản thử nghiệm, không ghi đè dữ liệu thật.
5. Sau khi xác minh client không gửi credential cũ, rotate/thu hồi credential cũ; kiểm tra không còn trong code/asset/public frontend mới, ghi nhận lịch sử cũ cần kiểm soát quyền.
6. Giữ DNS, IPA, Runtime, Production data; không phát hành tự động chỉ dựa vào merge.

## Rollback
- Worker rollback sang version đã biết hoạt động trước khi đổi; **không** tự khôi phục khóa đã bị lộ làm phương án lâu dài.
- Backup schema và DO không được thay đổi; nếu không thể có zero-break cutover, tiếp tục giữ PR ở trạng thái Draft/Blocked.

## Bước tiếp — Issue #773
Chỉ phát triển export/import mã hóa dữ liệu Production A→B sau khi khóa quản trị và endpoint xuất dữ liệu có quyền riêng được bảo vệ, diễn tập bằng fixture độc lập PASS. Không failover, không đổi hostname, không sao chép data thật sang STAGING synthetic.
