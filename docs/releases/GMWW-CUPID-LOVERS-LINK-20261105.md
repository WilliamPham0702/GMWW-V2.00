# Cupid: cặp tình nhân chết theo cùng lúc (05/11/2026)

Phạm vi: Worker (Durable Object phòng). Không đổi IPA, URL, schema DO, không xóa dữ liệu.

## Luật đã chốt với chủ dự án
- Đêm 1 Cupid ghép đúng 2 người (được chọn chính mình). Một người trong cặp chết thì người kia chết CÙNG LÚC.
- Chuỗi chết theo xử lý theo thứ tự: tình nhân → Thợ Săn → tình nhân, không lặp vô hạn.

## Chưa làm trong bản này
- Chuyển hai người được ghép sang Phe Ba (đổi phe/điều kiện thắng): chưa làm.
- Chưa kiểm trên iPhone/E2E.

## Kiểm thử
- 5 test mới `tests/lovers-link-20261105.test.mjs`: PASS. Hồi quy trực tiếp (Thợ Săn, vận hành đêm, hợp đồng luật thẻ): PASS.

## Rollback
- Worker: rollback phiên bản trước trên Cloudflare (gmww-v2-00). Không xóa dữ liệu.
