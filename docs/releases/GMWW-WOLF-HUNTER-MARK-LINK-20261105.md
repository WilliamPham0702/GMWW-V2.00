# Sói Thợ Săn: Đánh Dấu Săn và chết theo (05/11/2026)

Phạm vi: Worker (Durable Object phòng). Không đổi IPA, URL, schema DO, không xóa dữ liệu.

## Luật đã chốt với chủ dự án (05/11/2026)
- Sói Thợ Săn đánh dấu 1 người còn sống khác bản thân vào đêm đầu; chỉ được chọn lại khi mục tiêu đã đánh dấu chết trước.
- Khi Sói Thợ Săn chết (kể cả bị treo cổ ban ngày), mục tiêu chết cùng lúc.
- Nếu Sói Thợ Săn chết vào ban đêm và mục tiêu được Bảo Vệ trong chính đêm đó thì mục tiêu không chết theo. Chết ban ngày thì Bảo Vệ không có tác dụng (Bảo Vệ chỉ bảo vệ ban đêm).
- Sói Cắn của Sói Thợ Săn không được tính là đánh dấu.

## Chưa làm trong bản này
- Mục tiêu bị Đuổi: chưa có luật riêng, giữ hành vi hiện tại.
- Chưa kiểm trên iPhone/E2E.

## Kiểm thử
- 6 test mới `tests/wolf-hunter-mark-link-20261105.test.mjs`: PASS.
- Hồi quy trực tiếp (Thợ Săn thường, hợp đồng luật thẻ, soi xét, vận hành đêm): 96 PASS, 0 FAIL, 1 SKIP cũ.

## Rollback
- Worker: rollback phiên bản trước trên Cloudflare (gmww-v2-00). Không xóa dữ liệu.
