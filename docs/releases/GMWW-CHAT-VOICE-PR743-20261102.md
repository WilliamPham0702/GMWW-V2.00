# GMWW PR #743 — Chat GM hai chiều và tin thoại tối đa 30 giây

**Phạm vi:** Worker Cloudflare A (API + Durable Object), Player Web, giao diện GM Runtime từ source. Không thay IPA đã cài, URL, DNS, Oracle, Cloudflare B, số phiên bản hay dữ liệu thực có sẵn trong quá trình triển khai.

## Tính năng
- GM gửi tin nhắn chữ hoặc âm thanh (≤30 giây) tới cả làng hoặc người chơi được chọn, cả trong các trạng thái cho phép của phòng.
- Player Web ghi/gửi/nghe voice trên cùng hệ thống xác thực Chat hiện hữu; nhóm bí mật và DM không bị công khai qua WebSocket.
- Voice lưu trong Durable Object phòng hiện hữu, tự dọn khi kết thúc hoặc reset ván; không tự xóa lịch sử chat chữ.
- Không bắt buộc giới hạn KB tại UI; vẫn tuân thủ giới hạn nền tảng và bảo mật.

## Chốt an toàn trước merge và deploy
1. Required checks SUCCESS trên đúng HEAD cuối cùng; V3 cross-role, privacy, Worker dry-run và CI tập trung cho Chat.
2. Xác minh cấu hình Cloudflare A, tên Worker, các binding và migration, không trỏ sang Cloudflare B; không deploy nếu có migration hoặc thay cấu trúc dữ liệu bất ngờ.
3. Trước deploy ghi nhận commit main, Worker version hiện tại, health và rollback reference.
4. Chỉ deploy Worker khi checks main required SUCCESS, không đổi DNS hoặc cấu hình IPA. Smoke GET health + unauthenticated deny + room synthetic nếu có STAGING an toàn. KHÔNG thao tác với phòng/dữ liệu thật.
5. Nghiệm thu hai chiều GM ↔ Player Web trên iPhone là một bước riêng; không tự tuyên bố PASS nếu chưa thực hiện.

## Rollback
- Nếu health/Chat không đạt: quay lại bản Worker đã triển khai an toàn trước đó qua GitHub/Cloudflare; không reset Durable Object, không xóa dữ liệu thật; kiểm tra lại login/session/room và khả năng ghép nối trước/sau.
- IPA unsigned SideStore PR743 đã có kho riêng, bảo toàn độc lập với PR backend. Chỉ thay IPA theo yêu cầu khác.
